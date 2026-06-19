import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useEvent } from "../../../contexts/EventContext";
import { CATEGORY_KEYS } from "../../../lib/config";
import EventDetailPage from "./EventDetailPage";

interface EventsPageProps {
  events: any[];
  onEventsChange: (events: any[]) => void;
}

type EventStatus = 'upcoming' | 'ongoing' | 'completed';

// Helper functions for status styling
function getStatusColor(status?: string): string {
  switch (status) {
    case 'ongoing':
      return '#dcfce7';
    case 'completed':
      return '#f3f4f6';
    case 'upcoming':
    default:
      return '#fef3c7';
  }
}

function getStatusTextColor(status?: string): string {
  switch (status) {
    case 'ongoing':
      return '#166534';
    case 'completed':
      return '#6b7280';
    case 'upcoming':
    default:
      return '#92400e';
  }
}

export default function EventsPage({ events, onEventsChange }: EventsPageProps) {
  const { refreshEvents } = useEvent();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventLatitude, setNewEventLatitude] = useState('');
  const [newEventLongitude, setNewEventLongitude] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventActive, setNewEventActive] = useState(true);
  const [newEventStatus, setNewEventStatus] = useState<EventStatus>('upcoming');
  const [newEventIsDraft, setNewEventIsDraft] = useState(false);
  const [newEventPublishAt, setNewEventPublishAt] = useState('');

  // Selected event for detail view - restore from URL params
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Restore selectedEvent from URL params on mount
  useEffect(() => {
    const eventId = searchParams.get('eventId');
    if (eventId && !selectedEvent) {
      // Try to find in loaded events first
      const found = events.find((e: any) => e.id === eventId);
      if (found) {
        setSelectedEvent(found);
      } else if (events.length > 0) {
        // Events loaded but not found - clear param
        setSearchParams({}, { replace: true });
      } else {
        // Events not loaded yet, fetch the specific event
        setLoadingEvent(true);
        fetch(`/api/events?eventId=${eventId}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) {
              setSelectedEvent(data);
            } else {
              setSearchParams({}, { replace: true });
            }
          })
          .catch(() => setSearchParams({}, { replace: true }))
          .finally(() => setLoadingEvent(false));
      }
    }
  }, [events, searchParams]);

  const handleCreateEvent = async () => {
    if (!newEventName.trim()) {
      alert('Event name is required');
      return;
    }
    if (!newEventDate) {
      alert('Event date is required');
      return;
    }

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newEventName.trim(),
          description: newEventDescription.trim(),
          eventDate: newEventDate,
          location: newEventLocation.trim(),
          latitude: newEventLatitude.trim() ? parseFloat(newEventLatitude.trim()) : null,
          longitude: newEventLongitude.trim() ? parseFloat(newEventLongitude.trim()) : null,
          isActive: newEventActive,
          isDraft: newEventIsDraft,
          publishAt: newEventPublishAt || null,
          categories: [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create event' }));
        throw new Error(errorData.error || 'Failed to create event');
      }

      const event = await response.json();

      // Reset form
      setNewEventName('');
      setNewEventDate('');
      setNewEventLocation('');
      setNewEventLatitude('');
      setNewEventLongitude('');
      setNewEventDescription('');
      setNewEventActive(true);
      setNewEventIsDraft(false);
      setNewEventPublishAt('');
      setNewEventStatus('upcoming');
      setShowEventForm(false);

      // Reload events list
      const eventsRes = await fetch('/api/events?showDrafts=true');
      const eventsData = await eventsRes.json();
      onEventsChange(Array.isArray(eventsData) ? eventsData : []);
      await refreshEvents(true);

      alert(`Event "${event.name}" created successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to create event');
    }
  };

  const handleStatusChange = async (eventId: string, newStatus: EventStatus) => {
    setUpdatingStatus(eventId);
    try {
      const response = await fetch(`/api/events?eventId=${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update event status');
      }

      // Reload events
      const eventsRes = await fetch('/api/events?showDrafts=true');
      const eventsData = await eventsRes.json();
      onEventsChange(Array.isArray(eventsData) ? eventsData : []);
      await refreshEvents(true);

      alert(`Event status updated to "${newStatus}"`);
    } catch (error: any) {
      alert(error.message || 'Failed to update event status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDeleteEvent = async (eventId: string, name: string) => {
    if (!confirm(`Hapus event "${name}"? Semua data peserta, kategori, dan media akan terhapus permanen.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/events?eventId=${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete event');

      // Reload events
      const eventsRes = await fetch('/api/events?showDrafts=true');
      const eventsData = await eventsRes.json();
      onEventsChange(Array.isArray(eventsData) ? eventsData : []);
      await refreshEvents(true);

      alert(`Event "${name}" berhasil dihapus.`);
    } catch (error: any) {
      alert(error.message || 'Failed to delete event');
    }
  };

  const clearForm = () => {
    setShowEventForm(false);
    setNewEventName("");
    setNewEventDate("");
    setNewEventLocation("");
    setNewEventLatitude("");
    setNewEventLongitude("");
    setNewEventDescription("");
    setNewEventActive(true);
    setNewEventIsDraft(false);
    setNewEventPublishAt('');
  };

  // Helper to select an event (sets state + URL param)
  const selectEvent = (evt: any | null) => {
    setSelectedEvent(evt);
    if (evt) {
      setSearchParams({ eventId: evt.id }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleBackFromDetail = async () => {
    selectEvent(null);
    // Refresh events list
    const eventsRes = await fetch('/api/events?showDrafts=true');
    const eventsData = await eventsRes.json();
    onEventsChange(Array.isArray(eventsData) ? eventsData : []);
    await refreshEvents(true);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(events.length / itemsPerPage);
  const currentEvents = events.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Show loading state while restoring event from URL
  if (loadingEvent) {
    return <div className="text-center py-8">Loading event...</div>;
  }

  // Show event detail page if an event is selected
  if (selectedEvent) {
    return (
      <EventDetailPage
        eventId={selectedEvent.id}
        eventSlug={selectedEvent.slug}
        eventName={selectedEvent.name}
        onBack={handleBackFromDetail}
      />
    );
  }

  return (
    <>
      {/* Manage Events */}
      <div className="card flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="section-title">Manage Events</h2>
            <div className="subtle">Create and manage multiple race events.</div>
          </div>
          <button className="btn w-full sm:w-auto" onClick={() => setShowEventForm(!showEventForm)}>
            {showEventForm ? "Cancel" : "+ Create Event"}
          </button>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-400 rounded text-blue-900 text-sm mb-4">
          <strong>Info:</strong> Setiap event memiliki kategori dan data CSV sendiri.
          Pilih event dari data table di bawah untuk mengelola event tersebut.
        </div>

        {showEventForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block mb-2 font-medium text-sm">Event Name</label>
                <input
                  className="search w-full"
                  placeholder="e.g., Jakarta Marathon 2025"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                />
              </div>
              <div>
                <label className="block mb-2 font-medium text-sm">Event Date</label>
                <input
                  type="date"
                  className="search w-full"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block mb-2 font-medium text-sm">Location</label>
                <input
                  className="search w-full"
                  placeholder="e.g., Jakarta, Indonesia"
                  value={newEventLocation}
                  onChange={(e) => setNewEventLocation(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block mb-2 font-medium text-sm">
                  Coordinates (Optional)
                </label>
                <div className="text-xs text-gray-500 mb-2">
                  For accurate map placement, enter coordinates from Google Maps.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="search w-full"
                    placeholder="Latitude"
                    value={newEventLatitude}
                    onChange={(e) => setNewEventLatitude(e.target.value)}
                  />
                  <input
                    className="search w-full"
                    placeholder="Longitude"
                    value={newEventLongitude}
                    onChange={(e) => setNewEventLongitude(e.target.value)}
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block mb-2 font-medium text-sm">Description</label>
                <textarea
                  className="search w-full min-h-[80px]"
                  placeholder="Brief description of the event..."
                  value={newEventDescription}
                  onChange={(e) => setNewEventDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="block mb-2 font-medium text-sm">Event Status</label>
                <select
                  className="search w-full"
                  value={newEventStatus}
                  onChange={(e) => setNewEventStatus(e.target.value as EventStatus)}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex items-end gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newEventActive}
                    onChange={(e) => setNewEventActive(e.target.checked)}
                  />
                  <span className="text-sm">Event is active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newEventIsDraft}
                    onChange={(e) => setNewEventIsDraft(e.target.checked)}
                  />
                  <span className="text-sm">Save as Draft</span>
                </label>
              </div>
              {newEventIsDraft && (
                <div>
                  <label className="block mb-2 font-medium text-sm">Publish Date (Optional)</label>
                  <input
                    type="datetime-local"
                    className="search w-full"
                    value={newEventPublishAt}
                    onChange={(e) => setNewEventPublishAt(e.target.value)}
                  />
                  <div className="text-[10px] text-gray-500 mt-1">Biarkan kosong untuk publish manual.</div>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <button className="btn w-full sm:w-auto" onClick={handleCreateEvent}>
                Create Event
              </button>
              <button className="btn ghost w-full sm:w-auto" onClick={clearForm}>
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Table Container - Flex grow to fill space */}
        <div className="flex-1 overflow-auto">
          {/* Desktop Table - hidden on mobile */}
          <div className="hidden md:block table-wrap">
            <table className="f1-table compact">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Date</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Reg</th>
                  <th>Pub</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty py-20">No events found</td>
                  </tr>
                ) : (
                  currentEvents.map((evt) => (
                    <tr key={evt.id} className="row-hover">
                      <td className="name-cell font-bold">{evt.name}</td>
                      <td className="mono text-xs">{evt.eventDate ? new Date(evt.eventDate).toLocaleDateString() : (evt.date || '-')}</td>
                      <td className="text-sm">{evt.location || "-"}</td>
                      <td>
                        <select
                          className="search"
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            border: '1px solid #e5e7eb',
                            background: getStatusColor(evt.status),
                            color: getStatusTextColor(evt.status),
                            cursor: 'pointer',
                          }}
                          value={evt.status || 'upcoming'}
                          onChange={(e) => handleStatusChange(evt.id, e.target.value as EventStatus)}
                          disabled={updatingStatus === evt.id}
                        >
                          <option value="upcoming">Upcoming</option>
                          <option value="ongoing">Ongoing</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                      <td>
                        <div className="font-bold text-gray-700 text-sm">
                          {evt.participantCount || 0}
                        </div>
                      </td>
                      <td>
                        {evt.isDraft ? (
                          <span className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded font-bold uppercase">Draft</span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] bg-black text-white rounded font-bold uppercase text-xs">Live</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            className="btn sm"
                            onClick={() => selectEvent(evt)}
                          >
                            Manage
                          </button>
                          <button
                            className="btn ghost sm"
                            onClick={() => window.open(`/event/${evt.slug}`, '_blank')}
                          >
                            View
                          </button>
                          <button
                            className="btn sm"
                            style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none' }}
                            onClick={() => handleDeleteEvent(evt.id, evt.name)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards - visible only on mobile */}
          <div className="md:hidden space-y-3">
            {currentEvents.length === 0 ? (
              <div className="text-center text-gray-500 py-12">No events found</div>
            ) : (
              currentEvents.map((evt) => (
                <div key={evt.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{evt.name}</h3>
                      <p className="text-sm text-gray-500">{evt.location || "No location"}</p>
                    </div>
                    <span
                      className="px-2 py-1 rounded-full text-[10px] font-bold uppercase"
                      style={{
                        background: getStatusColor(evt.status),
                        color: getStatusTextColor(evt.status),
                      }}
                    >
                      {evt.status || 'upcoming'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-3 text-sm text-gray-600">
                    <span className="mono text-xs">
                      {evt.eventDate ? new Date(evt.eventDate).toLocaleDateString() : (evt.date || 'No date')}
                    </span>
                    <span className="font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-xs">
                      {evt.participantCount || 0} Reg
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <select
                      className="search w-full text-sm"
                      value={evt.status || 'upcoming'}
                      onChange={(e) => handleStatusChange(evt.id, e.target.value as EventStatus)}
                      disabled={updatingStatus === evt.id}
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        className="btn flex-1 sm"
                        onClick={() => selectEvent(evt)}
                      >
                        Manage
                      </button>
                      <button
                        className="btn ghost flex-1 sm"
                        onClick={() => window.open(`/event/${evt.slug}`, '_blank')}
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-auto">
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, events.length)}</span> of <span className="font-medium">{events.length}</span> events
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
      </div>
    </>
  );
}
