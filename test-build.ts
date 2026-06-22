function parseTimeToMs(raw: string): { ms: number | null; raw: string } {
  if (!raw) return { ms: null, raw };
  const str = raw.trim();

  const dtMatch = str.match(
    /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?/
  );
  if (dtMatch) {
    const [, Y, M, D, h, m, s, msStr] = dtMatch;
    const ms = msStr ? Number(msStr.padEnd(3, "0").slice(0, 3)) : 0;
    const date = new Date(Number(Y), Number(M) - 1, Number(D), Number(h), Number(m), Number(s), ms);
    return { ms: date.getTime(), raw };
  }

  // Mas Izbat's format: DD:MM:YYYY HH:MM:SS:SSS or DD-MM-YYYY
  const dtMatch2 = str.match(
    /(\d{2})[:-](\d{2})[:-](\d{4})[ T](\d{2}):(\d{2}):(\d{2})(?:[:\.](\d{1,3}))?/
  );
  if (dtMatch2) {
    const [, D, M, Y, h, m, s, msStr] = dtMatch2;
    const ms = msStr ? Number(msStr.padEnd(3, "0").slice(0, 3)) : 0;
    const date = new Date(Number(Y), Number(M) - 1, Number(D), Number(h), Number(m), Number(s), ms);
    return { ms: date.getTime(), raw };
  }

  return { ms: null, raw };
}

function buildOverrideFromFinishDate(finishMs: number, timeStr: string): number | null {
  if (!timeStr) return null;
  if (timeStr.includes(" ") || timeStr.includes("T")) {
     const parsed = parseTimeToMs(timeStr);
     if (parsed && parsed.ms) return parsed.ms;
  }
  const m = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:[:\.](\d{1,3}))?/);
  if (!m) return null;

  const h = Number(m[1] || 0);
  const mi = Number(m[2] || 0);
  const se = Number(m[3] || 0);
  const ms = m[4] ? Number(String(m[4]).padEnd(3, "0").slice(0, 3)) : 0;

  const d = new Date(finishMs);
  const override = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mi, se, ms);
  return override.getTime();
}

console.log(buildOverrideFromFinishDate(Date.now(), "22:06:2026 13:53:49:591"));
