import { useEffect, useState } from 'react';
import { useEvent } from '../../../contexts/EventContext';
import BannersPage from '../pages/BannersPage';

export default function BannersPageWrapper() {
  const { currentEvent } = useEvent();
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const eventId = currentEvent?.id || 'default';

  useEffect(() => {
    const loadBanners = async () => {
      try {
        const res = await fetch(`/api/banners?eventId=${eventId}`);
        if (res.ok) {
          const data = await res.json();
          setBanners(Array.isArray(data) ? data : []);
        } else {
          console.error('Failed to load banners:', res.status, res.statusText);
          setBanners([]);
        }
      } catch (error) {
        console.error('Failed to load banners:', error);
        setBanners([]);
      } finally {
        setLoading(false);
      }
    };
    loadBanners();
  }, [eventId]);

  const handleBannersChange = (newBanners: any[]) => {
    setBanners(newBanners);
  };

  if (loading) {
    return <div className="text-center py-8">Loading banners...</div>;
  }

  return (
    <BannersPage
      banners={banners}
      eventId={eventId}
      onBannersChange={handleBannersChange}
    />
  );
}
