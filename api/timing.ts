import { query } from '../src/lib/db';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  try {
    const eventId = event.queryStringParameters?.eventId;
    if (!eventId) return errorResponse('eventId is required', 400);

    if (event.httpMethod === 'GET') {
      const events: any = await query(
        'SELECT id, cutoffMs, categoryStartTimes FROM Event WHERE id = ? LIMIT 1',
        [eventId]
      );
      if (events.length === 0) return errorResponse('Event not found', 404);

      const record = events[0];
      let categoryStartTimes = record.categoryStartTimes;
      if (typeof categoryStartTimes === 'string') {
        try { categoryStartTimes = JSON.parse(categoryStartTimes); } catch {}
      }

      return successResponse({ cutoffMs: record.cutoffMs, categoryStartTimes });
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      const body = parseBody(event);
      if (!body) return errorResponse('Missing request body', 400);

      const { cutoffMs, categoryStartTimes } = body;

      if (cutoffMs !== null && cutoffMs !== undefined && (typeof cutoffMs !== 'number' || cutoffMs < 0)) {
        return errorResponse('cutoffMs must be a positive number or null', 400);
      }

      if (categoryStartTimes !== null && categoryStartTimes !== undefined && (typeof categoryStartTimes !== 'object' || Array.isArray(categoryStartTimes))) {
        return errorResponse('categoryStartTimes must be an object or null', 400);
      }

      const existing: any = await query('SELECT id FROM Event WHERE id = ? LIMIT 1', [eventId]);
      if (existing.length === 0) return errorResponse('Event not found', 404);

      await query(
        'UPDATE Event SET cutoffMs = ?, categoryStartTimes = ?, updatedAt = NOW() WHERE id = ?',
        [cutoffMs ?? null, categoryStartTimes ? JSON.stringify(categoryStartTimes) : null, eventId]
      );

      const updated: any = await query(
        'SELECT id, cutoffMs, categoryStartTimes FROM Event WHERE id = ? LIMIT 1',
        [eventId]
      );

      let parsedCST = updated[0].categoryStartTimes;
      if (typeof parsedCST === 'string') {
        try { parsedCST = JSON.parse(parsedCST); } catch {}
      }

      return successResponse({ cutoffMs: updated[0].cutoffMs, categoryStartTimes: parsedCST });
    }

    return errorResponse('Method not allowed', 405);
  } catch (error: any) {
    console.error('[TIMING] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
