import { query } from '../src/lib/db';
import { verifyToken } from '../src/lib/jwt';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';

export default async function handler(req: any) {
  if (req.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (req.httpMethod !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const token = req.cookies?.token;
    if (!token) return errorResponse('Unauthorized', 401);

    const decoded: any = verifyToken(token);
    if (!decoded || !decoded.id) return errorResponse('Invalid token', 401);

    const { phoneNumber } = parseBody(req);
    if (!phoneNumber) return errorResponse('Phone number is required', 400);

    await query('UPDATE User SET phoneNumber = ?, isPhoneVerified = false, updatedAt = NOW() WHERE id = ?', [phoneNumber, decoded.id]);
    await query('DELETE FROM Otp WHERE phoneNumber = ?', [phoneNumber]);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await query(
      'INSERT INTO Otp (id, phoneNumber, code, expiresAt, createdAt) VALUES (?, ?, ?, ?, NOW())',
      [crypto.randomUUID(), phoneNumber, code, expiresAt]
    );

    console.log(`\n================================`);
    console.log(`[MOCK SMS] To: ${phoneNumber}`);
    console.log(`[MOCK SMS] Code: ${code}`);
    console.log(`================================\n`);

    return successResponse({ 
      message: 'OTP sent successfully',
      mockCode: code // Return mock code for testing purposes
    });
  } catch (error: any) {
    console.error('[PROFILE] Request OTP error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
