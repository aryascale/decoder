import { useEffect, useMemo, useState } from "react";
import { LeaderRow } from "../components/LeaderboardTable";
import { useEvent } from "../contexts/EventContext";
import {
  loadMasterParticipants,
  loadTimesMap,
  loadCheckpointTimesMap,
} from "../lib/data";
import parseTimeToMs, { extractTimeOfDay, formatDuration, buildOverrideFromFinishDate } from "../lib/time";
import { useLiveTiming } from "./useLiveTiming";

function formatLocalTime(ms: number, tzOffset: number, includeMs = true): string {
  const d = new Date(ms + tzOffset * 60 * 60 * 1000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  if (includeMs) {
    const msec = String(d.getUTCMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${msec}`;
  }
  return `${hh}:${mm}:${ss}`;
}

export type LoadState =
  | { status: "loading"; msg: string }
  | { status: "error"; msg: string }
  | { status: "ready" };

export function useLeaderboardData(eventId: string) {
  const { currentEvent, loading: eventLoading } = useEvent();
  const [state, setState] = useState<LoadState>({
    status: "loading",
    msg: "Loading CSV data…",
  });

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [overall, setOverall] = useState<LeaderRow[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, LeaderRow[]>>({});
  const [recalcTick, setRecalcTick] = useState(0);

  const {
    checkpoints,
    registrations,
    recordsByEpc,
    loading: liveLoading,
  } = useLiveTiming(eventId);

  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());

  const eventCategories: string[] = useMemo(() => {
    return (currentEvent?.categories || []).filter(c => !hiddenCategories.has(c));
  }, [currentEvent?.categories, hiddenCategories]);

  const normCat = (s: string) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .replace(/-/g, " ")
      .replace(/\s+/g, " ");

  const forceRecalc = () => setRecalcTick((t) => t + 1);

  useEffect(() => {
    if (eventId) {
      setHasLoadedOnce(false);
      setState({ status: "loading", msg: "Loading event data..." });
      setOverall([]);
      setByCategory({});
      forceRecalc();
    }
  }, [eventId]);

  useEffect(() => {
    // Wait for event context and live timing to finish loading
    if (eventLoading || liveLoading) {
      return;
    }

    (async () => {
      try {
        if (!hasLoadedOnce) {
          setState({
            status: "loading",
            msg: "Loading participant master (CSV)…",
          });
        }

        console.log("[LeaderboardApp] Loading data for eventId:", eventId);
        const master = await loadMasterParticipants(eventId);

        if (!hasLoadedOnce) {
          setState({
            status: "loading",
            msg: "Load start, finish, checkpoint (CSV)…",
          });
        }

        const tzOffset = (currentEvent as any)?.timezoneOffset ?? 7;

        const startMap = await loadTimesMap("start", eventId, tzOffset);
        const finishMap = await loadTimesMap("finish", eventId, tzOffset);
        await loadCheckpointTimesMap(eventId);

        // Use timing from event (per-event database) instead of localStorage
        const cutoffMs = currentEvent?.cutoffMs ?? null;

        // Load runner status map from API
        const dqMap: Record<string, boolean> = {};
        const dnsMap: Record<string, boolean> = {};
        const dnfMap: Record<string, boolean> = {};
        const hiddenMap: Record<string, boolean> = {};
        try {
          const statusRes = await fetch(
            `/api/runner-status?eventId=${eventId}`,
          );
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (Array.isArray(statusData)) {
              statusData.forEach((s: any) => {
                if (s.isDQ) dqMap[s.epc] = true;
                if (s.isDNS) dnsMap[s.epc] = true;
                if (s.isDNF) dnfMap[s.epc] = true;
                if (s.isHidden) hiddenMap[s.epc] = true;
              });
            }
          }
        } catch {}
        const catStartRaw: Record<string, string> =
          (currentEvent?.categoryStartTimes as Record<string, string>) ?? {};

        // Load hidden categories from API
        try {
          const catRes = await fetch(`/api/categories?eventId=${eventId}`);
          if (catRes.ok) {
            const catData = await catRes.json();
            if (catData.categories) {
              const hiddenNames = new Set<string>();
              catData.categories.forEach((c: any) => {
                if (c.isHidden) hiddenNames.add(c.name);
              });
              setHiddenCategories(hiddenNames);
            }
          }
        } catch {}

        // Load penalty map from API
        const penaltyMap = new Map<string, number>();
        try {
          const penRes = await fetch(`/api/penalty?eventId=${eventId}`);
          if (penRes.ok) {
            const penData = await penRes.json();
            if (Array.isArray(penData)) {
              penData.forEach((p: any) =>
                penaltyMap.set(p.bib, p.penaltyMs || 0),
              );
            }
          }
        } catch {}

        // Load manual start map from API
        const manualStartMap = new Map<string, string>();
        try {
          const msRes = await fetch(
            `/api/manual-start-bib?eventId=${eventId}&_t=${Date.now()}`,
          );
          if (msRes.ok) {
            const msData = await msRes.json();
            if (Array.isArray(msData)) {
              msData.forEach((ms: any) =>
                manualStartMap.set(ms.epc, ms.timeStr),
              );
            }
          }
        } catch {}

        // Load manual finish map from API
        const manualFinishMap = new Map<string, string>();
        try {
          const mfRes = await fetch(
            `/api/manual-finish-bib?eventId=${eventId}&_t=${Date.now()}`,
          );
          if (mfRes.ok) {
            const mfData = await mfRes.json();
            if (Array.isArray(mfData)) {
              mfData.forEach((mf: any) =>
                manualFinishMap.set(mf.epc, mf.timeStr),
              );
            }
          }
        } catch {}

        const absOverrideMs: Record<string, number | null> = {};
        const timeOnlyStr: Record<string, string | null> = {};

        Object.entries(catStartRaw).forEach(([key, raw]) => {
          const normKey = normCat(key);
          const s = String(raw || "").trim();
          if (!s) {
            absOverrideMs[normKey] = null;
            timeOnlyStr[normKey] = null;
            return;
          }
          if (/\d{4}-\d{2}-\d{2}/.test(s)) {
            const parsed = parseTimeToMs(s, tzOffset);
            absOverrideMs[normKey] = parsed.ms;
            timeOnlyStr[normKey] = null;
          } else {
            absOverrideMs[normKey] = null;
            timeOnlyStr[normKey] = s;
          }
        });

        const baseRows: LeaderRow[] = [];

        const localMasterAll = [...master.all];
        const masterEpcSet = new Set(localMasterAll.map((p: any) => p.epc));
        Object.values(registrations).forEach((reg: any) => {
          if (!masterEpcSet.has(reg.epc)) {
            localMasterAll.push({
              epc: reg.epc,
              bib: reg.bib,
              name: reg.name,
              gender: reg.gender,
              category: reg.category,
              sourceCategoryKey: reg.category,
              ageCategory: "",
            });
          }
        });

        // tzOffset already defined above before loadTimesMap calls

        localMasterAll.forEach((p) => {
          if (hiddenMap[p.epc]) return;
          let finishEntry = finishMap.get(p.epc);

          const manualFinishStr = manualFinishMap.get(p.epc);
          if (manualFinishStr) {
            // We build a manual finish override based on current date for the missing date parts
            const mfMs = buildOverrideFromFinishDate(
              Date.now(),
              manualFinishStr,
              tzOffset
            );
            if (mfMs) {
              finishEntry = { ms: mfMs, raw: manualFinishStr };
            }
          }

          const epsRecords = recordsByEpc[p.epc];

          // Fallback to Live Record for FINISH checkpoint
          if (!finishEntry?.ms && epsRecords && epsRecords.length > 0) {
            const finishRecord = epsRecords.find(
              (r) =>
                r.checkpointName.toLowerCase().includes("finish") ||
                r.identitas.toLowerCase().includes("finish") ||
                r.order === 999 ||
                checkpoints
                  .find((cp) => cp.identitas === r.identitas)
                  ?.name.toLowerCase()
                  .includes("finish"),
            );
            if (finishRecord) {
              const finishMs = new Date(finishRecord.time).getTime();
              const finishRawLocal = formatLocalTime(finishMs, tzOffset);
              finishEntry = {
                ms: finishMs,
                raw: finishRawLocal,
              };
            }
          }

          const catKey = normCat(p.sourceCategoryKey);
          let absMs = absOverrideMs[catKey] ?? null;
          let timeOnly = timeOnlyStr[catKey] ?? null;

          let total: number | null = null;
          let lapsDisplay: {
            label: string;
            timeDisplay: string;
            isDuration?: boolean;
          }[] = [];
          const manualStartMs = (currentEvent as any)?.manualStartTime
            ? new Date((currentEvent as any).manualStartTime).getTime()
            : null;
          const startEntry = startMap.get(p.epc);
          let startMs = manualStartMs || startEntry?.ms;

          let rawStartStrForDisplay = startEntry?.raw;

          if ((currentEvent as any)?.isLoopMode) {
            const minLapMs =
              (currentEvent as any).minLapTimeMs != null
                ? (currentEvent as any).minLapTimeMs
                : 300000;
            const maxLaps = (currentEvent?.content as any)?.maxLaps
              ? parseInt((currentEvent?.content as any).maxLaps)
              : null;
            let baseStartTime = startMs;
            const validLaps: any[] = [];

            if (epsRecords && epsRecords.length > 0) {
              const sortedRecords = [...epsRecords].sort(
                (a, b) =>
                  new Date(a.time).getTime() - new Date(b.time).getTime(),
              );

              if (!baseStartTime) {
                baseStartTime = new Date(sortedRecords[0].time).getTime();
                startMs = baseStartTime;
                rawStartStrForDisplay = formatLocalTime(baseStartTime, tzOffset);
              }

              const lastTimeByCp: Record<string, number> = {};
              lastTimeByCp[sortedRecords[0].checkpointName] = baseStartTime;

              let lapCounter = 1;

              for (let i = 1; i < sortedRecords.length; i++) {
                const rec = sortedRecords[i];
                const cpName = rec.checkpointName;
                const t = new Date(rec.time).getTime();

                const lastTimeForThisCp = lastTimeByCp[cpName] || 0;

                if (t - lastTimeForThisCp >= minLapMs) {
                  if (maxLaps != null && lapCounter > maxLaps) {
                    break;
                  }

                  validLaps.push({
                    time: t,
                    name: cpName,
                    lapIndex: lapCounter,
                  });
                  lastTimeByCp[cpName] = t;

                  const cpLower = cpName.toLowerCase();
                  if (cpLower.includes("finish") || cpLower.includes("end")) {
                    lapCounter++;
                  }
                }
              }

              if (validLaps.length > 0) {
                const lastCrossing = validLaps[validLaps.length - 1].time;
                total = lastCrossing - baseStartTime;
                finishEntry = {
                  ms: lastCrossing,
                  raw: formatLocalTime(lastCrossing, tzOffset, false),
                };

                validLaps.forEach((lap) => {
                  const duration = lap.time - baseStartTime!;
                  lapsDisplay.push({
                    label: `L${lap.lapIndex} - ${lap.name}`,
                    timeDisplay: formatDuration(duration),
                    isDuration: true,
                  });
                });
              } else {
                total = null; // Active, no laps yet
              }
            }
          } else {
            // Fallback to Live Record for START checkpoint
            if (!startMs && epsRecords && epsRecords.length > 0) {
              const startRecord = epsRecords.find(
                (r) =>
                  r.checkpointName.toLowerCase().includes("start") ||
                  r.identitas.toLowerCase().includes("start") ||
                  r.order === 0 ||
                  checkpoints
                    .find((cp) => cp.identitas === r.identitas)
                    ?.name.toLowerCase()
                    .includes("start"),
              );
              if (startRecord) {
                startMs = new Date(startRecord.time).getTime();
                rawStartStrForDisplay = formatLocalTime(startMs, tzOffset);
              }
            }

            const bibManualStartStr = manualStartMap.get(p.epc);
            if (bibManualStartStr) {
              const builtOverride = finishEntry?.ms
                ? buildOverrideFromFinishDate(finishEntry.ms, bibManualStartStr, tzOffset)
                : buildOverrideFromFinishDate(Date.now(), bibManualStartStr, tzOffset);

              if (builtOverride != null) {
                startMs = builtOverride;
                absMs = null;
                timeOnly = null;
                rawStartStrForDisplay = bibManualStartStr;
              }
            }

            if (absMs != null && Number.isFinite(absMs)) {
              if (!finishEntry?.ms) return;
              const startStr = formatLocalTime(absMs, tzOffset);
              const startNormalized = buildOverrideFromFinishDate(
                finishEntry.ms,
                startStr,
                tzOffset
              );
              if (startNormalized != null) {
                total = finishEntry.ms - startNormalized;
                if (total < -43200000) total += 86400000; // Only add 24h if it's deeply negative (crosses midnight)
              } else {
                total = finishEntry.ms - absMs;
              }
            } else if (timeOnly) {
              if (!finishEntry?.ms) return;
              const builtOverride = buildOverrideFromFinishDate(
                finishEntry.ms,
                timeOnly,
                tzOffset
              );
              if (builtOverride != null) {
                total = finishEntry.ms - builtOverride;
                if (total < -43200000) total += 86400000;
              } else {
                if (startMs) {
                  total = finishEntry.ms - startMs;
                }
              }
            } else {
              if (startMs && finishEntry?.ms) {
                const startStr = formatLocalTime(startMs, tzOffset);
                const startNormalized = buildOverrideFromFinishDate(
                  finishEntry.ms,
                  startStr,
                  tzOffset
                );
                if (startNormalized != null) {
                  total = finishEntry.ms - startNormalized;
                  if (total < -43200000) total += 86400000;
                } else {
                  total = finishEntry.ms - startMs;
                }
              }
            }

            // Final safety fallback to prevent massive negative durations from breaking the UI
            if (total != null && total < 0) {
              while (total < 0) total += 86400000;
            }
          }

          let latestCpStr = "-";
          if (epsRecords && epsRecords.length > 0) {
            const latest = epsRecords[epsRecords.length - 1];
            const cpTime = new Date(latest.time);
            const cpTimeStr = formatLocalTime(cpTime.getTime(), tzOffset, false);
            latestCpStr = `${latest.checkpointName} (${cpTimeStr})`;
          }


          let isLiveActive = false;
          if (!Number.isFinite(total) || total == null || total === 0) {
            isLiveActive = true;
            total = 0;
          }

          const penMs = penaltyMap.get(p.bib) || 0;
          total! += penMs;

          const isDQ = !!dqMap[p.epc];
          const isDNS = !!dnsMap[p.epc];
          const manualDNF = !!dnfMap[p.epc];
          const finalIsDNF = manualDNF || (cutoffMs != null && total! > cutoffMs && !isLiveActive);

          // Laps mapping from Live RunnerRecords
          const matchedLaps = checkpoints.map((cpDef: any) => {
            const cpId = cpDef.identitas || cpDef.id;
            const label = cpDef.name || cpDef.identitas || cpDef.id;

            // Find if this EPC has a record for this checkpoint
            const recordForCp = epsRecords?.find(
              (rec: any) => rec.identitas === cpId,
            );

            if (!recordForCp)
              return { label, timeDisplay: "-", isDuration: false };

            const cpTime = new Date(recordForCp.time);

            // If we have a start time, show relative duration, otherwise show time of day
            if (startMs) {
              const diffMs = cpTime.getTime() - startMs;
              if (diffMs > 0) {
                return {
                  label,
                  timeDisplay: formatDuration(diffMs),
                  isDuration: true,
                };
              }
            }

            const cpTimeStr = formatLocalTime(cpTime.getTime(), tzOffset, false);
            return { label, timeDisplay: cpTimeStr, isDuration: false };
          });

          baseRows.push({
            rank: null,
            bib: p.bib,
            name: p.name,
            gender: p.gender,
            category: p.category || p.sourceCategoryKey,
            sourceCategoryKey: p.sourceCategoryKey,
            ageCategory: p.ageCategory,
            startTimeRaw: rawStartStrForDisplay
              ? extractTimeOfDay(rawStartStrForDisplay)
              : startMs
                ? formatLocalTime(startMs, tzOffset)
                : "-",
            finishTimeRaw: extractTimeOfDay(finishEntry?.raw || ""),
            totalTimeMs: total ?? 0,
            totalTimeDisplay: isDQ
              ? "DSQ"
              : isDNS
                ? "DNS"
                : finalIsDNF
                  ? "DNF"
                  : isLiveActive
                    ? startMs
                      ? "Active"
                      : "-"
                    : formatDuration(total!),
            penaltyMs: penMs,
            epc: p.epc,
            latestCp: latestCpStr,
            laps: (currentEvent as any)?.isLoopMode ? lapsDisplay : matchedLaps,
          });
        });

        const uniqueRows = Array.from(
          new Map(baseRows.map((r) => [r.epc, r])).values(),
        );

        const finishers = uniqueRows.filter(
          (r) =>
            r.totalTimeDisplay !== "DNF" &&
            r.totalTimeDisplay !== "DSQ" &&
            r.totalTimeDisplay !== "Active" &&
            r.totalTimeDisplay !== "ACTIVE" &&
            r.totalTimeDisplay !== "-",
        );
        const finisherSorted = [...finishers]
          .sort((a, b) => a.totalTimeMs - b.totalTimeMs)
          .map((r, i) => ({ ...r, rank: i + 1 }));

        const actives = uniqueRows.filter(
          (r) =>
            r.totalTimeDisplay === "Active" || r.totalTimeDisplay === "ACTIVE",
        );
        const dnfs = uniqueRows
          .filter((r) => r.totalTimeDisplay === "DNF")
          .sort((a, b) => a.totalTimeMs - b.totalTimeMs);
        const dsqs = uniqueRows.filter((r) => r.totalTimeDisplay === "DSQ");
        const notStarted = uniqueRows.filter((r) => r.totalTimeDisplay === "-");

        const overallFinal: LeaderRow[] = [
          ...finisherSorted,
          ...dnfs.map((r) => ({ ...r, rank: null })),
          ...dsqs.map((r) => ({ ...r, rank: null })),
          ...actives.map((r) => ({ ...r, rank: null })),
          ...notStarted.map((r) => ({ ...r, rank: null })),
        ];

        const catMap: Record<string, LeaderRow[]> = {};
        eventCategories.forEach((catKey: string) => {
          const aggC = catKey
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .replace(/km/g, "k");
          const list = overallFinal.filter((r) => {
            const aggR = (r.sourceCategoryKey || "")
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "")
              .replace(/km/g, "k");
            return (
              aggR === aggC ||
              (r.sourceCategoryKey || "").toLowerCase().trim() ===
                catKey.toLowerCase().trim()
            );
          });
          catMap[catKey] = list;
        });

        setOverall(overallFinal);
        setByCategory(catMap);

        if (!hasLoadedOnce) {
          setHasLoadedOnce(true);
        }
        setState({ status: "ready" });
      } catch (err: any) {
        console.error("Error loading CSV logic:", err);
        setState({
          status: "error",
          msg: "Failed to load timing data: " + err.message,
        });
      }
    })();
  }, [
    hasLoadedOnce,
    recalcTick,
    eventId,
    eventCategories,
    checkpoints,
    registrations,
    recordsByEpc,
    currentEvent?.cutoffMs,
    currentEvent?.categoryStartTimes,
    (currentEvent as any)?.manualStartTime,
    eventLoading,
    liveLoading,
  ]);

  return {
    state,
    overall,
    byCategory,
    eventCategories,
    forceRecalc,
    hasLoadedOnce,
  };
}
