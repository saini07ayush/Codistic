import { useState, useEffect, useRef, useCallback } from "react";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";
import { THEMES, THEME_ACCENTS, CUSTOM_THEME_FIELDS, buildThemeFromColors, loadCustomTheme, saveCustomTheme } from "./themes";
import {
  getAllCustomFonts,
  addGoogleFont,
  addUploadedFont,
  removeCustomFont,
  buildFontFamilyValue,
  loadAllCustomFonts,
} from "./fontManager";

// SVG Icon components
const Icons = {
  account: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  appearance: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2.5" /><path d="M17.08 10.13A7 7 0 1 1 6.92 10.13" /><path d="M12 2v4" /><path d="M4.93 4.93l2.83 2.83" /><path d="M19.07 4.93l-2.83 2.83" /></svg>,
  shortcuts: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M6 8h.01" /><path d="M10 8h.01" /><path d="M14 8h.01" /><path d="M18 8h.01" /><path d="M8 12h.01" /><path d="M12 12h.01" /><path d="M16 12h.01" /><path d="M7 16h10" /></svg>,
  about: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>,
  contact: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  email: (c) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  github: (c) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></svg>,
};

const TABS = [
  { id: "account", label: "Account", iconKey: "account" },
  { id: "appearance", label: "Appearance", iconKey: "appearance" },
  { id: "shortcuts", label: "Shortcuts", iconKey: "shortcuts" },
  { id: "about", label: "About", iconKey: "about" },
  { id: "contact", label: "Contact", iconKey: "contact" },
];

const SHORTCUTS = [
  { keys: "Any Key", desc: "Start typing to begin the session" },
  { keys: "Backspace", desc: "Delete the last typed character" },
  { keys: "Ctrl + F", desc: "Toggle focus mode (during typing)" },
  { keys: "Ctrl + K", desc: "Show / hide the virtual keyboard" },
  { keys: "Ctrl + R", desc: "Load a new snippet (reload)" },
  { keys: "Ctrl + P", desc: "Pause / resume the current session" },
  { keys: "Escape", desc: "Exit focus mode" },
];

export default function SettingsPage({
  user, theme, accent, onBack,
  fontFamily, setFontFamily,
  fontSize, setFontSize,
  themeName, setThemeName,
  showKeyboard, setShowKeyboard,
  tabSize, setTabSize,
  focusFullscreen, setFocusFullscreen,
  deepLink
}) {
  const t = theme;
  const [activeTab, setActiveTab] = useState(deepLink === 'customTheme' ? 'appearance' : 'account');
  const customThemeMakerRef = useRef(null);

  // Deep-link: scroll to custom theme maker when arriving via dropdown
  useEffect(() => {
    if (deepLink === 'customTheme' && activeTab === 'appearance') {
      // Small delay to let DOM render the appearance tab content
      const timer = setTimeout(() => {
        if (customThemeMakerRef.current) {
          customThemeMakerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Brief highlight flash
          customThemeMakerRef.current.style.boxShadow = `0 0 0 2px ${accent}, 0 10px 40px -10px rgba(0,0,0,0.2)`;
          setTimeout(() => {
            if (customThemeMakerRef.current) {
              customThemeMakerRef.current.style.boxShadow = '0 10px 40px -10px rgba(0,0,0,0.2)';
            }
          }, 1500);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [deepLink, activeTab, accent]);

  // --- Local draft state (nothing applies until Save) ---
  const [draftName, setDraftName] = useState(user.displayName || user.email?.split('@')[0] || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [draftTheme, setDraftTheme] = useState(themeName);
  const [draftFont, setDraftFont] = useState(fontFamily);
  const [draftFontSize, setDraftFontSize] = useState(fontSize);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // --- Custom Theme Maker State ---
  const existingCustom = loadCustomTheme();
  const defaultCustomColors = {
    bg: "#0a0a0a", surface: "#111111", text: "#e2e8f0",
    accent: "#3B82F6", correct: "#e2e8f0", wrong: "#fc8181",
  };
  const [customColors, setCustomColors] = useState(existingCustom || defaultCustomColors);
  const [customBaseTheme, setCustomBaseTheme] = useState("");
  const [customSaved, setCustomSaved] = useState(false);
  const customPreviewTheme = buildThemeFromColors(customColors);

  // --- Custom Fonts State ---
  const [customFonts, setCustomFonts] = useState([]);
  const [googleFontInput, setGoogleFontInput] = useState("");
  const [fontLoading, setFontLoading] = useState(false);
  const [fontMsg, setFontMsg] = useState({ text: "", type: "" }); // type: 'success' | 'error'
  const [dragOver, setDragOver] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showAddFontModal, setShowAddFontModal] = useState(false);
  const fontFileInputRef = useRef(null);
  const fontPickerRef = useRef(null);

  // Load custom fonts list on mount
  const refreshCustomFonts = useCallback(async () => {
    const fonts = await getAllCustomFonts();
    setCustomFonts(fonts);
  }, []);

  useEffect(() => {
    refreshCustomFonts();
  }, [refreshCustomFonts]);

  const showFontMsg = (text, type) => {
    setFontMsg({ text, type });
    setTimeout(() => setFontMsg({ text: "", type: "" }), 4000);
  };

  const handleAddGoogleFont = async () => {
    if (!googleFontInput.trim()) return;
    setFontLoading(true);
    const result = await addGoogleFont(googleFontInput.trim());
    setFontLoading(false);
    if (result.success) {
      showFontMsg(`"${googleFontInput.trim()}" added successfully!`, "success");
      setGoogleFontInput("");
      refreshCustomFonts();
    } else {
      showFontMsg(result.error, "error");
    }
  };

  const handleUploadFont = async (file) => {
    if (!file) return;
    setFontLoading(true);
    const result = await addUploadedFont(file);
    setFontLoading(false);
    if (result.success) {
      showFontMsg(`"${result.name}" uploaded successfully!`, "success");
      refreshCustomFonts();
    } else {
      showFontMsg(result.error, "error");
    }
  };

  const handleRemoveFont = async (fontName, fontType) => {
    await removeCustomFont(fontName, fontType);
    // If the removed font is currently selected, fall back to default
    const removedFamily = buildFontFamilyValue(fontName);
    if (draftFont === removedFamily) {
      setDraftFont("'JetBrains Mono', monospace");
      setFontFamily("'JetBrains Mono', monospace");
    }
    refreshCustomFonts();
    showFontMsg(`"${fontName}" removed.`, "success");
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleUploadFont(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  // Close font picker on outside click
  useEffect(() => {
    if (!showFontPicker) return;
    const handleClick = (e) => {
      if (fontPickerRef.current && !fontPickerRef.current.contains(e.target)) {
        setShowFontPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showFontPicker]);

  // Get display name from a font-family value
  const getFontDisplayName = (val) => {
    const builtIn = {
      "'JetBrains Mono', monospace": 'JetBrains Mono',
      "'Fira Code', monospace": 'Fira Code',
      "'Source Code Pro', monospace": 'Source Code Pro',
      "'Inconsolata', monospace": 'Inconsolata',
      "'Space Mono', monospace": 'Space Mono',
      "'Ubuntu Mono', monospace": 'Ubuntu Mono',
    };
    if (builtIn[val]) return builtIn[val];
    const custom = customFonts.find(f => buildFontFamilyValue(f.name) === val);
    if (custom) return custom.name;
    return val.replace(/'/g, '').split(',')[0].trim();
  };

  const handleSaveAll = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
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

  const isDraftMono = draftTheme === "monochrome" || draftTheme === "monochromeLight";
  const previewAccent = isDraftMono ? THEME_ACCENTS[draftTheme] : (THEME_ACCENTS[draftTheme] || accent);
  const previewTheme = THEMES[draftTheme] || t;

  return (
    <>
      <style>{`
        .settings-wrap {
          min-height: 100vh;
          height: 100vh;
          background: ${t.bg};
          font-family: 'DM Sans', sans-serif;
          color: ${t.text};
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .settings-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          height: 70px;
          border-bottom: 1px solid ${t.border};
          background: ${t.bg};
          flex-shrink: 0;
        }
        
        .settings-title {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: ${t.text};
        }
        
        .settings-body {
          display: flex;
          flex: 1;
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
          padding: 40px;
          gap: 32px;
          overflow: hidden;
          min-height: 0;
        }

        /* Sidebar */
        .settings-sidebar {
          width: 200px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: ${t.textMuted};
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }
        .tab-btn:hover { color: ${t.text}; background: ${t.surfaceAlt}; }
        .tab-btn.active { color: ${t.text}; background: ${t.surface}; border: 1px solid ${t.border}; font-weight: 600; }
        .tab-icon { 
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
        }

        /* Content */
        .settings-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 24px;
          overflow-y: auto;
          min-height: 0;
          padding-right: 8px;
        }
        .settings-content::-webkit-scrollbar {
          width: 6px;
        }
        .settings-content::-webkit-scrollbar-track {
          background: transparent;
        }
        .settings-content::-webkit-scrollbar-thumb {
          background: ${t.border};
          border-radius: 3px;
        }
        .settings-content::-webkit-scrollbar-thumb:hover {
          background: ${t.textDim};
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

        .settings-select { cursor: pointer; }

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

        .shortcut-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0;
          border-bottom: 1px solid ${t.border};
        }
        .shortcut-row:last-child { border-bottom: none; }
        .shortcut-key {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          background: ${t.surfaceAlt};
          border: 1px solid ${t.border};
          color: ${t.text};
          min-width: 90px;
          text-align: center;
        }
        .shortcut-desc {
          font-size: 13px;
          color: ${t.textMuted};
        }

        .about-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .about-heading {
          font-family: 'Syne', sans-serif;
          font-size: 24px;
          font-weight: 800;
          color: ${t.text};
        }
        .about-text {
          font-size: 14px;
          line-height: 1.7;
          color: ${t.textMuted};
        }
        .about-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          background: ${t.surfaceAlt};
          border: 1px solid ${t.border};
          font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
          color: ${t.text};
        }
        .toggle-switch {
          position: relative;
          width: 44px;
          height: 24px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .toggle-switch::after {
          content: '';
          position: absolute;
          top: 3px;
          left: 3px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          transition: transform 0.2s;
        }
        .toggle-switch.on { background: ${accent}; }
        .toggle-switch.on::after { transform: translateX(20px); }
        .toggle-switch.off { background: ${t.border}; }
        .toggle-switch.off::after { transform: translateX(0); }

        /* Custom Theme Maker */
        .ctm-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .ctm-field {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 10px;
          background: ${t.surfaceAlt};
          border: 1px solid ${t.border};
          transition: border-color 0.15s;
        }
        .ctm-field:hover {
          border-color: ${accent}40;
        }
        .ctm-color-input {
          -webkit-appearance: none;
          appearance: none;
          width: 40px;
          height: 40px;
          border: 2px solid ${t.border};
          border-radius: 12px;
          cursor: pointer;
          padding: 0;
          background: #050505;
          flex-shrink: 0;
          overflow: hidden;
        }
        .ctm-color-input::-webkit-color-swatch-wrapper {
          padding: 3px;
        }
        .ctm-color-input::-webkit-color-swatch {
          border: none;
          border-radius: 8px;
        }
        .ctm-color-input::-moz-color-swatch {
          border: none;
          border-radius: 8px;
        }
        .ctm-field-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }
        .ctm-field-label {
          font-size: 13px;
          font-weight: 600;
          color: ${t.text};
        }
        .ctm-field-desc {
          font-size: 11px;
          color: ${t.textMuted};
        }
        .ctm-field-hex {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: ${t.text};
          text-transform: uppercase;
          background: #050505;
          border: 1px solid ${t.border};
          border-radius: 8px;
          padding: 6px 10px;
          width: 80px;
          text-align: center;
          outline: none;
          transition: border-color 0.15s;
          flex-shrink: 0;
        }
        .ctm-field-hex:focus {
          border-color: ${accent};
        }
        /* Custom Fonts Section */
        /* Font Picker Dropdown */
        .font-picker-wrap {
          position: relative;
        }
        .font-picker-trigger {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid ${t.border};
          background: ${t.surfaceAlt};
          color: ${t.text};
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          cursor: pointer;
          transition: border-color 0.15s;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          text-align: left;
        }
        .font-picker-trigger:hover { border-color: ${t.textMuted}; }
        .font-picker-trigger.open { border-color: ${accent}; }
        .font-picker-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: ${t.surface};
          border: 1px solid ${t.border};
          border-radius: 12px;
          padding: 6px;
          z-index: 50;
          box-shadow: 0 12px 40px rgba(0,0,0,0.3);
          animation: themeDropIn 0.18s cubic-bezier(0.16,1,0.3,1);
          max-height: 360px;
          overflow-y: auto;
        }
        .font-picker-dropdown::-webkit-scrollbar { width: 5px; }
        .font-picker-dropdown::-webkit-scrollbar-track { background: transparent; }
        .font-picker-dropdown::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 3px; }
        @keyframes themeDropIn { from { opacity: 0; transform: translateY(-6px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .font-option {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: ${t.textMuted};
          font-size: 13px;
          cursor: pointer;
          transition: all 0.12s;
          text-align: left;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .font-option:hover { background: ${t.surfaceAlt}; color: ${t.text}; }
        .font-option.active { color: ${t.text}; background: ${t.surfaceAlt}; font-weight: 600; }
        .font-option-name { flex: 1; min-width: 0; }
        .font-option-check { font-size: 11px; color: ${accent}; flex-shrink: 0; }
        .font-option-remove {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          border: 1px solid transparent;
          background: transparent;
          color: ${t.textDim};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          flex-shrink: 0;
          font-size: 12px;
          opacity: 0;
        }
        .font-option:hover .font-option-remove { opacity: 1; }
        .font-option-remove:hover { color: ${t.wrong}; border-color: ${t.wrong}; background: ${t.wrongBg}; }
        .font-picker-divider {
          height: 1px;
          background: ${t.border};
          margin: 4px 6px;
        }
        .font-picker-label {
          padding: 6px 12px 4px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          color: ${t.textDim};
          font-family: 'JetBrains Mono', monospace;
          font-weight: 500;
          user-select: none;
        }
        .font-add-btn {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px dashed ${t.border};
          background: transparent;
          color: ${t.textDim};
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 2px;
        }
        .font-add-btn:hover { border-color: ${accent}; color: ${accent}; background: ${accent}08; }
        /* Add Font Modal */
        .add-font-overlay {
          position: fixed;
          inset: 0;
          background: ${t.overlay || 'rgba(0,0,0,0.6)'};
          backdrop-filter: blur(12px);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .add-font-card {
          background: ${t.surface};
          border: 1px solid ${t.border};
          border-radius: 20px;
          padding: 36px;
          width: 480px;
          max-width: 90vw;
          display: flex;
          flex-direction: column;
          gap: 24px;
          animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 24px 80px rgba(0,0,0,0.4);
        }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .add-font-title {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: ${t.text};
        }
        .add-font-subtitle {
          font-size: 13px;
          color: ${t.textMuted};
          margin-top: 4px;
          line-height: 1.5;
        }
        .cf-input-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .cf-input {
          flex: 1;
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
        .cf-input:focus { border-color: ${accent}; }
        .cf-input::placeholder { color: ${t.textDim}; }
        .cf-add-btn {
          padding: 12px 18px;
          border-radius: 10px;
          border: none;
          background: ${accent};
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .cf-add-btn:hover { opacity: 0.88; }
        .cf-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cf-dropzone {
          border: 2px dashed ${t.border};
          border-radius: 12px;
          padding: 28px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .cf-dropzone:hover, .cf-dropzone.drag-over {
          border-color: ${accent};
          background: ${accent}08;
        }
        .cf-dropzone-icon { font-size: 28px; opacity: 0.5; }
        .cf-dropzone-text { font-size: 13px; color: ${t.textMuted}; }
        .cf-dropzone-hint { font-size: 11px; color: ${t.textDim}; font-family: 'JetBrains Mono', monospace; }
        .cf-divider-line {
          display: flex;
          align-items: center;
          gap: 14px;
          color: ${t.textDim};
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .cf-divider-line::before, .cf-divider-line::after {
          content: '';
          flex: 1;
          height: 1px;
          background: ${t.border};
        }
        .cf-msg {
          font-size: 12px;
          padding: 10px 14px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          animation: fadeIn 0.2s ease;
        }
        .cf-msg.error { background: ${t.wrongBg}; color: ${t.wrong}; border: 1px solid ${t.wrong}30; }
        .cf-msg.success { background: ${accent}10; color: ${accent}; border: 1px solid ${accent}30; }
        .add-font-close {
          padding: 10px 20px;
          border-radius: 10px;
          border: 1px solid ${t.border};
          background: transparent;
          color: ${t.textMuted};
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          align-self: flex-end;
        }
        .add-font-close:hover { color: ${t.text}; border-color: ${t.textMuted}; }
        .ctm-saved-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          background: ${accent}15;
          border: 1px solid ${accent}30;
          color: ${accent};
          font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
          animation: fadeIn 0.3s ease;
        }
      `}</style>

      <div className="settings-wrap">
        <nav className="settings-nav" aria-label="Settings">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={onBack}>
            <img src="/logo.jpeg" alt="Codistic Logo" style={{ width: 28, height: 28, borderRadius: 5 }} />
            <div className="settings-title">codi<span style={{ color: accent }}>stic</span> <span style={{ color: t.textDim, fontWeight: 500 }}>/ Settings</span></div>
          </div>
          <button className="nav-btn" onClick={onBack}>← Back to Typing</button>
        </nav>

        <div className="settings-body">
          {/* Sidebar */}
          <div className="settings-sidebar" role="tablist" aria-label="Settings sections">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                id={`tab-${tab.id}`}
              >
                <span className="tab-icon">{Icons[tab.iconKey](activeTab === tab.id ? accent : t.textMuted)}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="settings-content" role="tabpanel" aria-labelledby={`tab-${activeTab}`} id={`panel-${activeTab}`}>

            {/* ======= ACCOUNT TAB ======= */}
            {activeTab === "account" && (
              <div className="settings-card">
                <h2 className="settings-card-title">Account Details</h2>

                <div className="settings-field">
                  <label className="settings-label">Profile Picture</label>
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
                  <label className="settings-label" htmlFor="settings-display-name">Display Name</label>
                  <input
                    className="settings-input"
                    id="settings-display-name"
                    value={draftName}
                    onChange={e => setDraftName(e.target.value)}
                    placeholder="How you appear"
                  />
                </div>

                <div className="settings-field">
                  <label className="settings-label">Email Address</label>
                  <div className="settings-email-display">
                    {user.email}
                  </div>
                  <span style={{ fontSize: 11, color: t.textDim }}>Email cannot be changed from here for security reasons.</span>
                </div>

                {error && <div className="settings-alert error" role="alert">⚠ {error}</div>}
                {message && <div className="settings-alert success" role="status">✓ {message}</div>}

                <button className="btn-save" onClick={handleSaveAll} disabled={loading}>
                  {loading ? "Saving..." : "Save All Settings"}
                </button>
              </div>
            )}

            {/* ======= APPEARANCE TAB ======= */}
            {activeTab === "appearance" && (
              <>
                <div className="settings-card">
                  <h2 className="settings-card-title">Aesthetics & Engine</h2>

                  <div className="settings-field">
                    <label className="settings-label" htmlFor="settings-theme">Active Theme</label>
                    <select
                      className="settings-select"
                      id="settings-theme"
                      value={draftTheme}
                      onChange={e => setDraftTheme(e.target.value)}
                    >
                      {Object.entries(THEMES).map(([key, val]) => (
                        <option key={key} value={key}>{val.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="settings-field">
                    <label className="settings-label">Editor Font</label>
                    <div className="font-picker-wrap" ref={fontPickerRef}>
                      <button
                        className={`font-picker-trigger ${showFontPicker ? 'open' : ''}`}
                        onClick={() => setShowFontPicker(p => !p)}
                        style={{ fontFamily: draftFont }}
                      >
                        <span>{getFontDisplayName(draftFont)}</span>
                        <span style={{ fontSize: 9, opacity: 0.5, flexShrink: 0 }}>▼</span>
                      </button>
                      {showFontPicker && (
                        <div className="font-picker-dropdown">
                          {[
                            { value: "'JetBrains Mono', monospace", label: 'JetBrains Mono' },
                            { value: "'Fira Code', monospace", label: 'Fira Code' },
                            { value: "'Source Code Pro', monospace", label: 'Source Code Pro' },
                            { value: "'Inconsolata', monospace", label: 'Inconsolata' },
                            { value: "'Space Mono', monospace", label: 'Space Mono' },
                            { value: "'Ubuntu Mono', monospace", label: 'Ubuntu Mono' },
                          ].map(f => (
                            <button
                              key={f.value}
                              className={`font-option ${draftFont === f.value ? 'active' : ''}`}
                              style={{ fontFamily: f.value }}
                              onClick={() => { setDraftFont(f.value); setShowFontPicker(false); }}
                            >
                              <span className="font-option-name">{f.label}</span>
                              {draftFont === f.value && <span className="font-option-check">✓</span>}
                            </button>
                          ))}
                          {customFonts.length > 0 && (
                            <>
                              <div className="font-picker-divider" />
                              <div className="font-picker-label">Custom</div>
                              {customFonts.map(f => {
                                const val = buildFontFamilyValue(f.name);
                                return (
                                  <button
                                    key={f.name}
                                    className={`font-option ${draftFont === val ? 'active' : ''}`}
                                    style={{ fontFamily: val }}
                                    onClick={() => { setDraftFont(val); setShowFontPicker(false); }}
                                  >
                                    <span className="font-option-name">{f.name}</span>
                                    {draftFont === val && <span className="font-option-check">✓</span>}
                                    <button
                                      className="font-option-remove"
                                      onClick={(e) => { e.stopPropagation(); handleRemoveFont(f.name, f.type); }}
                                      title={`Remove ${f.name}`}
                                    >
                                      ✕
                                    </button>
                                  </button>
                                );
                              })}
                            </>
                          )}
                          <div className="font-picker-divider" />
                          <button
                            className="font-add-btn"
                            onClick={() => { setShowFontPicker(false); setShowAddFontModal(true); }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            Add Custom Font
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="settings-field">
                    <label className="settings-label">Editor Font Size: {draftFontSize}px</label>
                    <input
                      type="range" min="12" max="24" step="1"
                      value={draftFontSize}
                      onChange={e => setDraftFontSize(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: previewAccent, marginTop: 8 }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: t.textDim, marginTop: 4 }}>
                      <span>12px</span>
                      <span>24px</span>
                    </div>
                  </div>

                  <div className="settings-field">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <label className="settings-label">Virtual Keyboard</label>
                        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                          Show an on-screen keyboard that highlights the next key to press. Automatically uses a compact popup for longer snippets.
                        </div>
                      </div>
                      <button
                        className={`toggle-switch ${showKeyboard ? 'on' : 'off'}`}
                        onClick={() => setShowKeyboard(!showKeyboard)}
                        role="switch"
                        aria-checked={showKeyboard}
                        aria-label="Virtual Keyboard"
                      />
                    </div>
                  </div>

                  <div className="settings-field">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <label className="settings-label">Fullscreen in Focus Mode</label>
                        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                          Automatically enter fullscreen when focus mode activates. When off, focus mode hides UI elements but stays windowed.
                        </div>
                      </div>
                      <button
                        className={`toggle-switch ${focusFullscreen ? 'on' : 'off'}`}
                        onClick={() => setFocusFullscreen(!focusFullscreen)}
                        role="switch"
                        aria-checked={focusFullscreen}
                        aria-label="Fullscreen in Focus Mode"
                      />
                    </div>
                  </div>

                  <div className="settings-field">
                    <label className="settings-label">Tab Size: {tabSize} spaces</label>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      {[2, 4, 8].map(n => (
                        <button
                          key={n}
                          onClick={() => setTabSize(n)}
                          aria-pressed={tabSize === n}
                          style={{
                            flex: 1,
                            padding: '8px 0',
                            borderRadius: 8,
                            border: `1px solid ${tabSize === n ? accent : t.border}`,
                            background: tabSize === n ? accent + '18' : 'transparent',
                            color: tabSize === n ? accent : t.textMuted,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 13,
                            fontWeight: tabSize === n ? 600 : 400,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
                      Number of spaces inserted when you press Tab.
                    </div>
                  </div>

                  {error && <div className="settings-alert error" role="alert">⚠ {error}</div>}
                  {message && <div className="settings-alert success" role="status">✓ {message}</div>}

                  <button className="btn-save" onClick={handleSaveAll} disabled={loading}>
                    {loading ? "Saving..." : "Save All Settings"}
                  </button>
                </div>

                {/* Live Preview */}
                <div className="settings-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 20px',
                    background: previewTheme.surfaceAlt,
                    borderBottom: `1px solid ${previewTheme.border}`
                  }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E' }} />
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: previewTheme.textMuted }}>preview.py</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: previewTheme.textDim }}>LIVE PREVIEW</span>
                  </div>
                  <div style={{
                    padding: '24px 28px',
                    background: previewTheme.surface,
                    display: 'flex',
                    gap: 20
                  }}>
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                      fontFamily: draftFont, fontSize: draftFontSize, lineHeight: 1.7,
                      color: previewTheme.textDim, userSelect: 'none'
                    }}>
                      {[1, 2, 3, 4].map(n => <span key={n}>{n}</span>)}
                    </div>
                    <pre style={{
                      margin: 0, fontFamily: draftFont, fontSize: draftFontSize, lineHeight: 1.7,
                      color: previewTheme.text, whiteSpace: 'pre'
                    }}>
                      {`def greet(name):
    message = f"Hello, {name}!"
    print(message)
    return message`}
                    </pre>
                  </div>
                </div>

                {/* Custom Theme Maker */}
                <div className="settings-card" ref={customThemeMakerRef} style={{ transition: 'box-shadow 0.5s ease' }}>
                  <h2 className="settings-card-title">Custom Theme Maker</h2>
                  <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>
                    Create your own theme by picking 6 colors. All other UI colors are automatically derived.
                  </div>

                  <div className="settings-field">
                    <label className="settings-label" htmlFor="settings-base-theme">Start From Existing Theme</label>
                    <select
                      className="settings-select"
                      id="settings-base-theme"
                      value={customBaseTheme}
                      onChange={e => {
                        const key = e.target.value;
                        setCustomBaseTheme(key);
                        if (key && THEMES[key]) {
                          const base = THEMES[key];
                          setCustomColors({
                            bg: base.bg,
                            surface: base.surface,
                            text: base.text,
                            accent: THEME_ACCENTS[key] || "#3B82F6",
                            correct: base.correct,
                            wrong: base.wrong,
                          });
                          setCustomSaved(false);
                        }
                      }}
                    >
                      <option value="">-- Select a base theme --</option>
                      {Object.entries(THEMES).filter(([k]) => k !== 'custom').map(([key, val]) => (
                        <option key={key} value={key}>{val.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="ctm-grid">
                    {CUSTOM_THEME_FIELDS.map(field => (
                      <div className="ctm-field" key={field.key}>
                        <input
                          type="color"
                          className="ctm-color-input"
                          aria-label={field.label}
                          value={customColors[field.key]}
                          onChange={e => {
                            setCustomColors(prev => ({ ...prev, [field.key]: e.target.value }));
                            setCustomSaved(false);
                          }}
                        />
                        <div className="ctm-field-info">
                          <span className="ctm-field-label">{field.label}</span>
                          <span className="ctm-field-desc">{field.desc}</span>
                        </div>
                        <input
                          className="ctm-field-hex"
                          value={customColors[field.key]}
                          onChange={e => {
                            let val = e.target.value;
                            // Auto-prepend # if missing
                            if (val && !val.startsWith('#')) val = '#' + val;
                            // Only update state if it looks like a valid partial/full hex
                            if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                              setCustomColors(prev => ({ ...prev, [field.key]: val }));
                              setCustomSaved(false);
                            }
                          }}
                          onBlur={e => {
                            // On blur, fix to a valid 6-digit hex or revert
                            let val = e.target.value;
                            if (/^#[0-9a-fA-F]{6}$/.test(val)) return;
                            // Try to fix 3-char shorthand
                            if (/^#[0-9a-fA-F]{3}$/.test(val)) {
                              const expanded = '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3];
                              setCustomColors(prev => ({ ...prev, [field.key]: expanded }));
                            }
                          }}
                          spellCheck={false}
                          maxLength={7}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Custom Theme Live Preview */}
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${customPreviewTheme.border}` }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 20px',
                      background: customPreviewTheme.surfaceAlt,
                      borderBottom: `1px solid ${customPreviewTheme.border}`
                    }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E' }} />
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: customPreviewTheme.textMuted }}>preview.js</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: customPreviewTheme.textDim }}>CUSTOM PREVIEW</span>
                    </div>
                    <div style={{
                      padding: '24px 28px',
                      background: customPreviewTheme.bg,
                      display: 'flex',
                      gap: 20
                    }}>
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                        fontFamily: draftFont, fontSize: Math.min(draftFontSize, 14), lineHeight: 1.7,
                        color: customPreviewTheme.textDim, userSelect: 'none'
                      }}>
                        {[1, 2, 3, 4, 5].map(n => <span key={n}>{n}</span>)}
                      </div>
                      <pre style={{
                        margin: 0, fontFamily: draftFont, fontSize: Math.min(draftFontSize, 14), lineHeight: 1.7,
                        whiteSpace: 'pre'
                      }}>
                        <span style={{ color: customPreviewTheme.textDim }}>{'// '}</span><span style={{ color: customPreviewTheme.textMuted }}>untyped code looks like this</span>{'\n'}
                        <span style={{ color: customPreviewTheme.correct }}>{'const x = 42;'}</span>{'\n'}
                        <span style={{ color: customPreviewTheme.wrong, background: customPreviewTheme.wrongBg, borderRadius: 2 }}>{'cnosle'}</span><span style={{ color: customPreviewTheme.textDim }}>{'.log(x);'}</span>{'\n'}
                        <span style={{ color: customPreviewTheme.text }}>{'function '}</span><span style={{ color: customColors.accent }}>{'greet'}</span><span style={{ color: customPreviewTheme.text }}>{'() {'}</span>{'\n'}
                        <span style={{ color: customPreviewTheme.text }}>{'  return "hello";'}</span>
                      </pre>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                      className="btn-save"
                      style={{ flex: 1 }}
                      onClick={() => {
                        saveCustomTheme(customColors);
                        setDraftTheme('custom');
                        setThemeName('custom');
                        setCustomSaved(true);
                        setTimeout(() => setCustomSaved(false), 3000);
                      }}
                    >
                      Save & Apply Custom Theme
                    </button>
                    {customSaved && (
                      <span className="ctm-saved-badge">✓ Applied</span>
                    )}
                  </div>
                </div>

                {/* Add Custom Font Modal */}
                {showAddFontModal && (
                  <div className="add-font-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddFontModal(false); }}>
                    <div className="add-font-card">
                      <div>
                        <div className="add-font-title">Add Custom Font</div>
                        <div className="add-font-subtitle">
                          Add any font from Google Fonts by name, or upload your own font file.
                          Monospace fonts are recommended for the best coding experience.
                        </div>
                      </div>

                      {/* Google Fonts Input */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '1px' }}>From Google Fonts</div>
                        <div className="cf-input-row">
                          <input
                            className="cf-input"
                            type="text"
                            placeholder="e.g. Cascadia Code, Victor Mono..."
                            value={googleFontInput}
                            onChange={e => setGoogleFontInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddGoogleFont(); }}
                            disabled={fontLoading}
                            spellCheck={false}
                            autoFocus
                          />
                          <button
                            className="cf-add-btn"
                            onClick={handleAddGoogleFont}
                            disabled={fontLoading || !googleFontInput.trim()}
                          >
                            {fontLoading ? 'Loading...' : '+ Add'}
                          </button>
                        </div>
                        <div style={{ fontSize: 11, color: t.textDim }}>
                          Enter the exact name from <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer" style={{ color: accent, textDecoration: 'none' }}>fonts.google.com</a>
                        </div>
                      </div>

                      <div className="cf-divider-line">or</div>

                      {/* Upload Font File */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '1px' }}>Upload Font File</div>
                        <div
                          className={`cf-dropzone ${dragOver ? 'drag-over' : ''}`}
                          onClick={() => fontFileInputRef.current?.click()}
                          onDrop={handleFileDrop}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                        >
                          <div className="cf-dropzone-icon">📁</div>
                          <div className="cf-dropzone-text">
                            {fontLoading ? 'Processing...' : 'Drop a font file here, or click to browse'}
                          </div>
                          <div className="cf-dropzone-hint">
                            .ttf · .woff · .woff2 · .otf — max 2MB
                          </div>
                        </div>
                        <input
                          ref={fontFileInputRef}
                          type="file"
                          accept=".ttf,.woff,.woff2,.otf"
                          style={{ display: 'none' }}
                          onChange={e => {
                            if (e.target.files?.[0]) handleUploadFont(e.target.files[0]);
                            e.target.value = '';
                          }}
                        />
                      </div>

                      {/* Font message */}
                      {fontMsg.text && (
                        <div className={`cf-msg ${fontMsg.type}`}>
                          {fontMsg.type === 'success' ? '✓' : '⚠'} {fontMsg.text}
                        </div>
                      )}

                      <button className="add-font-close" onClick={() => setShowAddFontModal(false)}>
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ======= SHORTCUTS TAB ======= */}
            {activeTab === "shortcuts" && (
              <div className="settings-card">
                <h2 className="settings-card-title">Keyboard Shortcuts & Controls</h2>
                {SHORTCUTS.map((s, i) => (
                  <div className="shortcut-row" key={i}>
                    <span className="shortcut-key">{s.keys}</span>
                    <span className="shortcut-desc">{s.desc}</span>
                  </div>
                ))}
                <div style={{ paddingTop: 12, fontSize: 12, color: t.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                  Tip: Use the language and length selectors in the control bar to change what code you're practicing.
                </div>
              </div>
            )}

            {/* ======= ABOUT TAB ======= */}
            {activeTab === "about" && (
              <>
                {/* Hero / Identity */}
                <div className="settings-card">
                  <div className="about-section">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <img src="/logo.jpeg" alt="Logo" style={{ width: 56, height: 56, borderRadius: 12, border: `1px solid ${t.border}` }} />
                      <div>
                        <div className="about-heading">codi<span style={{ color: accent }}>stic</span></div>
                        <div style={{ fontSize: 13, color: t.textMuted, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>v1.3.0 · Protect your flow state</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <p className="about-text" style={{ fontWeight: 600, color: accent, fontStyle: 'italic', fontSize: 15 }}>
                        Traditional typing tests measure how fast you can type English.{"\n"}Codistic measures how fast you can think in code.
                      </p>
                    </div>
                  </div>
                </div>

                {/* The Origin Story */}
                <div className="settings-card">
                  <h2 className="settings-card-title">The Origin Story</h2>
                  <div className="about-section" style={{ gap: 14 }}>
                    <p className="about-text">
                      It started with a frustration every developer knows but rarely talks about.
                    </p>
                    <p className="about-text">
                      I was in the middle of a coding sprint, deep in a React component, wiring up state, writing arrow functions,
                      destructuring props, and I realized something: <strong style={{ color: t.text }}>my fingers were the bottleneck, not my brain.</strong> I knew
                      exactly what I wanted to write. The logic was clear in my head. But my hands kept stumbling over the same characters:
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: accent, padding: '2px 6px', background: `${accent}12`, borderRadius: 4 }}> {'{'} {'}'} ( ) =&gt; [ ] === &amp;&amp; || </span>
                    </p>
                    <p className="about-text">
                      So I did what any developer would do: I went looking for a typing trainer. I found dozens. MonkeyType, TypeRacer, Keybr,
                      10FastFingers. They were great at one thing: <em>English prose</em>. I could type "the quick brown fox" at 90 WPM all day long.
                      But the moment I sat down to actually code? My speed dropped to half. The symbols, the indentation, the brackets nested three levels
                      deep, none of that was being practiced. <strong style={{ color: t.text }}>Not a single typing trainer was designed for the way developers actually type.</strong>
                    </p>
                    <p className="about-text">
                      That's when the idea hit me. What if there was a typing trainer that didn't use random sentences or dictionary words, but used
                      <strong style={{ color: t.text }}> real code from real repositories</strong>? Code with actual syntax, actual indentation patterns, actual symbol density?
                      A tool where practicing typing meant practicing the exact muscle memory you need when you're building software?
                    </p>
                    <p className="about-text" style={{ color: t.text, fontWeight: 500 }}>
                      That's how Codistic was born.
                    </p>
                  </div>
                </div>

                {/* The Problem */}
                <div className="settings-card">
                  <h2 className="settings-card-title">The Problem We Solve</h2>
                  <div className="about-section" style={{ gap: 14 }}>
                    <p className="about-text">
                      Here's a fact most typing tests ignore: <strong style={{ color: t.text }}>code is not English.</strong>
                    </p>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '8px 0'
                    }}>
                      {[
                        { label: "Traditional Typing Tests", items: ["Dictionary words & sentences", "No special characters", "No indentation", "No bracket matching", "No real-world context"], bad: true },
                        { label: "Codistic", items: ["Real GitHub source code", "Full symbol coverage: => {} [] ()", "Tab indentation & newlines", "Nested syntax patterns", "Actual production code context"], bad: false },
                      ].map((col, ci) => (
                        <div key={ci} style={{
                          padding: 16, borderRadius: 10,
                          background: col.bad ? t.surfaceAlt : `${accent}08`,
                          border: `1px solid ${col.bad ? t.border : accent + '30'}`,
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: col.bad ? t.textMuted : accent, fontFamily: "'JetBrains Mono', monospace", marginBottom: 10, letterSpacing: 0.5 }}>
                            {col.label}
                          </div>
                          {col.items.map((item, ii) => (
                            <div key={ii} style={{ fontSize: 12, color: col.bad ? t.textDim : t.textMuted, lineHeight: 1.9, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 10, color: col.bad ? t.textDim : accent }}>{col.bad ? "✕" : "✓"}</span> {item}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    <p className="about-text">
                      When you type code, you're not just pressing letter keys. You're constantly reaching for Shift, navigating brackets, managing whitespace,
                      and mentally parsing structure. <strong style={{ color: t.text }}>Those micro-movements add up.</strong> A developer who codes 8 hours a day can
                      spend hundreds of hours per year on keystrokes that no traditional typing test ever practices.
                    </p>
                  </div>
                </div>

                {/* How It Works */}
                <div className="settings-card">
                  <h2 className="settings-card-title">How Codistic Works</h2>
                  <div className="about-section" style={{ gap: 14 }}>
                    <p className="about-text">
                      Codistic pulls real, production-quality code snippets directly from <strong style={{ color: t.text }}>top-tier open-source repositories on GitHub</strong>.
                      Every snippet you type is actual code that someone wrote to solve a real problem, not a contrived exercise or a random string of characters.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '4px 0' }}>
                      {[
                        { step: "01", title: "Choose Your Language", desc: "Pick from Python, JavaScript, Java, C++, Go, or Rust. Each language has its own unique rhythm of symbols and patterns." },
                        { step: "02", title: "Select Difficulty", desc: "Short snippets for quick warm-ups, medium for focused practice, or full-length functions for deep sessions." },
                        { step: "03", title: "Type Real Code", desc: "Every character matters: semicolons, arrow functions, template literals, ternary operators. This is what real coding feels like." },
                        { step: "04", title: "Track Your Growth", desc: "Watch your WPM climb, your accuracy tighten, and your streak grow. All synced to your cloud account." },
                      ].map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                            background: `${accent}15`, border: `1px solid ${accent}30`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: accent
                          }}>{s.step}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{s.title}</div>
                            <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.5, marginTop: 2 }}>{s.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="about-text">
                      You can also load <strong style={{ color: t.text }}>any public code file from the web</strong> using the Custom URL loader. Paste a GitHub link or any raw file URL
                      and start typing it immediately. Practice your own codebase, your team's style guide, or that open-source library you've been wanting to learn.
                    </p>
                  </div>
                </div>

                {/* Core Features */}
                <div className="settings-card">
                  <h2 className="settings-card-title">What Sets Codistic Apart</h2>
                  <div className="about-section" style={{ gap: 14 }}>
                    {[
                      { title: "Symbol-First Training", desc: "Unlike every other typing trainer, Codistic was built from day one around the characters developers actually use. Curly braces, arrow functions, semicolons, ternary operators: the keys that slow you down the most are the ones you practice the most." },
                      { title: "Fresh Snippets, Always", desc: "Snippets are pulled live from GitHub's vast ecosystem of open-source projects. You'll never run out of material, and every session exposes you to new coding patterns and styles." },
                      { title: "11 Premium Themes", desc: "From the deep blacks of Monochrome to the warm tones of Gruvbox, from the electric glow of Dracula to the clean minimalism of Paper. Every theme is hand-tuned for extended coding sessions. Your eyes deserve better than a white page with black text." },
                      { title: "Real-Time Performance Analytics", desc: "WPM, accuracy, time elapsed, and progress, all tracked live as you type. Your performance data is visualized in beautiful charts, heatmaps, and streak trackers on your personal statistics dashboard." },
                      { title: "Dynamic Background Engine", desc: "As your WPM increases, the background comes alive with falling code symbols that accelerate with your typing speed. It's a subtle, immersive detail that makes every session feel alive." },
                      { title: "Cloud-Synced Progress", desc: "Sign in once and your entire history, every session, every stat, every preference, follows you across devices. Your streak, your level, your growth: all persistent." },
                      { title: "Custom URL Loader", desc: "Paste any public code URL and type it. GitHub files are auto-converted to raw URLs. Practice your own projects, study open-source codebases, or challenge yourself with unfamiliar languages." },
                      { title: "Custom Fonts", desc: "Choose from 6 built-in monospace fonts, add any Google Font by name, or upload your own .ttf/.woff/.woff2/.otf files. Your custom fonts are saved locally and available instantly on reload." },
                    ].map((f, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{f.title}</div>
                        <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>{f.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* The Philosophy */}
                <div className="settings-card">
                  <h2 className="settings-card-title">The Philosophy</h2>
                  <div className="about-section" style={{ gap: 14 }}>
                    <p className="about-text">
                      There's a state that every programmer chases: <strong style={{ color: t.text }}>Flow</strong>. That moment when the code just
                      pours out of you, when your fingers move faster than your conscious thoughts, when the boundary between you and the machine dissolves.
                    </p>
                    <p className="about-text">
                      Flow is fragile. Every time you hesitate on a keystroke, fumbling for a curly brace, second-guessing where the pipe symbol is,
                      losing your rhythm to a semicolon, you break it. And once it's broken, it takes minutes to get back.
                    </p>
                    <p className="about-text">
                      <strong style={{ color: t.text }}>Codistic exists to protect your flow state.</strong> By training the mechanical, muscle-memory layer of coding,
                      we free your mind to focus on what actually matters: logic, architecture, creativity. We don't just want you to type faster.
                      We want your fingers to disappear, so that the only thing left is <em>you</em> and the problem you're solving.
                    </p>
                    <p className="about-text" style={{ fontStyle: 'italic', color: accent, fontWeight: 500, marginTop: 4 }}>
                      When the keyboard becomes invisible, the code becomes effortless.
                    </p>
                  </div>
                </div>

                {/* Built By */}
                <div className="settings-card">
                  <h2 className="settings-card-title">Built By a Developer, For Developers</h2>
                  <div className="about-section" style={{ gap: 14 }}>
                    <p className="about-text">
                      Codistic isn't a corporate product or a VC-funded startup. It's a <strong style={{ color: t.text }}>solo project</strong>, built from scratch by a developer
                      who was tired of switching between a prose typing trainer and an actual code editor and feeling like they were practicing two completely different skills.
                    </p>
                    <p className="about-text">
                      Every pixel, every animation, every theme, every line of code in this application was written with one question in mind:
                      <em style={{ color: t.text }}> "Would I actually want to use this every day?"</em> If the answer was no, it got redesigned.
                    </p>
                    <p className="about-text">
                      The aesthetics matter because <strong style={{ color: t.text }}>the environment you practice in shapes how you feel about practicing</strong>.
                      A beautiful tool gets used. An ugly one gets forgotten. Codistic is designed to be the kind of app you actually open,
                      not the kind you bookmark and never return to.
                    </p>
                  </div>
                </div>

                {/* Tech & Credits */}
                <div className="settings-card">
                  <h2 className="settings-card-title">Technology & Credits</h2>
                  <div className="about-section" style={{ gap: 14 }}>
                    <p className="about-text">
                      Codistic is built with <strong style={{ color: t.text }}>React</strong> and <strong style={{ color: t.text }}>Vite</strong>, deployed on <strong style={{ color: t.text }}>Vercel</strong>,
                      with <strong style={{ color: t.text }}>Firebase</strong> powering authentication and cloud persistence. Code snippets are sourced live from the
                      <strong style={{ color: t.text }}> GitHub API</strong>, ensuring an endlessly fresh library of real-world challenges.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                      {["React", "Vite", "Firebase Auth", "Firestore", "GitHub API", "Recharts", "Vercel"].map(tech => (
                        <span key={tech} className="about-badge">{tech}</span>
                      ))}
                    </div>
                    <p className="about-text" style={{ marginTop: 8 }}>
                      Our themes draw inspiration from the iconic color schemes loved by the developer community: <em>Dracula</em>, <em>Nord</em>,
                      <em>Tokyo Night</em>, <em>Catppuccin</em>, <em>Gruvbox</em>, and <em>Solarized</em>, each carefully adapted to ensure
                      readability and visual comfort during extended sessions.
                    </p>
                    <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 16, marginTop: 8 }}>
                      <p style={{ fontSize: 12, color: t.textDim, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.8 }}>
                        {new Date().getFullYear()} Codistic. Crafted with obsession by a developer{"\n"}who just wanted to type code faster.
                      </p>
                      <p style={{ fontSize: 11, color: t.textDim, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                        Open source on GitHub · Made in India
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ======= CONTACT TAB ======= */}
            {activeTab === "contact" && (
              <>
                <div className="settings-card">
                  <h2 className="settings-card-title">Get In Touch</h2>
                  <div className="about-section">
                    <p className="about-text">
                      Have a question, feature request, or found a bug? We'd love to hear from you.
                      Reach out through any of the channels below.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="settings-card" style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
                    onClick={() => window.open('mailto:ayushforstuff@gmail.com')}
                    onMouseEnter={e => e.currentTarget.style.borderColor = accent}
                    onMouseLeave={e => e.currentTarget.style.borderColor = ''}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {Icons.email(accent)}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>Email Us</div>
                      <div style={{ fontSize: 12, color: t.textMuted, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>ayushforstuff@gmail.com</div>
                    </div>
                  </div>

                  <div className="settings-card" style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
                    onClick={() => window.open('https://github.com/saini07ayush/Codistic', '_blank')}
                    onMouseEnter={e => e.currentTarget.style.borderColor = accent}
                    onMouseLeave={e => e.currentTarget.style.borderColor = ''}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {Icons.github(accent)}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>GitHub</div>
                      <div style={{ fontSize: 12, color: t.textMuted, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>Report issues & contribute</div>
                    </div>
                  </div>

                </div>

                <div className="settings-card">
                  <h2 className="settings-card-title">Send Feedback</h2>
                  <div className="settings-field">
                    <span className="settings-label">Your Message</span>
                    <textarea
                      className="settings-input"
                      placeholder="Tell us what you think, report a bug, or suggest a feature..."
                      rows={5}
                      style={{ resize: 'vertical', fontFamily: "'DM Sans', sans-serif" }}
                    />
                  </div>
                  <button className="btn-save" onClick={() => window.open('mailto:ayushforstuff@gmail.com', '_blank')}>
                    Send via Email
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
