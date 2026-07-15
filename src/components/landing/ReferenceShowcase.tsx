import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLenis } from "lenis/react";

const SHOWCASE_DATA = [
  {
    tag: "01",
    stat: "100%",
    statDesc: "Train with the Best to\nBecome Your Best",
    bgLine1: "Skilled",
    bgLine2: "Quality-",
    bgLine3: "Focused",
    bgLine4: "Instructor",
    title: "It Is Also Highly Trusted",
    desc: "Join Thousands Who Rely on Our Program—Built with ",
    descHighlight: "Experience,",
    descEnd: " Backed by Results, and Trusted by Many",
    image: "/Assets/carousel/p1.webp",
    name: "Lumpat Platform",
    role: "Event Management"
  },
  {
    tag: "02",
    stat: "0.2s",
    statDesc: "Real-Time Sync\nInstant Delivery",
    bgLine1: "Live",
    bgLine2: "Results-",
    bgLine3: "Driven",
    bgLine4: "Platform",
    title: "Instant Live Results",
    desc: "Publish race results instantly as athletes cross with ",
    descHighlight: "sub-second",
    descEnd: " latency and precision.",
    image: "/Assets/carousel/p2.webp",
    name: "Live Timing",
    role: "Real-Time Engine"
  },
  {
    tag: "03",
    stat: "3D",
    statDesc: "Interactive Maps\nFull Control",
    bgLine1: "Route",
    bgLine2: "Mapping-",
    bgLine3: "Visual",
    bgLine4: "Explorer",
    title: "Interactive Route Mapping",
    desc: "Design and share detailed 3D route maps with ",
    descHighlight: "elevation profiles",
    descEnd: " and checkpoint locations.",
    image: "/Assets/carousel/p3.webp",
    name: "Route Builder",
    role: "Map Designer"
  },
  {
    tag: "04",
    stat: "Multi",
    statDesc: "Sport Ready\nAll Disciplines",
    bgLine1: "Multi",
    bgLine2: "Sport-",
    bgLine3: "Trans",
    bgLine4: "ition",
    title: "Seamless Multisport",
    desc: "Handle complex transition zones for ",
    descHighlight: "Triathlons",
    descEnd: " and Duathlons effortlessly.",
    image: "/Assets/carousel/p4.webp",
    name: "Multisport Hub",
    role: "Transition Manager"
  },
  {
    tag: "05",
    stat: "Pro",
    statDesc: "Event Portfolio\nShowcase Ready",
    bgLine1: "Event",
    bgLine2: "Port-",
    bgLine3: "folio",
    bgLine4: "Builder",
    title: "Showcase Your Events",
    desc: "Build a stunning portfolio page for all your ",
    descHighlight: "past and upcoming",
    descEnd: " races and events.",
    image: "/Assets/carousel/p5.webp",
    name: "Event Portfolio",
    role: "Brand Showcase"
  }
];

/*
 * The stepped phone shape path — like two overlapping phone screens.
 * Upper-left is wider, there's a smooth step/notch on the left side
 * going inward, then the lower portion continues down.
 * viewBox: 0 0 340 480
 */
const STEPPED_SHAPE_PATH =
  "M 40 0 H 300 C 322 0 340 18 340 40 V 440 C 340 462 322 480 300 480 H 140 C 118 480 100 462 100 440 V 310 C 100 288 82 270 60 270 H 40 C 18 270 0 252 0 230 V 40 C 0 18 18 0 40 0 Z";

function SteppedBlueShape({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 340 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="blue-stepped-grad" x1="0" y1="0" x2="340" y2="480" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="45%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>
      </defs>
      <path d={STEPPED_SHAPE_PATH} fill="url(#blue-stepped-grad)" />
    </svg>
  );
}

/*
 * The image mask — same stepped shape but mirrored/adjusted for the photo.
 * This clips the image into the same compound shape.
 */
const IMAGE_SHAPE_PATH =
  "M 40 0 H 260 C 282 0 300 18 300 40 V 440 C 300 462 282 480 260 480 H 140 C 118 480 100 462 100 440 V 290 C 100 268 82 250 60 250 H 40 C 18 250 0 232 0 210 V 40 C 0 18 18 0 40 0 Z";

function SteppedImageClipDef() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <clipPath id="stepped-image-clip" clipPathUnits="objectBoundingBox">
          <path
            d="M 0.133 0 L 0.867 0 C 0.94 0 1 0.0375 1 0.0833 L 1 0.9167 C 1 0.9625 0.94 1 0.867 1 L 0.467 1 C 0.393 1 0.333 0.9625 0.333 0.9167 L 0.333 0.604 C 0.333 0.558 0.273 0.521 0.2 0.521 L 0.133 0.521 C 0.06 0.521 0 0.483 0 0.4375 L 0 0.0833 C 0 0.0375 0.06 0 0.133 0 Z"
          />
        </clipPath>
      </defs>
    </svg>
  );
}

export default function ReferenceShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const current = SHOWCASE_DATA[activeIndex] || SHOWCASE_DATA[0];
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useLenis((lenis) => {
    setScrollY(lenis.scroll);
  });

  const centerOffset = isMobile ? 850 : 1350;
  const diffScroll = scrollY - centerOffset;

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % SHOWCASE_DATA.length);
  }, []);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + SHOWCASE_DATA.length) % SHOWCASE_DATA.length);
  }, []);

  // Auto-play timer to cycle slides every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      goNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [activeIndex, goNext]);

  return (
    <section
      className="relative w-full overflow-hidden bg-[#F3F4F6]"
      style={{ minHeight: "90vh" }}
      id="reference-showcase"
    >
      <SteppedImageClipDef />

      {/* ========== BACKGROUND TYPOGRAPHY ========== */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`bg-${activeIndex}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30, transition: { duration: 0.2 } }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center leading-[1.1] w-full text-center"
            style={{ y: diffScroll * -0.15 }}
          >
            <div className="flex items-baseline justify-center gap-[0.3em] flex-wrap">
              <span className="font-light text-[55px] sm:text-[90px] md:text-[130px] lg:text-[170px] tracking-[0.08em] text-[#1a1a1a] opacity-[0.07]">
                {current.bgLine1}
              </span>
              <span className="font-light text-[55px] sm:text-[90px] md:text-[130px] lg:text-[170px] tracking-[0.08em] text-[#1a1a1a] opacity-[0.07]">
                {current.bgLine2}
              </span>
            </div>
            <div className="flex items-baseline justify-center gap-[0.3em] flex-wrap mt-2 md:mt-8">
              <span className="font-light text-[55px] sm:text-[90px] md:text-[130px] lg:text-[170px] tracking-[0.08em] text-[#1a1a1a] opacity-[0.07]">
                {current.bgLine3}
              </span>
              <span className="font-light text-[55px] sm:text-[90px] md:text-[130px] lg:text-[170px] tracking-[0.08em] text-[#1a1a1a] opacity-[0.07]">
                {current.bgLine4}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ========== MAIN CONTENT ========== */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-16 pb-28 md:pt-20 md:pb-48 flex flex-col items-center scroll-reveal" style={{ minHeight: "90vh" }}>

        {/* ---- TOP ROW: Stat Circle + Info Card ---- */}
        <div
          className="w-full flex justify-between items-start mb-4 md:mb-0 relative"
          style={{
            maxWidth: "880px",
            ...(isMobile ? { height: "190px", width: "310px" } : {})
          }}
        >

          {/* Left: Stat Circle */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`stat-${activeIndex}`}
              initial={{ opacity: 0, scale: 0.7, x: -30 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.7, x: -20, transition: { duration: 0.15, ease: "easeIn" } }}
              transition={{ type: "spring", stiffness: 250, damping: 22 }}
              className={isMobile
                ? "absolute z-30 w-[85px] h-[85px] rounded-full bg-white flex flex-col items-center justify-center text-center shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
                : "w-36 h-36 md:w-48 md:h-48 rounded-full bg-white shrink-0 z-20 flex flex-col items-center justify-center text-center"
              }
              style={{
                boxShadow: isMobile ? undefined : "0 12px 50px rgba(0,0,0,0.06)",
                y: diffScroll * -0.05,
                ...(isMobile ? { left: "-16px", top: "98px" } : {})
              }}
            >
              <span className={`${isMobile ? 'text-xl' : 'text-3xl md:text-[42px]'} font-black text-stone-900 leading-none tracking-tight`}>{current.stat}</span>
              {!isMobile && (
                <span className="text-[8px] md:text-[10px] px-5 mt-2 leading-snug font-medium text-stone-400 whitespace-pre-line">{current.statDesc}</span>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Right: Info Card — Stepped compound shape */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`card-${activeIndex}`}
              initial={{ opacity: 0, x: 40, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -40, y: 5, transition: { duration: 0.15, ease: "easeIn" } }}
              transition={{ type: "spring", stiffness: 250, damping: 22, delay: 0.06 }}
              className="relative z-20 mt-2 md:mt-0"
              style={{
                width: isMobile ? "300px" : "420px",
                height: isMobile ? "120px" : "170px",
                y: diffScroll * 0.05,
                ...(isMobile ? { position: "absolute", top: 0, right: 0 } : {})
              }}
            >
              {/* SVG stepped card shape background + shadow */}
              <svg
                viewBox="0 0 420 170"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute inset-0 w-full h-full"
                style={{ filter: "drop-shadow(0 8px 30px rgba(0,0,0,0.06))" }}
                preserveAspectRatio="none"
              >
                <path
                  d="M 90 0 H 390 C 406.6 0 420 13.4 420 30 V 140 C 420 156.6 406.6 170 390 170 H 120 C 103.4 170 90 156.6 90 140 V 118 C 90 105 80 95 67 95 H 30 C 13.4 95 0 81.6 0 65 V 30 C 0 13.4 13.4 0 30 0 H 90 Z"
                  fill="white"
                />
              </svg>
              {/* Content positioned over the shape */}
              <div className="absolute inset-0">
                {/* # tag — centered in the left bump */}
                <div
                  className="absolute flex items-center justify-center"
                  style={{
                    left: 0,
                    top: 0,
                    width: isMobile ? "64px" : "90px",
                    height: isMobile ? "67px" : "95px"
                  }}
                >
                  <span className={`${isMobile ? 'text-lg' : 'text-2xl md:text-3xl'} font-black text-stone-900 leading-none`}>#{current.tag}</span>
                </div>
                {/* Title — vertically centered next to # tag */}
                <div
                  className="absolute flex items-center"
                  style={{
                    left: isMobile ? "70px" : "100px",
                    top: 0,
                    right: isMobile ? "10px" : "20px",
                    height: isMobile ? "67px" : "95px"
                  }}
                >
                  <h4 className={`${isMobile ? 'text-[15px] md:text-[18px]' : 'text-[18px] md:text-[22px]'} font-extrabold text-stone-900 leading-tight`}>{current.title}</h4>
                </div>
                {/* Description — below the title */}
                <div
                  className="absolute"
                  style={{
                    left: isMobile ? "78px" : "100px",
                    top: isMobile ? "48px" : "65px",
                    right: isMobile ? "10px" : "20px"
                  }}
                >
                  <p className={`${isMobile ? 'text-[12px] leading-[1.4]' : 'text-[13px] md:text-[15px] leading-[1.75]'} font-medium text-stone-400`}>
                    {current.desc}
                    <span className="text-stone-600 font-semibold">{current.descHighlight}</span>
                    {current.descEnd}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ---- CENTER: Stepped Blue Shape + Image ---- */}
        <div className="relative flex items-center justify-center w-full flex-1 py-8 md:py-12 -mt-16 md:-mt-24" style={{ minHeight: "620px" }}>

          {/* Image — custom shape from SVG, NO shape behind it */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`img-${activeIndex}`}
              initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, rotate: -5 }}
              exit={{ opacity: 0, scale: 0.8, rotate: -10, transition: { duration: 0.18, ease: "easeIn" } }}
              transition={{ type: "spring", stiffness: 130, damping: 18 }}
              className="relative z-10 w-[330px] h-[450px] sm:w-[380px] sm:h-[515px] md:w-[560px] md:h-[760px]"
              style={{
                filter: "drop-shadow(0 25px 50px rgba(0,0,0,0.15))",
                y: diffScroll * -0.03,
              }}
            >
              <svg
                viewBox="0 0 7303 9923"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
                style={{ overflow: "visible" }}
              >
                <defs>
                  <clipPath id="custom-photo-clip">
                    <path d="M71.9838 6934.2L2190.54 302.751C2248.58 121.089 2439.46 17.4273 2623.43 67.6615L4966.41 707.421C5070.62 735.876 5156.27 810.107 5199.25 909.214L5432.4 1446.86C5470.4 1534.49 5542.02 1603.18 5631.17 1637.48L7019.52 2171.67C7194.19 2238.88 7287 2429.85 7231.91 2608.71L5073.84 9616.13C5016.62 9801.94 4820.9 9907.48 4634.21 9853.19L2290.85 9171.83C2191.65 9142.98 2109.88 9072.48 2066.75 8978.61L1595.36 7952.64C1555.14 7865.11 1481.17 7797.61 1390.33 7765.56L292.645 7378.25C111.153 7314.21 13.4152 7117.53 71.9838 6934.2Z" />
                  </clipPath>
                </defs>

                <foreignObject
                  x="0" y="0" width="7303" height="9923"
                  clipPath="url(#custom-photo-clip)"
                >
                  <div style={{ width: "7303px", height: "9923px", position: "relative" }}>
                    <img
                      src={current.image}
                      alt={current.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    {/* Name overlay */}
                    <div style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: "300px 400px",
                      background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)",
                    }}>
                      <p style={{ color: "white", fontWeight: 700, fontSize: "280px", lineHeight: 1.3, margin: 0 }}>{current.name}</p>
                      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "200px", fontWeight: 500, margin: 0 }}>{current.role}</p>
                    </div>
                  </div>
                </foreignObject>
              </svg>
            </motion.div>
          </AnimatePresence>

          {/* Decorative gray circle */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute right-[12%] bottom-[22%] w-9 h-9 md:w-12 md:h-12 rounded-full bg-stone-300/50 hidden md:block z-5"
          />
        </div>

        {/* ---- BOTTOM: Nav Arrows + Dots ---- */}
        <div className="flex items-center justify-between w-full max-w-[540px] -mt-14 md:-mt-32 relative z-40">
          <button
            onClick={goPrev}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-stone-300 flex items-center justify-center text-stone-400 hover:border-stone-500 hover:text-stone-600 transition-all duration-300 cursor-pointer bg-transparent"
            aria-label="Previous"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className={`flex items-center ${isMobile ? "gap-1.5" : "gap-2"}`}>
            {SHOWCASE_DATA.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className="outline-none cursor-pointer"
                aria-label={`Slide ${idx + 1}`}
              >
                <motion.div
                  animate={{
                    width: activeIndex === idx ? (isMobile ? 16 : 24) : (isMobile ? 6 : 10),
                    backgroundColor: activeIndex === idx ? "#1a1a1a" : "#c4c4c4",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className={`${isMobile ? "h-1.5" : "h-2.5"} rounded-full`}
                />
              </button>
            ))}
          </div>

          <button
            onClick={goNext}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white hover:bg-stone-700 transition-all duration-300 cursor-pointer"
            style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.2)" }}
            aria-label="Next"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
