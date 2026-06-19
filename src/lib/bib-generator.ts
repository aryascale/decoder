import { query } from './db';

export async function assignAutoBibsIfEnabled(orderId: string): Promise<void> {
  console.log(`[BIB_GEN] Starting BIB assignment for orderId: ${orderId}`);
  
  // 1. Fetch all registrations for this order
  const registrations: any = await query(
    `SELECT er.id, er.eventId, er.categoryId, e.content as eventContent
     FROM EventRegistration er
     JOIN Event e ON er.eventId = e.id
     WHERE er.orderId = ? AND (er.bibNumber IS NULL OR er.bibNumber = '')`,
    [orderId]
  );

  if (!registrations || registrations.length === 0) {
    console.log(`[BIB_GEN] No registrations found without BIB for orderId: ${orderId}`);
    return;
  }

  console.log(`[BIB_GEN] Found ${registrations.length} registration(s) without BIB`);

  // Process event by event (though usually it's one event per order)
  const eventIds = [...new Set(registrations.map((r: any) => r.eventId))];

  for (const eventId of eventIds) {
    const regsForEvent = registrations.filter((r: any) => r.eventId === eventId);
    if (regsForEvent.length === 0) continue;

    // Parse event content
    let content: any = {};
    try {
      content = typeof regsForEvent[0].eventContent === 'string' 
        ? JSON.parse(regsForEvent[0].eventContent) 
        : (regsForEvent[0].eventContent || {});
    } catch (e) {
      console.error('[BIB_GEN] Error parsing event content', e);
    }

    if (!content.autoGenerateBibs?.enabled) {
      console.log(`[BIB_GEN] Auto-generate BIBs is DISABLED for event: ${eventId}`);
      continue;
    }

    console.log(`[BIB_GEN] Auto-generate BIBs is ENABLED for event: ${eventId}`);
    console.log(`[BIB_GEN] Configured categories:`, JSON.stringify(content.autoGenerateBibs.categories || {}));

    // Process each registration sequentially to prevent race conditions within the same order
    for (const reg of regsForEvent) {
      const categoryId = reg.categoryId;
      const configuredStartStr = content.autoGenerateBibs.categories?.[categoryId];
      
      if (!configuredStartStr || String(configuredStartStr).trim() === '') {
        console.log(`[BIB_GEN] No start number configured for categoryId: ${categoryId} — skipping`);
        continue;
      }

      // Fetch the max bib number currently assigned for this event & category
      const maxRes: any = await query(
        `SELECT MAX(CAST(bibNumber AS UNSIGNED)) as maxBib
         FROM EventRegistration
         WHERE eventId = ? AND categoryId = ? AND bibNumber IS NOT NULL AND bibNumber != ''`,
        [eventId, categoryId]
      );

      let nextBibInt = parseInt(String(configuredStartStr).trim(), 10);
      
      if (maxRes && maxRes.length > 0 && maxRes[0].maxBib !== null) {
        const currentMax = parseInt(maxRes[0].maxBib, 10);
        if (!isNaN(currentMax) && currentMax >= nextBibInt) {
          nextBibInt = currentMax + 1;
        }
      }

      const nextBibString = nextBibInt.toString();

      console.log(`[BIB_GEN] Assigning BIB ${nextBibString} to registration ${reg.id} (category: ${categoryId})`);

      // Update the DB
      await query(
        `UPDATE EventRegistration SET bibNumber = ?, updatedAt = NOW() WHERE id = ?`,
        [nextBibString, reg.id]
      );
    }
  }

  console.log(`[BIB_GEN] BIB assignment complete for orderId: ${orderId}`);
}
