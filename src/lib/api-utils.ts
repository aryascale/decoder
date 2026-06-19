export const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
  'Access-Control-Allow-Credentials': 'true',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export function successResponse(data: any, statusCode = 200) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(data),
  };
}

export function errorResponse(message: string, statusCode = 500) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: message }),
  };
}

export function parseBody(event: any) {
  if (!event.body) return {};
  try {
    const bodyStr = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString()
      : event.body;
    return JSON.parse(bodyStr);
  } catch {
    return {};
  }
}

export function parseMultipart(body: string, boundary: string) {
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
