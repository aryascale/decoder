import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string;
  eventDate: string;
  location?: string;
  isActive: boolean;
  categories: any[];
  content?: any;
  createdAt: number;
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  }

  function getEventStatus(event: Event): 'live' | 'upcoming' | 'completed' {
    const now = Date.now();
    const eventDate = new Date(event.eventDate).getTime();

    if (!event.isActive) {
      return 'completed';
    }

    if (eventDate > now) {
      return 'upcoming';
    }

    return 'live';
  }

  function getEventBadge(status: 'live' | 'upcoming' | 'completed') {
    switch (status) {
      case 'live':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border-2 border-red-700">🔴 Live</span>;
      case 'upcoming':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border-2 border-yellow-700">⏰ Upcoming</span>;
      case 'completed':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border-2 border-green-700">✅ Completed</span>;
    }
  }

  function getFilteredEvents() {
    let filtered = events;

    if (searchTerm) {
      filtered = filtered.filter(
        (event) =>
          event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((event) => getEventStatus(event) === statusFilter);
    }

    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 flex items-center justify-center">
          <p className="text-white text-2xl font-semibold">Loading events...</p>
        </div>
      </>
    );
  }

  const filteredEvents = getFilteredEvents();

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600">
        {/* Hero Section */}
        <header className="bg-black/30 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h1 className="text-5xl font-extrabold text-white mb-4 drop-shadow-lg">BCR Race Platform</h1>
            <p className="text-2xl font-light text-white/95 mb-2">Professional Race Timing & Real-time Results</p>
            <p className="text-lg text-white/90 mb-8">
              Live leaderboard, tracking, and timing system for your running events
            </p>
            <Link
              to="/admin/create-event"
              className="inline-block px-10 py-4 text-lg font-semibold bg-white text-indigo-600 rounded-full hover:bg-gray-100 hover:-translate-y-0.5 transition-all shadow-lg hover:shadow-xl"
            >
              + Create New Event
            </Link>
          </div>
        </header>

        {/* Search and Filter Section */}
        <section className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Search events by name, location, or description..."
                className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <div className="flex flex-wrap gap-2">
                <button
                  className={`px-6 py-3 rounded-full font-semibold transition-all ${
                    statusFilter === 'all'
                      ? 'bg-indigo-600 text-white border-2 border-indigo-600'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-indigo-500 hover:bg-gray-50'
                  }`}
                  onClick={() => setStatusFilter('all')}
                >
                  All Events
                </button>
                <button
                  className={`px-6 py-3 rounded-full font-semibold transition-all ${
                    statusFilter === 'live'
                      ? 'bg-indigo-600 text-white border-2 border-indigo-600'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-indigo-500 hover:bg-gray-50'
                  }`}
                  onClick={() => setStatusFilter('live')}
                >
                  🔴 Live
                </button>
                <button
                  className={`px-6 py-3 rounded-full font-semibold transition-all ${
                    statusFilter === 'upcoming'
                      ? 'bg-indigo-600 text-white border-2 border-indigo-600'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-indigo-500 hover:bg-gray-50'
                  }`}
                  onClick={() => setStatusFilter('upcoming')}
                >
                  ⏰ Upcoming
                </button>
                <button
                  className={`px-6 py-3 rounded-full font-semibold transition-all ${
                    statusFilter === 'completed'
                      ? 'bg-indigo-600 text-white border-2 border-indigo-600'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-indigo-500 hover:bg-gray-50'
                  }`}
                  onClick={() => setStatusFilter('completed')}
                >
                  ✅ Completed
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Events List */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-3xl font-bold text-white mb-6 drop-shadow-md">
            {statusFilter === 'all' ? 'All Events' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Events`}
            <span className="text-xl font-normal opacity-90 ml-2">({filteredEvents.length})</span>
          </h2>

          {filteredEvents.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-xl">
              <p className="text-gray-600 text-xl mb-4">No events found.</p>
              {searchTerm && <p className="text-gray-500 mb-6">Try adjusting your search or filters.</p>}
              {!searchTerm && statusFilter === 'all' && (
                <Link
                  to="/admin/create-event"
                  className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Create Your First Event
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => {
                const status = getEventStatus(event);
                return (
                  <div
                    key={event.id}
                    className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <h3 className="text-2xl font-bold text-gray-900 flex-1">{event.name}</h3>
                      {getEventBadge(status)}
                    </div>

                    {event.description && (
                      <p className="text-gray-600 leading-relaxed">{event.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-gray-700">
                        <span className="text-xl">📅</span>
                        <span className="text-sm font-medium">
                          {event.content?.isDateTBA
                            ? new Date(event.eventDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long'
                              })
                            : new Date(event.eventDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                        </span>
                      </div>

                      {event.location && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <span className="text-xl">📍</span>
                          <span className="text-sm font-medium">{event.location}</span>
                        </div>
                      )}


                      <div className="flex items-center gap-2 text-gray-700">
                        <span className="text-xl">🏃</span>
                        <span className="text-sm font-medium">{event.categories.length} categories</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Categories:</p>
                      <div className="flex flex-wrap gap-2">
                        {event.categories.slice(0, 3).map((cat: any) => (
                          <span
                            key={cat}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
                          >
                            {cat}
                          </span>
                        ))}
                        {event.categories.length > 3 && (
                          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                            +{event.categories.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
                      <Link
                        to={`/event/${event.slug}`}
                        className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold text-center hover:bg-indigo-700 hover:-translate-y-0.5 transition-all shadow-md hover:shadow-lg"
                      >
                        View Results →
                      </Link>
                      <Link
                        to={`/event/${event.slug}/admin`}
                        className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold text-center hover:bg-gray-200 transition-colors"
                      >
                        Admin Panel
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
