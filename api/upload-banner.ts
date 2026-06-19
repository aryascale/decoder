import { query } from '../src/lib/db';
import { uploadBannerImage } from '../src/lib/fileStorage';
import { successResponse, errorResponse, parseMultipart, CORS_HEADERS } from '../src/lib/api-utils';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    if (!contentType.includes('multipart/form-data')) return errorResponse('Content-Type must be multipart/form-data', 400);

    const boundary = contentType.split('boundary=')[1];
    if (!boundary) return errorResponse('Missing boundary', 400);
    if (!event.body) return errorResponse('Missing request body', 400);

    const body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('binary')
      : event.body;

    const { file, fields } = parseMultipart(body, boundary);
    if (!file) return errorResponse('No file uploaded', 400);

    const eventId = fields.eventId;
    if (!eventId) return errorResponse('eventId is required', 400);

    const result = await uploadBannerImage(eventId, file.data, file.name);

    const bannerId = crypto.randomUUID();
    await query(
      'INSERT INTO Banner (id, eventId, imageUrl, alt, `order`, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [bannerId, eventId, result.url, fields.alt || file.name, parseInt(fields.order || '0', 10), true]
    );

    const banners: any = await query('SELECT * FROM Banner WHERE id = ? LIMIT 1', [bannerId]);

    return successResponse({ ...result, banner: banners[0] });
  } catch (error: any) {
    console.error('[UPLOAD-BANNER] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
