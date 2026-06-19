import { query } from '../src/lib/db';
import { uploadFile } from '../src/lib/fileStorage';
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

    const targetField = fields.field;
    if (targetField !== 'logo' && targetField !== 'banner' && targetField !== 'home_image' && targetField !== 'rpc_bg' && targetField !== 'rpc_bg_mobile' && targetField !== 'gallery' && targetField !== 'tnc_doc') {
      return errorResponse('Invalid field type', 400);
    }

    const result = await uploadFile(eventId, file.data, file.name, 'images');
    
    if (targetField === 'rpc_bg' || targetField === 'rpc_bg_mobile' || targetField === 'gallery' || targetField === 'tnc_doc') {
      const existing: any = await query('SELECT content FROM Event WHERE id = ?', [eventId]);
      const currentContentStr = existing[0]?.content;
      let currentContent = {};
      if (currentContentStr) {
        currentContent = typeof currentContentStr === 'string' ? JSON.parse(currentContentStr) : currentContentStr;
      }
      
      if (targetField === 'gallery') {
        const galleryUrls = Array.isArray((currentContent as any).galleryUrls) ? (currentContent as any).galleryUrls : [];
        galleryUrls.push(result.url);
        (currentContent as any).galleryUrls = galleryUrls;
      } else if (targetField === 'rpc_bg') {
        (currentContent as any).rpcBgUrl = result.url;
      } else if (targetField === 'rpc_bg_mobile') {
        (currentContent as any).rpcBgUrlMobile = result.url;
      } else if (targetField === 'tnc_doc') {
        let tncUrls = Array.isArray((currentContent as any).tncUrls) ? (currentContent as any).tncUrls : [];
        if (tncUrls.length === 0 && (currentContent as any).tncUrl) {
          tncUrls.push((currentContent as any).tncUrl);
        }
        if (tncUrls.length < 5) {
          tncUrls.push(result.url);
        }
        (currentContent as any).tncUrls = tncUrls;
        (currentContent as any).tncUrl = tncUrls[0] || ''; // keep backward compatibility
      }
      await query(
        `UPDATE Event SET content = ?, updatedAt = NOW() WHERE id = ?`,
        [JSON.stringify(currentContent), eventId]
      );
    } else {
      const updateColumn = targetField === 'logo' ? 'logoUrl' : targetField === 'banner' ? 'bannerUrl' : 'homeImageUrl';
      await query(
        `UPDATE Event SET ${updateColumn} = ?, updatedAt = NOW() WHERE id = ?`,
        [result.url, eventId]
      );
    }

    const updatedEvent: any = await query('SELECT * FROM Event WHERE id = ? LIMIT 1', [eventId]);

    return successResponse({ ...result, event: updatedEvent[0] });
  } catch (error: any) {
    console.error('[UPLOAD-EVENT-MEDIA] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
