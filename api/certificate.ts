import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.resolve("uploads");

interface APIEvent {
  httpMethod: string;
  headers: { [key: string]: string };
  queryStringParameters: { [key: string]: string };
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
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function getCertDir(eventId: string) {
  return path.join(UPLOAD_DIR, "events", eventId, "certificate");
}

export default async function handler(event: APIEvent): Promise<APIResponse> {
  const eventId = event.queryStringParameters?.eventId || "";
  if (!eventId) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "eventId is required" }) };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod === "GET") {
    const dir = getCertDir(eventId);
    if (!fs.existsSync(dir)) {
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ hasCertificate: false, files: [] }) };
    }

    const files = fs.readdirSync(dir).filter(f => !f.startsWith("."));
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        hasCertificate: files.length > 0,
        files: files.map(f => ({
          filename: f,
          url: `/uploads/events/${eventId}/certificate/${f}`,
          size: fs.statSync(path.join(dir, f)).size,
          updatedAt: fs.statSync(path.join(dir, f)).mtimeMs,
        })),
      }),
    };
  }

  if (event.httpMethod === "DELETE") {
    const dir = getCertDir(eventId);
    const filename = event.queryStringParameters?.filename;

    if (filename) {
      const filePath = path.join(dir, path.basename(filename));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } else if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach(f => fs.unlinkSync(path.join(dir, f)));
    }

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "Method not allowed" }) };
}
