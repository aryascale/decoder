import { useEffect, useRef, useState } from 'react';

interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  date?: string;
  status?: 'upcoming' | 'ongoing' | 'completed';
}

interface EventMapProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
}

export default function EventMap({ events, onEventClick: _onEventClick }: EventMapProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Map is ready, send events data
      if (event.data && event.data.type === 'MAP_READY') {
        setMapReady(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Send events to iframe when map is ready or events change
  useEffect(() => {
    if (mapReady && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'UPDATE_EVENTS',
        events: events.filter(e => e.latitude && e.longitude)
      }, '*');
    }
  }, [mapReady, events]);

  return (
    <div className="w-[1200px] h-[700px] rounded-lg overflow-hidden shadow-lg">
      <iframe
        ref={iframeRef}
        src="/map.html"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        title="Event Map - Indonesia"
        className="rounded-lg"
      />
    </div>
  );
}
