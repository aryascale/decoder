import { query } from '../src/lib/db';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';
import crypto from 'crypto';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  try {
    const eventId = event.queryStringParameters?.eventId;
    if (!eventId) return errorResponse('eventId is required', 400);

    // GET: List all registration fields for an event
    if (event.httpMethod === 'GET') {
      const fields: any = await query(
        'SELECT * FROM RegistrationField WHERE eventId = ? ORDER BY `order` ASC',
        [eventId]
      );
      return successResponse({ fields });
    }

    // POST: Create or bulk-update registration fields
    if (event.httpMethod === 'POST') {
      const body = parseBody(event);
      if (!body) return errorResponse('Missing request body', 400);

      const { fields } = body;
      if (!Array.isArray(fields)) return errorResponse('fields must be an array', 400);

      // Delete existing and re-insert (bulk replace strategy)
      await query('DELETE FROM RegistrationField WHERE eventId = ?', [eventId]);

      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        await query(
          'INSERT INTO RegistrationField (id, eventId, label, type, required, options, `order`, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
          [
            f.id || crypto.randomUUID(),
            eventId,
            f.label,
            f.type || 'text',
            f.required ?? false,
            f.options || null,
            i,
          ]
        );
      }

      const updated: any = await query(
        'SELECT * FROM RegistrationField WHERE eventId = ? ORDER BY `order` ASC',
        [eventId]
      );

      const { logActivity } = await import('../src/lib/activity-logger');
      await logActivity('event.update_fields', `Update field pendaftaran untuk event ${eventId}`, 'admin', eventId);

      return successResponse({ fields: updated });
    }

    // DELETE: Remove a specific field
    if (event.httpMethod === 'DELETE') {
      const fieldId = event.queryStringParameters?.fieldId;
      if (!fieldId) return errorResponse('fieldId is required', 400);

      await query('DELETE FROM RegistrationField WHERE id = ? AND eventId = ?', [fieldId, eventId]);
      return successResponse({ success: true });
    }

    return errorResponse('Method not allowed', 405);
  } catch (error: any) {
    console.error('[REGISTRATION-FIELDS] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
