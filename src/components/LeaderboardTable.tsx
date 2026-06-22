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
    if (q) return [];

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

  // Champion card colors
  const championConfig = [
    { // 1st
      border: "border-amber-400",
      bg: "bg-gradient-to-br from-amber-50 to-yellow-50",
      avatarBg: "bg-gradient-to-br from-amber-300 to-yellow-400",
      avatarText: "text-amber-900",
      badge: "bg-amber-400 text-amber-950",
      ordinal: "1st",
      timeBg: "bg-amber-100 text-amber-800 border-amber-300",
    },
    { // 2nd
      border: "border-slate-300",
      bg: "bg-gradient-to-br from-slate-50 to-gray-50",
      avatarBg: "bg-gradient-to-br from-slate-300 to-gray-400",
      avatarText: "text-slate-800",
      badge: "bg-slate-400 text-white",
      ordinal: "2nd",
      timeBg: "bg-slate-100 text-slate-700 border-slate-300",
    },
    { // 3rd
      border: "border-orange-300",
      bg: "bg-gradient-to-br from-orange-50 to-amber-50",
      avatarBg: "bg-gradient-to-br from-orange-300 to-orange-400",
      avatarText: "text-orange-900",
      badge: "bg-orange-400 text-orange-950",
      ordinal: "3rd",
      timeBg: "bg-orange-100 text-orange-800 border-orange-300",
    },
  ];

  // Row left-border for top 3
  const getRowBorder = (rank: number | null) => {
    if (rank === 1) return "border-l-4 border-l-amber-400";
    if (rank === 2) return "border-l-4 border-l-slate-400";
    if (rank === 3) return "border-l-4 border-l-orange-400";
    return "border-l-4 border-l-transparent";
  };

  return (
    <div className="editorial-table-wrapper w-full">
      {/* ─── Champions Section ─── */}
      {!hidePodium && podiums.length > 0 && (
        <div
          ref={podiumRef}
          className={`relative overflow-x-hidden overflow-y-auto flex flex-col items-center ${isPodiumFullscreen ? "w-screen h-screen justify-center p-4 sm:p-8 bg-white" : "mb-10 mt-4 w-full max-h-[80vh]"
            }`}
        >
          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 z-20 p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            title={isPodiumFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isPodiumFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M15 9V4.5M15 9h4.5M9 15v4.5M9 15H4.5M15 15v4.5M15 15h4.5" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            )}
          </button>

          {isPodiumFullscreen && eventName && (
            <div className="absolute top-8 sm:top-12 left-1/2 -translate-x-1/2 text-center z-10 w-full px-4">
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tighter text-slate-900 uppercase opacity-5">
                {eventName}
              </h1>
            </div>
          )}

          {podiums.map((podium, pIdx) => (
            <div key={podium.title} className={`w-full relative z-10 flex flex-col items-center ${pIdx > 0 ? 'mt-12 sm:mt-16 pt-10 sm:pt-14 border-t border-slate-200' : ''}`}>
              {/* Section title */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="text-center mb-8 sm:mb-10 relative"
              >
                {/* Big watermark text behind */}
                <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-slate-100 pointer-events-none select-none ${isPodiumFullscreen ? 'text-[8rem] md:text-[12rem]' : 'text-[6rem] sm:text-[8rem]'}`}>
                  Champions
                </div>
                <h3 className={`relative z-10 font-black tracking-[0.15em] text-red-500 uppercase mb-1 ${isPodiumFullscreen ? 'text-base md:text-xl' : 'text-xs'}`}>Podium</h3>
                <h2 className={`relative z-10 font-extrabold text-slate-900 tracking-tight ${isPodiumFullscreen ? 'text-4xl md:text-6xl' : 'text-2xl sm:text-4xl'}`}>{podium.title}</h2>
                <div className={`relative z-10 font-medium text-slate-400 tracking-wide mt-2 ${isPodiumFullscreen ? 'text-xl md:text-2xl' : 'text-sm'}`}>
                  {ageCategoryFilter === "All" ? "All Ages" : ageCategoryFilter} • {genderFilter === "All" ? "All Genders" : genderFilter}
                </div>
              </motion.div>

              {/* Champion Cards - horizontal layout like reference */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.15, delayChildren: 0.1 }
                  }
                }}
                className={`flex flex-col sm:flex-row justify-center items-stretch gap-4 sm:gap-5 w-full mx-auto mb-6 ${isPodiumFullscreen ? 'max-w-6xl' : 'max-w-4xl'}`}
              >
                {podium.top3.map((r, i) => {
                  const cfg = championConfig[i];
                  return (
                    <motion.div
                      key={r.epc}
                      variants={{
                        hidden: { opacity: 0, y: 30 },
                        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } }
                      }}
                      onClick={() => onSelect?.(r)}
                      className={`relative flex-1 min-w-0 rounded-2xl border-2 ${cfg.border} ${cfg.bg} p-5 sm:p-6 flex flex-col items-center cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group overflow-hidden`}
                    >
                      {/* Ordinal watermark */}
                      <span className={`absolute top-2 right-3 font-black text-slate-900/[0.04] pointer-events-none select-none ${isPodiumFullscreen ? 'text-7xl' : 'text-5xl sm:text-6xl'}`}>
                        {cfg.ordinal}
                      </span>

                      {/* Avatar */}
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
                        className={`relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full ${cfg.avatarBg} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}
                      >
                        <span className={`font-black text-2xl sm:text-3xl ${cfg.avatarText}`}>
                          {r.name.charAt(0).toUpperCase()}
                        </span>
                      </motion.div>

                      {/* Name & category */}
                      <div className={`mt-3 font-bold text-slate-800 text-center line-clamp-2 leading-snug ${isPodiumFullscreen ? 'text-lg md:text-xl' : 'text-sm sm:text-base'}`}>
                        {r.name}
                      </div>
                      <div className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] sm:text-xs font-semibold">
                        {r.category}
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-3 sm:gap-4 mt-4 text-center">
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-700">BIB {r.bib}</div>
                          <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium">Number</div>
                        </div>
                        <div className="w-px h-6 bg-slate-200" />
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-700">{calculatePace(r.totalTimeMs, r.category)}</div>
                          <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium">Avg Pace</div>
                        </div>
                        <div className="w-px h-6 bg-slate-200" />
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-700">{r.gender}</div>
                          <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium">Gender</div>
                        </div>
                      </div>

                      {/* Time badge */}
                      <div className={`mt-4 font-mono font-black text-sm sm:text-base px-5 py-2 rounded-xl border-2 ${cfg.timeBg}`}>
                        {r.totalTimeDisplay}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Table Section ─── */}
      {!hideTable && (
        <>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4 pb-5 mb-6 border-b border-slate-200">
            <div>
              {title && <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-800">{title}</h2>}
              <div className="text-sm font-medium text-slate-400 mt-0.5">
                Displaying <span className="font-bold text-red-500">{showingCount}</span> verified entries
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  className="w-full sm:w-56 pl-9 pr-3 py-2 border border-slate-200 rounded-xl font-medium text-slate-700 text-sm placeholder-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-all bg-white"
                  type="text"
                  placeholder="Search BIB or Name..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <select
                className="w-full sm:w-auto px-3 py-2 border border-slate-200 rounded-xl font-medium text-slate-700 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-all bg-white cursor-pointer"
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
              >
                <option value="All">All Genders</option>
                <option value="Laki-laki">Male</option>
                <option value="Perempuan">Female</option>
              </select>
              <select
                className="w-full sm:w-auto px-3 py-2 border border-slate-200 rounded-xl font-medium text-slate-700 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-all bg-white cursor-pointer"
                value={ageCategoryFilter}
                onChange={(e) => setAgeCategoryFilter(e.target.value)}
              >
                <option value="All">All Ages</option>
                {uniqueAgeCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button className="px-3.5 py-2 font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-sm" onClick={() => { setQ(""); setGenderFilter("All"); setAgeCategoryFilter("All"); }}>
                Reset
              </button>
              <button onClick={handleExport} className="px-4 py-2 font-semibold text-white bg-red-500 hover:bg-red-600 active:bg-red-700 rounded-xl shadow-sm hover:shadow transition-all text-sm">
                Export CSV
              </button>
            </div>
          </div>

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[48px_1fr_100px_100px_100px_110px_90px_32px] gap-2 px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
            <div>#</div>
            <div>Name</div>
            <div>Category</div>
            <div>Start</div>
            <div>Finish</div>
            <div>Race Time</div>
            <div>Avg Pace</div>
            <div></div>
          </div>

          {/* Table Rows */}
          <div className="flex flex-col gap-1">
            {filtered.map((r) => {
              const pos = r.rank ?? "-";
              const isSpecial = r.totalTimeDisplay === "DNF" || r.totalTimeDisplay === "DSQ";
              const isActive = r.totalTimeDisplay === "ACTIVE";
              const isTop3 = r.rank != null && r.rank <= 3;

              return (
                <motion.div
                  key={r.epc}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => onSelect?.(r)}
                  className={`group rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md ${getRowBorder(r.rank)} ${
                    isSpecial ? 'bg-red-50/60 border-red-200/60 hover:bg-red-50' :
                    isActive ? 'bg-emerald-50/40 border-emerald-200/60 hover:bg-emerald-50/60' :
                    isTop3 ? 'bg-white border-slate-200 hover:bg-slate-50' :
                    'bg-white border-slate-100 hover:bg-slate-50/80'
                  }`}
                >
                  {/* Desktop: Table row */}
                  <div className="hidden md:grid grid-cols-[48px_1fr_100px_100px_100px_110px_90px_32px] gap-2 items-center px-4 py-3.5">
                    {/* Rank */}
                    <div className={`font-black text-lg ${
                      r.rank === 1 ? 'text-amber-500' :
                      r.rank === 2 ? 'text-slate-400' :
                      r.rank === 3 ? 'text-orange-400' :
                      'text-slate-300'
                    }`}>
                      {pos}
                    </div>

                    {/* Name + BIB */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                        r.rank === 1 ? 'bg-amber-100 text-amber-700' :
                        r.rank === 2 ? 'bg-slate-100 text-slate-600' :
                        r.rank === 3 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {(r.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate leading-tight">{r.name || "-"}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] font-semibold text-red-500">{r.bib}</span>
                          {r.ageCategory && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-[10px] text-slate-400 font-medium">{r.ageCategory}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Category */}
                    <div className="text-xs font-semibold text-slate-500">{r.category || "-"}</div>

                    {/* Start */}
                    <div className="font-mono text-xs text-emerald-500 font-semibold">{r.startTimeRaw || "-"}</div>

                    {/* Finish */}
                    <div className="font-mono text-xs text-rose-400 font-semibold">{r.finishTimeRaw || "-"}</div>

                    {/* Race Time */}
                    <div className={`font-mono font-black text-sm px-2.5 py-1 rounded-lg inline-flex items-center justify-center ${
                      isSpecial ? 'bg-red-100 text-red-600' :
                      isActive ? 'bg-emerald-100 text-emerald-600' :
                      isTop3 ? 'bg-slate-900 text-white' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {r.totalTimeDisplay}
                    </div>

                    {/* Avg Pace */}
                    <div className="font-mono text-xs font-bold text-slate-600">
                      {calculatePace(r.totalTimeMs, r.category)}
                    </div>

                    {/* Chevron */}
                    <div className="text-slate-300 group-hover:text-slate-500 transition-colors flex justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </div>

                  {/* Mobile: Card layout */}
                  <div className="md:hidden p-4">
                    <div className="flex items-start gap-3">
                      {/* Rank + Avatar */}
                      <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                        <span className={`font-black text-base ${
                          r.rank === 1 ? 'text-amber-500' :
                          r.rank === 2 ? 'text-slate-400' :
                          r.rank === 3 ? 'text-orange-400' :
                          'text-slate-300'
                        }`}>
                          {pos}
                        </span>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          r.rank === 1 ? 'bg-amber-100 text-amber-700' :
                          r.rank === 2 ? 'bg-slate-100 text-slate-600' :
                          r.rank === 3 ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {(r.name || "?").charAt(0).toUpperCase()}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 text-sm truncate">{r.name || "-"}</div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="font-mono text-[10px] font-semibold text-red-500">BIB {r.bib}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{r.category}</span>
                              {r.ageCategory && <span className="text-[10px] text-slate-400">• {r.ageCategory}</span>}
                            </div>
                          </div>
                          {/* Race Time badge */}
                          <div className={`flex-shrink-0 font-mono font-black text-xs px-2.5 py-1.5 rounded-lg ${
                            isSpecial ? 'bg-red-100 text-red-600' :
                            isActive ? 'bg-emerald-100 text-emerald-600' :
                            isTop3 ? 'bg-slate-900 text-white' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {r.totalTimeDisplay}
                          </div>
                        </div>

                        {/* Mobile stats */}
                        <div className="flex items-center gap-3 mt-3 text-[10px]">
                          <div>
                            <span className="text-slate-400 font-medium">Start </span>
                            <span className="font-mono font-semibold text-emerald-500">{r.startTimeRaw || "-"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium">Finish </span>
                            <span className="font-mono font-semibold text-rose-400">{r.finishTimeRaw || "-"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium">Pace </span>
                            <span className="font-mono font-semibold text-slate-600">{calculatePace(r.totalTimeMs, r.category)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Laps (if any) */}
                  {r.laps && r.laps.length > 0 && (
                    <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
                      {r.laps.map((lap, i) => (
                        <div key={i} className="flex-shrink-0 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">{lap.label}</span>
                          <span className="font-mono text-xs font-bold text-slate-600">{lap.timeDisplay}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 px-4">
                <div className="font-bold text-xl text-slate-300 mb-1 tracking-tight">No Results</div>
                <div className="text-sm font-medium text-slate-400">
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
