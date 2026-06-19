import { query } from '../src/lib/db';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';
import { logActivity } from '../src/lib/activity-logger';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  try {
    const eventId = event.queryStringParameters?.eventId;
    if (!eventId) return errorResponse('eventId is required', 400);

    if (event.httpMethod === 'GET') {
      const events: any = await query(
        'SELECT id, manualStartTime FROM Event WHERE id = ? LIMIT 1',
        [eventId]
      );
      if (events.length === 0) return errorResponse('Event not found', 404);

      const record = events[0];
      return successResponse({ manualStartTime: record.manualStartTime });
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      const body = parseBody(event);
      if (!body) return errorResponse('Missing request body', 400);

      const { manualStartTime } = body;

      // Validate ISO 8601 datetime format
      if (manualStartTime !== null && manualStartTime !== undefined) {
        const date = new Date(manualStartTime);
        if (isNaN(date.getTime())) {
          return errorResponse('Invalid datetime format. Use ISO 8601 format (e.g., 2025-06-15T06:00:00.000Z)', 400);
        }
      }

      const existing: any = await query('SELECT id FROM Event WHERE id = ? LIMIT 1', [eventId]);
      if (existing.length === 0) return errorResponse('Event not found', 404);

      await query(
        'UPDATE Event SET manualStartTime = ?, updatedAt = NOW() WHERE id = ?',
        [manualStartTime ?? null, eventId]
      );

      const updated: any = await query(
        'SELECT id, manualStartTime FROM Event WHERE id = ? LIMIT 1',
        [eventId]
      );

      const actionDesc = manualStartTime ? `Manual Start Time di-set: ${manualStartTime}` : `Manual Start Time dihapus (Clear)`;
      await logActivity('event.update', actionDesc, 'admin', eventId);

      return successResponse({ manualStartTime: updated[0].manualStartTime });
    }

    if (event.httpMethod === 'DELETE') {
      const existing: any = await query('SELECT id FROM Event WHERE id = ? LIMIT 1', [eventId]);
      if (existing.length === 0) return errorResponse('Event not found', 404);

      await query(
        'UPDATE Event SET manualStartTime = NULL, updatedAt = NOW() WHERE id = ?',
        [eventId]
      );

      await logActivity('event.update', 'Manual Start Time dihapus (Clear)', 'admin', eventId);

      return successResponse({ manualStartTime: null });
    }

    return errorResponse('Method not allowed', 405);
  } catch (error: any) {
    console.error('[MANUAL-START] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
