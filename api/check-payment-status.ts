import { query } from '../src/lib/db';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';
import { logActivity } from '../src/lib/activity-logger';
import { assignAutoBibsIfEnabled } from '../src/lib/bib-generator';
import { sendRegistrationConfirmation } from '../src/lib/email-service';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const MIDTRANS_API_URL = MIDTRANS_IS_PRODUCTION
  ? 'https://api.midtrans.com/v2'
  : 'https://api.sandbox.midtrans.com/v2';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const body = parseBody(event);
    if (!body) return errorResponse('Missing request body', 400);

    const { orderId } = body;
    if (!orderId) return errorResponse('orderId is required', 400);

    // 1. Check current status in our DB
    const existing: any = await query(
      'SELECT id, paymentStatus, eventId FROM EventRegistration WHERE orderId = ? LIMIT 1',
      [orderId]
    );

    if (existing.length === 0) return errorResponse('Order not found', 404);

    // If already settled, no need to check Midtrans
    if (existing[0].paymentStatus === 'settlement') {
      return successResponse({ status: 'settlement', message: 'Pembayaran sudah dikonfirmasi sebelumnya.' });
    }

    // 2. Query Midtrans API directly for transaction status
    if (!MIDTRANS_SERVER_KEY) {
      return errorResponse('Midtrans not configured', 500);
    }

    const authString = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64');
    const midtransRes = await fetch(`${MIDTRANS_API_URL}/${orderId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
    });

    if (!midtransRes.ok) {
      const errText = await midtransRes.text();
      console.error('[CHECK-PAYMENT] Midtrans API error:', errText);
      return errorResponse('Gagal mengecek status pembayaran dari Midtrans', 502);
    }

    const midtransData: any = await midtransRes.json();
    const { transaction_status, fraud_status, payment_type } = midtransData;

    console.log(`[CHECK-PAYMENT] Midtrans status for ${orderId}: ${transaction_status} (fraud: ${fraud_status})`);

    // 3. Determine payment status
    let paymentStatus = 'pending';
    if (transaction_status === 'capture') {
      paymentStatus = (fraud_status === 'accept') ? 'settlement' : 'pending';
    } else if (transaction_status === 'settlement') {
      paymentStatus = 'settlement';
    } else if (['cancel', 'deny'].includes(transaction_status)) {
      paymentStatus = 'cancel';
    } else if (transaction_status === 'expire') {
      paymentStatus = 'expire';
    }

    // 4. If status changed, update our DB
    if (paymentStatus !== existing[0].paymentStatus) {
      const paidAt = paymentStatus === 'settlement' ? 'NOW()' : 'NULL';
      await query(
        `UPDATE EventRegistration SET paymentStatus = ?, paymentMethod = ?, paidAt = ${paidAt === 'NOW()' ? 'NOW()' : 'NULL'}, updatedAt = NOW() WHERE orderId = ?`,
        [paymentStatus, payment_type || null, orderId]
      );

      await logActivity(
        'payment.status_check', 
        `Status pembayaran ${orderId} diperbarui ke ${paymentStatus} (via client polling)`, 
        'system', 
        existing[0].eventId, 
        { orderId, oldStatus: existing[0].paymentStatus, newStatus: paymentStatus }
      );

      // 5. If settled, run post-payment actions (BIB, email, inventory)
      if (paymentStatus === 'settlement') {
        try {
          await assignAutoBibsIfEnabled(orderId);
        } catch (e) {
          console.error('[CHECK-PAYMENT] Error generating BIBs:', e);
        }

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
          console.error('[CHECK-PAYMENT] Error post-settlement:', e);
        }
      }
    }

    return successResponse({ 
      status: paymentStatus, 
      message: paymentStatus === 'settlement' ? 'Pembayaran berhasil dikonfirmasi!' : `Status: ${paymentStatus}` 
    });
  } catch (error: any) {
    console.error('[CHECK-PAYMENT] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
