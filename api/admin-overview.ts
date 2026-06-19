import { query } from '../src/lib/db';
import { successResponse, errorResponse, CORS_HEADERS } from '../src/lib/api-utils';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'GET') return errorResponse('Method not allowed', 405);

  try {
    const eventId = event.queryStringParameters?.eventId;

    let whereClause = 'WHERE 1=1';
    let params: any[] = [];
    if (eventId) {
      whereClause = 'WHERE eventId = ?';
      params.push(eventId);
    }

    // Total Revenue (only from settlement)
    const revenueResult: any = await query(
      `SELECT SUM(grossAmount) as total FROM EventRegistration ${whereClause} AND paymentStatus = 'settlement'`,
      params
    );
    const totalRevenue = revenueResult[0]?.total || 0;

    // Total Participants
    const participantsResult: any = await query(
      `SELECT COUNT(*) as total FROM EventRegistration ${whereClause} AND paymentStatus = 'settlement'`,
      params
    );
    const totalParticipants = participantsResult[0]?.total || 0;

    // Total Events
    const eventsResult: any = await query(`SELECT COUNT(*) as total FROM Event WHERE isActive = true`);
    const totalEvents = eventsResult[0]?.total || 0;

    // Payment Status Breakdown
    const statusResult: any = await query(
      `SELECT paymentStatus, COUNT(*) as count FROM EventRegistration ${whereClause} GROUP BY paymentStatus`,
      params
    );
    const paymentStatus = statusResult.reduce((acc: any, row: any) => {
      acc[row.paymentStatus] = row.count;
      return acc;
    }, {});

    // Recent Registrations
    const recentRegistrations: any = await query(
      `SELECT r.id, r.name, r.email, r.paymentStatus, r.createdAt, c.name as categoryName, e.name as eventName
       FROM EventRegistration r
       LEFT JOIN Category c ON r.categoryId = c.id
       LEFT JOIN Event e ON r.eventId = e.id
       ${whereClause}
       ORDER BY r.createdAt DESC LIMIT 10`,
      params
    );

    return successResponse({
      totalRevenue,
      totalParticipants,
      totalEvents,
      paymentStatus,
      recentRegistrations,
    });
  } catch (error: any) {
    console.error('[ADMIN-OVERVIEW] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
