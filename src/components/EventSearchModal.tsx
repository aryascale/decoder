import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Event {
  id: string;
  name: string;
  slug: string;
  location?: string;
  date?: string;
  status?: 'upcoming' | 'ongoing' | 'completed';
}

interface EventSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EventSearchModal({ isOpen, onClose }: EventSearchModalProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/events')
        .then(res => res.json())
        .then(data => {
          setEvents(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch events:', err);
          setLoading(false);
        });
      // Prevent body scroll when modal open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      setSearchQuery('');
    }
    
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredEvents = events.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (e.location && e.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectEvent = (slug: string) => {
    setNavigatingTo(slug);
    // Loading transition effect matching the leaderboard flow
    setTimeout(() => {
      onClose();
      setNavigatingTo(null);
      navigate(`/event/${slug}`);
    }, 1200);
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex flex-col items-center pt-80 px-4 transition-all duration-300"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header & Search Input */}
          <div className="p-4 sm:p-6 border-b border-gray-100 relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-800 font-bold text-lg">Search Events</h2>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="relative">
              <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for event name, race, or location..."
                className="w-full bg-white text-gray-800 text-base md:text-lg rounded-xl py-3 pl-12 pr-6 focus:outline-none focus:ring-2 focus:ring-red-200/20 transition-colors placeholder:text-gray-400 border border-gray-200 focus:border-red-2  00"
              />
            </div>
          </div>

          {/* Results Area */}
          <div className="max-h-[60vh] overflow-y-auto bg-gray-50/50">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                <div className="w-10 h-10 border-4 border-gray-100 border-t-red-600 rounded-full animate-spin mb-4"></div>
                <p className="font-semibold text-sm">Fetching Events...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p className="font-semibold mb-1">No Results Found</p>
                <p className="text-sm text-gray-400">Try adjusting your search criteria</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => handleSelectEvent(event.slug)}
                    className="w-full text-left p-4 sm:px-6 hover:bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all flex items-center justify-between group"
                  >
                    <div className="flex flex-col">
                      <h3 className="text-gray-800 text-base font-semibold group-hover:text-red-600 transition-colors">{event.name}</h3>
                      {event.location && (
                        <p className="text-gray-400 text-sm mt-0.5 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {event.location}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`hidden sm:inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          event.status === 'ongoing'
                            ? 'bg-green-100 text-green-700'
                            : event.status === 'completed'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {event.status === 'ongoing' ? 'LIVE' : event.status === 'completed' ? 'SELESAI' : 'SEGERA'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading Overlay Animation */}
      {navigatingTo && (
           <div className="fixed inset-0 bg-stone-950 z-[200] flex flex-col items-center justify-center transition-opacity duration-300">
             <div className="relative">
               {/* Animated rings */}
               <div className="w-24 h-24 border-4 border-red-900 border-t-red-600 rounded-full animate-spin"></div>
               <div className="w-16 h-16 border-4 border-stone-800 border-b-white rounded-full animate-spin absolute top-4 left-4" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse"></div>
               </div>
             </div>
             
             <div className="mt-8 text-center">
               <h2 className="text-white font-black text-2xl tracking-[0.2em] uppercase mb-2">Connecting</h2>
               <p className="text-red-500 text-sm font-bold tracking-widest uppercase animate-pulse">Loading Race Telemetry...</p>
             </div>
           </div>
        )}
    </>
  );
}
