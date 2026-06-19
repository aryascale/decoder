import { useState, useEffect, useCallback } from "react";

interface TimingPageProps {
  categories: string[];
  eventId: string | null;
  onConfigChanged: () => void;
  onDataVersionBump: () => void;
}

function formatNowAsTimestamp(): string {
  const d = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const Y = d.getFullYear();
  const M = pad(d.getMonth() + 1);
  const D = pad(d.getDate());
  const h = pad(d.getHours());
  const m = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  const ms = pad(d.getMilliseconds(), 3);
  return `${Y}-${M}-${D} ${h}:${m}:${s}.${ms}`;
}

export default function TimingPage({
  categories,
  eventId,
  onConfigChanged,
  onDataVersionBump
}: TimingPageProps) {
  const [cutoffHours, setCutoffHours] = useState("");
  const [catStart, setCatStart] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load timing data from API when eventId changes
  const loadTimingData = useCallback(async () => {
    if (!eventId) {
      setCutoffHours("");
      setCatStart({});
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/timing?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        // Convert cutoffMs to hours for display
        if (data.cutoffMs != null) {
          setCutoffHours(String(data.cutoffMs / 3600000));
        } else {
          setCutoffHours("");
        }
        // Load category start times
        if (data.categoryStartTimes) {
          setCatStart(data.categoryStartTimes);
        } else {
          setCatStart({});
        }
      }
    } catch (error) {
      console.error("Failed to load timing data:", error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadTimingData();
  }, [loadTimingData]);

  // Update catStart when categories change (ensure all categories have entries)
  useEffect(() => {
    setCatStart(prev => {
      const newMap: Record<string, string> = {};
      categories.forEach(cat => {
        newMap[cat] = prev[cat] || '';
      });
      return newMap;
    });
  }, [categories]);

  const applyCutoff = async () => {
    if (!eventId) {
      alert("Please select an event first");
      return;
    }

    setSaving(true);
    try {
      const h = Number(cutoffHours);
      let cutoffMs: number | null = null;
      if (Number.isFinite(h) && h > 0) {
        cutoffMs = h * 3600000;
      }

      const res = await fetch(`/api/timing?eventId=${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cutoffMs, categoryStartTimes: catStart }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save");
      }

      onDataVersionBump();
      onConfigChanged();
      alert("Cut off time berhasil diperbarui");
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const applyCatStart = async () => {
    if (!eventId) {
      alert("Please select an event first");
      return;
    }

    setSaving(true);
    try {
      const h = Number(cutoffHours);
      let cutoffMs: number | null = null;
      if (Number.isFinite(h) && h > 0) {
        cutoffMs = h * 3600000;
      }

      const res = await fetch(`/api/timing?eventId=${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cutoffMs, categoryStartTimes: catStart }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save");
      }

      onDataVersionBump();
      onConfigChanged();
      alert(
        "Waktu start kategori berhasil diperbarui.\nTotal time akan menggunakan nilai ini per kategori."
      );
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!eventId) {
    return (
      <div className="card">
        <div className="text-center py-8 text-gray-500">
          Please select an event from the dropdown above to configure timing rules.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8">Loading timing configuration...</div>
      </div>
    );
  }

  return (
    <>
      {/* Cut Off Time */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="section-title">Cut Off Settings</h2>
            <div className="subtle text-sm">
              Cut off time dihitung dari start masing-masing pelari / kategori.
            </div>
          </div>
          <button className="btn w-full sm:w-auto" onClick={applyCutoff} disabled={saving}>
            {saving ? "Saving..." : "Save Cut Off"}
          </button>
        </div>

        <div className="admin-cutoff">
          <div className="label">Cut Off Duration (hours)</div>
          <div className="tools">
            <input
              className="search w-full"
              placeholder="e.g. 3.5"
              value={cutoffHours}
              onChange={(e) => setCutoffHours(e.target.value)}
            />
          </div>
          <div className="subtle text-sm mt-2">Jika kosong / 0 → cut off nonaktif.</div>
        </div>
      </div>

      {/* Category Start Time Overrides */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="section-title">Category Start Times</h2>
            <div className="subtle text-sm">
              Set start time per kategori. Jika diisi, sistem akan menghitung{" "}
              <b>total time = finish time - start time kategori</b>.
            </div>
          </div>
          <button className="btn w-full sm:w-auto" onClick={applyCatStart} disabled={saving}>
            {saving ? "Saving..." : "Save Start Times"}
          </button>
        </div>

        {/* Desktop Table - hidden on mobile */}
        <div className="hidden md:block table-wrap">
          <table className="f1-table compact">
            <thead>
              <tr>
                <th>Category</th>
                <th>Start Time (datetime)</th>
                <th style={{ width: 200 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="empty">No categories defined yet.</td>
                </tr>
              ) : (
                categories.map((catKey) => (
                  <tr key={catKey} className="row-hover">
                    <td className="name-cell">{catKey}</td>
                    <td>
                      <input
                        className="search"
                        style={{ width: "100%" }}
                        placeholder="contoh: 2025-11-23 07:00:00.000"
                        value={catStart[catKey] || ""}
                        onChange={(e) =>
                          setCatStart((prev) => ({
                            ...prev,
                            [catKey]: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          className="btn ghost"
                          onClick={() =>
                            setCatStart((prev) => ({
                              ...prev,
                              [catKey]: formatNowAsTimestamp(),
                            }))
                          }
                        >
                          Set Now
                        </button>
                        <button
                          className="btn ghost"
                          onClick={() =>
                            setCatStart((prev) => ({
                              ...prev,
                              [catKey]: "",
                            }))
                          }
                        >
                          Clear
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards - visible only on mobile */}
        <div className="md:hidden space-y-3">
          {categories.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No categories defined yet.</div>
          ) : (
            categories.map((catKey) => (
              <div key={catKey} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                <div className="font-medium text-gray-900 mb-2">{catKey}</div>
                <input
                  className="search w-full mb-2 text-sm"
                  placeholder="2025-11-23 07:00:00.000"
                  value={catStart[catKey] || ""}
                  onChange={(e) =>
                    setCatStart((prev) => ({
                      ...prev,
                      [catKey]: e.target.value,
                    }))
                  }
                />
                <div className="flex gap-2">
                  <button
                    className="btn ghost flex-1 text-sm"
                    onClick={() =>
                      setCatStart((prev) => ({
                        ...prev,
                        [catKey]: formatNowAsTimestamp(),
                      }))
                    }
                  >
                    Set Now
                  </button>
                  <button
                    className="btn ghost flex-1 text-sm"
                    onClick={() =>
                      setCatStart((prev) => ({
                        ...prev,
                        [catKey]: "",
                      }))
                    }
                  >
                    Clear
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="subtle text-sm mt-4">
          Gunakan format tanggal &amp; jam yang sama dengan di CSV timing
          (misal: <code>2025-11-23 07:00:00.000</code>). Kamu juga bisa klik <b>Set Now</b>
          untuk mengisi otomatis berdasarkan jam saat ini.
        </div>
      </div>
    </>
  );
}
