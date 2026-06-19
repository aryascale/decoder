import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const BASE_URL = process.env.BASE_URL || 'https://lumpat.online';

export async function sendRegistrationConfirmation(reg: any) {
  try {
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@lumpat.id';
    const eventDateStr = new Date(reg.eventDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // Generate QR Code as base64 data URI
    const verifyUrl = `${BASE_URL}/verify/${reg.id}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#0a0a0a', light: '#ffffff' },
    });

    // Extract base64 from data URL for CID attachment
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');

    await transporter.sendMail({
      from: fromAddress,
      to: reg.email,
      subject: `Konfirmasi Pendaftaran: ${reg.eventName}`,
      attachments: [
        {
          filename: 'qr-code.png',
          content: Buffer.from(qrBase64, 'base64'),
          cid: `qrcode-${reg.id}@lumpat`,
        },
      ],
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">

            <!-- Simple Header -->
            <div style="background: #000000; padding: 40px 30px; text-align: center;">
              <div style="display: inline-block; background: #e11d48; padding: 4px 12px; font-size: 10px; font-weight: 900; color: white; letter-spacing: 2px; text-transform: uppercase; border-radius: 4px; margin-bottom: 15px;">CONFIRMED</div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.02em;">Pembayaran Berhasil!</h1>
              <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 14px;">Selamat, pendaftaran Anda telah kami terima.</p>
            </div>

            <!-- Event Strip -->
            <div style="background: #e11d48; padding: 12px 30px; text-align: center;">
              <span style="color: white; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">${reg.eventName}</span>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #111827;">Halo <strong>${reg.name}</strong>,</p>
              <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">Terima kasih telah mendaftar. Simpan email ini sebagai bukti pendaftaran resmi Anda.</p>
              
              <div style="margin-top: 30px; padding: 25px; background: #f9fafb; border-radius: 12px; border: 1px solid #f3f4f6;">
                <h3 style="margin: 0 0 20px 0; font-size: 12px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Detail Registrasi</h3>
                
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Event</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #111827;">${reg.eventName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Kategori</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #111827;">${reg.categoryName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Tanggal</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #111827;">${eventDateStr}</td>
                  </tr>
                  ${reg.tshirtSize ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Ukuran Baju</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #e11d48;">${reg.tshirtSize}</td>
                  </tr>` : ''}
                  ${reg.bibName ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Custom BIB</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #e11d48;">${reg.bibName}</td>
                  </tr>` : ''}

                  <!-- Dynamic Custom Fields -->
                  ${await (async () => {
                    if (!reg.customData) return '';
                    try {
                      const data = typeof reg.customData === 'string' ? JSON.parse(reg.customData) : reg.customData;
                      
                      // Fetch field definitions for this event to get labels
                      const { query } = await import('./db');
                      const fieldDefs: any = await query('SELECT id, label FROM RegistrationField WHERE eventId = ?', [reg.eventId]);
                      const labelMap = new Map(fieldDefs.map((f: any) => [f.id.toLowerCase(), f.label]));

                      return Object.entries(data)
                        .filter(([key, val]) => val && !['name', 'email', 'phoneNumber', 'gender', 'tshirtSize', 'bibName', 'categoryId', 'eventId'].includes(key))
                        .map(([key, val]) => {
                          const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(key);
                          const label = labelMap.get(key.toLowerCase());
                          if (!label && isUUID) return ''; // Skip deleted fields to avoid showing ugly UUIDs
                          const displayLabel = label || key.replace(/([A-Z])/g, ' $1').trim();
                          return `
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; text-transform: capitalize;">${displayLabel}</td>
                            <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #111827;">${val}</td>
                          </tr>`;
                        }).join('');
                    } catch (e) { return ''; }
                  })()}

                  <tr>
                    <td style="padding: 20px 0 0 0; color: #9ca3af; font-size: 11px;">Order ID</td>
                    <td style="padding: 20px 0 0 0; text-align: right; font-family: monospace; font-size: 11px; color: #9ca3af;">${reg.orderId}</td>
                  </tr>
                </table>
              </div>

              <!-- QR Code Section -->
              <div style="margin-top: 30px; text-align: center; border: 2px solid #f3f4f6; border-radius: 16px; padding: 30px;">
                <p style="margin: 0 0 15px 0; font-size: 10px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 2px;">Kode Check-in Anda</p>
                <div style="padding: 10px; background: white; display: inline-block;">
                   <img src="cid:qrcode-${reg.id}@lumpat" alt="QR Code" width="160" height="160" style="display: block;" />
                </div>
                <p style="margin: 15px 0 0 0; font-size: 12px; color: #6b7280;">Tunjukkan kode ini saat pengambilan Race Pack</p>
              </div>

              <!-- Button -->
              <div style="margin-top: 30px; text-align: center;">
                <a href="${verifyUrl}" style="display: inline-block; background: #000000; color: white; padding: 16px 30px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Lihat Status Pendaftaran</a>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #f3f4f6;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">Lumpat &copy; ${new Date().getFullYear()}. All rights reserved.</p>
              <p style="font-size: 11px; color: #d1d5db; margin: 10px 0 0 0;">Email ini dikirim secara otomatis oleh sistem Lumpat.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('[EMAIL-SERVICE] Failed to send email:', error);
    return { success: false, error };
  }
}
