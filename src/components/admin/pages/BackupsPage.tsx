import { useState, useEffect } from 'react';
import { Modal } from 'antd';

interface Backup {
  name: string;
  size: number;
  createdAt: string;
  trigger: string;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => { loadBackups(); }, []);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-backups');
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createBackup = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/admin-backups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (res.ok) {
        alert('Backup berhasil dibuat!');
        loadBackups();
      } else {
        alert('Gagal membuat backup');
      }
    } catch (e) { alert('Error: ' + e); }
    finally { setCreating(false); }
  };

  const restoreBackup = async (filename: string) => {
    if (!confirm(`Restore data dari backup "${filename}"?\n\nData yang sudah ada TIDAK akan ditimpa.\nHanya data yang hilang yang akan dikembalikan.`)) return;
    setRestoring(filename);
    try {
      const res = await fetch('/api/admin-backups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'restore', file: filename }) });
      const data = await res.json();
      if (res.ok) {
        alert(`Restore selesai!\n\n✅ Dikembalikan: ${data.restored}\n⏭️ Dilewati (sudah ada): ${data.skipped}`);
      } else {
        alert('Gagal: ' + (data.error || 'Unknown error'));
      }
    } catch (e) { alert('Error: ' + e); }
    finally { setRestoring(''); }
  };

  const previewBackup = async (filename: string) => {
    try {
      const res = await fetch(`/api/admin-backups?file=${encodeURIComponent(filename)}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data);
        setPreviewOpen(true);
      }
    } catch (e) { alert('Error: ' + e); }
  };

  const triggerLabel = (t: string) => {
    const map: Record<string, { label: string; color: string }> = {
      payment: { label: '💳 Payment', color: 'bg-green-100 text-green-800' },
      manual_settle: { label: '✅ Settle', color: 'bg-blue-100 text-blue-800' },
      category_update: { label: '📁 Category', color: 'bg-yellow-100 text-yellow-800' },
      manual: { label: '🔧 Manual', color: 'bg-gray-100 text-gray-800' },
    };
    return map[t] || { label: t, color: 'bg-gray-100 text-gray-800' };
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-col">
      <div className="header-row mb-4 md:mb-6">
        <div>
          <h1 className="text-lg md:text-2xl font-black tracking-tight text-gray-900 uppercase">Backups</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Backup otomatis setiap ada pembayaran berhasil. Restore data yang hilang.</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="card mb-4 !p-3 md:!p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-bold">{backups.length}</span> backup tersimpan
          </div>
          <button
            className="btn whitespace-nowrap text-xs"
            onClick={createBackup}
            disabled={creating}
          >
            {creating ? '⏳ Membuat...' : '➕ Buat Backup Manual'}
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 mb-4">
        <div className="text-xs md:text-sm text-blue-800">
          <strong>Auto-backup aktif:</strong> Sistem otomatis membuat backup saat:
          <ul className="mt-1 ml-4 list-disc">
            <li>Ada pembayaran berhasil (settlement)</li>
            <li>Admin settle manual</li>
            <li>Kategori diupdate</li>
          </ul>
        </div>
      </div>

      {/* Backup List */}
      <div className="card flex-1" style={{ minHeight: 'calc(100vh - 400px)' }}>
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : backups.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Belum ada backup</div>
        ) : (
          <div className="space-y-2">
            {backups.map(b => {
              const tl = triggerLabel(b.trigger);
              return (
                <div key={b.name} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tl.color}`}>{tl.label}</span>
                      <span className="text-[10px] text-gray-400">{formatSize(b.size)}</span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {new Date(b.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-[10px] font-bold uppercase rounded hover:bg-gray-50" onClick={() => previewBackup(b.name)}>
                      👁️ Lihat
                    </button>
                    <button
                      className="px-3 py-1.5 bg-black text-white text-[10px] font-bold uppercase rounded hover:bg-gray-800 disabled:opacity-50"
                      onClick={() => restoreBackup(b.name)}
                      disabled={restoring === b.name}
                    >
                      {restoring === b.name ? '⏳...' : '♻️ Restore'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Modal
        title="Preview Backup"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width="95vw"
        style={{ maxWidth: 700 }}
      >
        {previewData && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 border">
                <div className="text-[10px] uppercase font-black text-gray-400">Registrations</div>
                <div className="text-xl font-black">{previewData.counts?.registrations || 0}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border">
                <div className="text-[10px] uppercase font-black text-gray-400">Categories</div>
                <div className="text-xl font-black">{previewData.counts?.categories || 0}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border">
                <div className="text-[10px] uppercase font-black text-gray-400">Events</div>
                <div className="text-xl font-black">{previewData.counts?.events || 0}</div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">Registrations dalam backup</h3>
              <div className="max-h-[400px] overflow-auto space-y-1">
                {(previewData.registrations || []).slice(0, 50).map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 bg-white rounded border text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold truncate">{r.name}</div>
                      <div className="text-gray-400 text-[10px] truncate">{r.email} • {r.categoryName || r.categoryId}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${r.paymentStatus === 'settlement' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {r.paymentStatus}
                    </span>
                  </div>
                ))}
                {(previewData.registrations || []).length > 50 && (
                  <div className="text-center text-gray-400 text-xs py-2">... dan {previewData.registrations.length - 50} lainnya</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
