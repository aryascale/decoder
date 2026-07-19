import { query } from '../src/lib/db';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';
import { logActivity } from '../src/lib/activity-logger';
import crypto from 'crypto';

function formatEvent(event: any) {
  let content = null;
  if (event.content) {
    try {
      content = typeof event.content === 'string' ? JSON.parse(event.content) : event.content;
    } catch { content = null; }
  }
  let categoryStartTimes = event.categoryStartTimes;
  if (typeof categoryStartTimes === 'string') {
    try { categoryStartTimes = JSON.parse(categoryStartTimes); } catch {}
  }
  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    description: event.description || '',
    eventDate: event.eventDate instanceof Date ? event.eventDate.toISOString() : event.eventDate,
    location: event.location || '',
    latitude: event.latitude || undefined,
    longitude: event.longitude || undefined,
    status: event.status || 'upcoming',
    gpxFile: event.gpxFile || undefined,
    logoUrl: (event.logoUrl && event.logoUrl !== 'null') ? event.logoUrl : undefined,
    bannerUrl: (event.bannerUrl && event.bannerUrl !== 'null') ? event.bannerUrl : undefined,
    homeImageUrl: (event.homeImageUrl && event.homeImageUrl !== 'null') ? event.homeImageUrl : undefined,
    tshirtSizes: event.tshirtSizes || null,
    bibCustomPrice: event.bibCustomPrice || 0,
    isActive: !!event.isActive,
    isDraft: !!event.isDraft,
    isLoopMode: !!event.isLoopMode,
    minLapTimeMs: event.minLapTimeMs != null ? event.minLapTimeMs : 300000,
    publishAt: event.publishAt instanceof Date ? event.publishAt.toISOString() : event.publishAt,
    categories: event._categories || [],
    content,
    participantCount: event.participantCount || 0,
    isDeleted: !!event.isDeleted,
    createdAt: event.createdAt instanceof Date ? event.createdAt.getTime() : event.createdAt,
    cutoffMs: event.cutoffMs,
    timezoneOffset: event.timezoneOffset,
    categoryStartTimes,
    manualStartTime: event.manualStartTime instanceof Date ? event.manualStartTime.toISOString() : event.manualStartTime || null,
  };
}

export default async function handler(req: any) {
  if (req.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  try {
    const eventId = req.queryStringParameters?.eventId;

    if (req.httpMethod === 'GET') {
      if (eventId) {
        const events: any = await query(
          `SELECT e.*, 
            (SELECT COUNT(*) FROM EventRegistration WHERE eventId = e.id AND paymentStatus = 'settlement') as participantCount 
           FROM Event e 
           WHERE (e.id = ? OR e.slug = ?) AND e.isDeleted = false LIMIT 1`,
          [eventId, eventId]
        );
        if (events.length === 0) return errorResponse('Event not found', 404);
        
        // Hide if draft and not admin request
        const showDrafts = req.queryStringParameters?.showDrafts === 'true';
        const isDraft = !!events[0].isDraft;
        const publishAt = events[0].publishAt ? new Date(events[0].publishAt) : null;
        const isPublished = !isDraft || (publishAt && publishAt <= new Date());
        
        if (!showDrafts && !isPublished) {
          return errorResponse('Event not found', 404);
        }

        const categories: any = await query(
          `SELECT * FROM Category WHERE eventId = ? ${!showDrafts ? 'AND isHidden = false' : ''} ORDER BY \`order\` ASC`,
          [events[0].id]
        );
        events[0]._categories = categories.map((c: any) => c.name);
        return successResponse(formatEvent(events[0]));
      }

      const showDrafts = req.queryStringParameters?.showDrafts === 'true';
      const includeDeleted = req.queryStringParameters?.includeDeleted === 'true';
      let allEvents: any[];
      
      const deleteCondition = includeDeleted ? '1=1' : 'e.isDeleted = false';

      if (showDrafts) {
        allEvents = await query(`
          SELECT e.*, 
            (SELECT COUNT(*) FROM EventRegistration WHERE eventId = e.id AND paymentStatus = 'settlement') as participantCount 
          FROM Event e 
          WHERE ${deleteCondition}
          ORDER BY e.createdAt DESC
        `) as any[];
      } else {
        allEvents = await query(`
          SELECT e.*, 
            (SELECT COUNT(*) FROM EventRegistration WHERE eventId = e.id AND paymentStatus = 'settlement') as participantCount 
          FROM Event e 
          WHERE ${deleteCondition} AND (e.isDraft = false OR (e.publishAt IS NOT NULL AND e.publishAt <= NOW())) 
          ORDER BY e.createdAt DESC
        `) as any[];
      }

      if (allEvents.length > 0) {
        const eventIds = allEvents.map((e: any) => e.id);
        const placeholders = eventIds.map(() => '?').join(',');
        const categories: any = await query(
          `SELECT eventId, name FROM Category WHERE eventId IN (${placeholders}) ${!showDrafts ? 'AND isHidden = false' : ''} ORDER BY \`order\` ASC`,
          eventIds
        );
        
        const catMap = new Map();
        categories.forEach((c: any) => {
          if (!catMap.has(c.eventId)) catMap.set(c.eventId, []);
          catMap.get(c.eventId).push(c.name);
        });

        for (const event of allEvents) {
          event._categories = catMap.get(event.id) || [];
        }
      }

      return successResponse(allEvents.map(formatEvent));
    }

    if (req.httpMethod === 'POST') {
      const { name, description, eventDate, location, latitude, longitude, isActive, isDraft, publishAt, categories, isLoopMode, minLapTimeMs } = parseBody(req);
      if (!name || !eventDate) return errorResponse('Name and eventDate are required', 400);

      const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      let slug = baseSlug;
      let counter = 1;
      let existing: any = await query('SELECT id FROM Event WHERE slug = ? LIMIT 1', [slug]);
      while (existing.length > 0) {
        slug = `${baseSlug}-${counter++}`;
        existing = await query('SELECT id FROM Event WHERE slug = ? LIMIT 1', [slug]);
      }

      const eventIdNew = crypto.randomUUID();
      await query(
        'INSERT INTO Event (id, name, slug, description, eventDate, location, latitude, longitude, isActive, isDraft, publishAt, status, logoUrl, bannerUrl, createdAt, updatedAt, isLoopMode, minLapTimeMs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?)',
        [eventIdNew, name, slug, description || null, new Date(eventDate), location || null, latitude || null, longitude || null, isActive ?? true, isDraft ?? false, publishAt ? new Date(publishAt) : null, 'upcoming', null, null, isLoopMode ?? false, minLapTimeMs != null ? minLapTimeMs : 300000]
      );

      const defaultCategories = categories || [];
      for (let i = 0; i < defaultCategories.length; i++) {
        const cat = defaultCategories[i];
        const name = typeof cat === 'string' ? cat : cat.name;
        const distanceKm = typeof cat === 'object' && cat.distanceKm ? cat.distanceKm : null;
        await query(
          'INSERT INTO Category (id, name, eventId, `order`, distanceKm, createdAt) VALUES (?, ?, ?, ?, ?, NOW())',
          [crypto.randomUUID(), name, eventIdNew, i, distanceKm]
        );
      }

      const defaultFields = [
        { label: 'First Name', type: 'text', required: true, options: null },
        { label: 'Last Name', type: 'text', required: true, options: null },
        { label: 'Gender', type: 'dropdown', required: true, options: 'Male, Female' },
        { label: 'Blood Type', type: 'dropdown', required: true, options: 'A, B, AB, O' },
        { label: 'Emergency Contact Name', type: 'text', required: true, options: null },
        { label: 'Emergency Contact Phone Number', type: 'tel', required: true, options: null },
        { label: 'Current Physical Address', type: 'textarea', required: true, options: null },
        { label: 'Instagram Profile URL', type: 'text', required: true, options: null },
        { label: 'Nationality', type: 'nationality', required: true, options: null },
      ];
      
      for (let i = 0; i < defaultFields.length; i++) {
        await query(
          'INSERT INTO RegistrationField (id, eventId, label, type, required, options, `order`, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
          [crypto.randomUUID(), eventIdNew, defaultFields[i].label, defaultFields[i].type, defaultFields[i].required, defaultFields[i].options, i]
        );
      }

      const created: any = await query('SELECT * FROM Event WHERE id = ? LIMIT 1', [eventIdNew]);
      const cats: any = await query('SELECT * FROM Category WHERE eventId = ? ORDER BY `order` ASC', [eventIdNew]);
      created[0]._categories = cats.map((c: any) => c.name);

      await logActivity('event.create', `Event baru dibuat: ${name}`, 'admin', eventIdNew);

      return successResponse(formatEvent(created[0]), 201);
    }

    if (req.httpMethod === 'PUT') {
      if (!eventId) return errorResponse('eventId is required', 400);
      const body = parseBody(req);

      const fields: string[] = [];
      const values: any[] = [];

      if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name); }
      if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description); }
      if (body.eventDate !== undefined) { fields.push('eventDate = ?'); values.push(new Date(body.eventDate)); }
      if (body.location !== undefined) { fields.push('location = ?'); values.push(body.location); }
      if (body.latitude !== undefined) { fields.push('latitude = ?'); values.push(body.latitude); }
      if (body.longitude !== undefined) { fields.push('longitude = ?'); values.push(body.longitude); }
      if (body.isActive !== undefined) { fields.push('isActive = ?'); values.push(body.isActive); }
      if (body.isDraft !== undefined) { fields.push('isDraft = ?'); values.push(body.isDraft); }
      if (body.isLoopMode !== undefined) { fields.push('isLoopMode = ?'); values.push(body.isLoopMode); }
      if (body.minLapTimeMs !== undefined) { fields.push('minLapTimeMs = ?'); values.push(body.minLapTimeMs); }
      if (body.publishAt !== undefined) { fields.push('publishAt = ?'); values.push(body.publishAt ? new Date(body.publishAt) : null); }
      if (body.status !== undefined) { fields.push('status = ?'); values.push(body.status); }
      if (body.logoUrl !== undefined) { fields.push('logoUrl = ?'); values.push(body.logoUrl); }
      if (body.bannerUrl !== undefined) { fields.push('bannerUrl = ?'); values.push(body.bannerUrl); }
      if (body.homeImageUrl !== undefined) { fields.push('homeImageUrl = ?'); values.push(body.homeImageUrl); }
      if (body.cutoffMs !== undefined) { fields.push('cutoffMs = ?'); values.push(body.cutoffMs); }
      if (body.timezoneOffset !== undefined) { fields.push('timezoneOffset = ?'); values.push(body.timezoneOffset); }
      if (body.categoryStartTimes !== undefined) { fields.push('categoryStartTimes = ?'); values.push(JSON.stringify(body.categoryStartTimes)); }
      if (body.tshirtSizes !== undefined) { fields.push('tshirtSizes = ?'); values.push(body.tshirtSizes); }
      if (body.bibCustomPrice !== undefined) { fields.push('bibCustomPrice = ?'); values.push(body.bibCustomPrice); }
      if (body.content !== undefined) { fields.push('content = ?'); values.push(JSON.stringify(body.content)); }

      fields.push('updatedAt = NOW()');
      values.push(eventId);

      await query(`UPDATE Event SET ${fields.join(', ')} WHERE id = ?`, values);

      const updated: any = await query('SELECT * FROM Event WHERE id = ? LIMIT 1', [eventId]);
      const cats: any = await query('SELECT * FROM Category WHERE eventId = ? ORDER BY `order` ASC', [eventId]);
      updated[0]._categories = cats.map((c: any) => c.name);

      await logActivity('event.update', `Event diperbarui: ${updated[0].name}`, 'admin', eventId);

      return successResponse(formatEvent(updated[0]));
    }

    if (req.httpMethod === 'DELETE') {
      if (!eventId) return errorResponse('eventId is required', 400);
      // Auto-backup before event delete
      try {
        const { createBackup } = await import('../src/lib/backup');
        await createBackup('event_delete');
      } catch (e) { console.error('[BACKUP] Failed before event delete:', e); }
      
      // Soft delete: keep Event Registration (payment history) and categories
      await query('UPDATE Event SET isDeleted = true WHERE id = ?', [eventId]);
      return successResponse({ success: true });
    }

    return errorResponse('Method not allowed', 405);
  } catch (error: any) {
    console.error('[EVENTS] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
