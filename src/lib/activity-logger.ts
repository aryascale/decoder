import { query } from './db';
import crypto from 'crypto';

let tableCreated = false;

export async function logActivity(
  action: string,
  detail?: string,
  actor?: string,
  eventId?: string,
  metadata?: Record<string, any>
) {
  try {
    if (!tableCreated) {
      await query(`
        CREATE TABLE IF NOT EXISTS ActivityLog (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          eventId VARCHAR(191) NULL,
          action VARCHAR(191) NOT NULL,
          detail TEXT NULL,
          actor VARCHAR(191) NULL,
          metadata JSON NULL,
          createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          INDEX \`ActivityLog_eventId_idx\`(\`eventId\`),
          INDEX \`ActivityLog_action_idx\`(\`action\`),
          INDEX \`ActivityLog_createdAt_idx\`(\`createdAt\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
      tableCreated = true;
    }

    await query(
      "INSERT INTO ActivityLog (id, eventId, action, detail, actor, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())",
      [
        crypto.randomUUID(),
        eventId || null,
        action,
        detail || null,
        actor || 'system',
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (error) {
    console.error('[ACTIVITY-LOG] Failed to log:', error);
  }
}
