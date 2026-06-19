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
    if (!decoded?.id) return errorResponse('Invalid token', 401);

    const { email, code } = parseBody(req);
    if (!email || !code) return errorResponse('Email and code are required', 400);

    const otps: any = await query(
      'SELECT * FROM Otp WHERE phoneNumber = ? AND code = ? LIMIT 1',
      [email, code]
    );

    if (otps.length === 0) return errorResponse('Invalid or expired OTP', 400);
    if (new Date() > new Date(otps[0].expiresAt)) return errorResponse('OTP has expired', 400);

    await query('UPDATE User SET isEmailVerified = true, updatedAt = NOW() WHERE id = ?', [decoded.id]);
    await query('DELETE FROM Otp WHERE phoneNumber = ?', [email]);

    return successResponse({ message: 'Email verified successfully' });
  } catch (error: any) {
    console.error('[AUTH] Verify Email OTP error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
