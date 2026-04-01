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

// ─── Helper: compute market averages from competitor list ───
function computeMarketAvg(competitors) {
  if (!competitors || competitors.length === 0) return { occupancy: 0, rate: 0, rating: 0 };
  const withData = competitors.filter(c => !c.isYou);
  const count = withData.length || 1;
  return {
    occupancy: +(withData.reduce((s, c) => s + (c.occupancy || 0), 0) / count).toFixed(1),
    rate: +(withData.reduce((s, c) => s + (c.rate || 0), 0) / count).toFixed(1),
    rating: +(withData.reduce((s, c) => s + (c.rating || 0), 0) / count).toFixed(2),
  };
}

// ─── Helper: find the top competitor (highest reviews, not you) ───
function findTopCompetitor(competitors) {
  const others = (competitors || []).filter(c => !c.isYou && c.reviews > 0);
  if (others.length === 0) return null;
  return others.sort((a, b) => b.reviews - a.reviews)[0];
}

// ─── Helper: build KPI recommendations from live data + competitor analysis ───
function buildKPIRecommendations(overview, marketAvg, topComp, competitors, database) {
  const occ = overview.occupancyRate || 0;
  const rate = overview.avgNightlyRate || 0;
  const rating = overview.rating || 0;
  const revenue = overview.totalRevenue || 0;
  const allComps = (competitors || []).filter(c => !c.isYou);

  const targetOcc = topComp ? topComp.occupancy : Math.min(occ + 8, 100);
  const targetRate = topComp ? topComp.rate : rate + 14;
  const targetRating = topComp ? topComp.rating : Math.min(rating + 0.13, 5);
  const targetRevenue = Math.round(targetOcc / 100 * (overview.totalNights || 30) * targetRate);

  // Analyze competitor data for specific recommendations
  const superhosts = allComps.filter(c => c.superhost);
  const guestFavs = allComps.filter(c => c.tag?.toLowerCase().includes("guest fav"));
  const higherRated = allComps.filter(c => c.rating > rating && c.rating > 0);
  const higherPriced = allComps.filter(c => c.rate > rate && c.rate > 0);
  const moreReviews = allComps.filter(c => c.reviews > (overview.totalReviews || 0));

  // Amenity gap analysis from database
  let missingAmenities = [];
  if (database?.length > 0) {
    const yourListing = database.find(l => l.listing_id === "1600793200513983481");
    const yourAmens = new Set((yourListing?.amenities || overview.amenities || []).map(a => a.toLowerCase().split("\n")[0]));
    const amenFreq = {};
    const topDb = database.filter(l => l.listing_id !== "1600793200513983481" && l.amenities?.length > 0)
      .sort((a, b) => (b.reviews || 0) - (a.reviews || 0)).slice(0, 15);
    topDb.forEach(l => (l.amenities || []).forEach(a => {
      const key = a.toLowerCase().split("\n")[0];
      amenFreq[key] = (amenFreq[key] || 0) + 1;
    }));
    missingAmenities = Object.entries(amenFreq)
      .filter(([a]) => !yourAmens.has(a))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([a, count]) => `${a} (${count}/${topDb.length} top competitors have it)`);
  }

  // Build dynamic action items
  const occActions = [];
  if (occ < marketAvg.occupancy) {
    occActions.push(`Your ${occ}% occupancy is below the market average of ${marketAvg.occupancy}%. Enable same-day bookings and reduce minimum stay to 2 nights to capture more demand.`);
  }
  if (superhosts.length > 0) {
    occActions.push(`${superhosts.length} competitors are Superhosts — they get priority in search results. Focus on response rate (aim for 100%) and zero cancellations to qualify.`);
  }
  occActions.push(`${guestFavs.length} listings have "Guest Favorite" status in your market. Review velocity matters — send a follow-up message after checkout asking for a review.`);
  if (occActions.length < 3) {
    occActions.push("List on VRBO/Booking.com as a secondary platform to fill mid-week gaps that Airbnb doesn't cover.");
  }

  const rateActions = [];
  if (higherPriced.length > 0) {
    const avgHigherRate = Math.round(higherPriced.reduce((s, c) => s + c.rate, 0) / higherPriced.length);
    rateActions.push(`${higherPriced.length} competitors charge more than you ($${avgHigherRate} avg). Raise weekend rates by $${Math.max(10, Math.round((avgHigherRate - rate) * 0.8))}–$${Math.max(15, Math.round((avgHigherRate - rate) * 1.2))} to close the gap.`);
  }
  if (missingAmenities.length > 0) {
    rateActions.push(`Add high-value amenities to justify premium pricing: ${missingAmenities.slice(0, 3).map(a => a.split(" (")[0]).join(", ")}.`);
  }
  rateActions.push("Implement a dynamic pricing tool (PriceLabs or Wheelhouse) — hosts using dynamic pricing earn 15-30% more than flat-rate hosts.");
  if (rateActions.length < 3) {
    rateActions.push("Add a separate cleaning fee instead of bundling it — guests perceive higher value and you net more per booking.");
  }

  const ratingActions = [];
  if (higherRated.length > 0) {
    ratingActions.push(`${higherRated.length} competitors have higher ratings than your ${rating}★. Focus on the lowest category rating and address it directly.`);
  }
  if (missingAmenities.length > 0) {
    ratingActions.push(`Top-rated competitors commonly offer: ${missingAmenities.slice(0, 3).map(a => a.split(" (")[0]).join(", ")}. Adding these directly improves guest satisfaction scores.`);
  }
  ratingActions.push("Send a proactive mid-stay check-in message 12-24 hours after check-in. This catches issues before they become bad reviews.");
  ratingActions.push("Create a digital guidebook with local restaurant recommendations, grocery store directions, and emergency contacts. Top hosts all do this.");

  const revActions = [];
  const potentialRevenue = targetRevenue - revenue;
  if (potentialRevenue > 0) {
    revActions.push(`Closing the gap to top competitor performance could add ~$${potentialRevenue.toLocaleString()}/month — that's $${(potentialRevenue * 12).toLocaleString()}/year in additional revenue.`);
  }
  revActions.push("Offer a 7+ night discount (10-15% off) to attract extended stays. Longer bookings mean fewer turnovers and lower cleaning costs.");
  revActions.push("Add upsells: early check-in ($25), late checkout ($35), welcome basket ($45). These add $50-100 to 30% of bookings.");
  if (moreReviews.length > 0) {
    revActions.push(`${moreReviews.length} competitors have more reviews. More reviews = higher search ranking = more bookings. Prioritize review velocity above all else.`);
  }

  return [
    {
      kpi: "Occupancy", current: `${occ}%`, target: `${targetOcc}%`, gap: `+${targetOcc - occ}%`,
      color: C.accent, icon: "◉", actions: occActions.slice(0, 4),
    },
    {
      kpi: "Avg Nightly Rate", current: `$${rate}`, target: `$${targetRate}`, gap: `+$${targetRate - rate}`,
      color: C.teal, icon: "◈", actions: rateActions.slice(0, 4),
    },
    {
      kpi: "Guest Rating", current: `${rating}★`, target: `${targetRating.toFixed(2)}★`, gap: `+${(targetRating - rating).toFixed(2)}★`,
      color: C.purple, icon: "★", actions: ratingActions.slice(0, 4),
    },
    {
      kpi: "Revenue", current: `$${revenue.toLocaleString()}`, target: `$${targetRevenue.toLocaleString()}`, gap: `+$${(targetRevenue - revenue).toLocaleString()}`,
      color: C.green, icon: "◆", actions: revActions.slice(0, 4),
    },
  ];
}

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
  const dash = circ * ((value || 0) / max);
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke={C.cardBorder} strokeWidth="7" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 40 40)" style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x="40" y="45" textAnchor="middle" fill={C.text} fontSize="13"
        fontWeight="700" fontFamily="'Playfair Display', serif">{value || 0}%</text>
    </svg>
  );
}

function CompetitorRow({ c, yourOcc, yourRate, database, yourAmenities }) {
  const isYou = c.isYou;
  const isGuestFavorite = c.guest_favorite || (c.tag && c.tag.toLowerCase().includes("guest fav"));
  const isTopGuestFavorite = c.tag && c.tag.toLowerCase().includes("top guest fav");

  // Compute competitive edge: amenities they have that you don't
  let edgeText = c.highlight || c.subtitle || "";
  if (!isYou && database && yourAmenities) {
    const dbEntry = database.find(d => d.listing_id === c.listing_id);
    if (dbEntry?.amenities?.length > 0) {
      const theirAmens = dbEntry.amenities.map(a => a.toLowerCase().split("\n")[0]);
      const missing = theirAmens.filter(a => !yourAmenities.has(a) && a.length > 2 && a.length < 40);
      if (missing.length > 0) {
        edgeText = missing.slice(0, 3).join(", ");
      }
    }
  }
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1.8fr 0.5fr 0.8fr 0.8fr 0.8fr 0.8fr 1.4fr",
      alignItems: "center", gap: 12, padding: "12px 16px",
      background: isYou ? C.accentSoft : "transparent",
      border: `1px solid ${isYou ? C.accent + "44" : "transparent"}`,
      borderRadius: 10, marginBottom: 6,
    }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: isYou ? 700 : 500, color: isYou ? C.accent : C.text }}>{c.name}</span>
          {c.superhost && <span style={{ fontSize: 9, background: C.accentSoft, color: C.accent, border: `1px solid ${C.accent}44`, borderRadius: 4, padding: "1px 5px" }}>SUPERHOST</span>}
          {isTopGuestFavorite ? (
            <span style={{ fontSize: 9, background: C.greenSoft, color: C.green, border: `1px solid ${C.green}44`, borderRadius: 4, padding: "1px 5px" }}>TOP GUEST FAVORITE</span>
          ) : isGuestFavorite ? (
            <span style={{ fontSize: 9, background: C.purpleSoft, color: C.purple, border: `1px solid ${C.purple}44`, borderRadius: 4, padding: "1px 5px" }}>GUEST FAVORITE</span>
          ) : null}
          {isYou && <span style={{ fontSize: 9, background: C.tealSoft, color: C.teal, border: `1px solid ${C.teal}44`, borderRadius: 4, padding: "1px 5px" }}>YOU</span>}
        </div>
        <span style={{ fontSize: 11, color: C.muted }}>{c.distance && c.distance !== "—" ? `${c.distance} away` : (c.highlight || c.subtitle || "")}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: C.text, textAlign: "center" }}>{c.bedrooms || "—"}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: c.occupancy > yourOcc ? C.green : c.occupancy < yourOcc ? C.rose : C.accent, marginBottom: 4 }}>{c.occupancy || 0}%</div>
        <div style={{ background: C.cardBorder, borderRadius: 99, height: 4, overflow: "hidden" }}>
          <div style={{ width: `${c.occupancy || 0}%`, height: "100%", background: c.occupancy > yourOcc ? C.green : c.occupancy < yourOcc ? C.rose : C.accent, borderRadius: 99 }} />
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: c.rate > yourRate ? C.green : c.rate < yourRate ? C.muted : C.accent }}>${c.rate || 0}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: c.rating >= 4.8 ? C.green : C.text }}>{c.rating || 0}</span>
        <span style={{ color: C.accent, fontSize: 11 }}>★</span>
      </div>
      <div style={{ fontSize: 13, color: C.muted }}>{c.reviews || 0}</div>
      <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>{edgeText}</div>
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

function AITipsPanel({ onClose, overview, competitors, marketAvg, yourNightlyRate, database }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hey there! 👋 I'm your built-in Rental Advisor. I analyze your property data and all 60+ competitor listings in real-time — no internet needed. Ask me anything or tap a question below!" }
  ]);
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const endRef = useRef(null);

  const quickPrompts = [
    "Full competitive analysis",
    "What amenities am I missing?",
    "How do I become a Superhost?",
    "Roast my listing",
    "Top 5 competitors breakdown",
    "30-day action plan",
    "Pricing strategy",
    "How to get more reviews?",
  ];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ─── DATA HELPERS ───
  const allComps = (competitors || []).filter(c => !c.isYou);
  const yourEntry = competitors?.find(c => c.isYou);
  const yourDb = database?.find(l => l.listing_id === "1600793200513983481");
  const yourAmens = new Set((yourDb?.amenities || overview?.amenities || []).map(a => a.toLowerCase().split("\n")[0]));
  const superhosts = allComps.filter(c => c.superhost);
  const guestFavs = allComps.filter(c => c.tag?.toLowerCase().includes("guest fav"));
  const topGuestFavs = allComps.filter(c => c.tag?.toLowerCase().includes("top guest fav"));
  const top10 = [...allComps].sort((a, b) => (b.reviews || 0) - (a.reviews || 0)).slice(0, 10);
  const rates = allComps.map(c => c.rate).filter(r => r > 0);
  const ratings = allComps.map(c => c.rating).filter(r => r > 0);
  const higherRated = allComps.filter(c => c.rating > (overview?.rating || 0) && c.rating > 0);
  const higherPriced = allComps.filter(c => c.rate > yourNightlyRate && c.rate > 0);

  const getAmenityGap = () => {
    if (!database?.length) return [];
    const freq = {};
    const topDb = database.filter(l => l.listing_id !== "1600793200513983481" && l.amenities?.length > 0)
      .sort((a, b) => (b.reviews || 0) - (a.reviews || 0)).slice(0, 20);
    topDb.forEach(l => (l.amenities || []).forEach(a => {
      const k = a.toLowerCase().split("\n")[0];
      if (k.length > 2 && k.length < 50) freq[k] = (freq[k] || 0) + 1;
    }));
    return Object.entries(freq).filter(([a]) => !yourAmens.has(a)).sort((a, b) => b[1] - a[1]);
  };

  // ─── ANALYSIS ENGINE — pattern-match question and compute response ───
  const analyze = (question) => {
    const q = question.toLowerCase();
    const lines = [];

    // ── COMPETITIVE ANALYSIS ──
    if (q.includes("competitive") || q.includes("where do i stand") || q.includes("competition") || q.includes("how do i compare") || q.includes("full competitive")) {
      lines.push("📊 FULL COMPETITIVE ANALYSIS\n");
      lines.push(`Your market has ${allComps.length} competitors in the Tooele/Erda/Stansbury Park area.\n`);
      lines.push(`YOUR POSITION:`);
      lines.push(`• Rate: $${yourNightlyRate}/night (Market avg: $${marketAvg?.rate || 0})`);
      lines.push(`• Rating: ${overview?.rating || 0}★ (Market avg: ${marketAvg?.rating || 0}★)`);
      lines.push(`• Reviews: ${overview?.totalReviews || 0} (${allComps.filter(c => c.reviews > (overview?.totalReviews || 0)).length} competitors have more)`);
      lines.push(`• Occupancy: ${overview?.occupancyRate || 0}% (Market avg: ${marketAvg?.occupancy || 0}%)\n`);
      if (rates.length > 0) lines.push(`Rate range in market: $${Math.min(...rates)} – $${Math.max(...rates)}/night`);
      lines.push(`Superhosts: ${superhosts.length}/${allComps.length} | Guest Favorites: ${guestFavs.length} | Top Guest Favorites: ${topGuestFavs.length}\n`);
      const yourRank = [...allComps, yourEntry].filter(Boolean).sort((a, b) => (b?.reviews || 0) - (a?.reviews || 0)).findIndex(c => c?.isYou) + 1;
      lines.push(`You rank #${yourRank} out of ${allComps.length + 1} by review count.`);
      if (yourNightlyRate < (marketAvg?.rate || 0)) {
        lines.push(`\n⚠️ You're priced $${Math.round((marketAvg?.rate || 0) - yourNightlyRate)} below market average. Consider raising rates.`);
      } else {
        lines.push(`\n✅ You're priced $${Math.round(yourNightlyRate - (marketAvg?.rate || 0))} above market average — make sure your amenities justify it.`);
      }
      return lines.join("\n");
    }

    // ── AMENITIES GAP ──
    if (q.includes("ameniti") || q.includes("missing") || q.includes("what don't i have") || q.includes("what am i missing")) {
      const gap = getAmenityGap();
      lines.push("🏠 AMENITY GAP ANALYSIS\n");
      lines.push(`You have ${yourAmens.size} amenities. Here's what top competitors have that you don't:\n`);
      if (gap.length > 0) {
        gap.slice(0, 12).forEach(([amenity, count], i) => {
          lines.push(`${i + 1}. ${amenity} — ${count}/20 top competitors have this`);
        });
        lines.push(`\n💡 PRIORITY: Focus on the top 3-5 items first. Adding popular amenities that most competitors offer directly impacts your search ranking and guest satisfaction.`);
      } else {
        lines.push("Great news — no amenity gap data available yet. Run build_database.py to get detailed competitor amenity lists.");
      }
      return lines.join("\n");
    }

    // ── SUPERHOST / GUEST FAVORITE ──
    if (q.includes("superhost") || q.includes("guest favorite") || q.includes("guest fav")) {
      lines.push("🏆 SUPERHOST & GUEST FAVORITE GUIDE\n");
      lines.push("SUPERHOST REQUIREMENTS:");
      lines.push("• 10+ completed stays in the past year");
      lines.push("• 90%+ response rate");
      lines.push("• Less than 1% cancellation rate");
      lines.push("• 4.8+ overall rating\n");
      lines.push(`YOUR STATUS: ${yourEntry?.superhost ? "✅ Superhost" : "❌ Not yet a Superhost"}`);
      lines.push(`Your rating: ${overview?.rating || 0}★ ${(overview?.rating || 0) >= 4.8 ? "(meets threshold ✅)" : "(need 4.8+ ⚠️)"}`);
      lines.push(`Your reviews: ${overview?.totalReviews || 0} ${(overview?.totalReviews || 0) >= 10 ? "(meets threshold ✅)" : `(need ${10 - (overview?.totalReviews || 0)} more ⚠️)`}`);
      lines.push(`\nIN YOUR MARKET: ${superhosts.length} Superhosts, ${guestFavs.length} Guest Favorites`);
      lines.push(`\nGUEST FAVORITE is awarded by Airbnb based on guest ratings, reviews, and reliability. You can't apply — you earn it by consistently delivering great stays.\n`);
      lines.push("ACTION STEPS:");
      lines.push("1. Respond to every inquiry within 1 hour");
      lines.push("2. Never cancel a reservation");
      lines.push("3. Follow up after every checkout asking for a review");
      lines.push("4. Fix any issue a guest reports within 30 minutes");
      return lines.join("\n");
    }

    // ── ROAST / CRITIQUE ──
    if (q.includes("roast") || q.includes("critique") || q.includes("what needs to change") || q.includes("what's wrong")) {
      lines.push("🔥 HONEST LISTING ROAST\n");
      const issues = [];
      if ((overview?.totalReviews || 0) < 10) issues.push(`You only have ${overview?.totalReviews || 0} review(s). In a market where top competitors have ${top10[0]?.reviews || "100+"}+ reviews, you're practically invisible in search results.`);
      if (!yourEntry?.superhost) issues.push(`You're not a Superhost. ${superhosts.length} competitors are — they literally get priority placement over you.`);
      if (yourNightlyRate < (marketAvg?.rate || 0) - 10) issues.push(`Your $${yourNightlyRate}/night rate is significantly below market average ($${marketAvg?.rate || 0}). You're leaving money on the table.`);
      if (yourNightlyRate > (marketAvg?.rate || 0) + 20) issues.push(`Your $${yourNightlyRate}/night rate is well above market average ($${marketAvg?.rate || 0}). With only ${overview?.totalReviews || 0} reviews, guests may pick a cheaper option with more social proof.`);
      const gap = getAmenityGap();
      if (gap.length > 3) issues.push(`You're missing ${gap.length}+ amenities that top competitors offer, including: ${gap.slice(0, 3).map(([a]) => a).join(", ")}.`);
      if ((overview?.occupancyRate || 0) < 40) issues.push(`${overview?.occupancyRate || 0}% occupancy is low. Your calendar has too many empty nights.`);
      if (issues.length === 0) issues.push("Honestly? Your listing looks solid. Focus on stacking reviews and earning Superhost status.");
      issues.forEach((issue, i) => lines.push(`${i + 1}. ${issue}`));
      lines.push(`\n💪 THE FIX: Focus on review velocity above everything else. Every other problem becomes easier to solve once you have 20+ strong reviews.`);
      return lines.join("\n");
    }

    // ── TOP 5 COMPETITORS ──
    if (q.includes("top 5") || q.includes("top five") || q.includes("top competitor") || q.includes("biggest competitor")) {
      lines.push("🏅 YOUR TOP 5 COMPETITORS (by reviews)\n");
      top10.slice(0, 5).forEach((c, i) => {
        const dbEntry = database?.find(d => d.listing_id === c.listing_id);
        lines.push(`${i + 1}. ${c.name}`);
        lines.push(`   $${c.rate}/night · ${c.rating}★ · ${c.reviews} reviews · ${c.occupancy}% occ`);
        if (c.superhost) lines.push(`   🏆 Superhost`);
        if (c.tag?.toLowerCase().includes("guest fav")) lines.push(`   ⭐ ${c.tag}`);
        if (dbEntry?.amenities?.length) {
          const theirExtra = dbEntry.amenities.filter(a => !yourAmens.has(a.toLowerCase().split("\n")[0])).slice(0, 3);
          if (theirExtra.length > 0) lines.push(`   They have (you don't): ${theirExtra.map(a => a.split("\n")[0]).join(", ")}`);
        }
        lines.push("");
      });
      lines.push(`💡 Focus on matching the amenities and service level of the top 2-3 competitors. You don't need to beat everyone — just be competitive with the leaders.`);
      return lines.join("\n");
    }

    // ── 30 DAY ACTION PLAN ──
    if (q.includes("30-day") || q.includes("30 day") || q.includes("action plan") || q.includes("plan")) {
      lines.push("📋 30-DAY ACTION PLAN\n");
      lines.push("WEEK 1 — Foundation");
      lines.push("• Update all listing photos (bright, wide-angle, staged)");
      lines.push("• Write a compelling description highlighting unique features");
      lines.push("• Enable Instant Book and same-day bookings");
      lines.push(`• Set competitive pricing: $${Math.max(yourNightlyRate - 10, Math.round((marketAvg?.rate || yourNightlyRate) * 0.9))}/night weekdays, $${Math.round((marketAvg?.rate || yourNightlyRate) * 1.1)}/night weekends\n`);
      lines.push("WEEK 2 — Amenity Upgrade");
      const gap = getAmenityGap();
      if (gap.length > 0) {
        lines.push(`• Add top missing amenities: ${gap.slice(0, 4).map(([a]) => a).join(", ")}`);
      }
      lines.push("• Create a digital welcome guidebook");
      lines.push("• Stock extra supplies (coffee, snacks, toiletries)\n");
      lines.push("WEEK 3 — Reviews & Visibility");
      lines.push("• Message every past guest asking for a review");
      lines.push("• Offer a 15% discount for next 3 bookings to build review count");
      lines.push("• List on VRBO as a secondary platform\n");
      lines.push("WEEK 4 — Optimize & Scale");
      lines.push("• Set up a dynamic pricing tool (PriceLabs)");
      lines.push("• Analyze which day-of-week gets most bookings");
      lines.push("• Send mid-stay check-in messages to all guests");
      lines.push(`• Target: ${Math.min((overview?.totalReviews || 0) + 5, 20)} total reviews by end of month`);
      return lines.join("\n");
    }

    // ── PRICING ──
    if (q.includes("pric") || q.includes("rate") || q.includes("how much") || q.includes("charge") || q.includes("revenue")) {
      lines.push("💰 PRICING ANALYSIS\n");
      lines.push(`Your rate: $${yourNightlyRate}/night`);
      lines.push(`Market average: $${marketAvg?.rate || 0}/night`);
      if (rates.length > 0) {
        lines.push(`Market range: $${Math.min(...rates)} – $${Math.max(...rates)}/night`);
        const median = [...rates].sort((a, b) => a - b)[Math.floor(rates.length / 2)];
        lines.push(`Median rate: $${median}/night\n`);
      }
      lines.push(`${higherPriced.length} competitors charge more than you.`);
      lines.push(`${allComps.filter(c => c.rate > 0 && c.rate < yourNightlyRate).length} competitors charge less.\n`);
      lines.push("RECOMMENDATION:");
      if ((overview?.totalReviews || 0) < 10) {
        lines.push(`With only ${overview?.totalReviews || 0} reviews, price slightly below market to attract bookings:`);
        lines.push(`• Weekdays: $${Math.round((marketAvg?.rate || yourNightlyRate) * 0.85)}/night`);
        lines.push(`• Weekends: $${Math.round((marketAvg?.rate || yourNightlyRate) * 0.95)}/night`);
        lines.push(`• Once you hit 15+ reviews, raise to market rate or above.`);
      } else {
        lines.push(`With ${overview?.totalReviews || 0} reviews and ${overview?.rating || 0}★, you can price competitively:`);
        lines.push(`• Weekdays: $${Math.round((marketAvg?.rate || yourNightlyRate) * 0.95)}/night`);
        lines.push(`• Weekends: $${Math.round((marketAvg?.rate || yourNightlyRate) * 1.15)}/night`);
        lines.push(`• Holidays/events: $${Math.round((marketAvg?.rate || yourNightlyRate) * 1.3)}/night`);
      }
      return lines.join("\n");
    }

    // ── REVIEWS ──
    if (q.includes("review") || q.includes("feedback") || q.includes("guest said")) {
      lines.push("⭐ REVIEWS ANALYSIS\n");
      lines.push(`You have ${overview?.totalReviews || 0} reviews with a ${overview?.rating || 0}★ rating.`);
      lines.push(`Market average: ${marketAvg?.rating || 0}★\n`);
      const moreRevs = allComps.filter(c => c.reviews > (overview?.totalReviews || 0));
      lines.push(`${moreRevs.length} competitors have more reviews than you.`);
      if (top10[0]) lines.push(`Top competitor has ${top10[0].reviews} reviews.\n`);
      if (overview?.reviews?.length > 0) {
        lines.push("YOUR RECENT REVIEWS:");
        overview.reviews.slice(0, 4).forEach(r => {
          lines.push(`• ${r.author}: "${(r.comment || "").slice(0, 100)}"`);
        });
        lines.push("");
      }
      lines.push("HOW TO GET MORE REVIEWS:");
      lines.push("1. Send a warm thank-you message at checkout");
      lines.push("2. Mention in the message: 'A review would mean the world to us!'");
      lines.push("3. Leave a guest review first — this prompts them to reciprocate");
      lines.push("4. Provide a memorable amenity (local treats, handwritten note) that guests want to mention");
      lines.push(`5. Target: ${Math.max(10, (overview?.totalReviews || 0) + 5)} reviews within 60 days`);
      return lines.join("\n");
    }

    // ── OCCUPANCY ──
    if (q.includes("occupancy") || q.includes("booked") || q.includes("empty") || q.includes("vacant") || q.includes("calendar")) {
      lines.push("📅 OCCUPANCY ANALYSIS\n");
      lines.push(`Your occupancy: ${overview?.occupancyRate || 0}%`);
      lines.push(`Market average: ${marketAvg?.occupancy || 0}%`);
      lines.push(`Booked nights this month: ${overview?.bookedNights || 0}/${overview?.totalNights || 30}\n`);
      lines.push("TO INCREASE OCCUPANCY:");
      lines.push("1. Enable Instant Book — it boosts search ranking significantly");
      lines.push("2. Reduce minimum stay to 1-2 nights for gaps between bookings");
      lines.push("3. Offer a 10-15% last-minute discount (within 3 days)");
      lines.push("4. Lower weekday rates by 10-15% to fill slow days");
      lines.push("5. List on VRBO, Booking.com, and Furnished Finder");
      return lines.join("\n");
    }

    // ── MARKET OVERVIEW ──
    if (q.includes("market") || q.includes("area") || q.includes("tooele") || q.includes("neighborhood")) {
      lines.push("📍 TOOELE MARKET OVERVIEW\n");
      lines.push(`Total competitors: ${allComps.length}`);
      lines.push(`Superhosts: ${superhosts.length} | Guest Favorites: ${guestFavs.length} | Top Guest Favorites: ${topGuestFavs.length}\n`);
      if (rates.length > 0) lines.push(`Rate range: $${Math.min(...rates)} – $${Math.max(...rates)}/night (avg $${marketAvg?.rate || 0})`);
      if (ratings.length > 0) lines.push(`Rating range: ${Math.min(...ratings).toFixed(1)} – ${Math.max(...ratings).toFixed(1)}★ (avg ${marketAvg?.rating || 0}★)`);
      const bedCounts = {};
      allComps.forEach(c => { const b = c.bedrooms || 0; bedCounts[b] = (bedCounts[b] || 0) + 1; });
      lines.push(`\nBedroom distribution: ${Object.entries(bedCounts).sort((a, b) => a[0] - b[0]).map(([b, c]) => `${b}BR: ${c}`).join(" | ")}`);
      lines.push(`\nAvg occupancy estimate: ${marketAvg?.occupancy || 0}%`);
      return lines.join("\n");
    }

    // ── DESCRIPTION / LISTING ──
    if (q.includes("description") || q.includes("listing") || q.includes("title") || q.includes("photos")) {
      lines.push("📝 LISTING OPTIMIZATION TIPS\n");
      lines.push("TITLE: Make it specific and searchable");
      lines.push(`• Current: "${yourEntry?.name || overview?.property || "Your listing"}"`);
      lines.push(`• Better: Include key features like "3BR · Mountain Views · Hot Tub · Near SLC"\n`);
      lines.push("DESCRIPTION:");
      lines.push("• Lead with your best feature in the first 2 sentences");
      lines.push("• Mention nearby attractions (SLC, ski resorts, outdoors)");
      lines.push("• Include practical info (parking, check-in process, WiFi speed)");
      lines.push("• Break into short paragraphs with headers\n");
      lines.push("PHOTOS (most important factor):");
      lines.push("1. Hire a photographer ($100-200 investment that pays for itself)");
      lines.push("2. Show every room, bright and staged");
      lines.push("3. First photo = hero shot of the best room/view");
      lines.push("4. Include lifestyle shots (coffee on the patio, etc.)");
      return lines.join("\n");
    }

    // ── DEFAULT / GENERAL ──
    lines.push(`📊 QUICK SNAPSHOT\n`);
    lines.push(`Property: ${overview?.property || "Your Listing"}`);
    lines.push(`Rate: $${yourNightlyRate}/night | Rating: ${overview?.rating || 0}★ | Reviews: ${overview?.totalReviews || 0}`);
    lines.push(`Occupancy: ${overview?.occupancyRate || 0}% | Revenue: $${(overview?.totalRevenue || 0).toLocaleString()}/mo`);
    lines.push(`Market: ${allComps.length} competitors, avg $${marketAvg?.rate || 0}/night, ${marketAvg?.rating || 0}★\n`);
    lines.push(`I can help with these topics — try asking about:`);
    lines.push(`• "Full competitive analysis" — see where you rank`);
    lines.push(`• "What amenities am I missing?" — gap analysis vs top hosts`);
    lines.push(`• "Pricing strategy" — optimal rate recommendations`);
    lines.push(`• "How to get more reviews?" — review velocity tactics`);
    lines.push(`• "Top 5 competitors breakdown" — detailed competitor intel`);
    lines.push(`• "30-day action plan" — step-by-step improvement roadmap`);
    lines.push(`• "Roast my listing" — honest critique`);
    lines.push(`• "How do I become a Superhost?" — requirements and tips`);
    lines.push(`• "Occupancy" / "Calendar" — fill empty nights`);
    lines.push(`• "Market overview" — Tooele area market stats`);
    return lines.join("\n");
  };

  const send = (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setProcessing(true);
    // Small delay to feel responsive rather than instant
    setTimeout(() => {
      const response = analyze(msg);
      setMessages(prev => [...prev, { role: "assistant", text: response }]);
      setProcessing(false);
    }, 300);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 480, height: "92vh", background: C.card,
        border: `1px solid ${C.cardBorder}`, borderRadius: "16px 16px 0 0",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 -8px 48px #00000077", margin: "0 24px",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, color: C.accent }}>✦</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700 }}>AI Rental Advisor</span>
              <span style={{ fontSize: 9, background: C.greenSoft, color: C.green, border: `1px solid ${C.green}44`, borderRadius: 4, padding: "1px 6px" }}>BUILT-IN</span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: C.muted, marginTop: 2 }}>
              Analyzing {allComps.length} competitors · {database?.length || 0} detailed profiles · No API needed
            </p>
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
                fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap",
                border: m.role === "assistant" ? `1px solid ${C.cardBorder}` : "none",
              }}>{m.text}</div>
            </div>
          ))}
          {processing && (
            <div style={{ display: "flex", gap: 5, padding: "10px 14px", background: C.bg, borderRadius: 12, width: "fit-content", border: `1px solid ${C.cardBorder}` }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, animation: `bounce 1s ${i*0.2}s infinite` }} />)}
            </div>
          )}
          <div ref={endRef} />
        </div>
        {!processing && (
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
            placeholder="Ask about competition, pricing, amenities, reviews..." style={{
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

// ─── Loading spinner ───
function LoadingState() {
  return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif", color: C.text,
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: "50%",
              background: C.accent, animation: `bounce 1s ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
        <p style={{ color: C.muted, fontSize: 14 }}>Loading dashboard data...</p>
      </div>
    </div>
  );
}

const TABS = ["Overview", "Competition", "Recommendations"];

export default function App() {
  const [tab, setTab] = useState("Overview");
  const [showAI, setShowAI] = useState(false);
  const [activeRec, setActiveRec] = useState(null);
  const [compSort, setCompSort] = useState({ key: "reviews", dir: "desc" });
  const [selectedTrendMonth, setSelectedTrendMonth] = useState(null);

  // ─── Live data state ───
  const [overview, setOverview] = useState(null);
  const [competitors, setCompetitors] = useState([]);
  const [database, setDatabase] = useState(null);
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ─── Fetch data on mount ───
  useEffect(() => {
    Promise.all([
      fetch("/overview.json").then(r => {
        if (!r.ok) throw new Error(`overview.json: ${r.status}`);
        return r.json();
      }),
      fetch("/competitor.json").then(r => {
        if (!r.ok) throw new Error(`competitor.json: ${r.status}`);
        return r.json();
      }),
      fetch("/Database.json").then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/calendar.json").then(r => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(([overviewData, competitorData, dbData, calData]) => {
        setOverview(overviewData);
        setCompetitors(competitorData);
        setDatabase(dbData);
        setCalendarData(calData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load data:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // ─── Loading / error states ───
  if (loading) return <LoadingState />;
  if (error || !overview) {
    return (
      <div style={{
        minHeight: "100vh", background: C.bg, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif", color: C.text,
      }}>
        <div style={{
          background: C.card, border: `1px solid ${C.cardBorder}`,
          borderRadius: 14, padding: 32, maxWidth: 480, textAlign: "center",
        }}>
          <p style={{ fontSize: 18, color: C.rose, marginBottom: 12 }}>Failed to load data</p>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>{error}</p>
          <p style={{ fontSize: 12, color: C.muted }}>
            Make sure <code style={{ color: C.accent }}>overview.json</code> and{" "}
            <code style={{ color: C.accent }}>competitor.json</code> are in your{" "}
            <code style={{ color: C.accent }}>/public</code> folder.
          </p>
        </div>
      </div>
    );
  }

  // ─── Derived / computed values ───
  const marketAvg = computeMarketAvg(competitors);
  const topComp = findTopCompetitor(competitors);

  // Pull YOUR nightly rate from competitor.json (already calculated there)
  const yourCompEntry = competitors.find(c => c.isYou);
  const yourNightlyRate = yourCompEntry?.rate || overview.avgNightlyRate || 0;

  // Build your amenities set for competitive edge comparison
  const yourAmenities = (() => {
    const yourDb = database?.find(l => l.listing_id === "1600793200513983481");
    const amenList = yourDb?.amenities || overview.amenities || [];
    return new Set(amenList.map(a => a.toLowerCase().split("\n")[0]));
  })();

  const kpiRecommendations = buildKPIRecommendations({ ...overview, avgNightlyRate: yourNightlyRate }, marketAvg, topComp, competitors, database);

  const bookedNights = overview.bookedNights || 0;
  const totalNights = overview.totalNights || 30;
  const blockedCount = overview.calendar?.blocked?.length || 0;
  const availableNights = totalNights - bookedNights - blockedCount;

  const calendarMonth = overview.calendar?.month || new Date().toLocaleString("default", { month: "long", year: "numeric" });
  const calendarBooked = overview.calendar?.booked || [];
  const calendarBlocked = overview.calendar?.blocked || [];

  const reviews = overview.reviews || [];

  // ─── Compute monthly booking trends from calendar.json ───
  const calendarMonths = (() => {
    if (!calendarData?.records) return [];
    const records = calendarData.records.filter(r => r.status?.toLowerCase() === "booked");
    const blockedSet = new Set(calendarData.blocked_dates || []);

    // Walk each booking record night-by-night, bucket into months
    const monthMap = {};  // "2026-03" => { booked: Set, revenue: 0 }

    records.forEach(rec => {
      try {
        const checkin = new Date(rec["check-in"] + "T00:00:00");
        const checkout = new Date(rec["check-out"] + "T00:00:00");
        const payout = rec.host_payout || 0;
        const numNights = Math.round((checkout - checkin) / 86400000);
        if (numNights <= 0) return;
        const ppn = payout / numNights;

        for (let i = 0; i < numNights; i++) {
          const d = new Date(checkin);
          d.setDate(d.getDate() + i);
          const mk = d.toISOString().slice(0, 7);
          const dayNum = d.getDate();
          if (!monthMap[mk]) monthMap[mk] = { booked: new Set(), blocked: new Set(), revenue: 0 };
          monthMap[mk].booked.add(dayNum);
          monthMap[mk].revenue += ppn;
        }
      } catch (e) { /* skip bad records */ }
    });

    // Add blocked dates that aren't booked
    (calendarData.blocked_dates || []).forEach(ds => {
      try {
        const d = new Date(ds + "T00:00:00");
        const mk = d.toISOString().slice(0, 7);
        const dayNum = d.getDate();
        if (!monthMap[mk]) monthMap[mk] = { booked: new Set(), blocked: new Set(), revenue: 0 };
        if (!monthMap[mk].booked.has(dayNum)) {
          monthMap[mk].blocked.add(dayNum);
        }
      } catch (e) { /* skip */ }
    });

    // Convert to sorted array, starting from March 2026
    const LIVE = "2026-03";
    return Object.entries(monthMap)
      .filter(([mk]) => mk >= LIVE)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mk, data]) => {
        const [y, m] = mk.split("-").map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        const monthNames = ["", "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        return {
          month: monthNames[m],
          year_month: mk,
          booked: data.booked.size,
          blocked: data.blocked.size,
          available: daysInMonth - data.booked.size - data.blocked.size,
          bookedDays: [...data.booked],
          blockedDays: [...data.blocked],
          daysInMonth,
          revenue: Math.round(data.revenue * 100) / 100,
        };
      });
  })();

  const selectedTrendEntry = selectedTrendMonth ? calendarMonths.find(m => m.year_month === selectedTrendMonth) : null;
  const displayOccRate = selectedTrendEntry
    ? Math.round(selectedTrendEntry.booked / selectedTrendEntry.daysInMonth * 100)
    : overview.occupancyRate || 0;
  const displayBookedNights = selectedTrendEntry ? selectedTrendEntry.booked : bookedNights;
  const displayTotalNights = selectedTrendEntry ? selectedTrendEntry.daysInMonth : totalNights;
  const displayAvailableNights = selectedTrendEntry ? selectedTrendEntry.available : availableNights;
  const displayBlockedCount = selectedTrendEntry ? selectedTrendEntry.blocked : blockedCount;

  const statCards = [
    { label: "Occupancy Rate", value: `${displayOccRate}%`, sub: `${displayBookedNights}/${displayTotalNights} nights${selectedTrendEntry ? ` · ${selectedTrendEntry.month}` : ""}`, mkt: `Mkt avg ${marketAvg.occupancy}%`, color: C.accent, vs: +(displayOccRate - marketAvg.occupancy).toFixed(1) },
    { label: "Monthly Revenue", value: `$${selectedTrendEntry ? Math.round(selectedTrendEntry.revenue).toLocaleString() : (overview.totalRevenue || 0).toLocaleString()}`, sub: selectedTrendEntry ? selectedTrendEntry.month : (overview.projectedRevenue ? `$${overview.projectedRevenue.toLocaleString()} projected` : ""), mkt: null, color: C.teal, vs: null },
    { label: "Avg Nightly Rate", value: `$${yourNightlyRate}`, sub: "per night", mkt: `Mkt avg $${marketAvg.rate}`, color: C.green, vs: +(yourNightlyRate - marketAvg.rate).toFixed(1) },
    { label: "Guest Rating", value: `${overview.rating || 0}★`, sub: `${overview.totalReviews || 0} reviews`, mkt: `Mkt avg ${marketAvg.rating}★`, color: C.purple, vs: +((overview.rating || 0) - marketAvg.rating).toFixed(2) },
  ];

  // Head-to-head: You vs top competitor
  const h2hItems = topComp ? [
    { label: "Occupancy", you: overview.occupancyRate || 0, them: topComp.occupancy || 0, unit: "%", max: 100, color: C.accent },
    { label: "Nightly Rate", you: yourNightlyRate, them: topComp.rate || 0, unit: "$", max: Math.max((topComp.rate || 0), yourNightlyRate) + 40, color: C.teal },
    { label: "Rating", you: overview.rating || 0, them: topComp.rating || 0, unit: "★", max: 5, color: C.purple },
    { label: "Reviews", you: overview.totalReviews || 0, them: topComp.reviews || 0, unit: "", max: Math.max((topComp.reviews || 0), (overview.totalReviews || 0)) + 10, color: C.green },
  ] : [];

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
            <p style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{overview.property} · {calendarMonth}</p>
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
                  <p style={{ color: C.muted, fontSize: 12, marginBottom: 20 }}>
                    {calendarMonths.length > 0 ? `Occupancy breakdown — ${calendarMonths.length} month${calendarMonths.length > 1 ? "s" : ""}` : "No calendar data — add calendar.json to /public"}
                  </p>
                  {calendarMonths.length > 0 ? (
                    <>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
                        {calendarMonths.map((d, i) => {
                          const maxDays = Math.max(...calendarMonths.map(m => m.daysInMonth));
                          const bookedPct = (d.booked / maxDays) * 100;
                          const blockedPct = (d.blocked / maxDays) * 100;
                          const availablePct = (d.available / maxDays) * 100;
                          const isCurrentMonth = d.year_month === new Date().toISOString().slice(0, 7);
                          const isSelected = d.year_month === selectedTrendMonth;
                          return (
                            <div
                              key={i}
                              onClick={() => setSelectedTrendMonth(isSelected ? null : d.year_month)}
                              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", cursor: "pointer" }}
                            >
                              {/* Revenue label on top */}
                              <span style={{ fontSize: 9, color: C.teal, fontFamily: "'DM Mono', monospace", fontWeight: 600, whiteSpace: "nowrap" }}>
                                ${d.revenue >= 1000 ? `${(d.revenue / 1000).toFixed(1)}k` : Math.round(d.revenue)}
                              </span>
                              {/* Stacked bar */}
                              <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                                <div style={{
                                  width: "100%", borderRadius: "4px 4px 0 0", overflow: "hidden",
                                  outline: isSelected ? `2px solid ${C.accent}` : "none",
                                  outlineOffset: 2,
                                }}>
                                  {/* Available segment (green) — top */}
                                  {d.available > 0 && (
                                    <div style={{
                                      width: "100%",
                                      height: Math.max(2, availablePct * 1.1),
                                      background: C.green,
                                      opacity: 0.45,
                                    }} />
                                  )}
                                  {/* Blocked segment (red) — middle */}
                                  {d.blocked > 0 && (
                                    <div style={{
                                      width: "100%",
                                      height: Math.max(2, blockedPct * 1.1),
                                      background: C.rose,
                                      opacity: 0.7,
                                    }} />
                                  )}
                                  {/* Booked segment (yellow/accent) — bottom */}
                                  <div style={{
                                    width: "100%",
                                    height: Math.max(2, bookedPct * 1.1),
                                    background: isCurrentMonth ? C.accent : C.accent + "99",
                                  }}>
                                    <span style={{
                                      display: "block", textAlign: "center", paddingTop: 2,
                                      fontSize: 10, color: "#000", fontFamily: "'DM Mono', monospace", fontWeight: 700,
                                    }}>{d.booked > 0 ? d.booked : ""}</span>
                                  </div>
                                </div>
                              </div>
                              {/* Month label */}
                              <span style={{ fontSize: 10, color: isSelected ? C.accent : isCurrentMonth ? C.accent : C.muted, fontFamily: "'DM Mono', monospace", fontWeight: isSelected || isCurrentMonth ? 700 : 400 }}>{d.month}</span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Legend */}
                      <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: C.accent }} />
                          <span style={{ fontSize: 11, color: C.muted }}>Booked</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: C.rose, opacity: 0.7 }} />
                          <span style={{ fontSize: 11, color: C.muted }}>Blocked</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: C.green, opacity: 0.6 }} />
                          <span style={{ fontSize: 11, color: C.muted }}>Available</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: C.teal }} />
                          <span style={{ fontSize: 11, color: C.muted }}>Revenue</span>
                        </div>
                      </div>
                      {/* Summary row */}
                      <div style={{ display: "flex", gap: 12, marginTop: 10, padding: "8px 0", borderTop: `1px solid ${C.cardBorder}` }}>
                        <span style={{ fontSize: 11, color: C.muted }}>
                          Total: <span style={{ color: C.accent, fontWeight: 600 }}>{calendarMonths.reduce((s, m) => s + m.booked, 0)} booked</span>
                          {" · "}<span style={{ color: C.rose, fontWeight: 600 }}>{calendarMonths.reduce((s, m) => s + m.blocked, 0)} blocked</span>
                          {" · "}<span style={{ color: C.green, fontWeight: 600 }}>{calendarMonths.reduce((s, m) => s + m.available, 0)} open</span>
                          {" · "}<span style={{ color: C.teal, fontWeight: 600 }}>${calendarMonths.reduce((s, m) => s + m.revenue, 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                        </span>
                      </div>
                      {selectedTrendMonth && (
                        <p style={{ fontSize: 11, color: C.accent, marginTop: 6, fontStyle: "italic" }}>
                          Showing calendar for {calendarMonths.find(m => m.year_month === selectedTrendMonth)?.month} — click bar again to reset
                        </p>
                      )}
                    </>
                  ) : (
                    <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <p style={{ color: C.muted, fontSize: 13, fontStyle: "italic" }}>Add calendar.json to your /public folder to see booking trends</p>
                    </div>
                  )}
                </div>

                <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: 24 }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Occupancy</h3>
                  <p style={{ color: selectedTrendEntry ? C.accent : C.muted, fontSize: 12, marginBottom: 16 }}>
                    {selectedTrendEntry ? `${selectedTrendEntry.month} at a glance` : "This month at a glance"}
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                    <RadialGauge value={displayOccRate} color={C.accent} size={110} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Booked", value: displayBookedNights, color: C.accent },
                      { label: "Available", value: displayAvailableNights, color: C.green },
                      { label: "Blocked", value: displayBlockedCount, color: C.rose },
                      { label: "Response", value: overview.responseRate ? `${overview.responseRate}%` : "N/A", color: C.teal },
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
                  {(() => {
                    const selectedEntry = selectedTrendMonth ? calendarMonths.find(m => m.year_month === selectedTrendMonth) : null;
                    const displayBooked = selectedEntry ? selectedEntry.bookedDays : calendarBooked;
                    const displayBlocked = selectedEntry ? selectedEntry.blockedDays : calendarBlocked;
                    const displayTotalDays = selectedEntry ? selectedEntry.daysInMonth : totalNights;
                    const displayLabel = selectedEntry
                      ? new Date(selectedEntry.year_month + "-02").toLocaleString("default", { month: "long", year: "numeric" })
                      : calendarMonth;
                    return (
                      <>
                        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Availability Calendar</h3>
                        <p style={{ color: selectedEntry ? C.accent : C.muted, fontSize: 12, marginBottom: 16 }}>{displayLabel}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {Array.from({ length: displayTotalDays }, (_, i) => i + 1).map(d => {
                            const status = displayBooked.includes(d) ? "booked" : displayBlocked.includes(d) ? "blocked" : "open";
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
                      </>
                    );
                  })()}
                </div>

                <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: 24 }}>
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700 }}>Recent Reviews</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <StarRating rating={overview.rating || 0} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>{overview.rating || 0}</span>
                      <span style={{ fontSize: 12, color: C.muted }}>· {overview.totalReviews || 0} total</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 210, overflowY: "auto" }}>
                    {reviews.length > 0 ? reviews.slice(0, 6).map((r, i) => (
                      <div key={i} style={{ borderBottom: `1px solid ${C.cardBorder}`, paddingBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{r.author || "Guest"}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <StarRating rating={r.rating || 5} size={11} />
                            <span style={{ fontSize: 11, color: C.muted }}>{r.date || ""}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{r.comment || ""}</p>
                      </div>
                    )) : (
                      <p style={{ color: C.muted, fontSize: 13, fontStyle: "italic" }}>No reviews scraped yet — run scrape_listing.py</p>
                    )}
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
                  { label: "Occupancy vs Market", you: `${overview.occupancyRate || 0}%`, mkt: `${marketAvg.occupancy}%`, diff: +((overview.occupancyRate || 0) - marketAvg.occupancy).toFixed(1), color: C.accent },
                  { label: "Nightly Rate vs Market", you: `$${yourNightlyRate}`, mkt: `$${marketAvg.rate}`, diff: +(yourNightlyRate - marketAvg.rate).toFixed(1), color: C.teal },
                  { label: "Rating vs Market", you: `${overview.rating || 0}★`, mkt: `${marketAvg.rating}★`, diff: +((overview.rating || 0) - marketAvg.rating).toFixed(2), color: C.purple },
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
                    <p style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{competitors.length} properties — click column headers to sort</p>
                  </div>
                  <span style={{ fontSize: 11, background: C.tealSoft, color: C.teal, border: `1px solid ${C.teal}44`, borderRadius: 20, padding: "4px 12px" }}>Live Market Data</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.5fr 0.8fr 0.8fr 0.8fr 0.8fr 1.4fr", gap: 12, padding: "0 16px 10px", borderBottom: `1px solid ${C.cardBorder}`, marginBottom: 8 }}>
                  {[
                    { label: "Property", key: null },
                    { label: "Beds", key: "bedrooms" },
                    { label: "Occupancy", key: "occupancy" },
                    { label: "Rate/Night", key: "rate" },
                    { label: "Rating", key: "rating" },
                    { label: "Reviews", key: "reviews" },
                    { label: "Competitive Edge", key: null },
                  ].map(h => (
                    <span
                      key={h.label}
                      onClick={h.key ? () => setCompSort(prev => ({
                        key: h.key,
                        dir: prev.key === h.key && prev.dir === "desc" ? "asc" : "desc"
                      })) : undefined}
                      style={{
                        fontSize: 10, color: compSort.key === h.key ? C.accent : C.muted,
                        textTransform: "uppercase", letterSpacing: 1,
                        cursor: h.key ? "pointer" : "default",
                        userSelect: "none",
                        display: "flex", alignItems: "center", gap: 3,
                      }}
                    >
                      {h.label}
                      {h.key && compSort.key === h.key && (
                        <span style={{ fontSize: 9 }}>{compSort.dir === "desc" ? "▼" : "▲"}</span>
                      )}
                      {h.key && compSort.key !== h.key && (
                        <span style={{ fontSize: 9, opacity: 0.3 }}>⇅</span>
                      )}
                    </span>
                  ))}
                </div>
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                  {(() => {
                    // Sort competitors: your listing always pinned at top, rest sorted by selected column
                    const you = competitors.filter(c => c.isYou);
                    const others = competitors.filter(c => !c.isYou);
                    const sorted = [...others].sort((a, b) => {
                      const aVal = a[compSort.key] || 0;
                      const bVal = b[compSort.key] || 0;
                      return compSort.dir === "desc" ? bVal - aVal : aVal - bVal;
                    });
                    return [...you, ...sorted];
                  })().map((c, i) => (
                    <CompetitorRow key={c.listing_id || i} c={c} yourOcc={overview.occupancyRate || 0} yourRate={yourNightlyRate} database={database} yourAmenities={yourAmenities} />
                  ))}
                </div>
              </div>

              {topComp && (
                <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: 24 }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Head-to-Head: You vs. Top Competitor</h3>
                  <p style={{ color: C.muted, fontSize: 12, marginBottom: 22 }}>{overview.property} vs. {topComp.name} (market leader)</p>
                  {h2hItems.map((item, i) => (
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
                        {item.them > item.you ? (
                          <span style={{ fontSize: 11, color: C.rose }}>Gap: {item.unit === "$" ? "$" : ""}{(item.them - item.you).toFixed(item.unit === "★" ? 2 : 0)}{item.unit !== "$" ? item.unit : ""} behind</span>
                        ) : (
                          <span style={{ fontSize: 11, color: C.green }}>Ahead by {item.unit === "$" ? "$" : ""}{(item.you - item.them).toFixed(item.unit === "★" ? 2 : 0)}{item.unit !== "$" ? item.unit : ""}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                {kpiRecommendations.map((rec, i) => (
                  <KPICard key={i} rec={rec} active={activeRec === i} onClick={() => setActiveRec(activeRec === i ? null : i)} />
                ))}
              </div>

              {activeRec !== null && (
                <div style={{
                  background: C.card, border: `1px solid ${kpiRecommendations[activeRec].color}44`,
                  borderRadius: 14, padding: 28, marginBottom: 16,
                  borderLeft: `4px solid ${kpiRecommendations[activeRec].color}`,
                  animation: "fadeUp 0.3s both",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: kpiRecommendations[activeRec].color }}>
                        {kpiRecommendations[activeRec].kpi} — Action Plan
                      </h3>
                      <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
                        Current: {kpiRecommendations[activeRec].current} → Target: {kpiRecommendations[activeRec].target} ({kpiRecommendations[activeRec].gap})
                      </p>
                    </div>
                    <button onClick={() => setShowAI(true)} style={{
                      background: C.accentSoft, border: `1px solid ${C.accent}44`,
                      color: C.accent, borderRadius: 10, padding: "8px 14px",
                      cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
                    }}>✦ Ask AI for details</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {kpiRecommendations[activeRec].actions.map((action, i) => (
                      <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 16px", background: C.bg, borderRadius: 10 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: kpiRecommendations[activeRec].color + "22",
                          border: `1px solid ${kpiRecommendations[activeRec].color}44`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, color: kpiRecommendations[activeRec].color,
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
                <p style={{ color: C.muted, fontSize: 12, marginBottom: 18 }}>Highest-impact, lowest-effort actions based on your market data</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                  {(() => {
                    const allComps = competitors.filter(c => !c.isYou);
                    const superhostCount = allComps.filter(c => c.superhost).length;
                    const gfCount = allComps.filter(c => c.tag?.toLowerCase().includes("guest fav")).length;
                    const avgCompRate = marketAvg.rate || 0;
                    const rateDiff = Math.round(avgCompRate - yourNightlyRate);
                    const quickWins = [
                      { action: "Enable dynamic pricing tool (PriceLabs/Wheelhouse)", impact: "High", effort: "Low", kpi: "Revenue", color: C.green },
                      yourNightlyRate < avgCompRate
                        ? { action: `Raise weekend rates by $${Math.max(10, rateDiff)}–$${Math.max(15, rateDiff + 10)} (market avg is $${avgCompRate})`, impact: "High", effort: "Low", kpi: "Rate", color: C.teal }
                        : { action: `You're above market avg ($${avgCompRate}) — test $${yourNightlyRate + 10}/night on peak weekends`, impact: "Medium", effort: "Low", kpi: "Rate", color: C.teal },
                      { action: `Earn Superhost status (${superhostCount} competitors have it — they rank higher in search)`, impact: "High", effort: "Medium", kpi: "Occupancy", color: C.accent },
                      { action: "Create a digital guidebook with local tips — top-rated hosts all do this", impact: "Medium", effort: "Low", kpi: "Rating", color: C.purple },
                      { action: "Send a mid-stay check-in message to catch issues before checkout", impact: "Medium", effort: "Low", kpi: "Rating", color: C.purple },
                      { action: `Get more reviews — ${gfCount} competitors have Guest Favorite status`, impact: "High", effort: "Medium", kpi: "Occupancy", color: C.accent },
                    ];
                    return quickWins;
                  })().map((item, i) => (
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

      {showAI && <AITipsPanel onClose={() => setShowAI(false)} overview={overview} competitors={competitors} marketAvg={marketAvg} yourNightlyRate={yourNightlyRate} database={database} />}
    </>
  );
}
