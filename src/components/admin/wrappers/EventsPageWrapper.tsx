import { useEffect, useState } from 'react';
import { useEvent } from '../../../contexts/EventContext';
import EventsPage from '../pages/EventsPage';

export default function EventsPageWrapper() {
  const { events, refreshEvents } = useEvent();
  const [eventsData, setEventsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshEvents(true);
  }, []);

  useEffect(() => {
    setEventsData(events);
    setLoading(false);
  }, [events]);

  const handleEventsChange = (newEvents: any[]) => {
    setEventsData(newEvents);
    refreshEvents(true);
  };

  if (loading) {
    return <div className="text-center py-8">Loading events...</div>;
  }

  return (
    <EventsPage
      events={eventsData}
      onEventsChange={handleEventsChange}
    />
  );
}
