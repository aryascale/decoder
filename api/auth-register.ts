import { query } from '../src/lib/db';
import bcrypt from 'bcryptjs';
import { signToken } from '../src/lib/jwt';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';

export default async function handler(req: any) {
  if (req.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (req.httpMethod !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const { email, username, password } = parseBody(req);

    if (!email || !username || !password) {
      return errorResponse('Missing required fields', 400);
    }

    const existingUsers: any = await query(
      'SELECT id, email, username FROM User WHERE email = ? OR username = ? LIMIT 1',
      [email, username]
    );

    if (existingUsers.length > 0) {
      const existing = existingUsers[0];
      return errorResponse(existing.email === email ? 'Email already exists' : 'Username already exists', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    await query(
      'INSERT INTO User (id, email, username, password, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [userId, email, username, hashedPassword, 'user']
    );

    const token = signToken({ id: userId, email, role: 'user' });

    const response = successResponse({
      user: { id: userId, email, username, role: 'user' }
    }, 201);

    response.headers['Set-Cookie'] = `token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

    return response;
  } catch (error: any) {
    console.error('[AUTH] Register error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
