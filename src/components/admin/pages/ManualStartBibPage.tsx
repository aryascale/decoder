import { useMemo, useState, useEffect, useCallback } from "react";
import { loadMasterParticipants, loadTimesMap } from "../../../lib/data";
import { extractTimeOfDay } from "../../../lib/time";
import type { LeaderRow } from "../../LeaderboardTable";

interface ManualStartBibPageProps {
  allRows: LeaderRow[];
  onDataVersionBump: () => void;
  eventId: string;
  globalManualStartTime?: string;
}

interface ManualStartRecord {
  id: string;
  bib: string;
  epc: string;
  timeStr: string; // "HH:MM:SS"
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

export default function ManualStartBibPage({ allRows, onDataVersionBump, eventId, globalManualStartTime }: ManualStartBibPageProps) {
  const [q, setQ] = useState("");
  const [manualStarts, setManualStarts] = useState<ManualStartRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [masterRows, setMasterRows] = useState<MasterRow[]>([]);

  // Input state
  const [selectedBib, setSelectedBib] = useState<string | null>(null);
  const [timeStr, setTimeStr] = useState("06:00:00");
  const [saving, setSaving] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const msByBib = useMemo(() => {
    const map = new Map<string, ManualStartRecord>();
    manualStarts.forEach(m => map.set(m.bib, m));
    return map;
  }, [manualStarts]);

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

  const loadManualStarts = useCallback(async () => {
    try {
      const res = await fetch(`/api/manual-start-bib?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setManualStarts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to load manual starts:", error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadMasterData();
    loadManualStarts();
  }, [loadMasterData, loadManualStarts]);

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

  const applyManualStart = async (row: MasterRow) => {
    if (!timeStr) {
      alert("Masukkan waktu (HH:MM:SS).");
      return;
    }
    
    // Normalize format HH:MM to HH:MM:00 if seconds are missing
    let finalTime = timeStr;
    if (finalTime.split(':').length === 2) {
      finalTime += ":00";
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/manual-start-bib?eventId=${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bib: row.bib,
          epc: row.epc,
          timeStr: finalTime,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan Manual Start per-BIB");
      }

      await loadManualStarts();
      onDataVersionBump();
      setSelectedBib(null);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const assignCurrentBrowserTime = async (row: MasterRow) => {
    const d = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, "0");
    const DD = pad(d.getDate());
    const MM = pad(d.getMonth() + 1);
    const YYYY = d.getFullYear();
    const HH = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    const SSS = pad(d.getMilliseconds(), 3);
    
    // DD:MM:YYYY HH:MM:SS:SSS
    const finalTime = `${DD}:${MM}:${YYYY} ${HH}:${mm}:${ss}:${SSS}`;

    setSaving(true);
    try {
      const res = await fetch(`/api/manual-start-bib?eventId=${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bib: row.bib,
          epc: row.epc,
          timeStr: finalTime,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan Manual Start per-BIB");
      }

      await loadManualStarts();
      onDataVersionBump();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const removeManualStart = async (id: string) => {
    if (!confirm("Hapus Manual Start ini? Waktu pelari akan kembali pakai global / kategori.")) return;

    try {
      const res = await fetch(`/api/manual-start-bib?eventId=${eventId}&id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Gagal menghapus manual start");

      await loadManualStarts();
      onDataVersionBump();
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8">Loading per-BIB data...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col mt-6">
      <div className="card flex-1 flex flex-col mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="section-title">Individual Manual Start (Per BIB)</h2>
            <div className="subtle text-sm">
              Override waktu start khusus untuk masing-masing BIB. Format HH:MM:SS.
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
                  <th className="col-cat">CATEGORY</th>
                  <th style={{ width: 140 }}>FINISH TIME</th>
                  <th style={{ width: 140 }}>MANUAL START</th>
                  <th style={{ width: 180 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty py-20">
                      Tidak ada peserta ditemukan.
                    </td>
                  </tr>
                ) : (
                  currentRows.map((r) => {
                    const msRecord = msByBib.get(r.bib);
                    const isEditing = selectedBib === r.bib;

                    return (
                      <tr key={r.epc} className="row-hover">
                        <td className="mono text-xs font-bold">{r.bib}</td>
                        <td className="name-cell text-sm">{r.name}</td>
                        <td className="text-xs">{r.category}</td>
                        <td className="mono text-xs">{r.finishTimeRaw || "-"}</td>
                        <td>
                          {msRecord ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-black uppercase bg-blue-100 text-blue-800">
                              {msRecord.timeStr}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-gray-100 text-gray-500">
                              {globalManualStartTime ? `Global: ${extractTimeOfDay(globalManualStartTime)}` : "(Global/Cat)"}
                            </span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="time"
                                step="1"
                                className="search w-28 text-center text-xs py-1 px-1"
                                value={timeStr}
                                onChange={(e) => setTimeStr(e.target.value)}
                              />
                              <button
                                className="btn sm"
                                disabled={saving}
                                onClick={() => applyManualStart(r)}
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
                              {msRecord ? (
                                <>
                                  <button
                                    className="btn ghost sm"
                                    onClick={() => {
                                      setSelectedBib(r.bib);
                                      setTimeStr(msRecord.timeStr);
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="btn ghost sm text-red-600"
                                    onClick={() => removeManualStart(msRecord.id)}
                                  >
                                    Remove
                                  </button>
                                </>
                              ) : (
                                <button
                                  className="btn ghost sm text-blue-600 border border-blue-200"
                                  disabled={saving}
                                  onClick={() => assignCurrentBrowserTime(r)}
                                >
                                  + Assign Start
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
            {currentRows.map((r) => {
              const msRecord = msByBib.get(r.bib);
              const isEditing = selectedBib === r.bib;

              return (
                <div key={r.epc} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">{r.name}</div>
                      <div className="text-sm text-gray-500">
                        <span className="mono font-bold">BIB: {r.bib}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 mono">Finish: {r.finishTimeRaw || "-"}</div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-[11px] font-black uppercase ${
                        msRecord
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {msRecord ? msRecord.timeStr : (globalManualStartTime ? `Global: ${extractTimeOfDay(globalManualStartTime)}` : "(Global)")}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1 justify-center">
                         <input
                           type="time"
                           step="1"
                           className="search flex-1 text-center text-sm py-1.5"
                           value={timeStr}
                           onChange={(e) => setTimeStr(e.target.value)}
                         />
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="btn flex-1 text-xs font-bold"
                          disabled={saving}
                          onClick={() => applyManualStart(r)}
                        >
                          {saving ? "Saving..." : "Apply Start Time"}
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
                      {msRecord ? (
                        <>
                          <button
                            className="btn ghost flex-1 text-xs font-bold uppercase"
                            onClick={() => {
                              setSelectedBib(r.bib);
                              setTimeStr(msRecord.timeStr);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn ghost flex-1 text-xs font-bold uppercase text-red-600"
                            onClick={() => removeManualStart(msRecord.id)}
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn ghost w-full text-xs font-bold uppercase text-blue-600 border border-blue-200"
                          disabled={saving}
                          onClick={() => assignCurrentBrowserTime(r)}
                        >
                          + Assign Start Time
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
      </div>
    </div>
  );
}
