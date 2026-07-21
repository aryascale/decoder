import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AboutNavbar from "../components/landing/AboutNavbar";

export default function AboutPage() {
  const [liveSync, setLiveSync] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);

  const heroImages = [
    "/Assets/About/bct1.JPG",
    "/Assets/About/bct2.JPG",
    "/Assets/About/bct3.jpg"
  ];

  // Rotate hero images
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const solutions = [
    {
      badge: "Registration",
      title: "Online Registration & Payments",
      desc: "Fully custom branding registration portals with multi-payment verification, group checkout, and real-time racer database management.",
      image: "/Assets/landing2/Registrasi.png"
    },
    {
      badge: "Timing Hardware",
      title: "Professional Timing Lineup",
      desc: "High-performance UHF active and passive transponders, decoder units, and high-gain antenna grids designed for 100% mat coverage.",
      image: "/Assets/landing2/Decoder2.png"
    },
    {
      badge: "Live Results",
      title: "Real-Time Leaderboard Tracking",
      desc: "Live results display with automated category splitting, speed pace calculations, and instant digital certificates downloadable by participants.",
      image: "/Assets/landing2/result.png"
    }
  ];

  const nextSlide = () => {
    setCarouselIndex((prev) => (prev + 1) % solutions.length);
  };

  const prevSlide = () => {
    setCarouselIndex((prev) => (prev - 1 + solutions.length) % solutions.length);
  };

  // Dot gauge values for Card 3
  const dotGauges = [
    { label: "Waterproof Technology", value: 10 },
    { label: "Detection Density", value: 9 },
    { label: "Sync Accuracy", value: 10 }
  ];

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-[#FF383C] selection:text-white overflow-x-hidden text-slate-900 pb-24 font-outfit">
      {/* Dynamic Font Loader & Class Definition */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        .font-outfit {
          font-family: 'Outfit', sans-serif !important;
        }
        .text-reference-title {
          font-family: 'Outfit', sans-serif !important;
          font-weight: 500;
          letter-spacing: -0.02em;
        }
        .text-reference-body {
          font-family: 'Outfit', sans-serif !important;
          font-weight: 400;
          letter-spacing: -0.01em;
        }
      `}</style>

      <AboutNavbar />

      {/* ===================== HERO SECTION ===================== */}
      <section className="px-4 md:px-8 pt-24 pb-8 max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[32px] md:rounded-[40px] overflow-hidden min-h-[480px] md:min-h-[580px] flex flex-col justify-between p-8 md:p-16 text-white shadow-lg"
        >
          {/* Background image & gradient overlay */}
          <div className="absolute inset-0 z-0">
            {heroImages.map((src, idx) => (
              <img
                key={src}
                src={src}
                alt="Lumpat Timing System Hero"
                className={`absolute inset-0 w-full h-full object-cover object-center scale-105 transition-all duration-[2000ms] ease-in-out ${
                  idx === heroIndex ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              />
            ))}
            <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/80 via-black/35 to-black/25" />
          </div>

          {/* Top layout */}
          <div className="relative z-10 flex justify-between items-center w-full">
            <span className="text-[11px] font-medium tracking-wider bg-white/10 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full">
              Lumpat Timing Ecosystem
            </span>
          </div>

          {/* Main Headline Content */}
          <div className="relative z-10 max-w-4xl mx-auto text-center my-auto flex flex-col items-center">
            <h1 className="text-3xl sm:text-5xl md:text-[56px] text-reference-title leading-[1.1] text-white">
              Unleash Ultimate Precision.<br />All In One Place.
            </h1>
            <p className="mt-5 text-sm sm:text-base md:text-lg text-slate-200/90 max-w-2xl font-light tracking-wide leading-relaxed font-outfit">
              Indonesia's premier sports timing and registration platform — where speed meets accuracy, and every split time brings athletes closer to the finish line.
            </p>
            <a
              href="/event"
              className="mt-6 bg-[#FF383C] hover:bg-red-600 text-white transition-all duration-300 px-8 py-3.5 rounded-full text-xs font-medium tracking-wide shadow-md hover:scale-105"
            >
              Explore Our Events
            </a>
          </div>

          {/* Hero Bottom indicators */}
          <div className="relative z-10 flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-end w-full pt-8 border-t border-white/10 mt-4">
            {/* Left side: Avatars */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                <img
                  src="/Assets/landing2/arraz.jpeg"
                  alt="Timing Crew avatar"
                  className="w-8 h-8 rounded-full object-cover border-2 border-slate-900 shadow-md"
                />
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF383C] to-red-400 border-2 border-slate-900 flex items-center justify-center text-[9px] font-semibold shadow-md">
                  IZ
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-500 border-2 border-slate-900 flex items-center justify-center text-[9px] font-semibold shadow-md">
                  +120
                </div>
              </div>
              <p className="text-xs text-slate-300 font-light tracking-wide">
                Trusted by 200+ race directors. <span className="text-white font-normal">Tested in elite national races.</span>
              </p>
            </div>

            {/* Right side: Social channels */}
            <div className="flex gap-5 text-[10px] font-medium text-slate-300 tracking-wider">
              <a href="https://www.instagram.com/lumpat.online/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-0.5">
                Instagram <span className="text-[8px] text-slate-400">↗</span>
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ===================== ABOUT SECTION ===================== */}
      <section className="py-12 md:py-20 px-4 md:px-8 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left badge */}
          <div className="lg:col-span-4 flex items-center">
            <span className="bg-slate-50 border border-slate-200/60 text-slate-700 font-medium text-[11px] tracking-wider px-4 py-1.5 rounded-full inline-block shadow-sm">
              About Lumpat
            </span>
          </div>

          {/* Right statement description */}
          <div className="lg:col-span-8">
            <h2 className="text-xl sm:text-2xl md:text-[32px] font-normal tracking-tight text-slate-900 leading-[1.25] font-outfit">
              At Lumpat, we don't just measure time — we capture precision. Since 2023, our timing platform has been a home for race organizers of all levels, from local fun runs to complex multisport triathlons.
            </h2>
          </div>
        </div>

        {/* ===================== THE THREE ASYMMETRICAL CARDS ===================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 md:mt-16">
          
          {/* CARD 1: Dark Timing Hub */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className={`rounded-[28px] p-8 flex flex-col justify-between min-h-[340px] md:min-h-[380px] transition-all duration-500 relative overflow-hidden shadow-sm border ${
              liveSync ? "bg-slate-950 text-white border-slate-800" : "bg-slate-900 text-slate-300 border-slate-800"
            }`}
          >
            {/* Small Timing Mat icon */}
            <div>
              <div className="w-10 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-base md:text-lg font-light tracking-wide text-slate-100 leading-snug">
                Engineered with dual frequency synchronization and real time telemetry, our professional UHF timing decoders deliver precise split tracking in every condition.
              </p>
            </div>

            {/* Toggle switch area */}
            <div className="flex items-center justify-between border-t border-white/10 pt-6">
              <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${liveSync ? 'bg-[#FF383C] animate-pulse' : 'bg-slate-500'}`} />
                {liveSync ? "Live Telemetry Active" : "Standby Mode"}
              </span>
              <button
                onClick={() => setLiveSync(!liveSync)}
                className={`w-12 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
                  liveSync ? "bg-[#FF383C]" : "bg-slate-800"
                }`}
                aria-label="Toggle live sync mode"
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ${
                    liveSync ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </motion.div>

          {/* CARD 2: Overlay Image */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="rounded-[28px] overflow-hidden min-h-[340px] md:min-h-[380px] relative flex flex-col justify-end p-8 text-white group shadow-sm"
          >
            {/* Background image container */}
            <div className="absolute inset-0 z-0 overflow-hidden">
              <img
                src="/Assets/About/bct3.jpg"
                alt="Trail running timing"
                className="w-full h-full object-cover scale-100 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            </div>

            {/* Overlay capsule */}
            <div className="relative z-10 w-full flex justify-center">
              <span className="backdrop-blur-md bg-white/10 border border-white/20 text-white font-medium text-xs tracking-wider px-5 py-2.5 rounded-full shadow-md text-center block w-fit">
                Trail Running & Road Races
              </span>
            </div>
          </motion.div>

          {/* CARD 3: Light Gray Dot Gauges */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="rounded-[28px] p-8 flex flex-col justify-between min-h-[340px] md:min-h-[380px] bg-slate-50 border border-slate-200/50 text-slate-800 shadow-sm"
          >
            <div>
              <span className="text-[28px] font-medium text-slate-900 leading-none">100%</span>
              <h4 className="font-semibold text-xs tracking-wider text-slate-500 uppercase mt-1">Detection Coverage</h4>
              <p className="text-xs text-slate-500 font-light mt-2 leading-relaxed font-outfit">
                High-performance UHF passive transponders built for dense race starts. Detections are verified across redundant checkpoint grids.
              </p>
            </div>

            {/* Dot indicators */}
            <div className="space-y-3.5 border-t border-slate-200/50 pt-5">
              {dotGauges.map((gauge) => (
                <div key={gauge.label} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-slate-400 font-medium text-[9px] uppercase tracking-wider font-outfit">
                    <span>{gauge.label}</span>
                    <span className="text-slate-800 font-bold">{gauge.value}/10</span>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                          i < gauge.value ? "bg-[#FF383C]" : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </section>

      {/* ===================== FACTS IN NUMBERS SECTION ===================== */}
      <section className="py-12 bg-white border-y border-slate-100">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 text-center">
          <span className="text-[10px] font-semibold text-slate-400 tracking-[0.2em] uppercase block mb-10">
            A few more facts about us in numbers
          </span>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { num: "1,000+", desc: "Tracked Athletes" },
              { num: "99.9%", desc: "Detections Accuracy Rate" },
              { num: "10+", desc: "Managed Events" },
              { num: "0.2s", desc: "Leaderboard Latency" }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-2xl md:text-[38px] font-normal tracking-tight text-slate-900 leading-none font-outfit">
                  {stat.num}
                </span>
                <span className="text-[11px] text-slate-500 font-light mt-2.5 tracking-wide">
                  {stat.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== SOLUTIONS SECTION ===================== */}
      <section className="py-16 md:py-24 px-4 md:px-8 max-w-[1400px] mx-auto font-outfit">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start mb-16">
          {/* Left badge */}
          <div className="lg:col-span-4 flex items-center">
            <span className="bg-slate-50 border border-slate-200/60 text-slate-700 font-medium text-[11px] tracking-wider px-4 py-1.5 rounded-full inline-block shadow-sm">
              Solutions
            </span>
          </div>

          {/* Right statement description */}
          <div className="lg:col-span-8">
            <h2 className="text-xl sm:text-2xl md:text-[32px] font-normal tracking-tight text-slate-900 leading-[1.25] font-outfit">
              Explore our full suite of timing hardware, online registration portals, and automated leaderboard dashboards designed for race directors.
            </h2>
          </div>
        </div>

        {/* Carousel Slider Wrapper */}
        <div className="relative">
          {/* Card list */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 -my-4 px-2 -mx-2 overflow-visible">
            {solutions.map((item, idx) => {
              return (
                <motion.div
                  key={idx}
                  className={`bg-white rounded-[28px] overflow-hidden border p-6 md:p-8 flex flex-col justify-between min-h-[380px] md:min-h-[440px] shadow-[0_8px_30px_rgb(0,0,0,0.01)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:border-[#FF383C] transition-all duration-300 group cursor-default ${
                    idx === carouselIndex ? "border-[#FF383C] ring-2 ring-[#FF383C]/5" : "border-slate-200/50"
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-medium tracking-wider uppercase text-slate-400 bg-slate-50 px-3.5 py-1 rounded-full inline-block border border-slate-100 mb-6">
                      {item.badge}
                    </span>
                    <h3 className={`text-lg md:text-xl font-medium tracking-tight mb-3 leading-snug group-hover:text-[#FF383C] transition-colors font-outfit duration-300 ${
                      idx === carouselIndex ? "text-[#FF383C]" : "text-slate-900"
                    }`}>
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-light leading-relaxed">
                      {item.desc}
                    </p>
                  </div>

                  {/* Solution Preview Image Card */}
                  <div className="relative rounded-2xl overflow-hidden h-[180px] md:h-[200px] bg-slate-50 border border-slate-100 flex items-center justify-center mt-6">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="max-h-[85%] max-w-[85%] object-contain rounded-lg drop-shadow-md group-hover:scale-102 transition-all duration-500"
                    />
                    <div className={`absolute bottom-4 right-4 bg-slate-950 text-white w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                      idx === carouselIndex 
                        ? "opacity-100 translate-x-0" 
                        : "opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2"
                    }`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Navigation layout below */}
          <div className="flex justify-between items-center mt-10">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
              Slide to explore solutions
            </span>
            <div className="flex gap-2.5">
              <button
                onClick={prevSlide}
                className="w-10 h-10 rounded-full border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-all flex items-center justify-center shadow-sm cursor-pointer"
                aria-label="Previous solution"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextSlide}
                className="w-10 h-10 rounded-full border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-all flex items-center justify-center shadow-sm cursor-pointer"
                aria-label="Next solution"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== CALL TO ACTION SECTION ===================== */}
      <section className="py-16 md:py-24 text-center px-4 max-w-4xl mx-auto border-t border-slate-100 font-outfit">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="flex flex-col items-center"
        >
          <img
            src="/Assets/logoletter.png"
            alt="Lumpat Logo"
            className="h-20 md:h-24 w-auto object-contain mb-8"
          />
          <h2 className="text-2xl md:text-[38px] font-normal tracking-tight text-slate-900 leading-none uppercase mb-6 font-outfit font-medium">
            Take Your Next Big Step.
          </h2>
          <p className="text-xs md:text-sm text-slate-500 font-light max-w-lg mb-10 leading-relaxed">
            Combine the best registration and timing technology to deliver an unforgettable, professional event experience for all your athletes.
          </p>
          <a
            href="/event"
            className="inline-block bg-[#0F172A] hover:bg-black text-white text-xs font-medium tracking-wide px-8 py-4 rounded-full shadow-md hover:scale-105 transition-all duration-300"
          >
            Explore Lumpat Platform
          </a>
        </motion.div>
      </section>
    </div>
  );
}
