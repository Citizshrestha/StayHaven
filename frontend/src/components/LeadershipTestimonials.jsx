import React, { useState, useEffect, useRef } from "react"

const leaders = [
  {
    name: "Rohan Gurung",
    role: "Chief Technology Officer",
    quote:
      "Rohan leads the engineering team, building the technology that powers millions of bookings.",
    // Professional male executive — warm-toned office portrait
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80",
    // Architecture / tech cityscape for back card
    backImage:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80",
    backColor1: "#f5e6d3",
    backColor2: "#e8ddd4",
    accentColor: "#c9753a",
    accentGrad: "linear-gradient(90deg, #c9753a, #e8a87c)",
    labelColor: "#c9753a",
  },
  {
    name: "Priya Thapa",
    role: "Chief Product Officer",
    quote:
      "Priya shapes the product vision, ensuring every feature delights our customers worldwide.",
    // Professional woman executive — confident studio portrait
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80",
    // Hospitality / hotel lobby for back card
    backImage:
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",
    backColor1: "#d3e8f5",
    backColor2: "#dde4e8",
    accentColor: "#2c7bb5",
    accentGrad: "linear-gradient(90deg, #2c7bb5, #7ab8e8)",
    labelColor: "#2c7bb5",
  },
  {
    name: "Aarav Maharjan",
    role: "Chief Design Officer",
    quote:
      "Aarav crafts the visual language and brand identity that makes StayHaven instantly recognizable.",
    // Creative male professional — casual confident portrait
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80",
    // Design / creative workspace for back card
    backImage:
      "https://images.unsplash.com/photo-1542744094-24638eff58bb?auto=format&fit=crop&w=800&q=80",
    backColor1: "#d3f5e3",
    backColor2: "#d4e8dd",
    accentColor: "#1a8a5a",
    accentGrad: "linear-gradient(90deg, #1a8a5a, #5bb88a)",
    labelColor: "#1a8a5a",
  },
]

// Accent lines for the header (matching image 2)
function AccentLines() {
  const colors = ["#e0405a", "#26c6da", "#43a047", "#b5a642"]
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 6 }}>
      {colors.map((c, i) => (
        <div
          key={i}
          style={{
            width: 48,
            height: 3,
            borderRadius: 2,
            background: c,
          }}
        />
      ))}
    </div>
  )
}

function LeaderCard({ leader, isActive }) {
  const {
    name,
    role,
    quote,
    image,
    backImage,
    backColor2,
    accentColor,
    accentGrad,
    labelColor,
  } = leader

  return (
    <div
      style={{
        height: "25vh",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 80,
        background: "transparent",
        borderRadius: 0,
        padding: "8px 12px",
        boxShadow: "none",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        opacity: isActive ? 1 : 0,
        transform: isActive ? "translateY(0)" : "translateY(20px)",
        pointerEvents: isActive ? "auto" : "none",
        flexWrap: "wrap",
      }}
    >
      {/* ── LEFT: Stacked photo group ── */}
      <div
        style={{
          position: "relative",
          width: 280,
          height: 340,
          flexShrink: 0,
          alignSelf: "flex-start",
        }}
      >
        {/* Back card 2 — solid colour, furthest behind */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 22,
            background: backColor2,
            transform: "rotate(6.5deg) translateY(8px)",
            zIndex: 0,
            boxShadow: "0 4px 18px rgba(0,0,0,0.06)",
          }}
        />
        {/* Back card 1 — real photo, rotated */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 22,
            overflow: "hidden",
            transform: "rotate(-3.5deg) translateY(3px)",
            zIndex: 1,
            boxShadow: "0 4px 22px rgba(0,0,0,0.10)",
          }}
        >
          <img
            src={backImage}
            alt=""
            aria-hidden="true"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.78) saturate(0.7)",
            }}
          />
        </div>
        {/* Main portrait — front */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 22,
            overflow: "hidden",
            zIndex: 2,
            boxShadow: "0 10px 36px rgba(0,0,0,0.16)",
          }}
        >
          <img
            src={image}
            alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
          />
        </div>
      </div>

      {/* ── RIGHT: Text content ── */}
      <div style={{ flex: 1, minWidth: 240, maxWidth: 440 }}>
        {/* Large decorative quote mark */}
        <div
          style={{
            fontSize: 80,
            lineHeight: 1,
            fontFamily: "Georgia, serif",
            color: accentColor,
            opacity: 0.18,
            marginBottom: -12,
            userSelect: "none",
          }}
        >
          "
        </div>

        <p
          style={{
            fontSize: 18,
            lineHeight: 1.78,
            color: "#2e2e2e",
            marginBottom: 14,
            fontFamily: "'Georgia', serif",
            fontStyle: "italic",
          }}
        >
          {quote}
        </p>

        {/* Accent divider */}
        <div
          style={{
            width: 44,
            height: 3,
            background: accentGrad,
            borderRadius: 2,
            marginBottom: 8,
          }}
        />

        {/* Name */}
        <p
          style={{
            fontWeight: 800,
            fontSize: 22,
            color: "#111111",
            fontFamily: "'Caveat', cursive, sans-serif",
            marginBottom: 3,
            letterSpacing: "-0.01em",
          }}
        >
          {name}
        </p>

        {/* Role badge */}
        <span
          style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: labelColor,
            background: `${accentColor}14`,
            padding: "4px 12px",
            borderRadius: 20,
          }}
        >
          {role}
        </span>
      </div>
    </div>
  )
}

export default function LeadershipSection() {
  const [current, setCurrent] = useState(0)
  const [animating, setAnimating] = useState(false)
  const timerRef = useRef(null)

  const goTo = (index) => {
    if (animating || index === current) return
    setAnimating(true)
    setTimeout(() => {
      setCurrent(index)
      setAnimating(false)
    }, 280)
  }

  const prev = () => goTo((current - 1 + leaders.length) % leaders.length)
  const next = () => goTo((current + 1) % leaders.length)

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % leaders.length)
    }, 5000)
  }

  const stopTimer = () => clearInterval(timerRef.current)

  useEffect(() => {
    startTimer()
    return () => stopTimer()
  }, [])

  const activeAccent = leaders[current].accentColor

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@700;800&display=swap"
        rel="stylesheet"
      />

      <section
        style={{
          padding: "32px 24px 32px",
          background: "#FFFFFF",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle dot grid */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle, rgba(0,0,0,0.055) 1.5px, transparent 1.5px)",
            backgroundSize: "30px 30px",
            pointerEvents: "none",
          }}
        />

        {/* Soft ambient blobs */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 440,
            height: 440,
            borderRadius: "50%",
            background: `${activeAccent}18`,
            top: -120,
            left: -120,
            filter: "blur(80px)",
            transition: "background 0.6s ease",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: `${activeAccent}12`,
            bottom: -100,
            right: -80,
            filter: "blur(80px)",
            transition: "background 0.6s ease",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            maxWidth: 920,
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* ── Section header ── */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <AccentLines />
            <span
              style={{
                display: "block",
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#26c6da",
                marginBottom: 6,
              }}
            >
              Leadership
            </span>
            <h2
              style={{
                fontSize: "clamp(2rem, 5vw, 2.8rem)",
                fontWeight: 800,
                color: "#111111",
                margin: "0 0 6px",
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
              }}
            >
              Voices of Excellence
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "#777777",
                maxWidth: 400,
                margin: "0 auto",
                lineHeight: 1.65,
              }}
            >
              Meet the visionary leaders shaping the future of hospitality
            </p>
          </div>

          {/* ── Card carousel ── */}
          <div
            style={{ position: "relative" }}
            onMouseEnter={stopTimer}
            onMouseLeave={startTimer}
          >
            {leaders.map((leader, i) => (
              <div
                key={leader.name}
                style={{
                  position: i === 0 ? "relative" : "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                }}
              >
                <LeaderCard leader={leader} isActive={i === current} />
              </div>
            ))}

            {/* Invisible height placeholder */}
            <div style={{ visibility: "hidden", pointerEvents: "none" }}>
              <LeaderCard leader={leaders[0]} isActive={false} />
            </div>
          </div>

          {/* ── Navigation ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
              marginTop: 16,
            }}
          >
            {/* Prev */}
            <button
              onClick={prev}
              aria-label="Previous leader"
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                border: "1.5px solid #d0ccc6",
                background: "#ffffff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
                outline: "none",
                boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = activeAccent
                e.currentTarget.style.borderColor = activeAccent
                e.currentTarget.querySelector("svg").setAttribute("stroke", "#fff")
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#ffffff"
                e.currentTarget.style.borderColor = "#d0ccc6"
                e.currentTarget.querySelector("svg").setAttribute("stroke", "#555")
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 12L6 8l4-4" />
              </svg>
            </button>

            {/* Dots */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {leaders.map((l, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to ${l.name}`}
                  style={{
                    width: i === current ? 28 : 8,
                    height: 8,
                    borderRadius: 4,
                    border: "none",
                    background: i === current ? activeAccent : "#ccc8c2",
                    cursor: "pointer",
                    padding: 0,
                    transition: "width 0.35s ease, background 0.35s ease",
                    outline: "none",
                  }}
                />
              ))}
            </div>

            {/* Next */}
            <button
              onClick={next}
              aria-label="Next leader"
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                border: "1.5px solid #d0ccc6",
                background: "#ffffff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
                outline: "none",
                boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = activeAccent
                e.currentTarget.style.borderColor = activeAccent
                e.currentTarget.querySelector("svg").setAttribute("stroke", "#fff")
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#ffffff"
                e.currentTarget.style.borderColor = "#d0ccc6"
                e.currentTarget.querySelector("svg").setAttribute("stroke", "#555")
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 4l4 4-4 4" />
              </svg>
            </button>
          </div>
        </div>
      </section>
    </>
  )
}