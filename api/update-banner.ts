import { query } from '../src/lib/db';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    if (!event.body) return errorResponse('Missing request body', 400);

    const body = parseBody(event);
    const { bannerId, isActive } = body;

    if (!bannerId) return errorResponse('bannerId is required', 400);
    if (typeof isActive !== 'boolean') return errorResponse('isActive is required (boolean)', 400);

    await query('UPDATE Banner SET isActive = ? WHERE id = ?', [isActive, bannerId]);

    const banners: any = await query('SELECT * FROM Banner WHERE id = ? LIMIT 1', [bannerId]);
    if (banners.length === 0) return errorResponse('Banner not found', 404);

    return successResponse(banners[0]);
  } catch (error: any) {
    console.error('[UPDATE-BANNER] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
