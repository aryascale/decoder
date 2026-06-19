import { query } from '../src/lib/db';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const body = parseBody(event);
    if (!body?.email) return errorResponse('Email is required', 400);

    const email = body.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return errorResponse('Invalid email format', 400);

    // Rate limit: max 5 OTP requests per email in last hour
    const recentOtps: any = await query(
      "SELECT COUNT(*) as cnt FROM EmailOtp WHERE email = ? AND createdAt > DATE_SUB(NOW(), INTERVAL 1 HOUR)",
      [email]
    );
    if (recentOtps[0]?.cnt >= 5) {
      return errorResponse('Terlalu banyak permintaan OTP. Coba lagi dalam 1 jam.', 429);
    }

    // Generate 6-digit OTP
    const code = String(crypto.randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save to DB
    await query(
      "INSERT INTO EmailOtp (id, email, code, expiresAt, verified, createdAt) VALUES (?, ?, ?, ?, false, NOW())",
      [crypto.randomUUID(), email, code, expiresAt]
    );

    // Send email
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@lumpat.id';
    await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: `Kode Verifikasi Lumpat`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 800; color: #111827; margin: 0;">Lumpat</h1>
            <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Verifikasi Email Pendaftaran</p>
          </div>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="color: #374151; font-size: 14px; margin: 0 0 16px 0;">Masukkan kode berikut untuk verifikasi email kamu:</p>
            <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #111827; font-family: monospace;">${code}</div>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">Berlaku selama 10 menit</p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">Jika kamu tidak meminta kode ini, abaikan email ini.</p>
        </div>
      `,
    });

    return successResponse({ message: 'Kode verifikasi telah dikirim ke email kamu.', sent: true });
  } catch (error: any) {
    console.error('[SEND-EMAIL-OTP] Error:', error);
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      return errorResponse('SMTP authentication failed. Check SMTP credentials in .env', 500);
    }
    return errorResponse('Gagal mengirim email. Coba lagi nanti.', 500);
  }
}
