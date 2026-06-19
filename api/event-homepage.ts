import { query } from '../src/lib/db';

/**
 * Serves event homepage HTML content directly as text/html.
 * Used by iframe src to render uploaded HTML pages reliably.
 * 
 * GET /api/event-homepage?eventId=xxx
 * Returns: raw HTML with Content-Type: text/html
 */
export default async function handler(req: any) {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  if (req.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS, body: 'Method not allowed' };
  }

  try {
    const eventId = req.queryStringParameters?.eventId;
    if (!eventId) {
      return { statusCode: 400, headers: { ...CORS, 'Content-Type': 'text/html' }, body: '<p>Missing eventId</p>' };
    }

    const events: any = await query(
      'SELECT content FROM Event WHERE (id = ? OR slug = ?) AND isDeleted = false LIMIT 1',
      [eventId, eventId]
    );

    if (events.length === 0) {
      return { statusCode: 404, headers: { ...CORS, 'Content-Type': 'text/html' }, body: '<p>Event not found</p>' };
    }

    let content: any = null;
    try {
      content = typeof events[0].content === 'string' ? JSON.parse(events[0].content) : events[0].content;
    } catch {
      return { statusCode: 500, headers: { ...CORS, 'Content-Type': 'text/html' }, body: '<p>Invalid content</p>' };
    }

    const htmlContent = content?.about;
    if (!htmlContent) {
      return { statusCode: 404, headers: { ...CORS, 'Content-Type': 'text/html' }, body: '<p>No homepage content</p>' };
    }

    // Return raw HTML as a full page — the browser renders it naturally
    return {
      statusCode: 200,
      headers: {
        ...CORS,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
      body: htmlContent,
    };
  } catch (err: any) {
    console.error('event-homepage error:', err);
    return {
      statusCode: 500,
      headers: { ...CORS, 'Content-Type': 'text/html' },
      body: `<p>Error: ${err.message}</p>`,
    };
  }
}
