import { successResponse, CORS_HEADERS } from '../src/lib/api-utils';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  
  try {
    return successResponse({ serverTime: Date.now() });
  } catch (error: any) {
    console.error('[API-TIME] Error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Internal server error' }) };
  }
}
