export default function parseTimeToMs(raw: string, tzOffset?: number): {
  ms: number | null;
  raw: string;
} {
  if (!raw) return { ms: null, raw };
  const str = raw.trim();

  const dtMatch = str.match(
    /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?/
  );
  if (dtMatch) {
    const [, Y, M, D, h, m, s, msStr] = dtMatch;
    const ms = msStr ? Number(msStr.padEnd(3, "0").slice(0, 3)) : 0;
    if (tzOffset != null) {
      const utcMs = Date.UTC(Number(Y), Number(M) - 1, Number(D), Number(h), Number(m), Number(s), ms);
      return { ms: utcMs - tzOffset * 3600000, raw };
    }
    const date = new Date(
      Number(Y),
      Number(M) - 1,
      Number(D),
      Number(h),
      Number(m),
      Number(s),
      ms
    );
    return { ms: date.getTime(), raw };
  }

  // Mas Izbat's format: DD:MM:YYYY HH:MM:SS:SSS or DD-MM-YYYY
  const dtMatch2 = str.match(
    /(\d{2})[:-](\d{2})[:-](\d{4})[ T](\d{2}):(\d{2}):(\d{2})(?:[:\.](\d{1,3}))?/
  );
  if (dtMatch2) {
    const [, D, M, Y, h, m, s, msStr] = dtMatch2;
    const ms = msStr ? Number(msStr.padEnd(3, "0").slice(0, 3)) : 0;
    if (tzOffset != null) {
      const utcMs = Date.UTC(Number(Y), Number(M) - 1, Number(D), Number(h), Number(m), Number(s), ms);
      return { ms: utcMs - tzOffset * 3600000, raw };
    }
    const date = new Date(
      Number(Y),
      Number(M) - 1,
      Number(D),
      Number(h),
      Number(m),
      Number(s),
      ms
    );
    return { ms: date.getTime(), raw };
  }

  const tMatch = str.match(/(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?/);
  if (tMatch) {
    const [, h, m, s, msStr] = tMatch;
    const ms = msStr ? Number(msStr.padEnd(3, "0").slice(0, 3)) : 0;
    if (tzOffset != null) {
      const localNow = new Date(Date.now() + tzOffset * 3600000);
      const utcMs = Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), Number(h), Number(m), Number(s), ms);
      return { ms: utcMs - tzOffset * 3600000, raw };
    }
    const now = new Date();
    now.setHours(Number(h), Number(m), Number(s), ms);
    return { ms: now.getTime(), raw };
  }

  const hm = str.match(/(\d{1,2}):(\d{2})/);
  if (hm) {
    const [, h, m] = hm;
    if (tzOffset != null) {
      const localNow = new Date(Date.now() + tzOffset * 3600000);
      const utcMs = Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), Number(h), Number(m), 0, 0);
      return { ms: utcMs - tzOffset * 3600000, raw };
    }
    const now = new Date();
    now.setHours(Number(h), Number(m), 0, 0);
    return { ms: now.getTime(), raw };
  }

  if (/^\d{1,2}$/.test(str)) {
    const h = Number(str);
    if (tzOffset != null) {
      const localNow = new Date(Date.now() + tzOffset * 3600000);
      const utcMs = Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), h, 0, 0, 0);
      return { ms: utcMs - tzOffset * 3600000, raw };
    }
    const now = new Date();
    now.setHours(h, 0, 0, 0);
    return { ms: now.getTime(), raw };
  }

  const parsed = Date.parse(str.replace(" ", "T"));
  if (!Number.isNaN(parsed)) return { ms: parsed, raw };

  return { ms: null, raw };
}

export function extractTimeOfDay(raw: string): string {
  if (!raw) return "-";
  
  // First, try to match a time that comes AFTER a space (e.g. from "YYYY-MM-DD HH:MM:SS" or "DD:MM:YYYY HH:MM:SS")
  let m = raw.match(/\s(\d{2}:\d{2}:\d{2}(?:[:\.]\d{1,3})?)/);
  if (m) return m[1];

  // If no space, try to match time at the beginning or anywhere
  m = raw.match(/(?:^|\s|T)(\d{2}:\d{2}:\d{2}(?:[:\.]\d{1,3})?)/);
  if (!m) {
     // fallback if it somehow just has it
     m = raw.match(/(\d{2}:\d{2}:\d{2}(?:[:\.]\d{1,3})?)/);
  }
  if (m) {
    let t = m[1];
    if (t.split(':').length === 4) {
      const parts = t.split(':');
      t = `${parts[0]}:${parts[1]}:${parts[2]}.${parts[3]}`;
    }
    if (t.includes(".")) {
      const [hhmmss, frac] = t.split(".");
      t = `${hhmmss}.${frac.padEnd(3, "0").slice(0, 3)}`;
    } else {
      t = `${t}.000`;
    }
    return t;
  }
  return raw;
}

export interface FormatDurationOptions {
  /** Auto-detect: < 1 hour → MM:SS, >= 1 hour → HH:MM:SS. Default: true */
  auto?: boolean;
  /** Always show hours even if < 1 hour. Default: false */
  alwaysShowHour?: boolean;
  /** Show milliseconds. Default: true */
  showMilliseconds?: boolean;
}

export function formatDuration(
  ms: number | null,
  optionsOrIncludeMs: boolean | FormatDurationOptions = true,
): string {
  if (ms == null || !Number.isFinite(ms)) return "-";

  // Backward compat: boolean = old includeMs
  const opts: FormatDurationOptions =
    typeof optionsOrIncludeMs === "boolean"
      ? { auto: true, alwaysShowHour: false, showMilliseconds: optionsOrIncludeMs }
      : optionsOrIncludeMs;

  const auto = opts.auto ?? true;
  const alwaysShowHour = opts.alwaysShowHour ?? false;
  const showMilliseconds = opts.showMilliseconds ?? true;

  const isNegative = ms < 0;
  const absMs = Math.abs(ms);
  const pad = (n: number) => n.toString().padStart(2, "0");

  const hours = Math.floor(absMs / 3600000);
  const minutes = Math.floor((absMs % 3600000) / 60000);
  const seconds = Math.floor((absMs % 60000) / 1000);
  const millis = Math.floor(absMs % 1000);

  const sign = isNegative ? "-" : "";
  const msPart = showMilliseconds ? `.${millis.toString().padStart(3, "0")}` : "";

  if (alwaysShowHour || (!auto && hours >= 0)) {
    return `${sign}${pad(hours)}:${pad(minutes)}:${pad(seconds)}${msPart}`;
  }

  // Auto mode: show hours only when >= 1 hour
  if (hours > 0) {
    return `${sign}${pad(hours)}:${pad(minutes)}:${pad(seconds)}${msPart}`;
  }

  return `${sign}${pad(minutes)}:${pad(seconds)}${msPart}`;
}

export function buildOverrideFromFinishDate(finishMs: number, timeStr: string, tzOffset?: number): number | null {
  if (!timeStr) return null;
  // If it's a full date string (contains space or T)
  if (timeStr.includes(" ") || timeStr.includes("T")) {
    const parsed = parseTimeToMs(timeStr, tzOffset);
    if (parsed && parsed.ms) return parsed.ms;
  }

  // Parse time only
  let timePart = timeStr;
  const m = timePart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:[:\.](\d{1,3}))?/);
  if (!m) return null;

  const h = Number(m[1] || 0);
  const mi = Number(m[2] || 0);
  const se = Number(m[3] || 0);
  const ms = m[4] ? Number(String(m[4]).padEnd(3, "0").slice(0, 3)) : 0;

  if (tzOffset != null) {
    const finishEventLocal = new Date(finishMs + tzOffset * 3600000);
    const utcMs = Date.UTC(finishEventLocal.getUTCFullYear(), finishEventLocal.getUTCMonth(), finishEventLocal.getUTCDate(), h, mi, se, ms);
    return utcMs - tzOffset * 3600000;
  } else {
    const d = new Date(finishMs);
    const override = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      h,
      mi,
      se,
      ms
    );
    return override.getTime();
  }
}

export function calculatePace(
  totalMs: number | null,
  category: string | undefined,
  distanceKm?: number | null,
): string {
  if (totalMs == null || totalMs <= 0 || !Number.isFinite(totalMs)) return "--:--";

  let distance = 0;

  // Priority 1: Explicit distance from event/category config
  if (distanceKm != null && distanceKm > 0) {
    distance = distanceKm;
  } else {
    // Priority 2: Fallback — parse from category name (e.g. "5k", "10km", "21 km")
    const catLower = category?.toLowerCase() || "";
    const match = catLower.match(/(\d+(?:\.\d+)?)\s*(?:km|k)\b/i);
    if (match) {
      const num = parseFloat(match[1]);
      if (Math.abs(num - 21) < 0.2) {
        distance = 21.0975; // Half Marathon standard
      } else if (Math.abs(num - 42) < 0.2) {
        distance = 42.195;  // Full Marathon standard
      } else {
        distance = num;
      }
    }
  }

  if (distance === 0) return "--:--";

  const totalSeconds = Math.floor(totalMs / 1000);
  const paceSeconds = Math.round(totalSeconds / distance);

  const minutes = Math.floor(paceSeconds / 60);
  const seconds = paceSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(minutes)}:${pad(seconds)}`;
}
