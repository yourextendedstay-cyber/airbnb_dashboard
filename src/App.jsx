import { useState, useEffect, useRef } from "react";

const C = {
  bg: "#0D1117", card: "#161B22", cardBorder: "#21262D",
  accent: "#F0A500", accentSoft: "#F0A50018",
  teal: "#2DD4BF", tealSoft: "#2DD4BF18",
  rose: "#FB7185", roseSoft: "#FB718518",
  text: "#E6EDF3", muted: "#8B949E",
  green: "#3FB950", greenSoft: "#3FB95018",
  purple: "#A78BFA", purpleSoft: "#A78BFA18",
};

const data = {
  property: "Sunset Loft – Downtown",
  occupancyRate: 74, bookedNights: 22, totalNights: 30,
  avgNightlyRate: 148, totalRevenue: 3256, projectedRevenue: 4440,
  rating: 4.72, totalReviews: 63, responseRate: 98,
  bookings: [
    { month: "Oct", bookings: 14, revenue: 2100 },
    { month: "Nov", bookings: 18, revenue: 2664 },
    { month: "Dec", bookings: 26, revenue: 3848 },
    { month: "Jan", bookings: 20, revenue: 2960 },
    { month: "Feb", bookings: 22, revenue: 3256 },
    { month: "Mar", bookings: 19, revenue: 2812 },
  ],
  reviews: [
    { author: "Sarah M.", rating: 5, date: "Mar 18", comment: "Absolutely stunning space, perfect location. Would stay again!" },
    { author: "Tom K.", rating: 5, date: "Mar 12", comment: "Great communication, spotless apartment. The view was incredible." },
    { author: "Priya S.", rating: 4, date: "Mar 5", comment: "Lovely place, minor issue with WiFi but host resolved it quickly." },
    { author: "James L.", rating: 5, date: "Feb 28", comment: "One of the best Airbnbs I've ever stayed in. Highly recommend!" },
  ],
  calendar: {
    month: "March 2025",
    booked: [1,2,3,5,6,7,8,12,13,14,15,16,19,20,21,22,23,26,27,28,29],
    blocked: [10,11,17,18],
  },
  competitors: [
    { name: "Urban Suite Co.", distance: "0.3mi", occupancy: 82, rate: 162, rating: 4.85, reviews: 124, superhost: true, highlight: "Fast check-in & workspace" },
    { name: "The Rooftop Retreat", distance: "0.5mi", occupancy: 79, rate: 155, rating: 4.78, reviews: 89, superhost: true, highlight: "Rooftop terrace access" },
    { name: "Sunset Loft (You)", distance: "—", occupancy: 74, rate: 148, rating: 4.72, reviews: 63, superhost: false, highlight: "Great location & views", isYou: true },
    { name: "Midtown Gem", distance: "0.7mi", occupancy: 71, rate: 135, rating: 4.61, reviews: 47, superhost: false, highlight: "Budget-friendly option" },
    { name: "The Cozy Corner", distance: "0.9mi", occupancy: 68, rate: 129, rating: 4.55, reviews: 38, superhost: false, highlight: "Pet-friendly" },
  ],
  marketAvg: { occupancy: 74.8, rate: 145.8, rating: 4.70 },
  kpiRecommendations: [
    {
      kpi: "Occupancy", current: "74%", target: "82%", gap: "+8%",
      color: C.accent, icon: "◉",
      actions: [
        "Enable same-day bookings with a discounted last-minute rate (−10%) to fill gaps.",
        "Reduce minimum stay from 3 to 2 nights to capture weekend demand.",
        "Promote on a 3rd platform — you're likely missing mid-week corporate travelers.",
      ]
    },
    {
      kpi: "Avg Nightly Rate", current: "$148", target: "$162", gap: "+$14",
      color: C.teal, icon: "◈",
      actions: [
        "Raise rates Thu–Sat by $18–22 — competitors average $162 on weekends.",
        "Add a premium cleaning fee instead of bundling it — guests perceive higher quality.",
        "Highlight unique amenities (views, location) in photos to justify a premium price.",
      ]
    },
    {
      kpi: "Guest Rating", current: "4.72★", target: "4.85★", gap: "+0.13★",
      color: C.purple, icon: "★",
      actions: [
        "Add a local area guide with restaurant & activity tips — top-rated hosts all do this.",
        "Send a proactive mid-stay check-in message to resolve issues before checkout.",
        "Upgrade WiFi to gigabit — 3 recent reviews mentioned connectivity.",
      ]
    },
    {
      kpi: "Revenue", current: "$3,256", target: "$4,440", gap: "+$1,184",
      color: C.green, icon: "◆",
      actions: [
        "Implement dynamic pricing — manual flat rates leave ~$800/mo on the table.",
        "Offer an extended stay discount (7+ nights) to attract longer, stable bookings.",
        "Add upsells: early check-in ($25), late checkout ($35), welcome basket ($45).",
      ]
    },
  ]
};

function StarRating({ rating, size = 13 }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating) ? C.accent : C.cardBorder, fontSize: size }}>★</span>
      ))}
    </span>
  );
}

function RadialGauge({ value, max = 100, color, size = 110 }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const dash = circ * (value / max);
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke={C.cardBorder} strokeWidth="7" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 40 40)" style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x="40" y="45" textAnchor="middle" fill={C.text} fontSize="13"
        fontWeight="700" fontFamily="'Playfair Display', serif">{value}%</text>
    </svg>
  );
}

function CompetitorRow({ c }) {
  const isYou = c.isYou;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1.8fr 0.8fr 0.8fr 0.8fr 0.8fr 1.4fr",
      alignItems: "center", gap: 12, padding: "12px 16px",
      background: isYou ? C.accentSoft : "transparent",
      border: `1px solid ${isYou ? C.accent + "44" : "transparent"}`,
      borderRadius: 10, marginBottom: 6,
    }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: isYou ? 700 : 500, color: isYou ? C.accent : C.text }}>{c.name}</span>
          {c.superhost && <span style={{ fontSize: 9, background: C.accentSoft, color: C.accent, border: `1px solid ${C.accent}44`, borderRadius: 4, padding: "1px 5px" }}>SUPERHOST</span>}
          {isYou && <span style={{ fontSize: 9, background: C.tealSoft, color: C.teal, border: `1px solid ${C.teal}44`, borderRadius: 4, padding: "1px 5px" }}>YOU</span>}
        </div>
        <span style={{ fontSize: 11, color: C.muted }}>{c.distance !== "—" ? `${c.distance} away` : c.highlight}</span>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: c.occupancy > 74 ? C.green : c.occupancy < 74 ? C.rose : C.accent, marginBottom: 4 }}>{c.occupancy}%</div>
        <div style={{ background: C.cardBorder, borderRadius: 99, height: 4, overflow: "hidden" }}>
          <div style={{ width: `${c.occupancy}%`, height: "100%", background: c.occupancy > 74 ? C.green : c.occupancy < 74 ? C.rose : C.accent, borderRadius: 99 }} />
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: c.rate > 148 ? C.green : c.rate < 148 ? C.muted : C.accent }}>${c.rate}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: c.rating >= 4.8 ? C.green : C.text }}>{c.rating}</span>
        <span style={{ color: C.accent, fontSize: 11 }}>★</span>
      </div>
      <div style={{ fontSize: 13, color: C.muted }}>{c.reviews}</div>
      <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>{c.highlight}</div>
    </div>
  );
}

function KPICard({ rec, onClick, active }) {
  return (
    <div onClick={onClick} style={{
      background: active ? rec.color + "18" : C.card,
      border: `1px solid ${active ? rec.color + "66" : C.cardBorder}`,
      borderRadius: 12, padding: "18px 20px", cursor: "pointer",
      transition: "all 0.2s", borderTop: `2px solid ${rec.color}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{rec.kpi}</p>
          <p style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: rec.color }}>{rec.current}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Target</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.green }}>{rec.target}</p>
          <p style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>{rec.gap}</p>
        </div>
      </div>
      <div style={{ fontSize: 12, color: active ? rec.color : C.muted, fontWeight: 500 }}>
        {active ? "▼ Hide actions" : `▶ ${rec.actions.length} recommendations`}
      </div>
    </div>
  );
}

function AITipsPanel({ onClose }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I'm your rental AI advisor. I have full context on your property stats AND competitor data. Ask me anything — or tap a quick prompt." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const quickPrompts = [
    "Why are competitors outperforming me?",
    "How do I become a Superhost?",
    "Best way to close the rate gap?",
    "How to get more reviews fast?",
  ];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const system = `You are an expert short-term rental strategist and competitive analyst.

YOUR PROPERTY (Sunset Loft – Downtown):
- Occupancy: 74% (22/30 nights), Avg rate: $148/night, Revenue: $3,256/mo, Rating: 4.72★, 63 reviews, 98% response rate

COMPETITORS IN AREA:
- Urban Suite Co. (0.3mi): 82% occ, $162/night, 4.85★, 124 reviews, SUPERHOST
- The Rooftop Retreat (0.5mi): 79% occ, $155/night, 4.78★, 89 reviews, SUPERHOST
- Midtown Gem (0.7mi): 71% occ, $135/night, 4.61★, 47 reviews
- The Cozy Corner (0.9mi): 68% occ, $129/night, 4.55★, 38 reviews
- Market avg: 74.8% occ, $145.80/night, 4.70★

Give concise, specific, data-driven advice in 3-5 sentences. Reference competitor data when relevant. Be warm, direct, and actionable.`;

      const history = messages.filter((_, i) => i > 0).map(m => ({ role: m.role, content: m.text }));
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system, messages: [...history, { role: "user", content: msg }]
        })
      });
      const d = await res.json();
      const reply = d.content?.map(b => b.text || "").join("") || "Sorry, couldn't connect. Try again.";
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Something went wrong. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 420, height: "88vh", background: C.card,
        border: `1px solid ${C.cardBorder}`, borderRadius: "16px 16px 0 0",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 -8px 48px #00000077", margin: "0 24px",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, color: C.accent }}>✦</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700 }}>AI Rental Advisor</span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: C.muted, marginTop: 2 }}>Knows your stats + competitor data</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "88%", padding: "10px 14px",
                background: m.role === "user" ? C.accent : C.bg,
                color: m.role === "user" ? "#000" : C.text,
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                fontSize: 13, lineHeight: 1.6,
                border: m.role === "assistant" ? `1px solid ${C.cardBorder}` : "none",
              }}>{m.text}</div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 5, padding: "10px 14px", background: C.bg, borderRadius: 12, width: "fit-content", border: `1px solid ${C.cardBorder}` }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, animation: `bounce 1s ${i*0.2}s infinite` }} />)}
            </div>
          )}
          <div ref={endRef} />
        </div>
        {messages.length < 3 && (
          <div style={{ padding: "0 16px 8px", display: "flex", flexWrap: "wrap", gap: 6 }}>
            {quickPrompts.map((q, i) => (
              <button key={i} onClick={() => send(q)} style={{
                background: C.accentSoft, border: `1px solid ${C.accent}44`,
                color: C.accent, borderRadius: 20, padding: "5px 12px",
                fontSize: 11, cursor: "pointer", fontFamily: "inherit",
              }}>{q}</button>
            ))}
          </div>
        )}
        <div style={{ padding: "12px 16px 20px", display: "flex", gap: 8, borderTop: `1px solid ${C.cardBorder}` }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Ask your advisor..." style={{
              flex: 1, background: C.bg, border: `1px solid ${C.cardBorder}`,
              color: C.text, borderRadius: 10, padding: "10px 14px",
              fontSize: 13, outline: "none", fontFamily: "inherit",
            }} />
          <button onClick={() => send()} style={{
            background: C.accent, border: "none", borderRadius: 10,
            color: "#000", fontWeight: 700, padding: "10px 16px",
            cursor: "pointer", fontSize: 16,
          }}>↑</button>
        </div>
      </div>
    </div>
  );
}

const TABS = ["Overview", "Competition", "Recommendations"];

export default function App() {
  const [tab, setTab] = useState("Overview");
  const [showAI, setShowAI] = useState(false);
  const [activeRec, setActiveRec] = useState(null);

  const statCards = [
    { label: "Occupancy Rate", value: `${data.occupancyRate}%`, sub: `${data.bookedNights}/${data.totalNights} nights`, mkt: `Mkt avg ${data.marketAvg.occupancy}%`, color: C.accent, vs: +(data.occupancyRate - data.marketAvg.occupancy).toFixed(1) },
    { label: "Monthly Revenue", value: `$${data.totalRevenue.toLocaleString()}`, sub: `$${data.projectedRevenue.toLocaleString()} projected`, mkt: null, color: C.teal, vs: null },
    { label: "Avg Nightly Rate", value: `$${data.avgNightlyRate}`, sub: "per night", mkt: `Mkt avg $${data.marketAvg.rate}`, color: C.green, vs: +(data.avgNightlyRate - data.marketAvg.rate).toFixed(1) },
    { label: "Guest Rating", value: `${data.rating}★`, sub: `${data.totalReviews} reviews`, mkt: `Mkt avg ${data.marketAvg.rating}★`, color: C.purple, vs: +(data.rating - data.marketAvg.rating).toFixed(2) },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.cardBorder}; border-radius: 4px; }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.text }}>
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${C.cardBorder}`, padding: "18px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, color: C.accent }}>HostIQ</span>
              <span style={{ fontSize: 10, background: C.accentSoft, color: C.accent, border: `1px solid ${C.accent}44`, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>PRO</span>
            </div>
            <p style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{data.property} · March 2025</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: tab === t ? C.accentSoft : "none",
                border: `1px solid ${tab === t ? C.accent + "44" : "transparent"}`,
                color: tab === t ? C.accent : C.muted,
                fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                fontWeight: tab === t ? 600 : 400,
                padding: "7px 16px", borderRadius: 8, cursor: "pointer",
                transition: "all 0.2s",
              }}>{t}</button>
            ))}
            <div style={{ width: 1, height: 24, background: C.cardBorder, margin: "0 4px" }} />
            <button onClick={() => setShowAI(true)} style={{
              background: C.accent, color: "#000", border: "none",
              borderRadius: 10, padding: "9px 18px", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13,
            }}>✦ AI Advisor</button>
          </div>
        </div>

        <div style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>

          {/* ── OVERVIEW ── */}
          {tab === "Overview" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
                {statCards.map((s, i) => (
                  <div key={i} style={{
                    background: C.card, border: `1px solid ${C.cardBorder}`,
                    borderRadius: 14, padding: "20px 22px", borderTop: `2px solid ${s.color}`,
                    animation: `fadeUp 0.5s ${i * 0.08}s both`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <p style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{s.label}</p>
                        <p style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: s.color }}>{s.value}</p>
                        <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{s.sub}</p>
                      </div>
                    </div>
                    {s.mkt && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.cardBorder}`, display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, color: C.muted }}>{s.mkt}</span>
                        {s.vs !== null && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: s.vs >= 0 ? C.green : C.rose }}>
                            {s.vs >= 0 ? "▲ +" : "▼ "}{s.vs}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
                <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: 24 }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Booking Trends</h3>
                  <p style={{ color: C.muted, fontSize: 12, marginBottom: 20 }}>Nights booked & revenue — last 6 months</p>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
                    {data.bookings.map((d, i) => {
                      const maxB = Math.max(...data.bookings.map(b => b.bookings));
                      const maxR = Math.max(...data.bookings.map(b => b.revenue));
                      const isLast = i === data.bookings.length - 1;
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
                          <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", position: "relative" }}>
                            <div style={{ width: "100%", height: `${(d.revenue / maxR) * 95}%`, background: C.teal, opacity: 0.2, borderRadius: "4px 4px 0 0", position: "absolute", bottom: 0 }} />
                            <div style={{ width: "100%", height: `${(d.bookings / maxB) * 70}%`, background: isLast ? C.accent : C.accent + "77", borderRadius: "4px 4px 0 0", position: "relative", zIndex: 1 }}>
                              <span style={{ position: "absolute", top: -17, left: "50%", transform: "translateX(-50%)", fontSize: 10, color: C.accent, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{d.bookings}</span>
                            </div>
                          </div>
                          <span style={{ fontSize: 10, color: C.muted, fontFamily: "'DM Mono', monospace" }}>{d.month}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: C.accent }} /><span style={{ fontSize: 11, color: C.muted }}>Bookings</span></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: C.teal, opacity: 0.4 }} /><span style={{ fontSize: 11, color: C.muted }}>Revenue</span></div>
                  </div>
                </div>

                <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: 24 }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Occupancy</h3>
                  <p style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>This month at a glance</p>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                    <RadialGauge value={data.occupancyRate} color={C.accent} size={110} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Booked", value: data.bookedNights, color: C.accent },
                      { label: "Available", value: data.totalNights - data.bookedNights - 2, color: C.green },
                      { label: "Blocked", value: 2, color: C.rose },
                      { label: "Response", value: `${data.responseRate}%`, color: C.teal },
                    ].map((s, i) => (
                      <div key={i} style={{ background: C.bg, borderRadius: 8, padding: "8px 10px" }}>
                        <p style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>{s.label}</p>
                        <p style={{ fontSize: 17, fontWeight: 700, color: s.color, fontFamily: "'Playfair Display', serif" }}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: 24 }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Availability Calendar</h3>
                  <p style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>{data.calendar.month}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
                      const status = data.calendar.booked.includes(d) ? "booked" : data.calendar.blocked.includes(d) ? "blocked" : "open";
                      const colors = { booked: C.accent, blocked: C.rose, open: C.cardBorder };
                      return (
                        <div key={d} style={{
                          width: 26, height: 26, borderRadius: 6, background: colors[status],
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, color: status === "booked" ? "#000" : C.muted,
                          fontFamily: "'DM Mono', monospace", fontWeight: 600, opacity: status === "open" ? 0.4 : 1,
                        }}>{d}</div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
                    {[["booked", C.accent, "Booked"], ["blocked", C.rose, "Blocked"], ["open", C.cardBorder, "Open"]].map(([k, c, l]) => (
                      <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                        <span style={{ fontSize: 11, color: C.muted }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: 24 }}>
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700 }}>Recent Reviews</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <StarRating rating={data.rating} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>{data.rating}</span>
                      <span style={{ fontSize: 12, color: C.muted }}>· {data.totalReviews} total</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 210, overflowY: "auto" }}>
                    {data.reviews.map((r, i) => (
                      <div key={i} style={{ borderBottom: `1px solid ${C.cardBorder}`, paddingBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{r.author}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <StarRating rating={r.rating} size={11} />
                            <span style={{ fontSize: 11, color: C.muted }}>{r.date}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{r.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── COMPETITION ── */}
          {tab === "Competition" && (
            <div style={{ animation: "fadeUp 0.4s both" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
                {[
                  { label: "Occupancy vs Market", you: `${data.occupancyRate}%`, mkt: `${data.marketAvg.occupancy}%`, diff: +(data.occupancyRate - data.marketAvg.occupancy).toFixed(1), color: C.accent },
                  { label: "Nightly Rate vs Market", you: `$${data.avgNightlyRate}`, mkt: `$${data.marketAvg.rate}`, diff: +(data.avgNightlyRate - data.marketAvg.rate).toFixed(1), color: C.teal },
                  { label: "Rating vs Market", you: `${data.rating}★`, mkt: `${data.marketAvg.rating}★`, diff: +(data.rating - data.marketAvg.rating).toFixed(2), color: C.purple },
                ].map((s, i) => (
                  <div key={i} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: "20px 22px", borderTop: `2px solid ${s.color}` }}>
                    <p style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>{s.label}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                      <div>
                        <p style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>You</p>
                        <p style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: s.color }}>{s.you}</p>
                      </div>
                      <div style={{ textAlign: "center", padding: "0 12px" }}>
                        <p style={{ fontSize: 22, color: s.diff >= 0 ? C.green : C.rose }}>{s.diff >= 0 ? "▲" : "▼"}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: s.diff >= 0 ? C.green : C.rose }}>{s.diff >= 0 ? "+" : ""}{s.diff}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Mkt Avg</p>
                        <p style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: C.muted }}>{s.mkt}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: 24, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700 }}>Nearby Competitors</h3>
                    <p style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>5 properties within 1 mile — ranked by occupancy</p>
                  </div>
                  <span style={{ fontSize: 11, background: C.tealSoft, color: C.teal, border: `1px solid ${C.teal}44`, borderRadius: 20, padding: "4px 12px" }}>Live Market Data</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.8fr 0.8fr 0.8fr 0.8fr 1.4fr", gap: 12, padding: "0 16px 10px", borderBottom: `1px solid ${C.cardBorder}`, marginBottom: 8 }}>
                  {["Property", "Occupancy", "Rate/Night", "Rating", "Reviews", "Competitive Edge"].map(h => (
                    <span key={h} style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>{h}</span>
                  ))}
                </div>
                {data.competitors.map((c, i) => <CompetitorRow key={i} c={c} />)}
              </div>

              <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: 24 }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Head-to-Head: You vs. Top Competitor</h3>
                <p style={{ color: C.muted, fontSize: 12, marginBottom: 22 }}>Sunset Loft vs. Urban Suite Co. (market leader)</p>
                {[
                  { label: "Occupancy", you: 74, them: 82, unit: "%", max: 100, color: C.accent },
                  { label: "Nightly Rate", you: 148, them: 162, unit: "$", max: 200, color: C.teal },
                  { label: "Rating", you: 4.72, them: 4.85, unit: "★", max: 5, color: C.purple },
                  { label: "Reviews", you: 63, them: 124, unit: "", max: 130, color: C.green },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>{item.label}</span>
                      <div style={{ display: "flex", gap: 20, fontSize: 13 }}>
                        <span style={{ color: item.color, fontWeight: 700 }}>You: {item.unit === "$" ? "$" : ""}{item.you}{item.unit !== "$" ? item.unit : ""}</span>
                        <span style={{ color: C.muted }}>Leader: {item.unit === "$" ? "$" : ""}{item.them}{item.unit !== "$" ? item.unit : ""}</span>
                      </div>
                    </div>
                    <div style={{ position: "relative", height: 10, borderRadius: 99, overflow: "hidden", background: C.cardBorder }}>
                      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${(item.them / item.max) * 100}%`, background: C.cardBorder, borderRadius: 99 }} />
                      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${(item.you / item.max) * 100}%`, background: item.color, borderRadius: 99, transition: "width 0.8s ease" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: C.rose }}>Gap: {item.unit === "$" ? "$" : ""}{(item.them - item.you).toFixed(item.unit === "★" ? 2 : 0)}{item.unit !== "$" ? item.unit : ""} behind</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── RECOMMENDATIONS ── */}
          {tab === "Recommendations" && (
            <div style={{ animation: "fadeUp 0.4s both" }}>
              <div style={{ marginBottom: 22 }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>KPI Improvement Roadmap</h2>
                <p style={{ color: C.muted, fontSize: 14 }}>Data-driven actions to close the gap with top performers. Click any KPI card to expand its action plan.</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 16 }}>
                {data.kpiRecommendations.map((rec, i) => (
                  <KPICard key={i} rec={rec} active={activeRec === i} onClick={() => setActiveRec(activeRec === i ? null : i)} />
                ))}
              </div>

              {activeRec !== null && (
                <div style={{
                  background: C.card, border: `1px solid ${data.kpiRecommendations[activeRec].color}44`,
                  borderRadius: 14, padding: 28, marginBottom: 16,
                  borderLeft: `4px solid ${data.kpiRecommendations[activeRec].color}`,
                  animation: "fadeUp 0.3s both",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: data.kpiRecommendations[activeRec].color }}>
                        {data.kpiRecommendations[activeRec].kpi} — Action Plan
                      </h3>
                      <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
                        Current: {data.kpiRecommendations[activeRec].current} → Target: {data.kpiRecommendations[activeRec].target} ({data.kpiRecommendations[activeRec].gap})
                      </p>
                    </div>
                    <button onClick={() => setShowAI(true)} style={{
                      background: C.accentSoft, border: `1px solid ${C.accent}44`,
                      color: C.accent, borderRadius: 10, padding: "8px 14px",
                      cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
                    }}>✦ Ask AI for details</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {data.kpiRecommendations[activeRec].actions.map((action, i) => (
                      <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 16px", background: C.bg, borderRadius: 10 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: data.kpiRecommendations[activeRec].color + "22",
                          border: `1px solid ${data.kpiRecommendations[activeRec].color}44`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, color: data.kpiRecommendations[activeRec].color,
                          flexShrink: 0, fontFamily: "'DM Mono', monospace",
                        }}>{i + 1}</div>
                        <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, marginTop: 4 }}>{action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: 24 }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Priority Quick Wins</h3>
                <p style={{ color: C.muted, fontSize: 12, marginBottom: 18 }}>Highest-impact, lowest-effort actions across all KPIs</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                  {[
                    { action: "Enable dynamic pricing tool", impact: "High", effort: "Low", kpi: "Revenue", color: C.green },
                    { action: "Reduce minimum stay to 2 nights", impact: "High", effort: "Low", kpi: "Occupancy", color: C.accent },
                    { action: "Add local area guide to listing", impact: "Medium", effort: "Low", kpi: "Rating", color: C.purple },
                    { action: "Raise weekend rates by $18–22", impact: "High", effort: "Low", kpi: "Rate", color: C.teal },
                    { action: "Send proactive mid-stay check-in", impact: "Medium", effort: "Low", kpi: "Rating", color: C.purple },
                    { action: "List on a 3rd booking platform", impact: "High", effort: "Medium", kpi: "Occupancy", color: C.accent },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", background: C.bg, borderRadius: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, color: C.text }}>{item.action}</p>
                        <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>KPI: {item.kpi}</p>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end", flexShrink: 0 }}>
                        <span style={{ fontSize: 10, background: item.impact === "High" ? C.greenSoft : C.accentSoft, color: item.impact === "High" ? C.green : C.accent, borderRadius: 4, padding: "2px 7px", whiteSpace: "nowrap" }}>{item.impact} Impact</span>
                        <span style={{ fontSize: 10, color: C.muted }}>{item.effort} Effort</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAI && <AITipsPanel onClose={() => setShowAI(false)} />}
    </>
  );
}
