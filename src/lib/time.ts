export default function parseTimeToMs(raw: string): {
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
    const now = new Date();
    now.setHours(Number(h), Number(m), Number(s), ms);
    return { ms: now.getTime(), raw };
  }

  const hm = str.match(/(\d{1,2}):(\d{2})/);
  if (hm) {
    const [, h, m] = hm;
    const now = new Date();
    now.setHours(Number(h), Number(m), 0, 0);
    return { ms: now.getTime(), raw };
  }

  if (/^\d{1,2}$/.test(str)) {
    const h = Number(str);
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
  // Attempt to match time either after a space or at the beginning of the string
  let m = raw.match(/(?:^|\s)(\d{2}:\d{2}:\d{2}(?:[:\.]\d{1,3})?)/);
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

export function formatDuration(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return "-";
  const isNegative = ms < 0;
  const total = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${isNegative ? "-" : ""}${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function buildOverrideFromFinishDate(finishMs: number, timeStr: string): number | null {
  if (!timeStr) return null;
  // If it's a full date string (contains space or T)
  if (timeStr.includes(" ") || timeStr.includes("T")) {
    const parsed = parseTimeToMs(timeStr);
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
