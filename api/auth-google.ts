import { query } from '../src/lib/db';
import { OAuth2Client } from 'google-auth-library';
import { signToken } from '../src/lib/jwt';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';

const client = new OAuth2Client(
  process.env.VITE_GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage'
);

export default async function handler(req: any) {
  if (req.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (req.httpMethod !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const { code } = parseBody(req);
    if (!code) return errorResponse('No authorization code provided', 400);

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.VITE_GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) return errorResponse('Invalid Google token payload', 400);

    const { email, sub: googleId, name } = payload;

    let users: any = await query('SELECT * FROM User WHERE email = ? LIMIT 1', [email]);
    let user = users[0];

    if (!user) {
      const baseUsername = email.split('@')[0];
      let username = baseUsername;
      let counter = 1;
      let existing: any = await query('SELECT id FROM User WHERE username = ? LIMIT 1', [username]);
      while (existing.length > 0) {
        username = `${baseUsername}${counter++}`;
        existing = await query('SELECT id FROM User WHERE username = ? LIMIT 1', [username]);
      }

      const userId = crypto.randomUUID();
      await query(
        'INSERT INTO User (id, email, username, googleId, name, isPhoneVerified, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [userId, email, username, googleId, name, false, 'user']
      );
      users = await query('SELECT * FROM User WHERE id = ? LIMIT 1', [userId]);
      user = users[0];
    } else if (!user.googleId) {
      await query('UPDATE User SET googleId = ?, updatedAt = NOW() WHERE email = ?', [googleId, email]);
      users = await query('SELECT * FROM User WHERE email = ? LIMIT 1', [email]);
      user = users[0];
    }

    const jwtToken = signToken({ id: user.id, email: user.email, role: user.role });

    const response = successResponse({
      user: { id: user.id, email: user.email, username: user.username, role: user.role }
    });

    response.headers['Set-Cookie'] = `token=${jwtToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

    return response;
  } catch (error: any) {
    console.error('[AUTH-GOOGLE] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
