
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
import { useLeaderboardData } from "../hooks/useLeaderboardData";





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

  const { state, overall, byCategory, eventCategories, forceRecalc, hasLoadedOnce } = useLeaderboardData(currentEvent?.id || "");
  const [activeTab, setActiveTab] = useState<string>("Overall");
  const [selected, setSelected] = useState<LeaderRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileEventSelectorOpen, setMobileEventSelectorOpen] = useState(false);

  // Refresh when Admin uploads CSV / changes title (cross-tab)
  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === LS_DATA_VERSION) {
        forceRecalc();
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
      startTimeRaw: "-",
      finishTimeRaw: "-",
      totalTimeDisplay: selected.totalTimeDisplay,
      checkpointTimes: selected.laps?.map(l => l.timeDisplay) || [],
      penaltyMs: selected.penaltyMs || 0,
      overallRank,
      genderRank,
      categoryRank,
      ageRank,
    };
  }, [selected, overall]);

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
                      rows={overall}
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
                      rows={activeTab === "Overall" ? overall : (byCategory[activeTab] || [])}
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
              eventId={currentEvent?.id || ""}
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

