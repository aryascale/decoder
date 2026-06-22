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
  laps?: { label: string, timeDisplay: string }[];
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

  const maxLapsCount = useMemo(() => {
    return rows.reduce((max, r) => Math.max(max, r.laps?.length || 0), 0);
  }, [rows]);

  const gridTemplateColumnsInner = useMemo(() => {
    const lapCols = Array(maxLapsCount).fill('100px').join(' ');
    return `36px 56px minmax(140px, 1fr) 80px 80px 80px 130px ${lapCols ? lapCols + ' ' : ''}`;
  }, [maxLapsCount]);

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
      .sort((a, b) => a.totalTimeMs - b.totalTimeMs)
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
    if (q) return []; // Only show champions when not searching

    const buildTop3 = (list: LeaderRow[]) => {
      const finishers = list.filter(r => r.totalTimeDisplay !== 'DNF' && r.totalTimeDisplay !== 'DSQ' && r.totalTimeDisplay !== 'ACTIVE');
      const sorted = [...finishers].sort((a, b) => a.totalTimeMs - b.totalTimeMs).slice(0, 3);
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

  const showingCount = filtered.length;

  const getPosStyle = (rank: number | null) => {
    if (rank === 1) return "bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-950 font-black shadow-lg shadow-yellow-200";
    if (rank === 2) return "bg-gradient-to-br from-gray-200 to-gray-400 text-gray-800 font-black shadow-lg shadow-gray-200";
    if (rank === 3) return "bg-gradient-to-br from-orange-300 to-orange-600 text-orange-950 font-black shadow-lg shadow-orange-200/50";
    return "bg-black text-white font-bold opacity-80";
  };



  return (
    <div className="editorial-table-wrapper w-full">
      {/* Champions Spotlights */}
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

      {/* Main Table Tools */}
      {!hideTable && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4 border-b-2 border-stone-900 pb-4 mb-6">
            <div>
              {title && <h2 className="text-2xl font-black tracking-tighter text-stone-900 uppercase">{title}</h2>}
              <div className="text-sm font-medium text-stone-500 tracking-wide mt-1">
                Displaying <span className="font-bold text-red-600">{showingCount}</span> verified entries
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  className="w-full sm:w-64 pl-9 pr-4 py-2 border-2 border-stone-200 rounded-lg font-medium text-stone-800 placeholder-stone-400 focus:border-red-500 focus:ring-0 outline-none transition-colors"
                  type="text"
                  placeholder="Search BIB or Name..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <select
                className="w-full sm:w-auto px-4 py-2 border-2 border-stone-200 rounded-lg font-medium text-stone-800 focus:border-red-500 focus:ring-0 outline-none transition-colors bg-white cursor-pointer"
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
              >
                <option value="All">All Genders</option>
                <option value="Laki-laki">Male</option>
                <option value="Perempuan">Female</option>
              </select>
              <select
                className="w-full sm:w-auto px-4 py-2 border-2 border-stone-200 rounded-lg font-medium text-stone-800 focus:border-red-500 focus:ring-0 outline-none transition-colors bg-white cursor-pointer"
                value={ageCategoryFilter}
                onChange={(e) => setAgeCategoryFilter(e.target.value)}
              >
                <option value="All">All Ages</option>
                {uniqueAgeCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button className="px-5 py-2 font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors border border-transparent" onClick={() => { setQ(""); setGenderFilter("All"); setAgeCategoryFilter("All"); }}>
                Reset
              </button>
              <button onClick={handleExport} className="px-5 py-2 font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow-md hover:shadow-lg transition-all border border-red-700">
                Export CSV
              </button>
            </div>
          </div>

          {/* Unified Card Feed View */}
          <div className="flex flex-col gap-3 pb-4">
            {filtered.map((r) => {
              const pos = r.rank ?? "-";
              const isTop10 = r.rank != null && r.rank <= 10;
              const isSpecial = r.totalTimeDisplay === "DNF" || r.totalTimeDisplay === "DSQ";

              return (
                <div 
                  key={r.epc} 
                  onClick={() => onSelect?.(r)}
                  className={`flex flex-col rounded-2xl border cursor-pointer hover:-translate-y-1 transition-all duration-300 min-w-0 ${
                    isSpecial ? 'border-red-200 bg-red-50/80 backdrop-blur-sm' :
                    (isTop10 && showTop10Badge) ? 'border-white/50 bg-white/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]' :
                    (isTop10 && showTop10Badge) ? 'border-white/50 bg-white/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.06)]' :
                    'border-slate-200/60 bg-white/80 backdrop-blur-md hover:border-slate-300 hover:shadow-lg'
                  }`}
                >
                  {/* Top Section */}
                  <div className="flex flex-col sm:flex-row justify-between p-4 lg:p-5 gap-4">
                    {/* Left: Pos + Athlete Details */}
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Pos Badge */}
                      <span className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl text-lg sm:text-xl font-black ${getPosStyle(r.rank)}`}>
                        {pos}
                      </span>
                      
                      {/* Athlete Info */}
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg lg:text-xl truncate max-w-full">
                          {r.name || "-"}
                        </div>
                        
                        {/* Pills */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="font-mono font-semibold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md text-[10px] lg:text-xs tracking-wide shadow-sm">
                            BIB {r.bib || "-"}
                          </span>
                          <span className="font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] lg:text-xs shadow-sm">
                            {r.gender || "-"}
                          </span>
                          <span className="font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] lg:text-xs shadow-sm">
                            {r.category || "-"}
                          </span>
                          {r.ageCategory && (
                            <span className="font-bold text-stone-600 bg-stone-100 border border-stone-200 px-1.5 sm:px-2 py-0.5 rounded text-[10px] lg:text-xs">
                              {r.ageCategory}
                            </span>
                          )}
                        </div>
                        
                        {/* Pace */}
                        <div className="text-[10px] font-black text-stone-400 mt-1 uppercase tracking-widest flex items-center gap-1">
                          Pace <span className="text-yellow-600">{calculatePace(r.totalTimeMs, r.category)} /km</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Race Time */}
                    <div className="flex flex-col items-end sm:items-end justify-start self-end sm:self-start mt-2 sm:mt-0">
                      <div className="text-[9px] uppercase font-black text-stone-400 tracking-widest mb-1 text-right">Race Time</div>
                      <span className={`font-mono font-black text-sm lg:text-lg tracking-tighter bg-stone-100 border-2 border-stone-200 border-b-[4px] px-3 py-1.5 rounded-xl inline-block text-center whitespace-nowrap min-w-[120px] ${isSpecial ? "text-orange-600" : r.totalTimeDisplay === "ACTIVE" ? "text-emerald-600 border-emerald-200 bg-emerald-50" : "text-stone-900"}`}>
                        {r.totalTimeDisplay}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Bar: Timestamps */}
                  <div className="flex flex-wrap md:flex-nowrap items-center bg-slate-50/50 backdrop-blur-sm border-t border-slate-100 rounded-b-2xl overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    <div className="flex-1 px-4 py-2 sm:px-5 sm:py-3">
                      <div className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">Start</div>
                      <div className="font-mono text-[10px] sm:text-xs font-semibold text-emerald-500">{r.startTimeRaw || "-"}</div>
                    </div>
                    <div className="flex-1 px-4 py-2 sm:px-5 sm:py-3">
                      <div className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">Finish</div>
                      <div className="font-mono text-[10px] sm:text-xs font-semibold text-rose-500">{r.finishTimeRaw || "-"}</div>
                    </div>
                    <div className="flex-1 px-4 py-2 sm:px-5 sm:py-3">
                      <div className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">Total</div>
                      <div className="font-mono text-[10px] sm:text-xs font-semibold text-slate-800">
                        {r.totalTimeDisplay === "INVALID" ? "Start time tidak valid" : r.totalTimeDisplay}
                      </div>
                    </div>
                  </div>
                  
                  {/* Laps (if any) */}
                  {r.laps && r.laps.length > 0 && (
                    <div className="flex gap-2 p-3 sm:p-4 border-t-2 border-dashed border-stone-100 bg-white overflow-x-auto rounded-b-xl">
                      {r.laps.map((lap, i) => (
                        <div key={i} className="flex flex-col flex-shrink-0 bg-stone-50 border-2 border-stone-100 rounded-lg px-2 py-1">
                          <span className="text-[10px] font-bold text-stone-400 uppercase">{lap.label}</span>
                          <span className="font-mono text-xs sm:text-sm font-bold text-stone-700">{lap.timeDisplay}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center py-16 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 px-4">
                <div className="font-black text-2xl text-stone-300 mb-2 tracking-tighter uppercase">No Tracking Data</div>
                <div className="text-sm font-medium text-stone-500">
                  {rows.length === 0
                    ? "The leaderboards are currently empty. Awaiting timing data."
                    : `No results found for "${q}".`}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
