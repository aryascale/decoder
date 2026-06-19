import React, { useState } from 'react';
import { Search, AlertCircle, Clock, CheckCircle2, MessageCircle } from 'lucide-react';
import { Spin } from 'antd';

export default function CheckTicketPage() {
  const [formData, setFormData] = useState({
    email: '',
    ticketNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticketData, setTicketData] = useState<any>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTicketData(null);
    
    try {
      const params = new URLSearchParams(formData);
      const response = await fetch(`/api/tickets/status?${params}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Gagal memuat tiket');
      
      setTicketData(data.ticket);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="px-3 py-1 bg-yellow-900/50 text-yellow-500 border border-yellow-700/50 rounded-full text-sm font-medium flex items-center gap-2"><Clock className="w-4 h-4"/> Menunggu Antrean</span>;
      case 'in_progress':
        return <span className="px-3 py-1 bg-blue-900/50 text-blue-400 border border-blue-700/50 rounded-full text-sm font-medium flex items-center gap-2"><Spin size="small"/> Sedang Diproses</span>;
      case 'resolved':
        return <span className="px-3 py-1 bg-green-900/50 text-green-400 border border-green-700/50 rounded-full text-sm font-medium flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Selesai</span>;
      default:
        return <span className="px-3 py-1 bg-neutral-800 text-neutral-400 border border-neutral-700 rounded-full text-sm font-medium">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Search Card */}
        <div className="bg-neutral-800 rounded-3xl overflow-hidden border border-neutral-700 shadow-2xl">
          <div className="px-6 py-8 border-b border-neutral-700 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Cek Status Tiket</h1>
            <p className="text-neutral-400">Masukkan email dan nomor tiket untuk melihat status laporan Anda.</p>
          </div>

          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-200">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    placeholder="email@contoh.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Nomor Tiket</label>
                  <input
                    type="text"
                    name="ticketNumber"
                    required
                    value={formData.ticketNumber}
                    onChange={handleChange}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all uppercase"
                    placeholder="LMPT-XXXX-XXXX"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Spin size="small" /> : <Search className="w-5 h-5" />}
                <span>Cari Tiket</span>
              </button>
            </form>
          </div>
        </div>

        {/* Result Card */}
        {ticketData && (
          <div className="bg-neutral-800 rounded-3xl overflow-hidden border border-neutral-700 shadow-2xl p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start mb-6 pb-6 border-b border-neutral-700">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">{ticketData.subject}</h2>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-neutral-400">
                  <span>Tiket: <strong className="text-neutral-200">{ticketData.ticketNumber}</strong></span>
                  <span className="hidden sm:inline">•</span>
                  <span>Dibuat: {new Date(ticketData.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
                </div>
              </div>
              <div>{getStatusBadge(ticketData.status)}</div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-neutral-500 mb-2 uppercase tracking-wider">Deskripsi Kendala</h3>
                <p className="text-neutral-300 whitespace-pre-wrap">{ticketData.description}</p>
              </div>

              {ticketData.resolutionNotes && (
                <div className="bg-primary-900/20 border border-primary-500/30 rounded-xl p-5">
                  <h3 className="text-sm font-medium text-primary-400 mb-2 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Catatan Penyelesaian
                  </h3>
                  <p className="text-neutral-200 whitespace-pre-wrap">{ticketData.resolutionNotes}</p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-neutral-700">
               <p className="text-sm text-neutral-400">
                 Tim kami akan menghubungi Anda melalui email atau WhatsApp untuk proses lebih lanjut.
               </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
