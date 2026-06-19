import { query } from '../src/lib/db';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const body = parseBody(event);
    if (!body?.email || !body?.code) return errorResponse('Email and code are required', 400);

    const email = body.email.trim().toLowerCase();
    const code = body.code.trim();

    // Find valid OTP (not expired, not yet verified)
    const otps: any = await query(
      "SELECT id, code FROM EmailOtp WHERE email = ? AND expiresAt > NOW() AND verified = false ORDER BY createdAt DESC LIMIT 1",
      [email]
    );

    if (otps.length === 0) {
      return errorResponse('Kode verifikasi tidak ditemukan atau sudah expired. Kirim ulang kode.', 400);
    }

    if (otps[0].code !== code) {
      return errorResponse('Kode verifikasi salah. Periksa kembali.', 400);
    }

    // Mark as verified
    await query("UPDATE EmailOtp SET verified = true WHERE id = ?", [otps[0].id]);

    return successResponse({ verified: true, message: 'Email berhasil diverifikasi!' });
  } catch (error: any) {
    console.error('[VERIFY-EMAIL-OTP] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
