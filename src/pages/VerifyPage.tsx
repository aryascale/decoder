import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';

interface ParticipantData {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  gender: string;
  tshirtSize: string | null;
  bibName: string | null;
  bibNumber: string | null;
  bloodType: string | null;
  dateOfBirth: string | null;
  categoryName: string;
  eventName: string;
  eventDate: string;
  location: string;
  orderId: string;
  paymentStatus: string;
  paidAt: string | null;
  customData: Record<string, any> | null;
}

export default function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState('');
  const [participant, setParticipant] = useState<ParticipantData | null>(null);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const res = await fetch(`/api/verify-participant?id=${id}`);
        const data = await res.json();
        setVerified(data.verified);
        setMessage(data.message);
        setParticipant(data.participant || null);
      } catch {
        setMessage('Gagal memuat data');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-stone-100 py-12 px-4">
        <div className="max-w-lg mx-auto">
          {loading ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-stone-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-stone-500 font-medium">Memverifikasi peserta...</p>
            </div>
          ) : participant ? (
            <div className="bg-white shadow-xl overflow-hidden">
              {/* Status Header */}
              <div className={`p-8 text-center ${verified ? '' : 'bg-gradient-to-br from-stone-700 to-stone-800'}`} style={verified ? { backgroundColor: '#77FC70' } : {}}>
                <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${verified ? 'bg-white shadow-sm' : 'bg-stone-600'}`}>
                  {verified ? (
                    <svg className="w-10 h-10" style={{ color: '#77FC70' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <h1 className={`text-2xl font-black uppercase tracking-tight mb-1 ${verified ? 'text-stone-900' : 'text-white'}`}>
                  {verified ? 'TERVERIFIKASI' : 'BELUM DIKONFIRMASI'}
                </h1>
                <p className={`text-sm font-medium ${verified ? 'text-stone-800' : 'text-white/70'}`}>{message}</p>
              </div>

              {/* Participant Details */}
              <div className="p-6">
                <div className="bg-stone-50 border border-stone-200 rounded-lg overflow-hidden mb-4">
                  <div className="bg-stone-900 px-4 py-2">
                    <span className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">Detail Peserta</span>
                  </div>
                  <table className="w-full">
                    <tbody>
                      {[
                        ['Nama', participant.name],
                        ['Event', participant.eventName],
                        ['Kategori', participant.categoryName],
                        ['Tanggal', participant.eventDate ? new Date(participant.eventDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'],
                        ['Email', participant.email],
                        ['Telepon', participant.phoneNumber],
                        ['Gender', participant.gender === 'L' ? 'Laki-laki' : 'Perempuan'],
                        ['Ukuran Baju', participant.tshirtSize || '-'],
                        ['Custom BIB', participant.bibName || '-'],
                        ['No. BIB', participant.bibNumber || '-'],
                        ['Gol. Darah', participant.bloodType || '-'],
                        ['Order ID', participant.orderId],
                        ['Status', participant.paymentStatus === 'settlement' ? '✅ Lunas' : participant.paymentStatus],
                        ['Dibayar', participant.paidAt ? new Date(participant.paidAt).toLocaleDateString('id-ID') : '-'],
                      ].map(([label, value]) => (
                        <tr key={label as string} className="border-b border-stone-100 last:border-0">
                          <td className="px-4 py-3 text-xs text-stone-500 font-medium w-1/3">{label}</td>
                          <td className="px-4 py-3 text-sm text-stone-900 font-semibold">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Custom Fields */}
                {participant.customData && Object.keys(participant.customData).length > 0 && (
                  <div className="bg-stone-50 border border-stone-200 rounded-lg overflow-hidden">
                    <div className="bg-stone-900 px-4 py-2">
                      <span className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">Data Tambahan</span>
                    </div>
                    <table className="w-full">
                      <tbody>
                        {Object.entries(participant.customData).map(([key, value]) => (
                          <tr key={key} className="border-b border-stone-100 last:border-0">
                            <td className="px-4 py-3 text-xs text-stone-500 font-medium w-1/3">{key}</td>
                            <td className="px-4 py-3 text-sm text-stone-900 font-semibold">{String(value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 text-center shadow-xl">
              <div className="w-20 h-20 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-black text-stone-900 mb-2">Data Tidak Ditemukan</h2>
              <p className="text-stone-500 text-sm">{message || 'QR code tidak valid atau sudah expired.'}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
