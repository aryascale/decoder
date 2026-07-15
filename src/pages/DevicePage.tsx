// src/pages/DevicePage.tsx

import { useEffect, useRef, useState, useCallback, useMemo, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

/* ─── Device Data Registry ─── */
interface DeviceSpec {
  value: string;
  label: string;
}

interface DeviceFeature {
  tag: string;
  title: string;
  description: string;
}

interface DeviceInfo {
  slug: string;
  tag: string;
  name: string;
  heroSubtitle: string;
  image: string;
  image2: string;
  videoMp4: string;
  specs: DeviceSpec[];
  overviewHeading: string;
  overviewBody: string;
  features: DeviceFeature[];
  scrollFeatures: DeviceFeature[];
  ctaTitle: string;
  ctaSubtitle: string;
}

const DEVICES: Record<string, DeviceInfo> = {
  "pro-time-decoder": {
    slug: "pro-time-decoder",
    tag: "Core System",
    name: "Pro Time Decoder",
    heroSubtitle:
      "The professional timing hub that decrypts transponder reads with industry-leading precision. Dual-frequency sync. Continuous direct power. Zero compromise.",
    image: "/Assets/landing2/Decoder1.png",
    image2: "/Assets/landing2/Decoder2.png",
    videoMp4: "/Assets/Device/DecoderAsset1.mp4",
    specs: [
      { value: "0.02s", label: "Timing Accuracy" },
      { value: "2x", label: "Dual-Frequency Sync" },
      { value: "24/7", label: "Continuous Operation" },
    ],
    overviewHeading: "Engineered for precision.\nBuilt for endurance.",
    overviewBody:
      "The Pro Time Decoder is the nerve center of every timing operation. Designed to handle thousands of transponder reads per second, it processes data from multiple antenna inputs simultaneously — delivering millisecond accuracy even under the most demanding race conditions. With ruggedized housing and direct continuous power delivery, it's built to run endlessly from first wave to final finisher.",
    features: [
      {
        tag: "Processing",
        title: "Multi-Channel Decoding Engine",
        description:
          "Processes up to 4,000 transponder reads per second across 8 independent channels. Advanced digital signal processing eliminates false reads and ensures every athlete crossing is captured with sub-millisecond precision.",
      },
      {
        tag: "Connectivity",
        title: "Real-Time Cloud Sync",
        description:
          "Dual-band LTE and Wi-Fi connectivity ensures results are uploaded to the live leaderboard in real-time. Built-in redundancy buffers guarantee zero data loss, even in areas with intermittent network coverage.",
      },
    ],
    scrollFeatures: [
      {
        tag: "Efficiency",
        title: "Always On. Always Ready.",
        description: "Runs 24/7 with advanced energy efficiency. The Pro Time Decoder operates continuously without draining resources, so you never have to worry about power consumption during multi-day events."
      },
      {
        tag: "Durability",
        title: "Built Like a Tank.",
        description: "Crafted from aerospace-grade aluminum alloy featuring a ceramic shield for optimal heat dissipation. Proven to be relentlessly reliable — from the scorching heat of the desert sun to sub-zero freezing nights."
      },
      {
        tag: "Design",
        title: "Slim & Versatile.",
        description: "Designed with mobility in mind. Its compact, ultra-portable form factor makes it effortless to mount and deploy anywhere your race demands, from crowded city finish lines to remote mountain checkpoints."
      }
    ],
    ctaTitle: "Ready to deploy\nprofessional timing?",
    ctaSubtitle: "Contact our team for a tailored solution and pricing.",
  },
  "magic-antenna": {
    slug: "magic-antenna",
    tag: "Antenna Grid",
    name: "Magic Antenna",
    heroSubtitle:
      "Advanced high-gain UHF antenna system ensuring maximum transponder detection density even in packed start and finish zones.",
    image: "/Assets/landing2/Antene1.png",
    image2: "/Assets/landing2/Antene2.png",
    videoMp4: "/Assets/Device/AnteneAsset1.mp4",
    specs: [
      { value: "99.9%", label: "Detection Rate" },
      { value: "8m", label: "Read Range" },
      { value: "IP67", label: "Weather Rating" },
    ],
    overviewHeading: "Maximum coverage.\nMinimum footprint.",
    overviewBody:
      "The Magic Antenna redefines what's possible with passive UHF timing. Its high-gain circular-polarized design captures transponder signals from multiple angles simultaneously, ensuring that every participant is detected — even in densely packed starts with hundreds of athletes crossing at once. Lightweight yet rugged, it deploys in minutes and withstands any weather condition.",
    features: [
      {
        tag: "Design",
        title: "Circular-Polarized Array",
        description:
          "Dual-element circular polarization captures transponder signals regardless of orientation. Whether the tag is vertical, horizontal, or at an angle — the Magic Antenna reads it all with consistent signal strength.",
      },
      {
        tag: "Deployment",
        title: "Quick-Mount System",
        description:
          "Proprietary quick-mount brackets allow a single technician to set up the complete antenna grid in under 15 minutes. Tool-free assembly means faster venue preparation and tear-down.",
      },
    ],
    scrollFeatures: [
      {
        tag: "Performance",
        title: "Built different.",
        description: "Every component is precision-engineered and stress-tested across hundreds of events worldwide."
      },
      {
        tag: "Reliability",
        title: "Zero compromise.",
        description: "From scorching tropical races to cold mountain trails — this hardware doesn't flinch."
      },
      {
        tag: "Tested",
        title: "Battle-proven.",
        description: "Deployed across 500+ events. Trusted by professional race organizers worldwide."
      }
    ],
    ctaTitle: "Upgrade your\ntiming infrastructure?",
    ctaSubtitle: "See how the Magic Antenna transforms race-day accuracy.",
  },
  "active-chip": {
    slug: "active-chip",
    tag: "Reusable Tag",
    name: "Active Chip",
    heroSubtitle:
      "Sub-millisecond precision transponder designed for high-speed cycling, triathlons, and professional sports requiring active power backup.",
    image: "/Assets/landing2/ActiveChip1.png",
    image2: "/Assets/landing2/ActiveChip2.png",
    videoMp4: "/Assets/Device/ActiveAsset1.mp4",
    specs: [
      { value: "<1ms", label: "Response Time" },
      { value: "500+", label: "Race Cycles" },
      { value: "72hr", label: "Active Runtime" },
    ],
    overviewHeading: "Precision that moves\nwith the athlete.",
    overviewBody:
      "The Active Chip is an active transponder that broadcasts its unique identifier at rapid intervals, enabling sub-millisecond detection even at high velocities. Unlike passive tags, its onboard power source guarantees consistent signal strength across longer read distances — making it ideal for cycling stages, time trials, and multi-sport transitions where speed and reliability matter most.",
    features: [
      {
        tag: "Performance",
        title: "Active Broadcast Protocol",
        description:
          "Transmits a unique encoded signal at 100Hz intervals. The active broadcast ensures detection at speeds exceeding 80km/h with zero missed reads — critical for professional cycling and triathlon bike segments.",
      },
      {
        tag: "Durability",
        title: "Ruggedized & Waterproof",
        description:
          "IP68-rated housing withstands full submersion, shock impact, and extreme temperature ranges. Each chip is rated for 500+ race cycles with zero degradation in signal accuracy, making it the most cost-effective reusable timing solution.",
      },
    ],
    scrollFeatures: [
      {
        tag: "Performance",
        title: "Built different.",
        description: "Every component is precision-engineered and stress-tested across hundreds of events worldwide."
      },
      {
        tag: "Reliability",
        title: "Zero compromise.",
        description: "From scorching tropical races to cold mountain trails — this hardware doesn't flinch."
      },
      {
        tag: "Tested",
        title: "Battle-proven.",
        description: "Deployed across 500+ events. Trusted by professional race organizers worldwide."
      }
    ],
    ctaTitle: "Go active.\nGo precision.",
    ctaSubtitle: "Discover the Active Chip for your next professional event.",
  },
  "running-chip": {
    slug: "running-chip",
    tag: "Disposable Tag",
    name: "Running Chip",
    heroSubtitle:
      "Ultra-lightweight passive UHF tags optimized for mass-participation marathons. Attach to bibs. Deliver reliable start and split times effortlessly.",
    image: "/Assets/landing2/RunningChip2.png",
    image2: "/Assets/landing2/RunningChip1.png",
    videoMp4: "/Assets/Device/RunningAsset1.mp4",
    specs: [
      { value: "3g", label: "Ultra-Light Weight" },
      { value: "0.2s", label: "Split Accuracy" },
      { value: "∞", label: "No Battery Needed" },
    ],
    overviewHeading: "Millions of finishers.\nOne tiny chip.",
    overviewBody:
      "The Running Chip is a single-use passive UHF tag designed for high-volume marathons and running events. Weighing just 3 grams, it attaches directly to the race bib and requires no battery — drawing power from the antenna field as the runner crosses each timing mat. Cost-effective and reliable, it's the gold standard for mass-participation events worldwide.",
    features: [
      {
        tag: "Efficiency",
        title: "Zero Maintenance Required",
        description:
          "No charging, no pairing, no activation. Each Running Chip is pre-encoded and ready to deploy straight from the box. Event staff simply attach them to bibs during registration — no technical expertise required.",
      },
      {
        tag: "Scale",
        title: "Built for Mass Events",
        description:
          "Optimized for events with 10,000+ participants. The passive UHF protocol handles simultaneous reads from hundreds of runners crossing the timing mat at once, ensuring that every single finisher time is captured accurately.",
      },
    ],
    scrollFeatures: [
      {
        tag: "Performance",
        title: "Built different.",
        description: "Every component is precision-engineered and stress-tested across hundreds of events worldwide."
      },
      {
        tag: "Reliability",
        title: "Zero compromise.",
        description: "From scorching tropical races to cold mountain trails — this hardware doesn't flinch."
      },
      {
        tag: "Tested",
        title: "Battle-proven.",
        description: "Deployed across 500+ events. Trusted by professional race organizers worldwide."
      }
    ],
    ctaTitle: "Scale your next\nmarathon with confidence.",
    ctaSubtitle: "Order Running Chips in bulk for your next mass-participation event.",
  },
};

/* ─── Custom Hook: Scroll Reveal via IntersectionObserver ─── */
function useScrollReveal(deps: unknown[] = []) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove("opacity-0", "translate-y-10");
            entry.target.classList.add("opacity-100", "translate-y-0");
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -50px 0px" }
    );

    document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* ─── DevicePage Component ─── */
export default function DevicePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [showNav, setShowNav] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const scrollVideoRef = useRef<HTMLVideoElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollVideoProgress, setScrollVideoProgress] = useState(0);

  // Smooth video scrubbing refs
  const targetTime = useRef(0);
  const currentVideoTime = useRef(0);
  const rafRef = useRef<number>();

  // Gallery state
  const galleryRef = useRef<HTMLDivElement>(null);
  const [activeGalleryFrame, setActiveGalleryFrame] = useState(0);
  const [isGalleryPlaying, setIsGalleryPlaying] = useState(false);

  // Mask Reveal state
  const maskSectionRef = useRef<HTMLElement>(null);
  const [maskProgress, setMaskProgress] = useState(0);

  const device = useMemo(() => (slug ? DEVICES[slug] : undefined), [slug]);

  useScrollReveal([slug]);

  // Video interpolation loop
  useEffect(() => {
    const updateVideoTime = () => {
      if (scrollVideoRef.current && scrollVideoRef.current.readyState >= 2 && scrollVideoRef.current.duration) {
        // Lerp factor (lower = smoother but more delayed)
        const lerpFactor = 0.08;
        currentVideoTime.current += (targetTime.current - currentVideoTime.current) * lerpFactor;
        
        // Only update if difference is meaningful to save resources
        if (Math.abs(targetTime.current - currentVideoTime.current) > 0.001) {
          scrollVideoRef.current.currentTime = currentVideoTime.current;
        }
      }
      rafRef.current = requestAnimationFrame(updateVideoTime);
    };
    
    rafRef.current = requestAnimationFrame(updateVideoTime);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Show sticky nav after scrolling past hero + drive scroll video
  const handleScroll = useCallback(() => {
    if (heroRef.current) {
      setShowNav(heroRef.current.getBoundingClientRect().bottom < 0);
    }

    // Scroll-controlled video zoom and text overlays
    if (scrollContainerRef.current) {
      const rect = scrollContainerRef.current.getBoundingClientRect();
      const scrollHeight = scrollContainerRef.current.offsetHeight - window.innerHeight;
      const rawProgress = -rect.top / scrollHeight;
      const progress = Math.max(0, Math.min(1, rawProgress));
      setScrollVideoProgress(progress);

      if (scrollVideoRef.current && scrollVideoRef.current.duration) {
        targetTime.current = progress * scrollVideoRef.current.duration;
      }
    }

    // Mask reveal section
    if (maskSectionRef.current) {
      const rect = maskSectionRef.current.getBoundingClientRect();
      const scrollHeight = maskSectionRef.current.offsetHeight - window.innerHeight;
      const rawProgress = -rect.top / scrollHeight;
      const progress = Math.max(0, Math.min(1, rawProgress));
      setMaskProgress(progress);
    }
  }, []);

  const handleGalleryScroll = useCallback(() => {
    if (!galleryRef.current || !device?.features) return;
    const { scrollLeft, scrollWidth, clientWidth } = galleryRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) return;
    const progress = scrollLeft / maxScroll;
    const activeIdx = Math.round(progress * (device.features.length - 1));
    if (activeIdx !== activeGalleryFrame) {
      setActiveGalleryFrame(activeIdx);
    }
  }, [device?.features, activeGalleryFrame]);

  // Helper to scroll horizontally without affecting vertical window scroll
  const scrollToCard = useCallback((idx: number) => {
    if (!galleryRef.current) return;
    const container = galleryRef.current;
    const cards = container.querySelectorAll('.gallery-card');
    if (cards && cards[idx]) {
      const card = cards[idx] as HTMLElement;
      // Calculate perfect center position horizontally
      const scrollPos = card.offsetLeft - container.clientWidth / 2 + card.clientWidth / 2;
      container.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, []);

  // Handle Autoplay for gallery
  useEffect(() => {
    if (!isGalleryPlaying || !device?.features) return;
    const interval = setInterval(() => {
      const nextIdx = (activeGalleryFrame + 1) % device.features.length;
      scrollToCard(nextIdx);
    }, 3500);
    return () => clearInterval(interval);
  }, [isGalleryPlaying, activeGalleryFrame, device?.features, scrollToCard]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Scroll to top on mount
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const timer = setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }), 50);
    return () => clearTimeout(timer);
  }, [slug]);

  /* ── 404 ── */
  if (!device) {
    return (
      <div className="bg-black text-[#f5f5f7] min-h-screen flex items-center justify-center font-[Inter,system-ui,sans-serif]">
        <div className="text-center px-6">
          <h1 className="text-5xl md:text-7xl font-black mb-4">Device Not Found</h1>
          <p className="text-white/50 mb-8 text-lg">The device you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate("/")}
            className="px-8 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_40px_rgba(220,38,38,0.4)] cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="bg-black text-[#f5f5f7] overflow-clip font-[Inter,system-ui,sans-serif] antialiased">
      {/* ═══════════════════════════════════════════
          STICKY NAV — appears after hero scroll
          ═══════════════════════════════════════════ */}
      <nav
        className={`fixed top-0 inset-x-0 z-[90] h-[52px] flex items-center justify-center px-6 bg-black/70 backdrop-blur-2xl backdrop-saturate-[1.8] border-b border-white/8 transition-transform duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] ${showNav ? "translate-y-0" : "-translate-y-full"
          }`}
      >
        <div className="max-w-[1120px] w-full flex items-center justify-between max-md:justify-center relative">
          {/* Back button in nav (visible when sticky nav is shown) */}
          <button
            onClick={() => navigate("/")}
            className="absolute left-0 max-md:-left-2 text-white/60 hover:text-white transition-colors flex items-center justify-center cursor-pointer md:hidden"
            aria-label="Back"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="hidden md:flex text-white/60 hover:text-white transition-colors items-center justify-center cursor-pointer"
              aria-label="Back"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="text-sm font-bold tracking-tight">{device.name}</span>
          </div>

          <div className="hidden md:flex items-center gap-7">
            {["Overview", "Specs", "Features"].map((label) => (
              <button
                key={label}
                onClick={() => scrollTo(label.toLowerCase())}
                className="text-xs font-medium text-white/60 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => navigate("/")}
              className="text-xs font-medium text-white hover:text-white/80 transition-colors bg-transparent border-none cursor-pointer"
            >
              All Products
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════
          BACK BUTTON — floating pill
          ═══════════════════════════════════════════ */}
      <motion.button
        onClick={() => navigate("/")}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: showNav ? 0 : 1, y: showNav ? -10 : 0, x: 0 }}
        transition={{ delay: showNav ? 0 : 0.8, duration: 0.6 }}
        className={`fixed top-5 left-5 z-[100] flex items-center gap-2 px-5 py-2.5 bg-black/50 backdrop-blur-xl border border-white/10 rounded-full text-[#f5f5f7] text-[13px] font-semibold tracking-wide cursor-pointer hover:bg-white/15 hover:border-white/25 hover:-translate-x-0.5 transition-all duration-300 max-md:top-3 max-md:left-3 max-md:px-4 max-md:py-2 max-md:text-xs ${showNav ? 'pointer-events-none' : ''}`}
      >
        <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </motion.button>

      {/* ═══════════════════════════════════════════
          HERO — Full-Screen Video
          ═══════════════════════════════════════════ */}
      <section ref={heroRef} className="relative w-full h-screen min-h-[600px] max-md:min-h-[100svh] overflow-hidden flex items-center justify-center">
        {/* Video BG */}
        <div className="absolute inset-0 z-0">
          <video
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={device.image}
          >
            <source src={device.videoMp4} type="video/mp4" />
          </video>
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 z-[1]" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0.85) 100%)" }} />

        {/* Content */}
        <motion.div
          className="relative z-[2] text-center px-6 max-w-[1000px]"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-block text-xs font-bold tracking-[0.35em] uppercase text-red-600 mb-5">
            {device.tag}
          </span>
          <h1 className="text-[clamp(48px,10vw,96px)] font-black tracking-[-0.04em] leading-[0.92] uppercase mb-6 bg-gradient-to-b from-white from-30% to-white/60 bg-clip-text text-transparent">
            {device.name}
          </h1>
          <p className="text-[clamp(16px,2.2vw,22px)] text-[#f5f5f7]/70 max-w-[600px] mx-auto mb-10 leading-relaxed max-md:text-[15px] max-md:px-2">
            {device.heroSubtitle}
          </p>
          <button
            onClick={() => scrollTo("overview")}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-[#f5f5f7] text-black rounded-full text-[15px] font-bold tracking-wide cursor-pointer hover:bg-white hover:scale-[1.04] hover:shadow-[0_12px_40px_rgba(255,255,255,0.2)] transition-all duration-300 border-none"
          >
            Learn More
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </button>
        </motion.div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[2] flex flex-col items-center gap-2 animate-bounce max-md:bottom-6">
          <span className="text-[11px] font-semibold tracking-[0.3em] uppercase text-white/40">Scroll</span>
          <svg className="w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          PRODUCT SHOWCASE — Centered Image
          ═══════════════════════════════════════════ */}
      <div className="flex items-center justify-center py-20 px-6 max-md:py-12 max-md:px-4" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgb(20,20,20) 15%, rgb(20,20,20) 85%, rgba(0,0,0,0) 100%)" }}>
        <motion.img
          className="max-w-[min(600px,80%)] max-md:max-w-[90%] h-auto drop-shadow-[0_30px_80px_rgba(0,0,0,0.6)] hover:scale-[1.03] transition-transform duration-1000 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          src={device.image}
          alt={device.name}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* ═══════════════════════════════════════════
          OVERVIEW — Text Block + Spec Grid
          ═══════════════════════════════════════════ */}
      <section className="relative py-28 px-6 max-md:py-16 max-md:px-4 bg-black" id="overview">
        <div className="max-w-[1120px] mx-auto">
          {/* Text block */}
          <div
            data-reveal
            className="text-center max-w-[800px] mx-auto opacity-0 translate-y-10 transition-all duration-800 ease-[cubic-bezier(0.16,1,0.3,1)]"
          >
            <span className="text-xs font-bold tracking-[0.35em] uppercase text-red-600 mb-4 block">Overview</span>
            <h2 className="text-[clamp(36px,6vw,64px)] font-black tracking-[-0.04em] leading-[1.05] mb-6 whitespace-pre-line">
              {device.overviewHeading}
            </h2>
            <p className="text-[clamp(16px,2vw,20px)] text-[#f5f5f7]/65 leading-relaxed max-w-[650px] mx-auto">
              {device.overviewBody}
            </p>
          </div>

          {/* Spec grid - Apple Pro Glass Cards */}
          <div
            data-reveal
            id="specs"
            className="grid grid-cols-3 max-md:grid-cols-1 gap-6 max-md:gap-4 mt-20 max-md:mt-12 opacity-0 translate-y-10 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] delay-200"
          >
            {device.specs.map((spec, idx) => (
              <div key={idx} className="relative py-14 px-8 max-md:py-10 max-md:px-6 bg-[#0a0a0a] rounded-[32px] max-md:rounded-[24px] text-center border border-white/[0.04] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:bg-[#111] hover:border-white/[0.08] hover:-translate-y-1 transition-all duration-500 overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-b from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 text-[clamp(40px,5vw,64px)] max-[480px]:text-[40px] font-black tracking-tighter leading-none mb-4 bg-gradient-to-br from-[#f5f5f7] to-[#888] bg-clip-text text-transparent group-hover:from-red-500 group-hover:to-red-400 transition-colors duration-500">
                  {spec.value}
                </div>
                <div className="relative z-10 text-[14px] font-semibold uppercase tracking-[0.2em] text-[#f5f5f7]/40 group-hover:text-[#f5f5f7]/60 transition-colors duration-500">
                  {spec.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SCROLL VIDEO — Apple-style scroll-driven
          ═══════════════════════════════════════════ */}
      <div ref={scrollContainerRef} className="relative h-[500vh]">
        <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center">
          {/* Video bg — cinematic background loop with scroll zoom */}
          <div
            className="absolute inset-0 z-0 transition-transform duration-75"
            style={{ transform: `scale(${1 + scrollVideoProgress * 0.15})` }}
          >
            <video
              ref={scrollVideoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="auto"
              poster={device.image}
            >
              <source src={device.videoMp4} type="video/mp4" />
            </video>
          </div>

          {/* Dynamic overlay — gets darker as you scroll */}
          <div
            className="absolute inset-0 z-[1] transition-opacity duration-100"
            style={{ background: `rgba(0,0,0,${0.3 + scrollVideoProgress * 0.4})` }}
          />

          {/* Dynamic text overlays mapping through scrollFeatures */}
          {device.scrollFeatures.map((feature, idx) => {
            const startPhase = idx * 0.33;
            const endPhase = (idx + 1) * 0.33;
            // The last phase stays visible until 1.0
            const isVisible = idx === 2
              ? scrollVideoProgress >= startPhase
              : scrollVideoProgress >= startPhase && scrollVideoProgress < endPhase;

            return (
              <div
                key={idx}
                className="absolute inset-0 z-[2] flex items-center justify-center px-6 transition-opacity duration-500"
                style={{
                  opacity: isVisible ? 1 : 0,
                  pointerEvents: isVisible ? 'auto' : 'none'
                }}
              >
                <div className="text-center max-w-[800px]">
                  <span className="text-xs font-bold tracking-[0.35em] uppercase text-red-600 mb-4 block">
                    {feature.tag}
                  </span>
                  <h2 className="text-[clamp(36px,6vw,64px)] font-black tracking-[-0.04em] leading-[1.05] mb-6 drop-shadow-xl">
                    {feature.title}
                  </h2>
                  <p className="text-[clamp(16px,2vw,20px)] text-[#f5f5f7]/80 leading-relaxed max-w-[600px] mx-auto drop-shadow-lg">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Scroll progress indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[3] flex flex-col items-center gap-3">
            <div className="w-[2px] h-16 bg-white/10 rounded-full overflow-hidden">
              <div
                className="w-full bg-red-600 rounded-full transition-all duration-100"
                style={{ height: `${scrollVideoProgress * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-white/30">Scroll</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          FEATURES GALLERY — Apple Style Carousel
          ═══════════════════════════════════════════ */}
      <section className="relative bg-[#161617]" id="features">
        <div className="w-full relative py-32 max-md:py-20">

          {/* Sticky Slider Track */}
          <div className="absolute inset-x-0 top-0 bottom-16 pointer-events-none z-50">
            <div className="sticky flex justify-center items-center w-full" style={{ top: 'calc(100vh - 120px)' }}>
              <div className="flex items-center gap-4 pointer-events-auto">
                {/* Pill */}
                <div className="flex items-center bg-[#2d2d2f]/80 backdrop-blur-xl border border-white/10 rounded-full px-5 py-3.5 gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  {device.features.map((_, idx) => (
                    <div
                      key={idx}
                      onClick={() => scrollToCard(idx)}
                      className={`h-2.5 rounded-full cursor-pointer hover:bg-white transition-all duration-300 ${idx === activeGalleryFrame ? 'w-10 bg-[#f5f5f7]' : 'w-2.5 bg-[#6e6e73]'}`}
                    />
                  ))}
                </div>
                {/* Play Button */}
                <button
                  onClick={() => setIsGalleryPlaying(!isGalleryPlaying)}
                  className="flex items-center justify-center w-11 h-11 rounded-full bg-[#2d2d2f]/80 backdrop-blur-xl border border-white/10 text-[#f5f5f7] hover:bg-[#3d3d3f] hover:text-white transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)] cursor-pointer"
                >
                  {isGalleryPlaying ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                      <path d="M5 3l16 9-16 9V3z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <h2 className="text-[clamp(40px,5vw,56px)] font-bold tracking-tight leading-[1.05] text-[#f5f5f7] mb-16 max-w-[1120px] mx-auto px-6 max-md:px-4 relative z-10">
            Keunggulan demi keunggulan.
          </h2>

          <div className="relative z-10">
            {/* Scroll Container */}
            <div
              ref={galleryRef}
              onScroll={handleGalleryScroll}
              className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              style={{ paddingLeft: 'max(24px, calc(50vw - 500px))', paddingRight: 'max(24px, calc(50vw - 500px))' }}
            >
              {device.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="gallery-card snap-center shrink-0 w-[1000px] max-w-[85vw] h-[600px] max-lg:h-[650px] bg-[#050505] rounded-[48px] max-lg:rounded-[32px] p-0 flex flex-col overflow-hidden relative group border border-white/[0.05] shadow-2xl transition-all duration-700 hover:border-white/[0.15] hover:shadow-[0_0_80px_rgba(220,38,38,0.1)]"
                >
                  {/* Huge Background Typography */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] flex items-center justify-center pointer-events-none opacity-20 group-hover:opacity-40 transition-all duration-1000 ease-out group-hover:scale-105 group-hover:rotate-[-2deg]">
                    <h3 className="text-[160px] max-lg:text-[80px] font-black uppercase text-transparent whitespace-nowrap leading-none" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.4)' }}>
                      {feature.title} • {feature.title}
                    </h3>
                  </div>

                  {/* Floating Image */}
                  <div className="absolute inset-y-0 right-[-5%] w-[70%] max-lg:relative max-lg:inset-auto max-lg:w-full max-lg:h-[45%] max-lg:mt-6 flex items-center justify-center z-10 transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.15] group-hover:-translate-x-8 max-lg:group-hover:-translate-y-2 max-lg:group-hover:-translate-x-0">
                    <img
                      src={idx === 0 ? device.image : device.image2}
                      alt={feature.title}
                      className="w-auto h-[85%] max-lg:h-full object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,0.8)] group-hover:drop-shadow-[0_40px_80px_rgba(220,38,38,0.2)] transition-all duration-700"
                    />
                  </div>

                  {/* Glassmorphic Content Dock */}
                  <div className="absolute bottom-10 left-10 w-[48%] max-lg:relative max-lg:bottom-auto max-lg:left-auto max-lg:w-[calc(100%-2rem)] max-lg:mx-auto max-lg:mt-auto max-lg:mb-4 p-10 max-lg:p-6 bg-[#0a0a0a]/70 max-lg:bg-[#0a0a0a]/85 backdrop-blur-2xl rounded-[36px] max-lg:rounded-[24px] border border-white/10 z-20 group-hover:bg-[#0f0f0f]/90 group-hover:-translate-y-3 max-lg:group-hover:-translate-y-1 transition-all duration-700 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-3 mb-6 max-lg:mb-4">
                      <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                      <span className="text-red-500 text-[11px] font-bold tracking-[0.25em] uppercase">
                        {feature.tag}
                      </span>
                    </div>
                    <h3 className="text-[clamp(28px,2.5vw,40px)] max-lg:text-[24px] font-black tracking-tight leading-[1.05] text-white mb-5 max-lg:mb-3 group-hover:text-red-50 transition-colors duration-500">
                      {feature.title}
                    </h3>
                    <p className="text-[16px] max-lg:text-[14px] text-white/50 leading-relaxed font-medium group-hover:text-white/70 transition-colors duration-500">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          MASK REVEAL SECTION
          ═══════════════════════════════════════════ */}
      <section ref={maskSectionRef} className="h-[300vh] bg-black relative">
        <div className="sticky top-0 h-screen w-full overflow-hidden">

          {/* The Video (Background) */}
          <video
            src="/Assets/Device/closing%20device.mp4"
            autoPlay muted loop playsInline
            className="absolute inset-0 w-full h-full object-cover z-0"
          />

          {/* The Text Mask (Foreground) */}
          <div className="absolute inset-0 bg-black text-white mix-blend-multiply pointer-events-none overflow-hidden z-10">
            <div 
              className="absolute inset-0 bg-white"
              style={{ opacity: maskProgress < 0.1 ? 1 : Math.max(0, 1 - (maskProgress - 0.1) * 8) }}
            />
            <h2
              className="absolute left-1/2 top-1/2 font-black tracking-tighter whitespace-nowrap"
              style={{
                fontSize: `clamp(60px, ${180 / device.name.length}vw, 300px)`,
                transform: `translate(-50%, -50%) scale(${maskProgress < 0.4
                    ? 1 + Math.pow(1 - maskProgress * 2.5, 4) * 1500
                    : Math.max(0, 1 - (maskProgress - 0.4) * 2.5)
                  })`,
                transformOrigin: 'center center',
                opacity: maskProgress > 0.8 ? 0 : 1
              }}
            >
              {device.name}.
            </h2>
          </div>

          {/* The Fade-In Performance Text */}
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4 bg-black/40"
            style={{
              opacity: maskProgress > 0.8 ? (maskProgress - 0.8) * 5 : 0,
              transform: `translateY(${maskProgress > 0.8 ? 0 : 20}px)`,
              transition: 'opacity 0.1s, transform 0.1s',
              pointerEvents: maskProgress > 0.8 ? 'auto' : 'none'
            }}
          >
            <span className="text-[#f5f5f7] font-semibold tracking-widest text-sm mb-4 uppercase">
              {device.name}
            </span>
            <h3 className="text-[#f5f5f7] font-bold text-[clamp(32px,5vw,64px)] tracking-tight whitespace-pre-line leading-[1.1] mb-6 drop-shadow-2xl">
              {device.ctaTitle}
            </h3>
            <p className="text-[#a1a1a6] text-[19px] max-w-2xl mb-8 drop-shadow-lg">
              {device.ctaSubtitle}
            </p>
            <button className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-colors cursor-pointer">
              Call Us Now!
            </button>
          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════ */}
      <footer className="text-center py-8 px-4 text-xs text-[#f5f5f7]/30 border-t border-white/[0.06] bg-black">
        <p>© 2026 LUMPAT × IZT Timing. All rights reserved.</p>
      </footer>
    </div>
  );
}
