import { useEffect, useMemo, useState } from "react";
import { LeaderRow } from "../components/LeaderboardTable";
import { useEvent } from "../contexts/EventContext";
import { loadMasterParticipants, loadTimesMap, loadCheckpointTimesMap } from "../lib/data";
import parseTimeToMs, { extractTimeOfDay, formatDuration } from "../lib/time";
import { useLiveTiming } from "./useLiveTiming";

export type LoadState =
  | { status: "loading"; msg: string }
  | { status: "error"; msg: string }
  | { status: "ready" };

export function useLeaderboardData(eventId: string) {
  const { currentEvent, eventData, loading: eventLoading } = useEvent();
  const [state, setState] = useState<LoadState>({
    status: "loading",
    msg: "Loading CSV data…",
  });

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [overall, setOverall] = useState<LeaderRow[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, LeaderRow[]>>({});
  const [checkpointMap, setCheckpointMap] = useState<Map<string, string[]>>(new Map());
  const [recalcTick, setRecalcTick] = useState(0);

  const { checkpoints, registrations, recordsByEpc, loading: liveLoading } = useLiveTiming(eventId);
  
  const eventCategories: string[] = useMemo(() => {
    return currentEvent?.categories || [];
  }, [currentEvent?.categories]);

  const normCat = (s: string) => String(s || "").trim().toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ");

  const forceRecalc = () => setRecalcTick(t => t + 1);

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

        console.log('[LeaderboardApp] Loading data for eventId:', eventId);
        const master = await loadMasterParticipants(eventId);

        if (!hasLoadedOnce) {
          setState({
            status: "loading",
            msg: "Load start, finish, checkpoint (CSV)…",
          });
        }

        const startMap = await loadTimesMap("start", eventId);
        const finishMap = await loadTimesMap("finish", eventId);
        const cpMap = await loadCheckpointTimesMap(eventId);
        setCheckpointMap(cpMap);

        // Use timing from event (per-event database) instead of localStorage
        const cutoffMs = currentEvent?.cutoffMs ?? null;
        
        // Load runner status map from API
        const dqMap: Record<string, boolean> = {};
        const hiddenMap: Record<string, boolean> = {};
        try {
          const statusRes = await fetch(`/api/runner-status?eventId=${eventId}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (Array.isArray(statusData)) {
              statusData.forEach((s: any) => {
                if (s.isDQ) dqMap[s.epc] = true;
                if (s.isHidden) hiddenMap[s.epc] = true;
              });
            }
          }
        } catch {}
        const catStartRaw: Record<string, string> = (currentEvent?.categoryStartTimes as Record<string, string>) ?? {};

        // Load penalty map from API
        const penaltyMap = new Map<string, number>();
        try {
          const penRes = await fetch(`/api/penalty?eventId=${eventId}`);
          if (penRes.ok) {
            const penData = await penRes.json();
            if (Array.isArray(penData)) {
              penData.forEach((p: any) => penaltyMap.set(p.bib, p.penaltyMs || 0));
            }
          }
        } catch {}

        // Load manual start map from API
        const manualStartMap = new Map<string, string>();
        try {
          const msRes = await fetch(`/api/manual-start-bib?eventId=${eventId}`);
          if (msRes.ok) {
            const msData = await msRes.json();
            if (Array.isArray(msData)) {
              msData.forEach((ms: any) => manualStartMap.set(ms.epc, ms.timeStr));
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
            const parsed = parseTimeToMs(s);
            absOverrideMs[normKey] = parsed.ms;
            timeOnlyStr[normKey] = null;
          } else {
            absOverrideMs[normKey] = null;
            timeOnlyStr[normKey] = s;
          }
        });

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
              ageCategory: ''
            });
          }
        });

        localMasterAll.forEach((p) => {
          if (hiddenMap[p.epc]) return;
          const finishEntry = finishMap.get(p.epc);

          const catKey = normCat(p.sourceCategoryKey);
          let absMs = absOverrideMs[catKey] ?? null;
          let timeOnly = timeOnlyStr[catKey] ?? null;

          let total: number | null = null;
          const manualStartMs = eventData?.manualStartTime ? new Date(eventData.manualStartTime).getTime() : null;
          let startMs = manualStartMs || startMap.get(p.epc)?.ms;
          
          const bibManualStartStr = manualStartMap.get(p.epc);
          if (bibManualStartStr && finishEntry?.ms) {
            const builtOverride = buildOverrideFromFinishDate(finishEntry.ms, bibManualStartStr);
            if (builtOverride != null) {
              startMs = builtOverride;
              absMs = null;
              timeOnly = null;
            }
          }

          if (absMs != null && Number.isFinite(absMs)) {
            const delta = finishEntry.ms - absMs;
            if (Number.isFinite(delta)) {
              total = delta;
            } else {
              if (!startMs) return;
              total = finishEntry.ms - startMs;
            }
          } else if (timeOnly) {
            const builtOverride = buildOverrideFromFinishDate(finishEntry.ms, timeOnly);
            if (builtOverride != null) {
              const delta = finishEntry.ms - builtOverride;
              if (Number.isFinite(delta)) {
                total = delta;
              } else {
                if (!startMs) return;
                total = finishEntry.ms - startMs;
              }
            } else {
              if (!startMs) return;
              total = finishEntry.ms - startMs;
            }
          } else {
            if (startMs && finishEntry?.ms) {
              total = finishEntry.ms - startMs;
            }
          }

          let latestCpStr = "-";
          const epsRecords = recordsByEpc[p.epc];
          if (epsRecords && epsRecords.length > 0) {
            const latest = epsRecords[epsRecords.length - 1];
            const cpTime = new Date(latest.time);
            const cpTimeStr = cpTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            latestCpStr = `${latest.checkpointName} (${cpTimeStr})`;
          }

          if ((total == null) && epsRecords && epsRecords.length > 0 && startMs) {
            const latest = epsRecords[epsRecords.length - 1];
            total = new Date(latest.time).getTime() - startMs;
          }

          let isLiveActive = false;
          if (!Number.isFinite(total) || total == null || total < 0) {
            isLiveActive = true;
            total = 0;
          }

          const penMs = penaltyMap.get(p.bib) || 0;
          total! += penMs;

          const isDQ = !!dqMap[p.epc];
          const isDNF = cutoffMs != null && total! > cutoffMs && !isLiveActive;

          // Laps mapping from Live RunnerRecords
          const matchedLaps = checkpoints.map((cpDef: any) => {
             const cpId = cpDef.identitas || cpDef.id;
             const label = cpDef.name || cpDef.identitas || cpDef.id;
             
             // Find if this EPC has a record for this checkpoint
             const recordForCp = epsRecords?.find((rec: any) => rec.identitas === cpId);
             
             if (!recordForCp) return { label, timeDisplay: "-" };
             
             const cpTime = new Date(recordForCp.time);
             
             // If we have a start time, show relative duration, otherwise show time of day
             if (startMs) {
                const diffMs = cpTime.getTime() - startMs;
                if (diffMs > 0) {
                   return { label, timeDisplay: formatDuration(diffMs) };
                }
             }
             
             const cpTimeStr = cpTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
             return { label, timeDisplay: cpTimeStr };
          });

          baseRows.push({
            rank: null,
            bib: p.bib,
            name: p.name,
            gender: p.gender,
            category: p.category || p.sourceCategoryKey,
            sourceCategoryKey: p.sourceCategoryKey,
            ageCategory: p.ageCategory,
            startTimeRaw: startMs ? extractTimeOfDay(new Date(startMs).toISOString()) : "-",
            finishTimeRaw: extractTimeOfDay(finishEntry?.raw || ""),
            totalTimeMs: total!,
            totalTimeDisplay: isDQ ? "DSQ" : isDNF ? "DNF" : isLiveActive ? "ACTIVE" : formatDuration(total!),
            penaltyMs: penMs,
            epc: p.epc,
            latestCp: latestCpStr,
            laps: matchedLaps
          });
        });

        const uniqueRows = Array.from(new Map(baseRows.map(r => [r.epc, r])).values());

        const finishers = uniqueRows.filter(r => r.totalTimeDisplay !== "DNF" && r.totalTimeDisplay !== "DSQ" && r.totalTimeDisplay !== "ACTIVE");
        const finisherSorted = [...finishers].sort((a, b) => a.totalTimeMs - b.totalTimeMs).map((r, i) => ({ ...r, rank: i + 1 }));
        
        const actives = uniqueRows.filter(r => r.totalTimeDisplay === "ACTIVE");
        const dnfs = uniqueRows.filter(r => r.totalTimeDisplay === "DNF").sort((a, b) => a.totalTimeMs - b.totalTimeMs);
        const dsqs = uniqueRows.filter(r => r.totalTimeDisplay === "DSQ");

        const overallFinal: LeaderRow[] = [
          ...finisherSorted,
          ...dnfs.map((r) => ({ ...r, rank: null })),
          ...dsqs.map((r) => ({ ...r, rank: null })),
          ...actives.map((r) => ({ ...r, rank: null })),
        ];

        const catMap: Record<string, LeaderRow[]> = {};
        eventCategories.forEach((catKey: string) => {
          const list = overallFinal.filter((r) => r.sourceCategoryKey === catKey);
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
  }, [hasLoadedOnce, recalcTick, eventId, eventCategories, checkpoints, registrations, recordsByEpc, currentEvent?.cutoffMs, currentEvent?.categoryStartTimes, eventData?.manualStartTime, eventLoading, liveLoading]);

  return { state, overall, byCategory, eventCategories, forceRecalc, hasLoadedOnce };
}
