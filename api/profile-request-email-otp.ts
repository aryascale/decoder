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

    const { email } = parseBody(req);
    if (!email) return errorResponse('Email is required', 400);

    // Check if email belongs to someone else
    const existing = await query('SELECT id FROM User WHERE email = ? AND id != ? LIMIT 1', [email, decoded.id]);
    if ((existing as any).length > 0) return errorResponse('Email is already in use', 400);

    await query('UPDATE User SET email = ?, isEmailVerified = false, updatedAt = NOW() WHERE id = ?', [email, decoded.id]);
    await query('DELETE FROM Otp WHERE phoneNumber = ?', [email]); // Using phoneNumber column in Otp table to store email for now to avoid schema change

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await query(
      'INSERT INTO Otp (id, phoneNumber, code, expiresAt, createdAt) VALUES (?, ?, ?, ?, NOW())',
      [crypto.randomUUID(), email, code, expiresAt]
    );

    console.log(`\n================================`);
    console.log(`[MOCK EMAIL] To: ${email}`);
    console.log(`[MOCK EMAIL] Code: ${code}`);
    console.log(`================================\n`);

    return successResponse({ 
      message: 'OTP sent successfully',
      mockCode: code 
    });
  } catch (error: any) {
    console.error('[PROFILE] Request Email OTP error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
