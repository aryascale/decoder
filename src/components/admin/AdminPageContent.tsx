import { useState, useEffect } from "react";
import type { LeaderRow } from "../LeaderboardTable";
import { CATEGORY_KEYS, type CsvKind, getCategoriesForEvent, LS_DATA_VERSION } from "../../lib/config";
import { listCsvMeta } from "../../lib/idb";
import { useEvent } from "../../contexts/EventContext";
import OverviewPage from "./pages/OverviewPage";
import EventsPage from "./pages/EventsPage";
import DataPage from "./pages/DataPage";
import BannersPage from "./pages/BannersPage";
import CategoriesPage from "./pages/CategoriesPage";
import TimingPage from "./pages/TimingPage";

interface AdminPageContentProps {
  activeSection: string;
  allRows: LeaderRow[];
  onConfigChanged: () => void;
  eventId?: string;
}

export default function AdminPageContent({ activeSection, allRows, onConfigChanged, eventId }: AdminPageContentProps) {
  const { refreshEvents } = useEvent();

  // Events state
  const [events, setEvents] = useState<any[]>([]);

  // Banners state
  const [banners, setBanners] = useState<any[]>([]);

  // Categories state
  const [categories, setCategories] = useState<string[]>([]);

  // CSV state
  const [csvMeta, setCsvMeta] = useState<
    Array<{ key: CsvKind; filename: string; updatedAt: number; rows: number }>
  >([]);

  // Data version bump helper
  const bumpDataVersion = () => {
    localStorage.setItem(LS_DATA_VERSION, String(Date.now()));
  };

  // Load initial data
  useEffect(() => {
    (async () => {
      // Load events
      try {
        const res = await fetch('/api/events');
        const data = await res.json();
        setEvents(data);
      } catch (error) {
        console.error('Failed to load events:', error);
        setEvents([]);
      }

      // Load banners
      if (eventId) {
        try {
          const res = await fetch(`/api/banners?eventId=${eventId}`);
          if (res.ok) {
            const data = await res.json();
            setBanners(Array.isArray(data) ? data : []);
          } else {
            setBanners([]);
          }
        } catch (error) {
          console.error('Failed to load banners:', error);
          setBanners([]);
        }
      }

      // Load categories for this event
      if (eventId) {
        try {
          const cats = await getCategoriesForEvent(eventId);
          setCategories(cats);
        } catch (error) {
          console.error('Failed to load categories:', error);
        }
      }

      // Load CSV metadata
      try {
        const meta = await listCsvMeta(eventId);
        setCsvMeta(meta as any);
      } catch (error) {
        console.error('Failed to load CSV metadata:', error);
      }
    })();
  }, [eventId]);

  const refreshCsvMeta = async () => {
    try {
      const meta = await listCsvMeta(eventId);
      setCsvMeta(meta as any);
    } catch (error) {
      console.error('Failed to refresh CSV metadata:', error);
    }
  };



  // Render the appropriate page based on activeSection
  switch (activeSection) {
    case 'overview':
      return (
        <OverviewPage
          allRows={allRows}
          eventId={eventId}
          onConfigChanged={onConfigChanged}
        />
      );

    case 'events':
      return (
        <EventsPage
          events={events}
          onEventsChange={async (newEvents) => {
            setEvents(newEvents);
            await refreshEvents();
            onConfigChanged();
          }}
        />
      );

    case 'csv':
      return (
        <DataPage
          csvMeta={csvMeta}
          eventId={eventId}
          onCsvChange={refreshCsvMeta}
          onDataVersionBump={bumpDataVersion}
          onConfigChanged={onConfigChanged}
        />
      );

    case 'banners':
      return (
        <BannersPage
          banners={banners}
          eventId={eventId}
          onBannersChange={(newBanners) => {
            setBanners(newBanners);
            onConfigChanged();
          }}
        />
      );

    case 'categories':
      return (
        <CategoriesPage
          categories={categories}
          eventId={eventId || 'default'}
          onConfigChanged={onConfigChanged}
          onCategoriesChange={(newCats) => {
            setCategories(newCats);
            onConfigChanged();
          }}
        />
      );

    case 'timing':
      return (
        <TimingPage
          categories={categories}
          eventId={eventId || null}
          onConfigChanged={onConfigChanged}
          onDataVersionBump={bumpDataVersion}
        />
      );

    default:
      return (
        <OverviewPage
          allRows={allRows}
          eventId={eventId}
          onConfigChanged={onConfigChanged}
        />
      );
  }
}
