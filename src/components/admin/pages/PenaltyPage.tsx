import { useMemo, useState, useEffect, useCallback } from "react";
import { loadMasterParticipants, loadTimesMap } from "../../../lib/data";
import { extractTimeOfDay, formatDuration } from "../../../lib/time";
import type { LeaderRow } from "../../LeaderboardTable";

interface PenaltyPageProps {
  allRows: LeaderRow[];
  onDataVersionBump: () => void;
  eventId: string;
}

interface PenaltyRecord {
  id: string;
  bib: string;
  epc: string;
  hours: number;
  minutes: number;
  seconds: number;
  penaltyMs: number;
  createdAt: string;
}

interface MasterRow {
  bib: string;
  name: string;
  gender: string;
  category: string;
  epc: string;
  finishTimeRaw: string;
}

function formatPenaltyTime(h: number, m: number, s: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function PenaltyPage({ allRows, onDataVersionBump, eventId }: PenaltyPageProps) {
  const [q, setQ] = useState("");
  const [penalties, setPenalties] = useState<PenaltyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [masterRows, setMasterRows] = useState<MasterRow[]>([]);

  // Penalty input state
  const [selectedBib, setSelectedBib] = useState<string | null>(null);
  const [penHours, setPenHours] = useState("0");
  const [penMinutes, setPenMinutes] = useState("0");
  const [penSeconds, setPenSeconds] = useState("0");
  const [saving, setSaving] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const penaltyByBib = useMemo(() => {
    const map = new Map<string, PenaltyRecord>();
    penalties.forEach(p => map.set(p.bib, p));
    return map;
  }, [penalties]);

  // Load master participants directly from CSV (independent of allRows)
  const loadMasterData = useCallback(async () => {
    try {
      const master = await loadMasterParticipants(eventId);
      let finishMap: Map<string, { ms: number | null; raw: string }> = new Map();
      try {
        finishMap = await loadTimesMap("finish", eventId);
      } catch {}

      const rows: MasterRow[] = master.all.map(p => {
        const finishEntry = finishMap.get(p.epc);
        return {
          bib: p.bib,
          name: p.name,
          gender: p.gender,
          category: p.category || p.sourceCategoryKey,
          epc: p.epc,
          finishTimeRaw: finishEntry ? extractTimeOfDay(finishEntry.raw) : "-",
        };
      });

      setMasterRows(rows);
    } catch (error) {
      console.error("Failed to load master data for penalty page:", error);
      // Fallback to allRows if master CSV fails
      setMasterRows(allRows.map(r => ({
        bib: r.bib,
        name: r.name,
        gender: r.gender,
        category: r.category,
        epc: r.epc,
        finishTimeRaw: r.finishTimeRaw || "-",
      })));
    }
  }, [eventId, allRows]);

  const loadPenalties = useCallback(async () => {
    try {
      const res = await fetch(`/api/penalty?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setPenalties(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to load penalties:", error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadMasterData();
    loadPenalties();
  }, [loadMasterData, loadPenalties]);

  useEffect(() => {
    setCurrentPage(1);
  }, [q]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return masterRows;
    return masterRows.filter(
      (r) =>
        (r.bib || "").toLowerCase().includes(qq) ||
        (r.name || "").toLowerCase().includes(qq)
    );
  }, [q, masterRows]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentRows = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const applyPenalty = async (row: MasterRow) => {
    const h = Math.max(0, parseInt(penHours) || 0);
    const m = Math.max(0, parseInt(penMinutes) || 0);
    const s = Math.max(0, parseInt(penSeconds) || 0);

    if (h === 0 && m === 0 && s === 0) {
      alert("Penalty time harus lebih dari 0.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/penalty?eventId=${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bib: row.bib,
          epc: row.epc,
          hours: h,
          minutes: m,
          seconds: s,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save penalty");
      }

      await loadPenalties();
      onDataVersionBump();
      setSelectedBib(null);
      setPenHours("0");
      setPenMinutes("0");
      setPenSeconds("0");
    } catch (error: any) {
      alert(error.message || "Failed to apply penalty");
    } finally {
      setSaving(false);
    }
  };

  const removePenalty = async (penaltyId: string) => {
    if (!confirm("Hapus penalty ini?")) return;

    try {
      const res = await fetch(`/api/penalty?eventId=${eventId}&id=${penaltyId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete penalty");

      await loadPenalties();
      onDataVersionBump();
    } catch (error: any) {
      alert(error.message || "Failed to remove penalty");
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8">Loading penalty data...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 100px)' }}>
      <div className="card flex-1 flex flex-col mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="section-title">Time Penalty</h2>
            <div className="subtle text-sm">
              Tambahkan penalty waktu (HH:MM:SS) per peserta. Penalty ditambahkan ke total time dan mempengaruhi ranking.
            </div>
          </div>
          <input
            className="search w-full sm:w-64"
            placeholder="Search BIB / Name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-auto">
          {/* Desktop Table */}
          <div className="hidden md:block table-wrap">
            <table className="f1-table compact">
              <thead>
                <tr>
                  <th className="col-bib">BIB</th>
                  <th>NAME</th>
                  <th className="col-gender">GENDER</th>
                  <th className="col-cat">CATEGORY</th>
                  <th style={{ width: 120 }}>FINISH TIME</th>
                  <th style={{ width: 140 }}>PENALTY</th>
                  <th style={{ width: 180 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty py-20">
                      {masterRows.length === 0
                        ? "Upload master CSV terlebih dahulu di tab Data Upload."
                        : "Tidak ada peserta ditemukan."}
                    </td>
                  </tr>
                ) : (
                  currentRows.map((r) => {
                    const pen = penaltyByBib.get(r.bib);
                    const isEditing = selectedBib === r.bib;

                    return (
                      <tr key={r.epc} className="row-hover">
                        <td className="mono text-xs font-bold">{r.bib}</td>
                        <td className="name-cell text-sm">{r.name}</td>
                        <td className="text-xs uppercase">{r.gender}</td>
                        <td className="text-xs">
                          <div>{r.category}</div>
                          {r.ageCategory && (
                            <div className="text-[9px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded mt-1 inline-block">
                              {r.ageCategory}
                            </div>
                          )}
                        </td>
                        <td className="mono text-xs">{r.finishTimeRaw || "-"}</td>
                        <td>
                          {pen ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-orange-100 text-orange-800">
                              +{formatPenaltyTime(pen.hours, pen.minutes, pen.seconds)}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-green-100 text-green-800">
                              NONE
                            </span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <div className="flex items-center gap-0.5">
                                <input
                                  type="number"
                                  min="0"
                                  max="23"
                                  className="search w-10 text-center text-xs py-1 px-1"
                                  placeholder="HH"
                                  value={penHours}
                                  onChange={(e) => setPenHours(e.target.value)}
                                />
                                <span className="text-xs font-bold text-gray-400">:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  className="search w-10 text-center text-xs py-1 px-1"
                                  placeholder="MM"
                                  value={penMinutes}
                                  onChange={(e) => setPenMinutes(e.target.value)}
                                />
                                <span className="text-xs font-bold text-gray-400">:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  className="search w-10 text-center text-xs py-1 px-1"
                                  placeholder="SS"
                                  value={penSeconds}
                                  onChange={(e) => setPenSeconds(e.target.value)}
                                />
                              </div>
                              <button
                                className="btn sm"
                                disabled={saving}
                                onClick={() => applyPenalty(r)}
                              >
                                {saving ? "…" : "✓"}
                              </button>
                              <button
                                className="btn ghost sm"
                                onClick={() => setSelectedBib(null)}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              {pen ? (
                                <>
                                  <button
                                    className="btn ghost sm"
                                    onClick={() => {
                                      setSelectedBib(r.bib);
                                      setPenHours(String(pen.hours));
                                      setPenMinutes(String(pen.minutes));
                                      setPenSeconds(String(pen.seconds));
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="btn ghost sm"
                                    style={{ color: '#dc2626' }}
                                    onClick={() => removePenalty(pen.id)}
                                  >
                                    Remove
                                  </button>
                                </>
                              ) : (
                                <button
                                  className="btn ghost sm"
                                  onClick={() => {
                                    setSelectedBib(r.bib);
                                    setPenHours("0");
                                    setPenMinutes("0");
                                    setPenSeconds("0");
                                  }}
                                >
                                  + Penalty
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {currentRows.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                {masterRows.length === 0
                  ? "Upload master CSV terlebih dahulu di tab Data Upload."
                  : "Tidak ada peserta ditemukan."}
              </div>
            ) : (
              currentRows.map((r) => {
                const pen = penaltyByBib.get(r.bib);
                const isEditing = selectedBib === r.bib;

                return (
                  <div key={r.epc} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-gray-900">{r.name}</div>
                        <div className="text-sm text-gray-500">
                          <span className="mono font-bold">BIB: {r.bib}</span>
                          <span className="mx-2">·</span>
                          <span className="uppercase text-xs">{r.gender}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {r.category}
                          {r.ageCategory && <span className="ml-2 bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[9px] font-bold">{r.ageCategory}</span>}
                        </div>
                        <div className="text-xs text-gray-400 mono mt-0.5">Finish: {r.finishTimeRaw || "-"}</div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                          pen
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {pen ? `+${formatPenaltyTime(pen.hours, pen.minutes, pen.seconds)}` : "NONE"}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 mt-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1 justify-center">
                          <input
                            type="number"
                            min="0"
                            max="23"
                            className="search w-16 text-center text-sm py-1.5"
                            placeholder="HH"
                            value={penHours}
                            onChange={(e) => setPenHours(e.target.value)}
                          />
                          <span className="text-sm font-bold text-gray-400">:</span>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            className="search w-16 text-center text-sm py-1.5"
                            placeholder="MM"
                            value={penMinutes}
                            onChange={(e) => setPenMinutes(e.target.value)}
                          />
                          <span className="text-sm font-bold text-gray-400">:</span>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            className="search w-16 text-center text-sm py-1.5"
                            placeholder="SS"
                            value={penSeconds}
                            onChange={(e) => setPenSeconds(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="btn flex-1 text-xs font-bold"
                            disabled={saving}
                            onClick={() => applyPenalty(r)}
                          >
                            {saving ? "Saving..." : "Apply Penalty"}
                          </button>
                          <button
                            className="btn ghost flex-1 text-xs"
                            onClick={() => setSelectedBib(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-2">
                        {pen ? (
                          <>
                            <button
                              className="btn ghost flex-1 text-xs font-bold uppercase"
                              onClick={() => {
                                setSelectedBib(r.bib);
                                setPenHours(String(pen.hours));
                                setPenMinutes(String(pen.minutes));
                                setPenSeconds(String(pen.seconds));
                              }}
                            >
                              Edit Penalty
                            </button>
                            <button
                              className="btn ghost flex-1 text-xs font-bold uppercase"
                              style={{ color: '#dc2626' }}
                              onClick={() => removePenalty(pen.id)}
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn ghost w-full text-xs font-bold uppercase"
                            onClick={() => {
                              setSelectedBib(r.bib);
                              setPenHours("0");
                              setPenMinutes("0");
                              setPenSeconds("0");
                            }}
                          >
                            + Add Penalty
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-auto">
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="font-medium">{filtered.length}</span> runners
            </div>
            <div className="flex gap-1">
              <button
                className="btn ghost sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  p = currentPage - 3 + i + 1;
                  if (p > totalPages) p = totalPages - (4 - i);
                }
                return p;
              }).map(page => (
                <button
                  key={page}
                  className={`btn sm w-8 h-8 p-0 flex items-center justify-center ${currentPage === page ? '' : 'ghost'}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="btn ghost sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded text-orange-800 text-xs font-medium">
          <strong>Summary:</strong> {penalties.length} penalty diterapkan dari {masterRows.length} peserta.
          {penalties.length > 0 && (
            <span className="ml-2">
              Total penalty time:{" "}
              {(() => {
                const totalMs = penalties.reduce((sum, p) => sum + p.penaltyMs, 0);
                const totalSec = Math.floor(totalMs / 1000);
                const h = Math.floor(totalSec / 3600);
                const m = Math.floor((totalSec % 3600) / 60);
                const s = totalSec % 60;
                return formatPenaltyTime(h, m, s);
              })()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
