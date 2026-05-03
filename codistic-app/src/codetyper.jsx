import { useState, useEffect, useRef, useCallback } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { getSnippet } from "./services/githubSnippets";
import { THEMES, THEME_ACCENTS } from "./themes";
import AuthPage from "./AuthPage";
import ProfilePage from "./ProfilePage";
import SettingsPage from "./SettingsPage";
import DynamicBackground from "./DynamicBackground";
import VirtualKeyboard from "./VirtualKeyboard";

const LANGUAGES = ["python", "javascript", "java", "cpp", "go", "rust"];
const LENGTHS = ["short", "medium", "long"];

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
  const [fontFamily, setFontFamily] = useState(() => {
    return localStorage.getItem("codistic-font") || "'JetBrains Mono', monospace";
  });
  const [fontSize, setFontSize] = useState(() => {
    return parseInt(localStorage.getItem("codistic-fontsize")) || 14;
  });
  const [themeName, setThemeName] = useState(() => {
    return localStorage.getItem("codistic-theme") || "dark";
  });
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customText, setCustomText] = useState("");
  const [lastKeyCorrect, setLastKeyCorrect] = useState(true);
  const [lastKeyTimestamp, setLastKeyTimestamp] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(() => {
    const stored = localStorage.getItem("codistic-show-keyboard");
    return stored === null ? true : stored === "true";
  });
  const [keyboardHidden, setKeyboardHidden] = useState(false);
  const [tabSize, setTabSize] = useState(() => {
    return parseInt(localStorage.getItem("codistic-tabsize")) || 4;
  });

  const timerRef = useRef(null);
  const editorWrapRef = useRef(null);
  const isMono = themeName === "monochrome" || themeName === "monochromeLight";
  const theme = THEMES[themeName];
  const accent = isMono ? THEME_ACCENTS[themeName] : (LANG_COLORS[language] || THEME_ACCENTS[themeName]);
  const t = theme;
  useEffect(() => {
    localStorage.setItem("codistic-theme", themeName);
  }, [themeName]);
  useEffect(() => {
    localStorage.setItem("codistic-font", fontFamily);
  }, [fontFamily]);
  useEffect(() => {
    localStorage.setItem("codistic-fontsize", fontSize);
  }, [fontSize]);

  // URL routing & page titles
  useEffect(() => {
    if (showSettings) {
      document.title = "Codistic / Settings";
      window.history.pushState({}, '', '/settings');
    } else if (showProfile) {
      document.title = "Codistic / Statistics";
      window.history.pushState({}, '', '/statistics');
    } else if (showAuth) {
      document.title = "Codistic / Sign In";
      window.history.pushState({}, '', '/login');
    } else {
      document.title = "Codistic - Code Typing Trainer";
      window.history.pushState({}, '', '/');
    }
  }, [showSettings, showProfile, showAuth]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePop = () => {
      const path = window.location.pathname;
      setShowSettings(path === '/settings');
      setShowProfile(path === '/statistics');
      setShowAuth(path === '/login');
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Read initial URL on mount
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/settings') setShowSettings(true);
    else if (path === '/statistics') setShowProfile(true);
    else if (path === '/login') setShowAuth(true);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
      if (u) {
        setShowAuth(false);
      }
    });
    return unsub;
  }, []);

  const loadSnippet = useCallback(async () => {
    if (length === "custom") {
      return; // Do not overwrite user's custom snippet on auto-reload
    }

    setLoading(true);
    setError(null);
    setTyped("");
    setStarted(false);
    setFinished(false);
    setFocusMode(false);
    setKeyboardHidden(false);
    setWpm(0);
    setAccuracy(100);
    setElapsed(0);
    setCursorPos(0);
    clearInterval(timerRef.current);
    
    let attempts = 0;
    let success = false;
    
    while (!success && attempts < 5) {
      attempts++;
      try {
        const data = await getSnippet(language, length);
        setSnippet(data);
        success = true;
      } catch (e) {
        if (attempts >= 5) {
          setError("Failed to load snippet automatically. Check connection.");
        } else {
          await new Promise(r => setTimeout(r, 600)); // wait a bit before retry
        }
      }
    }
    setLoading(false);
  }, [language, length]);

  const handleStartCustom = useCallback(async () => {
    let input = customText.trim();
    if (!input) return;

    if (!/^https?:\/\//.test(input)) {
        setError("Please enter a valid URL (http:// or https://).");
        setShowCustomModal(false);
        return;
    }

    let codeToType = "";
    let fileName = "custom snippet";
    let sourceName = "user defined";

    try {
        setLoading(true);
        setShowCustomModal(false);
        let fetchUrl = input;
        
        // Auto convert github blob URLs to raw URLs
        if (input.includes('github.com') && input.includes('/blob/')) {
            fetchUrl = input.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
        }

        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error("Failed to fetch from URL");
        codeToType = await res.text();
        codeToType = codeToType.split('\n').slice(0, 150).join('\n').trim(); // Limit size
        
        fileName = fetchUrl.split('/').pop() || "fetched_snippet";
        sourceName = new URL(fetchUrl).hostname;
    } catch (e) {
        setLoading(false);
        setError("Failed to fetch from the provided URL. Make sure it's a raw file link (CORS permitted).");
        return;
    }

    setSnippet({
       code: codeToType,
       file: fileName,
       source: sourceName
    });
    setLength("custom");
    setLoading(false);
    setError(null);
    setTyped("");
    setStarted(false);
    setFinished(false);
    setWpm(0);
    setAccuracy(100);
    setElapsed(0);
    setCursorPos(0);
    clearInterval(timerRef.current);
    setShowCustomModal(false);
    setCustomText("");
  }, [customText]);

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
    // Global shortcuts (work anytime, not just during typing)
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      setFocusMode(f => !f);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setShowKeyboard(k => {
        const newVal = !k;
        localStorage.setItem("codistic-show-keyboard", String(newVal));
        return newVal;
      });
      return;
    }
    if (finished || !snippet || showAuth || showProfile || showThemePicker || showCustomModal || paused) return;
    if (e.key === "Tab") {
      e.preventDefault();
      if (!started) {
        setStarted(true); setStartTime(Date.now());
        setFocusMode(true);
        setTimeout(() => {
          if (editorWrapRef.current) {
            const rect = editorWrapRef.current.getBoundingClientRect();
            window.scrollTo({ top: window.scrollY + rect.top - 8, behavior: 'smooth' });
          }
        }, 450);
      }
      const tabStr = ' '.repeat(tabSize);
      const newTyped = typed + tabStr;
      let tabCorrect = true;
      for (let ti = 0; ti < tabStr.length; ti++) {
        if (snippet.code[typed.length + ti] !== ' ') { tabCorrect = false; break; }
      }
      setLastKeyCorrect(tabCorrect);
      setLastKeyTimestamp(Date.now());
      setTyped(newTyped);
      setCursorPos(newTyped.length);
      if (newTyped.length >= snippet.code.length) {
        setFinished(true); setFocusMode(false); clearInterval(timerRef.current);
        const timeTaken = (Date.now() - startTime) / 1000 / 60;
        setWpm(Math.round(snippet.code.split(/\s+/).length / timeTaken));
      }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (!started) {
        setStarted(true); setStartTime(Date.now());
        setFocusMode(true);
        setTimeout(() => {
          if (editorWrapRef.current) {
            const rect = editorWrapRef.current.getBoundingClientRect();
            window.scrollTo({ top: window.scrollY + rect.top - 8, behavior: 'smooth' });
          }
        }, 450);
      }
      const enterCorrect = snippet.code[typed.length] === "\n";
      setLastKeyCorrect(enterCorrect);
      setLastKeyTimestamp(Date.now());
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
      if (!started) {
        setStarted(true); setStartTime(Date.now());
        setFocusMode(true);
        setTimeout(() => {
          if (editorWrapRef.current) {
            const rect = editorWrapRef.current.getBoundingClientRect();
            window.scrollTo({ top: window.scrollY + rect.top - 8, behavior: 'smooth' });
          }
        }, 450);
      }
      const newTyped = typed + e.key;
      const charCorrect = snippet.code[typed.length] === e.key;
      setLastKeyCorrect(charCorrect);
      setLastKeyTimestamp(Date.now());
      setTyped(newTyped);
      setCursorPos(newTyped.length);
      let correct = 0;
      for (let i = 0; i < newTyped.length; i++) {
        if (newTyped[i] === snippet.code[i]) correct++;
      }
      setAccuracy(Math.round((correct / newTyped.length) * 100));
      if (newTyped.length >= snippet.code.length) {
        setFinished(true);
        setFocusMode(false);
        clearInterval(timerRef.current);
        const timeTaken = (Date.now() - startTime) / 1000 / 60;
        const words = snippet.code.split(/\s+/).length;
        setWpm(Math.round(words / timeTaken));
      }
    }
  }, [typed, started, finished, snippet, startTime, showAuth, showProfile, showThemePicker, showCustomModal, paused, tabSize]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const cursor = document.getElementById("typing-cursor");
    if (cursor) {
      // Scroll within the editor body, not the whole page
      const editorBody = cursor.closest('.editor-body');
      if (editorBody) {
        const cursorRect = cursor.getBoundingClientRect();
        const bodyRect = editorBody.getBoundingClientRect();
        if (cursorRect.bottom > bodyRect.bottom - 20) {
          editorBody.scrollTop += cursorRect.bottom - bodyRect.bottom + 40;
        } else if (cursorRect.top < bodyRect.top + 20) {
          editorBody.scrollTop -= bodyRect.top - cursorRect.top + 40;
        }
      }
    }
  }, [cursorPos]);

  const renderCode = () => {
    if (!snippet) return null;
    const result = [];
    let currentClass = null;
    let currentText = "";

    for (let i = 0; i < snippet.code.length; i++) {
      const char = snippet.code[i];
      let cls = "char-untyped";
      if (i < typed.length) cls = typed[i] === char ? "char-correct" : "char-wrong";
      const isCursor = i === cursorPos;

      if (isCursor || cls !== currentClass) {
        if (currentText) {
          result.push(<span key={`chunk-${i}`} className={currentClass}>{currentText}</span>);
        }
        if (isCursor) {
          result.push(
            <span key={i} className={cls} style={{ position: "relative" }}>
              <span id="typing-cursor" className="cursor-blink" style={{ background: accent }} />
              {char}
            </span>
          );
          currentClass = null;
          currentText = "";
        } else {
          currentClass = cls;
          currentText = char;
        }
      } else {
        currentText += char;
      }
    }
    if (currentText) {
      result.push(<span key="end" className={currentClass}>{currentText}</span>);
    }
    return result;
  };

  if (!authChecked) return null;
  if (showAuth) return <AuthPage theme={t} accent={accent} onBack={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />;
  
  if (showSettings && user) return (
    <SettingsPage 
      user={user} 
      theme={t} 
      accent={accent} 
      onBack={() => setShowSettings(false)} 
      fontFamily={fontFamily}
      setFontFamily={setFontFamily}
      fontSize={fontSize}
      setFontSize={setFontSize}
      themeName={themeName}
      setThemeName={setThemeName}
      showKeyboard={showKeyboard}
      setShowKeyboard={(v) => { setShowKeyboard(v); localStorage.setItem("codistic-show-keyboard", String(v)); }}
      tabSize={tabSize}
      setTabSize={(v) => { setTabSize(v); localStorage.setItem("codistic-tabsize", String(v)); }}
    />
  );
  
  if (showProfile && user) return (
    <ProfilePage 
      user={user} 
      theme={t} 
      accent={accent} 
      onBack={() => setShowProfile(false)} 
      fontFamily={fontFamily}
      onFontChange={setFontFamily}
      isMono={isMono}
    />
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&family=Syne:wght@700;800&family=Fira+Code:wght@300;400;500&family=Source+Code+Pro:wght@300;400;500&family=Inconsolata:wght@300;400;500&family=Space+Mono&family=Ubuntu+Mono&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${t.bg}; color: ${t.text}; font-family: 'DM Sans', sans-serif; min-height: 100vh; }
        .app { min-height: 100vh; display: flex; flex-direction: column; background: ${t.bg}; position: relative; }
        .app::before { display: none; }
        .glow-orb { position: fixed; width: 600px; height: 600px; border-radius: 50%; filter: blur(120px); opacity: 0.06; pointer-events: none; z-index: 0; background: ${accent}; top: -200px; left: 20%; transition: background 0.6s; }
        nav { position: relative; z-index: 10; display: flex; align-items: center; justify-content: center; height: 64px; border-bottom: 1px solid ${t.border}; backdrop-filter: blur(12px); background: ${t.navBg}; transition: all 0.4s cubic-bezier(0.4,0,0.2,1); }
        nav.focus-hidden { height: 0; border-bottom-color: transparent; opacity: 0; pointer-events: none; overflow: hidden; }
        .focus-exit-btn { padding: 5px 12px; border-radius: 6px; border: 1px solid ${t.border}; background: transparent; color: ${t.textMuted}; font-family: 'JetBrains Mono', monospace; font-size: 11px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 5px; }
        .focus-exit-btn:hover { color: ${t.text}; border-color: ${t.textMuted}; background: ${t.border}; }
        .nav-inner { width: 100%; display: grid; grid-template-columns: 1fr auto 1fr; padding: 0 40px; align-items: center; }
        .nav-logo { display: flex; align-items: center; gap: 8px; font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: ${t.text}; }
        .nav-logo span { color: ${accent}; }
        .nav-center { display: flex; align-items: center; gap: 16px; justify-self: center; }
        .nav-right { display: flex; align-items: center; gap: 10px; justify-self: end; }
        .nav-stat { display: flex; flex-direction: column; align-items: flex-end; }
        .nav-stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: ${t.textMuted}; font-weight: 500; }
        .nav-stat-value { font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 500; color: ${t.text}; }
        .btn-nav { padding: 7px 14px; border-radius: 8px; border: 1px solid ${t.border}; background: transparent; color: ${t.textMuted}; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        .btn-nav:hover { color: ${t.text}; border-color: ${t.text}; }
        .btn-nav-accent { padding: 7px 14px; border-radius: 8px; border: none; background: ${accent}; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
        .btn-nav-accent:hover { opacity: 0.85; }
        main { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; align-items: center; padding: 48px 24px; gap: 24px; transition: padding 0.4s cubic-bezier(0.4,0,0.2,1); }
        main.focus-mode { padding: 12px 24px; justify-content: flex-start; gap: 12px; }
        main.focus-mode .editor-body { max-height: 70vh; overflow-y: auto; }
        .controls { display: flex; align-items: center; gap: 8px; padding: 6px; background: ${t.surfaceAlt}; border: 1px solid ${t.border}; border-radius: 12px; transition: all 0.4s cubic-bezier(0.4,0,0.2,1); max-height: 60px; overflow: hidden; opacity: 1; }
        .controls.focus-hidden { display: none; }
        .ctrl-group { display: flex; gap: 4px; }
        .ctrl-btn { padding: 7px 14px; border-radius: 8px; border: none; background: transparent; color: ${t.textMuted}; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 6px; }
        .ctrl-btn:hover { color: ${t.text}; background: ${t.border}; }
        .ctrl-btn.active { background: ${t.border}; color: ${t.text}; }
        .ctrl-divider { width: 1px; height: 24px; background: ${t.border}; margin: 0 4px; }
        .ctrl-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .reload-btn { padding: 8px 12px; border-radius: 8px; border: 1px solid ${t.border}; background: transparent; color: ${t.textMuted}; font-family: 'JetBrains Mono', monospace; font-size: 12px; cursor: pointer; transition: all 0.15s; }
        .reload-btn:hover { color: ${t.text}; border-color: ${t.text}; }
        .reload-btn.active { color: ${t.text}; border-color: ${accent}; background: ${t.surfaceAlt}; }
        .progress-bar-wrap { width: 100%; max-width: 1080px; height: 2px; background: ${t.borderSubtle}; border-radius: 2px; overflow: hidden; }
        .progress-bar-fill { height: 100%; border-radius: 2px; transition: width 0.1s linear; }
        .editor-wrap { width: 100%; max-width: 1080px; border-radius: 16px; overflow: hidden; border: 1px solid ${t.border}; background: ${t.surface}; box-shadow: 0 24px 80px rgba(0,0,0,0.3); }
        .editor-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: ${t.surfaceAlt}; border-bottom: 1px solid ${t.border}; }
        .editor-dots { display: flex; gap: 6px; }
        .editor-dot { width: 11px; height: 11px; border-radius: 50%; }
        .editor-filename { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: ${t.textMuted}; }
        .editor-source { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: ${t.textDim}; }
        .editor-body { padding: 28px 32px; min-height: 280px; display: flex; align-items: flex-start; justify-content: flex-start; cursor: text; overflow-x: auto; width: 100%; }
        .line-numbers { display: flex; flex-direction: column; align-items: flex-end; margin-right: 24px; user-select: none; flex-shrink: 0; }
        .line-num { font-family: ${fontFamily}; font-size: ${fontSize}px; line-height: 1.7; color: ${t.textDim}; min-width: 20px; text-align: right; }
        .code-display { font-family: ${fontFamily}; font-size: ${fontSize}px; line-height: 1.7; white-space: pre; flex: 1; min-width: 0; width: 100%; text-align: left; outline: none; tab-size: 4; display: block; }
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
        .stats-bar { display: flex; gap: 8px; width: 100%; max-width: 1080px; transition: all 0.4s cubic-bezier(0.4,0,0.2,1); max-height: 100px; overflow: hidden; opacity: 1; }
        .stats-bar.focus-hidden { display: none; }
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
        .custom-input { width: 100%; padding: 16px; border-radius: 12px; border: 1px solid ${t.border}; background: ${t.surfaceAlt}; color: ${t.text}; font-family: ${fontFamily}; font-size: ${fontSize}px; outline: none; transition: border-color 0.15s; }
        .custom-input:focus { border-color: ${accent}; }
        footer { position: relative; z-index: 1; border-top: 1px solid ${t.border}; padding: 20px 40px; display: flex; align-items: center; justify-content: space-between; background: ${t.navBg}; backdrop-filter: blur(12px); transition: all 0.4s cubic-bezier(0.4,0,0.2,1); overflow: hidden; max-height: 80px; opacity: 1; }
        footer.focus-hidden { display: none; }
        .focus-stats-bar { display: flex; align-items: center; gap: 20px; transition: all 0.3s ease; }
        .focus-stat { display: flex; align-items: baseline; gap: 4px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: ${t.textMuted}; }
        .focus-stat-value { font-weight: 600; color: ${t.text}; font-size: 13px; }
        .footer-left { display: flex; align-items: center; gap: 8px; font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; color: ${t.textDim}; }
        .footer-left span { color: ${accent}; }
        .footer-links { display: flex; gap: 20px; }
        .footer-link { background: none; border: none; color: ${t.textMuted}; font-family: 'DM Sans', sans-serif; font-size: 12px; cursor: pointer; transition: color 0.15s; }
        .footer-link:hover { color: ${t.text}; }
        .footer-copy { font-size: 11px; color: ${t.textDim}; font-family: 'JetBrains Mono', monospace; }
      `}</style>

      <div className="app">
        <DynamicBackground wpm={finished ? 0 : wpm} accent={accent} />
        <div className="glow-orb" />

        <nav className={focusMode ? 'focus-hidden' : ''}>
          <div className="nav-inner">
            <div className="nav-logo">
            <img src="/logo.jpeg" alt="Codistic Logo" style={{ width: 26, height: 26, borderRadius: 4 }} />
            <div>codi<span>stic</span></div>
          </div>
          <div className="nav-center">
            <div className="nav-stat">
              <span className="nav-stat-label">WPM</span>
              <span className="nav-stat-value" style={{ color: started ? accent : t.textMuted }}>{started ? wpm || "-" : "-"}</span>
            </div>
            <div className="nav-stat">
              <span className="nav-stat-label">Accuracy</span>
              <span className="nav-stat-value">{started ? `${accuracy}%` : "-"}</span>
            </div>
            <div className="nav-stat">
              <span className="nav-stat-label">Time</span>
              <span className="nav-stat-value">{started ? `${elapsed}s` : "-"}</span>
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
              <div className="theme-picker-wrap">
                <button className="btn-nav" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px' }} onClick={() => setShowUserMenu((p) => !p)}>
                  {user.photoURL && (
                     <img src={user.photoURL} alt="avatar" style={{width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${t.border}`}} />
                  )}
                  Profile <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
                </button>
                {showUserMenu && (
                  <div className="theme-picker-dropdown" style={{ minWidth: 180, right: 0 }}>
                    <div style={{ padding: '10px 12px', fontSize: 13, color: t.text, fontWeight: 500 }}>
                      Hello, {user.displayName || user.email?.split('@')[0]}
                    </div>
                    <div style={{ height: 1, background: t.border, margin: '4px 0' }} />
                    <button className="theme-option" onClick={() => { setShowProfile(true); setShowUserMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
                      View Stats
                    </button>
                    <button className="theme-option" onClick={() => { setShowSettings(true); setShowUserMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                      Settings
                    </button>
                    <div style={{ height: 1, background: t.border, margin: '4px 0' }} />
                    <button className="theme-option" style={{ color: t.wrong, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => { signOut(auth); setShowUserMenu(false); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="btn-nav-accent" onClick={() => setShowAuth(true)}>Sign In</button>
            )}
            </div>
          </div>
        </nav>

        <main className={focusMode ? 'focus-mode' : ''} onClick={() => { setShowThemePicker(false); setShowUserMenu(false); }}>
          <div className={`controls ${focusMode ? 'focus-hidden' : ''}`}>
            <div className="ctrl-group">
              {LANGUAGES.map((lang) => (
                <button key={lang} className={`ctrl-btn ${language === lang ? "active" : ""}`} onClick={() => setLanguage(lang)}>
                  <span className="ctrl-dot" style={{ background: isMono ? t.textMuted : LANG_COLORS[lang] }} />
                  {lang}
                </button>
              ))}
            </div>
            <div className="ctrl-divider" />
            <div className="ctrl-group">
              {LENGTHS.map((l) => (
                <button key={l} className={`ctrl-btn ${length === l ? "active" : ""}`} onClick={() => setLength(l)}>
                  {l === "short" ? "short" : l === "medium" ? "warmup" : "full"}
                </button>
              ))}
            </div>
            <div className="ctrl-divider" />
            <button className="reload-btn" onClick={() => length === 'custom' ? setLength('short') : loadSnippet()}>↺ new</button>
            <button className={`reload-btn ${length === 'custom' ? 'active' : ''}`} onClick={() => setShowCustomModal(true)}>✎ custom</button>
            {started && !finished && (
              <button className="reload-btn" onClick={() => setPaused(p => !p)}>
                {paused ? "▶ resume" : "⏸ pause"}
              </button>
            )}          </div>

          <div className="progress-bar-wrap" style={focusMode ? { display: 'none' } : undefined}>
            <div className="progress-bar-fill" style={{ width: snippet ? `${(typed.length / snippet.code.length) * 100}%` : "0%", background: accent }} />
          </div>

          <div className="editor-wrap" ref={editorWrapRef}>
            <div className="editor-header">
              <div className="editor-dots">
                <div className="editor-dot" style={{ background: "#FF5F57" }} />
                <div className="editor-dot" style={{ background: "#FEBC2E" }} />
                <div className="editor-dot" style={{ background: "#28C840" }} />
              </div>
              {started && !finished ? (
                <div className="focus-stats-bar">
                  <div className="focus-stat"><span className="focus-stat-value" style={{ color: accent }}>{wpm || 0}</span> wpm</div>
                  <div className="focus-stat"><span className="focus-stat-value">{accuracy}%</span> acc</div>
                  <div className="focus-stat"><span className="focus-stat-value">{elapsed}s</span> time</div>
                  <div className="focus-stat"><span className="focus-stat-value">{snippet ? Math.round((typed.length / snippet.code.length) * 100) : 0}%</span> done</div>
                </div>
              ) : (
                <span className="editor-filename">{snippet ? snippet.file : "loading..."}</span>
              )}
              <button className="focus-exit-btn" title="Ctrl + F" onClick={() => setFocusMode(f => !f)}>
                {focusMode ? (
                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg> exit focus</>
                ) : (
                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg> focus mode</>
                )}
              </button>
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
                        <span id="typing-cursor" className="cursor-blink" style={{ background: accent }} />
                      </span>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className={`stats-bar ${focusMode ? 'focus-hidden' : ''}`}>
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

          {!started && !loading && <p className="hint">start typing to begin · tab for indentation</p>}
        </main>

        {showKeyboard && !keyboardHidden && (
          <div style={{ padding: '0 24px 24px', display: 'flex', justifyContent: 'center' }}>
            <VirtualKeyboard
              theme={t}
              accent={accent}
              nextChar={snippet && !finished && cursorPos < snippet.code.length ? snippet.code[cursorPos] : null}
              lastKeyCorrect={lastKeyCorrect}
              lastKeyTimestamp={lastKeyTimestamp}
              compact={snippet && snippet.code.split('\n').length > 15}
              onHide={() => setKeyboardHidden(true)}
            />
          </div>
        )}

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
                <button className="btn-secondary" onClick={() => { setTyped(""); setStarted(false); setFinished(false); setFocusMode(false); setWpm(0); setAccuracy(100); setElapsed(0); setCursorPos(0); }}>
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {showCustomModal && (
          <div className="results-overlay">
            <div className="results-card">
              <div>
                <div className="results-title">Load from URL</div>
                <p style={{ color: t.textMuted, fontSize: 14, marginTop: 6, fontFamily: "'DM Sans'" }}>
                  Paste a valid URL to any raw file or Github code link below.
                </p>
              </div>
              <input
                type="text"
                className="custom-input"
                placeholder="https://github.com/user/repo/blob/main/file.js"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleStartCustom(); }}
                autoFocus
              />
              <div className="results-actions">
                <button className="btn-secondary" onClick={() => setShowCustomModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleStartCustom}>Start Typing</button>
              </div>
            </div>
          </div>
        )}

        <footer className={focusMode ? 'focus-hidden' : ''}>
          <div className="footer-left">
            <img src="/logo.jpeg" alt="Logo" style={{ width: 18, height: 18, borderRadius: 3 }} />
            <span>codi<span>stic</span></span>
          </div>
          <div className="footer-links">
            {user && <button className="footer-link" onClick={() => setShowProfile(true)}>Profile</button>}
            {user && <button className="footer-link" onClick={() => setShowSettings(true)}>Settings</button>}
            <button className="footer-link" onClick={() => window.open('mailto:ayushforstuff@gmail.com', '_blank')}>Contact Us</button>
            <button className="footer-link" onClick={() => window.open('https://github.com/saini07ayush/Codistic', '_blank')}>GitHub</button>
          </div>
          <div className="footer-copy">{new Date().getFullYear()} Codistic</div>
        </footer>
      </div>
    </>
  );
}
