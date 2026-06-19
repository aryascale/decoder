import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function AboutNavbar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.nav
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 w-full z-50 px-4 py-3 bg-[rgba(251,251,253,0.8)] backdrop-blur-xl border-b border-black/[0.05]"
        style={{ WebkitBackdropFilter: "saturate(180%) blur(20px)" }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center cursor-pointer" onClick={() => navigate("/")}>
            <span className="text-[14px] md:text-[15px] font-semibold tracking-tight text-slate-900">
              LUMPAT
            </span>
          </div>

          {/* Center: Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-[12px] font-medium text-slate-600 tracking-wide">
            <button onClick={() => navigate("/")} className="hover:text-black transition-colors">Home</button>
            <button onClick={() => navigate("/event")} className="hover:text-black transition-colors">Events</button>
            <button onClick={() => navigate("/#products")} className="hover:text-black transition-colors">Products</button>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden flex items-center justify-center w-8 h-8 text-slate-800"
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

      {/* Mobile Menu */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-[rgba(251,251,253,0.95)] backdrop-blur-2xl flex flex-col pt-20 px-6 md:hidden">
          <button onClick={() => navigate("/")} className="text-2xl font-semibold text-black py-4 border-b border-gray-200">Home</button>
          <button onClick={() => navigate("/event")} className="text-2xl font-semibold text-black py-4 border-b border-gray-200">Events</button>
          <button onClick={() => navigate("/#products")} className="text-2xl font-semibold text-black py-4 border-b border-gray-200">Products</button>
        </div>
      )}
    </>
  );
}
