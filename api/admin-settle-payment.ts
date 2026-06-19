import { query } from '../src/lib/db';
import { successResponse, errorResponse, CORS_HEADERS } from '../src/lib/api-utils';
import { logActivity } from '../src/lib/activity-logger';
import { createBackup } from '../src/lib/backup';
import { assignAutoBibsIfEnabled } from '../src/lib/bib-generator';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { orderId } = body;

    if (!orderId) return errorResponse('Order ID is required', 400);

    // Update status to settlement manually
    const result: any = await query(
      `UPDATE EventRegistration SET paymentStatus = 'settlement', paidAt = NOW(), updatedAt = NOW() WHERE orderId = ?`,
      [orderId]
    );

    if (result.affectedRows === 0) {
      return errorResponse('Registration not found', 404);
    }

    // Fetch details to send email
    const regRes: any = await query(
      `SELECT er.*, e.name as eventName, e.eventDate, c.name as categoryName 
       FROM EventRegistration er
       JOIN Event e ON er.eventId = e.id
       JOIN Category c ON er.categoryId = c.id
       WHERE er.orderId = ? LIMIT 1`,
      [orderId]
    );

    if (regRes.length > 0) {
      try {
        await assignAutoBibsIfEnabled(orderId);
      } catch (e) {
        console.error('[ADMIN-SETTLE] Error generating BIBs:', e);
      }

      const { sendRegistrationConfirmation } = await import('../src/lib/email-service');
      await sendRegistrationConfirmation(regRes[0]);
    }

    // Log the manual action
    const eventId = regRes[0]?.eventId || null;
    await logActivity('payment.manual_settle', `Penyelesaian pembayaran manual untuk ${orderId}`, 'admin', eventId, { orderId });

    try { await createBackup('manual_settle'); } catch (e) { console.error('[BACKUP] Failed:', e); }

    return successResponse({ message: 'Pembayaran berhasil diselesaikan secara manual' });
  } catch (error: any) {
    console.error('[ADMIN-SETTLE] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
