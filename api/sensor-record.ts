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

    // Find active event this EPC belongs to
    const runnerStatuses: any[] = await query(
      `SELECT rs.*, e.id as event_id, e.isActive as event_isActive, e.eventDate as event_eventDate 
       FROM RunnerStatus rs
       JOIN Event e ON rs.eventId = e.id
       WHERE rs.epc = ?`,
      [e]
    );

    if (runnerStatuses.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'EPC not registered in any event' }), headers: {} };
    }

    // Try to find the event that is currently active or happening today
    let activeStatus = runnerStatuses.find(s => s.event_isActive);
    
    if (!activeStatus) {
      const today = new Date();
      activeStatus = runnerStatuses.find(s => {
        const d = new Date(s.event_eventDate);
        return d.getFullYear() === today.getFullYear() &&
               d.getMonth() === today.getMonth() &&
               d.getDate() === today.getDate();
      });
    }

    if (!activeStatus) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No active event found for this EPC' }), headers: {} };
    }

    const activeEventId = activeStatus.event_id;

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
