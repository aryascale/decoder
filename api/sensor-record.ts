import { query } from '../src/lib/db.js';
import { getIO } from '../src/lib/socket.js';

export default async function handler(req: any) {
  if (req.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }), headers: {} };
  }

  try {
    const data = req.body ? JSON.parse(req.body) : {};
    const { i, e, t } = data;

    if (!i || !e || !t) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields (i, e, t)' }), headers: {} };
    }

    // Parse time string (e.g. "06:33:16.562")
    const now = new Date();
    const timeString = String(t);
    const [timePart, msPart] = timeString.split('.');
    const [hours, minutes, seconds] = timePart.split(':').map(Number);
    const ms = msPart ? parseInt(msPart.padEnd(3, '0').slice(0, 3)) : 0;

    const recordTime = new Date(
      now.getFullYear(), 
      now.getMonth(), 
      now.getDate(), 
      hours || 0, 
      minutes || 0, 
      seconds || 0, 
      ms
    );

    let activeEventId = req.queryStringParameters?.eventId || null;

    if (!activeEventId) {
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
    }

    if (!activeEventId) {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const todayEvents: any[] = await query(
        `SELECT * FROM Event WHERE DATE(eventDate) = ? ORDER BY eventDate DESC LIMIT 1`,
        [todayStr]
      );
      if (todayEvents.length > 0) {
        activeEventId = todayEvents[0].id;
      }
    }

    if (!activeEventId) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No active event found today' }), headers: {} };
    }

    // Find checkpoint
    const checkpoints: any[] = await query(
      `SELECT * FROM Checkpoint WHERE eventId = ? AND identitas = ? LIMIT 1`,

      [activeEventId, i]
    );

    if (checkpoints.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: `Checkpoint '${i}' not found for event ${activeEventId}` }), headers: {} };
    }
    const checkpoint = checkpoints[0];

    // Upsert record
    const existingRecords: any[] = await query(
      `SELECT id FROM RunnerRecord WHERE eventId = ? AND epc = ? AND checkpointId = ? LIMIT 1`,
      [activeEventId, e, checkpoint.id]
    );

    let record;
    if (existingRecords.length > 0) {
      await query(
        `UPDATE RunnerRecord SET time = ? WHERE id = ?`,
        [recordTime, existingRecords[0].id]
      );
      record = { id: existingRecords[0].id, eventId: activeEventId, epc: e, checkpointId: checkpoint.id, time: recordTime, checkpoint };
    } else {
      const recordId = `record-${Date.now()}`;
      await query(
        `INSERT INTO RunnerRecord (id, eventId, epc, checkpointId, time, createdAt) VALUES (?, ?, ?, ?, ?, NOW())`,
        [recordId, activeEventId, e, checkpoint.id, recordTime]
      );
      record = { id: recordId, eventId: activeEventId, epc: e, checkpointId: checkpoint.id, time: recordTime, checkpoint };
    }

    // Emit event to socket
    try {
      const io = getIO();
      io.emit(`new_record_${activeEventId}`, record);
      io.emit('new_record', record);
    } catch (err) {
      console.error('Socket error:', err);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, record })
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
