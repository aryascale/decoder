import { query } from '../src/lib/db';
import { successResponse, errorResponse, CORS_HEADERS } from '../src/lib/api-utils';
import { logActivity } from '../src/lib/activity-logger';
import { createBackup } from '../src/lib/backup';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { orderId } = body;

    if (!orderId) return errorResponse('Order ID is required', 400);

    // Update status to deleted manually by setting paymentStatus
    const result: any = await query(
      `UPDATE EventRegistration SET paymentStatus = 'deleted', updatedAt = NOW() WHERE orderId = ?`,
      [orderId]
    );

    if (result.affectedRows === 0) {
      return errorResponse('Registration not found', 404);
    }

    const regRes: any = await query(
      `SELECT eventId FROM EventRegistration WHERE orderId = ? LIMIT 1`,
      [orderId]
    );

    // Log the manual action
    const eventId = regRes[0]?.eventId || null;
    await logActivity('payment.manual_delete', `Soft delete pembayaran untuk ${orderId}`, 'admin', eventId, { orderId });

    try { await createBackup('manual_delete'); } catch (e) { console.error('[BACKUP] Failed:', e); }

    return successResponse({ message: 'Pembayaran berhasil dihapus (soft delete)' });
  } catch (error: any) {
    console.error('[ADMIN-DELETE] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
