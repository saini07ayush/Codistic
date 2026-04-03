import { useState, useEffect, useRef, useCallback } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { getSnippet } from "./services/githubSnippets";
import { THEMES, THEME_ACCENTS } from "./themes";
import AuthPage from "./AuthPage";
import ProfilePage from "./ProfilePage";

const LANGUAGES = ["python", "javascript", "java", "cpp", "go", "rust"];
const LENGTHS = ["short", "medium"];

const LANG_COLORS = {
  python: "#3B82F6",
  javascript: "#F59E0B",
  java: "#EF4444",
  cpp: "#8B5CF6",
  go: "#06B6D4",
  rust: "#F97316",
};

export default function CodeTyper() {
  const [paused, setPaused] = useState(false);
  const [language, setLanguage] = useState("python");
  const [length, setLength] = useState("short");
  const [snippet, setSnippet] = useState(null);
  const [typed, setTyped] = useState("");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cursorPos, setCursorPos] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [themeName, setThemeName] = useState(() => {
    return localStorage.getItem("codistic-theme") || "dark";
  });
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const timerRef = useRef(null);
  const theme = THEMES[themeName];
  const accent = LANG_COLORS[language] || THEME_ACCENTS[themeName];
  const t = theme;
  useEffect(() => {
    localStorage.setItem("codistic-theme", themeName);
  }, [themeName]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return unsub;
  }, []);

  const loadSnippet = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTyped("");
    setStarted(false);
    setFinished(false);
    setWpm(0);
    setAccuracy(100);
    setElapsed(0);
    setCursorPos(0);
    clearInterval(timerRef.current);
    try {
      const data = await getSnippet(language, length);
      setSnippet(data);
    } catch (e) {
      setError("Failed to load snippet. Check your GitHub token or connection.");
    } finally {
      setLoading(false);
    }
  }, [language, length]);

  useEffect(() => { loadSnippet(); }, [loadSnippet]);

  useEffect(() => {
    if (started && !finished && !paused) {
      timerRef.current = setInterval(() => {
        setElapsed(((Date.now() - startTime) / 1000).toFixed(1));
      }, 100);
    }
    return () => clearInterval(timerRef.current);
  }, [started, finished, startTime, paused]);
  useEffect(() => {
    if (finished && user && snippet) {
      addDoc(collection(db, "users", user.uid, "sessions"), {
        wpm,
        accuracy,
        elapsed: parseFloat(elapsed),
        language,
        length,
        file: snippet.file,
        source: snippet.source,
        timestamp: serverTimestamp(),
      }).catch(console.error);
    }
  }, [finished]);

  const handleKeyDown = useCallback((e) => {
    if (finished || !snippet || showAuth || showProfile || showThemePicker || paused) return;
    if (e.key === "Tab") {
      e.preventDefault();
      if (!started) { setStarted(true); setStartTime(Date.now()); }
      const newTyped = typed + "    ";
      setTyped(newTyped);
      setCursorPos(newTyped.length);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (!started) { setStarted(true); setStartTime(Date.now()); }
      const newTyped = typed + "\n";
      setTyped(newTyped);
      setCursorPos(newTyped.length);
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      const newTyped = typed.slice(0, -1);
      setTyped(newTyped);
      setCursorPos(newTyped.length);
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      if (!started) { setStarted(true); setStartTime(Date.now()); }
      const newTyped = typed + e.key;
      setTyped(newTyped);
      setCursorPos(newTyped.length);
      let correct = 0;
      for (let i = 0; i < newTyped.length; i++) {
        if (newTyped[i] === snippet.code[i]) correct++;
      }
      setAccuracy(Math.round((correct / newTyped.length) * 100));
      if (newTyped.length >= snippet.code.length) {
        setFinished(true);
        clearInterval(timerRef.current);
        const timeTaken = (Date.now() - startTime) / 1000 / 60;
        const words = snippet.code.split(/\s+/).length;
        setWpm(Math.round(words / timeTaken));
      }
    }
  }, [typed, started, finished, snippet, startTime, showAuth, showProfile, showThemePicker]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const renderCode = () => {
    if (!snippet) return null;
    return snippet.code.split("").map((char, i) => {
      let cls = "char-untyped";
      if (i < typed.length) cls = typed[i] === char ? "char-correct" : "char-wrong";
      const isCursor = i === cursorPos;
      return (
        <span key={i} className={cls} style={{ position: "relative" }}>
          {isCursor && <span className="cursor-blink" style={{ background: accent }} />}
          {char}
        </span>
      );
    });
  };

  if (!authChecked) return null;
  if (showAuth) return <AuthPage theme={t} accent={accent} onBack={() => setShowAuth(false)} />;
  if (showProfile && user) return (
    <ProfilePage user={user} theme={t} accent={accent} onBack={() => setShowProfile(false)} />
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${t.bg}; color: ${t.text}; font-family: 'DM Sans', sans-serif; min-height: 100vh; }
        .app { min-height: 100vh; display: flex; flex-direction: column; background: ${t.bg}; position: relative; }
        .app::before {
          content: ''; position: fixed; inset: 0;
          background-image: linear-gradient(${t.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${t.gridLine} 1px, transparent 1px);
          background-size: 48px 48px; pointer-events: none; z-index: 0;
        }
        .glow-orb { position: fixed; width: 600px; height: 600px; border-radius: 50%; filter: blur(120px); opacity: 0.06; pointer-events: none; z-index: 0; background: ${accent}; top: -200px; left: 20%; transition: background 0.6s; }
        nav { position: relative; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 0 48px; height: 64px; border-bottom: 1px solid ${t.border}; backdrop-filter: blur(12px); background: ${t.navBg}; }
        .nav-logo { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: ${t.text}; }
        .nav-logo span { color: ${accent}; }
        .nav-center { display: flex; align-items: center; gap: 16px; }
        .nav-right { display: flex; align-items: center; gap: 10px; }
        .nav-stat { display: flex; flex-direction: column; align-items: flex-end; }
        .nav-stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: ${t.textMuted}; font-weight: 500; }
        .nav-stat-value { font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 500; color: ${t.text}; }
        .btn-nav { padding: 7px 14px; border-radius: 8px; border: 1px solid ${t.border}; background: transparent; color: ${t.textMuted}; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        .btn-nav:hover { color: ${t.text}; border-color: ${t.text}; }
        .btn-nav-accent { padding: 7px 14px; border-radius: 8px; border: none; background: ${accent}; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
        .btn-nav-accent:hover { opacity: 0.85; }
        main { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; align-items: center; padding: 48px 24px; gap: 24px; }
        .controls { display: flex; align-items: center; gap: 8px; padding: 6px; background: ${t.surfaceAlt}; border: 1px solid ${t.border}; border-radius: 12px; }
        .ctrl-group { display: flex; gap: 4px; }
        .ctrl-btn { padding: 7px 14px; border-radius: 8px; border: none; background: transparent; color: ${t.textMuted}; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 6px; }
        .ctrl-btn:hover { color: ${t.text}; background: ${t.border}; }
        .ctrl-btn.active { background: ${t.border}; color: ${t.text}; }
        .ctrl-divider { width: 1px; height: 24px; background: ${t.border}; margin: 0 4px; }
        .ctrl-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .reload-btn { padding: 8px 12px; border-radius: 8px; border: 1px solid ${t.border}; background: transparent; color: ${t.textMuted}; font-family: 'JetBrains Mono', monospace; font-size: 12px; cursor: pointer; transition: all 0.15s; }
        .reload-btn:hover { color: ${t.text}; border-color: ${t.text}; }
        .progress-bar-wrap { width: 100%; max-width: 860px; height: 2px; background: ${t.borderSubtle}; border-radius: 2px; overflow: hidden; }
        .progress-bar-fill { height: 100%; border-radius: 2px; transition: width 0.1s linear; }
        .editor-wrap { width: 100%; max-width: 860px; border-radius: 16px; overflow: hidden; border: 1px solid ${t.border}; background: ${t.surface}; box-shadow: 0 24px 80px rgba(0,0,0,0.3); }
        .editor-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: ${t.surfaceAlt}; border-bottom: 1px solid ${t.border}; }
        .editor-dots { display: flex; gap: 6px; }
        .editor-dot { width: 11px; height: 11px; border-radius: 50%; }
        .editor-filename { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: ${t.textMuted}; }
        .editor-source { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: ${t.textDim}; }
        .editor-body { padding: 28px 32px; min-height: 280px; display: flex; align-items: flex-start; justify-content: flex-start; cursor: text; overflow-x: auto; width: 100%; }
        .line-numbers { display: flex; flex-direction: column; align-items: flex-end; margin-right: 24px; user-select: none; flex-shrink: 0; }
        .line-num { font-family: 'JetBrains Mono', monospace; font-size: 14px; line-height: 1.7; color: ${t.textDim}; min-width: 20px; text-align: right; }
        .code-display { font-family: 'JetBrains Mono', monospace; font-size: 14px; line-height: 1.7; white-space: pre; flex: 1; min-width: 0; width: 100%; text-align: left; outline: none; tab-size: 4; display: block; }
        .char-untyped { color: ${t.textDim}; }
        .char-correct { color: ${t.correct}; }
        .char-wrong { color: ${t.wrong}; background: ${t.wrongBg}; border-radius: 2px; }
        .cursor-blink { position: absolute; left: 0; top: 1px; width: 2px; height: 1.1em; border-radius: 1px; animation: blink 1s step-end infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px; color: ${t.textMuted}; width: 100%; }
        .spinner { width: 28px; height: 28px; border: 2px solid ${t.border}; border-top-color: ${accent}; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-text { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
        .hint { font-size: 12px; color: ${t.textDim}; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.3px; text-align: center; }
        .stats-bar { display: flex; gap: 8px; width: 100%; max-width: 860px; }
        .stat-card { flex: 1; padding: 16px 20px; background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; display: flex; flex-direction: column; gap: 4px; }
        .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: ${t.textMuted}; font-weight: 500; }
        .stat-value { font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 500; color: ${t.text}; line-height: 1; }
        .stat-unit { font-size: 11px; color: ${t.textMuted}; }
        .theme-picker-wrap { position: relative; }
        .theme-picker-dropdown { position: absolute; top: calc(100% + 8px); right: 0; background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 12px; padding: 8px; display: flex; flex-direction: column; gap: 2px; min-width: 160px; z-index: 100; box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
        .theme-option { padding: 8px 12px; border-radius: 8px; border: none; background: transparent; color: ${t.textMuted}; font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.1s; text-align: left; display: flex; align-items: center; gap: 10px; }
        .theme-option:hover { background: ${t.surfaceAlt}; color: ${t.text}; }
        .theme-option.active { color: ${t.text}; background: ${t.surfaceAlt}; }
        .theme-swatch { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
        .results-overlay { position: fixed; inset: 0; background: ${t.overlay}; backdrop-filter: blur(16px); z-index: 100; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .results-card { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 20px; padding: 48px; width: 480px; display: flex; flex-direction: column; gap: 32px; animation: slideUp 0.35s cubic-bezier(0.16,1,0.3,1); }
        @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        .results-title { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; color: ${t.text}; letter-spacing: -0.5px; }
        .results-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .result-item { background: ${t.surfaceAlt}; border-radius: 12px; padding: 16px 20px; display: flex; flex-direction: column; gap: 6px; }
        .result-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: ${t.textMuted}; }
        .result-value { font-family: 'JetBrains Mono', monospace; font-size: 32px; font-weight: 500; color: ${t.text}; line-height: 1; }
        .result-unit { font-size: 12px; color: ${t.textMuted}; }
        .results-actions { display: flex; gap: 10px; }
        .btn-primary { flex: 1; padding: 12px 20px; border-radius: 10px; border: none; background: ${accent}; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
        .btn-primary:hover { opacity: 0.85; }
        .btn-secondary { flex: 1; padding: 12px 20px; border-radius: 10px; border: 1px solid ${t.border}; background: transparent; color: ${t.textMuted}; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        .btn-secondary:hover { background: ${t.surfaceAlt}; color: ${t.text}; }
      `}</style>

      <div className="app">
        <div className="glow-orb" />

        <nav>
          <div className="nav-logo">codi<span>stic</span></div>
          <div className="nav-center">
            <div className="nav-stat">
              <span className="nav-stat-label">WPM</span>
              <span className="nav-stat-value" style={{ color: started ? accent : t.textMuted }}>{started ? wpm || "—" : "—"}</span>
            </div>
            <div className="nav-stat">
              <span className="nav-stat-label">Accuracy</span>
              <span className="nav-stat-value">{started ? `${accuracy}%` : "—"}</span>
            </div>
            <div className="nav-stat">
              <span className="nav-stat-label">Time</span>
              <span className="nav-stat-value">{started ? `${elapsed}s` : "—"}</span>
            </div>
          </div>
          <div className="nav-right">
            <div className="theme-picker-wrap">
              <button className="btn-nav" onClick={() => setShowThemePicker((p) => !p)}>Theme</button>
              {showThemePicker && (
                <div className="theme-picker-dropdown">
                  {Object.entries(THEMES).map(([key, val]) => (
                    <button
                      key={key}
                      className={`theme-option ${themeName === key ? "active" : ""}`}
                      onClick={() => { setThemeName(key); setShowThemePicker(false); }}
                    >
                      <div className="theme-swatch" style={{ background: THEME_ACCENTS[key] }} />
                      {val.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {user ? (
              <>
                <button className="btn-nav" onClick={() => setShowProfile(true)}>Profile</button>
                <button className="btn-nav" onClick={() => signOut(auth)}>Sign Out</button>
              </>
            ) : (
              <button className="btn-nav-accent" onClick={() => setShowAuth(true)}>Sign In</button>
            )}
          </div>
        </nav>

        <main onClick={() => setShowThemePicker(false)}>
          <div className="controls">
            <div className="ctrl-group">
              {LANGUAGES.map((lang) => (
                <button key={lang} className={`ctrl-btn ${language === lang ? "active" : ""}`} onClick={() => setLanguage(lang)}>
                  <span className="ctrl-dot" style={{ background: LANG_COLORS[lang] }} />
                  {lang}
                </button>
              ))}
            </div>
            <div className="ctrl-divider" />
            <div className="ctrl-group">
              {LENGTHS.map((l) => (
                <button key={l} className={`ctrl-btn ${length === l ? "active" : ""}`} onClick={() => setLength(l)}>
                  {l === "short" ? "~10 lines" : "~25 lines"}
                </button>
              ))}
            </div>
            <div className="ctrl-divider" />
            <button className="reload-btn" onClick={loadSnippet}>↺ new</button>
            {started && !finished && (
              <button className="reload-btn" onClick={() => setPaused(p => !p)}>
                {paused ? "▶ resume" : "⏸ pause"}
              </button>
            )}          </div>

          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: snippet ? `${(typed.length / snippet.code.length) * 100}%` : "0%", background: accent }} />
          </div>

          <div className="editor-wrap">
            <div className="editor-header">
              <div className="editor-dots">
                <div className="editor-dot" style={{ background: "#FF5F57" }} />
                <div className="editor-dot" style={{ background: "#FEBC2E" }} />
                <div className="editor-dot" style={{ background: "#28C840" }} />
              </div>
              <span className="editor-filename">{snippet ? snippet.file : "loading..."}</span>
              <span className="editor-source">{snippet ? snippet.source : ""}</span>
            </div>
            <div className="editor-body">
              {loading ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <span className="loading-text">fetching from github...</span>
                </div>
              ) : error ? (
                <div className="loading-state" style={{ color: t.wrong }}>
                  <span>⚠ {error}</span>
                  <button className="btn-secondary" onClick={loadSnippet} style={{ marginTop: 8 }}>retry</button>
                </div>
              ) : snippet ? (
                <>
                  <div className="line-numbers">
                    {snippet.code.split("\n").map((_, i) => (
                      <span key={i} className="line-num">{i + 1}</span>
                    ))}
                  </div>
                  <div className="code-display">
                    {renderCode()}
                    {cursorPos >= (snippet?.code?.length || 0) && (
                      <span style={{ position: "relative" }}>
                        <span className="cursor-blink" style={{ background: accent }} />
                      </span>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="stats-bar">
            {[
              { label: "WPM", value: wpm || 0, unit: "words/min" },
              { label: "Accuracy", value: `${accuracy}`, unit: "percent" },
              { label: "Time", value: elapsed, unit: "seconds" },
              { label: "Progress", value: snippet ? Math.round((typed.length / snippet.code.length) * 100) : 0, unit: "percent" },
            ].map((s) => (
              <div className="stat-card" key={s.label}>
                <span className="stat-label">{s.label}</span>
                <span className="stat-value" style={{ color: started && s.label === "WPM" ? accent : undefined }}>{s.value}</span>
                <span className="stat-unit">{s.unit}</span>
              </div>
            ))}
          </div>

          {!started && !loading && <p className="hint">start typing to begin — tab for indentation</p>}
        </main>

        {finished && (
          <div className="results-overlay">
            <div className="results-card">
              <div>
                <div className="results-title">Session Complete</div>
                <p style={{ color: t.textMuted, fontSize: 14, marginTop: 6, fontFamily: "'DM Sans'" }}>
                  {snippet?.file} · {snippet?.source}
                </p>
                {!user && (
                  <p style={{ color: accent, fontSize: 13, marginTop: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                    sign in to save your stats →
                  </p>
                )}
              </div>
              <div className="results-grid">
                <div className="result-item">
                  <span className="result-label">WPM</span>
                  <span className="result-value" style={{ color: accent }}>{wpm}</span>
                  <span className="result-unit">words per minute</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Accuracy</span>
                  <span className="result-value">{accuracy}%</span>
                  <span className="result-unit">characters correct</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Time</span>
                  <span className="result-value">{elapsed}s</span>
                  <span className="result-unit">total duration</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Language</span>
                  <span className="result-value" style={{ fontSize: 22 }}>{language}</span>
                  <span className="result-unit">{length} snippet</span>
                </div>
              </div>
              <div className="results-actions">
                <button className="btn-primary" onClick={loadSnippet}>Next Snippet</button>
                <button className="btn-secondary" onClick={() => { setTyped(""); setStarted(false); setFinished(false); setWpm(0); setAccuracy(100); setElapsed(0); setCursorPos(0); }}>
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
