import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { eventId } = req.query;
  if (!eventId) {
    return res.status(400).json({ error: 'eventId is required' });
  }

  try {
    const logs = await prisma.decoderLog.findMany({
      where: { eventId },
      orderBy: { timestamp: 'asc' },
    });

    return res.status(200).json(logs);
  } catch (error) {
    console.error('Error fetching decoder logs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
