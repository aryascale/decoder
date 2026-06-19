import { query } from '../src/lib/db';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';
import crypto from 'crypto';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  try {
    const eventId = event.queryStringParameters?.eventId;
    if (!eventId) return errorResponse('eventId is required', 400);

    // GET: List t-shirt inventory for an event
    if (event.httpMethod === 'GET') {
      const inventory: any = await query(
        'SELECT * FROM TshirtInventory WHERE eventId = ? ORDER BY size ASC',
        [eventId]
      );
      return successResponse({ inventory });
    }

    // POST: Create or bulk-update t-shirt inventory
    if (event.httpMethod === 'POST') {
      const body = parseBody(event);
      if (!body) return errorResponse('Missing request body', 400);

      const { inventory, sizeChartHtml } = body;
      if (!Array.isArray(inventory)) return errorResponse('inventory must be an array', 400);

      if (sizeChartHtml !== undefined) {
        const ev: any = await query('SELECT content FROM Event WHERE id = ?', [eventId]);
        if (ev.length > 0) {
          let content = typeof ev[0].content === 'string' ? JSON.parse(ev[0].content || '{}') : (ev[0].content || {});
          content.sizeChartHtml = sizeChartHtml;
          await query('UPDATE Event SET content = ? WHERE id = ?', [JSON.stringify(content), eventId]);
        }
      }

      // Upsert each size
      for (const item of inventory) {
        if (!item.size) continue;

        const existing: any = await query(
          'SELECT id, sold FROM TshirtInventory WHERE eventId = ? AND size = ? LIMIT 1',
          [eventId, item.size]
        );

        if (existing.length > 0) {
          await query(
            'UPDATE TshirtInventory SET quota = ?, width = ?, height = ? WHERE id = ?',
            [item.quota || 0, item.width || null, item.height || null, existing[0].id]
          );
        } else {
          await query(
            'INSERT INTO TshirtInventory (id, eventId, size, quota, sold, width, height) VALUES (?, ?, ?, ?, 0, ?, ?)',
            [crypto.randomUUID(), eventId, item.size, item.quota || 0, item.width || null, item.height || null]
          );
        }
      }

      const updated: any = await query(
        'SELECT * FROM TshirtInventory WHERE eventId = ? ORDER BY size ASC',
        [eventId]
      );
      return successResponse({ inventory: updated });
    }

    // DELETE: Remove a specific size
    if (event.httpMethod === 'DELETE') {
      const sizeId = event.queryStringParameters?.sizeId;
      if (!sizeId) return errorResponse('sizeId is required', 400);

      await query('DELETE FROM TshirtInventory WHERE id = ? AND eventId = ?', [sizeId, eventId]);
      return successResponse({ success: true });
    }

    return errorResponse('Method not allowed', 405);
  } catch (error: any) {
    console.error('[TSHIRT-INVENTORY] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
