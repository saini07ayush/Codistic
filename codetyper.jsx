import { useState, useEffect, useRef, useCallback } from "react";

const SNIPPETS = {
  javascript: [
    {
      label: "Fibonacci",
      code: `function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconsole.log(fibonacci(10));`,
    },
    {
      label: "Array Filter",
      code: `const numbers = [1, 2, 3, 4, 5, 6, 7, 8];\n\nconst evens = numbers.filter(num => num % 2 === 0);\nconst doubled = evens.map(num => num * 2);\n\nconsole.log(doubled);`,
    },
    {
      label: "Fetch API",
      code: `async function fetchUser(id) {\n  const response = await fetch(\`/api/users/\${id}\`);\n  const data = await response.json();\n  return data;\n}\n\nfetchUser(1).then(user => console.log(user));`,
    },
  ],
  python: [
    {
      label: "List Comprehension",
      code: `numbers = [1, 2, 3, 4, 5, 6, 7, 8]\n\nevens = [n for n in numbers if n % 2 == 0]\nsquared = [n ** 2 for n in evens]\n\nprint(squared)`,
    },
    {
      label: "Decorator",
      code: `def timer(func):\n    import time\n    def wrapper(*args, **kwargs):\n        start = time.time()\n        result = func(*args, **kwargs)\n        end = time.time()\n        print(f"Elapsed: {end - start:.2f}s")\n        return result\n    return wrapper`,
    },
    {
      label: "Class",
      code: `class Stack:\n    def __init__(self):\n        self.items = []\n\n    def push(self, item):\n        self.items.append(item)\n\n    def pop(self):\n        return self.items.pop()\n\n    def is_empty(self):\n        return len(self.items) == 0`,
    },
  ],
  css: [
    {
      label: "Flexbox Center",
      code: `.container {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n  background: #0a0a0a;\n}\n\n.box {\n  padding: 2rem;\n  border-radius: 8px;\n  background: #1a1a1a;\n}`,
    },
    {
      label: "CSS Animation",
      code: `@keyframes slideIn {\n  from {\n    opacity: 0;\n    transform: translateY(-20px);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n\n.element {\n  animation: slideIn 0.3s ease forwards;\n}`,
    },
  ],
};

const LANGUAGES = Object.keys(SNIPPETS);

function getRandomSnippet(lang) {
  const list = SNIPPETS[lang];
  return list[Math.floor(Math.random() * list.length)];
}

function calculateWPM(correctChars, elapsedSeconds) {
  if (elapsedSeconds === 0) return 0;
  const words = correctChars / 5;
  const minutes = elapsedSeconds / 60;
  return Math.round(words / minutes);
}

function calculateAccuracy(correct, total) {
  if (total === 0) return 100;
  return Math.round((correct / total) * 100);
}

// Syntax-aware character rendering
function CharDisplay({ char, status }) {
  const colorMap = {
    correct: "#4ade80",
    incorrect: "#f87171",
    current: "#facc15",
    pending: "#4a5568",
  };
  const bgMap = {
    current: "rgba(250,204,21,0.15)",
    incorrect: "rgba(248,113,113,0.15)",
  };

  const isNewline = char === "\n";

  return (
    <span
      style={{
        color: colorMap[status],
        backgroundColor: bgMap[status] || "transparent",
        borderBottom: status === "current" ? "2px solid #facc15" : "none",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: "15px",
        lineHeight: "1.8",
        whiteSpace: "pre",
        transition: "color 0.08s ease",
        borderRadius: "2px",
      }}
    >
      {isNewline ? (status === "current" ? "↵\n" : "\n") : char}
    </span>
  );
}

export default function CodeTyper() {
  const [language, setLanguage] = useState("javascript");
  const [snippet, setSnippet] = useState(() => getRandomSnippet("javascript"));
  const [typed, setTyped] = useState("");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [errors, setErrors] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [screen, setScreen] = useState("home"); // home | game | result
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const code = snippet.code;

  // Timer
  useEffect(() => {
    if (started && !finished) {
      timerRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [started, finished]);

  // Auto focus
  useEffect(() => {
    if (screen === "game") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [screen]);

  const handleChange = useCallback(
    (e) => {
      const value = e.target.value;
      if (finished) return;

      if (!started && value.length > 0) setStarted(true);

      setTotalKeystrokes((k) => k + 1);

      // Count errors on this keystroke
      const newCharIndex = value.length - 1;
      if (newCharIndex >= 0 && value[newCharIndex] !== code[newCharIndex]) {
        setErrors((err) => err + 1);
      }

      setTyped(value);

      if (value === code) {
        setFinished(true);
        clearInterval(timerRef.current);
        setScreen("result");
      }
    },
    [code, started, finished]
  );

  const correctChars = typed
    .split("")
    .filter((c, i) => c === code[i]).length;

  const wpm = calculateWPM(correctChars, elapsed);
  const accuracy = calculateAccuracy(correctChars, typed.length);

  const reset = (newLang) => {
    const lang = newLang || language;
    const newSnippet = getRandomSnippet(lang);
    setLanguage(lang);
    setSnippet(newSnippet);
    setTyped("");
    setStarted(false);
    setFinished(false);
    setElapsed(0);
    setErrors(0);
    setTotalKeystrokes(0);
    setScreen("game");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // ───────── HOME SCREEN ─────────
  if (screen === "home") {
    return (
      <div style={styles.root}>
        <style>{globalStyles}</style>
        <div style={styles.homeWrap}>
          <div style={styles.glowOrb} />
          <div style={styles.homeContent}>
            <div style={styles.badge}>v1.0 — BETA</div>
            <h1 style={styles.homeTitle}>
              <span style={styles.titleAccent}>Code</span>Type
            </h1>
            <p style={styles.homeSubtitle}>
              Build muscle memory for real code.<br />
              Type faster. Think clearer. Ship better.
            </p>

            <div style={styles.langGrid}>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  style={styles.langCard}
                  className="lang-card"
                  onClick={() => {
                    setLanguage(lang);
                    reset(lang);
                  }}
                >
                  <span style={styles.langIcon}>{langIcons[lang]}</span>
                  <span style={styles.langName}>{lang}</span>
                  <span style={styles.langCount}>
                    {SNIPPETS[lang].length} snippets
                  </span>
                </button>
              ))}
            </div>

            <div style={styles.homeStats}>
              <div style={styles.homeStat}>
                <span style={styles.homeStatNum}>
                  {Object.values(SNIPPETS).flat().length}
                </span>
                <span style={styles.homeStatLabel}>Snippets</span>
              </div>
              <div style={styles.homeStatDivider} />
              <div style={styles.homeStat}>
                <span style={styles.homeStatNum}>{LANGUAGES.length}</span>
                <span style={styles.homeStatLabel}>Languages</span>
              </div>
              <div style={styles.homeStatDivider} />
              <div style={styles.homeStat}>
                <span style={styles.homeStatNum}>∞</span>
                <span style={styles.homeStatLabel}>Practice</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───────── RESULT SCREEN ─────────
  if (screen === "result") {
    const grade =
      wpm >= 80 && accuracy >= 95
        ? "S"
        : wpm >= 60 && accuracy >= 90
        ? "A"
        : wpm >= 40 && accuracy >= 80
        ? "B"
        : wpm >= 20
        ? "C"
        : "D";

    const gradeColors = {
      S: "#facc15",
      A: "#4ade80",
      B: "#60a5fa",
      C: "#fb923c",
      D: "#f87171",
    };

    return (
      <div style={styles.root}>
        <style>{globalStyles}</style>
        <div style={styles.resultWrap}>
          <div style={styles.resultCard}>
            <div style={{ ...styles.gradeBadge, color: gradeColors[grade] }}>
              {grade}
            </div>
            <h2 style={styles.resultTitle}>Session Complete</h2>
            <p style={styles.resultSnippet}>
              {snippet.label} · {language}
            </p>

            <div style={styles.statsRow}>
              <StatBox label="WPM" value={wpm} color="#4ade80" />
              <StatBox label="Accuracy" value={`${accuracy}%`} color="#60a5fa" />
              <StatBox label="Time" value={formatTime(elapsed)} color="#facc15" />
              <StatBox label="Errors" value={errors} color="#f87171" />
            </div>

            <div style={styles.resultActions}>
              <button
                style={styles.btnPrimary}
                className="btn-primary"
                onClick={() => reset()}
              >
                Try Again →
              </button>
              <button
                style={styles.btnSecondary}
                className="btn-secondary"
                onClick={() => setScreen("home")}
              >
                Change Language
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───────── GAME SCREEN ─────────
  const progress = Math.round((typed.length / code.length) * 100);

  return (
    <div style={styles.root} onClick={() => inputRef.current?.focus()}>
      <style>{globalStyles}</style>

      {/* Header */}
      <div style={styles.header}>
        <button
          style={styles.backBtn}
          className="back-btn"
          onClick={() => setScreen("home")}
        >
          ← Home
        </button>
        <div style={styles.headerTitle}>
          <span style={styles.titleAccent}>Code</span>Type
        </div>
        <div style={styles.langTag}>{language}</div>
      </div>

      {/* Stats bar */}
      <div style={styles.statsBar}>
        <StatPill label="WPM" value={started ? wpm : "—"} color="#4ade80" />
        <StatPill
          label="ACC"
          value={started ? `${accuracy}%` : "—"}
          color="#60a5fa"
        />
        <StatPill
          label="TIME"
          value={started ? formatTime(elapsed) : "0:00"}
          color="#facc15"
        />
        <StatPill label="ERR" value={errors} color="#f87171" />
      </div>

      {/* Progress bar */}
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>

      {/* Code display */}
      <div style={styles.codeCard}>
        <div style={styles.codeHeader}>
          <div style={styles.dots}>
            <span style={{ ...styles.dot, background: "#f87171" }} />
            <span style={{ ...styles.dot, background: "#facc15" }} />
            <span style={{ ...styles.dot, background: "#4ade80" }} />
          </div>
          <span style={styles.snippetLabel}>{snippet.label}</span>
        </div>

        <div style={styles.codeBody}>
          {code.split("").map((char, i) => {
            let status = "pending";
            if (i < typed.length) {
              status = typed[i] === char ? "correct" : "incorrect";
            } else if (i === typed.length) {
              status = "current";
            }
            return <CharDisplay key={i} char={char} status={status} />;
          })}
        </div>

        {!started && (
          <div style={styles.startHint}>
            Start typing to begin the timer ↑
          </div>
        )}
      </div>

      {/* Hidden input */}
      <textarea
        ref={inputRef}
        value={typed}
        onChange={handleChange}
        style={styles.hiddenInput}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
      />

      {/* New snippet button */}
      <div style={styles.footer}>
        <button
          style={styles.newBtn}
          className="btn-secondary"
          onClick={() => reset()}
        >
          ↻ New Snippet
        </button>
        <span style={styles.footerHint}>Click anywhere to focus</span>
      </div>
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={styles.statPill}>
      <span style={{ ...styles.statPillValue, color }}>{value}</span>
      <span style={styles.statPillLabel}>{label}</span>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={styles.statBox}>
      <span style={{ ...styles.statBoxValue, color }}>{value}</span>
      <span style={styles.statBoxLabel}>{label}</span>
    </div>
  );
}

const langIcons = {
  javascript: "JS",
  python: "PY",
  css: "CSS",
};

// ───────── STYLES ─────────
const styles = {
  root: {
    minHeight: "100vh",
    background: "#080c10",
    color: "#e2e8f0",
    fontFamily: "'JetBrains Mono', monospace",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
  },

  // HOME
  homeWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    position: "relative",
  },
  glowOrb: {
    position: "absolute",
    width: "600px",
    height: "600px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(74,222,128,0.06) 0%, transparent 70%)",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
  homeContent: {
    textAlign: "center",
    maxWidth: "600px",
    position: "relative",
    zIndex: 1,
  },
  badge: {
    display: "inline-block",
    fontSize: "10px",
    letterSpacing: "3px",
    color: "#4ade80",
    border: "1px solid rgba(74,222,128,0.3)",
    borderRadius: "20px",
    padding: "4px 12px",
    marginBottom: "1.5rem",
    textTransform: "uppercase",
  },
  homeTitle: {
    fontSize: "clamp(3rem, 10vw, 6rem)",
    fontWeight: "800",
    letterSpacing: "-2px",
    margin: "0 0 1rem",
    lineHeight: 1,
    color: "#f1f5f9",
  },
  titleAccent: {
    color: "#4ade80",
  },
  homeSubtitle: {
    fontSize: "1rem",
    color: "#64748b",
    lineHeight: "1.8",
    marginBottom: "3rem",
    fontFamily: "system-ui, sans-serif",
  },
  langGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1rem",
    marginBottom: "3rem",
  },
  langCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "1.5rem 1rem",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    transition: "all 0.2s ease",
    color: "#e2e8f0",
  },
  langIcon: {
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "1px",
    color: "#4ade80",
    background: "rgba(74,222,128,0.1)",
    borderRadius: "6px",
    padding: "4px 8px",
  },
  langName: {
    fontSize: "14px",
    fontWeight: "600",
    textTransform: "capitalize",
    color: "#f1f5f9",
    fontFamily: "system-ui, sans-serif",
  },
  langCount: {
    fontSize: "11px",
    color: "#475569",
    fontFamily: "system-ui, sans-serif",
  },
  homeStats: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "2rem",
  },
  homeStat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
  },
  homeStatNum: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#f1f5f9",
  },
  homeStatLabel: {
    fontSize: "11px",
    color: "#475569",
    letterSpacing: "2px",
    textTransform: "uppercase",
    fontFamily: "system-ui, sans-serif",
  },
  homeStatDivider: {
    width: "1px",
    height: "30px",
    background: "rgba(255,255,255,0.1)",
  },

  // HEADER
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 2rem",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#475569",
    cursor: "pointer",
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "1px",
    padding: "4px 8px",
    transition: "color 0.2s",
  },
  headerTitle: {
    fontSize: "1.2rem",
    fontWeight: "700",
    letterSpacing: "-0.5px",
    color: "#f1f5f9",
  },
  langTag: {
    fontSize: "11px",
    letterSpacing: "2px",
    textTransform: "uppercase",
    color: "#4ade80",
    border: "1px solid rgba(74,222,128,0.3)",
    borderRadius: "20px",
    padding: "3px 10px",
  },

  // STATS BAR
  statsBar: {
    display: "flex",
    justifyContent: "center",
    gap: "2rem",
    padding: "1.2rem 2rem",
  },
  statPill: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
  },
  statPillValue: {
    fontSize: "1.4rem",
    fontWeight: "700",
    lineHeight: 1,
  },
  statPillLabel: {
    fontSize: "10px",
    color: "#475569",
    letterSpacing: "2px",
  },

  // PROGRESS
  progressTrack: {
    height: "2px",
    background: "rgba(255,255,255,0.06)",
    margin: "0 2rem",
    borderRadius: "2px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #4ade80, #60a5fa)",
    borderRadius: "2px",
    transition: "width 0.15s ease",
  },

  // CODE CARD
  codeCard: {
    margin: "1.5rem 2rem",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "12px",
    overflow: "hidden",
    flex: 1,
    cursor: "text",
  },
  codeHeader: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "0.75rem 1.2rem",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.02)",
  },
  dots: {
    display: "flex",
    gap: "6px",
  },
  dot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    opacity: 0.7,
  },
  snippetLabel: {
    fontSize: "12px",
    color: "#475569",
    letterSpacing: "1px",
    fontFamily: "system-ui, sans-serif",
  },
  codeBody: {
    padding: "1.5rem",
    minHeight: "200px",
    lineHeight: "1.8",
  },
  startHint: {
    textAlign: "center",
    padding: "1rem",
    fontSize: "12px",
    color: "#334155",
    letterSpacing: "1px",
    borderTop: "1px solid rgba(255,255,255,0.04)",
  },

  // HIDDEN INPUT
  hiddenInput: {
    position: "fixed",
    opacity: 0,
    pointerEvents: "none",
    top: 0,
    left: 0,
    width: "1px",
    height: "1px",
  },

  // FOOTER
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1.5rem",
    padding: "1rem 2rem 1.5rem",
  },
  newBtn: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', monospace",
    padding: "8px 18px",
    borderRadius: "8px",
    transition: "all 0.2s",
    letterSpacing: "0.5px",
  },
  footerHint: {
    fontSize: "11px",
    color: "#1e293b",
    fontFamily: "system-ui, sans-serif",
  },

  // RESULT
  resultWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
  },
  resultCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
    padding: "3rem",
    textAlign: "center",
    maxWidth: "500px",
    width: "100%",
  },
  gradeBadge: {
    fontSize: "5rem",
    fontWeight: "900",
    lineHeight: 1,
    marginBottom: "0.5rem",
    letterSpacing: "-2px",
  },
  resultTitle: {
    fontSize: "1.2rem",
    fontWeight: "600",
    color: "#f1f5f9",
    margin: "0 0 0.5rem",
    fontFamily: "system-ui, sans-serif",
  },
  resultSnippet: {
    fontSize: "12px",
    color: "#475569",
    letterSpacing: "1px",
    marginBottom: "2.5rem",
    textTransform: "uppercase",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "1rem",
    marginBottom: "2.5rem",
  },
  statBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    background: "rgba(255,255,255,0.03)",
    borderRadius: "10px",
    padding: "1rem 0.5rem",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  statBoxValue: {
    fontSize: "1.5rem",
    fontWeight: "700",
  },
  statBoxLabel: {
    fontSize: "10px",
    color: "#475569",
    letterSpacing: "2px",
    fontFamily: "system-ui, sans-serif",
  },
  resultActions: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
  },
  btnPrimary: {
    background: "#4ade80",
    border: "none",
    color: "#080c10",
    cursor: "pointer",
    fontSize: "14px",
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: "700",
    padding: "12px 24px",
    borderRadius: "10px",
    transition: "all 0.2s",
    letterSpacing: "0.5px",
  },
  btnSecondary: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', monospace",
    padding: "12px 20px",
    borderRadius: "10px",
    transition: "all 0.2s",
  },
};

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080c10; }

  .lang-card:hover {
    background: rgba(74,222,128,0.06) !important;
    border-color: rgba(74,222,128,0.3) !important;
    transform: translateY(-2px);
  }
  .btn-primary:hover {
    background: #86efac !important;
    transform: translateY(-1px);
  }
  .btn-secondary:hover {
    border-color: rgba(255,255,255,0.25) !important;
    color: #e2e8f0 !important;
  }
  .back-btn:hover { color: #94a3b8 !important; }
`;
