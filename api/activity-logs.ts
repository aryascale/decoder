import { query } from '../src/lib/db';
import { successResponse, errorResponse, CORS_HEADERS } from '../src/lib/api-utils';

let tableCreated = false;

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'GET') return errorResponse('Method not allowed', 405);

  try {
    if (!tableCreated) {
      await query(`
        CREATE TABLE IF NOT EXISTS ActivityLog (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          eventId VARCHAR(191) NULL,
          action VARCHAR(191) NOT NULL,
          detail TEXT NULL,
          actor VARCHAR(191) NULL,
          metadata JSON NULL,
          createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          INDEX \`ActivityLog_eventId_idx\`(\`eventId\`),
          INDEX \`ActivityLog_action_idx\`(\`action\`),
          INDEX \`ActivityLog_createdAt_idx\`(\`createdAt\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
      tableCreated = true;
    }

    const eventId = event.queryStringParameters?.eventId;
    const action = event.queryStringParameters?.action;
    const category = event.queryStringParameters?.category;
    const limit = parseInt(event.queryStringParameters?.limit || '50');
    const offset = parseInt(event.queryStringParameters?.offset || '0');

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (eventId && eventId !== 'all') { 
      where += ' AND (eventId = ? OR eventId IS NULL)'; 
      params.push(eventId); 
    }
    
    if (action) { 
      where += ' AND action LIKE ?'; 
      params.push(`${action}%`); 
    }

    if (category && category !== 'ALL') {
      if (category === 'ERROR') {
        where += ' AND (action LIKE ? OR action LIKE ?)';
        params.push('%ERROR%', '%FAIL%');
      } else if (category === 'AUTH') {
        where += ' AND (action LIKE ? OR action LIKE ? OR action LIKE ?)';
        params.push('%LOGIN%', '%LOGOUT%', '%REGISTER%');
      } else if (category === 'PAYMENT') {
        where += ' AND (action LIKE ? OR action LIKE ? OR action LIKE ?)';
        params.push('%PAYMENT%', '%CHECKOUT%', '%SETTLE%');
      } else if (category === 'ADMIN') {
        where += ' AND action LIKE ?';
        params.push('ADMIN%');
      } else if (category === 'SYSTEM') {
        where += ' AND (action LIKE ? OR action LIKE ? OR action LIKE ?)';
        params.push('SYSTEM%', 'WEBHOOK%', 'CRON%');
      } else if (category === 'USER') {
        where += ' AND (action LIKE ? OR action LIKE ?)';
        params.push('TNC%', 'USER%');
      } else {
        where += ' AND action LIKE ?';
        params.push(`${category}%`);
      }
    }

    const logs: any = await query(
      `SELECT * FROM ActivityLog ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const countResult: any = await query(
      `SELECT COUNT(*) as total FROM ActivityLog ${where}`,
      params
    );

    return successResponse({
      logs: logs.map((l: any) => ({
        id: l.id,
        eventId: l.eventId,
        action: l.action,
        detail: l.detail,
        actor: l.actor,
        metadata: l.metadata ? (typeof l.metadata === 'string' ? JSON.parse(l.metadata) : l.metadata) : null,
        createdAt: l.createdAt,
      })),
      total: countResult[0]?.total || 0,
    });
  } catch (error: any) {
    console.error('[ACTIVITY-LOGS] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
