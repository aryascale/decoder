import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

// Configure nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function generateTicketNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LMPT-${year}${month}-${randomStr}`;
}

async function sendTicketEmail(email: string, name: string, ticketNumber: string, subject: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP credentials not configured. Skipping email send.');
    return;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">Tiket Kendala Berhasil Dibuat</h2>
      <p>Halo <strong>${name}</strong>,</p>
      <p>Terima kasih telah menghubungi kami. Tiket laporan kendala Anda telah berhasil dibuat dengan rincian sebagai berikut:</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Nomor Tiket:</strong> ${ticketNumber}</p>
        <p style="margin: 5px 0;"><strong>Topik:</strong> ${subject}</p>
      </div>
      <p>Tim kami akan segera meninjau laporan Anda dan menghubungi Anda kembali melalui email ini atau WhatsApp. Anda juga dapat mengecek status tiket Anda melalui tautan berikut:</p>
      <p><a href="${process.env.PUBLIC_URL || 'http://localhost:3069'}/cek-tiket" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Cek Status Tiket</a></p>
      <p>Terima kasih,<br>Tim Lumpat</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Lumpat Support" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `[LUMPAT] Tiket ${ticketNumber} - ${subject}`,
      html,
    });
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

export default async function handler(event: any) {
  const { httpMethod, body, queryStringParameters } = event;

  if (httpMethod === 'POST') {
    try {
      const data = typeof body === 'string' ? JSON.parse(body) : body;
      const { name, email, phoneNumber, category, subject, description, eventId } = data;

      if (!name || !email || !category || !subject || !description) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Data tidak lengkap' }),
        };
      }

      const ticketNumber = generateTicketNumber();

      const ticket = await prisma.supportTicket.create({
        data: {
          ticketNumber,
          name,
          email,
          phoneNumber,
          category,
          subject,
          description,
          eventId: eventId || null,
        },
      });

      // Send email asynchronously
      sendTicketEmail(email, name, ticketNumber, subject).catch(console.error);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, ticketNumber }),
      };
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Gagal membuat tiket' }),
      };
    }
  }

  if (httpMethod === 'GET') {
    try {
      const { email, ticketNumber } = queryStringParameters || {};

      if (!email || !ticketNumber) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Email dan Nomor Tiket dibutuhkan' }),
        };
      }

      const ticket = await prisma.supportTicket.findUnique({
        where: { ticketNumber },
        include: { event: true },
      });

      if (!ticket || ticket.email.toLowerCase() !== email.toLowerCase()) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Tiket tidak ditemukan atau email tidak cocok' }),
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket }),
      };
    } catch (error: any) {
      console.error('Error fetching ticket:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Gagal memuat tiket' }),
      };
    }
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
}
