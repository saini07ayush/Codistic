import { useState } from "react";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";
import { THEMES, THEME_ACCENTS } from "./themes";

export default function SettingsPage({ 
  user, theme, accent, onBack, 
  fontFamily, setFontFamily, 
  fontSize, setFontSize,
  themeName, setThemeName
}) {
  const t = theme;
  
  // --- Local draft state (nothing applies until Save) ---
  const [draftName, setDraftName] = useState(user.displayName || user.email?.split('@')[0] || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [draftTheme, setDraftTheme] = useState(themeName);
  const [draftFont, setDraftFont] = useState(fontFamily);
  const [draftFontSize, setDraftFontSize] = useState(fontSize);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSaveAll = async () => {
    setLoading(true);
    setMessage("");
    setError("");
    
    try {
      // --- Account updates ---
      const profileUpdates = {};
      if (draftName !== user.displayName) profileUpdates.displayName = draftName;
      
      if (avatarFile) {
        const fileRef = ref(storage, `avatars/${user.uid}`);
        await uploadBytes(fileRef, avatarFile);
        profileUpdates.photoURL = await getDownloadURL(fileRef);
      }
      
      if (Object.keys(profileUpdates).length > 0) {
        await updateProfile(user, profileUpdates);
      }

      // --- Aesthetic updates (apply to parent) ---
      setThemeName(draftTheme);
      setFontFamily(draftFont);
      setFontSize(draftFontSize);
      
      setMessage("All settings saved successfully.");
      setAvatarFile(null);
    } catch (e) {
      setError(e.message.replace("Firebase: ", "").trim());
    } finally {
      setLoading(false);
    }
  };

  // Preview accent for the draft theme
  const previewAccent = THEME_ACCENTS[draftTheme] || accent;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Syne:wght@700;800&display=swap');
        
        .settings-wrap {
          min-height: 100vh;
          background: ${t.bg};
          font-family: 'DM Sans', sans-serif;
          color: ${t.text};
        }
        
        .settings-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          height: 70px;
          border-bottom: 1px solid ${t.border};
          background: ${t.bg};
        }
        
        .settings-title {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: ${t.text};
        }
        
        .settings-main {
          padding: 40px;
          max-width: 1000px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }
        
        .settings-card {
          background: ${t.surface};
          border-radius: 12px;
          border: 1px solid ${t.border};
          padding: 32px;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .settings-card-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: ${t.textMuted};
          border-bottom: 1px solid ${t.border};
          padding-bottom: 12px;
          margin-bottom: 8px;
        }

        .settings-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .settings-label {
          font-size: 13px;
          font-weight: 600;
          color: ${t.text};
        }
        
        .settings-input, .settings-select {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid ${t.border};
          background: ${t.surfaceAlt};
          color: ${t.text};
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }
        
        .settings-input:focus, .settings-select:focus {
          border-color: ${accent};
        }

        .settings-select {
          cursor: pointer;
        }

        .btn-save {
          width: 100%;
          padding: 14px;
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
        
        .btn-save:hover { opacity: 0.88; }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .nav-btn {
          background: none;
          border: none;
          color: ${t.textMuted};
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }
        .nav-btn:hover { color: ${t.text}; }

        .settings-alert {
          font-size: 13px;
          padding: 12px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .settings-alert.error { background: ${t.wrongBg}; color: ${t.wrong}; border: 1px solid ${t.wrong}40; }
        .settings-alert.success { background: ${t.surfaceAlt}; border: 1px solid ${accent}40; color: ${accent}; }
        
        .avatar-preview {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid ${t.border};
        }

        .settings-email-display {
          padding: 12px 14px;
          border-radius: 10px;
          background: ${t.surfaceAlt};
          border: 1px solid ${t.border};
          color: ${t.textMuted};
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
        }
      `}</style>

      <div className="settings-wrap">
        <nav className="settings-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.jpeg" alt="Codistic Logo" style={{ width: 28, height: 28, borderRadius: 5 }} />
            <div className="settings-title">codi<span style={{ color: accent }}>stic</span> <span style={{ color: t.textDim, fontWeight: 500 }}>/ Settings</span></div>
          </div>
          <button className="nav-btn" onClick={onBack}>← Back to Typing</button>
        </nav>

        <div className="settings-main">
          
          {/* Account Settings */}
          <div className="settings-card">
            <div className="settings-card-title">Account Details</div>
            
            <div className="settings-field">
              <span className="settings-label">Profile Picture</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <img src={user.photoURL || "/logo.jpeg"} alt="avatar" className="avatar-preview" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files[0])}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px dashed ${t.border}`,
                    color: t.textMuted,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>

            <div className="settings-field">
              <span className="settings-label">Display Name</span>
              <input 
                className="settings-input" 
                value={draftName} 
                onChange={e => setDraftName(e.target.value)}
                placeholder="How you appear"
              />
            </div>

            <div className="settings-field">
              <span className="settings-label">Email Address</span>
              <div className="settings-email-display">
                {user.email}
              </div>
              <span style={{ fontSize: 11, color: t.textDim }}>Email cannot be changed from here for security reasons.</span>
            </div>
          </div>

          {/* Aesthetic Settings */}
          <div className="settings-card">
            <div className="settings-card-title">Aesthetics & Engine</div>
            
            <div className="settings-field">
              <span className="settings-label">Active Theme</span>
              <select 
                className="settings-select" 
                value={draftTheme} 
                onChange={e => setDraftTheme(e.target.value)}
              >
                {Object.entries(THEMES).map(([key, val]) => (
                  <option key={key} value={key}>{val.name}</option>
                ))}
              </select>
            </div>

            <div className="settings-field">
              <span className="settings-label">Editor Font</span>
              <select 
                className="settings-select" 
                style={{ fontFamily: draftFont }}
                value={draftFont} 
                onChange={e => setDraftFont(e.target.value)}
              >
                <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                <option value="'Fira Code', monospace">Fira Code</option>
                <option value="'Source Code Pro', monospace">Source Code Pro</option>
                <option value="'Inconsolata', monospace">Inconsolata</option>
                <option value="'Space Mono', monospace">Space Mono</option>
                <option value="'Ubuntu Mono', monospace">Ubuntu Mono</option>
              </select>
            </div>

            <div className="settings-field">
              <span className="settings-label">Editor Font Size: {draftFontSize}px</span>
              <input 
                type="range"
                min="12"
                max="24"
                step="1"
                value={draftFontSize}
                onChange={e => setDraftFontSize(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: previewAccent, marginTop: 8 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: t.textDim, marginTop: 4 }}>
                <span>12px</span>
                <span>24px</span>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="settings-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 20px', 
                background: (THEMES[draftTheme] || t).surfaceAlt, 
                borderBottom: `1px solid ${(THEMES[draftTheme] || t).border}` 
              }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: (THEMES[draftTheme] || t).textMuted }}>preview.py</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: (THEMES[draftTheme] || t).textDim }}>LIVE PREVIEW</span>
              </div>
              <div style={{ 
                padding: '24px 28px', 
                background: (THEMES[draftTheme] || t).surface, 
                display: 'flex', 
                gap: 20 
              }}>
                <div style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-end', 
                  fontFamily: draftFont, fontSize: draftFontSize, lineHeight: 1.7, 
                  color: (THEMES[draftTheme] || t).textDim, userSelect: 'none' 
                }}>
                  {[1,2,3,4].map(n => <span key={n}>{n}</span>)}
                </div>
                <pre style={{ 
                  margin: 0, fontFamily: draftFont, fontSize: draftFontSize, lineHeight: 1.7, 
                  color: (THEMES[draftTheme] || t).text, whiteSpace: 'pre' 
                }}>
{`def greet(name):
    message = f"Hello, {name}!"
    print(message)
    return message`}
                </pre>
              </div>
            </div>
          </div>

        </div>

        {/* Unified Save Button */}
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 40px 40px' }}>
          {error && <div className="settings-alert error" style={{ marginBottom: 16 }}>⚠ {error}</div>}
          {message && <div className="settings-alert success" style={{ marginBottom: 16 }}>✓ {message}</div>}
          <button className="btn-save" onClick={handleSaveAll} disabled={loading}>
            {loading ? "Saving..." : "Save All Settings"}
          </button>
        </div>
      </div>
    </>
  );
}
