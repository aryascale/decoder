import { query } from '../src/lib/db';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  try {
    if (event.httpMethod === 'GET') {
      const eventId = event.queryStringParameters?.eventId;
      if (!eventId) return errorResponse('eventId is required', 400);

      const registrations: any = await query(
        `SELECT er.id, er.name, er.email, er.phoneNumber, er.gender, er.tshirtSize, er.bibName, er.bibNumber,
                er.bloodType, er.emergencyName, er.emergencyPhone, er.paymentStatus, er.grossAmount, er.orderId, er.paidAt, er.createdAt,
                er.customData, c.id as categoryId, c.name as categoryName, c.isHidden as categoryIsHidden
         FROM EventRegistration er
         JOIN Category c ON er.categoryId = c.id
         JOIN Event e ON er.eventId = e.id
         WHERE (e.id = ? OR e.slug = ?) AND er.paymentStatus IN ('settlement', 'pending')
         ORDER BY (CASE WHEN er.paymentStatus = 'settlement' THEN 1 ELSE 2 END), er.createdAt DESC`,
        [eventId, eventId]
      );

      const participants = registrations.map((r: any) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phoneNumber: r.phoneNumber,
        gender: r.gender,
        tshirtSize: r.tshirtSize,
        bibName: r.bibName,
        bibNumber: r.bibNumber,
        bloodType: r.bloodType,
        emergencyName: r.emergencyName,
        emergencyPhone: r.emergencyPhone,
        category: { id: r.categoryId, name: r.categoryName, isHidden: !!r.categoryIsHidden },
        paymentStatus: r.paymentStatus,
        grossAmount: r.grossAmount,
        orderId: r.orderId,
        paidAt: r.paidAt,
        createdAt: r.createdAt,
        dateOfBirth: r.dateOfBirth,
        customData: r.customData ? (typeof r.customData === 'string' ? JSON.parse(r.customData) : r.customData) : null,
      }));

      return successResponse({ participants, total: participants.length });
    }

    return errorResponse('Method not allowed', 405);
  } catch (error: any) {
    console.error('[REGISTRATIONS] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
