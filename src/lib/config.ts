export const DEFAULT_CATEGORIES = [
  "10K Laki-laki",
  "10K Perempuan",
  "5K Laki-Laki",
  "5K Perempuan",
] as const;

export const CATEGORY_KEYS = DEFAULT_CATEGORIES;

export type CategoryKey = typeof DEFAULT_CATEGORIES[number];

export const DEFAULT_EVENT_TITLE = "IMR 2025 Timing By IZT Race Technology";

export const LS_EVENT_TITLE = "imr_event_title";
export const LS_DATA_VERSION = "imr_data_version";
export const LS_CUTOFF = "imr_cutoff_ms";
export const LS_DQ = "imr_dq_map";

// Helper to get per-event localStorage key
export function getDQLocalStorageKey(eventId: string): string {
  return `${LS_DQ}_${eventId}`;
}
export const LS_CAT_START = "imr_cat_start_raw";

export const DB_NAME = "imr_timing_db";
export const DB_STORE = "files";

export type CsvKind = "master" | "start" | "finish" | "checkpoint";

export const CSV_KINDS: CsvKind[] = ["master", "start", "finish", "checkpoint"];

export const LS_CURRENT_EVENT_ID = "imr_current_event_id";
export const DEFAULT_EVENT_ID = "default";

export async function getCategoriesForEvent(eventId: string): Promise<string[]> {
  try {
    const response = await fetch(`/api/categories?eventId=${encodeURIComponent(eventId)}`);

    const data = await response.json();
    return data.categories || [];
  } catch (error) {
    return [];
  }
}
