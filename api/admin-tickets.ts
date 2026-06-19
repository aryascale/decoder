import { PrismaClient } from '@prisma/client';
import { successResponse, errorResponse, CORS_HEADERS } from '../src/lib/api-utils';

const prisma = new PrismaClient();

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  const { httpMethod, queryStringParameters, body } = event;

  if (httpMethod === 'GET') {
    try {
      const { id, eventId, status } = queryStringParameters || {};

      // If ID is provided, fetch a single ticket
      if (id) {
        const ticket = await prisma.supportTicket.findUnique({
          where: { id },
          include: { event: true },
        });

        if (!ticket) return errorResponse('Ticket not found', 404);
        return successResponse({ ticket });
      }

      // Fetch list of tickets
      const where: any = {};
      if (eventId) where.eventId = eventId;
      if (status) where.status = status;

      const tickets = await prisma.supportTicket.findMany({
        where,
        include: { event: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });

      return successResponse({ tickets });
    } catch (error: any) {
      console.error('[ADMIN-TICKETS] Error fetching tickets:', error);
      return errorResponse('Failed to fetch tickets');
    }
  }

  if (httpMethod === 'PATCH') {
    try {
      const { id } = queryStringParameters || {};
      if (!id) return errorResponse('Ticket ID required', 400);

      const data = typeof body === 'string' ? JSON.parse(body) : body;
      const { status, resolutionNotes, resolvedBy } = data;

      const updateData: any = {};
      if (status) updateData.status = status;
      if (resolutionNotes !== undefined) updateData.resolutionNotes = resolutionNotes;
      if (resolvedBy) updateData.resolvedBy = resolvedBy;
      if (status === 'resolved') updateData.resolvedAt = new Date();

      const ticket = await prisma.supportTicket.update({
        where: { id },
        data: updateData,
        include: { event: true },
      });

      return successResponse({ ticket });
    } catch (error: any) {
      console.error('[ADMIN-TICKETS] Error updating ticket:', error);
      return errorResponse('Failed to update ticket');
    }
  }

  return errorResponse('Method not allowed', 405);
}
