import { useState, useEffect, useMemo } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";

// ─── Local Hero Images ───
const GALLERY_IMAGES = [
  "/Assets/landing2/hero/2.webp",
  "/Assets/landing2/hero/2.webp",
  "/Assets/landing2/hero/3.webp",
  "/Assets/landing2/hero/4.webp",
  "/Assets/landing2/hero/5.webp",
  "/Assets/landing2/hero/6.webp",
  "/Assets/landing2/hero/7.webp",
  "/Assets/landing2/hero/8.webp",
  "/Assets/landing2/hero/9.webp",
  "/Assets/landing2/hero/10.webp",
  "/Assets/landing2/hero/11.webp",
  "/Assets/landing2/hero/1.webp",
  "/Assets/landing2/hero/2.webp",
  "/Assets/landing2/hero/3.webp",
  "/Assets/landing2/hero/4.webp",
  "/Assets/landing2/hero/5.webp",
  "/Assets/landing2/hero/6.webp",
  "/Assets/landing2/hero/7.webp",
  "/Assets/landing2/hero/8.webp",
  "/Assets/landing2/hero/9.webp",
  "/Assets/landing2/hero/10.webp",
  "/Assets/landing2/hero/11.webp",
  "/Assets/landing2/hero/1.webp",
  "/Assets/landing2/hero/2.webp",
];

const TOTAL_CARDS = 24;
const PHASE_DURATION_MS = 4000;

type Phase = "init" | "circle" | "splash";

// ─── Deterministic seeded random generator for stable splash offsets ───
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function generateSplashSeeds(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const s = i + 42; // stable seed base
    return {
      x: (seededRandom(s * 1) - 0.5) * 600,        // widened
      y: (seededRandom(s * 2) - 0.5) * 600,        // widened
      rot: (seededRandom(s * 3) - 0.5) * 120,      // -60 to +60
      rotX: (seededRandom(s * 4) - 0.5) * 120,     // 3D tumble
      rotY: (seededRandom(s * 5) - 0.5) * 120,     // 3D tumble
      z: (seededRandom(s * 6) - 0.5) * 300,        // Depth
    };
  });
}

export default function HeroCircularGallery() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("init");
  const [isMobile, setIsMobile] = useState(false);
  const [masterRotation, setMasterRotation] = useState(0);
  const [isPulledUp, setIsPulledUp] = useState(false);

  // ─── Deterministic splash offsets (never re-generated) ───
  const splashSeeds = useMemo(() => generateSplashSeeds(TOTAL_CARDS), []);

  // ─── Responsive observer ───
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ─── Intro Sequence: 1.2s delay before transition to splash ───
  useEffect(() => {
    const initTimer = setTimeout(() => {
      setPhase("splash");
    }, 1200);

    const circleTimer = setTimeout(() => {
      setPhase("circle");
    }, 3200); // 1.2s + 2.0s

    return () => {
      clearTimeout(initTimer);
      clearTimeout(circleTimer);
    };
  }, []);

  // Reset pull up when user scrolls back up
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < 100) {
        setIsPulledUp(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ─── 3-Phase State Machine Loop ───
  useEffect(() => {
    if (phase === "init") return;

    const interval = setInterval(() => {
      setPhase((prev) => (prev === "circle" ? "splash" : "circle"));
    }, PHASE_DURATION_MS);

    return () => clearInterval(interval);
  }, [phase === "init"]);

  // ─── Master container slow rotation (accumulates over time) ───
  useEffect(() => {
    if (phase === "init") return;

    let animFrame: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Rotate at ~6 deg/sec during circle, pause (0 deg/sec) during splash
      const speed = phase === "circle" ? 6 : 0;
      setMasterRotation((prev) => prev + speed * dt);
      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [phase]);

  // ─── Responsive dimensions ───
  const radius = isMobile ? 120 : 340;
  const cardW = isMobile ? 36 : 60;
  const cardH = isMobile ? 48 : 80;

  // ─── Scroll-linked Parallax Animation ───
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 800], [0, 250]);
  const heroScale = useTransform(scrollY, [0, 800], [1, 0.85]);
  const heroOpacity = useTransform(scrollY, [0, 800], [1, 0]);
  const heroBlur = useTransform(scrollY, [0, 800], ["blur(0px)", "blur(12px)"]);

  return (
    <section
      id="hero-gallery"
      className="relative w-full overflow-hidden flex items-center justify-center"
      style={{
        height: "100svh",
        background: "linear-gradient(180deg, #F1F3F6 0%, #EAECF0 50%, #F1F3F6 100%)",
      }}
    >
      <motion.div
        className="absolute inset-0 w-full h-full flex items-center justify-center"
        style={{
          y: heroY,
          scale: heroScale,
          opacity: heroOpacity,
          filter: heroBlur,
        }}
      >
        {/* Subtle radial glow behind the orbit */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: isMobile ? 300 : 800,
          height: isMobile ? 300 : 800,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(204,255,0,0.06) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* ─── Rotating Master Container ─── */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ willChange: "transform", perspective: "1200px" }}
      >
        <div
          style={{
            transform: `rotate(${masterRotation}deg)`,
            willChange: "transform",
            width: 0,
            height: 0,
            position: "relative",
            transformStyle: "preserve-3d"
          }}
        >
          {GALLERY_IMAGES.map((src, index) => {
            const angle = (index / TOTAL_CARDS) * 2 * Math.PI;
            const isInit = phase === "init";
            const isSplash = phase === "splash";

            // ─── Position math ───
            const circleX = Math.cos(angle) * radius;
            const circleY = Math.sin(angle) * radius;
            const tangentialRot = (angle + Math.PI / 2) * (180 / Math.PI);

            const targetX = isInit ? 0 : (isSplash
              ? circleX + splashSeeds[index].x * (isMobile ? 0.45 : 1)
              : circleX);
            const targetY = isInit ? 0 : (isSplash
              ? circleY + splashSeeds[index].y * (isMobile ? 0.45 : 1)
              : circleY);
            const targetRotation = isInit ? 0 : (isSplash
              ? splashSeeds[index].rot
              : tangentialRot);

            // Counter-rotate text/cards so they don't spin with master
            const counterRotate = isInit ? 0 : (isSplash ? 0 : -masterRotation);

            return (
              <motion.div
                key={index}
                initial={{
                  x: 0,
                  y: 0,
                  z: 0,
                  scale: index === 0 ? 0.2 : 0,
                  opacity: index === 0 ? 0 : 0,
                  rotate: 0,
                  rotateX: 0,
                  rotateY: 0,
                }}
                animate={{
                  x: targetX,
                  y: isPulledUp ? -1500 : targetY,
                  z: isSplash ? splashSeeds[index].z * (isMobile ? 0.5 : 1) : 0,
                  scale: isInit ? (index === 0 ? 1.6 : 0) : 1,
                  opacity: isInit ? (index === 0 ? 1 : 0) : (isSplash ? 0.7 : 1),
                  rotate: targetRotation + counterRotate,
                  rotateX: isSplash ? splashSeeds[index].rotX : 0,
                  rotateY: isSplash ? splashSeeds[index].rotY : 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: isPulledUp ? 60 : (isInit ? 40 : (isSplash ? 25 : 40)),
                  damping: isPulledUp ? 20 : (isInit ? 15 : (isSplash ? 12 : 15)),
                  mass: 1.1,
                  delay: isPulledUp ? index * 0.01 : (isInit ? 0 : (isSplash
                    ? index * 0.015
                    : index * 0.02)),
                }}
                className="absolute"
                style={{
                  width: cardW,
                  height: cardH,
                  marginLeft: -cardW / 2,
                  marginTop: -cardH / 2,
                  zIndex: isInit && index === 0 ? 50 : 1,
                  willChange: "transform",
                }}
              >
                <div
                  className="w-full h-full rounded-lg overflow-hidden shadow-md transition-shadow"
                  style={{
                    background: "#E8EAED",
                    boxShadow: isInit && index === 0 
                      ? "0 20px 40px rgba(0,0,0,0.25)"
                      : (isSplash
                        ? "0 8px 32px rgba(0,0,0,0.18)"
                        : "0 4px 16px rgba(0,0,0,0.10)"),
                  }}
                >
                  <img
                    src={src}
                    alt={`Event photo ${index + 1}`}
                    loading={index < 8 ? "eager" : "lazy"}
                    className="w-full h-full object-cover"
                    style={{ willChange: "transform" }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ─── Centered Hero Copy ─── */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{
          y: isPulledUp ? -800 : (phase === "init" ? 40 : 0),
          opacity: isPulledUp ? 0 : (phase === "init" ? 0 : 1),
        }}
        transition={{
          delay: phase === "init" ? 0 : (isPulledUp ? 0 : 0.2),
          duration: isPulledUp ? 0.6 : 1.2,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="absolute z-40 flex flex-col items-center justify-center pointer-events-none"
        style={{
          width: "100%",
          height: "100%",
          maxWidth: isMobile ? 240 : 520,
          padding: isMobile ? "0 12px" : "0 24px",
        }}
      >
        {/* Headline — matching original design */}
        <h1 className="flex flex-col items-center justify-center tracking-tight mb-4 md:mb-5">
          <span
            className="font-normal"
            style={{
              fontSize: isMobile ? 20 : 36,
              color: "#94A3B8",
              marginBottom: isMobile ? 4 : 12,
            }}
          >
            The future of
          </span>
          <span
            className="font-semibold leading-[1.1]"
            style={{
              fontSize: isMobile ? 28 : 56,
              color: "#0F172A",
            }}
          >
            Running Events
          </span>
        </h1>

        {/* Sub-headline */}
        <p
          className="font-medium leading-relaxed text-center"
          style={{
            fontSize: isMobile ? 11 : 15,
            color: "#64748B",
            maxWidth: isMobile ? 220 : 420,
            marginBottom: isMobile ? 24 : 36,
          }}
        >
          Satu ekosistem digital untuk manajemen registrasi,
          pengambilan racepack QR, hingga akurasi live timing kit iZT.
        </p>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/event")}
            className="cursor-pointer font-semibold rounded-full shadow-lg transition-colors"
            style={{
              padding: isMobile ? "10px 20px" : "14px 32px",
              fontSize: isMobile ? 11 : 14,
              background: "#0F172A",
              color: "#FFFFFF",
            }}
          >
            Lihat Event
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setIsPulledUp(true);
              setTimeout(() => {
                document.getElementById("platform")?.scrollIntoView({ behavior: "smooth" });
              }, 600);
            }}
            className="cursor-pointer font-semibold rounded-full transition-colors"
            style={{
              padding: isMobile ? "10px 20px" : "14px 32px",
              fontSize: isMobile ? 11 : 14,
              background: "transparent",
              color: "#0F172A",
              border: "1.5px solid rgba(15,23,42,0.2)",
            }}
          >
            Lihat Platform
          </motion.button>
        </div>
      </motion.div>

        {/* ─── Bottom fade-out gradient ─── */}
        <div
          className="absolute bottom-0 left-0 w-full pointer-events-none"
          style={{
            height: 100,
            background: "linear-gradient(to top, #F1F3F6 0%, transparent 100%)",
          }}
        />
      </motion.div>
    </section>
  );
}
