import React, { useState } from "react";
import { Download, Search, Edit3, Trash2, ArrowUpDown, Filter, Save, X, PlusCircle } from "lucide-react";
import { TimeRecord } from "./types";

interface ResultsListProps {
  records: TimeRecord[];
  onUpdateRecord: (id: string, newBib: string, notes: string) => void;
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
  onExport: () => void;
  onAddCustomRecord: () => void;
}

export default function ResultsList({
  records,
  onUpdateRecord,
  onDeleteRecord,
  onClearAll,
  onExport,
  onAddCustomRecord,
}: ResultsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortAsc, setSortAsc] = useState(false); // Default false = latest at the top
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBib, setEditBib] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const handleStartEdit = (rec: TimeRecord) => {
    setEditingId(rec.id);
    setEditBib(rec.bib);
    setEditNotes(rec.notes || "");
  };

  const handleSaveEdit = (id: string) => {
    onUpdateRecord(id, editBib.trim(), editNotes.trim());
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Filter records based on search term
  const filteredRecords = records.filter((rec, index) => {
    const rank = String(index + 1);
    const s = searchTerm.toLowerCase();
    return (
      rec.bib.toLowerCase().includes(s) ||
      rec.name.toLowerCase().includes(s) ||
      (rec.notes || "").toLowerCase().includes(s) ||
      rec.formattedTime.toLowerCase().includes(s) ||
      rank === s
    );
  });

  // Sort: default is desc (latest/most recent at the top), true is asc (rank order)
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    // If sorting by chronological finish rank order (earliest first):
    // records index is already chronological. Let's sort by timestamp.
    if (sortAsc) {
      return a.timestamp - b.timestamp;
    } else {
      return b.timestamp - a.timestamp;
    }
  });

  return (
    <div id="results_list_container" className="bg-[#0D0D0D] border border-[#222] rounded-none p-6 shadow-none flex flex-col gap-5 flex-grow">
      {/* Header and key general actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] font-bold text-white">Recorded Finishes</h2>
          <p className="text-xs text-[#666] font-mono mt-0.5">
            Total Logs: {records.length} {records.length > 0 && `| Showing ${filteredRecords.length}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="add_manual_record_btn"
            onClick={onAddCustomRecord}
            className="text-[10px] font-mono uppercase tracking-wider text-white bg-[#1A1A1A] border border-[#333] hover:bg-[#2A2A2A] hover:border-[#FFD700] rounded-none px-3 py-2 flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Adds a placeholder record starting at current clock time"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#FFD700]" />
            Add Manual Log
          </button>

          {records.length > 0 && (
            <>
              <button
                id="export_results_csv_btn"
                onClick={onExport}
                className="text-[10px] font-bold uppercase tracking-wider text-black bg-[#FFD700] hover:bg-white rounded-none px-3.5 py-2 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>

              <button
                id="clear_all_records_btn"
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete all recorded race results? This cannot be undone.")) {
                    onClearAll();
                  }
                }}
                className="text-[10px] font-mono uppercase tracking-wider text-rose-500 bg-transparent border border-rose-950/40 hover:bg-rose-950/10 hover:text-rose-450 rounded-none px-3 py-2 cursor-pointer transition-colors"
              >
                Reset Finishes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Live search bar & Sort switch */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#FFD700]/70" />
          <input
            id="results_search_input"
            type="text"
            placeholder="Search by BIB, runner name, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-mono pl-9 pr-4 py-2 border border-[#333] focus:border-[#FFD700] rounded-none bg-[#111] text-[#E0E0E0] placeholder-[#555] focus:outline-none"
          />
        </div>

        <button
          id="toggle_sort_direction_btn"
          onClick={() => setSortAsc(!sortAsc)}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-[#333] hover:border-[#FFD700] rounded-none bg-[#111] text-[#E0E0E0] text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-[#666]" />
          {sortAsc ? "Oldest First (Rank 1-n)" : "Latest First (Most Recent)"}
        </button>
      </div>

      {/* Results grid list */}
      <div id="results-table-scroller" className="border border-[#222] rounded-none overflow-hidden overflow-x-auto bg-[#0F0F0F]">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-[#111] border-b border-[#222] text-[#666] text-[10px] font-semibold font-mono uppercase tracking-[0.2em]">
              <th className="py-3 px-4 w-16 text-center">Rank</th>
              <th className="py-3 px-4 w-24">BIB</th>
              <th className="py-3 px-4">Runner Profile</th>
              <th className="py-3 px-4 w-36">Finish Time (ms)</th>
              <th className="py-3 px-4">Notes</th>
              <th className="py-3 px-4 w-28 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A] text-[#CCC]">
            {sortedRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#666] text-xs font-mono">
                  {records.length === 0 ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <p className="uppercase tracking-widest text-[#888]">No Finishes Logged</p>
                      <p className="text-[10px] text-[#555] font-normal">
                        Use the keypad or active BIB input console to record runner times.
                      </p>
                    </div>
                  ) : (
                    "No logged finishes match your search."
                  )}
                </td>
              </tr>
            ) : (
              sortedRecords.map((rec) => {
                const originalRank = records.findIndex(r => r.id === rec.id) + 1;
                const isEditing = editingId === rec.id;

                return (
                  <tr
                    id={`result-row-${rec.id}`}
                    key={rec.id}
                    className="hover:bg-[#151515] even:bg-[#0D0D0D] transition-colors group text-xs font-mono"
                  >
                    {/* Rank */}
                    <td className="py-3 px-4 font-mono font-bold text-center">
                      <span className={originalRank === 1 ? "text-[#FFD700]" : "text-[#888]"}>
                        {String(originalRank).padStart(3, "0")}
                      </span>
                    </td>

                    {/* BIB Column */}
                    <td className="py-3 px-4 font-mono font-bold">
                      {isEditing ? (
                        <input
                          id={`edit-bib-input-${rec.id}`}
                          type="text"
                          value={editBib}
                          onChange={(e) => setEditBib(e.target.value)}
                          className="w-full p-1 bg-black border border-[#FFD700] rounded-none font-bold text-white focus:outline-none"
                        />
                      ) : (
                        <span className="text-sm text-white font-bold tracking-tight">
                          {rec.bib}
                        </span>
                      )}
                    </td>

                    {/* Name/Profile Column */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{rec.name}</div>
                      <div className="text-[10px] text-[#555] font-mono mt-0.5">
                        WALL CLOCK: {rec.timeOfDay}
                      </div>
                    </td>

                    {/* Timestamp / Elapsed */}
                    <td className="py-3 px-4 font-mono font-bold text-[#FFD700] tracking-wider">
                      {rec.formattedTime}
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <input
                          id={`edit-notes-input-${rec.id}`}
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Add comment..."
                          className="w-full text-xs p-1 bg-black border border-[#333] text-white rounded-none focus:outline-none focus:border-[#FFD700]"
                        />
                      ) : (
                        <span className="text-xs text-[#888] break-words line-clamp-1">
                          {rec.notes || "—"}
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            id={`save-edit-btn-${rec.id}`}
                            onClick={() => handleSaveEdit(rec.id)}
                            className="p-1 px-2 border border-[#FFD700] bg-black text-[#FFD700] text-[10px] uppercase font-bold tracking-wider rounded-none cursor-pointer transition-colors"
                            title="Save changes"
                          >
                            Save
                          </button>
                          <button
                            id={`cancel-edit-btn-${rec.id}`}
                            onClick={handleCancelEdit}
                            className="p-1 px-2 border border-[#333] bg-black text-[#888] hover:text-white text-[10px] uppercase rounded-none cursor-pointer transition-colors"
                            title="Cancel"
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            id={`start-edit-btn-${rec.id}`}
                            onClick={() => handleStartEdit(rec)}
                            className="p-1 px-2 border border-[#333] hover:border-[#FFD700] text-[#888] hover:text-white rounded-none font-mono text-[10px] uppercase tracking-tighter cursor-pointer transition"
                            title="Edit"
                          >
                            Edit
                          </button>
                          <button
                            id={`delete-record-btn-${rec.id}`}
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete Rank #${originalRank} (BIB ${rec.bib})?`)) {
                                onDeleteRecord(rec.id);
                              }
                            }}
                            className="p-1 px-2 border border-transparent hover:border-rose-900 text-rose-500 hover:text-rose-400 rounded-none font-mono text-[10px] uppercase tracking-tighter cursor-pointer transition"
                            title="Delete"
                          >
                            Del
                          </button>
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
    </div>
  );
}
