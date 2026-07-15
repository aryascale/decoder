import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
// AUTH DISABLED: import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  showAdminButton?: boolean;
}

export default function Navbar({ showAdminButton = false }: NavbarProps) {
  const location = useLocation();
  // AUTH DISABLED: const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // AUTH DISABLED: const [profileOpen, setProfileOpen] = useState(false);
  // AUTH DISABLED: const { user, logout } = useAuth();
  // AUTH DISABLED: const dropdownRef = useRef<HTMLDivElement>(null);

  const isLandingOrEvent = location.pathname === '/' || location.pathname === '/event' || location.pathname === '/leaderboard';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* AUTH DISABLED: useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []); */

  const isTransparent = isLandingOrEvent && !scrolled && !mobileMenuOpen;
  // AUTH DISABLED: const initials = user ? ((user as any)?.name || user.username || user.email || '?').charAt(0).toUpperCase() : '';

  const navLinks = [
    { to: '/about', label: 'About' },
    { to: '/event', label: 'Events' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isTransparent ? 'bg-transparent' : 'bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-1 shrink-0">
          <span className={`text-xl sm:text-2xl font-black uppercase tracking-widest ${isTransparent ? 'text-white' : 'text-gray-900'}`}>Lumpat</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6 ml-auto mr-8">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to}
              className={`text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? isTransparent ? 'text-white' : 'text-gray-900'
                  : isTransparent ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >{link.label}</Link>
          ))}
        </div>

        {/* Right Side */}
        <div className="hidden md:flex items-center gap-3">
          {showAdminButton && (
            <Link to="/admin/overview" className="px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors">Admin</Link>
          )}

          {/* AUTH BUTTONS - COMMENTED OUT: Login system disabled, using ticket-based registration */}
          {/* {user ? (
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setProfileOpen(!profileOpen)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors ${isTransparent ? 'hover:bg-white/10' : 'hover:bg-gray-50'}`}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                  {initials}
                </div>
                <span className={`text-sm font-medium max-w-[100px] truncate ${isTransparent ? 'text-white' : 'text-gray-700'}`}>{user.username || 'User'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isTransparent ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-50'}`}>Sign In</Link>
              <Link to="/register" className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">Register</Link>
            </div>
          )} */}
        </div>

        {/* Mobile Hamburger */}
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`md:hidden w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${isTransparent ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-50'}`}>
          {mobileMenuOpen
            ? <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            : <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          }
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${location.pathname === link.to ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}>
                {link.label}
              </Link>
            ))}
            {/* AUTH MOBILE - COMMENTED OUT: Login system disabled */}
            {/* {user ? (
              <>
                <div className="border-t border-gray-100 my-2" />
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-sm font-bold">{initials}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{user.username}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-sm text-gray-600 hover:bg-gray-50">My Profile</Link>
                {user.role === 'admin' && <Link to="/admin/overview" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Admin Panel</Link>}
                <button onClick={() => { logout(); setMobileMenuOpen(false); navigate('/'); }} className="w-full text-left px-4 py-3 rounded-lg text-sm text-red-600 hover:bg-red-50">Sign Out</button>
              </>
            ) : (
              <>
                <div className="border-t border-gray-100 my-2" />
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Sign In</Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-semibold text-red-500 hover:bg-red-50">Register</Link>
              </>
            )} */}
          </div>
        </div>
      )}

      <style>{`.animate-in { animation: dropIn 0.15s ease-out; } @keyframes dropIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </nav>
  );
}
