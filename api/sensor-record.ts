import { query } from '../src/lib/db.js';
import { getIO } from '../src/lib/socket.js';

export default async function handler(req: any) {
  if (req.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }), headers: {} };
  }

  try {
    const data = req.body ? JSON.parse(req.body) : {};
    const payloads = Array.isArray(data) ? data : [data];

    if (payloads.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Empty payload' }), headers: {} };
    }

    const now = new Date();
    const results = [];

    // Caches to avoid redundant DB queries per batch
    const activeEventCache = new Map();
    const checkpointCache = new Map();
    const eventSettingsCache = new Map();

    for (const item of payloads) {
      const { i, e, t, eventId } = item;

      if (!i || !e || !t) {
        results.push({ error: 'Missing required fields (i, e, t)', item });
        continue;
      }

      // Parse time string (e.g. "06:33:16.562")
      const timeString = String(t);
      const [timePart, msPart] = timeString.split('.');
      const [hours, minutes, seconds] = timePart.split(':').map(Number);
      const ms = msPart ? parseInt(msPart.padEnd(3, '0').slice(0, 3)) : 0;

      // The sensor time is assumed to be local time (WIB / GMT+7).
      // Construct an ISO string with +07:00 so the UTC conversion is correct.
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const date = String(now.getDate()).padStart(2, '0');
      const hr = String(hours || 0).padStart(2, '0');
      const min = String(minutes || 0).padStart(2, '0');
      const sec = String(seconds || 0).padStart(2, '0');
      const msec = String(ms).padStart(3, '0');

      const recordTime = new Date(`${year}-${month}-${date}T${hr}:${min}:${sec}.${msec}+07:00`);

      let activeEventId = req.queryStringParameters?.eventId || eventId || null;

      const cacheKeyEvent = `${i}-${activeEventId || 'none'}`;
      if (!activeEventId) {
        if (activeEventCache.has(cacheKeyEvent)) {
          activeEventId = activeEventCache.get(cacheKeyEvent);
        } else {
          // Find active event that owns this checkpoint identity (most recent first)
          const activeEvents: any[] = await query(
            `SELECT e.id FROM Event e 
             JOIN Checkpoint c ON c.eventId = e.id 
             WHERE e.isActive = 1 AND c.identitas = ? 
             ORDER BY e.eventDate DESC, e.id DESC LIMIT 1`,
            [i]
          );

          if (activeEvents.length > 0) {
            activeEventId = activeEvents[0].id;
          } else {
            // Fallback to any active event
            const fallbackEvents: any[] = await query(
              `SELECT * FROM Event WHERE isActive = 1 ORDER BY eventDate DESC LIMIT 1`,
              []
            );
            activeEventId = fallbackEvents.length > 0 ? fallbackEvents[0].id : null;
          }
          activeEventCache.set(cacheKeyEvent, activeEventId);
        }
      }

      if (!activeEventId) {
        if (activeEventCache.has('today')) {
          activeEventId = activeEventCache.get('today');
        } else {
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          const todayEvents: any[] = await query(
            `SELECT * FROM Event WHERE DATE(eventDate) = ? ORDER BY eventDate DESC LIMIT 1`,
            [todayStr]
          );
          if (todayEvents.length > 0) {
            activeEventId = todayEvents[0].id;
          }
          activeEventCache.set('today', activeEventId);
        }
      }

      if (!activeEventId) {
        results.push({ error: 'No active event found today', item });
        continue;
      }

      // Find checkpoint
      const cacheKeyCheckpoint = `${activeEventId}-${i}`;
      let checkpoint;
      if (checkpointCache.has(cacheKeyCheckpoint)) {
        checkpoint = checkpointCache.get(cacheKeyCheckpoint);
      } else {
        const checkpoints: any[] = await query(
          `SELECT * FROM Checkpoint WHERE eventId = ? AND identitas = ? LIMIT 1`,
          [activeEventId, i]
        );
        if (checkpoints.length > 0) {
          checkpoint = checkpoints[0];
          checkpointCache.set(cacheKeyCheckpoint, checkpoint);
        } else {
          checkpointCache.set(cacheKeyCheckpoint, null);
        }
      }

      if (!checkpoint) {
        results.push({ error: `Checkpoint '${i}' not found for event ${activeEventId}`, item });
        continue;
      }

      // Fetch event settings for loop mode
      let isLoopMode = false;
      let minLapTimeMs = 300000;
      if (eventSettingsCache.has(activeEventId)) {
        const settings = eventSettingsCache.get(activeEventId);
        isLoopMode = settings.isLoopMode;
        minLapTimeMs = settings.minLapTimeMs;
      } else {
        const eventSettings: any[] = await query(
          `SELECT isLoopMode, minLapTimeMs FROM Event WHERE id = ? LIMIT 1`,
          [activeEventId]
        );
        isLoopMode = eventSettings.length > 0 && eventSettings[0].isLoopMode;
        minLapTimeMs = eventSettings.length > 0 ? (eventSettings[0].minLapTimeMs != null ? eventSettings[0].minLapTimeMs : 300000) : 300000;
        eventSettingsCache.set(activeEventId, { isLoopMode, minLapTimeMs });
      }

      // Fetch the latest record for this runner at this checkpoint
      const existingRecords: any[] = await query(
        `SELECT id, time FROM RunnerRecord WHERE eventId = ? AND epc = ? AND checkpointId = ? ORDER BY time DESC LIMIT 1`,
        [activeEventId, e, checkpoint.id]
      );

      let record;
      if (existingRecords.length > 0) {
        const latestRecord = existingRecords[0];

        if (isLoopMode) {
          const timeDiffMs = recordTime.getTime() - new Date(latestRecord.time).getTime();

          if (timeDiffMs < minLapTimeMs) {
            // Debounce: Runner is still at the checkpoint.
            // The user requested to keep the *first* time they step on the carpet,
            // so we DO NOT update the time here. We just return the existing record.
            record = { id: latestRecord.id, eventId: activeEventId, epc: e, checkpointId: checkpoint.id, time: latestRecord.time, checkpoint };
          } else {
            // New Lap
            const recordId = `record-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            await query(
              `INSERT INTO RunnerRecord (id, eventId, epc, checkpointId, time, createdAt) VALUES (?, ?, ?, ?, ?, NOW())`,
              [recordId, activeEventId, e, checkpoint.id, recordTime]
            );
            record = { id: recordId, eventId: activeEventId, epc: e, checkpointId: checkpoint.id, time: recordTime, checkpoint };
          }
        } else {
          // Legacy behavior: UPSERT (Update existing time)
          await query(
            `UPDATE RunnerRecord SET time = ? WHERE id = ?`,
            [recordTime, latestRecord.id]
          );
          record = { id: latestRecord.id, eventId: activeEventId, epc: e, checkpointId: checkpoint.id, time: recordTime, checkpoint };
        }
      } else {
        // First time crossing this checkpoint
        const recordId = `record-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        await query(
          `INSERT INTO RunnerRecord (id, eventId, epc, checkpointId, time, createdAt) VALUES (?, ?, ?, ?, ?, NOW())`,
          [recordId, activeEventId, e, checkpoint.id, recordTime]
        );
        record = { id: recordId, eventId: activeEventId, epc: e, checkpointId: checkpoint.id, time: recordTime, checkpoint };
      }

      results.push({ success: true, record });

      // Emit event to socket
      try {
        const io = getIO();
        io.emit(`new_record_${activeEventId}`, record);
        io.emit('new_record', record);
      } catch (err) {
        console.error('Socket error:', err);
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, processed: results.length, results })
    };

  } catch (error: any) {
    console.error('Sensor API Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
}
