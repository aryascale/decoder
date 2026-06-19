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

    const { eventId, logs } = body;

    if (!eventId) return errorResponse('eventId is required', 400);
    if (!Array.isArray(logs) || logs.length === 0) {
      return errorResponse('logs array is required and must not be empty', 400);
    }

    // Verify event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!existingEvent) {
      return errorResponse('Event not found', 404);
    }

    // Bulk insert logs
    const mappedLogs = logs.map((log: any) => ({
      eventId,
      epc: log.epc,
      timestamp: new Date(log.timestamp),
      readerId: log.readerId || null,
      antenna: log.antenna || null,
    }));

    // We can't do createMany with SQLite/some older MySQL easily sometimes if it exceeds limits, but for Prisma it handles chunking if needed.
    const createdLogs = await prisma.decoderLog.createMany({
      data: mappedLogs,
      skipDuplicates: true // In case the decoder re-sends logs
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
