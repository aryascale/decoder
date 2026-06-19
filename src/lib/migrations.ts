import { query } from './db';

/**
 * Run safe database migrations on server startup.
 * Each migration is idempotent - safe to run multiple times.
 */
export async function runMigrations() {
  console.log('[MIGRATIONS] Running startup migrations...');

  try {
    // Migration 1: Drop unique constraint on email+eventId to allow bulk registrations
    const indexes: any = await query(
      "SHOW INDEX FROM EventRegistration WHERE Key_name = 'EventRegistration_email_eventId_key'"
    );
    if (indexes.length > 0) {
      console.log('[MIGRATIONS] Dropping unique index EventRegistration_email_eventId_key...');
      await query('DROP INDEX `EventRegistration_email_eventId_key` ON `EventRegistration`');
      console.log('[MIGRATIONS] ✅ Unique index dropped');
    }

    // Migration 2: Ensure non-unique index exists for performance
    const perfIndex: any = await query(
      "SHOW INDEX FROM EventRegistration WHERE Key_name = 'EventRegistration_email_eventId_idx'"
    );
    if (perfIndex.length === 0) {
      console.log('[MIGRATIONS] Creating performance index EventRegistration_email_eventId_idx...');
      await query('CREATE INDEX `EventRegistration_email_eventId_idx` ON `EventRegistration`(`email`, `eventId`)');
      console.log('[MIGRATIONS] ✅ Performance index created');
    }

    // Migration 3: Add isDeleted to Event for soft-deleting
    try {
      await query("ALTER TABLE Event ADD COLUMN isDeleted BOOLEAN DEFAULT FALSE");
      console.log('[MIGRATIONS] ✅ Added isDeleted column to Event');
    } catch (e: any) {
      if (e.message && e.message.includes("Duplicate column name")) {
        // Ignore if column already exists
      } else {
        throw e;
      }
    }

    console.log('[MIGRATIONS] All migrations complete ✅');
  } catch (error: any) {
    console.error('[MIGRATIONS] Error (non-fatal):', error.message);
  }
}
