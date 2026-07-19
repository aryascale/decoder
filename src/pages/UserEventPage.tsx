import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LandingNavbar from "../components/landing/LandingNavbar";
import {
  Calendar,
  MapPin,
  Clock,
  ArrowLeft,
  ArrowRight,
  Mail,
  Phone,
  ChevronRight,
  Search,
  Users,
  Activity,
  Heart
} from "lucide-react";

interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string;
  eventDate?: string;
  location?: string;
  categories?: string[];
  status?: "upcoming" | "ongoing" | "completed";
  isActive?: boolean;
  bannerUrl?: string;
  content?: any;
  participantCount?: number;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Formatter to match "16. Jan - 2026" premium style
function formatPremiumDate(dateStr?: string) {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}. ${month} - ${year}`;
}

function formatDate(dateStr?: string, isTBA?: boolean) {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  if (isTBA) {
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Generate typical event times based on type
function getEventTime(event: Event) {
  const categories = event.categories || [];
  if (categories.includes('Cycling') || categories.includes('Marathon') || categories.includes('Half Marathon')) {
    return '06:00 AM - 11:00 AM';
  }
  return '07:00 AM - 10:00 AM';
}

const MOCK_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&fit=crop&q=80"
];

export default function UserEventPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Events");
  const [currentPage, setCurrentPage] = useState(1);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [catDropOpen, setCatDropOpen] = useState(false);
  const catDropRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catDropRef.current && !catDropRef.current.contains(e.target as Node)) {
        setCatDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const itemsPerPage = 3;

  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => {
        setEvents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filter logic: Search + Category
  const filtered = events.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.location || "").toLowerCase().includes(search.toLowerCase());

    let matchesCategory = false;
    if (activeCategory === "All Events") {
      matchesCategory = true;
    } else if (activeCategory === "Running") {
      matchesCategory = e.categories?.some(c => {
        const lower = c.toLowerCase();
        return lower.includes('run') || lower.includes('marathon') || lower.endsWith('k') || lower.includes('ultra');
      }) ?? false;
    } else if (activeCategory === "Cycling") {
      matchesCategory = e.categories?.some(c => {
        const lower = c.toLowerCase();
        return lower.includes('cycl') || lower.includes('ride') || lower.includes('fondo') || lower.includes('bike');
      }) ?? false;
    }

    return matchesSearch && matchesCategory;
  });

  // Fixed Event Types instead of extracting categories
  const categoriesList = [
    "All Events",
    "Running",
    "Cycling"
  ];

  // Upcoming events for the slider
  const upcomingEvents = events.filter((e) => e.status === "upcoming");
  const sliderEvents = upcomingEvents.length > 0 ? upcomingEvents : events;

  // Handle slider navigation
  const nextSlide = () => {
    setSliderIndex((prev) => (prev + 1) % sliderEvents.length);
  };
  const prevSlide = () => {
    setSliderIndex((prev) => (prev - 1 + sliderEvents.length) % sliderEvents.length);
  };

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeCategory]);

  // Auto-advance slider every 4.5s
  const [sliderPaused, setSliderPaused] = useState(false);
  useEffect(() => {
    if (sliderPaused || sliderEvents.length <= 1) return;
    const timer = setInterval(nextSlide, 4500);
    return () => clearInterval(timer);
  }, [sliderPaused, sliderEvents.length, sliderIndex]);

  const handleView = (slug: string) => {
    setNavigatingTo(slug);
    setTimeout(() => navigate(`/event/${slug}`), 800);
  };

  // Pagination slicing
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedEvents = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const customNavLinks = [
    { label: "Home", action: "navigate", to: "/" },
    { label: "About", action: "navigate", to: "/about" },
    { label: "Events", action: "navigate", to: "/event" },
  ];

  return (
    <>
      <LandingNavbar customLinks={customNavLinks} isDarkBg={true} />
      <div className="min-h-screen bg-[#F1F3F6]">

        {/* ================= HERO HEADER BANNER ================= */}
        <div className="relative pt-24 pb-20 md:py-32 bg-gradient-to-r from-slate-950 via-[#0B1220] to-slate-950 overflow-hidden text-center">
          {/* Spotlight glowing elements */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-red-500/8 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 right-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[140px]" />

          <div className="relative max-w-7xl mx-auto px-4 z-10 flex flex-col items-center">
            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase mb-4 drop-shadow-md">
              All Events
            </h1>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs md:text-sm font-semibold tracking-wider text-slate-400">
              <a href="/" className="hover:text-white transition-colors duration-200 uppercase">Home</a>
              <span className="text-slate-600">/</span>
              <span className="text-[#DC2626] uppercase">Events</span>
            </div>
          </div>
        </div>

        {/* ================= MAIN CONTAINER ================= */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 -mt-8 relative z-20">

          {/* ================= HERO SLIDER ================= */}
          {loading ? (
            <div className="w-full h-[300px] md:h-[450px] bg-slate-200 animate-pulse rounded-[32px] mb-8" />
          ) : sliderEvents.length > 0 ? (
            <div
              className="relative group/slider mb-6"
              onMouseEnter={() => setSliderPaused(true)}
              onMouseLeave={() => setSliderPaused(false)}
            >
              {/* ================= HERO SLIDER (Responsive SVG) ================= */}
              <div className="relative group/slider">
                <svg
                  viewBox="0 0 8631 4099"
                  xmlns="http://www.w3.org/2000/svg"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  className="w-full block"
                  style={{ minHeight: 220 }}
                >
                  <defs>
                    <linearGradient id="sliderImgGrad" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                      <stop offset="0%" stopColor="#0f172a" stopOpacity="0" />
                      <stop offset="35%" stopColor="#0f172a" stopOpacity="0.15" />
                      <stop offset="80%" stopColor="#0f172a" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
                    </linearGradient>

                    <clipPath id="notchCardShape">
                      <path d="M8320.5 10H310C144.315 10 10 144.315 10 310V3789C10 3954.69 144.315 4089 310 4089H3433.5C3545.06 4089 3635.5 3998.56 3635.5 3887C3635.5 3775.44 3725.94 3685 3837.5 3685H4832.5C4944.06 3685 5034.5 3775.44 5034.5 3887C5034.5 3998.56 5124.94 4089 5236.5 4089H8320.5C8486.19 4089 8620.5 3954.69 8620.5 3789V310C8620.5 144.315 8486.19 10 8320.5 10Z" />
                    </clipPath>
                  </defs>

                  <path
                    d="M8320.5 10H310C144.315 10 10 144.315 10 310V3789C10 3954.69 144.315 4089 310 4089H3433.5C3545.06 4089 3635.5 3998.56 3635.5 3887C3635.5 3775.44 3725.94 3685 3837.5 3685H4832.5C4944.06 3685 5034.5 3775.44 5034.5 3887C5034.5 3998.56 5124.94 4089 5236.5 4089H8320.5C8486.19 4089 8620.5 3954.69 8620.5 3789V310C8620.5 144.315 8486.19 10 8320.5 10Z"
                    fill="#0B1220"
                  />
                  <image
                    key={sliderIndex}
                    href={sliderEvents[sliderIndex]?.bannerUrl || "https://images.unsplash.com/photo-1552674605-15cff24c00e8?w=1200&q=80"}
                    x="0" y="0" width="8631" height="4099"
                    clipPath="url(#notchCardShape)"
                    preserveAspectRatio="xMidYMid slice"
                    style={{ opacity: 0.75 }}
                  />
                  <path
                    d="M8320.5 10H310C144.315 10 10 144.315 10 310V3789C10 3954.69 144.315 4089 310 4089H3433.5C3545.06 4089 3635.5 3998.56 3635.5 3887C3635.5 3775.44 3725.94 3685 3837.5 3685H4832.5C4944.06 3685 5034.5 3775.44 5034.5 3887C5034.5 3998.56 5124.94 4089 5236.5 4089H8320.5C8486.19 4089 8620.5 3954.69 8620.5 3789V310C8620.5 144.315 8486.19 10 8320.5 10Z"
                    fill="url(#sliderImgGrad)"
                  />
                  <path
                    d="M8320.5 10H310C144.315 10 10 144.315 10 310V3789C10 3954.69 144.315 4089 310 4089H3433.5C3545.06 4089 3635.5 3998.56 3635.5 3887C3635.5 3775.44 3725.94 3685 3837.5 3685H4832.5C4944.06 3685 5034.5 3775.44 5034.5 3887C5034.5 3998.56 5124.94 4089 5236.5 4089H8320.5C8486.19 4089 8620.5 3954.69 8620.5 3789V310C8620.5 144.315 8486.19 10 8320.5 10Z"
                    fill="none"
                    stroke="rgba(148,163,184,0.12)"
                    strokeWidth="20"
                  />
                </svg>

                <div
                  className="absolute inset-0 flex flex-col justify-end pointer-events-none pb-12 md:pb-[5%]"
                >
                  <div className="px-6 md:px-12 max-w-3xl pointer-events-auto pb-2">
                    <span className="inline-block bg-[#DC2626] text-white font-black text-[10px] md:text-xs tracking-widest uppercase px-3 py-1 md:px-4 md:py-1.5 rounded-full mb-3 md:mb-4 shadow-lg shadow-red-900/30">
                      {sliderEvents[sliderIndex]?.status === 'upcoming' ? 'Upcoming Event' : 'Featured Event'}
                    </span>
                    <h2
                      onClick={() => handleView(sliderEvents[sliderIndex]?.slug)}
                      className="text-2xl md:text-4xl lg:text-5xl font-black text-white leading-tight cursor-pointer hover:text-red-400 transition-colors duration-200 line-clamp-2 mb-3 drop-shadow"
                    >
                      {sliderEvents[sliderIndex]?.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm font-semibold text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#DC2626]" />
                        <span>{formatPremiumDate(sliderEvents[sliderIndex]?.eventDate)}</span>
                      </div>
                      {sliderEvents[sliderIndex]?.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-red-500" />
                          <span>{sliderEvents[sliderIndex]?.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-3 lg:gap-4 z-10 -bottom-[2.5%] lg:-bottom-[1.5%]"
                >
                  <button
                    onClick={prevSlide}
                    className="w-[42px] h-[42px] lg:w-[52px] lg:h-[52px] bg-white hover:bg-[#DC2626] text-slate-700 hover:text-white flex items-center justify-center rounded-full transition-all duration-200 shadow-lg hover:scale-105 active:scale-95 border border-slate-200 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="w-[42px] h-[42px] lg:w-[52px] lg:h-[52px] bg-white hover:bg-[#DC2626] text-slate-700 hover:text-white flex items-center justify-center rounded-full transition-all duration-200 shadow-lg hover:scale-105 active:scale-95 border border-slate-200 cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                </div>
              </div>


            </div>
          ) : null}

          {/* ================= SEARCH & CATEGORY FILTERS ================= */}
          <div className="bg-white border border-slate-100 rounded-[32px] px-6 py-3.5 shadow-sm mb-10 flex flex-col sm:flex-row items-center gap-3">

            {/* Custom Category Dropdown */}
            <div ref={catDropRef} className="relative w-full sm:w-56 shrink-0">
              <button
                onClick={() => setCatDropOpen(o => !o)}
                className={`w-full flex items-center justify-between gap-2 pl-5 pr-4 py-2.5 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer border ${
                  catDropOpen
                    ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-md shadow-red-500/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className="truncate">{activeCategory}</span>
                <ChevronRight
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    catDropOpen ? 'rotate-90 text-white' : 'rotate-90 text-slate-400'
                  }`}
                />
              </button>

              {catDropOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 py-1">
                  {categoriesList.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setActiveCategory(cat); setCatDropOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors duration-150 cursor-pointer ${
                        activeCategory === cat
                          ? 'bg-red-50 text-[#DC2626] font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden sm:block w-px h-8 bg-slate-100 shrink-0" />

            {/* Search Input */}
            <div className="relative w-full flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search events or locations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-full text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#DC2626] transition-all"
              />
            </div>
          </div>


          {/* ================= EVENTS HORIZONTAL LIST ================= */}
          <div className="space-y-6">
            {loading ? (
              // Skeleton UI
              [...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col md:flex-row bg-white border border-slate-100 rounded-3xl p-6 gap-6 animate-pulse">
                  <div className="w-full md:w-56 h-40 bg-slate-200 rounded-2xl shrink-0" />
                  <div className="flex-1 space-y-4 py-2">
                    <div className="h-4 bg-slate-200 rounded w-1/4" />
                    <div className="h-6 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                  </div>
                  <div className="w-full md:w-40 flex flex-col justify-between items-end gap-4 shrink-0">
                    <div className="h-10 bg-slate-200 rounded-full w-full" />
                    <div className="h-6 bg-slate-200 rounded-full w-2/3" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-100 rounded-[32px] shadow-sm">
                <div className="w-20 h-20 mx-auto mb-6 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                  <Calendar className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-800 mb-2">No Events Found</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto font-medium">
                  {search
                    ? `We couldn't find any events matching "${search}". Please try another search term.`
                    : "No events are available in this category at the moment. Please check back later!"}
                </p>
              </div>
            ) : (
              // Active Event Cards List
              paginatedEvents.map((event) => {
                const dateStr = formatPremiumDate(event.eventDate);
                const isUpcoming = event.status === "upcoming";

                // Determine mock runners label prefix
                const catLower = (event.categories || []).map(c => c.toLowerCase());
                const runnerLabel = catLower.some(c => c.includes('cycle') || c.includes('bike'))
                  ? 'Cyclists'
                  : catLower.some(c => c.includes('run') || c.includes('marathon'))
                    ? 'Runners'
                    : 'Partners';

                return (
                  <div
                    key={event.id}
                    onClick={() => handleView(event.slug)}
                    className="flex flex-col md:flex-row bg-white border border-slate-100 rounded-3xl p-4 md:p-6 shadow-sm hover:shadow-xl hover:border-red-100 hover:-translate-y-0.5 transition-all duration-300 gap-6 cursor-pointer group"
                  >
                    {/* Left: Thumbnail Image */}
                    <div className="w-full md:w-56 h-40 shrink-0 rounded-2xl overflow-hidden relative bg-slate-100 border border-slate-200/50">
                      {event.bannerUrl ? (
                        <img
                          src={event.bannerUrl}
                          alt={event.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 flex items-center justify-center p-4 text-center">
                          <span className="text-xs font-black text-white uppercase tracking-widest break-words leading-tight">{event.name}</span>
                        </div>
                      )}
                      {/* Floating status tag inside thumbnail */}
                      <span className={`absolute top-3 left-3 px-3 py-1 text-[9px] font-black tracking-widest uppercase rounded-full shadow ${isUpcoming ? "bg-[#DC2626] text-white" : "bg-slate-600 text-white"
                        }`}>
                        {event.status}
                      </span>
                    </div>

                    {/* Middle: Details */}
                    <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                      <div>
                        {/* Badges row */}
                        <div className="flex flex-wrap items-center gap-3 mb-2.5">
                          <span className="flex items-center gap-1 text-xs font-bold text-[#DC2626] uppercase tracking-widest bg-red-50 px-2.5 py-1 rounded-md">
                            <Calendar className="w-3.5 h-3.5" />
                            {dateStr}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-md">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {getEventTime(event)}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-extrabold text-stone-900 text-lg md:text-xl lg:text-2xl leading-snug group-hover:text-[#DC2626] transition-colors duration-200 mb-2 line-clamp-2">
                          {event.name}
                        </h3>

                        {/* Description (shorter view) */}
                        {event.description && (
                          <p className="text-slate-500 text-xs md:text-sm font-medium line-clamp-1 mb-3">
                            {event.description}
                          </p>
                        )}
                      </div>

                      {/* Location & Categories tags */}
                      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3 mt-3">
                        {event.location && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider min-w-0">
                            <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}

                        {/* Categories pills */}
                        <div className="flex flex-wrap gap-1.5">
                          {event.categories?.slice(0, 3).map((cat, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 border border-slate-200/50 rounded"
                            >
                              <Activity className="w-2.5 h-2.5 text-slate-400" />
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>


                  </div>
                );
              })
            )}
          </div>

          {/* ================= PAGINATION ================= */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12 md:mt-16">
              {/* Prev Button */}
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all duration-200 ${currentPage === 1
                    ? "border-slate-100 text-slate-300 cursor-not-allowed"
                    : "border-slate-200 text-slate-600 hover:bg-slate-100 hover:scale-105 active:scale-95 cursor-pointer"
                  }`}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Number buttons */}
              {Array.from({ length: totalPages }, (_, idx) => {
                const pageNum = idx + 1;
                const isActive = currentPage === pageNum;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-extrabold transition-all duration-200 cursor-pointer ${isActive
                        ? "bg-[#DC2626] text-white shadow-md shadow-red-500/25 border border-[#DC2626] scale-105"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Next Button */}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all duration-200 ${currentPage === totalPages
                    ? "border-slate-100 text-slate-300 cursor-not-allowed"
                    : "border-slate-200 text-slate-600 hover:bg-slate-100 hover:scale-105 active:scale-95 cursor-pointer"
                  }`}
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* ===================== EVENT STATS BANNER ================ */}
        {/* ======================================================== */}
        <div className="relative -mb-16 md:-mb-14 z-10 max-w-6xl mx-auto px-4 mt-20 md:mt-28">
          <div className="rounded-[28px] md:rounded-[36px] bg-gradient-to-r from-slate-950 via-[#0B1220] to-slate-950 p-6 md:p-10 shadow-2xl border border-slate-800/60 grid grid-cols-2 md:flex md:flex-row gap-8 md:gap-6 justify-around items-center text-center">

            {/* Stat 1: Total Events */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl md:text-4xl font-black text-white tabular-nums">
                {events.length}
              </span>
              <span className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase">Total Events</span>
            </div>

            <div className="hidden md:block w-px h-10 bg-slate-800" />

            {/* Stat 2: Upcoming */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl md:text-4xl font-black text-[#DC2626] tabular-nums">
                {events.filter(e => e.status === 'upcoming').length}
              </span>
              <span className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase">Upcoming</span>
            </div>

            <div className="hidden md:block w-px h-10 bg-slate-800" />

            {/* Stat 3: Completed */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl md:text-4xl font-black text-white tabular-nums">
                {events.filter(e => e.status === 'completed').length}
              </span>
              <span className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase">Completed</span>
            </div>

            <div className="hidden md:block w-px h-10 bg-slate-800" />

            {/* Stat 4: Cities */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl md:text-4xl font-black text-white tabular-nums">
                {new Set(events.map(e => e.location?.split(',').pop()?.trim()).filter(Boolean)).size}
              </span>
              <span className="text-[10px] md:text-xs font-black tracking-widest text-slate-400 uppercase">Cities</span>
            </div>

          </div>
        </div>


        {/* ===================== FOOTER MAIN ===================== */}
        <footer className="bg-white border-t border-gray-200 text-xs text-gray-500 pt-28 pb-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-8 text-left">
              <div className="flex flex-col space-y-2.5">
                <h5 className="font-semibold text-gray-900 mb-1">Platform</h5>
                <a onClick={() => navigate("/leaderboard")} className="hover:text-gray-900 hover:underline cursor-pointer transition-colors">Leaderboard</a>
                <a onClick={() => navigate("/event")} className="hover:text-gray-900 hover:underline cursor-pointer transition-colors">Search Events</a>
                <a href="#products" className="hover:text-gray-900 hover:underline transition-colors">Transponders</a>
                <a href="#features" className="hover:text-gray-900 hover:underline transition-colors">Features</a>
                <a href="#" onClick={(e) => { e.preventDefault(); alert("Feature coming soon!"); }} className="hover:text-gray-900 hover:underline transition-colors">Live Results</a>
              </div>
              <div className="flex flex-col space-y-2.5">
                <h5 className="font-semibold text-gray-900 mb-1">Company</h5>
                <a href="#about" className="hover:text-gray-900 hover:underline transition-colors">About IJT</a>
                <a href="#organizers" className="hover:text-gray-900 hover:underline transition-colors">For Organizers</a>
                <a href="#careers" className="hover:text-gray-900 hover:underline transition-colors">Careers</a>
                <a href="#contact" className="hover:text-gray-900 hover:underline transition-colors">Contact Us</a>
              </div>
              <div className="flex flex-col space-y-2.5">
                <h5 className="font-semibold text-gray-900 mb-1">Support</h5>
                <a href="#faq" className="hover:text-gray-900 hover:underline transition-colors">FAQ</a>
                <a href="#help-center" className="hover:text-gray-900 hover:underline transition-colors">Help Center</a>
                <a href="#timing-guide" className="hover:text-gray-900 hover:underline transition-colors">Timing Guide</a>
                <a href="#status" className="hover:text-gray-900 hover:underline transition-colors">System Status</a>
              </div>
              <div className="flex flex-col space-y-2.5">
                <h5 className="font-semibold text-gray-900 mb-1">Values</h5>
                <a href="#accessibility" className="hover:text-gray-900 hover:underline transition-colors">Accessibility</a>
                <a href="#environment" className="hover:text-gray-900 hover:underline transition-colors">Environment</a>
                <a href="#privacy" className="hover:text-gray-900 hover:underline transition-colors">Privacy</a>
                <a href="#responsibility" className="hover:text-gray-900 hover:underline transition-colors">Responsibility</a>
              </div>
              <div className="flex flex-col space-y-2.5">
                <h5 className="font-semibold text-gray-900 mb-1">About IJT</h5>
                <a href="/#news" className="hover:text-gray-900 hover:underline transition-colors">Newsroom</a>
                <a href="/#leadership" className="hover:text-gray-900 hover:underline transition-colors">Leadership</a>
                <a href="/event" className="hover:text-gray-900 hover:underline transition-colors">Events</a>
                <a href="/#contact" className="hover:text-gray-900 hover:underline transition-colors">Contact IJT</a>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex flex-col gap-2">
                <p className="text-gray-400">Hak cipta © {new Date().getFullYear()} IJT — Indonesia Timing System. Seluruh hak cipta dilindungi undang-undang.</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-gray-500">
                  <a href="/#privacy" className="hover:text-gray-900 hover:underline transition-colors">Kebijakan Privasi</a>
                  <span className="hidden md:inline text-gray-300">|</span>
                  <a href="/#terms" className="hover:text-gray-900 hover:underline transition-colors">Ketentuan Penggunaan</a>
                  <span className="hidden md:inline text-gray-300">|</span>
                  <a href="/#legal" className="hover:text-gray-900 hover:underline transition-colors">Legal</a>
                  <span className="hidden md:inline text-gray-300">|</span>
                  <a href="/#sitemap" className="hover:text-gray-900 hover:underline transition-colors">Peta Situs</a>
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end gap-3 mt-4 md:mt-0">
                <span className="text-gray-400 text-[10px] uppercase tracking-widest font-extrabold">Owned by IZT Race Technology</span>
                <div className="flex items-center gap-4">
                  <img src="/Assets/landing2/IJT LOGO.PNG" alt="IJT Logo" className="h-6 md:h-7 object-contain grayscale hover:grayscale-0 transition-all duration-500 opacity-60 hover:opacity-100" />
                  <div className="w-px h-4 bg-gray-200"></div>
                  <img src="/Assets/landing2/arraz.jpeg" alt="Arraz Logo" className="h-6 md:h-7 object-contain rounded-sm grayscale hover:grayscale-0 transition-all duration-500 opacity-60 hover:opacity-100" />
                </div>
              </div>
            </div>
          </div>
        </footer>

        {/* Loading overlay transition screen */}
        {navigatingTo && (
          <div className="fixed inset-0 z-50 bg-[#070b13] flex flex-col items-center justify-center">
            <img src="/Assets/logo2.gif" alt="Loading" className="w-20 h-20 mb-4 opacity-80" />
            <div className="w-10 h-10 border-4 border-slate-800 border-t-[#DC2626] rounded-full animate-spin mb-3" />
            <p className="text-xs font-black text-slate-500 tracking-widest uppercase animate-pulse">Navigating...</p>
          </div>
        )}
      </div>
    </>
  );
}
