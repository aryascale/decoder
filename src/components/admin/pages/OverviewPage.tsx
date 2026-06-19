import { useState, useEffect } from 'react';
import { useEvent } from '../../../contexts/EventContext';
import { DEFAULT_EVENT_TITLE, LS_EVENT_TITLE, LS_DATA_VERSION } from '../../../lib/config';

interface OverviewPageProps {
  allRows: any[];
  eventId?: string;
  onConfigChanged: () => void;
}

export default function OverviewPage({ eventId, onConfigChanged }: OverviewPageProps) {
  const { events } = useEvent();
  const [eventTitle, setEventTitle] = useState<string>(() =>
    localStorage.getItem(LS_EVENT_TITLE) || DEFAULT_EVENT_TITLE
  );
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    // Load admin overview data
    const loadOverviewData = async () => {
      try {
        const url = eventId && eventId !== 'default' ? `/api/admin-overview?eventId=${eventId}` : '/api/admin-overview';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setDashboardData(data);
        }
      } catch (error) {
        console.error('Failed to load overview data', error);
      }
    };
    loadOverviewData();
  }, [eventId]);

  const bumpDataVersion = () => {
    localStorage.setItem(LS_DATA_VERSION, String(Date.now()));
  };

  const saveEventTitle = async () => {
    const t = (eventTitle || "").trim();
    localStorage.setItem(LS_EVENT_TITLE, t || DEFAULT_EVENT_TITLE);
    bumpDataVersion();
    onConfigChanged();
    alert("Judul event berhasil diperbarui");
  };

  return (
    <>
      {/* Stats Cards */}
      <div className="card mb-6 bg-white shadow-sm border-0">
        <div className="header-row">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Dashboard Overview</h2>
            <div className="text-sm text-gray-500">Ringkasan transaksi dan pendaftaran event.</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Revenue</div>
            <div className="text-2xl font-black text-gray-900">Rp {(dashboardData?.totalRevenue || 0).toLocaleString('id-ID')}</div>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Peserta (Paid)</div>
            <div className="text-2xl font-black text-gray-900">{dashboardData?.totalParticipants || 0}</div>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Pending</div>
            <div className="text-2xl font-black text-gray-900">{dashboardData?.paymentStatus?.pending || 0}</div>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Events</div>
            <div className="text-2xl font-black text-gray-900">{dashboardData?.totalEvents || events.length}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 card bg-white shadow-sm border-0">
          <div className="header-row mb-4">
            <h3 className="text-lg font-bold text-gray-900">Recent Registrations</h3>
          </div>
          {/* Desktop Table - hidden on mobile */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-3 font-semibold text-gray-600">Nama</th>
                  <th className="py-3 font-semibold text-gray-600">Event & Kategori</th>
                  <th className="py-3 font-semibold text-gray-600">Status</th>
                  <th className="py-3 font-semibold text-gray-600">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {(dashboardData?.recentRegistrations || []).map((reg: any) => (
                  <tr key={reg.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3">
                      <div className="font-medium text-gray-900">{reg.name}</div>
                      <div className="text-xs text-gray-500">{reg.email}</div>
                    </td>
                    <td className="py-3 text-gray-700">
                      <div className="font-medium">{reg.eventName}</div>
                      <div className="text-xs text-gray-500">{reg.categoryName}</div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${
                        reg.paymentStatus === 'settlement' ? 'bg-gray-900 text-white' :
                        reg.paymentStatus === 'pending' ? 'bg-gray-200 text-gray-700' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {reg.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-gray-500">
                      {new Date(reg.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
                {!dashboardData?.recentRegistrations?.length && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">Belum ada pendaftaran terbaru</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards - visible only on mobile */}
          <div className="md:hidden space-y-3">
            {!dashboardData?.recentRegistrations?.length ? (
              <div className="py-6 text-center text-gray-500 text-sm">Belum ada pendaftaran terbaru</div>
            ) : (
              (dashboardData?.recentRegistrations || []).map((reg: any) => (
                <div key={reg.id} className="bg-white border border-gray-100 p-3 rounded-lg shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{reg.name}</div>
                      <div className="text-xs text-gray-500">{reg.email}</div>
                    </div>
                    <span className={`px-2 py-1 text-[9px] font-bold uppercase rounded-full whitespace-nowrap ${
                      reg.paymentStatus === 'settlement' ? 'bg-gray-900 text-white' :
                      reg.paymentStatus === 'pending' ? 'bg-gray-200 text-gray-700' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {reg.paymentStatus}
                    </span>
                  </div>
                  <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded mb-2">
                    <div className="font-medium">{reg.eventName}</div>
                    <div className="text-gray-500">{reg.categoryName}</div>
                  </div>
                  <div className="text-[10px] text-gray-400 text-right">
                    {new Date(reg.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card bg-white shadow-sm border-0">
          <div className="header-row mb-4">
            <h3 className="text-lg font-bold text-gray-900">Status Pembayaran</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Settlement (Lunas)', count: dashboardData?.paymentStatus?.settlement || 0, color: 'bg-gray-900' },
              { label: 'Pending (Belum Bayar)', count: dashboardData?.paymentStatus?.pending || 0, color: 'bg-gray-400' },
              { label: 'Expire / Cancel', count: (dashboardData?.paymentStatus?.expire || 0) + (dashboardData?.paymentStatus?.cancel || 0), color: 'bg-gray-200' },
            ].map(stat => {
              const total = Object.values(dashboardData?.paymentStatus || {}).reduce((a: any, b: any) => a + b, 0) as number;
              const percent = total > 0 ? Math.round((stat.count / total) * 100) : 0;
              return (
                <div key={stat.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{stat.label}</span>
                    <span className="font-bold text-gray-900">{stat.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`${stat.color} h-2 rounded-full`} style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Event Title Settings */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="section-title">Event Settings</h2>
            <div className="subtle">Ubah judul event yang tampil di halaman leaderboard.</div>
          </div>
          <button className="btn w-full sm:w-auto" onClick={saveEventTitle}>
            Save Title
          </button>
        </div>

        <div className="admin-cutoff">
          <div className="label">Event Title</div>
          <div className="tools">
            <input
              className="search"
              style={{ width: "100%" }}
              placeholder={DEFAULT_EVENT_TITLE}
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
