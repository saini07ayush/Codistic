import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
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

export default function ProfilePage({ user, theme, accent, onBack }) {
  const t = theme;
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const q = query(
          collection(db, "users", user.uid, "sessions"),
          orderBy("timestamp", "desc"),
          limit(50)
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
  const bestWpm = sessions.length ? Math.max(...sessions.map((s) => s.wpm || 0)) : 0;
  const avgWpm = sessions.length
    ? Math.round(sessions.reduce((a, b) => a + (b.wpm || 0), 0) / sessions.length)
    : 0;
  const avgAccuracy = sessions.length
    ? Math.round(sessions.reduce((a, b) => a + (b.accuracy || 0), 0) / sessions.length)
    : 0;

  // Best WPM per language
  const bestPerLang = {};
  sessions.forEach((s) => {
    if (!bestPerLang[s.language] || s.wpm > bestPerLang[s.language]) {
      bestPerLang[s.language] = s.wpm;
    }
  });

  // Chart data — last 20 sessions reversed for chronological order
  const chartData = [...sessions].reverse().slice(-20).map((s, i) => ({
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
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          padding: "10px 14px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          color: t.text,
        }}>
          {payload.map((p) => (
            <div key={p.name} style={{ color: p.color }}>
              {p.name}: {p.value}{p.name === "accuracy" ? "%" : " wpm"}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        .profile-wrap {
          min-height: 100vh;
          background: ${t.bg};
          font-family: 'DM Sans', sans-serif;
          color: ${t.text};
          position: relative;
          overflow-x: hidden;
        }
        .profile-wrap::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(${t.gridLine} 1px, transparent 1px),
            linear-gradient(90deg, ${t.gridLine} 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
          z-index: 0;
        }
        .profile-nav {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 48px;
          height: 64px;
          border-bottom: 1px solid ${t.border};
          backdrop-filter: blur(12px);
          background: ${t.navBg};
        }
        .profile-logo {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: ${t.text};
        }
        .profile-logo span { color: ${accent}; }
        .nav-actions { display: flex; gap: 10px; align-items: center; }
        .btn-ghost {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid ${t.border};
          background: transparent;
          color: ${t.textMuted};
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-ghost:hover { color: ${t.text}; border-color: ${t.text}; }
        .btn-accent {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: ${accent};
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .btn-accent:hover { opacity: 0.85; }
        .profile-content {
          position: relative;
          z-index: 1;
          max-width: 900px;
          margin: 0 auto;
          padding: 48px 24px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        .profile-header {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .profile-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 2px solid ${accent};
          object-fit: cover;
          background: ${t.surfaceAlt};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 700;
          color: ${accent};
          font-family: 'Syne', sans-serif;
          flex-shrink: 0;
        }
        .profile-name {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: ${t.text};
          letter-spacing: -0.3px;
        }
        .profile-email {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: ${t.textMuted};
          margin-top: 2px;
        }
        .section-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: ${t.textMuted};
          font-weight: 500;
          margin-bottom: 12px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .stat-card {
          background: ${t.surface};
          border: 1px solid ${t.border};
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .stat-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: ${t.textMuted};
        }
        .stat-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 28px;
          font-weight: 500;
          color: ${t.text};
          line-height: 1;
        }
        .stat-unit {
          font-size: 11px;
          color: ${t.textMuted};
        }
        .chart-card {
          background: ${t.surface};
          border: 1px solid ${t.border};
          border-radius: 12px;
          padding: 24px;
        }
        .lang-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .lang-card {
          background: ${t.surface};
          border: 1px solid ${t.border};
          border-radius: 10px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .lang-name {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: ${t.text};
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .lang-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .lang-wpm {
          font-family: 'JetBrains Mono', monospace;
          font-size: 18px;
          font-weight: 500;
          color: ${t.text};
        }
        .lang-unit {
          font-size: 10px;
          color: ${t.textMuted};
          text-align: right;
        }
        .empty-state {
          text-align: center;
          padding: 48px;
          color: ${t.textMuted};
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
        }
        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .session-row {
          background: ${t.surface};
          border: 1px solid ${t.border};
          border-radius: 8px;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
        }
        .session-left {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: 'JetBrains Mono', monospace;
          color: ${t.textMuted};
        }
        .session-lang-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }
        .session-wpm {
          font-family: 'JetBrains Mono', monospace;
          font-size: 15px;
          font-weight: 500;
          color: ${t.text};
        }
        .session-acc {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: ${t.textMuted};
        }
      `}</style>

      <div className="profile-wrap">
        <nav className="profile-nav">
          <div className="profile-logo">codi<span>stic</span></div>
          <div className="nav-actions">
            <button className="btn-ghost" onClick={onBack}>← Back</button>
            <button className="btn-ghost" onClick={() => signOut(auth)}>Sign Out</button>
          </div>
        </nav>

        <div className="profile-content">
          {/* Header */}
          <div className="profile-header">
            {user.photoURL ? (
              <img src={user.photoURL} alt="avatar" className="profile-avatar" style={{ display: "flex" }} />
            ) : (
              <div className="profile-avatar">
                {(user.displayName || user.email || "?")[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="profile-name">{user.displayName || "Typist"}</div>
              <div className="profile-email">{user.email}</div>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">loading stats...</div>
          ) : (
            <>
              {/* Overview Stats */}
              <div>
                <div className="section-title">Overview</div>
                <div className="stats-grid">
                  {[
                    { label: "Sessions", value: totalSessions, unit: "total" },
                    { label: "Best WPM", value: bestWpm, unit: "words/min" },
                    { label: "Avg WPM", value: avgWpm, unit: "words/min" },
                    { label: "Avg Accuracy", value: `${avgAccuracy}%`, unit: "characters" },
                  ].map((s) => (
                    <div className="stat-card" key={s.label}>
                      <span className="stat-label">{s.label}</span>
                      <span className="stat-value" style={{ color: s.label === "Best WPM" ? accent : undefined }}>
                        {s.value}
                      </span>
                      <span className="stat-unit">{s.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* WPM History Chart */}
              {chartData.length > 1 && (
                <div>
                  <div className="section-title">WPM History</div>
                  <div className="chart-card">
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid stroke={t.border} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="session"
                          tick={{ fill: t.textMuted, fontSize: 11, fontFamily: "JetBrains Mono" }}
                          axisLine={false}
                          tickLine={false}
                          label={{ value: "Session", position: "insideBottom", offset: -2, fill: t.textMuted, fontSize: 11 }}
                        />
                        <YAxis
                          tick={{ fill: t.textMuted, fontSize: 11, fontFamily: "JetBrains Mono" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="wpm"
                          stroke={accent}
                          strokeWidth={2}
                          dot={{ fill: accent, r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Accuracy Chart */}
              {chartData.length > 1 && (
                <div>
                  <div className="section-title">Accuracy Over Time</div>
                  <div className="chart-card">
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={chartData}>
                        <CartesianGrid stroke={t.border} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="session"
                          tick={{ fill: t.textMuted, fontSize: 11, fontFamily: "JetBrains Mono" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fill: t.textMuted, fontSize: 11, fontFamily: "JetBrains Mono" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="accuracy"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ fill: "#10b981", r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Best per language */}
              {Object.keys(bestPerLang).length > 0 && (
                <div>
                  <div className="section-title">Best WPM by Language</div>
                  <div className="lang-grid">
                    {Object.entries(bestPerLang).map(([lang, wpm]) => (
                      <div className="lang-card" key={lang}>
                        <div className="lang-name">
                          <div className="lang-dot" style={{ background: LANG_COLORS[lang] || accent }} />
                          {lang}
                        </div>
                        <div>
                          <div className="lang-wpm">{wpm}</div>
                          <div className="lang-unit">wpm</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent sessions */}
              {sessions.length > 0 && (
                <div>
                  <div className="section-title">Recent Sessions</div>
                  <div className="sessions-list">
                    {sessions.slice(0, 10).map((s) => (
                      <div className="session-row" key={s.id}>
                        <div className="session-left">
                          <div className="session-lang-dot" style={{ background: LANG_COLORS[s.language] || accent }} />
                          <span>{s.language}</span>
                          <span style={{ color: t.textDim }}>·</span>
                          <span>{s.length}</span>
                          <span style={{ color: t.textDim }}>·</span>
                          <span>{s.timestamp?.toDate?.()?.toLocaleDateString() || "—"}</span>
                        </div>
                        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                          <span className="session-acc">{s.accuracy}%</span>
                          <span className="session-wpm">{s.wpm} wpm</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sessions.length === 0 && (
                <div className="empty-state">
                  no sessions yet — go type some code!
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
