import { useMemo, useState } from "react";
import LeaderboardTable, { LeaderRow } from "./LeaderboardTable";
import { exportLeaderboardCSV } from "../lib/csv";

export default function CategorySection({
  categoryKey,
  rows,
  onSelect,
}: {
  categoryKey: string;
  rows: LeaderRow[];
  onSelect?: (row: LeaderRow) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const rankedRows = useMemo(() => {
    const finishers = rows.filter(
      (r) => r.totalTimeDisplay !== "DNF" && r.totalTimeDisplay !== "DSQ" && r.totalTimeDisplay !== "ACTIVE" && r.totalTimeDisplay !== "Active"
    );

    const dnfs = rows
      .filter((r) => r.totalTimeDisplay === "DNF")
      .sort((a, b) => a.totalTimeMs - b.totalTimeMs);

    const dsqs = rows.filter((r) => r.totalTimeDisplay === "DSQ");
    const actives = rows.filter((r) => r.totalTimeDisplay === "ACTIVE" || r.totalTimeDisplay === "Active");

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
  }, [rows]);

  const exportAll = () =>
    exportLeaderboardCSV(
      rankedRows,
      `${categoryKey.replace(/\s+/g, "_")}_full.csv`
    );

  return (
    <div className="flex flex-col gap-6">
      {/* Premium Category Header */}
      <div className="bg-white border-y sm:border-y-0 sm:border sm:border-slate-200 sm:rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight uppercase border-l-[4px] border-red-500 pl-3 leading-none">
          {categoryKey}
        </h2>

        <div className="flex w-full sm:w-auto flex-wrap sm:flex-nowrap gap-2.5">
          <button 
            className="flex-1 sm:flex-none px-4 py-2 font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow-sm hover:shadow transition-all text-xs uppercase tracking-wider" 
            onClick={exportAll}
          >
            Export Full CSV
          </button>
          <button
            className="flex-1 sm:flex-none px-4 py-2 font-bold text-slate-700 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100 rounded-lg transition-all shadow-sm text-xs uppercase tracking-wider"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Hide Full Standings" : "View Full Standings"}
          </button>
        </div>
      </div>

      <LeaderboardTable
        title={`Full Standings — ${categoryKey}`}
        rows={rankedRows}
        showTop10Badge
        hideTable={!expanded}
        onSelect={onSelect}
      />
    </div>
  );
}
