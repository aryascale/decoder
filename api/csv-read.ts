import { getCsvFileContent } from '../src/lib/fileStorage';

interface APIEvent {
  httpMethod: string;
  headers: { [key: string]: string };
  queryStringParameters?: { [key: string]: string };
}

interface APIResponse {
  statusCode: number;
  headers: { [key: string]: string };
  body: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(event: APIEvent): Promise<APIResponse> {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const kind = event.queryStringParameters?.kind;
    const eventId = event.queryStringParameters?.eventId || 'default';

    if (!kind) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Parameter kind required' }) };

    const result = await getCsvFileContent(eventId, kind as any);

    if (!result) {
      if (['start', 'checkpoint'].includes(kind)) {
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ text: null, filename: null, updatedAt: null, url: null }) };
      }
      return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: 'CSV not found' }) };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        text: result.text,
        filename: result.meta.filename,
        url: result.meta.url,
        updatedAt: result.meta.updatedAt,
      }),
    };
  } catch (error: any) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message || 'Failed to read CSV' }) };
  }
}
