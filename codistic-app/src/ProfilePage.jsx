import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";

const LANG_COLORS = {
  python: "#3B82F6",
  javascript: "#F59E0B",
  java: "#EF4444",
  cpp: "#8B5CF6",
  go: "#06B6D4",
  rust: "#F97316",
};

// Helper: Time ago
function timeAgo(date) {
  if (!date) return "Unknown";
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval >= 1) {
    if (Math.floor(interval) === 1) return "Yesterday";
    return Math.floor(interval) + " days ago";
  }
  interval = seconds / 3600;
  if (interval >= 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval >= 1) return Math.floor(interval) + " mins ago";
  return Math.floor(seconds) + " seconds ago";
}

export default function ProfilePage({ user, theme, accent, onBack, isMono }) {
  const t = theme;
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const q = query(
          collection(db, "users", user.uid, "sessions"),
          orderBy("timestamp", "desc"),
          limit(100)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSessions(data);
      } catch (e) {
        console.error("Error fetching sessions:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [user.uid]);

  // Derived stats
  const totalSessions = sessions.length;
  
  // Lines Codified
  const lengthToLines = { short: 15, medium: 30, long: 100 };
  const linesCodified = sessions.reduce((acc, s) => acc + (lengthToLines[s.length] || 15), 0);

  // Top Language & Mastery
  const langCounts = {};
  const langWpms = {};
  sessions.forEach(s => {
    langCounts[s.language] = (langCounts[s.language] || 0) + 1;
    if (!langWpms[s.language] || s.wpm > langWpms[s.language]) {
      langWpms[s.language] = s.wpm;
    }
  });
  
  let topLang = "None";
  let topLangWpm = 0;
  let topLangAcc = 0;
  Object.keys(langCounts).forEach(l => {
    if (!topLang || topLang === "None" || langCounts[l] > (langCounts[topLang] || 0)) topLang = l;
  });
  if (topLang !== "None") {
    topLangWpm = langWpms[topLang];
    const topLangSessions = sessions.filter(s => s.language === topLang);
    topLangAcc = topLangSessions.reduce((acc, s) => acc + (s.accuracy||0), 0) / topLangSessions.length;
  }
  
  const masteryLevel = Math.min(100, Math.round((topLangWpm / 150) * 100));

  // WPM calculations
  const avgWpm = sessions.length ? Math.round(sessions.reduce((a, b) => a + (b.wpm || 0), 0) / sessions.length) : 0;
  
  // Daily Streak Simulation
  let currentStreak = 0;
  if (sessions.length > 0) {
    const dates = [...new Set(sessions.map(s => {
      const dt = s.timestamp?.toDate ? s.timestamp.toDate() : new Date();
      return dt.toISOString().split('T')[0];
    }))].sort((a,b) => new Date(b) - new Date(a));
    
    let checkDate = new Date();
    checkDate.setHours(0,0,0,0);
    for (let i = 0; i < dates.length; i++) {
        const d = new Date(dates[i]);
        d.setHours(0,0,0,0);
        const diff = (checkDate - d) / (1000 * 60 * 60 * 24);
        if (diff === 0 || diff === 1) {
            currentStreak++;
            checkDate = d;
        } else if (diff > 1 && currentStreak > 0) {
            break;
        } else if (diff > 1 && currentStreak === 0) {
            break;
        }
    }
  }

  // Level Map
  const getLevel = (sessionsCount) => {
    if (sessionsCount < 10) return "NOVICE I";
    if (sessionsCount < 25) return "ADEPT II";
    if (sessionsCount < 50) return "PRO III";
    if (sessionsCount < 100) return "ELITE IV";
    return "APEX V";
  };
  const currentLevel = getLevel(totalSessions);

  // Heatmap calculation (last 84 days - 12 weeks)
  const heatmapData = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const sessionFreq = {};
  sessions.forEach(s => {
    if (s.timestamp?.toDate) {
      const dateStr = s.timestamp.toDate().toISOString().split('T')[0];
      sessionFreq[dateStr] = (sessionFreq[dateStr] || 0) + 1;
    }
  });

  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    heatmapData.push({
      date: ds,
      count: sessionFreq[ds] || 0
    });
  }

  // Chart data
  const chartData = [...sessions].reverse().slice(-30).map((s, i) => ({
    session: i + 1,
    wpm: s.wpm || 0,
    accuracy: s.accuracy || 0,
    language: s.language,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: t.surface,
          border: `1px solid ${accent}`,
          boxShadow: `0 0 16px ${accent}40`,
          borderRadius: 8,
          padding: "10px 14px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          color: t.text,
        }}>
          {payload.map((p) => (
            <div key={p.name} style={{ color: p.color, fontWeight: "bold" }}>
              WPM: {p.value}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
     return <div style={{ color: t.text, background: t.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Initializing Dashboard...</div>;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        
        .dash-wrap {
          min-height: 100vh;
          background: ${t.bg};
          font-family: 'DM Sans', sans-serif;
          color: ${t.text};
        }
        
        /* Navbar */
        .dash-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          height: 70px;
          border-bottom: 1px solid ${t.border};
          background: ${t.bg};
        }
        .dash-logo-block {
          display: flex;
          flex-direction: column;
        }
        .dash-title {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: ${t.text};
          letter-spacing: -0.5px;
        }
        .dash-subtitle {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: ${t.textMuted};
        }
        
        /* Main Grid */
        .dash-main {
          padding: 40px;
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 2.2fr 1fr;
          gap: 24px;
        }
        
        /* Widgets */
        .widget {
          background: ${t.surface};
          border-radius: 12px;
          border: 1px solid ${t.border};
          padding: 24px;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.2);
        }
        
        .widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: ${t.textMuted};
        }
        
        /* Matrix specific */
        .matrix-wpm {
          font-family: 'Syne', sans-serif;
          font-size: 52px;
          font-weight: 800;
          color: ${accent};
          line-height: 1;
          display: flex;
          align-items: baseline;
          gap: 12px;
        }
        .matrix-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          color: ${t.textMuted};
          font-weight: 500;
        }
        
        /* Zenith specific */
        .zenith-widget {
          border: 1px solid ${accent}40;
          position: relative;
          overflow: hidden;
        }
        .zenith-lang-badge {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: ${accent};
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 20px ${accent}40;
        }
        .zenith-progress-bg {
          height: 6px;
          background: ${t.border};
          border-radius: 3px;
          margin: 12px 0 24px;
          overflow: hidden;
        }
        .zenith-progress-fill {
          height: 100%;
          background: ${accent};
          border-radius: 3px;
          box-shadow: 0 0 10px ${accent};
        }
        
        /* Streak specific */
        .streak-val {
          font-family: 'Syne', sans-serif;
          font-size: 36px;
          font-weight: 800;
          color: ${t.text};
        }
        
        /* Session List */
        .session-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .session-item {
          display: grid;
          grid-template-columns: 1fr auto auto auto;
          align-items: center;
          gap: 20px;
          padding: 16px 0;
          border-bottom: 1px solid ${t.border};
        }
        .session-item:last-child { border-bottom: none; }
        
        .session-title {
          font-size: 14px;
          font-weight: 600;
          color: ${t.text};
        }
        .session-time {
          font-size: 11px;
          color: ${t.textMuted};
          margin-top: 4px;
        }
        .session-badge {
          padding: 4px 10px;
          border-radius: 4px;
          background: ${t.border};
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          color: ${t.textMuted};
          text-transform: uppercase;
        }
        
        .glow-text {
          color: ${accent};
          text-shadow: 0 0 12px ${accent}60;
        }
        
        /* Nav actions */
        .nav-btn {
          background: none;
          border: none;
          color: ${t.textMuted};
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          padding: 8px 16px;
        }
        .nav-btn:hover { color: ${t.text}; }
        .nav-user {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-left: 20px;
        }
      `}</style>

      <div className="dash-wrap">
        <nav className="dash-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src="/logo.jpeg" alt="Codistic Logo" style={{ width: 34, height: 34, borderRadius: 6 }} />
            <div className="dash-logo-block">
              <div className="dash-title">codi<span style={{ color: accent }}>stic</span></div>
              <div className="dash-subtitle">Statistics</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="nav-btn" onClick={onBack}>← Back</button>
            <button className="nav-btn" onClick={() => signOut(auth)}>Sign Out</button>
            <div className="nav-user">
              <div style={{ textAlign: "right", fontSize: 13, fontWeight: 600, color: t.text }}>
                {user.displayName || user.email.split('@')[0]}
              </div>
              <img src={user.photoURL || "/logo.jpeg"} alt="avatar" style={{width: 36, height: 36, borderRadius: 18, border: `1px solid ${t.border}`, objectFit: 'cover'}} />
            </div>
          </div>
        </nav>

        <div className="dash-main">
          {/* Left Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* Performance Matrix */}
            <div className="widget" style={{ paddingBottom: 0 }}>
              <div className="widget-header">
                Performance Matrix
                <div style={{ display: 'flex', gap: 8 }}>
                  <div className="session-badge" style={{ background: t.border }}>{chartData.length} SESS</div>
                </div>
              </div>
              <div style={{ padding: "0 0 30px" }}>
                <div className="matrix-wpm glow-text">
                  {avgWpm} <span className="matrix-sub">Avg WPM</span>
                </div>
              </div>
              
              <div style={{ height: 260, margin: '0 -24px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWpm" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={accent} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={accent} stopOpacity={0} />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid stroke={t.border} vertical={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: t.border, strokeWidth: 1, strokeDasharray: '3 3' }} />
                    <Area 
                      type="monotone" 
                      dataKey="wpm" 
                      stroke={accent} 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorWpm)" 
                      filter="url(#glow)"
                      activeDot={{ r: 6, fill: '#fff', stroke: accent, strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Session Log */}
            <div className="widget">
              <div className="widget-header">
                Recent Sessions
              </div>
              <div className="session-grid">
                {sessions.length > 0 ? sessions.slice(0, 10).map((s) => (
                  <div className="session-item" key={s.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div className="session-badge" style={{ background: 'transparent', border: `1px solid ${t.border}`, padding: 6, borderRadius: 50 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: (isMono ? t.textMuted : LANG_COLORS[s.language]) || accent, boxShadow: `0 0 6px ${(isMono ? t.textMuted : LANG_COLORS[s.language]) || accent}` }} />
                      </div>
                      <div>
                        <div className="session-title">{s.language.charAt(0).toUpperCase() + s.language.slice(1)} {s.length} Source</div>
                        <div className="session-time">{timeAgo(s.timestamp?.toDate ? s.timestamp.toDate() : null)}</div>
                      </div>
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                      {s.wpm} WPM
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", color: '#10B981', fontSize: 12 }}>
                      {s.accuracy}% ACC
                    </div>
                    <div className="session-badge">{s.length.toUpperCase()}</div>
                  </div>
                )) : (
                  <div style={{ padding: 20, textAlign: 'center', color: t.textDim }}>No sessions loaded into buffer.</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* Streak */}
            <div className="widget">
              <div className="widget-header">Daily Streak</div>
              <div className="streak-val">{currentStreak} DAYS</div>
              <div style={{ fontSize: 12, color: t.textDim, fontFamily: "'JetBrains Mono', monospace", marginTop: 8 }}>
                Keep active to maintain status
              </div>
            </div>

            {/* Zenith */}
            <div className="widget zenith-widget">
              <div className="widget-header">Proficiency Zenith</div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div className="zenith-lang-badge">
                  <span style={{ fontFamily: "'JetBrains Mono'", fontWeight: 'bold', fontSize: 24, color: '#000' }}>
                    {(topLang && topLang !== "None") ? topLang.charAt(0).toUpperCase() : "</>"}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: t.text }}>{topLang !== "None" ? topLang.charAt(0).toUpperCase() + topLang.slice(1) : "None"}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, borderTop: `1px solid ${t.border}`, paddingTop: 16 }}>
                <div>
                  <div style={{ fontFamily: "Syne", fontSize: 20, fontWeight: 700, color: t.text }}>{linesCodified.toLocaleString()}</div>
                  <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono'", color: t.textMuted, letterSpacing: 1 }}>LINES CODIFIED</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "Syne", fontSize: 20, fontWeight: 700, color: t.text }}>{topLangAcc.toFixed(1)}%</div>
                  <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono'", color: t.textMuted, letterSpacing: 1 }}>AVG ACCURACY</div>
                </div>
              </div>
            </div>

            {/* Heatmap */}
            <div className="widget">
              <div className="widget-header">Activity Heatmap</div>
              <div style={{ 
                display: 'grid', 
                gridTemplateRows: 'repeat(7, 1fr)', 
                gridAutoFlow: 'column', 
                gap: 4,
                width: '100%'
              }}>
                {heatmapData.map((d) => {
                  let opacity = 0;
                  if (d.count > 0) opacity = 0.3;
                  if (d.count > 2) opacity = 0.6;
                  if (d.count > 4) opacity = 1;
                  
                  return (
                    <div 
                      key={d.date} 
                      title={`${d.date}: ${d.count} sessions`}
                      style={{
                        width: '100%',
                        aspectRatio: '1/1',
                        borderRadius: 3,
                        background: d.count === 0 ? t.border : accent,
                        opacity: d.count === 0 ? 0.3 : opacity,
                        boxShadow: d.count > 4 ? `0 0 8px ${accent}80` : 'none'
                      }} 
                    />
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: t.textMuted, marginTop: 12 }}>
                <span>12 WEEKS AGO</span>
                <span>TODAY</span>
              </div>
            </div>

            {/* Level */}
            <div className="widget" style={{ position: 'relative', overflow: 'hidden' }}>
               <div style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.05, fontSize: 120, fontFamily: 'Syne', fontWeight: 800 }}>★</div>
              <div className="widget-header">Current Level</div>
              <div className="streak-val">{currentLevel}</div>
              <div className="zenith-progress-bg" style={{ marginBottom: 0, marginTop: 16 }}>
                <div className="zenith-progress-fill" style={{ width: `${Math.min(100, (totalSessions % 50) / 50 * 100)}%`, background: '#A855F7', boxShadow: '0 0 10px #A855F7' }} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
