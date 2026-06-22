// src/pages/LandingPage.tsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import LandingNavbar from "../components/landing/LandingNavbar";
import HeroCircularGallery from "../components/landing/HeroCircularGallery";
import EventSearchModal from "../components/EventSearchModal";
import ImageSlider3D from "../components/lightswind/3d-image-slider";

export default function LandingPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [activeEcosystem, setActiveEcosystem] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleComingSoon = () => {
      setShowComingSoon(true);
      setTimeout(() => setShowComingSoon(false), 2500);
    };
    window.addEventListener("show-coming-soon", handleComingSoon);
    return () => window.removeEventListener("show-coming-soon", handleComingSoon);
  }, []);

  const triggerComingSoon = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new Event("show-coming-soon"));
  };

  // Responsive state observer
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const heroImages = [
    "/Assets/landing/hero.webp",
    "/Assets/landing/hero_2.webp",
    "/Assets/landing/hero_3.webp"
  ];

  // Rotate hero image every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  // Rotate ecosystem carousel every 3.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveEcosystem((prev) => (prev + 1) % 5);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Parallax scroll handler
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    document.querySelectorAll(".scroll-reveal").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const faqs = [
    {
      question: "How does the timing system work?",
      answer:
        "Each participant wears a UHF passive transponder (attached to their bib, ankle strap, or bike). As they cross timing mats placed at checkpoints and the finish line, the system records split times with 0.2-second accuracy and uploads results to the live leaderboard instantly.",
    },
    {
      question: "Are the transponders waterproof?",
      answer:
        "Yes, 100% waterproof. Our transponders are designed specifically for triathlon events — they remain active and accurate during the swim leg, whether in open water or pool environments.",
    },
    {
      question: "How do participants view their results?",
      answer:
        "Results are available in real-time on the online leaderboard. After the event concludes, participants can also download their official finisher certificate as a PDF directly from their profile.",
    },
    {
      question: "What does the timing package include?",
      answer:
        "Our complete timing solution includes transponder tags, timing mats, real-time scoring software, live leaderboard hosting, and post-event certificate generation. Contact our team for a customized quote.",
    },
    {
      question: "Can this system be used for non-triathlon events?",
      answer:
        "Absolutely. Our timing system supports running races, cycling events, obstacle courses, relay races, and any multi-sport event that requires accurate split timing and live results.",
    },
  ];

  // Calculate safe parallax to prevent bleeding
  const getParallaxStyle = (desktopOffset: number, mobileOffset: number) => {
    const offset = isMobile ? mobileOffset : desktopOffset;
    const speed = isMobile ? 0.08 : 0.2;
    // Mobile needs clamped shift because container is portrait (no slack)
    const maxShift = isMobile ? 60 : 250;
    
    let shift = (scrollY - offset) * speed;
    if (shift > maxShift) shift = maxShift;
    if (shift < -maxShift) shift = -maxShift;
    
    return {
      backgroundPositionY: `calc(50% + ${shift}px)`,
      backgroundSize: isMobile ? "auto 130%" : "cover",
    };
  };

  return (
    <div className="w-full overflow-hidden relative bg-[#F1F3F6]">
      <AnimatePresence>
        {showComingSoon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
          >
            <span className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight" style={{ textShadow: "0 4px 20px rgba(0,0,0,0.15), 0 0 40px rgba(255,255,255,0.8)" }}>
              COMING SOON
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <LandingNavbar />
      <HeroCircularGallery />

      {/* ===================== TICKER LOGO ===================== */}
      <div className="w-full bg-gray-100 border-b border-gray-200 overflow-hidden py-6 sm:py-10 flex items-center relative shadow-[inset_0_-10px_20px_rgba(0,0,0,0.02)]">
        {/* Gradients for smooth edges */}
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-gray-100 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-gray-100 to-transparent z-10 pointer-events-none" />

        <div className="flex animate-marquee w-max">
          {/* We repeat the items 16 times so it's wide enough. -50% translateX will loop exactly halfway. */}
          {[...Array(16)].map((_, i) => (
            <div key={i} className="flex items-center justify-center px-10 sm:px-20 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-default">
              <img src="/Assets/landing2/IJT LOGO.PNG" alt="Logo" className="h-10 sm:h-16 object-contain" />
            </div>
          ))}
        </div>
      </div>

      {/* ===================== PLATFORM ECOSYSTEM — CINEMATIC 3D ===================== */}
      <section className="overflow-hidden relative" id="platform" style={{
        background: 'radial-gradient(ellipse 120% 80% at 50% 40%, #f0f0f0 0%, #e8e8e8 40%, #f5f5f5 100%)',
        padding: isMobile ? '40px 0 30px' : '50px 0 40px'
      }}>
        {/* Subtle top/bottom vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(245,245,245,0.8) 0%, transparent 15%, transparent 85%, rgba(245,245,245,0.8) 100%)' }} />

        {/* Section Header */}
        <div className="text-center mb-4 md:mb-6 px-6 relative z-10 scroll-reveal">
          <span className="text-red-500 font-extrabold tracking-[0.3em] text-[11px] uppercase mb-2 block">SOFTWARE PLATFORM</span>
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-black uppercase text-stone-900 mb-4 tracking-[-0.04em] leading-[0.92]">COMPLETE<br className="sm:hidden" /> ECOSYSTEM</h2>
          <p className="text-stone-400 max-w-md mx-auto text-sm md:text-[15px] font-medium leading-relaxed">
            Manage your entire event from one unified dashboard.<br className="hidden md:block" /> From custom branding to real-time results.
          </p>
        </div>

        {/* === 3D STAGE === */}
        <div 
          className={`relative w-full max-w-[100vw] mx-auto flex items-center justify-center transition-all duration-500 -mt-6 md:-mt-8 scroll-reveal ${isMobile ? 'h-[240px]' : 'h-[460px]'}`}
          style={{ transitionDelay: '200ms' }}
        >
          {/* Atmospheric glows */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.07) 0%, transparent 70%)', filter: 'blur(60px)' }} />

          <ImageSlider3D
            images={[
              "/Assets/carousel/p1.webp?v=1",
              "/Assets/carousel/p2.webp?v=1",
              "/Assets/carousel/p3.webp?v=1",
              "/Assets/carousel/p4.webp?v=1",
              "/Assets/carousel/p5.webp?v=1",
              "/Assets/carousel/p6.webp?v=1",
              "/Assets/carousel/p1.webp?v=1",
              "/Assets/carousel/p2.webp?v=1",
              "/Assets/carousel/p3.webp?v=1",
              "/Assets/carousel/p4.webp?v=1",
              "/Assets/carousel/p5.webp?v=1",
              "/Assets/carousel/p6.webp?v=1"
            ]}
            duration={45}
            cardWidth={isMobile ? "26rem" : "75rem"}
            cardAspectRatio={isMobile ? "16/10" : "16/9"}
            perspective={isMobile ? "65rem" : "120rem"}
            withMask={true}
            containerClassName="w-full h-full"
            imageClassName="border border-stone-200/20 shadow-[0_20px_50px_rgba(0,0,0,0.15)] select-none pointer-events-none brightness-[1.02] saturate-[1.05]"
          />
        </div>

        {/* Labels with active indicator */}
        <div 
          className="flex justify-center gap-4 sm:gap-10 md:gap-20 mt-2 md:mt-20 px-4 flex-wrap relative z-10 scroll-reveal"
          style={{ transitionDelay: '400ms' }}
        >
          {[
            { tag: "#01", title: "White Label" },
            { tag: "#02", title: "Results" },
            { tag: "#03", title: "Route Map" },
            { tag: "#04", title: "Multisport" },
            { tag: "#05", title: "Portfolio" },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => setActiveEcosystem(idx)}
              className={`flex flex-col items-center gap-1.5 transition-all duration-600 cursor-pointer ${activeEcosystem === idx ? 'opacity-100 scale-[1.08]' : 'opacity-20 hover:opacity-45 scale-100'}`}
            >
              <span className={`font-black text-xs md:text-sm tracking-[0.2em] transition-colors duration-500 ${activeEcosystem === idx ? 'text-red-500' : 'text-stone-400'}`}>{item.tag}</span>
              <span className={`font-bold text-[10px] md:text-xs uppercase tracking-wider whitespace-nowrap transition-colors duration-500 ${activeEcosystem === idx ? 'text-stone-900' : 'text-stone-500'}`}>{item.title}</span>
              {/* Active indicator */}
              <div className={`h-[2.5px] rounded-full transition-all duration-500 mt-0.5 ${activeEcosystem === idx ? 'w-10 bg-red-500' : 'w-0 bg-transparent'}`} />
            </button>
          ))}
        </div>
      </section>

      {/* ===================== SECTION 2: PHOTO GRID (PAUSED) ===================== */}
      {/* Section ini di-pause sementara
      <section className="landing-section landing-section--white" id="photo-grid">
        <div className="landing-container">
          <div className="landing-photo-grid scroll-reveal">
            <div className="landing-photo-grid__item landing-photo-grid__item--large landing-img-wrapper">
              <img src="/Assets/landing/swim.webp" alt="Triathlon swimming" loading="lazy" />
            </div>
            <div className="landing-photo-grid__item landing-img-wrapper">
              <img src="/Assets/landing/bike.webp" alt="Triathlon cycling" loading="lazy" />
            </div>
            <div className="landing-photo-grid__item landing-img-wrapper">
              <img src="/Assets/landing/run.webp" alt="Triathlon running" loading="lazy" />
            </div>
          </div>

          <div className="landing-section-header scroll-reveal" style={{ marginTop: "48px" }}>
            <p className="landing-section-header__subtitle">
              From the open water to the finish line, our timing system records
              every split time with industry-leading accuracy.
            </p>
          </div>
        </div>
      </section>
      */}

      {/* ===================== SECTION 3: PARALLAX JOURNEY ===================== */}
      <section id="journey">
        {/* SWIM */}
        <div
          className="landing-parallax-block"
          style={{
            backgroundImage: "url('/Assets/landing/swim.webp')",
            ...getParallaxStyle(800, 1300),
          }}
        >
          <div className="landing-parallax-block__overlay landing-parallax-block__overlay--dark" />
          <div className="landing-parallax-block__content scroll-reveal">
            <span className="landing-parallax-block__phase">01 — SWIM</span>
            <h3 className="landing-parallax-block__title">WATERPROOF. FAILPROOF.</h3>
            <p className="landing-parallax-block__text">
              100% waterproof transponders that stay active underwater. Accurately
              tracks swim splits in open water and pool environments.
            </p>
          </div>
        </div>

        {/* BIKE */}
        <div
          className="landing-parallax-block"
          style={{
            backgroundImage: "url('/Assets/landing/bike.webp')",
            ...getParallaxStyle(1400, 1800),
          }}
        >
          <div className="landing-parallax-block__overlay" />
          <div className="landing-parallax-block__content landing-parallax-block__content--right scroll-reveal">
            <span className="landing-parallax-block__phase">02 — BIKE</span>
            <h3 className="landing-parallax-block__title">BUILT FOR EVERY TERRAIN</h3>
            <p className="landing-parallax-block__text">
              Aerodynamic, shock-resistant design. Records every checkpoint without
              interruption across any distance.
            </p>
          </div>
        </div>

        {/* RUN */}
        <div
          className="landing-parallax-block"
          style={{
            backgroundImage: "url('/Assets/landing/run.webp')",
            ...getParallaxStyle(2000, 2300),
          }}
        >
          <div className="landing-parallax-block__overlay landing-parallax-block__overlay--red" />
          <div className="landing-parallax-block__content scroll-reveal">
            <span className="landing-parallax-block__phase">03 — RUN</span>
            <h3 className="landing-parallax-block__title">0.2-SECOND ACCURACY</h3>
            <p className="landing-parallax-block__text">
              Captures the finish line with precision. Results go live on the
              leaderboard in real-time.
            </p>
          </div>
        </div>
      </section>

      {/* ===================== SECTION 4: PRODUCT SHOWCASE ===================== */}
      {/* ===================== SECTION 4: PRODUCT SHOWCASE — APPLE STYLE ===================== */}
      <section className="bg-white py-20 md:py-28" id="products">
        <div className="max-w-7xl mx-auto px-6">

          {/* Partnership Editorial Header */}
          <div className="text-center mb-16 md:mb-24 scroll-reveal">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-red-500 font-extrabold tracking-[0.3em] text-[10px] md:text-xs uppercase">LUMPAT</span>
              <span className="text-stone-300 text-sm font-light">×</span>
              <span className="text-stone-500 font-extrabold tracking-[0.3em] text-[10px] md:text-xs uppercase">IZT TIMING</span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase text-stone-900 tracking-[-0.04em] mb-6 leading-none">
              PROFESSIONAL TIMING LINEUP
            </h2>
            <p className="text-stone-500 max-w-2xl mx-auto text-base md:text-lg font-medium leading-relaxed">
              LUMPAT partners with IZT, Indonesia’s trusted multi-sport timing specialist. Together, we deliver state-of-the-art transponders and decoders for error-free splits.
            </p>
          </div>

          {/* Grid Layout — Apple Editorial Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 scroll-reveal">

            {/* CARD 1: Large Featured Card (Span 2 columns on desktop) */}
            <div className="md:col-span-2 bg-white rounded-[32px] p-8 md:p-12 flex flex-col md:flex-row justify-between items-center overflow-hidden shadow-sm border border-stone-200/40 group hover:shadow-md transition-all duration-500 cursor-pointer" onClick={() => navigate('/device/pro-time-decoder')}>
              <div className="w-full md:w-[55%] flex flex-col justify-start h-full mb-8 md:mb-0 md:pr-8">
                <div>
                  <span className="text-stone-400 font-extrabold tracking-widest text-[9px] uppercase">CORE SYSTEM</span>
                  <h3 className="text-3xl md:text-4xl font-black uppercase text-stone-900 mt-2 mb-4 leading-none tracking-tight">Pro Time Decoder</h3>
                  <p className="text-stone-500 text-sm md:text-base font-medium leading-relaxed">
                    Our professional timing hub that decrypts transponder reads with industry-leading precision. Equipped with dual-frequency sync and internal batteries for robust failproof deployment.
                  </p>
                </div>
                <div className="mt-8 md:mt-auto pt-8">
                  <span className="text-stone-400 font-bold text-xs">Partnered with IZT Tech</span>
                </div>
              </div>
              <div className="w-full md:w-[45%] h-[240px] md:h-[300px] flex items-center justify-center">
                <img
                  src="/Assets/landing2/PRO TIME DECODER.webp"
                  alt="Pro Time Decoder"
                  className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </div>

            {/* CARD 2: Magic Antenna */}
            <div className="bg-white rounded-[32px] p-8 md:p-10 flex flex-col justify-between overflow-hidden shadow-sm border border-stone-200/40 group hover:shadow-md transition-all duration-500 cursor-pointer" onClick={() => navigate('/device/magic-antenna')}>
              <div className="mb-8">
                <span className="text-stone-400 font-extrabold tracking-widest text-[9px] uppercase">ANTENNA GRID</span>
                <h3 className="text-2xl md:text-3xl font-black uppercase text-stone-900 mt-2 mb-3 leading-none tracking-tight">Magic Antenna</h3>
                <p className="text-stone-500 text-sm font-medium leading-relaxed">
                  Advanced high-gain UHF antenna system ensuring maximum transponder detection density even in packed start and finish zones.
                </p>
              </div>
              <div className="w-full h-[200px] md:h-[220px] flex items-center justify-center mt-auto">
                <img
                  src="/Assets/landing2/MAGIC ANTENNA.webp"
                  alt="Magic Antenna"
                  className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </div>

            {/* CARD 3: Active Chip */}
            <div className="bg-white rounded-[32px] p-8 md:p-10 flex flex-col justify-between overflow-hidden shadow-sm border border-stone-200/40 group hover:shadow-md transition-all duration-500 cursor-pointer" onClick={() => navigate('/device/active-chip')}>
              <div className="mb-8">
                <span className="text-red-500 font-extrabold tracking-widest text-[9px] uppercase">REUSABLE TAG</span>
                <h3 className="text-2xl md:text-3xl font-black uppercase text-stone-900 mt-2 mb-3 leading-none tracking-tight">Active Chip</h3>
                <p className="text-stone-500 text-sm font-medium leading-relaxed">
                  Sub-millisecond precision transponder designed for high-speed cycling, triathlons, and professional sports requiring active power backup.
                </p>
              </div>
              <div className="w-full h-[200px] md:h-[220px] flex items-center justify-center mt-auto">
                <img
                  src="/Assets/landing2/Active Chip.webp"
                  alt="Active Chip"
                  className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </div>

            {/* CARD 4: Running Chip (Span 2 columns on desktop) */}
            <div className="md:col-span-2 bg-white rounded-[32px] p-8 md:p-12 flex flex-col md:flex-row justify-between items-center overflow-hidden shadow-sm border border-stone-200/40 group hover:shadow-md transition-all duration-500 cursor-pointer" onClick={() => navigate('/device/running-chip')}>
              <div className="w-full md:w-[55%] flex flex-col justify-start h-full mb-8 md:mb-0 md:pr-8">
                <div>
                  <span className="text-stone-400 font-extrabold tracking-widest text-[9px] uppercase">DISPOSABLE TAG</span>
                  <h3 className="text-3xl md:text-4xl font-black uppercase text-stone-900 mt-2 mb-4 leading-none tracking-tight">Running Chip</h3>
                  <p className="text-stone-500 text-sm md:text-base font-medium leading-relaxed">
                    Ultra-lightweight passive UHF tags optimized for mass-participation marathons. Designed to be attached to bibs, they deliver reliable start/split splits effortlessly.
                  </p>
                </div>
                <div className="mt-8 md:mt-auto pt-8">
                  <span className="text-stone-400 font-bold text-xs">Standard Passive UHF tag technology</span>
                </div>
              </div>
              <div className="w-full md:w-[45%] h-[240px] md:h-[300px] flex items-center justify-center">
                <img
                  src="/Assets/landing2/RUNNING Chip.webp"
                  alt="Running Chip"
                  className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ===================== SECTION 8: FAQ ===================== */}
      <section className="bg-[#f5f5f4] py-20 md:py-32 border-t border-stone-200" id="faq">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16 items-start">

          {/* Left Side: Header & Context */}
          <div className="md:col-span-5 flex flex-col items-start text-left scroll-reveal">
            <span className="text-[#DC2626] font-bold tracking-[0.2em] text-[11px] uppercase mb-4 block">SUPPORT</span>
            <h2 className="text-4xl md:text-5xl font-black text-[#111] mb-6 tracking-tight leading-[1.1]">
              Frequently asked<br className="hidden md:block" /> questions
            </h2>
            <p className="text-stone-500 text-[15px] md:text-lg font-medium mb-8 leading-relaxed max-w-sm">
              Find quick solutions and helpful tips for using our timing ecosystem. If you need more details, our technical team is ready to assist.
            </p>
            <button 
              className="landing-btn landing-btn--primary px-8"
              style={{ borderRadius: '9999px' }}
            >
              CONTACT SUPPORT
            </button>
          </div>

          {/* Right Side: Accordion */}
          <div className="md:col-span-7 flex flex-col gap-4 scroll-reveal" style={{ transitionDelay: '200ms' }}>
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-[20px] transition-all duration-500 bg-white border ${isOpen ? 'border-[#DC2626]/20 shadow-[0_8px_30px_rgba(220,38,38,0.06)]' : 'border-stone-200/60 hover:border-stone-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]'}`}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-6 py-6 md:px-8 flex items-center justify-between text-left group"
                  >
                    <span className={`font-bold text-[16px] md:text-[18px] tracking-tight pr-4 transition-colors ${isOpen ? 'text-[#DC2626]' : 'text-[#111] group-hover:text-[#DC2626]'}`}>
                      {faq.question}
                    </span>
                    <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 ${isOpen ? 'bg-[#DC2626] text-white rotate-180' : 'bg-stone-100 text-stone-400 group-hover:bg-[#FEF2F2] group-hover:text-[#DC2626]'}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>
                  <div
                    className={`px-6 md:px-8 transition-all duration-500 overflow-hidden ${isOpen ? 'max-h-96 pb-6 md:pb-8 opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    <p className="text-[15px] font-medium text-stone-500 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="bg-white border-t border-gray-200 text-xs text-gray-500 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-8">
            <div className="flex flex-col space-y-2.5">
              <h5 className="font-semibold text-gray-900 mb-1">Platform</h5>
              <a onClick={() => navigate("/leaderboard")} className="hover:text-gray-900 hover:underline cursor-pointer transition-colors">Leaderboard</a>
              <a onClick={() => setIsSearchOpen(true)} className="hover:text-gray-900 hover:underline cursor-pointer transition-colors">Search Events</a>
              <a href="#products" className="hover:text-gray-900 hover:underline transition-colors">Transponders</a>
              <a href="#features" className="hover:text-gray-900 hover:underline transition-colors">Features</a>
              <a href="#" onClick={triggerComingSoon} className="hover:text-gray-900 hover:underline transition-colors">Live Results</a>
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
              <a href="#news" className="hover:text-gray-900 hover:underline transition-colors">Newsroom</a>
              <a href="#leadership" className="hover:text-gray-900 hover:underline transition-colors">Leadership</a>
              <a href="#events" className="hover:text-gray-900 hover:underline transition-colors">Events</a>
              <a href="#contact" className="hover:text-gray-900 hover:underline transition-colors">Contact IJT</a>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-gray-400">Hak cipta © 2026 IJT — Indonesia Timing System. Seluruh hak cipta dilindungi undang-undang.</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-gray-500">
                <a href="#privacy" className="hover:text-gray-900 hover:underline transition-colors">Kebijakan Privasi</a>
                <span className="hidden md:inline text-gray-300">|</span>
                <a href="#terms" className="hover:text-gray-900 hover:underline transition-colors">Ketentuan Penggunaan</a>
                <span className="hidden md:inline text-gray-300">|</span>
                <a href="#legal" className="hover:text-gray-900 hover:underline transition-colors">Legal</a>
                <span className="hidden md:inline text-gray-300">|</span>
                <a href="#sitemap" className="hover:text-gray-900 hover:underline transition-colors">Peta Situs</a>
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

      {/* Popups */}
      <EventSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
