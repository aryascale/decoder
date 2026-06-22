function parseTimeToMs(str) {
  const dtMatch2 = str.match(/(\d{2})[:-](\d{2})[:-](\d{4})[ T](\d{2}):(\d{2}):(\d{2})(?:[:\.](\d{1,3}))?/);
  if (dtMatch2) {
    const [, D, M, Y, h, m, s, msStr] = dtMatch2;
    const ms = msStr ? Number(msStr.padEnd(3, "0").slice(0, 3)) : 0;
    const date = new Date(Number(Y), Number(M) - 1, Number(D), Number(h), Number(m), Number(s), ms);
    return { ms: date.getTime(), raw: str };
  }
  return { ms: null };
}

function extractTimeOfDay(raw) {
  if (!raw) return "-";
  let m = raw.match(/(?:^|\s)(\d{2}:\d{2}:\d{2}(?:[:\.]\d{1,3})?)/);
  if (!m) return "-";
  return m[1];
}

function buildOverrideFromFinishDate(finishMs, timeStr) {
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

const bibManualStartStr = "22:06:2026 13:53:38:819";
const manualFinishStr = "22:06:2026 13:53:49:591";

const mfMs = buildOverrideFromFinishDate(Date.now(), manualFinishStr);
const finishEntry = { ms: mfMs, raw: manualFinishStr };

let startMs = buildOverrideFromFinishDate(finishEntry.ms, bibManualStartStr);

const startStr = extractTimeOfDay(new Date(startMs).toISOString());
const startNormalized = buildOverrideFromFinishDate(finishEntry.ms, startStr);

let total = null;
if (startNormalized != null) {
  total = finishEntry.ms - startNormalized;
  if (total < -43200000) total += 86400000;
} else {
  total = finishEntry.ms - startMs;
}

console.log({
  finishMs: finishEntry.ms,
  startMs,
  startStr,
  startNormalized,
  total,
  isLiveActive: (!Number.isFinite(total) || total == null)
});
