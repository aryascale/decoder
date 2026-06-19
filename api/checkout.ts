import { query } from '../src/lib/db';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';
import { logActivity } from '../src/lib/activity-logger';
import { assignAutoBibsIfEnabled } from '../src/lib/bib-generator';
import { sendRegistrationConfirmation } from '../src/lib/email-service';
import crypto from 'crypto';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const MIDTRANS_MERCHANT_ID = process.env.MIDTRANS_MERCHANT_ID || '';
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const MIDTRANS_BASE_URL = MIDTRANS_IS_PRODUCTION
  ? 'https://app.midtrans.com/snap/v1'
  : 'https://app.sandbox.midtrans.com/snap/v1';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const body = parseBody(event);
    if (!body) return errorResponse('Missing request body', 400);

    let { eventId, categoryId, email, customData, bulkParticipants, name, phoneNumber, gender, bloodType, emergencyName, emergencyPhone, tshirtSize, bibName, notes, dateOfBirth } = body;

    if (!eventId || !categoryId || !email) {
      return errorResponse('eventId, categoryId, and email are required', 400);
    }

    const participantsList = Array.isArray(bulkParticipants) && bulkParticipants.length > 0 
      ? bulkParticipants 
      : [{ name, email, phoneNumber, gender, bloodType, emergencyName, emergencyPhone, tshirtSize, bibName, notes, dateOfBirth, customData }];

    const events: any = await query('SELECT id, name, bibCustomPrice, content FROM Event WHERE id = ? LIMIT 1', [eventId]);
    if (events.length === 0) return errorResponse('Event not found', 404);

    // Get field definitions to find "Name" field
    const regFields: any = await query('SELECT id, label FROM RegistrationField WHERE eventId = ?', [eventId]);
    const nameField = regFields.find((f: any) => f.label.toLowerCase().includes('nama') || f.label.toLowerCase().includes('name'));

    const participantsData = participantsList.map(p => {
       const pCustom = p.customData || p;
       const entries = Object.entries(pCustom);
       
       // Case-insensitive lookup helper for customData (keys are labels from frontend)
       const getCustomByLabel = (regex: RegExp): string => {
         const found = entries.find(([k]) => regex.test(k.toLowerCase()));
         return found ? String(found[1]) : '';
       };

       // Also try by field ID (legacy/fallback)
       const getFieldByLabel = (regex: RegExp) => regFields.find((f: any) => regex.test(f.label.toLowerCase()))?.id;

       let pName = p.name;
       if (!pName) {
         // Try by label first (what frontend actually sends)
         const fn = getCustomByLabel(/first name|nama depan/) || pCustom[getFieldByLabel(/first name|nama depan/) || ''] || '';
         const ln = getCustomByLabel(/last name|nama belakang/) || pCustom[getFieldByLabel(/last name|nama belakang/) || ''] || '';
         if (fn || ln) {
           pName = `${fn} ${ln}`.trim();
         } else {
           // Try full name / nama lengkap
           pName = getCustomByLabel(/full name|fullname|nama lengkap/) 
             || getCustomByLabel(/^nama$/)
             || (nameField ? pCustom[nameField.id] : null)
             || '';
         }
         // Last resort: email prefix
         if (!pName) pName = email.split('@')[0];
       }

       let pPhone = p.phoneNumber 
         || getCustomByLabel(/whatsapp|wa|phone|nomor hp|no hp|telp/)
         || pCustom[getFieldByLabel(/whatsapp|wa|phone|nomor hp|no hp|telp/) || '']
         || '000000000000';
       let pGender = p.gender 
         || getCustomByLabel(/^gender$|jenis kelamin/) 
         || pCustom[getFieldByLabel(/gender|jenis kelamin/) || ''] 
         || 'U';
       let pDob = p.dateOfBirth 
         || getCustomByLabel(/birth|lahir|tanggal lahir/) 
         || pCustom[getFieldByLabel(/birth|lahir|tanggal lahir/) || ''] 
         || null;
       let pTshirtSize = p.tshirtSize 
         || getCustomByLabel(/t-shirt|tshirt|kaos|jersey|ukuran baju|ukuran kaos/) 
         || pCustom[getFieldByLabel(/t-shirt|tshirt|kaos|jersey|ukuran baju|ukuran kaos/) || ''] 
         || null;

       return { ...p, name: pName, phoneNumber: pPhone, gender: pGender, dateOfBirth: pDob, tshirtSize: pTshirtSize, customData: pCustom };
    });

    const primaryParticipant = participantsData[0];


    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return errorResponse('Invalid email format', 400);

    if (bibName && bibName.length > 12) return errorResponse('BIB name max 12 characters', 400);



    let allowBulkNoOtp = false;
    try {
      const content = typeof events[0].content === 'string' ? JSON.parse(events[0].content) : events[0].content;
      allowBulkNoOtp = content?.allowBulkNoOtp === true;
    } catch (e) {}

    // Verify email OTP
    if (!allowBulkNoOtp) {
      const verifiedOtp: any = await query(
        "SELECT id FROM EmailOtp WHERE email = ? AND verified = true AND expiresAt > NOW() ORDER BY createdAt DESC LIMIT 1",
        [email.trim().toLowerCase()]
      );
      if (verifiedOtp.length === 0) {
        return errorResponse('Email belum diverifikasi. Silakan verifikasi email terlebih dahulu.', 400);
      }
    }

    if (!allowBulkNoOtp) {
      const existingReg: any = await query(
        "SELECT id, paymentStatus FROM EventRegistration WHERE email = ? AND eventId = ? AND paymentStatus = 'settlement' LIMIT 1",
        [email, eventId]
      );
      if (existingReg.length > 0) {
        return errorResponse('Email ini sudah terdaftar di event ini', 400);
      }
    }
    // Clean up only stale pending registrations (older than 24h) for same email+event
    await query(
      "DELETE FROM EventRegistration WHERE email = ? AND eventId = ? AND paymentStatus = 'pending' AND createdAt < DATE_SUB(NOW(), INTERVAL 24 HOUR)",
      [email, eventId]
    );

    const categories: any = await query('SELECT id, name, price, quota FROM Category WHERE id = ? AND eventId = ? LIMIT 1', [categoryId, eventId]);
    if (categories.length === 0) return errorResponse('Category not found', 404);

    // Check category quota
    const catQuota = categories[0].quota || 0;
    if (catQuota > 0) {
      const soldCount: any = await query(
        `SELECT COUNT(*) as sold FROM EventRegistration WHERE categoryId = ? AND eventId = ? AND paymentStatus = 'settlement'`,
        [categoryId, eventId]
      );
      const sold = Number(soldCount[0]?.sold || 0);
      if (sold >= catQuota) {
        return errorResponse('Kuota kategori ini sudah habis (Sold Out)', 400);
      }
    }

    // Event lookup was moved above

    // Check t-shirt inventory quota
    for (const p of participantsData) {
      if (p.tshirtSize) {
        const inventory: any = await query(
          'SELECT id, quota, sold FROM TshirtInventory WHERE eventId = ? AND size = ? LIMIT 1',
          [eventId, p.tshirtSize]
        );
        if (inventory.length > 0 && inventory[0].quota > 0) {
          if (inventory[0].sold >= inventory[0].quota) {
            return errorResponse(`Ukuran baju ${p.tshirtSize} sudah habis (Sold Out)`, 400);
          }
        }
      }
    }

    const categoryPrice = categories[0].price || 0;
    const bibExtraCharge = primaryParticipant.bibName ? (events[0].bibCustomPrice || 0) : 0;
    const itemGrossAmount = categoryPrice + bibExtraCharge;
    const qty = participantsData.length;
    const totalGrossAmount = itemGrossAmount * qty;

    const orderId = `LMPAT-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const regIds: string[] = [];
    for (let i = 0; i < participantsData.length; i++) {
        const p = participantsData[i];
        const regId = crypto.randomUUID();
        regIds.push(regId);
        await query(
          `INSERT INTO EventRegistration 
            (id, eventId, categoryId, email, name, phoneNumber, gender, bloodType, emergencyName, emergencyPhone, tshirtSize, bibName, notes, orderId, grossAmount, dateOfBirth, customData, paymentStatus, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
          [regId, eventId, categoryId, email, p.name, p.phoneNumber, p.gender, p.bloodType || null, p.emergencyName || null, p.emergencyPhone || null, p.tshirtSize || null, p.bibName || null, p.notes || null, orderId, itemGrossAmount, p.dateOfBirth || null, p.customData ? JSON.stringify(p.customData) : null]
        );
    }

    if (totalGrossAmount === 0) {
      for (const regId of regIds) {
        await query(
          "UPDATE EventRegistration SET paymentStatus = 'settlement', paidAt = NOW(), updatedAt = NOW() WHERE id = ?",
          [regId]
        );
      }

      // Auto-generate BIB for free events
      try {
        await assignAutoBibsIfEnabled(orderId);
      } catch (e) {
        console.error('[CHECKOUT] Error generating BIBs for free event:', e);
      }

      // Send confirmation email + update tshirt inventory for free events
      try {
        const regRes: any = await query(
          `SELECT er.*, e.name as eventName, e.eventDate, c.name as categoryName 
           FROM EventRegistration er
           JOIN Event e ON er.eventId = e.id
           JOIN Category c ON er.categoryId = c.id
           WHERE er.orderId = ?`,
          [orderId]
        );
        for (const reg of regRes) {
          await sendRegistrationConfirmation(reg);
          if (reg.tshirtSize) {
            await query(
              'UPDATE TshirtInventory SET sold = sold + 1 WHERE eventId = ? AND size = ?',
              [reg.eventId, reg.tshirtSize]
            );
          }
        }
      } catch (e) {
        console.error('[CHECKOUT] Error sending email for free event:', e);
      }

      await logActivity('registration.created', `${primaryParticipant.name} (+${qty-1} others) mendaftar ke event (Gratis)`, email, eventId, { orderId, totalGrossAmount, category: categories[0].name });
      return successResponse({ orderId, grossAmount: totalGrossAmount, registration: { id: regIds[0] }, message: 'Registrasi gratis berhasil', isFree: true });
    }

    if (!MIDTRANS_SERVER_KEY) {
      await logActivity('registration.created', `${primaryParticipant.name} (+${qty-1} others) mendaftar ke event (Midtrans not configured)`, email, eventId, { orderId, totalGrossAmount, category: categories[0].name });
      return successResponse({ orderId, grossAmount: totalGrossAmount, registration: { id: regIds[0] }, message: 'Midtrans not configured. Registration saved as pending.' });
    }

    const snapPayload = {
      transaction_details: { order_id: orderId, gross_amount: totalGrossAmount },
      customer_details: {
        first_name: primaryParticipant.name || 'Participant',
        email: email,
        phone: primaryParticipant.phoneNumber || '0000000000',
      },
      item_details: [
        { id: categoryId, price: categoryPrice, quantity: qty, name: `${events[0].name} - ${categories[0].name}`.substring(0, 50) },
        ...(bibExtraCharge > 0 ? [{ id: 'bib-custom', price: bibExtraCharge, quantity: qty, name: `Custom BIB Name` }] : []),
      ],
    };

    const authString = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64');
    const snapResponse = await fetch(`${MIDTRANS_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify(snapPayload),
    });

    if (!snapResponse.ok) {
      const snapError = await snapResponse.text();
      console.error('[CHECKOUT] Midtrans error:', snapError);
      return errorResponse('Failed to create payment', 500);
    }

    const snapData: any = await snapResponse.json();
    const { token: snapToken, redirect_url: snapUrl } = snapData;

    for (const regId of regIds) {
      await query(
        'UPDATE EventRegistration SET snapToken = ?, snapUrl = ?, updatedAt = NOW() WHERE id = ?',
        [snapToken, snapUrl, regId]
      );
    }

    await logActivity('registration.created', `${primaryParticipant.name} (+${qty-1} others) mendaftar ke ${events[0].name} - ${categories[0].name}`, email, eventId, { orderId, totalGrossAmount, category: categories[0].name });

    return successResponse({
      orderId,
      grossAmount: totalGrossAmount,
      snapToken,
      snapUrl,
      registration: { id: regIds[0] },
    });
  } catch (error: any) {
    console.error('[CHECKOUT] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
