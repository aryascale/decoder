import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';
import prisma from '../src/lib/prisma';
import { logActivity } from '../src/lib/activity-logger';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  try {
    if (event.httpMethod !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    const body = parseBody(event);
    if (!body) return errorResponse('Missing request body', 400);

    let { eventId, logs } = body;

    if (!Array.isArray(logs) || logs.length === 0) {
      return errorResponse('logs array is required and must not be empty', 400);
    }

    // Auto-detect eventId if not provided by hardware
    if (!eventId) {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      // Find an event happening today, or an active one
      const activeEvent = await prisma.event.findFirst({
        where: {
          OR: [
            { eventDate: { gte: startOfDay, lte: endOfDay } },
            { status: 'ongoing' }
          ],
          isDeleted: false
        },
        orderBy: { eventDate: 'desc' }
      });

      if (!activeEvent) {
        return errorResponse('No active event found for today. Please specify eventId manually.', 404);
      }
      eventId = activeEvent.id;
    } else {
      // Verify the provided event exists
      const existingEvent = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!existingEvent) {
        return errorResponse('Event not found', 404);
      }
    }

    // Bulk insert logs
    const mappedLogs = logs.map((log: any) => ({
      eventId,
      epc: log.epc,
      timestamp: new Date(log.timestamp),
      readerId: log.readerId || null,
      antenna: String(log.antenna || ''),
    }));

    // Insert to DecoderLog table
    const createdLogs = await prisma.decoderLog.createMany({
      data: mappedLogs,
      skipDuplicates: true 
    });

    // Also write to Penalty or Checkpoint if it requires? 
    // Actually, currently checkpoints are loaded from CSV (the time string). If decoder logs are syncing to DecoderLog table, we might need a way to combine them with existing checkpoints or fetch them.
    // For now, we just save to DecoderLog table.

    // Log the action briefly
    await logActivity(
      'decoder.sync',
      `Synced ${createdLogs.count} logs from decoder.`,
      'system',
      eventId
    );

    return successResponse({
      message: `Successfully synced ${createdLogs.count} logs`,
      syncedCount: createdLogs.count
    });

  } catch (error: any) {
    console.error('[DECODER-SYNC] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
