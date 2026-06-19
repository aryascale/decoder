import { useState, useEffect } from 'react';
import { Modal, Input } from 'antd';
import { MessageCircle, Mail } from 'lucide-react';
import { useEvent } from '../../../contexts/EventContext';

export default function TicketsPage() {
  const { events } = useEvent();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterEvent, setFilterEvent] = useState<string>('');
  const [searchText, setSearchText] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterStatus) query.append('status', filterStatus);
      if (filterEvent) query.append('eventId', filterEvent);
      
      const res = await fetch(`/api/admin/tickets?${query.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setTickets(data.tickets || []);
      }
    } catch (err) {
      alert('Gagal memuat data tiket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filterStatus, filterEvent]);

  const handleUpdateStatus = async (status: string, notes?: string) => {
    if (!selectedTicket) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/tickets?id=${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolutionNotes: notes, resolvedBy: 'Admin' }),
      });
      if (res.ok) {
        alert('Status tiket berhasil diperbarui');
        setDetailModalOpen(false);
        fetchTickets();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal update status');
      }
    } catch (err) {
      alert('Terjadi kesalahan');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.ticketNumber.toLowerCase().includes(searchText.toLowerCase()) || 
    t.name.toLowerCase().includes(searchText.toLowerCase()) ||
    t.email.toLowerCase().includes(searchText.toLowerCase())
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const currentTickets = filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, filterStatus]);

  const handleWhatsApp = (phone: string) => {
    let formatted = phone.replace(/\D/g, '');
    if (formatted.startsWith('0')) formatted = '62' + formatted.slice(1);
    window.open(`https://wa.me/${formatted}`, '_blank');
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`, '_blank');
  };

  return (
    <div className="flex flex-col">
      <div className="header-row mb-4 md:mb-6">
        <div>
          <h1 className="text-lg md:text-2xl font-black tracking-tight text-gray-900 uppercase flex items-center gap-2">
            Ticketing Kendala
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Kelola laporan kendala dari pendaftar</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="card mb-4 !p-3 md:!p-4">
        <div className="flex flex-col gap-2 md:gap-3">
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
            <input
              className="search flex-1"
              placeholder="Cari Tiket / Nama..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <select
              className="search"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <select
              className="search"
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
            >
              <option value="">Semua Event</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
          <button 
            className="btn ghost whitespace-nowrap w-full sm:w-auto text-xs"
            onClick={fetchTickets}
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="card flex-1 flex flex-col mb-4" style={{ minHeight: 'calc(100vh - 400px)' }}>
        {loading ? (
          <div className="text-center py-24 text-gray-400 font-medium">Loading tickets data...</div>
        ) : (
          <>
            <div className="flex-1 overflow-auto">
              <div className="hidden md:block table-wrap">
                <table className="f1-table compact">
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>No Tiket</th>
                      <th>Pelapor</th>
                      <th>Event</th>
                      <th>Kategori</th>
                      <th>Subjek</th>
                      <th style={{ width: 100 }}>Status</th>
                      <th style={{ width: 120 }}>Tanggal</th>
                      <th style={{ width: 80 }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTickets.length === 0 ? (
                      <tr><td colSpan={8} className="empty py-20">Tidak ada tiket ditemukan</td></tr>
                    ) : (
                      currentTickets.map(t => (
                        <tr key={t.id} className="row-hover">
                          <td className="mono text-[10px] font-bold">{t.ticketNumber}</td>
                          <td>
                            <div className="font-bold text-sm text-gray-900">{t.name}</div>
                            <div className="text-[10px] text-gray-500">{t.email}</div>
                          </td>
                          <td className="text-xs font-medium">{t.event?.name || '-'}</td>
                          <td className="text-xs uppercase font-bold text-gray-600 tracking-wider">{t.category.replace('_', ' ')}</td>
                          <td className="text-xs text-gray-700 truncate max-w-[150px]">{t.subject}</td>
                          <td>
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${getStatusColor(t.status)}`}>
                              {t.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="text-[10px] text-gray-400">
                            {new Date(t.createdAt).toLocaleDateString('id-ID', {
                              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td>
                            <button
                              className="px-2 py-1 bg-blue-500 text-white text-[10px] font-bold uppercase rounded hover:bg-blue-600 transition-colors"
                              onClick={() => {
                                setSelectedTicket(t);
                                setDetailModalOpen(true);
                              }}
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {currentTickets.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">Tidak ada tiket ditemukan</div>
                ) : (
                  currentTickets.map(t => (
                    <div key={t.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="min-w-0 flex-1 mr-2">
                          <div className="font-mono text-xs font-bold text-gray-900 mb-1">{t.ticketNumber}</div>
                          <div className="font-bold text-gray-900 text-sm truncate">{t.name}</div>
                          <div className="text-[10px] text-gray-400 truncate">{t.email}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${getStatusColor(t.status)}`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mb-1 truncate">{t.subject}</div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">{t.category.replace('_', ' ')}</span>
                        <span className="text-gray-400 text-[10px]">
                          {new Date(t.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <button 
                          className="w-full px-2 py-1.5 bg-blue-500 text-white text-[10px] font-bold uppercase rounded" 
                          onClick={() => { setSelectedTicket(t); setDetailModalOpen(true); }}
                        >
                          Detail
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-auto">
                <div className="text-sm text-gray-500">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredTickets.length)}</span> of <span className="font-medium">{filteredTickets.length}</span> tickets
                </div>
                <div className="flex gap-1">
                  <button
                    className="btn ghost sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
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
          </>
        )}
      </div>

      <Modal
        title={
          <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
            <span className="text-lg font-black uppercase">Detail Tiket</span>
            {selectedTicket && (
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${getStatusColor(selectedTicket.status)}`}>
                {selectedTicket.status.replace('_', ' ')}
              </span>
            )}
          </div>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width="95vw"
        style={{ maxWidth: 700 }}
      >
        {selectedTicket && (
          <div className="space-y-6 pt-2">
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nomor Tiket</p>
                <p className="font-mono font-bold text-gray-900">{selectedTicket.ticketNumber}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Event</p>
                <p className="font-medium text-gray-900">{selectedTicket.event?.name || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Pelapor</p>
                <p className="font-medium text-gray-900">{selectedTicket.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kontak</p>
                <p className="text-sm text-gray-900">{selectedTicket.email}</p>
                {selectedTicket.phoneNumber && <p className="text-sm text-gray-900">{selectedTicket.phoneNumber}</p>}
              </div>
            </div>

            <div className="flex gap-2">
              {selectedTicket.phoneNumber && (
                <button 
                  className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors"
                  onClick={() => handleWhatsApp(selectedTicket.phoneNumber)}
                >
                  <MessageCircle className="w-4 h-4" /> Hubungi WA
                </button>
              )}
              <button 
                className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors"
                onClick={() => handleEmail(selectedTicket.email)}
              >
                <Mail className="w-4 h-4" /> Kirim Email
              </button>
            </div>

            <div>
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Kendala ({selectedTicket.category.replace('_', ' ')})</h3>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <h4 className="text-sm font-bold text-gray-800 mb-2">{selectedTicket.subject}</h4>
                <div className="text-sm text-gray-600 whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Aksi Penyelesaian</h3>
              
              <div className="space-y-4">
                {selectedTicket.status !== 'in_progress' && selectedTicket.status !== 'resolved' && (
                  <button 
                    className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 rounded-xl transition-colors disabled:opacity-50"
                    onClick={() => handleUpdateStatus('in_progress')} 
                    disabled={updating}
                  >
                    Tandai Sedang Diproses (In Progress)
                  </button>
                )}
                
                {selectedTicket.status !== 'resolved' && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-sm font-bold text-blue-800 mb-2">Tutup Tiket (Resolved)</p>
                    <Input.TextArea 
                      id="resolution-notes"
                      placeholder="Catatan penyelesaian (opsional, akan terlihat oleh pelapor)..."
                      rows={3}
                      className="mb-3 rounded-lg border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <button 
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-50"
                      disabled={updating}
                      onClick={() => {
                        const notes = (document.getElementById('resolution-notes') as HTMLTextAreaElement)?.value;
                        handleUpdateStatus('resolved', notes);
                      }}
                    >
                      Selesaikan Tiket
                    </button>
                  </div>
                )}

                {selectedTicket.status === 'resolved' && (
                  <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                    <p className="text-sm font-bold text-green-800">Tiket telah diselesaikan</p>
                    {selectedTicket.resolutionNotes && (
                      <p className="mt-2 text-sm text-green-900 bg-white p-3 rounded-lg border border-green-100 whitespace-pre-wrap">
                        <strong>Catatan:</strong><br/>{selectedTicket.resolutionNotes}
                      </p>
                    )}
                    <button 
                      className="mt-4 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded text-xs transition-colors disabled:opacity-50"
                      onClick={() => handleUpdateStatus('open')}
                      disabled={updating}
                    >
                      Buka Kembali (Reopen)
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </Modal>

    </div>
  );
}
