import { query } from '../src/lib/db';
import { successResponse, errorResponse, CORS_HEADERS } from '../src/lib/api-utils';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'GET') return errorResponse('Method not allowed', 405);

  try {
    const eventId = event.queryStringParameters?.eventId;
    const banners: any = eventId
      ? await query('SELECT * FROM Banner WHERE eventId = ? ORDER BY `order` ASC', [eventId])
      : await query('SELECT * FROM Banner ORDER BY `order` ASC');

    return successResponse(banners);
  } catch (error: any) {
    console.error('[BANNERS] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
