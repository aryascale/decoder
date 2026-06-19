import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';
import { createBackup, listBackups, getBackupData, restoreRegistrations } from '../src/lib/backup';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  try {
    // GET - list backups or get one
    if (event.httpMethod === 'GET') {
      const filename = event.queryStringParameters?.file;
      if (filename) {
        const data = getBackupData(filename);
        if (!data) return errorResponse('Backup not found', 404);
        return successResponse(data);
      }
      return successResponse({ backups: listBackups() });
    }

    // POST - create backup or restore
    if (event.httpMethod === 'POST') {
      const body = parseBody(event);
      
      if (body?.action === 'restore' && body?.file) {
        const result = await restoreRegistrations(body.file);
        return successResponse({ message: `Restored ${result.restored} registrations, skipped ${result.skipped}`, ...result });
      }

      // Manual backup
      const filename = await createBackup('manual');
      return successResponse({ message: 'Backup created', filename });
    }

    return errorResponse('Method not allowed', 405);
  } catch (error: any) {
    console.error('[ADMIN-BACKUPS] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
