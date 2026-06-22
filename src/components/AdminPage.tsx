import { useEffect, useMemo, useState } from "react";
import type { LeaderRow } from "./LeaderboardTable";
import { DEFAULT_EVENT_TITLE, LS_DATA_VERSION, LS_EVENT_TITLE, type CsvKind, getCategoriesForEvent } from "../lib/config";
import { putCsvFile, deleteCsvFile, listCsvMeta } from "../lib/idb";
import { parseCsv } from "../lib/csvParse";
import CategoryManager from "./CategoryManager";
import { uploadBannerViaApi } from "../lib/storage";
import { useEvent } from "../contexts/EventContext";
import BackupsPage from "./admin/pages/BackupsPage";

const ADMIN_USER = "izbat@izbat.org";
const ADMIN_PASS = "12345678";

const LS_AUTH = "imr_admin_authed";
const LS_CUTOFF = "imr_cutoff_ms";
const LS_DQ = "imr_dq_map";
const LS_CAT_START = "imr_cat_start_raw";

function loadAuth() {
  return localStorage.getItem(LS_AUTH) === "true";
}
function saveAuth(v: boolean) {
  localStorage.setItem(LS_AUTH, v ? "true" : "false");
}

function loadCutoffMs(): number | null {
  const v = localStorage.getItem(LS_CUTOFF);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function saveCutoffMs(ms: number | null) {
  if (ms == null) localStorage.removeItem(LS_CUTOFF);
  else localStorage.setItem(LS_CUTOFF, String(ms));
}

function loadDQMap(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(LS_DQ) || "{}");
  } catch {
    return {};
  }
}
function saveDQMap(map: Record<string, boolean>) {
  localStorage.setItem(LS_DQ, JSON.stringify(map));
}

function loadCatStartMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LS_CAT_START) || "{}");
  } catch {
    return {};
  }
}
function saveCatStartMap(map: Record<string, string>) {
  localStorage.setItem(LS_CAT_START, JSON.stringify(map));
}

type AdminSection = 'overview' | 'csv' | 'banners' | 'categories' | 'timing' | 'dsq' | 'events' | 'backups';

import { useSearchParams } from "react-router-dom";

export default function AdminPage({
  allRows,
  onConfigChanged,
  eventId,
}: {
  allRows: LeaderRow[];
  onConfigChanged: () => void;
  eventId?: string;
}) {
  const { refreshEvents } = useEvent();
  const [searchParams, setSearchParams] = useSearchParams();
  const [authed, setAuthed] = useState(loadAuth());
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  
  const activeSectionFromUrl = searchParams.get('section') as AdminSection;
  const initialSection = activeSectionFromUrl || (localStorage.getItem('admin_main_section') as AdminSection) || 'overview';
  
  const [activeSection, setActiveSectionState] = useState<AdminSection>(initialSection);

  const setActiveSection = (section: AdminSection) => {
    setActiveSectionState(section);
    setSearchParams(prev => { prev.set('section', section); return prev; }, { replace: true });
  };

  useEffect(() => {
    localStorage.setItem('admin_main_section', activeSection);
    // ensure URL has it too
    if (searchParams.get('section') !== activeSection) {
      setSearchParams(prev => { prev.set('section', activeSection); return prev; }, { replace: true });
    }
  }, [activeSection, searchParams, setSearchParams]);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [cutoffHours, setCutoffHours] = useState(() => {
    const ms = loadCutoffMs();
    if (!ms) return "";
    return String(ms / 3600000);
  });

  const [q, setQ] = useState("");
  const [dqMap, setDqMap] = useState<Record<string, boolean>>(loadDQMap());
  const [catStart, setCatStart] = useState<Record<string, string>>(
    loadCatStartMap()
  );

  const [eventTitle, setEventTitle] = useState<string>(() =>
    localStorage.getItem(LS_EVENT_TITLE) || DEFAULT_EVENT_TITLE
  );

  const [categories, setCategories] = useState<string[]>([]);

  // Event management state
  const [events, setEvents] = useState<any[]>([]);
  const [_showEventForm, setShowEventForm] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventLatitude, setNewEventLatitude] = useState('');
  const [newEventLongitude, setNewEventLongitude] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const newEventActive = true;

  // Banner management state
  const [banners, setBanners] = useState<any[]>([]);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerAlt, setBannerAlt] = useState('');
  const [bannerOrder, setBannerOrder] = useState(0);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [csvMeta, setCsvMeta] = useState<
    Array<{ key: CsvKind; filename: string; updatedAt: number; rows: number }>
  >([]);

  const bumpDataVersion = () => {
    localStorage.setItem(LS_DATA_VERSION, String(Date.now()));
  };

  useEffect(() => {
    (async () => {
      try {
        const meta = await listCsvMeta(eventId);
        setCsvMeta(meta as any);
      } catch {
      }

      // Load categories for this event
      if (eventId) {
        try {
          const cats = await getCategoriesForEvent(eventId);
          setCategories(cats);
        } catch (error) {
        }
      }

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
      try {
        const res = await fetch('/api/banners');
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
    })();
  }, [authed, eventId]);

  const refreshCsvMeta = async () => {
    try {
      const meta = await listCsvMeta(eventId);
      setCsvMeta(meta as any);
    } catch (error) {
    }
  };

  const saveEventTitle = async () => {
    const t = (eventTitle || "").trim();
    localStorage.setItem(LS_EVENT_TITLE, t || DEFAULT_EVENT_TITLE);
    bumpDataVersion();
    onConfigChanged();
    alert("Judul event berhasil diperbarui");
  };

  const uploadCsv = async (kind: CsvKind, file: File) => {
    const text = await file.text();
    const grid = parseCsv(text);

    if (!grid || grid.length === 0) {
      alert(`CSV '${kind}': File kosong atau tidak valid.`);
      return;
    }

    const headers = (grid[0] || []).map((x) => String(x || "").trim());

    // Normalize headers untuk matching (sama seperti di data.ts)
    function norm(s: string) {
      return String(s || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/\n/g, " ")
        .trim();
    }

    const headersNorm = headers.map(norm);

    // Menggunakan headerAliases yang sama dengan data.ts
    const headerAliases: Record<string, string[]> = {
      epc: ["epc", "uid", "tag", "rfid", "chip epc", "epc code"],
      bib: ["bib", "no bib", "bib number", "race bib", "nomor bib", "no. bib"],
      name: ["nama lengkap", "full name", "name", "nama", "participant name"],
      gender: ["jenis kelamin", "gender", "sex", "jk", "kelamin"],
      category: ["kategori", "category", "kelas", "class"],
      times: ["times", "time", "timestamp", "start time", "finish time", "jam", "checkpoint time", "cp time"],
    };

    // Validasi untuk Master CSV
    if (kind === "master") {
      const epcAliases = headerAliases.epc.map(norm);
      const hasEpc = headersNorm.some((h) => epcAliases.includes(h));

      const bibAliases = headerAliases.bib.map(norm);
      const hasBib = headersNorm.some((h) => bibAliases.includes(h));

      const nameAliases = headerAliases.name.map(norm);
      const hasName = headersNorm.some((h) => nameAliases.includes(h));

      if (!hasEpc && !hasBib && !hasName) {
        alert(
          `CSV 'master': Kolom wajib tidak ditemukan.\n` +
            `Harap ada salah satu dari: EPC/UID/TAG, BIB, atau NAME.\n` +
            `Kolom saat ini: ${headers.join(", ")}`
        );
        return;
      }
    }

    // Validasi untuk Start/Finish/Checkpoint CSV
    if (kind === "start" || kind === "finish" || kind === "checkpoint") {
      const epcAliases = headerAliases.epc.map(norm);
      const hasEpc = headersNorm.some((h) => epcAliases.includes(h));

      const timeAliases = headerAliases.times.map(norm);
      const hasTime = headersNorm.some((h) => timeAliases.includes(h));

      if (!hasEpc || !hasTime) {
        alert(
          `CSV '${kind}': Kolom wajib tidak lengkap.\n` +
            `Harap ada kolom: EPC/UID/TAG dan TIME/TIMESTAMP.\n` +
            `Kolom saat ini: ${headers.join(", ")}`
        );
        return;
      }
    }

    await putCsvFile({
      kind,
      text,
      filename: file.name,
      rows: grid.length - 1,
      eventId,
    });
    bumpDataVersion();
    await refreshCsvMeta();
    alert(`CSV '${kind}' berhasil diupload!`);
  };

  const deleteCsv = async (kind: CsvKind) => {
    if (!confirm(`Yakin hapus CSV '${kind}'?`)) return;
    await deleteCsvFile(kind, eventId);
    bumpDataVersion();
    await refreshCsvMeta();
  };

  const handleBannerUpload = async () => {
    if (!bannerFile) {
      alert('Pilih file banner terlebih dahulu');
      return;
    }

    setUploadingBanner(true);
    try {
      await uploadBannerViaApi(eventId || 'default', bannerFile, bannerAlt, bannerOrder);
      alert('Banner berhasil diupload!');
      setBannerFile(null);
      setBannerAlt('');
      setBannerOrder(0);

      // Refresh banners
      try {
        const res = await fetch('/api/banners');
        if (res.ok) {
          const data = await res.json();
          setBanners(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to refresh banners:', error);
      }
    } catch (error) {
      alert('Gagal mengupload banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Yakin hapus banner ini?')) return;

    try {
      const res = await fetch(`/api/banner-delete/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Banner berhasil dihapus');
        // Refresh banners
        try {
          const bannersRes = await fetch('/api/banners');
          if (bannersRes.ok) {
            const data = await bannersRes.json();
            setBanners(Array.isArray(data) ? data : []);
          }
        } catch (error) {
          console.error('Failed to refresh banners:', error);
        }
      } else {
        alert('Gagal menghapus banner');
      }
    } catch (error) {
      alert('Gagal menghapus banner');
    }
  };

  const handleToggleBannerActive = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/banners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active })
      });

      if (res.ok) {
        // Refresh banners
        try {
          const bannersRes = await fetch('/api/banners');
          if (bannersRes.ok) {
            const data = await bannersRes.json();
            setBanners(Array.isArray(data) ? data : []);
          }
        } catch (error) {
          console.error('Failed to refresh banners:', error);
        }
      }
    } catch (error) {
      alert('Gagal update banner');
    }
  };

  const handleCreateEvent = async () => {
    if (!newEventName || !newEventDate) {
      alert('Nama event dan tanggal wajib diisi');
      return;
    }

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEventName,
          date: newEventDate,
          location: newEventLocation,
          latitude: newEventLatitude ? parseFloat(newEventLatitude) : undefined,
          longitude: newEventLongitude ? parseFloat(newEventLongitude) : undefined,
          description: newEventDescription,
          status: newEventActive ? 'upcoming' : 'completed'
        })
      });

      if (res.ok) {
        alert('Event berhasil dibuat!');
        setShowEventForm(false);
        setNewEventName('');
        setNewEventDate('');
        setNewEventLocation('');
        setNewEventLatitude('');
        setNewEventLongitude('');
        setNewEventDescription('');

        // Refresh events
        const eventsRes = await fetch('/api/events');
        const eventsData = await eventsRes.json();
        setEvents(eventsData);

        refreshEvents();
      } else {
        alert('Gagal membuat event');
      }
    } catch (error) {
      alert('Gagal membuat event');
    }
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return allRows;
    return allRows.filter((r) => String(r.bib).toLowerCase().includes(query));
  }, [q, allRows]);

  // Login form
  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-3xl">B</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Admin Login</h2>
            <p className="text-gray-600 mt-2">BIP Runner Dashboard</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="admin@biprunner.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (() => {
                  if (user === ADMIN_USER && pass === ADMIN_PASS) {
                    saveAuth(true);
                    setAuthed(true);
                  } else {
                    alert("Email atau password salah!");
                  }
                })()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            <button
              onClick={() => {
                if (user === ADMIN_USER && pass === ADMIN_PASS) {
                  saveAuth(true);
                  setAuthed(true);
                } else {
                  alert("Email atau password salah!");
                }
              }}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin min-h-screen bg-gray-50 flex">
      {/* Hamburger Toggle (Mobile Only) */}
      <button
        className="hamburger-toggle lg:hidden"
        onClick={() => setSidebarOpen(true)}
        aria-label="Toggle sidebar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Sidebar Backdrop */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`admin-sidebar ${sidebarOpen ? 'mobile-visible' : 'mobile-hidden'} lg:transform-none`}
      >
        {/* Logo/Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="sidebar-logo-text">Admin Panel</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <button
              onClick={() => { setActiveSection('overview'); setSidebarOpen(false); }}
              className={`sidebar-menu-item ${activeSection === 'overview' ? 'active' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              <span>Overview</span>
            </button>
          </div>

          <div className="sidebar-section">
            <button
              onClick={() => { setActiveSection('events'); setSidebarOpen(false); }}
              className={`sidebar-menu-item ${activeSection === 'events' ? 'active' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              <span>Events</span>
            </button>
          </div>

          <div className="sidebar-section">
            <button
              onClick={() => { setActiveSection('csv'); setSidebarOpen(false); }}
              className={`sidebar-menu-item ${activeSection === 'csv' ? 'active' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
              </svg>
              <span>Data Upload</span>
            </button>
          </div>

          <div className="sidebar-section">
            <button
              onClick={() => { setActiveSection('banners'); setSidebarOpen(false); }}
              className={`sidebar-menu-item ${activeSection === 'banners' ? 'active' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <span>Banners</span>
            </button>
          </div>

          <div className="sidebar-section">
            <button
              onClick={() => { setActiveSection('categories'); setSidebarOpen(false); }}
              className={`sidebar-menu-item ${activeSection === 'categories' ? 'active' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125 1.125Z" />
              </svg>
              <span>Categories</span>
            </button>
          </div>

          <div className="sidebar-section">
            <button
              onClick={() => { setActiveSection('timing'); setSidebarOpen(false); }}
              className={`sidebar-menu-item ${activeSection === 'timing' ? 'active' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <span>Timing Rules</span>
            </button>
          </div>

          <div className="sidebar-section">
            <button
              onClick={() => { setActiveSection('dsq'); setSidebarOpen(false); }}
              className={`sidebar-menu-item ${activeSection === 'dsq' ? 'active' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <span>DQ / DNF</span>
            </button>
          </div>

          <div className="sidebar-section">
            <button
              onClick={() => { setActiveSection('backups'); setSidebarOpen(false); }}
              className={`sidebar-menu-item ${activeSection === 'backups' ? 'active' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75" />
              </svg>
              <span>Backups</span>
            </button>
          </div>
        </nav>

        {/* User Profile Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">A</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">Admin</div>
              <div className="sidebar-user-email">admin@biprunner.com</div>
            </div>
            <button
              className="sidebar-logout-btn"
              onClick={() => {
                saveAuth(false);
                setAuthed(false);
                window.location.reload();
              }}
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-content">
        <div className="p-6 lg:p-8 max-w-6xl">
          {activeSection === 'overview' && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard Overview</h1>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Events</p>
                  <p className="text-3xl font-bold text-gray-900">{events.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Participants</p>
                  <p className="text-3xl font-bold text-gray-900">{allRows.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <p className="text-sm font-medium text-gray-600 mb-1">Categories</p>
                  <p className="text-3xl font-bold text-gray-900">{categories.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <p className="text-sm font-medium text-gray-600 mb-1">Active Banners</p>
                  <p className="text-3xl font-bold text-gray-900">{banners.filter(b => b.active).length}</p>
                </div>
              </div>

              <div className="card">
                <h2 className="text-2xl font-bold mb-4">Event Settings</h2>
                <div className="space-y-4">
                  {eventId && eventId !== 'default' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Event ID</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-sm font-mono text-gray-800 select-all">{eventId}</code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(eventId);
                            alert("Event ID berhasil disalin!");
                          }}
                          className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                          title="Copy Event ID"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Title</label>
                    <input
                      type="text"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={saveEventTitle}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                  >
                    Save Title
                  </button>
                </div>
              </div>
            </>
          )}

          {activeSection === 'events' && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Events Management</h1>

              <div className="card mb-6">
                <h2 className="text-xl font-bold mb-4">Create New Event</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Name</label>
                    <input
                      type="text"
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      value={newEventLocation}
                      onChange={(e) => setNewEventLocation(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={newEventLatitude}
                      onChange={(e) => setNewEventLatitude(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={newEventLongitude}
                      onChange={(e) => setNewEventLongitude(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={newEventDescription}
                      onChange={(e) => setNewEventDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleCreateEvent}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                  >
                    Create Event
                  </button>
                  <button
                    onClick={() => setShowEventForm(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div className="card">
                <h2 className="text-xl font-bold mb-4">All Events ({events.length})</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Event ID</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((event) => (
                        <tr key={event.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{event.name}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-600">{event.id}</code>
                              <button onClick={() => { navigator.clipboard.writeText(event.id); alert("ID disalin"); }} className="text-blue-600 hover:text-blue-800 transition-colors" title="Copy Event ID">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                                </svg>
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4">{event.date || '-'}</td>
                          <td className="py-3 px-4">{event.location || '-'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              event.status === 'ongoing' ? 'bg-green-100 text-green-700' :
                              event.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {event.status === 'ongoing' ? 'LIVE' : event.status === 'completed' ? 'SELESAI' : 'SEGERA'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeSection === 'csv' && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Data Upload</h1>

              <div className="card mb-6">
                <h2 className="text-xl font-bold mb-4">Upload CSV Files</h2>
                <p className="text-gray-600 mb-4">
                  Upload Master CSV (wajib), Start CSV (opsional), Finish CSV (wajib), Checkpoint CSV (opsional).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(['master', 'start', 'finish', 'checkpoint'] as const).map((kind) => {
                    const meta = csvMeta.find((m) => m.key === kind);
                    return (
                      <div key={kind} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-bold text-gray-900 capitalize mb-2">{kind}</h3>
                        {meta ? (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600 line-clamp-1">{meta.filename}</p>
                            <p className="text-xs text-gray-500">{meta.rows} rows</p>
                            <button
                              onClick={() => deleteCsv(kind)}
                              className="w-full px-3 py-2 bg-red-50 text-red-600 rounded font-medium text-sm hover:bg-red-100 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <label className="block">
                            <span className="w-full px-3 py-2 bg-gray-50 text-gray-600 rounded font-medium text-sm text-center block cursor-pointer hover:bg-gray-100 transition-colors">
                              Choose File
                            </span>
                            <input
                              type="file"
                              accept=".csv"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadCsv(kind, file);
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card">
                <h2 className="text-xl font-bold mb-4">File Upload Status</h2>
                <div className="space-y-2">
                  {csvMeta.length === 0 ? (
                    <p className="text-gray-500">Belum ada file CSV diupload.</p>
                  ) : (
                    csvMeta.map((m) => (
                      <div key={m.key} className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-gray-900 capitalize">{m.key}</p>
                          <p className="text-sm text-gray-600">{m.filename}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{m.rows} rows</p>
                          <p className="text-xs text-gray-500">
                            {new Date(m.updatedAt).toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {activeSection === 'banners' && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Banner Management</h1>

              <div className="card mb-6">
                <h2 className="text-xl font-bold mb-4">Upload New Banner</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Banner Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Alt Text</label>
                    <input
                      type="text"
                      value={bannerAlt}
                      onChange={(e) => setBannerAlt(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      placeholder="Description for accessibility"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                    <input
                      type="number"
                      value={bannerOrder}
                      onChange={(e) => setBannerOrder(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleBannerUpload}
                    disabled={uploadingBanner}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingBanner ? 'Uploading...' : 'Upload Banner'}
                  </button>
                </div>
              </div>

              <div className="card">
                <h2 className="text-xl font-bold mb-4">All Banners ({banners.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {banners.map((banner) => (
                    <div key={banner.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={banner.url}
                        alt={banner.alt}
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-4">
                        <p className="text-sm text-gray-600 mb-2">{banner.alt || 'No description'}</p>
                        <p className="text-xs text-gray-500 mb-3">Order: {banner.order}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleBannerActive(banner.id, banner.active)}
                            className={`flex-1 px-3 py-2 rounded font-medium text-sm transition-colors ${
                              banner.active
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {banner.active ? 'Active' : 'Inactive'}
                          </button>
                          <button
                            onClick={() => handleDeleteBanner(banner.id)}
                            className="px-3 py-2 bg-red-50 text-red-600 rounded font-medium text-sm hover:bg-red-100 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeSection === 'categories' && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Category Management</h1>
              <CategoryManager
                eventId={eventId || 'default'}
                onCategoriesChange={(newCats: string[]) => {
                  setCategories(newCats);
                  onConfigChanged();
                }}
              />
            </>
          )}

          {activeSection === 'timing' && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Timing Configuration</h1>

              <div className="card mb-6">
                <h2 className="text-xl font-bold mb-4">Cut-off Time (DNF)</h2>
                <p className="text-gray-600 mb-4">
                  Set waktu maksimum (dalam jam). Peserta yang melebihi waktu ini akan ditandai sebagai DNF (Did Not Finish).
                </p>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cut-off (jam)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={cutoffHours}
                      onChange={(e) => setCutoffHours(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const hours = parseFloat(cutoffHours);
                      if (Number.isFinite(hours) && hours > 0) {
                        saveCutoffMs(hours * 3600000);
                        bumpDataVersion();
                        onConfigChanged();
                        alert("Cut-off time berhasil disimpan!");
                      } else {
                        saveCutoffMs(null);
                        bumpDataVersion();
                        onConfigChanged();
                        alert("Cut-off time berhasil dihapus!");
                      }
                    }}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="card">
                <h2 className="text-xl font-bold mb-4">Category Start Times</h2>
                <p className="text-gray-600 mb-4">
                  Set waktu start global per kategori (format: YYYY-MM-DD HH:MM:SS). Kosongkan untuk gunakan start time individual dari CSV.
                </p>
                <div className="space-y-4">
                  {categories.map((cat) => (
                    <div key={cat}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{cat}</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={catStart[cat] || ''}
                          onChange={(e) => setCatStart(prev => ({ ...prev, [cat]: e.target.value }))}
                          placeholder="YYYY-MM-DD HH:MM:SS"
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        />
                        <button
                          onClick={() => {
                            saveCatStartMap(catStart);
                            bumpDataVersion();
                            onConfigChanged();
                            alert("Start times berhasil disimpan!");
                          }}
                          className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeSection === 'dsq' && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Disqualification (DQ)</h1>

              <div className="card">
                <p className="text-gray-600 mb-4">
                  Masukkan nomor BIB untuk melakukan DSQ (disqualification). Peserta yang di-DQ tidak akan ditampilkan di leaderboard.
                </p>

                <div className="flex gap-4 mb-6">
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search NO BIB..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">BIB</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Time</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => {
                        const isDQ = !!dqMap[r.epc];
                        return (
                          <tr key={r.epc} className={`border-t border-gray-200 ${isDQ ? 'bg-red-50' : ''}`}>
                            <td className="px-4 py-3 font-medium">{r.bib}</td>
                            <td className="px-4 py-3">{r.name}</td>
                            <td className="px-4 py-3">{r.totalTimeDisplay}</td>
                            <td className="px-4 py-3">
                              {isDQ ? (
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">DSQ</span>
                              ) : (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Active</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  const newMap = { ...dqMap, [r.epc]: !isDQ };
                                  setDqMap(newMap);
                                  saveDQMap(newMap);
                                  bumpDataVersion();
                                  onConfigChanged();
                                }}
                                className={`px-3 py-1 rounded font-medium text-sm transition-colors ${
                                  isDQ
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                              >
                                {isDQ ? 'Unduh' : 'DSQ'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                            No data found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Info:</strong> Total {Object.values(dqMap).filter(Boolean).length} peserta di-DSQ.
                  </p>
                </div>
              </div>
            </>
          )}

          {activeSection === 'backups' && (
            <BackupsPage />
          )}
        </div>
      </main>
    </div>
  );
}
