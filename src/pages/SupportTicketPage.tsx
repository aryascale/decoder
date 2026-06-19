import React, { useState } from 'react';
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Spin } from 'antd';

export default function SupportTicketPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    category: '',
    subject: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successTicket, setSuccessTicket] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Gagal mengirim laporan');
      
      setSuccessTicket(data.ticketNumber);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (successTicket) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 max-w-md w-full text-center border border-slate-200 shadow-sm rounded-none">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2">Tiket Berhasil Dibuat</h2>
          <p className="text-slate-600 mb-6 font-medium">
            Laporan kendala Anda telah kami terima. Nomor tiket Anda adalah:
          </p>
          <div className="bg-slate-50 p-4 border border-slate-200 text-2xl font-mono text-blue-600 font-bold mb-6 tracking-wider">
            {successTicket}
          </div>
          <p className="text-slate-500 text-sm mb-8">
            Salinan nomor tiket ini beserta pemberitahuan balasan dari tim kami akan dikirimkan ke email Anda: <br />
            <span className="text-slate-800 font-bold mt-1 block">{formData.email}</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/" 
              className="px-6 py-3 bg-white border-2 border-slate-900 hover:bg-slate-50 text-slate-900 font-black uppercase tracking-widest text-xs transition-colors rounded-none w-full sm:w-auto"
            >
              Beranda
            </a>
            <a 
              href="/cek-tiket" 
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs transition-colors rounded-none w-full sm:w-auto"
            >
              Cek Tiket
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white overflow-hidden border border-slate-200 shadow-sm rounded-none">
        <div className="px-6 py-8 border-b border-slate-200 text-center bg-white">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 mb-2">Bantuan & Lapor Kendala</h1>
          <p className="text-slate-500 font-medium">Silakan isi formulir di bawah ini untuk melaporkan kendala yang Anda alami saat mendaftar.</p>
        </div>

        <div className="p-6 sm:p-8 bg-white">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 rounded-none">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-700 mb-2">Nama Lengkap *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-white border-2 border-slate-200 px-4 py-3 text-slate-900 font-medium focus:border-slate-900 focus:ring-0 outline-none transition-colors rounded-none placeholder:text-slate-400"
                  placeholder="Nama Anda"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-700 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-white border-2 border-slate-200 px-4 py-3 text-slate-900 font-medium focus:border-slate-900 focus:ring-0 outline-none transition-colors rounded-none placeholder:text-slate-400"
                  placeholder="Email aktif"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-700 mb-2">No. WhatsApp</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full bg-white border-2 border-slate-200 px-4 py-3 text-slate-900 font-medium focus:border-slate-900 focus:ring-0 outline-none transition-colors rounded-none placeholder:text-slate-400"
                  placeholder="0812..."
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-700 mb-2">Kategori Kendala *</label>
                <select
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full bg-white border-2 border-slate-200 px-4 py-3 text-slate-900 font-medium focus:border-slate-900 focus:ring-0 outline-none transition-colors rounded-none appearance-none"
                >
                  <option value="" className="text-slate-400">Pilih Kategori</option>
                  <option value="pembayaran">Pembayaran Gagal / Pending</option>
                  <option value="salah_data">Salah Input Data</option>
                  <option value="sulit_daftar">Kesulitan Mendaftar</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-700 mb-2">Subjek *</label>
              <input
                type="text"
                name="subject"
                required
                value={formData.subject}
                onChange={handleChange}
                className="w-full bg-white border-2 border-slate-200 px-4 py-3 text-slate-900 font-medium focus:border-slate-900 focus:ring-0 outline-none transition-colors rounded-none placeholder:text-slate-400"
                placeholder="Topik singkat kendala Anda"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-700 mb-2">Deskripsi Lengkap *</label>
              <textarea
                name="description"
                required
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="w-full bg-white border-2 border-slate-200 px-4 py-3 text-slate-900 font-medium focus:border-slate-900 focus:ring-0 outline-none transition-colors rounded-none resize-none placeholder:text-slate-400"
                placeholder="Ceritakan detail kendala yang Anda alami..."
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs py-4 px-4 transition-colors flex items-center justify-center gap-2 rounded-none"
            >
              {loading ? <Spin size="small" /> : <Mail className="w-5 h-5" />}
              <span>{loading ? 'Mengirim...' : 'Kirim Laporan'}</span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 font-medium text-sm">
              Butuh bantuan mendesak?
            </p>
            <a 
              href="https://wa.me/6281234567890" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-green-700 hover:text-green-800 font-bold bg-green-50 px-5 py-3 border-2 border-green-200 transition-colors rounded-none"
            >
              <svg viewBox="0 0 31 30" height="24" width="24" preserveAspectRatio="xMidYMid meet" fill="none"><title>wa-logo</title><path d="M30.3139 14.3245C30.174 10.4932 28.5594 6.864 25.8073 4.1948C23.0552 1.52559 19.3784 0.0227244 15.5446 4.10118e-06H15.4722C12.8904 -0.00191309 10.3527 0.668375 8.10857 1.94491C5.86449 3.22145 3.99142 5.06026 2.67367 7.28039C1.35592 9.50053 0.6389 12.0255 0.593155 14.6068C0.547411 17.1882 1.17452 19.737 2.41278 22.0024L1.09794 29.8703C1.0958 29.8865 1.09712 29.9029 1.10182 29.9185C1.10651 29.9341 1.11448 29.9485 1.12518 29.9607C1.13588 29.973 1.14907 29.9828 1.16387 29.9896C1.17867 29.9964 1.19475 29.9999 1.21103 30H1.23365L9.01561 28.269C11.0263 29.2344 13.2282 29.7353 15.4586 29.7346C15.6004 29.7346 15.7421 29.7346 15.8838 29.7346C17.8458 29.6786 19.7773 29.2346 21.5667 28.4282C23.3562 27.6218 24.9682 26.469 26.3098 25.0363C27.6514 23.6036 28.696 21.9194 29.3832 20.0809C30.0704 18.2423 30.3867 16.2859 30.3139 14.3245ZM15.8099 27.1487C15.6923 27.1487 15.5747 27.1487 15.4586 27.1487C13.4874 27.1511 11.5444 26.6795 9.79366 25.7735L9.39559 25.5654L4.11815 26.8124L5.09221 21.4732L4.86604 21.0902C3.78579 19.2484 3.20393 17.157 3.17778 15.0219C3.15163 12.8869 3.68208 10.7819 4.71689 8.91419C5.75171 7.0465 7.25518 5.48059 9.07924 4.37067C10.9033 3.26076 12.985 2.64514 15.1194 2.58444C15.238 2.58444 15.3571 2.58444 15.4767 2.58444C18.6992 2.59399 21.7889 3.86908 24.0802 6.13498C26.3715 8.40087 27.681 11.4762 27.7265 14.6984C27.7719 17.9205 26.5498 21.0316 24.3234 23.3612C22.0969 25.6909 19.0444 27.0527 15.8235 27.1532L15.8099 27.1487Z" fill="currentColor"></path><path d="M10.2894 7.69007C10.1057 7.69366 9.92456 7.73407 9.75673 7.80892C9.5889 7.88377 9.43779 7.99154 9.31236 8.12584C8.95801 8.48923 7.96736 9.36377 7.91006 11.2003C7.85277 13.0369 9.13594 14.8538 9.31537 15.1086C9.49481 15.3635 11.7686 19.3306 15.5141 20.9395C17.7156 21.8879 18.6806 22.0507 19.3063 22.0507C19.5642 22.0507 19.7587 22.0236 19.9622 22.0115C20.6483 21.9693 22.1969 21.1762 22.5346 20.3137C22.8724 19.4512 22.895 18.6973 22.806 18.5465C22.7171 18.3957 22.4728 18.2872 22.1049 18.0942C21.737 17.9012 19.9321 16.9361 19.5928 16.8004C19.467 16.7419 19.3316 16.7066 19.1932 16.6964C19.1031 16.7011 19.0155 16.7278 18.938 16.774C18.8605 16.8203 18.7954 16.8847 18.7484 16.9618C18.4469 17.3372 17.7548 18.153 17.5225 18.3882C17.4718 18.4466 17.4093 18.4938 17.3392 18.5265C17.2691 18.5592 17.1928 18.5768 17.1154 18.5782C16.9728 18.5719 16.8333 18.5344 16.7068 18.4681C15.6135 18.0038 14.6167 17.339 13.768 16.5079C12.975 15.7263 12.3022 14.8315 11.7716 13.8526C11.5666 13.4726 11.7716 13.2766 11.9586 13.0987C12.1456 12.9208 12.3461 12.675 12.5391 12.4624C12.6975 12.2808 12.8295 12.0777 12.9312 11.8593C12.9838 11.7578 13.0104 11.6449 13.0085 11.5307C13.0067 11.4165 12.9765 11.3045 12.9206 11.2048C12.8317 11.0149 12.1667 9.14664 11.8546 8.39725C11.6013 7.75642 11.2997 7.73531 11.0358 7.7157C10.8187 7.70062 10.5699 7.69309 10.3211 7.68555H10.2894" fill="currentColor"></path></svg>
              <span>Hubungi WA Official</span>
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
