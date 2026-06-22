import { useMemo, useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { exportLeaderboardCSV } from "../lib/csv";
import { calculatePace } from "../lib/time";

export type LeaderRow = {
  rank: number | null;
  bib: string;
  name: string;
  gender: string;
  category: string;
  sourceCategoryKey: string;
  ageCategory?: string;
  finishTimeRaw: string;
  startTimeRaw?: string;
  totalTimeMs: number;
  totalTimeDisplay: string;
  penaltyMs?: number;
  epc: string;
  laps?: { label: string, timeDisplay: string, isDuration?: boolean }[];
  latestCp?: string;
};

export default function LeaderboardTable({
  title,
  eventName,
  rows,
  categories,
  showTop10Badge = false,
  hideTable = false,
  hidePodium = false,
  onSelect,
}: {
  title: string;
  eventName?: string;
  rows: LeaderRow[];
  categories?: string[];
  showTop10Badge?: boolean;
  hideTable?: boolean;
  hidePodium?: boolean;
  onSelect?: (row: LeaderRow) => void;
}) {
  const [q, setQ] = useState("");
  const [genderFilter, setGenderFilter] = useState("All");
  const [ageCategoryFilter, setAgeCategoryFilter] = useState("All");
  const [isPodiumFullscreen, setIsPodiumFullscreen] = useState(false);
  const podiumRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsPodiumFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      podiumRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const normCat = (s: string) => String(s || "").trim().toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ");

  const uniqueAgeCategories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => {
      if (r.ageCategory && r.ageCategory.trim()) {
        set.add(r.ageCategory.trim());
      }
    });
    return Array.from(set).sort();
  }, [rows]);

  const rankedRows = useMemo(() => {
    let currentRows = rows;
    if (genderFilter !== "All") {
      const gFilter = genderFilter.toLowerCase();
      currentRows = currentRows.filter(r => {
        const g = (r.gender || "").toLowerCase();
        if (gFilter === 'laki-laki') return g === 'laki-laki' || g === 'm' || g === 'male' || g === 'pria';
        if (gFilter === 'perempuan') return g === 'perempuan' || g === 'f' || g === 'female' || g === 'wanita';
        return g === gFilter;
      });
    }
    if (ageCategoryFilter !== "All") {
      currentRows = currentRows.filter(r => r.ageCategory?.trim() === ageCategoryFilter);
    }

    const finishers = currentRows.filter(
      (r) => r.totalTimeDisplay !== "DNF" && r.totalTimeDisplay !== "DSQ" && r.totalTimeDisplay !== "ACTIVE"
    );
    const dnfs = currentRows.filter((r) => r.totalTimeDisplay === "DNF").sort((a, b) => a.totalTimeMs - b.totalTimeMs);
    const dsqs = currentRows.filter((r) => r.totalTimeDisplay === "DSQ");
    const actives = currentRows.filter((r) => r.totalTimeDisplay === "ACTIVE");

    const rankedFinishers = [...finishers]
      .sort((a, b) => {
        const aLaps = a.laps?.length || 0;
        const bLaps = b.laps?.length || 0;
        if (aLaps !== bLaps) return bLaps - aLaps;
        return a.totalTimeMs - b.totalTimeMs;
      })
      .map((r, i) => ({ ...r, rank: i + 1 }));

    const rankedDnfs = dnfs.map((r, i) => ({
      ...r,
      rank: rankedFinishers.length + i + 1,
    }));

    return [
      ...rankedFinishers,
      ...rankedDnfs,
      ...actives.map((r) => ({ ...r, rank: null })),
      ...dsqs.map((r) => ({ ...r, rank: null })),
    ];
  }, [rows, genderFilter, ageCategoryFilter]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rankedRows;
    return rankedRows.filter((r) =>
      String(r.bib).toLowerCase().includes(query) ||
      (r.name && String(r.name).toLowerCase().includes(query))
    );
  }, [q, rankedRows]);

  const podiums = useMemo(() => {
    if (q) return [];

    const buildTop3 = (list: LeaderRow[]) => {
      const finishers = list.filter(r => r.totalTimeDisplay !== 'DNF' && r.totalTimeDisplay !== 'DSQ' && r.totalTimeDisplay !== 'ACTIVE');
      const sorted = [...finishers].sort((a, b) => {
        const aLaps = a.laps?.length || 0;
        const bLaps = b.laps?.length || 0;
        if (aLaps !== bLaps) return bLaps - aLaps;
        return a.totalTimeMs - b.totalTimeMs;
      }).slice(0, 3);
      return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
    };

    let filteredForPodium = rows;
    if (genderFilter !== "All") {
      const gFilter = genderFilter.toLowerCase();
      filteredForPodium = filteredForPodium.filter(r => {
        const g = (r.gender || "").toLowerCase();
        if (gFilter === 'laki-laki') return g === 'laki-laki' || g === 'm' || g === 'male' || g === 'pria';
        if (gFilter === 'perempuan') return g === 'perempuan' || g === 'f' || g === 'female' || g === 'wanita';
        return g === gFilter;
      });
    }
    if (ageCategoryFilter !== "All") {
      filteredForPodium = filteredForPodium.filter(r => r.ageCategory?.trim() === ageCategoryFilter);
    }

    if (categories && categories.length > 0) {
      return categories.map(catKey => {
        const cc = normCat(catKey);
        const list = filteredForPodium.filter(r => {
          const rc = normCat(r.sourceCategoryKey);
          if (rc === cc) return true;
          const regex = new RegExp(`(?:^|\\s)${cc}(?:\\s|$)`, 'i');
          return regex.test(rc);
        });
        return { title: catKey, top3: buildTop3(list) };
      }).filter(p => p.top3.length > 0);
    } else {
      return [{ title: "Champions", top3: buildTop3(filteredForPodium) }];
    }
  }, [q, rows, categories, genderFilter, ageCategoryFilter]);

  const handleExport = () => {
    exportLeaderboardCSV(
      filtered.map(
        (r) =>
        ({
          ...r,
          rank: r.rank ?? "-",
        } as any)
      ),
      `${title.replace(/\s+/g, "_")}.csv`
    );
  };

  // Card border style for top 3 (like the reference)
  const getRowBorder = (rank: number | null) => {
    if (rank === 1) return "border-2 border-[#d4af37] shadow-[0_4px_15px_rgba(212,175,55,0.15)]";
    if (rank === 2) return "border-2 border-slate-300 shadow-[0_4px_15px_rgba(148,163,184,0.15)]";
    if (rank === 3) return "border-2 border-[#cd7f32] shadow-[0_4px_15px_rgba(205,127,50,0.15)]";
    return "border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md";
  };

  return (
    <div className="editorial-table-wrapper w-full">
      {/* ═══════════════════ OLD PODIUM (PRESERVED) ═══════════════════ */}
      {!hidePodium && podiums.length > 0 && (
        <div
          ref={podiumRef}
          className={`bg-stone-50 relative overflow-x-hidden overflow-y-auto flex flex-col items-center shadow-sm ${isPodiumFullscreen ? "w-screen h-screen justify-center p-4 sm:p-8" : "mb-12 mt-4 border-2 border-stone-200 border-b-[8px] rounded-3xl p-6 sm:p-12 w-full max-h-[80vh]"
            }`}
        >
          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 z-20 p-3 bg-white border-2 border-stone-200 border-b-[4px] rounded-xl text-stone-400 hover:text-stone-600 hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-[2px] transition-all shadow-sm"
            title={isPodiumFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isPodiumFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 9V4.5M9 9H4.5M15 9V4.5M15 9h4.5M9 15v4.5M9 15H4.5M15 15v4.5M15 15h4.5" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            )}
          </button>

          {/* Decorative Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20 z-0">
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-yellow-300 rounded-full blur-3xl"></div>
            <div className="absolute top-40 -right-20 w-80 h-80 bg-red-300 rounded-full blur-3xl"></div>
          </div>

          {isPodiumFullscreen && eventName && (
            <div className="absolute top-8 sm:top-12 left-1/2 -translate-x-1/2 text-center z-10 w-full px-4">
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tighter text-stone-900 uppercase opacity-10">
                {eventName}
              </h1>
            </div>
          )}

          {podiums.map((podium, pIdx) => (
            <div key={podium.title} className={`w-full relative z-10 flex flex-col items-center ${pIdx > 0 ? 'mt-16 sm:mt-24 pt-12 sm:pt-16 border-t-[3px] border-dashed border-stone-200' : ''}`}>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-center mb-8 sm:mb-12"
              >
                <h3 className={`font-black tracking-[0.2em] text-red-600 uppercase mb-2 ${isPodiumFullscreen ? 'text-lg md:text-2xl' : 'text-sm'}`}>Podium</h3>
                <h2 className={`font-extrabold text-stone-900 tracking-tighter ${isPodiumFullscreen ? 'text-5xl md:text-7xl' : 'text-3xl sm:text-5xl'}`}>{podium.title}</h2>
                <div className={`font-bold text-stone-500 tracking-wide mt-3 ${isPodiumFullscreen ? 'text-2xl md:text-3xl mb-8' : 'text-base sm:text-xl'}`}>
                  {ageCategoryFilter === "All" ? "All Ages" : ageCategoryFilter} {title.toLowerCase().includes("overall") ? "Overall" : title.replace("Full Standings — ", "").trim()} & {genderFilter === "All" ? "All Genders" : genderFilter}
                </div>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "0px" }}
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.2, delayChildren: 0.2 }
                  }
                }}
                className={`flex flex-row justify-center items-end gap-2 sm:gap-6 w-full mx-auto ${isPodiumFullscreen ? 'max-w-7xl' : 'max-w-5xl'}`}
              >

                {/* 2nd Place */}
                {podium.top3[1] && (
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 100 },
                      visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 60, damping: 12 } }
                    }}
                    className="flex flex-col items-center justify-end w-1/3 order-1 group"
                  >
                    <div className="flex flex-col items-center mb-2 sm:mb-4 w-full px-1 sm:px-2">
                      <motion.div
                        variants={{
                          hidden: { scale: 0 },
                          visible: { scale: 1, transition: { type: "spring", stiffness: 100, delay: 0.6 } }
                        }}
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="w-12 h-12 sm:w-20 sm:h-20 md:w-28 md:h-28 rounded-full border-4 md:border-8 border-white shadow-md flex items-center justify-center text-xl sm:text-3xl md:text-5xl font-black bg-slate-100 text-slate-500 group-hover:-translate-y-2 transition-transform"
                      >
                        {podium.top3[1].name.charAt(0).toUpperCase()}
                      </motion.div>
                      <div className={`font-extrabold text-stone-800 text-center line-clamp-2 w-full mt-2 leading-tight ${isPodiumFullscreen ? 'text-lg md:text-2xl mt-4' : 'text-[10px] sm:text-base'}`}>
                        {podium.top3[1].name}
                      </div>
                      <div className={`font-mono font-bold text-stone-500 mt-0.5 mb-1 bg-white/50 px-2 rounded backdrop-blur-sm ${isPodiumFullscreen ? 'text-sm md:text-lg mt-2' : 'text-[9px] sm:text-xs'}`}>
                        BIB {podium.top3[1].bib}{podium.top3[1].ageCategory ? ` • ${podium.top3[1].ageCategory}` : ''}
                      </div>
                      <div className={`bg-slate-200 border-2 border-slate-300 border-b-4 text-stone-900 font-mono font-black rounded-xl shadow-sm ${isPodiumFullscreen ? 'text-base md:text-xl px-4 py-2 mt-2' : 'text-[10px] sm:text-sm px-2 py-0.5 sm:px-4 sm:py-1.5'}`}>
                        {podium.top3[1].totalTimeDisplay}
                      </div>
                    </div>

                    <div
                      className={`w-full bg-slate-300 border-slate-400 rounded-t-xl sm:rounded-t-3xl flex justify-center pt-4 sm:pt-8 cursor-pointer hover:brightness-105 transition-all shadow-inner ${isPodiumFullscreen ? 'h-48 md:h-64 border-b-[16px] md:border-b-[24px]' : 'h-32 sm:h-48 border-b-[8px] sm:border-b-[16px]'}`}
                      onClick={() => onSelect?.(podium.top3[1])}
                    >
                      <span className={`font-black text-black/10 drop-shadow-sm ${isPodiumFullscreen ? 'text-8xl md:text-9xl' : 'text-5xl sm:text-7xl'}`}>2</span>
                    </div>
                  </motion.div>
                )}

                {/* 1st Place */}
                {podium.top3[0] && (
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 150 },
                      visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 70, damping: 10, delay: 0.2 } }
                    }}
                    className="flex flex-col items-center justify-end w-1/3 order-2 z-10 group"
                  >
                    <div className="flex flex-col items-center mb-2 sm:mb-4 w-full px-1 sm:px-2 relative">
                      {/* Subtle glow for 1st place */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 1 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-48 md:h-48 bg-yellow-400 blur-3xl opacity-20 -z-10 rounded-full"
                      />

                      <motion.div
                        variants={{
                          hidden: { scale: 0 },
                          visible: { scale: 1, transition: { type: "spring", stiffness: 100, delay: 0.8 } }
                        }}
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                        className="w-16 h-16 sm:w-24 sm:h-24 md:w-36 md:h-36 rounded-full border-4 md:border-8 border-white shadow-lg flex items-center justify-center text-2xl sm:text-4xl md:text-6xl font-black bg-yellow-100 text-yellow-600 group-hover:-translate-y-2 transition-transform"
                      >
                        {podium.top3[0].name.charAt(0).toUpperCase()}
                      </motion.div>
                      <div className={`font-extrabold text-stone-900 text-center line-clamp-2 w-full mt-2 leading-tight ${isPodiumFullscreen ? 'text-xl md:text-3xl mt-4' : 'text-[11px] sm:text-lg'}`}>
                        {podium.top3[0].name}
                      </div>
                      <div className={`font-mono font-bold text-stone-500 mt-0.5 mb-1 bg-white/50 px-2 rounded backdrop-blur-sm ${isPodiumFullscreen ? 'text-base md:text-xl mt-2' : 'text-[10px] sm:text-sm'}`}>
                        BIB {podium.top3[0].bib}{podium.top3[0].ageCategory ? ` • ${podium.top3[0].ageCategory}` : ''}
                      </div>
                      <div className={`bg-yellow-200 border-2 border-yellow-400 border-b-4 text-stone-900 font-mono font-black rounded-xl shadow-sm ${isPodiumFullscreen ? 'text-lg md:text-3xl px-6 py-2 mt-2' : 'text-[11px] sm:text-base px-3 py-1 sm:px-5 sm:py-1.5'}`}>
                        {podium.top3[0].totalTimeDisplay}
                      </div>
                    </div>

                    <div
                      className={`w-full bg-yellow-400 border-yellow-600 rounded-t-xl sm:rounded-t-3xl flex justify-center pt-4 sm:pt-10 cursor-pointer hover:brightness-105 transition-all relative overflow-hidden shadow-inner ${isPodiumFullscreen ? 'h-64 md:h-96 border-b-[16px] md:border-b-[24px]' : 'h-40 sm:h-64 border-b-[8px] sm:border-b-[16px]'}`}
                      onClick={() => onSelect?.(podium.top3[0])}
                    >
                      {/* Auto-looping shimmer sweep */}
                      <div
                        className="absolute inset-0 -skew-x-12 pointer-events-none"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%, transparent 100%)',
                          backgroundSize: '200% 100%',
                          animation: 'shimmer-sweep 3s ease-in-out infinite',
                        }}
                      />
                      <style>{`
                                 @keyframes shimmer-sweep {
                                   0% { background-position: 200% 0; }
                                   100% { background-position: -200% 0; }
                                 }
                               `}</style>
                      <span className={`font-black text-black/10 drop-shadow-sm relative z-10 ${isPodiumFullscreen ? 'text-9xl md:text-[12rem] leading-none' : 'text-6xl sm:text-8xl'}`}>1</span>
                    </div>
                  </motion.div>
                )}

                {/* 3rd Place */}
                {podium.top3[2] && (
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 80 },
                      visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50, damping: 14 } }
                    }}
                    className="flex flex-col items-center justify-end w-1/3 order-3 group"
                  >
                    <div className="flex flex-col items-center mb-2 sm:mb-4 w-full px-1 sm:px-2">
                      <motion.div
                        variants={{
                          hidden: { scale: 0 },
                          visible: { scale: 1, transition: { type: "spring", stiffness: 100, delay: 0.4 } }
                        }}
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 1.4 }}
                        className="w-12 h-12 sm:w-20 sm:h-20 md:w-28 md:h-28 rounded-full border-4 md:border-8 border-white shadow-md flex items-center justify-center text-xl sm:text-3xl md:text-5xl font-black bg-orange-100 text-orange-600 group-hover:-translate-y-2 transition-transform"
                      >
                        {podium.top3[2].name.charAt(0).toUpperCase()}
                      </motion.div>
                      <div className={`font-extrabold text-stone-800 text-center line-clamp-2 w-full mt-2 leading-tight ${isPodiumFullscreen ? 'text-lg md:text-2xl mt-4' : 'text-[10px] sm:text-base'}`}>
                        {podium.top3[2].name}
                      </div>
                      <div className={`font-mono font-bold text-stone-500 mt-0.5 mb-1 bg-white/50 px-2 rounded backdrop-blur-sm ${isPodiumFullscreen ? 'text-sm md:text-lg mt-2' : 'text-[9px] sm:text-xs'}`}>
                        BIB {podium.top3[2].bib}{podium.top3[2].ageCategory ? ` • ${podium.top3[2].ageCategory}` : ''}
                      </div>
                      <div className={`bg-orange-200 border-2 border-orange-300 border-b-4 text-stone-900 font-mono font-black rounded-xl shadow-sm ${isPodiumFullscreen ? 'text-base md:text-xl px-4 py-2 mt-2' : 'text-[10px] sm:text-sm px-2 py-0.5 sm:px-4 sm:py-1.5'}`}>
                        {podium.top3[2].totalTimeDisplay}
                      </div>
                    </div>

                    <div
                      className={`w-full bg-orange-400 border-orange-600 rounded-t-xl sm:rounded-t-3xl flex justify-center pt-3 sm:pt-6 cursor-pointer hover:brightness-105 transition-all shadow-inner ${isPodiumFullscreen ? 'h-36 md:h-56 border-b-[16px] md:border-b-[24px]' : 'h-24 sm:h-40 border-b-[8px] sm:border-b-[16px]'}`}
                      onClick={() => onSelect?.(podium.top3[2])}
                    >
                      <span className={`font-black text-black/10 drop-shadow-sm ${isPodiumFullscreen ? 'text-7xl md:text-8xl' : 'text-5xl sm:text-7xl'}`}>3</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════ TABLE SECTION (NEW SHARP DESIGN) ═══════════════════ */}
      {!hideTable && (
        <>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4 pb-5 mb-5 border-b border-slate-200">
            <div>
              {title && <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-800">{title}</h2>}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  className="w-full sm:w-56 pl-9 pr-3 py-2 border border-slate-200 rounded font-medium text-slate-700 text-sm placeholder-slate-400 focus:border-slate-400 focus:ring-0 outline-none transition-all bg-white"
                  type="text"
                  placeholder="Search BIB or Name..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <select
                className="w-full sm:w-auto px-3 py-2 border border-slate-200 rounded font-medium text-slate-700 text-sm focus:border-slate-400 focus:ring-0 outline-none transition-all bg-white cursor-pointer"
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
              >
                <option value="All">All Genders</option>
                <option value="Laki-laki">Male</option>
                <option value="Perempuan">Female</option>
              </select>
              <select
                className="w-full sm:w-auto px-3 py-2 border border-slate-200 rounded font-medium text-slate-700 text-sm focus:border-slate-400 focus:ring-0 outline-none transition-all bg-white cursor-pointer"
                value={ageCategoryFilter}
                onChange={(e) => setAgeCategoryFilter(e.target.value)}
              >
                <option value="All">All Ages</option>
                {uniqueAgeCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button className="px-3.5 py-2 font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded transition-colors text-sm" onClick={() => { setQ(""); setGenderFilter("All"); setAgeCategoryFilter("All"); }}>
                Reset
              </button>
              <button onClick={handleExport} className="px-4 py-2 font-semibold text-white bg-red-500 hover:bg-red-600 active:bg-red-700 rounded shadow-sm hover:shadow transition-all text-sm">
                Export CSV
              </button>
            </div>
          </div>

          {/* Column Header */}
          <div className="hidden md:grid grid-cols-[44px_1fr_90px_90px_90px_110px_80px_28px] gap-2 px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-0.5">
            <div>#</div>
            <div>Name</div>
            <div>Category</div>
            <div>Start</div>
            <div>Finish</div>
            <div>Race Time</div>
            <div>Avg Pace</div>
            <div></div>
          </div>

          {/* Table Rows — sharp corners */}
          <div className="flex flex-col gap-2.5 overflow-x-auto pb-4 pt-1">
            <div className="min-w-[800px] md:min-w-0 flex flex-col gap-2.5">
              {filtered.map((r) => {
                const pos = r.rank ?? "-";
                const isSpecial = r.totalTimeDisplay === "DNF" || r.totalTimeDisplay === "DSQ";
                const isActive = r.totalTimeDisplay === "ACTIVE";
                const isTop3 = r.rank != null && r.rank <= 3;

                return (
                  <div
                    key={r.epc}
                    onClick={() => onSelect?.(r)}
                    className={`group cursor-pointer transition-all duration-300 hover:-translate-y-0.5 rounded-xl ${getRowBorder(r.rank)} ${
                      isSpecial ? 'bg-red-50/50' :
                      isActive ? 'bg-emerald-50/30' :
                      'bg-white'
                    }`}
                  >
                    {/* Desktop row */}
                    <div className="hidden md:grid grid-cols-[44px_1fr_90px_90px_90px_110px_80px_28px] gap-2 items-center px-4 py-3">
                      {/* Rank */}
                      <div className={`font-black text-base ${
                        r.rank === 1 ? 'text-amber-500' :
                        r.rank === 2 ? 'text-slate-400' :
                        r.rank === 3 ? 'text-orange-400' :
                        'text-slate-300'
                      }`}>
                        {pos}
                      </div>

                      {/* Name + Avatar + BIB */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          r.rank === 1 ? 'bg-amber-100 text-amber-700' :
                          r.rank === 2 ? 'bg-slate-100 text-slate-600' :
                          r.rank === 3 ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-50 text-slate-400'
                        }`}>
                          {(r.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 text-sm truncate leading-tight">{r.name || "-"}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] font-semibold text-red-400">{r.bib}</span>
                            {r.ageCategory && (
                              <>
                                <span className="text-slate-200">•</span>
                                <span className="text-[10px] text-slate-400">{r.ageCategory}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Category */}
                      <div className="text-xs font-medium text-slate-500">{r.category || "-"}</div>

                      {/* Start */}
                      <div className="font-mono text-[11px] text-emerald-500 font-medium">{r.startTimeRaw || "-"}</div>

                      {/* Finish */}
                      <div className="font-mono text-[11px] text-rose-400 font-medium">{r.finishTimeRaw || "-"}</div>

                      {/* Race Time */}
                      <div className={`font-mono font-bold text-xs px-2.5 py-1 rounded inline-flex items-center justify-center ${
                        isSpecial ? 'bg-red-100 text-red-600' :
                        isActive ? 'bg-emerald-100 text-emerald-600' :
                        isTop3 ? 'bg-slate-800 text-white' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {r.totalTimeDisplay}
                      </div>

                      {/* Avg Pace */}
                      <div className="font-mono text-[11px] font-semibold text-slate-500">
                        {calculatePace(r.totalTimeMs, r.category)}
                      </div>

                      {/* Chevron */}
                      <div className="text-slate-200 group-hover:text-slate-400 transition-colors flex justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="md:hidden p-3.5">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <span className={`font-black text-sm ${
                            r.rank === 1 ? 'text-amber-500' :
                            r.rank === 2 ? 'text-slate-400' :
                            r.rank === 3 ? 'text-orange-400' :
                            'text-slate-300'
                          }`}>
                            {pos}
                          </span>
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                            r.rank === 1 ? 'bg-amber-100 text-amber-700' :
                            r.rank === 2 ? 'bg-slate-100 text-slate-600' :
                            r.rank === 3 ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-50 text-slate-400'
                          }`}>
                            {(r.name || "?").charAt(0).toUpperCase()}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 text-sm truncate">{r.name || "-"}</div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="font-mono text-[10px] font-semibold text-red-400">BIB {r.bib}</span>
                                <span className="text-[10px] text-slate-400">{r.category}</span>
                                {r.ageCategory && <span className="text-[10px] text-slate-300">• {r.ageCategory}</span>}
                              </div>
                            </div>
                            <div className={`flex-shrink-0 font-mono font-bold text-[11px] px-2 py-1 rounded ${
                              isSpecial ? 'bg-red-100 text-red-600' :
                              isActive ? 'bg-emerald-100 text-emerald-600' :
                              isTop3 ? 'bg-slate-800 text-white' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {r.totalTimeDisplay}
                            </div>
                          </div>

                          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px]">
                            <div className="whitespace-nowrap">
                              <span className="text-slate-400">Start </span>
                              <span className="font-mono font-medium text-emerald-500">{r.startTimeRaw || "-"}</span>
                            </div>
                            <div className="whitespace-nowrap">
                              <span className="text-slate-400">Finish </span>
                              <span className="font-mono font-medium text-rose-400">{r.finishTimeRaw || "-"}</span>
                            </div>
                            <div className="whitespace-nowrap">
                              <span className="text-slate-400">Pace </span>
                              <span className="font-mono font-medium text-slate-500">{calculatePace(r.totalTimeMs, r.category)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Laps (if any) */}
                    {r.laps && r.laps.length > 0 && (
                      <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
                        {r.laps.map((lap, i) => (
                          <div key={i} className="flex-shrink-0 bg-slate-50 border border-slate-100 rounded px-2 py-1">
                            <div className="flex justify-between items-start gap-3 mb-0.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">{lap.label}</span>
                              <span className="text-[7px] font-bold text-slate-300 bg-slate-100/50 px-1 rounded-sm leading-none pt-[1px]" title={lap.isDuration ? "Duration from Start" : "Time of Day"}>
                                {lap.isDuration ? "DUR" : "JAM"}
                              </span>
                            </div>
                            <span className="font-mono text-xs font-bold text-slate-600 block">{lap.timeDisplay}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 px-4">
                  <div className="font-bold text-xl text-slate-300 mb-1 tracking-tight">No Tracking Data</div>
                  <div className="text-sm font-medium text-slate-400">
                    {rows.length === 0
                      ? "The leaderboards are currently empty. Awaiting timing data."
                      : `No results found for "${q}".`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
