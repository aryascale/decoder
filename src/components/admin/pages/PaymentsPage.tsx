import { useState, useEffect } from 'react';
import { Modal } from 'antd';

interface Payment {
  id: string;
  orderId: string;
  eventName: string;
  eventId: string;
  categoryName: string;
  name: string;
  email: string;
  phoneNumber: string;
  gender: string;
  tshirtSize: string;
  bibName: string;
  grossAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  paidAt: string;
  createdAt: string;
  dateOfBirth: string;
  customData?: any;
}

interface Summary {
  total: number;
  paid: number;
  pending: number;
  failed: number;
  totalRevenue: number;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, paid: 0, pending: 0, failed: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [events, setEvents] = useState<{id:string;name:string}[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/events?showDrafts=true&includeDeleted=true').then(r=>r.json()).then(data => {
      const list = Array.isArray(data) ? data : [];
      setEvents(list.map((e:any)=>({id:e.id,name: (e.isDeleted === 1 || e.isDeleted === true) ? `${e.name} (Terhapus)` : e.name})));
      if (list.length > 0 && !eventFilter) setEventFilter(list[0].id);
    }).catch(()=>{});
  }, []);

  useEffect(() => {
    if (eventFilter) {
      loadPayments();
      setCategoryFilter('');
      fetch(`/api/categories?eventId=${eventFilter}`).then(r=>r.json()).then(data => {
        const cats = (data.categories || []).map((c:any) => typeof c === 'string' ? c : c.name);
        setCategories(cats);
      }).catch(()=>setCategories([]));
    }
  }, [filter, eventFilter]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (eventFilter) params.set('eventId', eventFilter);
      if (filter) params.set('status', filter);
      const res = await fetch(`/api/admin-payments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.registrations || []);
        setSummary(data.summary || { total: 0, paid: 0, pending: 0, failed: 0, totalRevenue: 0 });
      }
    } catch (err) {
      console.error('Failed to load payments', err);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'settlement': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancel': case 'expire': return 'bg-red-100 text-red-800';
      case 'deleted': return 'bg-gray-200 text-gray-500 line-through';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'settlement': return 'Paid';
      case 'pending': return 'Pending';
      case 'cancel': return 'Cancelled';
      case 'expire': return 'Expired';
      case 'deleted': return 'Deleted';
      default: return status;
    }
  };

  const filtered = payments.filter(p => {
    if (categoryFilter && p.categoryName !== categoryFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.orderId.toLowerCase().includes(q);
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentPayments = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter]);

  return (
    <div className="flex flex-col">
      <div className="header-row mb-4 md:mb-6">
        <div>
          <h1 className="text-lg md:text-2xl font-black tracking-tight text-gray-900 uppercase">Payments</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Kelola semua transaksi pembayaran event.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 shadow-sm">
          <div className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Revenue</div>
          <div className="text-base md:text-2xl font-black text-gray-900">Rp {(summary.totalRevenue || 0).toLocaleString('id-ID')}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 shadow-sm">
          <div className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Paid</div>
          <div className="text-base md:text-2xl font-black text-gray-900">{summary.paid || 0}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 shadow-sm">
          <div className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Pending</div>
          <div className="text-base md:text-2xl font-black text-gray-900">{summary.pending || 0}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 shadow-sm">
          <div className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Failed</div>
          <div className="text-base md:text-2xl font-black text-gray-900">{summary.failed || 0}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4 !p-3 md:!p-4">
        <div className="flex flex-col gap-2 md:gap-3">
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <select
            className="search"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          >
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
          <input
            className="search flex-1"
            placeholder="Cari nama, email, order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="settlement">Paid</option>
            <option value="pending">Pending</option>
            <option value="cancel">Cancelled</option>
            <option value="expire">Expired</option>
            <option value="deleted">Deleted</option>
          </select>
          {categories.length > 0 && (
            <select
              className="search"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Semua Kategori</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          )}
          </div>
          <button 
            className="btn ghost whitespace-nowrap w-full sm:w-auto text-xs"
            onClick={() => {
              if (filtered.length === 0) return alert('Tidak ada data untuk diexport');
              
              const escapeCsv = (val: any) => {
                if (val == null) return '';
                const str = String(val);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                  return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
              };

              const customKeys = new Set<string>();
              filtered.forEach(p => { if (p.customData) Object.keys(p.customData).forEach(k => customKeys.add(k)); });
              const knownNameKeys = ['FULL NAME', 'FULLNAME', 'Full Name', 'Nama Lengkap'];
              const knownEmailKeys = ['Active E-MAIL', 'Email', 'E-mail'];
              const knownPhoneKeys = ['Phone Number', 'Nomor HP', 'ACTIVE PHONE NUMBER'];
              const knownDOBKeys = ['Date of Birth', 'DATE OF BIRTH', 'Tanggal Lahir'];
              const knownGenderKeys = ['Gender', 'GENDER', 'Jenis Kelamin'];
              const knownTshirtKeys = ['T-Shirt Size', 'T-SHIRT SIZE', 'Ukuran Baju'];
              const knownBIBKeys = ['BIB Name', 'Nama BIB'];
              const knownBIBNumKeys = ['BIB Number', 'No BIB', 'Nomor BIB'];
              const knownNationalKeys = ['National', 'NATIONAL', 'Nationality'];

              const allKnownKeys = new Set([
                ...knownNameKeys, ...knownEmailKeys, ...knownPhoneKeys, 
                ...knownDOBKeys, ...knownGenderKeys, ...knownTshirtKeys, 
                ...knownBIBKeys, ...knownBIBNumKeys, ...knownNationalKeys
              ]);
              
              const customKeysArray = Array.from(customKeys).filter(k => !Array.from(allKnownKeys).some(ak => ak.toLowerCase() === k.toLowerCase()));
              const headers = ['Order ID','Status','Tanggal Daftar','Nama','Email','No HP','Tanggal Lahir','Gender','Nationality','T-Shirt Size','BIB Name','BIB Number','Event','Kategori','Gross Amount',...customKeysArray].map(escapeCsv);
              
              const csvData = filtered.map(p => {
                // Case-insensitive lookup in customData
                const getCustomVal = (keys: string[]) => {
                  if (!p.customData) return '';
                  const dataEntries = Object.entries(p.customData);
                  for (const searchKey of keys) {
                    const found = dataEntries.find(([k]) => k.toLowerCase() === searchKey.toLowerCase());
                    if (found && found[1]) return String(found[1]);
                  }
                  return '';
                };
                
                const mappedName = getCustomVal(knownNameKeys) || p.name || '';
                const mappedEmail = getCustomVal(knownEmailKeys) || p.email || '';
                const mappedPhone = getCustomVal(knownPhoneKeys) || p.phoneNumber || '';
                let mappedDOB = getCustomVal(knownDOBKeys) || p.dateOfBirth || '';
                if (mappedDOB && mappedDOB === p.dateOfBirth) mappedDOB = new Date(mappedDOB).toLocaleDateString('id-ID');
                const mappedGender = getCustomVal(knownGenderKeys) || p.gender || '';
                const mappedTshirt = getCustomVal(knownTshirtKeys) || p.tshirtSize || '';
                const mappedBIB = getCustomVal(knownBIBKeys) || p.bibName || '';
                const mappedNational = getCustomVal(knownNationalKeys) || '';

                const row = [
                  p.orderId,
                  p.paymentStatus,
                  new Date(p.createdAt).toLocaleDateString('id-ID'),
                  mappedName,
                  mappedEmail,
                  mappedPhone ? `'${mappedPhone}` : '',
                  mappedDOB,
                  mappedGender,
                  mappedNational,
                  mappedTshirt,
                  mappedBIB,
                  p.bibNumber || '',
                  p.eventName || '',
                  p.categoryName || '',
                  p.grossAmount
                ].map(escapeCsv);
                
                customKeysArray.forEach(k => { 
                  row.push(escapeCsv(p.customData?.[k] || '')); 
                });
                return row.join(',');
              });
              const csvContent = [headers.join(','), ...csvData].join('\n');
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.setAttribute('href', url);
              const evName = events.find(e=>e.id===eventFilter)?.name?.replace(/[^a-z0-9]/gi,'_') || 'all';
              link.setAttribute('download', `${evName}_participants_${Date.now()}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Table Card - Flex grow to fill space */}
      <div className="card flex-1 flex flex-col mb-4" style={{ minHeight: 'calc(100vh - 400px)' }}>
        {loading ? (
          <div className="text-center py-24 text-gray-400 font-medium">Loading payments data...</div>
        ) : (
          <>
            <div className="flex-1 overflow-auto">
              {/* Desktop Table */}
              <div className="hidden md:block table-wrap">
                <table className="f1-table compact">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Nama</th>
                      <th>Event</th>
                      <th>Kategori</th>
                      <th style={{ width: 120 }}>Amount</th>
                      <th style={{ width: 100 }}>Status</th>
                      <th style={{ width: 100 }}>Metode</th>
                      <th style={{ width: 120 }}>Tanggal</th>
                      <th style={{ width: 130 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPayments.length === 0 ? (
                      <tr><td colSpan={9} className="empty py-20">Tidak ada transaksi ditemukan</td></tr>
                    ) : (
                      currentPayments.map(p => (
                        <tr key={p.id} className="row-hover">
                          <td className="mono text-[10px]">{p.orderId}</td>
                          <td>
                            <div className="font-bold text-sm text-gray-900">{p.name}</div>
                            <div className="text-[10px] text-gray-500">{p.email}</div>
                            <div className="text-[10px] text-gray-400 italic">Lahir: {p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('id-ID') : '-'}</div>
                            {p.bibNumber && (
                              <div className="mt-1 text-[10px] font-black tracking-widest text-blue-600 border border-blue-200 bg-blue-50 px-1 py-0.5 rounded inline-block">
                                BIB: {p.bibNumber}
                              </div>
                            )}
                          </td>
                          <td className="text-xs font-medium">{p.eventName}</td>
                          <td className="text-xs">{p.categoryName}</td>
                          <td className="mono text-right font-bold text-sm">Rp {p.grossAmount.toLocaleString('id-ID')}</td>
                          <td>
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${statusColor(p.paymentStatus)}`}>
                              {statusLabel(p.paymentStatus)}
                            </span>
                          </td>
                          <td className="text-[10px] font-bold text-gray-500 uppercase">{p.paymentMethod || '-'}</td>
                          <td className="text-[10px] text-gray-400">{new Date(p.createdAt).toLocaleDateString('id-ID')}</td>
                          <td className="flex gap-2">
                             <button
                               className="px-2 py-1 bg-blue-500 text-white text-[10px] font-bold uppercase rounded hover:bg-blue-600 transition-colors"
                               onClick={() => {
                                 setSelectedPayment(p);
                                 setDetailsModalOpen(true);
                               }}
                             >
                               Info
                             </button>
                            {p.paymentStatus === 'pending' && (
                              <button 
                                className="px-2 py-1 bg-black text-white text-[10px] font-bold uppercase rounded hover:bg-stone-800 transition-colors"
                                onClick={async () => {
                                  if (confirm(`Selesaikan pembayaran untuk ${p.name} secara manual?`)) {
                                    try {
                                      const res = await fetch('/api/admin-settle-payment', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ orderId: p.orderId })
                                      });
                                      if (res.ok) {
                                        alert('Pembayaran diselesaikan');
                                        loadPayments();
                                      }
                                    } catch (e) {
                                      alert('Gagal menyelesaikan pembayaran');
                                    }
                                  }
                                }}
                              >
                                Settle
                              </button>
                            )}
                            {p.paymentStatus !== 'deleted' && (
                              <button 
                                className="px-2 py-1 bg-red-100 text-red-600 border border-red-200 text-[10px] font-bold uppercase rounded hover:bg-red-200 transition-colors"
                                onClick={async () => {
                                  if (confirm(`Yakin ingin melakukan soft-delete peserta ${p.name}? (Data tidak akan muncul di halaman publik)`)) {
                                    try {
                                      const res = await fetch('/api/admin-delete-payment', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ orderId: p.orderId })
                                      });
                                      if (res.ok) {
                                        alert('Peserta berhasil di-soft-delete');
                                        loadPayments();
                                      }
                                    } catch (e) {
                                      alert('Gagal melakukan soft-delete');
                                    }
                                  }
                                }}
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {currentPayments.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">Tidak ada transaksi ditemukan</div>
                ) : (
                  currentPayments.map(p => (
                    <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="min-w-0 flex-1 mr-2">
                          <div className="font-bold text-gray-900 text-sm truncate">{p.name}</div>
                          <div className="text-[10px] text-gray-400 truncate">{p.email}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${statusColor(p.paymentStatus)}`}>
                          {statusLabel(p.paymentStatus)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mb-1">{p.categoryName}</div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-mono font-bold text-xs">Rp {p.grossAmount.toLocaleString('id-ID')}</span>
                        <span className="text-gray-400 text-[10px]">{new Date(p.createdAt).toLocaleDateString('id-ID')}</span>
                      </div>
                      <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                        <button className="flex-1 px-2 py-1.5 bg-blue-500 text-white text-[10px] font-bold uppercase rounded" onClick={() => { setSelectedPayment(p); setDetailsModalOpen(true); }}>Info</button>
                        {p.paymentStatus === 'pending' && (
                          <button className="flex-1 px-2 py-1.5 bg-black text-white text-[10px] font-bold uppercase rounded" onClick={async () => { if(confirm(`Settle pembayaran ${p.name}?`)){try{const r=await fetch('/api/admin-settle-payment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId:p.orderId})});if(r.ok){alert('Done');loadPayments();}}catch{alert('Gagal');}} }}>Settle</button>
                        )}
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
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="font-medium">{filtered.length}</span> payments
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
        title="Detail Pendaftaran"
        open={detailsModalOpen}
        onCancel={() => setDetailsModalOpen(false)}
        footer={null}
        width="95vw"
        style={{ maxWidth: 600 }}
      >
        {selectedPayment && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 pb-4 border-b border-gray-100">
              <div>
                <div className="text-[10px] uppercase font-black text-gray-400">Order ID</div>
                <div className="font-mono font-bold text-sm">{selectedPayment.orderId}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-black text-gray-400">Status</div>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${statusColor(selectedPayment.paymentStatus)}`}>
                  {statusLabel(selectedPayment.paymentStatus)}
                </span>
              </div>
              <div>
                <div className="text-[10px] uppercase font-black text-gray-400">Nama</div>
                <div className="font-bold">{selectedPayment.name}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-black text-gray-400">Email</div>
                <div className="text-sm">{selectedPayment.email}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-black text-gray-400">Kategori</div>
                <div className="text-sm font-bold">{selectedPayment.categoryName}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-black text-gray-400">Amount</div>
                <div className="text-sm font-bold font-mono">Rp {selectedPayment.grossAmount.toLocaleString('id-ID')}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-black text-gray-400">Metode Bayar</div>
                <div className="text-sm uppercase font-bold">{selectedPayment.paymentMethod || '-'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-black text-gray-400">Tanggal Bayar</div>
                <div className="text-sm">{selectedPayment.paidAt ? new Date(selectedPayment.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Field Custom (Input User)</h3>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                {selectedPayment.customData ? (
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(selectedPayment.customData).map(([key, val]: [string, any]) => {
                      if (!val || key === 'tshirtSize' || key === 'bibName' || key === 'paymentStatus' || key === 'categoryId') return null;
                      return (
                        <div key={key} className="flex justify-between items-start py-1 border-b border-gray-200 last:border-0">
                          <span className="text-[10px] font-bold text-gray-500 uppercase">{key}</span>
                          <span className="text-sm font-medium text-gray-900">{String(val)}</span>
                        </div>
                      );
                    })}
                    {/* Add standard fields that were in customData but are important */}
                    <div className="flex justify-between items-start py-1 border-b border-gray-200 last:border-0">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">T-Shirt Size</span>
                      <span className="text-sm font-medium text-gray-900">{selectedPayment.tshirtSize || selectedPayment.customData?.['T-Shirt Size'] || selectedPayment.customData?.['T-SHIRT SIZE'] || '-'}</span>
                    </div>
                    <div className="flex justify-between items-start py-1 border-b border-gray-200 last:border-0">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">BIB Number (Auto)</span>
                      <span className="text-sm font-medium text-blue-600">{selectedPayment.bibNumber || '-'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-400 italic text-sm">Tidak ada data custom</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
