
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import RaceClock from "../components/RaceClock";
import CategorySection from "../components/CategorySection";
import LeaderboardTable, { LeaderRow } from "../components/LeaderboardTable";
import ParticipantModal from "../components/ParticipantModal";
import Navbar from "../components/Navbar";
import { useEvent } from "../contexts/EventContext";
import {
  loadMasterParticipants,
  loadTimesMap,
  loadCheckpointTimesMap,
} from "../lib/data";
import { DEFAULT_EVENT_TITLE, LS_EVENT_TITLE, LS_DATA_VERSION } from "../lib/config";
import parseTimeToMs, { extractTimeOfDay, formatDuration } from "../lib/time";
import { useLiveTiming } from "../hooks/useLiveTiming";




type LoadState =
  | { status: "loading"; msg: string }
  | { status: "error"; msg: string }
  | { status: "ready" };

export default function LeaderboardPage() {
  const { currentEvent, events, setCurrentEvent, loading: eventLoading } = useEvent();
  const [searchParams] = useSearchParams();
  const [eventTitle, setEventTitle] = useState<string>(() => {
    return localStorage.getItem(LS_EVENT_TITLE) || DEFAULT_EVENT_TITLE;
  });

  // Auto-select event from URL query parameter (?event=slug)
  useEffect(() => {
    const eventSlug = searchParams.get('event');
    if (eventSlug && events.length > 0 && !eventLoading) {
      const matchedEvent = events.find(ev => ev.slug === eventSlug);
      if (matchedEvent && matchedEvent.id !== currentEvent?.id) {
        setCurrentEvent(matchedEvent);
      }
    }
  }, [searchParams, events, eventLoading]);

  const [state, setState] = useState<LoadState>({
    status: "loading",
    msg: "Loading CSV data…",
  });

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [overall, setOverall] = useState<LeaderRow[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, LeaderRow[]>>({});
  const [activeTab, setActiveTab] = useState<string>("Overall");
  const [checkpointMap, setCheckpointMap] = useState<Map<string, string[]>>(
    new Map()
  );

  const [selected, setSelected] = useState<LeaderRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [recalcTick, setRecalcTick] = useState(0);
  
  // Mobile event selector state
  const [mobileEventSelectorOpen, setMobileEventSelectorOpen] = useState(false);

  const eventId = currentEvent?.id || 'default';
  const { checkpoints, registrations, recordsByEpc } = useLiveTiming(eventId);
  
  // Get categories from current event
  const eventCategories: string[] = useMemo(() => {
    return currentEvent?.categories || [];
  }, [currentEvent?.categories]);

  // Reset data and reload when event changes
  useEffect(() => {
    if (currentEvent?.id) {
      setHasLoadedOnce(false);
      setRecalcTick(t => t + 1);
      setActiveTab("Overall"); // Reset to Overall tab when switching events
      // Update event title when switching events
      setEventTitle(currentEvent.name || DEFAULT_EVENT_TITLE);
    }
  }, [currentEvent?.id, currentEvent?.name]);

  useEffect(() => {
    // Wait for event context to finish loading
    if (eventLoading) {
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

        // Calculate Leaderboard Data
        // This function is getting big, ideally we move the calculation logic to a helper
        // But for now, let's keep it here to match previous behavior 
        
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

        function buildOverrideFromFinishDate(
          finishMs: number,
          timeStr: string
        ): number | null {
          if (!timeStr) return null;
          if (timeStr.includes(" ") || timeStr.includes("T")) {
             const parsed = parseTimeToMs(timeStr);
             if (parsed && parsed.ms) return parsed.ms;
          }
          const m = timeStr.match(
            /(\d{1,2}):(\d{2})(?::(\d{2}))?(?:[:\.](\d{1,3}))?/
          );
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
          
          // Individual per-BIB Manual Start Priority overrides Global AND Category Start
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
            const builtOverride = buildOverrideFromFinishDate(
              finishEntry.ms,
              timeOnly
            );
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

          // Calculate Latest CP
          let latestCpStr = "-";
          const epsRecords = recordsByEpc[p.epc];
          if (epsRecords && epsRecords.length > 0) {
            const latest = epsRecords[epsRecords.length - 1];
            const cpTime = new Date(latest.time);
            const cpTimeStr = cpTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            latestCpStr = `${latest.checkpointName} (${cpTimeStr})`;
          }

          // Compute total time for live runners if finish.csv doesn't exist
          if ((total == null) && epsRecords && epsRecords.length > 0 && startMs) {
            const latest = epsRecords[epsRecords.length - 1];
            total = new Date(latest.time).getTime() - startMs;
          }

          if (!Number.isFinite(total) || total == null) return;

          // Add penalty time
          const penMs = penaltyMap.get(p.bib) || 0;
          total! += penMs;

          const isDQ = !!dqMap[p.epc];
          const isDNF = cutoffMs != null && total! > cutoffMs;

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
            totalTimeDisplay: isDQ
              ? "DSQ"
              : isDNF
              ? "DNF"
              : formatDuration(total!),
            penaltyMs: penMs,
            epc: p.epc,
            latestCp: latestCpStr,
          });
        });

        // Deduplicate by EPC to ensure unique participants
        const uniqueRows = Array.from(
          new Map(baseRows.map(r => [r.epc, r])).values()
        );

        const finishers = uniqueRows.filter(
          (r) => r.totalTimeDisplay !== "DNF" && r.totalTimeDisplay !== "DSQ"
        );

        const finisherSorted = [...finishers]
          .sort((a, b) => a.totalTimeMs - b.totalTimeMs)
          .map((r, i) => ({ ...r, rank: i + 1 }));

        const finisherRankByEpc = new Map(
          finisherSorted.map((r) => [r.epc, r.rank!])
        );

        const genderRankByEpc = new Map<string, number>();
        // Use event-specific categories
        const categoryRankByEpc = new Map<string, number>();
        const ageRankByEpc = new Map<string, number>();

        eventCategories.forEach((catKey: string) => {
          // Category Rank: Scoped by Distance (Category)
          const catList = finisherSorted.filter((r) => r.sourceCategoryKey === catKey);
          catList.forEach((r, i) => categoryRankByEpc.set(r.epc, i + 1));

          // Gender Rank: Scoped by Distance + Gender
          const genders = Array.from(new Set(catList.map((r) => (r.gender || "").toLowerCase())));
          genders.forEach((g) => {
            const genderList = catList.filter((r) => (r.gender || "").toLowerCase() === g);
            genderList.forEach((r, i) => genderRankByEpc.set(r.epc, i + 1));

            // Age Rank: Scoped by Distance + Gender + Age Category
            const ageCategories = Array.from(new Set(genderList.map((r) => (r.ageCategory || "").trim())));
            ageCategories.forEach((age) => {
              if (!age || age === "-") return;
              const ageList = genderList.filter((r) => (r.ageCategory || "").trim() === age);
              ageList.forEach((r, i) => ageRankByEpc.set(r.epc, i + 1));
            });
          });
        });

        const dnfs = uniqueRows
          .filter((r) => r.totalTimeDisplay === "DNF")
          .sort((a, b) => a.totalTimeMs - b.totalTimeMs);
        const dsqs = uniqueRows.filter((r) => r.totalTimeDisplay === "DSQ");

        const overallFinal: LeaderRow[] = [
          ...finisherSorted,
          ...dnfs.map((r) => ({ ...r, rank: null })),
          ...dsqs.map((r) => ({ ...r, rank: null })),
        ];

        // Use event-specific categories for category map
        const catMap: Record<string, LeaderRow[]> = {};
        eventCategories.forEach((catKey: string) => {
          const list = overallFinal.filter((r) => r.sourceCategoryKey === catKey);
          catMap[catKey] = list;
        });

        setOverall(overallFinal);
        setByCategory(catMap);

        (LeaderboardPage as any)._rankMaps = {
          finisherRankByEpc,
          genderRankByEpc,
          categoryRankByEpc,
          ageRankByEpc,
        };

        setState({ status: "ready" });
        setHasLoadedOnce(true);
      } catch (e: any) {
        const errorMsg = e?.message || "";
        if (errorMsg.includes("not uploaded")) {
          setState({
            status: "error",
            msg: "CSV files have not been uploaded for this event. Please open the Admin tab to upload Master and Finish CSV.",
          });
        } else {
          setState({
            status: "error",
            msg: e?.message || "Gagal load data",
          });
        }
      }
    })();
  }, [recalcTick, hasLoadedOnce, eventId, eventLoading, eventCategories, recordsByEpc, registrations]);

  // Refresh when Admin uploads CSV / changes title (cross-tab)
  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === LS_DATA_VERSION) {
        setRecalcTick((t) => t + 1);
      }
      if (ev.key === LS_EVENT_TITLE) {
        setEventTitle(ev.newValue || DEFAULT_EVENT_TITLE);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Use event-specific categories for tabs
  const tabs = useMemo(
    () => ["Overall", ...eventCategories],
    [eventCategories]
  );

  // Jika data belum pernah berhasil dimuat (belum upload CSV),
  // tampilkan pesan error untuk upload CSV
  useEffect(() => {
    if (!hasLoadedOnce && state.status === "error") {
      // Keep showing error state
    }
  }, [hasLoadedOnce, state.status]);
  
  const onSelectParticipant = (row: LeaderRow) => {
    setSelected(row);
    setModalOpen(true);
  };

  const modalData = useMemo(() => {
    if (!selected) return null;
    const maps = (LeaderboardPage as any)._rankMaps;
    const overallRank = maps?.finisherRankByEpc?.get(selected.epc) ?? null;
    const genderRank = maps?.genderRankByEpc?.get(selected.epc) ?? null;
    const categoryRank = maps?.categoryRankByEpc?.get(selected.epc) ?? null;
    const ageRank = maps?.ageRankByEpc?.get(selected.epc) ?? null;

    return {
      name: selected.name,
      bib: selected.bib,
      gender: selected.gender,
      category: selected.category,
      ageCategory: selected.ageCategory,
      startTimeRaw: selected.startTimeRaw,
      finishTimeRaw: selected.finishTimeRaw,
      totalTimeDisplay: selected.totalTimeDisplay,
      checkpointTimes: checkpointMap.get(selected.epc) || [],
      penaltyMs: selected.penaltyMs || 0,
      overallRank,
      genderRank,
      categoryRank,
      ageRank,
    };
  }, [selected, checkpointMap]);

  // Patch latestCp reactively from recordsByEpc (bypasses useEffect timing)
  const overallWithLatestCp = useMemo(() => {
    if (Object.keys(recordsByEpc).length === 0) return overall;
    return overall.map(row => {
      const epsRecords = recordsByEpc[row.epc];
      if (!epsRecords || epsRecords.length === 0) return row;
      const latest = epsRecords[epsRecords.length - 1];
      const cpTime = new Date(latest.time);
      const cpTimeStr = cpTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return { ...row, latestCp: `${latest.checkpointName} (${cpTimeStr})` };
    });
  }, [overall, recordsByEpc]);

  // Jangan memblokir UI ketika data belum ada:
  // Admin harus tetap bisa diakses untuk upload CSV pertama kali.
  const needsFirstUpload = !hasLoadedOnce && (state.status === "loading" || state.status === "error");

  return (
    <>
      <Navbar />

      <div className="lb-page">
        {/* Mobile Event Selector Drawer */}
        <div className="lg:hidden w-full fixed bottom-0 left-0 right-0 z-40">
          {mobileEventSelectorOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setMobileEventSelectorOpen(false)}
            />
          )}
          <div className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 transition-transform duration-300 ease-out ${
            mobileEventSelectorOpen ? 'translate-y-0' : 'translate-y-full'
          }`}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-lg">Select Event</h3>
                <button 
                  onClick={() => setMobileEventSelectorOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                {events.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => {
                      setCurrentEvent(ev);
                      setMobileEventSelectorOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                      currentEvent?.id === ev.id
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div className="font-semibold truncate">{ev.name}</div>
                    <div className={`text-sm mt-1 ${currentEvent?.id === ev.id ? 'text-red-100' : 'text-gray-500'}`}>
                      {ev.location || 'No location'}
                    </div>
                  </button>
                ))}
                {events.length === 0 && (
                  <div className="text-gray-500 text-sm text-center py-4">
                    No events available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Events Sidebar - Desktop Only */}
        <aside className="lb-sidebar">
          <h3 className="font-bold text-gray-900 mb-4 text-sm lg:text-base uppercase tracking-wide">Events</h3>
          <div className="space-y-2">
            {events.map((ev) => (
              <button
                key={ev.id}
                onClick={() => setCurrentEvent(ev)}
                className={`w-full text-left px-3 lg:px-4 py-2 lg:py-3 rounded-lg transition-all ${
                  currentEvent?.id === ev.id
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
              >
                <div className="font-semibold text-xs lg:text-sm truncate">{ev.name}</div>
                <div className={`text-[10px] lg:text-xs mt-0.5 lg:mt-1 ${currentEvent?.id === ev.id ? 'text-red-100' : 'text-gray-500'}`}>
                  {ev.location || 'No location'}
                </div>
              </button>
            ))}
            {events.length === 0 && (
              <div className="text-gray-500 text-xs lg:text-sm text-center py-4">
                No events available
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div className="lb-main">
          {/* Red Banner Header */}
          <div className="lb-banner-header">
            <div className="lb-banner-inner" />
          </div>

          {/* Event Info Section */}
          <div className="lb-info-section">
            <div className="lb-info-logo">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#DC2626">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="lb-info-details">
              <div className="lb-info-meta">
                {currentEvent?.eventDate && (
                  <span>
                    {new Date(currentEvent.eventDate).toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric'
                    })}
                  </span>
                )}
                {currentEvent?.location && (
                  <>
                    <span className="lb-info-sep">|</span>
                    <span>{currentEvent.location}</span>
                  </>
                )}
              </div>
              <h1 className="lb-info-title">{eventTitle}</h1>

              {/* Mobile event selector */}
              <button
                onClick={() => setMobileEventSelectorOpen(true)}
                className="lb-mobile-event-btn lg:hidden"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                </svg>
                <span>Change Event</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="lb-tabs-container">
            <div className="lb-tabs">
              {tabs.map((t) => (
                <button
                  key={t}
                  className={`lb-tab ${activeTab === t ? "active" : ""}`}
                  onClick={() => setActiveTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="lb-content">
            {needsFirstUpload && (
              <div className="lb-content-card">
                <div className="error-title">Data not ready</div>
                <div className="error-desc">
                  CSV files have not been uploaded for this event. Please open the Admin tab to upload Master and Finish CSV.
                </div>
                <Link to="/admin/overview" className="btn primary">
                  <span className="icon">📁</span>
                  Open Admin Panel to Upload CSV
                </Link>
              </div>
            )}

            {activeTab === "Overall" && (
              <>
                {state.status === "ready" || hasLoadedOnce ? (
                  <div className="lb-content-card">
                    <RaceClock cutoffMs={currentEvent?.cutoffMs} categoryStartTimes={currentEvent?.categoryStartTimes} />
                    <LeaderboardTable
                      title="Overall Result (All Categories)"
                      rows={overallWithLatestCp}
                      onSelect={onSelectParticipant}
                      hidePodium={true}
                    />
                  </div>
                ) : (
                  <div className="lb-content-card">
                    <p>Please login to the <b>Admin</b> tab to upload CSV (Master &amp; Finish required; Start optional if using global start per category).</p>
                  </div>
                )}
              </>
            )}

            {activeTab !== "Overall" && (
              <>
                {state.status === "ready" || hasLoadedOnce ? (
                  <div className="lb-content-card">
                    <RaceClock cutoffMs={currentEvent?.cutoffMs} categoryStartTimes={currentEvent?.categoryStartTimes} />
                    <CategorySection
                      categoryKey={activeTab}
                      rows={(byCategory as any)[activeTab] || []}
                      onSelect={onSelectParticipant}
                    />
                  </div>
                ) : (
                  <div className="lb-content-card">
                    Data not available. Open <Link to="/admin/overview" className="text-red-600 font-semibold hover:underline">Admin Panel</Link> to upload CSV.
                  </div>
                )}
              </>
            )}

            <ParticipantModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              eventId={eventId}
              eventName={eventTitle}
              data={modalData}
            />
          </div>
        </div>
      </div>

      <style>{`
        .lb-page {
          display: flex;
          min-height: 100vh;
          padding-top: 56px;
        }

        .lb-sidebar {
          width: 220px;
          min-height: calc(100vh - 56px);
          background: #f9fafb;
          border-right: 1px solid #e5e7eb;
          padding: 1.25rem 1rem;
          display: none;
        }

        @media (min-width: 1024px) {
          .lb-sidebar {
            display: block;
          }
        }

        .lb-main {
          flex: 1;
          background: #f8f9fa;
          min-width: 0;
        }

        /* Banner Header */
        .lb-banner-header {
          background: linear-gradient(135deg, #c62828, #e53935);
          height: 80px;
          position: relative;
        }

        .lb-banner-inner {
          width: 100%;
          height: 100%;
        }

        /* Event Info */
        .lb-info-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: flex-start;
          gap: 1.25rem;
          background: white;
          border-bottom: 1px solid #e5e7eb;
        }

        .lb-info-logo {
          width: 72px;
          height: 72px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #fef2f2;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .lb-info-details {
          flex: 1;
          min-width: 0;
        }

        .lb-info-meta {
          font-size: 0.8rem;
          color: #6b7280;
          margin-bottom: 0.35rem;
        }

        .lb-info-sep {
          margin: 0 0.5rem;
        }

        .lb-info-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.25rem 0;
          line-height: 1.3;
        }

        .lb-mobile-event-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: #DC2626;
          font-weight: 600;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 3px 10px;
          cursor: pointer;
          margin-top: 4px;
        }

        /* Tabs */
        .lb-tabs-container {
          background: white;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 56px;
          z-index: 20;
        }

        .lb-tabs {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
          display: flex;
          gap: 0;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .lb-tabs::-webkit-scrollbar {
          display: none;
        }

        .lb-tab {
          padding: 0.85rem 1.25rem;
          border: none;
          background: none;
          font-size: 0.85rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .lb-tab:hover {
          color: #c62828;
        }

        .lb-tab.active {
          color: #c62828;
          border-bottom-color: #c62828;
          font-weight: 600;
        }

        /* Content */
        .lb-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1.25rem 1.5rem;
          width: 100%;
        }

        .lb-content-card {
          background: white;
          border-radius: 8px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          margin-bottom: 1rem;
        }

        .lb-cta-btn {
          display: inline-block;
          padding: 8px 16px;
          background: #fef2f2;
          color: #DC2626;
          border: 1px solid #fecaca;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.85rem;
          text-decoration: none;
          transition: all 0.15s;
        }

        .lb-cta-btn:hover {
          background: #fee2e2;
        }

        /* Mobile adjustments */
        @media (max-width: 768px) {
          .lb-page {
            padding-top: 48px;
          }

          .lb-banner-header {
            height: 60px;
          }

          .lb-info-section {
            padding: 1rem;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 0.75rem;
          }

          .lb-info-logo {
            width: 56px;
            height: 56px;
          }

          .lb-info-title {
            font-size: 1.15rem;
          }

          .lb-tabs-container {
            top: 48px;
          }

          .lb-tabs {
            padding: 0 0.75rem;
          }

          .lb-tab {
            padding: 0.75rem 0.85rem;
            font-size: 0.8rem;
          }

          .lb-content {
            padding: 0.75rem;
          }

          .lb-content-card {
            padding: 1rem;
            border-radius: 0;
            box-shadow: none;
            border: 1px solid #e5e7eb;
          }
        }

        @media (max-width: 480px) {
          .lb-tab {
            padding: 0.65rem 0.65rem;
            font-size: 0.75rem;
          }

          .lb-info-title {
            font-size: 1.05rem;
          }
        }
      `}</style>
    </>
  );
}

