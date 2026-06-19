import { query } from '../src/lib/db';
import { deleteFileByUrl } from '../src/lib/fileStorage';
import { successResponse, errorResponse, CORS_HEADERS } from '../src/lib/api-utils';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'DELETE') return errorResponse('Method not allowed', 405);

  try {
    const bannerId = event.queryStringParameters?.bannerId;
    const imageUrl = event.queryStringParameters?.imageUrl;

    if (!bannerId) return errorResponse('bannerId is required', 400);
    if (!imageUrl) return errorResponse('imageUrl is required', 400);

    const banners: any = await query('SELECT * FROM Banner WHERE id = ? LIMIT 1', [bannerId]);
    if (banners.length === 0) return errorResponse('Banner not found', 404);

    await query('DELETE FROM Banner WHERE id = ?', [bannerId]);

    try { await deleteFileByUrl(imageUrl); } catch {}

    return successResponse({ success: true });
  } catch (error: any) {
    console.error('[DELETE-BANNER] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
