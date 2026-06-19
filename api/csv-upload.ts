import { uploadCsvFile } from '../src/lib/fileStorage';

interface APIEvent {
  httpMethod: string;
  headers: { [key: string]: string };
  body: string | null;
  isBase64Encoded: boolean;
}

interface APIResponse {
  statusCode: number;
  headers: { [key: string]: string };
  body: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const VALID_KINDS = ['master', 'start', 'finish', 'checkpoint'];

export default async function handler(event: APIEvent): Promise<APIResponse> {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    if (!event.body) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing request body' }) };

    const body = event.isBase64Encoded
      ? JSON.parse(Buffer.from(event.body as string, 'base64').toString())
      : JSON.parse(event.body);

    const { kind, filename, rows, eventId, content } = body;
    const effectiveEventId = eventId || 'default';

    if (!kind || !VALID_KINDS.includes(kind)) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: `kind harus salah satu dari: ${VALID_KINDS.join(', ')}` }) };
    }

    const result = await uploadCsvFile(effectiveEventId, kind, content || '', filename, rows || 0);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        kind,
        filename: result.filename,
        url: result.url,
        downloadUrl: result.url,
        rows: result.rows,
        updatedAt: result.updatedAt,
        path: result.path,
      }),
    };
  } catch (error: any) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message || 'Failed to upload CSV' }) };
  }
}
