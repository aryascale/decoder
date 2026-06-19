import { query } from '../src/lib/db';
import { deleteFileByUrl } from '../src/lib/fileStorage';
import { successResponse, errorResponse, CORS_HEADERS } from '../src/lib/api-utils';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'DELETE') return errorResponse('Method not allowed', 405);

  try {
    const eventId = event.queryStringParameters?.eventId;
    const imageUrl = event.queryStringParameters?.imageUrl;

    if (!eventId) return errorResponse('eventId is required', 400);
    if (!imageUrl) return errorResponse('imageUrl is required', 400);

    const existing: any = await query('SELECT content FROM Event WHERE id = ? LIMIT 1', [eventId]);
    if (existing.length === 0) return errorResponse('Event not found', 404);

    const currentContentStr = existing[0]?.content;
    let currentContent: any = {};
    if (currentContentStr) {
      currentContent = typeof currentContentStr === 'string' ? JSON.parse(currentContentStr) : currentContentStr;
    }

    if (Array.isArray(currentContent.galleryUrls)) {
      currentContent.galleryUrls = currentContent.galleryUrls.filter((url: string) => url !== imageUrl);
      
      await query(
        `UPDATE Event SET content = ?, updatedAt = NOW() WHERE id = ?`,
        [JSON.stringify(currentContent), eventId]
      );
    }

    try { await deleteFileByUrl(imageUrl); } catch (e) {
      console.error('Failed to delete file from storage', e);
    }

    return successResponse({ success: true, content: currentContent });
  } catch (error: any) {
    console.error('[DELETE-GALLERY-IMAGE] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
