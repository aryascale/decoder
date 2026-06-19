import { logActivity } from '../src/lib/activity-logger';
import { successResponse, errorResponse, CORS_HEADERS } from '../src/lib/api-utils';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const body = JSON.parse(event.body || '{}');
    const { action, detail, metadata } = body;

    if (!action) {
      return errorResponse('Action is required', 400);
    }

    // Default to 'frontend' as actor if not provided in metadata, otherwise use IP or 'anonymous'
    const actor = metadata?.userEmail || 'anonymous_user';

    await logActivity(
      action,
      detail || '',
      actor,
      metadata?.eventId || null,
      metadata
    );

    return successResponse({ success: true });
  } catch (error: any) {
    console.error('[CLIENT-LOGS] Error saving log:', error);
    // Don't fail loudly on log failures, just return 500
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
