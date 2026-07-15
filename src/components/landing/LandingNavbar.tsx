import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const NAV_LINKS = [
  { label: "Events", action: "navigate", to: "/event" },
  { label: "iZT Timing Kit", action: "anchor", to: "#products" },
  { label: "Live Results", action: "anchor", to: "#live-results" },
  { label: "About", action: "navigate", to: "/about" },
];

interface LandingNavbarProps {
  customLinks?: Array<{ label: string, action: string, to: string }>;
}

export default function LandingNavbar({ customLinks }: LandingNavbarProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const activeLinks = customLinks || NAV_LINKS;

  const handleNav = (link: (typeof NAV_LINKS)[0]) => {
    setIsOpen(false);
    if (link.label === "Live Results") {
      window.dispatchEvent(new Event("show-coming-soon"));
      return;
    }
    if (link.action === "navigate") {
      navigate(link.to);
    } else {
      const el = document.querySelector(link.to);
      el?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          delay: 1.4,
          duration: 1.2,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="absolute top-0 left-0 w-full z-50 px-4 py-3 bg-transparent"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center cursor-pointer" onClick={() => navigate("/")}>
            <span className="text-[14px] md:text-[15px] font-extrabold tracking-tight text-slate-900">
              LUMPAT
            </span>
          </div>

          {/* Center: Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-10 text-[12px] font-medium text-slate-600 tracking-wide">
            {activeLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNav(link)}
                className="hover:text-slate-900 transition-colors cursor-pointer bg-transparent border-none"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="md:hidden flex items-center justify-center w-10 h-10 text-slate-800 cursor-pointer bg-transparent border-none relative z-[60]"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8h16M4 16h16" />
              )}
            </svg>
          </button>
        </div>
      </motion.nav>

      {/* ─── Mobile Drawer ─── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[55] bg-black/30 backdrop-blur-sm md:hidden"
            />

            {/* Drawer Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 z-[56] h-full w-[280px] bg-white shadow-2xl md:hidden flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className="text-[14px] font-extrabold tracking-tight text-slate-900">LUMPAT</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer bg-transparent border-none"
                  aria-label="Close menu"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Nav Links */}
              <div className="flex flex-col py-4">
                {activeLinks.map((link, idx) => (
                  <motion.button
                    key={link.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * idx }}
                    onClick={() => handleNav(link)}
                    className="px-6 py-4 text-left text-[15px] font-medium text-slate-700 hover:bg-gray-50 hover:text-slate-900 transition-colors cursor-pointer bg-transparent border-none"
                  >
                    {link.label}
                  </motion.button>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-auto px-5 pb-8">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate("/event");
                  }}
                  className="w-full py-3 bg-[#0F172A] text-white text-sm font-semibold rounded-full cursor-pointer border-none shadow-md"
                >
                  Lihat Event
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
