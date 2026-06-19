import { useEffect, useState } from 'react';
import { useEvent } from '../../../contexts/EventContext';
import { CATEGORY_KEYS, getCategoriesForEvent, LS_DATA_VERSION } from '../../../lib/config';
import TimingPage from '../pages/TimingPage';

export default function TimingPageWrapper() {
  const { currentEvent } = useEvent();
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const eventId = currentEvent?.id || 'default';

  useEffect(() => {
    const loadCategories = async () => {
      try {
        if (eventId) {
          const cats = await getCategoriesForEvent(eventId);
          setCategories(cats);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, [eventId]);

  const handleConfigChanged = () => {
    localStorage.setItem(LS_DATA_VERSION, String(Date.now()));
    window.location.reload();
  };

  const handleDataVersionBump = () => {
    localStorage.setItem(LS_DATA_VERSION, String(Date.now()));
  };

  if (loading) {
    return <div className="text-center py-8">Loading categories...</div>;
  }

  return (
    <TimingPage
      categories={categories}
      eventId={currentEvent?.id || null}
      onConfigChanged={handleConfigChanged}
      onDataVersionBump={handleDataVersionBump}
    />
  );
}
