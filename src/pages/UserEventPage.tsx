import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string;
  eventDate?: string;
  location?: string;
  categories?: string[];
  status?: 'upcoming' | 'ongoing' | 'completed';
  isActive?: boolean;
  bannerUrl?: string;
  content?: any;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  upcoming: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  ongoing: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  completed: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
};


const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function formatDate(dateStr?: string, isTBA?: boolean) {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  if (isTBA) {
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function UserEventPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/events')
      .then(res => res.json())
      .then(data => { setEvents(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = events.filter(e => {
    return e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.location || '').toLowerCase().includes(search.toLowerCase());
  });

  const handleView = (slug: string) => {
    setNavigatingTo(slug);
    setTimeout(() => navigate(`/event/${slug}`), 800);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#fafafa]" style={{ paddingTop: 64 }}>
        <div className="w-full max-w-7xl mx-auto flex flex-col">

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Top Bar */}
            <div className="sticky top-[64px] z-20 bg-[#fafafa]/90 backdrop-blur-xl border-b border-gray-100">
              <div className="px-6 py-4 flex flex-col gap-4">
                {/* Breadcrumbs */}
                <div className="flex items-center space-x-2 text-[13px] font-medium text-slate-500">
                  <a href="/" className="hover:text-slate-900 transition-colors">Home</a>
                  <span className="text-slate-300">/</span>
                  <span className="text-slate-900 font-semibold">Event</span>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Badge Counter */}
                  <div className="flex items-center gap-3">
                    <div className="w-[52px] h-[52px] bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm">
                      <span className="text-2xl font-black text-slate-800">{filtered.length}</span>
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-[14px] font-bold text-slate-500 tracking-wider">EVENT</span>
                    </div>
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-80">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" placeholder="Search event..." value={search} onChange={e => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Cards */}
            <div className="p-4 sm:p-6">
              {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex bg-white border border-gray-100 overflow-hidden animate-pulse h-[120px] sm:h-[140px]">
                      <div className="w-[120px] sm:w-[140px] h-full shrink-0 bg-gray-100 border-r border-gray-50" />
                      <div className="flex-1 py-3 px-4 sm:py-4 flex flex-col justify-center space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="h-3 bg-gray-200 rounded w-20" />
                          <div className="h-3 bg-gray-100 rounded w-16" />
                        </div>
                        <div className="h-5 bg-gray-200 rounded w-3/4" />
                        <div className="h-6 bg-gray-100 rounded w-1/4 mt-2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-24">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Belum ada event</h3>
                  <p className="text-sm text-gray-500">{search ? `Tidak ada event cocok "${search}"` : 'Event akan segera ditambahkan.'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {filtered.map((event, i) => {
                    const hasBanner = !!event.bannerUrl;
                    const dateStr = formatDate(event.eventDate, event.content?.isDateTBA);
                    
                    return (
                      <div key={event.id} onClick={() => handleView(event.slug)}
                        className="group flex bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden h-[110px] sm:h-[140px]"
                        style={{ animation: `fadeUp 0.5s ease-out ${i * 0.05}s both` }}>
                        
                        {/* Left Side: Thumbnail/Logo */}
                        <div className="w-[90px] sm:w-[140px] h-full shrink-0 flex items-center justify-center bg-[#fafafa] border-r border-gray-100 p-2 sm:p-4">
                          {hasBanner ? (
                            <div className="w-full h-full overflow-hidden relative border border-gray-200/50">
                              <img src={event.bannerUrl} alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                            </div>
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#757F9A] to-[#D7DDE8] flex items-center justify-center p-1 sm:p-2 text-center shadow-inner">
                              <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest break-words line-clamp-3 leading-tight">{event.name}</span>
                            </div>
                          )}
                        </div>

                        {/* Right Side: Details */}
                        <div className="flex-1 py-2 px-3 sm:py-3 sm:px-5 flex flex-col justify-center min-w-0">
                          {/* Top Row: Date & Location */}
                          <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-1 sm:mb-1.5">
                            <span className="text-[10px] sm:text-xs font-bold text-blue-600 shrink-0 uppercase tracking-widest">
                              {dateStr}
                            </span>
                            {event.location && (
                              <div className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-xs text-gray-500 truncate font-medium uppercase tracking-widest min-w-0">
                                <span className="truncate">{event.location}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 shrink-0">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Middle Row: Title */}
                          <h3 className="font-bold text-gray-900 text-sm sm:text-lg leading-snug sm:leading-tight mb-1 sm:mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {event.name}
                          </h3>

                          {/* Bottom Row: Category */}
                          <div className="flex flex-wrap items-center gap-2 mt-auto">
                            {!event.categories || event.categories.length === 0 ? (
                              <div className="flex items-center text-[9px] sm:text-[10px] lg:text-xs text-gray-600 font-bold bg-gray-50 px-2 py-0.5 sm:px-2.5 sm:py-1 uppercase tracking-wider border border-gray-200">
                                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M13 4a2 2 0 100-4 2 2 0 000 4z"/><path d="M4 17l5-5 4-2 3 3 2.5-1M12 10V4M10 21l3-5 3 2.5M7 12l2-4"/>
                                </svg>
                                Event
                              </div>
                            ) : (
                              <>
                                {event.categories.slice(0, 3).map((cat, idx) => (
                                  <div key={idx} className="flex items-center text-[9px] sm:text-[10px] lg:text-xs text-gray-600 font-bold bg-gray-50 px-2 py-0.5 sm:px-2.5 sm:py-1 uppercase tracking-wider border border-gray-200">
                                    {idx === 0 && (
                                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M13 4a2 2 0 100-4 2 2 0 000 4z"/><path d="M4 17l5-5 4-2 3 3 2.5-1M12 10V4M10 21l3-5 3 2.5M7 12l2-4"/>
                                      </svg>
                                    )}
                                    {cat}
                                  </div>
                                ))}
                                {event.categories.length > 3 && (
                                  <div className="flex items-center text-[9px] sm:text-[10px] lg:text-xs text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 sm:px-2 sm:py-1 uppercase tracking-wider border border-gray-200">
                                    +{event.categories.length - 3}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>

        <style>{`
          @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
          .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        `}</style>

        {navigatingTo && (
          <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center">
            <img src="/Assets/logo2.gif" alt="Loading" className="w-20 h-20 mb-4" />
            <div className="w-10 h-10 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mb-3" />
            <p className="text-sm font-bold text-gray-500 tracking-widest uppercase animate-pulse">Loading...</p>
          </div>
        )}
      </div>
    </>
  );
}
