import { motion } from "framer-motion";
import bookcatLogo from "../assets/bookcat-logo.png"; // adjust path to your actual asset

/**
 * AnimatedLogo
 * Props:
 *  - phase: "hidden" | "reveal" | "glow" | "shrink"
 *  - onShrinkDone: callback when shrink animation completes
 */
export default function AnimatedLogo({ phase = "reveal", onShrinkDone }) {
  const isShrink = phase === "shrink";

  return (
    <motion.div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        transformOrigin: "center top",
      }}
      animate={
        isShrink
          ? { scale: 0.22, y: "-42vh", opacity: 1 }
          : { scale: 1, y: 0, opacity: 1 }
      }
      transition={
        isShrink
          ? { duration: 0.75, ease: [0.76, 0, 0.24, 1] }
          : { duration: 0 }
      }
      onAnimationComplete={() => {
        if (isShrink && onShrinkDone) onShrinkDone();
      }}
    >
      {/* Ambient glow behind logo */}
      <motion.div
        style={{
          position: "absolute",
          width: 340,
          height: 340,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(37,99,235,0.30) 0%, rgba(29,78,216,0.12) 45%, transparent 72%)",
          filter: "blur(24px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={
          phase === "glow" || phase === "shrink"
            ? { opacity: 1, scale: 1 }
            : { opacity: 0, scale: 0.4 }
        }
        transition={{ duration: 0.9, ease: "easeOut" }}
      />

      {/* Pulse ring on glow */}
      {phase === "glow" && (
        <motion.div
          style={{
            position: "absolute",
            width: 280,
            height: 280,
            borderRadius: "50%",
            border: "1.5px solid rgba(59,130,246,0.55)",
            pointerEvents: "none",
            zIndex: 0,
          }}
          initial={{ scale: 0.7, opacity: 0.7 }}
          animate={{ scale: 1.55, opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      )}

      {/* Logo image */}
      <motion.div
        style={{ position: "relative", zIndex: 1 }}
        initial={{ opacity: 0, scale: 0.55, filter: "blur(14px)" }}
        animate={
          phase === "hidden"
            ? { opacity: 0, scale: 0.55, filter: "blur(14px)" }
            : {
                opacity: 1,
                scale: 1,
                filter:
                  phase === "glow"
                    ? "blur(0px) drop-shadow(0 0 32px rgba(59,130,246,0.85)) drop-shadow(0 0 64px rgba(37,99,235,0.5))"
                    : "blur(0px) drop-shadow(0 0 14px rgba(59,130,246,0.5))",
              }
        }
        transition={{ duration: 0.85, ease: [0.34, 1.2, 0.64, 1] }}
      >
        <img
          src={bookcatLogo}
          alt="BookCAT Logo"
          style={{
            width: 200,
            height: 200,
            objectFit: "contain",
            display: "block",
          }}
        />
      </motion.div>

      {/* Logotype wordmark */}
      <motion.div
        initial={{ opacity: 0, y: 16, letterSpacing: "0.5em" }}
        animate={
          phase === "hidden"
            ? { opacity: 0, y: 16 }
            : { opacity: 1, y: 0, letterSpacing: "0.18em" }
        }
        transition={{ delay: 0.25, duration: 0.75, ease: "easeOut" }}
        style={{
          fontFamily: "'Playfair Display', 'Georgia', serif",
          fontSize: "2.2rem",
          fontWeight: 700,
          color: "#f0f9ff",
          letterSpacing: "0.18em",
          marginTop: "8px",
          position: "relative",
          zIndex: 2,
          textShadow:
            phase === "glow"
              ? "0 0 24px rgba(59,130,246,0.75), 0 0 56px rgba(37,99,235,0.4)"
              : "0 0 16px rgba(59,130,246,0.35)",
          whiteSpace: "nowrap",
        }}
      >
        Book<span style={{ color: "#3b82f6" }}>CAT</span>
      </motion.div>

      {/* Tagline */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={
          phase === "hidden" || phase === "reveal"
            ? { opacity: 0 }
            : { opacity: 0.5 }
        }
        transition={{ delay: 0.15, duration: 0.7 }}
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: "0.6rem",
          color: "#93c5fd",
          letterSpacing: "0.4em",
          textTransform: "uppercase",
          marginTop: "6px",
          zIndex: 2,
        }}
      >
        your reading companion
      </motion.div>
    </motion.div>
  );
}