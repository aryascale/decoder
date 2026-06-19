import { query } from '../src/lib/db';
import { verifyToken } from '../src/lib/jwt';
import { successResponse, errorResponse, CORS_HEADERS } from '../src/lib/api-utils';

export default async function handler(req: any) {
  if (req.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (req.httpMethod !== 'GET') return errorResponse('Method not allowed', 405);

  try {
    const token = req.cookies?.token;
    if (!token) return errorResponse('Not authenticated', 401);

    const decoded: any = verifyToken(token);
    if (!decoded || !decoded.id) return errorResponse('Invalid token', 401);

    const users: any = await query(
      'SELECT id, email, username, name, phoneNumber, isPhoneVerified, isEmailVerified, role, googleId FROM User WHERE id = ? LIMIT 1',
      [decoded.id]
    );

    if (users.length === 0) return errorResponse('User not found', 404);

    const user = users[0];
    user.isPhoneVerified = !!user.isPhoneVerified;
    user.isEmailVerified = !!user.isEmailVerified;

    return successResponse({ user });
  } catch (error: any) {
    console.error('[AUTH] Me error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
