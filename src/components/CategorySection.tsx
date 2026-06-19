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
      (r) => r.totalTimeDisplay !== "DNF" && r.totalTimeDisplay !== "DSQ" && r.totalTimeDisplay !== "ACTIVE"
    );

    const dnfs = rows
      .filter((r) => r.totalTimeDisplay === "DNF")
      .sort((a, b) => a.totalTimeMs - b.totalTimeMs);

    const dsqs = rows.filter((r) => r.totalTimeDisplay === "DSQ");
    const actives = rows.filter((r) => r.totalTimeDisplay === "ACTIVE");

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
    <div className="category-wrap">
      <div className="editorial-card mb-4" style={{ marginBottom: "1rem" }}>
        <div className="header-row border-b-2 border-red-600/30 pb-4">
          <div>
            <h2 className="section-title">{categoryKey}</h2>
          </div>

          <div className="tools">
            <button className="editorial-btn" onClick={exportAll}>
              Export Full CSV
            </button>
            <button
              className="editorial-btn-ghost"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Hide Full Standings" : "View Full Standings"}
            </button>
          </div>
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
