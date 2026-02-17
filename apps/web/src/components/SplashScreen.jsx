import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedLogo from "./AnimatedLogo";

// ── Subtle faint background grid ──────────────────────────────────────────
function BackgroundGrid({ visible }) {
  return (
    <motion.div
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 1 }}
    >
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0, opacity: 0.055 }}
      >
        <defs>
          <pattern id="grid" width="52" height="52" patternUnits="userSpaceOnUse">
            <path d="M 52 0 L 0 0 0 52" fill="none" stroke="#3b82f6" strokeWidth="0.7" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Top-left corner glow */}
      <div
        style={{
          position: "absolute",
          top: -140,
          left: -140,
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(29,78,216,0.13) 0%, transparent 70%)",
          filter: "blur(32px)",
        }}
      />

      {/* Bottom-right corner glow */}
      <div
        style={{
          position: "absolute",
          bottom: -160,
          right: -160,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Thin horizon accent line */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={visible ? { scaleX: 1, opacity: 1 } : {}}
        transition={{ delay: 0.4, duration: 1.4, ease: "easeOut" }}
        style={{
          position: "absolute",
          bottom: "30%",
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(59,130,246,0.18), rgba(147,197,253,0.3), rgba(59,130,246,0.18), transparent)",
          transformOrigin: "center",
        }}
      />
    </motion.div>
  );
}

// ── Light sweep shimmer across the screen center ──────────────────────────
function LightSweep({ active }) {
  if (!active) return null;
  return (
    <motion.div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        width: "35%",
        background:
          "linear-gradient(90deg, transparent, rgba(59,130,246,0.07), rgba(147,197,253,0.15), rgba(59,130,246,0.07), transparent)",
        pointerEvents: "none",
        zIndex: 3,
      }}
      initial={{ x: "-60vw" }}
      animate={{ x: "140vw" }}
      transition={{ duration: 1.0, ease: "easeInOut" }}
    />
  );
}

// ── Scanning line (optional tech feel) ────────────────────────────────────
function ScanLine({ active }) {
  if (!active) return null;
  return (
    <motion.div
      style={{
        position: "absolute",
        left: "10%",
        right: "10%",
        height: "1px",
        background:
          "linear-gradient(90deg, transparent, rgba(59,130,246,0.6), transparent)",
        pointerEvents: "none",
        zIndex: 3,
      }}
      initial={{ top: "20%", opacity: 0 }}
      animate={{ top: "80%", opacity: [0, 0.8, 0.8, 0] }}
      transition={{ duration: 1.4, ease: "linear", times: [0, 0.1, 0.9, 1] }}
    />
  );
}

/**
 * Animation phases:
 *  0 – "hidden"   : dark screen, nothing visible
 *  1 – "reveal"   : logo fades in, grid appears
 *  2 – "glow"     : glow + pulse ring fires
 *  3 – "sweep"    : light sweep + scan line
 *  4 – "shrink"   : logo shrinks to navbar position
 *  5 – "done"     : splash unmounts, app renders
 */
export default function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState(0);
  const [sweepActive, setSweepActive] = useState(false);
  const [scanActive, setScanActive] = useState(false);

  useEffect(() => {
    // Always plays — no localStorage check.
    // splashDone lives in React memory in App.jsx, so:
    //   ✅ plays every time you open / npm run dev
    //   ✅ plays every full page load
    //   ❌ does NOT replay on in-app navigation or hot-reload

    const timers = [
      setTimeout(() => setPhase(1), 300),          // reveal logo
      setTimeout(() => setPhase(2), 1400),          // glow + pulse
      setTimeout(() => {                            // sweep + scan
        setPhase(3);
        setSweepActive(true);
        setScanActive(true);
      }, 2400),
      setTimeout(() => {                            // stop sweep effects
        setSweepActive(false);
        setScanActive(false);
      }, 3600),
      setTimeout(() => setPhase(4), 3700),          // shrink to navbar
    ];

    return () => timers.forEach(clearTimeout);
  }, [onFinish]);

  const handleShrinkDone = () => {
    setPhase(5);
    // Small pause so the shrunk logo appears to dock before unmounting
    setTimeout(() => onFinish(), 180);
  };

  const phaseNames = ["hidden", "reveal", "glow", "sweep", "shrink", "done"];
  const currentPhaseName = phaseNames[Math.min(phase, 5)];

  if (phase === 5) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="splash"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020817", // near-black, slightly navy
          overflow: "hidden",
        }}
      >
        {/* Grid + corner glows */}
        <BackgroundGrid visible={phase >= 1} />

        {/* Light sweep shimmer */}
        <LightSweep active={sweepActive} />

        {/* Scan line */}
        <ScanLine active={scanActive} />

        {/* Center stage: the logo */}
        <div style={{ position: "relative", zIndex: 2 }}>
          <AnimatedLogo
            phase={currentPhaseName === "sweep" ? "glow" : currentPhaseName}
            onShrinkDone={handleShrinkDone}
          />
        </div>

        {/* Skip button – appears after 1s */}
        {phase >= 1 && phase < 4 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            whileHover={{ opacity: 0.75 }}
            transition={{ delay: 1, duration: 0.5 }}
            onClick={() => onFinish()}
            style={{
              position: "absolute",
              bottom: 32,
              right: 36,
              background: "none",
              border: "1px solid rgba(147,197,253,0.35)",
              color: "#93c5fd",
              fontFamily: "'Courier New', monospace",
              fontSize: "0.65rem",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              padding: "6px 16px",
              borderRadius: 2,
              cursor: "pointer",
            }}
          >
            skip →
          </motion.button>
        )}

        {/* Version watermark */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 2 ? 0.2 : 0 }}
          transition={{ duration: 0.6 }}
          style={{
            position: "absolute",
            bottom: 34,
            left: 36,
            fontFamily: "'Courier New', monospace",
            fontSize: "0.55rem",
            color: "#60a5fa",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
          }}
        >
          v1.0.0
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}