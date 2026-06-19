import { useEffect, useState, useCallback } from 'react';
import { useEvent } from '../../../contexts/EventContext';
import { LS_DATA_VERSION } from '../../../lib/config';
import { listCsvMeta } from '../../../lib/idb';
import type { CsvKind } from '../../../lib/config';
import DataPage from '../pages/DataPage';

export default function DataPageWrapper() {
  const { events, loading: eventLoading } = useEvent();
  const [csvMeta, setCsvMeta] = useState<Array<{ key: CsvKind; filename: string; updatedAt: number; rows: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string>('default');

  const loadCsvMeta = useCallback(async (eventId: string) => {
    setLoading(true);
    try {
      const meta = await listCsvMeta(eventId);
      console.log('[DataPageWrapper] Loaded CSV meta for eventId:', eventId, meta);
      setCsvMeta(meta as any);
    } catch (error) {
      console.error('[DataPageWrapper] Failed to load CSV metadata:', error);
      setCsvMeta([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load CSV meta when selectedEventId changes or when event loading completes
  useEffect(() => {
    if (eventLoading) {
      return;
    }
    loadCsvMeta(selectedEventId);
  }, [selectedEventId, eventLoading, loadCsvMeta]);

  const handleCsvChange = useCallback(async () => {
    await loadCsvMeta(selectedEventId);
  }, [loadCsvMeta, selectedEventId]);

  const handleDataVersionBump = () => {
    localStorage.setItem(LS_DATA_VERSION, String(Date.now()));
  };

  const handleConfigChanged = () => {
    localStorage.setItem(LS_DATA_VERSION, String(Date.now()));
    // Don't reload, just refresh data
    loadCsvMeta(selectedEventId);
  };

  if (eventLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      {/* Event Selector */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="header-row">
          <div>
            <h2 className="section-title">Select Event for CSV Data</h2>
            <div className="subtle">
              Pilih event untuk upload/lihat data CSV. "Default (Global)" untuk data yang berlaku di semua event.
            </div>
          </div>
          <div>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer hover:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
              style={{ minWidth: 250 }}
            >
              <option value="default">Default (Global)</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading CSV metadata...</div>
      ) : (
        <DataPage
          csvMeta={csvMeta}
          eventId={selectedEventId}
          onCsvChange={handleCsvChange}
          onDataVersionBump={handleDataVersionBump}
          onConfigChanged={handleConfigChanged}
        />
      )}
    </div>
  );
}
