import { useEffect, useState } from 'react';
import { useEvent } from '../../../contexts/EventContext';
import { loadMasterParticipants, loadTimesMap } from '../../../lib/data';
import parseTimeToMs, { extractTimeOfDay, formatDuration } from '../../../lib/time';
import type { LeaderRow } from '../../LeaderboardTable';
import DQPage from '../pages/DQPage';



export default function DQPageWrapper() {
  const { currentEvent, loading: eventLoading } = useEvent();
  const [allRows, setAllRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const eventId = currentEvent?.id || 'default';

  useEffect(() => {
    // Wait for event context to finish loading
    if (eventLoading) {
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        console.log('[DQPageWrapper] Loading data for eventId:', eventId);

        const master = await loadMasterParticipants(eventId);
        const startMap = await loadTimesMap("start", eventId);
        const finishMap = await loadTimesMap("finish", eventId);

        // Use timing from event (per-event database) instead of localStorage
        const cutoffMs = currentEvent?.cutoffMs ?? null;
        
        const dqMap: Record<string, boolean> = {};
        try {
          const statusRes = await fetch(`/api/runner-status?eventId=${eventId}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (Array.isArray(statusData)) {
              statusData.forEach((s: any) => {
                if (s.isDQ) dqMap[s.epc] = true;
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
              penData.forEach((p: any) => penaltyMap.set(p.epc, p.penaltyMs || 0));
            }
          }
        } catch {}

        const absOverrideMs: Record<string, number | null> = {};
        const timeOnlyStr: Record<string, string | null> = {};

        Object.entries(catStartRaw).forEach(([key, raw]) => {
          const s = String(raw || "").trim();
          if (!s) {
            absOverrideMs[key] = null;
            timeOnlyStr[key] = null;
            return;
          }
          if (/\d{4}-\d{2}-\d{2}/.test(s)) {
            const parsed = parseTimeToMs(s);
            absOverrideMs[key] = parsed.ms;
            timeOnlyStr[key] = null;
          } else {
            absOverrideMs[key] = null;
            timeOnlyStr[key] = s;
          }
        });

        function buildOverrideFromFinishDate(finishMs: number, timeStr: string): number | null {
          const m = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?/);
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

        master.all.forEach((p) => {
          const finishEntry = finishMap.get(p.epc);
          if (!finishEntry?.ms) return;

          const catKey = p.sourceCategoryKey;
          const absMs = absOverrideMs[catKey] ?? null;
          const timeOnly = timeOnlyStr[catKey] ?? null;

          let total: number | null = null;

          if (absMs != null && Number.isFinite(absMs)) {
            const delta = finishEntry.ms - absMs;
            if (Number.isFinite(delta) && delta >= 0) {
              total = delta;
            } else {
              const startEntry = startMap.get(p.epc);
              if (!startEntry?.ms) return;
              total = finishEntry.ms - startEntry.ms;
            }
          } else if (timeOnly) {
            const builtOverride = buildOverrideFromFinishDate(finishEntry.ms, timeOnly);
            if (builtOverride != null) {
              const delta = finishEntry.ms - builtOverride;
              if (Number.isFinite(delta) && delta >= 0) {
                total = delta;
              } else {
                const startEntry = startMap.get(p.epc);
                if (!startEntry?.ms) return;
                total = finishEntry.ms - startEntry.ms;
              }
            } else {
              const startEntry = startMap.get(p.epc);
              if (!startEntry?.ms) return;
              total = finishEntry.ms - startEntry.ms;
            }
          } else {
            const startEntry = startMap.get(p.epc);
            if (!startEntry?.ms) return;
            total = finishEntry.ms - startEntry.ms;
          }

          if (!Number.isFinite(total) || total == null || total < 0) return;

          // Add penalty time
          const penMs = penaltyMap.get(p.epc) || 0;
          total += penMs;

          const isDQ = !!dqMap[p.epc];
          const isDNF = cutoffMs != null && total > cutoffMs;

          baseRows.push({
            rank: null,
            bib: p.bib,
            name: p.name,
            gender: p.gender,
            category: p.category || p.sourceCategoryKey,
            sourceCategoryKey: p.sourceCategoryKey,
            finishTimeRaw: extractTimeOfDay(finishEntry.raw),
            totalTimeMs: total,
            totalTimeDisplay: isDQ ? "DSQ" : isDNF ? "DNF" : formatDuration(total),
            penaltyMs: penMs,
            epc: p.epc,
          });
        });

        const overallFinal = baseRows;

        setAllRows(overallFinal);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load DQ page data:', error);
        setAllRows([]);
        setLoading(false);
      }
    };

    loadData();
  }, [eventId, eventLoading]);

  const handleConfigChanged = () => {
    // Trigger refresh
    window.location.reload();
  };

  const handleDataVersionBump = () => {
    const { LS_DATA_VERSION } = require('../../../lib/config');
    localStorage.setItem(LS_DATA_VERSION, String(Date.now()));
  };

  if (eventLoading || loading) {
    return <div className="text-center py-8">Loading data...</div>;
  }

  return (
    <DQPage
      allRows={allRows}
      onConfigChanged={handleConfigChanged}
      onDataVersionBump={handleDataVersionBump}
      eventId={eventId}
    />
  );
}
