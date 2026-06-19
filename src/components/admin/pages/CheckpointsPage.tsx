import { useState, useEffect } from "react";

interface CheckpointsPageProps {
  eventId: string;
}

interface Checkpoint {
  id?: string;
  name: string;
  identitas: string;
  order: number;
}

export default function CheckpointsPage({ eventId }: CheckpointsPageProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCheckpoints();
  }, [eventId]);

  const loadCheckpoints = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/checkpoints?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setCheckpoints(data.checkpoints || []);
      }
    } catch (error) {
      console.error("Failed to load checkpoints", error);
    } finally {
      setLoading(false);
    }
  };

  const addCheckpoint = () => {
    setCheckpoints([
      ...checkpoints,
      { name: `Checkpoint ${checkpoints.length + 1}`, identitas: `CP${checkpoints.length + 1}`, order: checkpoints.length }
    ]);
  };

  const updateCheckpoint = (index: number, field: keyof Checkpoint, value: string | number) => {
    const updated = [...checkpoints];
    updated[index] = { ...updated[index], [field]: value };
    setCheckpoints(updated);
  };

  const removeCheckpoint = (index: number) => {
    if (!confirm("Are you sure you want to remove this checkpoint?")) return;
    const updated = checkpoints.filter((_, i) => i !== index);
    setCheckpoints(updated);
  };

  const moveCheckpoint = (index: number, dir: -1 | 1) => {
    if (index + dir < 0 || index + dir >= checkpoints.length) return;
    const updated = [...checkpoints];
    const temp = updated[index];
    updated[index] = updated[index + dir];
    updated[index + dir] = temp;
    
    // Update order values
    updated.forEach((cp, i) => {
      cp.order = i;
    });
    
    setCheckpoints(updated);
  };

  const saveCheckpoints = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/checkpoints?eventId=${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpoints })
      });
      if (res.ok) {
        const data = await res.json();
        setCheckpoints(data.checkpoints || []);
        alert("Checkpoints saved successfully!");
      } else {
        alert("Failed to save checkpoints");
      }
    } catch (error) {
      alert("Failed to save checkpoints");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading checkpoints...</div>;

  return (
    <div className="card">
      <div className="header-row mb-4">
        <div>
          <h2 className="section-title">Checkpoints Management</h2>
          <div className="subtle text-sm">
            Configure the timing points for your event. Hardware sensors will send "identitas" (e.g. CP1) which maps to the Checkpoint Name.
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-blue-900 mb-1">How it works</h3>
        <p className="text-sm text-blue-800">
          The hardware device at each checkpoint will send an ID string (e.g. <strong>CP1</strong>). 
          Enter that ID in the <strong>Device Identitas</strong> field so the system can match it to the correct Checkpoint Name (e.g. <strong>Water Station 1</strong>) on the Leaderboard. Order matters!
        </p>
      </div>

      {checkpoints.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg mb-4">
          No checkpoints configured.
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {checkpoints.map((cp, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-3 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="flex gap-1 w-full sm:w-auto">
                <button 
                  className="p-2 bg-white border border-gray-300 rounded text-gray-600 disabled:opacity-30"
                  onClick={() => moveCheckpoint(index, -1)}
                  disabled={index === 0}
                  title="Move Up"
                >
                  ↑
                </button>
                <button 
                  className="p-2 bg-white border border-gray-300 rounded text-gray-600 disabled:opacity-30"
                  onClick={() => moveCheckpoint(index, 1)}
                  disabled={index === checkpoints.length - 1}
                  title="Move Down"
                >
                  ↓
                </button>
              </div>

              <div className="w-full sm:w-1/3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Device Identitas (From Hardware)</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="e.g. CP1"
                  value={cp.identitas}
                  onChange={(e) => updateCheckpoint(index, 'identitas', e.target.value)}
                />
              </div>

              <div className="w-full sm:w-1/2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Display Name (On Leaderboard)</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="e.g. Water Station 1"
                  value={cp.name}
                  onChange={(e) => updateCheckpoint(index, 'name', e.target.value)}
                />
              </div>

              <div className="w-full sm:w-auto flex justify-end mt-4 sm:mt-0">
                <button 
                  className="btn ghost text-red-600 w-full sm:w-auto"
                  onClick={() => removeCheckpoint(index)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-between border-t border-gray-100 pt-4">
        <button className="btn ghost border border-gray-200" onClick={addCheckpoint}>
          + Add Checkpoint
        </button>
        <button className="btn primary" onClick={saveCheckpoints} disabled={saving}>
          {saving ? 'Saving...' : 'Save Checkpoints'}
        </button>
      </div>
    </div>
  );
}
