import React, { useState, useEffect, ReactNode } from 'react';
import { useEvent } from '../../contexts/EventContext';
import { DEFAULT_EVENT_TITLE, LS_EVENT_TITLE, LS_CUTOFF, LS_DQ, LS_CAT_START } from '../../lib/config';
import { listCsvMeta } from '../../lib/idb';

interface AdminDataProviderProps {
  children: ReactNode;
  eventId?: string;
  onConfigChanged: () => void;
}

export default function AdminDataProvider({ children, eventId, onConfigChanged }: AdminDataProviderProps) {
  const { events, refreshEvents } = useEvent();
  const [allRows] = useState<any[]>([]);
  const [eventTitle, setEventTitle] = useState(DEFAULT_EVENT_TITLE);
  const [banners, setBanners] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [csvMeta, setCsvMeta] = useState<any[]>([]);
  const [cutoffHours, setCutoffHours] = useState('');
  const [catStart, setCatStart] = useState<Record<string, string>>({});
  const [dqMap, setDqMap] = useState<Record<string, boolean>>({});

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      // Load event title
      const savedTitle = localStorage.getItem(LS_EVENT_TITLE);
      if (savedTitle) setEventTitle(savedTitle);

      // Load banners
      try {
        const res = await fetch('/api/banners');
        if (res.ok) {
          const data = await res.json();
          setBanners(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to load banners:', error);
      }

      // Load categories
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
      }

      // Load CSV metadata
      try {
        const meta = await listCsvMeta(eventId);
        setCsvMeta(meta as any);
      } catch (error) {
        console.error('Failed to load CSV metadata:', error);
      }

      // Load cutoff hours
      const cutoffMs = localStorage.getItem(LS_CUTOFF);
      if (cutoffMs) {
        const n = Number(cutoffMs);
        if (Number.isFinite(n)) {
          setCutoffHours(String(n / 3600000));
        }
      }

      // Load category start times
      try {
        const catStartData = JSON.parse(localStorage.getItem(LS_CAT_START) || '{}');
        setCatStart(catStartData);
      } catch (error) {
        console.error('Failed to load category start times:', error);
      }

      // Load DQ map
      try {
        const dqData = JSON.parse(localStorage.getItem(LS_DQ) || '{}');
        setDqMap(dqData);
      } catch (error) {
        console.error('Failed to load DQ map:', error);
      }
    };

    loadData();
  }, [eventId]);

  const handleConfigChanged = () => {
    onConfigChanged();
    // Reload data
    listCsvMeta(eventId).then(setCsvMeta).catch(console.error);
  };

  const handleDataVersionBump = () => {
    onConfigChanged();
  };

  // Pass all data and handlers to children via render prop
  return (
    <>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, {
            events,
            allRows,
            eventTitle,
            banners,
            categories,
            csvMeta,
            cutoffHours,
            catStart,
            dqMap,
            eventId,
            refreshEvents: () => {
              refreshEvents();
              handleConfigChanged();
            },
            onConfigChanged: handleConfigChanged,
            onDataVersionBump: handleDataVersionBump,
            onBannersChange: async () => {
              try {
                const res = await fetch('/api/banners');
                if (res.ok) {
                  const data = await res.json();
                  setBanners(Array.isArray(data) ? data : []);
                }
              } catch (error) {
                console.error('Failed to refresh banners:', error);
              }
            },
            onCategoriesChange: async () => {
              try {
                const res = await fetch('/api/categories');
                if (res.ok) {
                  const data = await res.json();
                  setCategories(Array.isArray(data) ? data : []);
                }
              } catch (error) {
                console.error('Failed to refresh categories:', error);
              }
            },
            onCsvChange: async () => {
              try {
                const meta = await listCsvMeta(eventId);
                setCsvMeta(meta as any);
              } catch (error) {
                console.error('Failed to refresh CSV metadata:', error);
              }
            },
            onCutoffHoursChange: (value: string) => setCutoffHours(value),
            onCatStartChange: (value: Record<string, string>) => setCatStart(value),
          });
        }
        return child;
      })}
    </>
  );
}
