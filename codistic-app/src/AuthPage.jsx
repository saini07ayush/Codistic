import { useState } from "react";
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

export default function AuthPage({ theme, accent }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const t = theme;

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    setLoading(true);
    setError("");
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setError(e.message.replace("Firebase: ", "").replace(/\(auth.*\)/, "").trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        .auth-wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${t.bg};
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }
        .auth-wrap::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(${t.gridLine} 1px, transparent 1px),
            linear-gradient(90deg, ${t.gridLine} 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }
        .auth-glow {
          position: fixed;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.07;
          pointer-events: none;
          background: ${accent};
          top: -100px;
          left: 30%;
        }
        .auth-card {
          position: relative;
          z-index: 1;
          background: ${t.surface};
          border: 1px solid ${t.border};
          border-radius: 20px;
          padding: 48px;
          width: 420px;
          display: flex;
          flex-direction: column;
          gap: 28px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.3);
        }
        .auth-logo {
          font-family: 'Syne', sans-serif;
          font-size: 26px;
          font-weight: 800;
          color: ${t.text};
          letter-spacing: -0.5px;
        }
        .auth-logo span { color: ${accent}; }
        .auth-title {
          font-size: 20px;
          font-weight: 600;
          color: ${t.text};
          margin-top: -8px;
        }
        .auth-subtitle {
          font-size: 13px;
          color: ${t.textMuted};
          margin-top: -20px;
        }
        .auth-google-btn {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid ${t.border};
          background: ${t.surfaceAlt};
          color: ${t.text};
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.15s;
        }
        .auth-google-btn:hover {
          border-color: ${accent};
          background: ${t.surface};
        }
        .auth-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          color: ${t.textDim};
          font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
        }
        .auth-divider::before, .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: ${t.border};
        }
        .auth-input {
          width: 100%;
          padding: 11px 14px;
          border-radius: 10px;
          border: 1px solid ${t.border};
          background: ${t.surfaceAlt};
          color: ${t.text};
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          outline: none;
          transition: border-color 0.15s;
        }
        .auth-input::placeholder { color: ${t.textDim}; }
        .auth-input:focus { border-color: ${accent}; }
        .auth-inputs { display: flex; flex-direction: column; gap: 10px; }
        .auth-submit {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: none;
          background: ${accent};
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .auth-submit:hover { opacity: 0.88; }
        .auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .auth-switch {
          text-align: center;
          font-size: 13px;
          color: ${t.textMuted};
        }
        .auth-switch button {
          background: none;
          border: none;
          color: ${accent};
          font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          font-weight: 500;
        }
        .auth-error {
          font-size: 12px;
          color: ${t.wrong};
          font-family: 'JetBrains Mono', monospace;
          padding: 10px 14px;
          background: ${t.wrongBg};
          border-radius: 8px;
        }
      `}</style>

      <div className="auth-wrap">
        <div className="auth-glow" />
        <div className="auth-card">
          <div className="auth-logo">codi<span>stic</span></div>
          <div>
            <div className="auth-title">{mode === "login" ? "Welcome back" : "Create account"}</div>
            <div className="auth-subtitle">{mode === "login" ? "Sign in to track your progress" : "Start tracking your typing speed"}</div>
          </div>

          <button className="auth-google-btn" onClick={handleGoogle} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider">or</div>

          <div className="auth-inputs">
            <input
              className="auth-input"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="auth-input"
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEmail()}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" onClick={handleEmail} disabled={loading}>
            {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>

          <div className="auth-switch">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
