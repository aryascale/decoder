import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.resolve("uploads");

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

function parseMultipart(body: string, boundary: string): { file?: { name: string; type: string; data: Buffer }; fields: Record<string, string> } {
  const result: { file?: { name: string; type: string; data: Buffer }; fields: Record<string, string> } = { fields: {} };
  const parts = body.split(`--${boundary}`);

  for (const part of parts) {
    if (!part.includes('Content-Disposition')) continue;

    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;

    const headers = part.slice(0, headerEnd);
    const content = part.slice(headerEnd + 4);
    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);

    if (!nameMatch) continue;

    if (filenameMatch) {
      let fileContent = content;
      const boundaryIndex = fileContent.lastIndexOf('\r\n--');
      if (boundaryIndex !== -1) fileContent = fileContent.slice(0, boundaryIndex);

      result.file = {
        name: filenameMatch[1],
        type: contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream',
        data: Buffer.from(fileContent, 'binary'),
      };
    } else {
      let fieldContent = content.trim();
      const boundaryIndex = fieldContent.indexOf('\r\n--');
      if (boundaryIndex !== -1) fieldContent = fieldContent.slice(0, boundaryIndex);
      result.fields[nameMatch[1]] = fieldContent.trim();
    }
  }

  return result;
}

export default async function handler(event: APIEvent): Promise<APIResponse> {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    if (!contentType.includes('multipart/form-data')) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Content-Type must be multipart/form-data' }) };

    const boundary = contentType.split('boundary=')[1];
    if (!boundary) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing boundary' }) };
    if (!event.body) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing request body' }) };

    const body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('binary')
      : event.body;

    const { file, fields } = parseMultipart(body, boundary);
    if (!file) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'No file uploaded' }) };

    const eventId = fields.eventId;
    if (!eventId) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'eventId is required' }) };

    const certDir = path.join(UPLOAD_DIR, "events", eventId, "certificate");
    fs.mkdirSync(certDir, { recursive: true });

    fs.readdirSync(certDir).forEach(f => fs.unlinkSync(path.join(certDir, f)));

    const ext = path.extname(file.name) || '.png';
    const filename = `certificate${ext}`;
    const filePath = path.join(certDir, filename);
    fs.writeFileSync(filePath, file.data);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        url: `/uploads/events/${eventId}/certificate/${filename}`,
        filename,
        size: file.data.length,
      }),
    };
  } catch (error: any) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message || 'Internal server error' }) };
  }
}
