import fs from 'node:fs';
import path from 'node:path';
import { query } from '../src/lib/db';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';

const getUploadDir = (): string => process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    if (!event.body) return errorResponse('Missing request body', 400);

    const body = parseBody(event);
    const { eventId, content, filename, categoryName } = body;
    if (!eventId || !content) return errorResponse('eventId and content are required', 400);

    const gpxDir = path.join(getUploadDir(), 'events', eventId, 'gpx');
    ensureDir(gpxDir);

    const fileBase = categoryName ? `route-${categoryName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.gpx` : 'route.gpx';
    const gpxFilePath = path.join(gpxDir, fileBase);
    fs.writeFileSync(gpxFilePath, content, 'utf-8');
    const url = `/uploads/events/${eventId}/gpx/${fileBase}`;

    const eventRows = await query('SELECT content FROM Event WHERE id = ?', [eventId]) as any[];
    let contentObj: any = {};
    if (eventRows.length > 0 && eventRows[0].content) {
      contentObj = typeof eventRows[0].content === 'string' ? JSON.parse(eventRows[0].content) : eventRows[0].content;
    }

    if (categoryName) {
      contentObj.routeGpxFiles = contentObj.routeGpxFiles || {};
      contentObj.routeGpxFiles[categoryName] = url;
      await query('UPDATE Event SET content = ?, updatedAt = NOW() WHERE id = ?', [
        JSON.stringify(contentObj), eventId
      ]);
    } else {
      await query('UPDATE Event SET gpxFile = ?, updatedAt = NOW() WHERE id = ?', [
        url, eventId
      ]);
    }

    return successResponse({
      success: true,
      filename: filename || fileBase,
      path: gpxFilePath,
      url,
    });
  } catch (error: any) {
    console.error('[GPX-UPLOAD] Error:', error);
    return errorResponse(error.message || 'Failed to upload GPX');
  }
}
