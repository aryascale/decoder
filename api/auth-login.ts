import { query } from '../src/lib/db';
import bcrypt from 'bcryptjs';
import { signToken } from '../src/lib/jwt';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';

export default async function handler(req: any) {
  if (req.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (req.httpMethod !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const { email, password } = parseBody(req);

    if (!email || !password) {
      return errorResponse('Missing required fields', 400);
    }

    const users: any = await query(
      'SELECT id, email, username, password, role FROM User WHERE email = ? LIMIT 1',
      [email]
    );

    if (users.length === 0 || !users[0].password) {
      return errorResponse('Invalid email or password', 401);
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return errorResponse('Invalid email or password', 401);
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    const response = successResponse({
      user: { id: user.id, email: user.email, username: user.username, role: user.role }
    });

    response.headers['Set-Cookie'] = `token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

    return response;
  } catch (error: any) {
    console.error('[AUTH] Login error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
