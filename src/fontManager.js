// ============================================================
// fontManager.js — Custom Font Manager for Codistic
// Handles two font sources:
//   1. Google Fonts (by name) — stored in localStorage
//   2. Uploaded font files — stored in IndexedDB as base64
// ============================================================

const GOOGLE_FONTS_KEY = "codistic-custom-google-fonts";
const DB_NAME = "codistic-fonts";
const DB_VERSION = 1;
const STORE_NAME = "uploaded";
const MAX_UPLOADED_FONTS = 10;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_EXTENSIONS = [".ttf", ".woff", ".woff2", ".otf"];
const FONT_FORMAT_MAP = {
  ".ttf": "truetype",
  ".woff": "woff",
  ".woff2": "woff2",
  ".otf": "opentype",
};

// ─── IndexedDB Helpers ──────────────────────────────────────

function openFontDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "name" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Google Fonts ───────────────────────────────────────────

/**
 * Get all saved Google Font names from localStorage.
 */
export function getGoogleFonts() {
  try {
    return JSON.parse(localStorage.getItem(GOOGLE_FONTS_KEY)) || [];
  } catch {
    return [];
  }
}

/**
 * Inject a single Google Font <link> tag.
 * Returns the <link> element for cleanup.
 */
function injectGoogleFontLink(fontName) {
  const id = `gfont-${fontName.replace(/\s+/g, "-").toLowerCase()}`;
  // Don't duplicate
  if (document.getElementById(id)) return document.getElementById(id);

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;700&display=swap`;
  document.head.appendChild(link);
  return link;
}

/**
 * Remove a Google Font <link> tag.
 */
function removeGoogleFontLink(fontName) {
  const id = `gfont-${fontName.replace(/\s+/g, "-").toLowerCase()}`;
  const el = document.getElementById(id);
  if (el) el.remove();
}

/**
 * Load all saved Google Fonts on app startup.
 */
export function loadAllGoogleFonts() {
  const fonts = getGoogleFonts();
  fonts.forEach((name) => injectGoogleFontLink(name));
}

/**
 * Add a new Google Font by name.
 * Validates by trying to load it, then saves to localStorage.
 * Returns { success, error? }
 */
export async function addGoogleFont(fontName) {
  const trimmed = fontName.trim();
  if (!trimmed) return { success: false, error: "Please enter a font name." };

  // Check if already added
  const existing = getGoogleFonts();
  if (existing.some((f) => f.toLowerCase() === trimmed.toLowerCase())) {
    return { success: false, error: "This font is already added." };
  }

  // Inject the link
  const link = injectGoogleFontLink(trimmed);

  // Wait for the stylesheet to load and verify the font exists
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout")), 6000);
      link.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      link.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("load_error"));
      };
    });

    // Give the browser a moment to parse the stylesheet
    await new Promise((r) => setTimeout(r, 300));

    // Check if the font is actually available using the Font Loading API
    const testString = "abcdefghijklmnopqrstuvwxyz0123456789";
    const loaded = document.fonts.check(`16px '${trimmed}'`, testString);

    if (!loaded) {
      // Try waiting a bit more with document.fonts.ready
      await document.fonts.ready;
      const loadedRetry = document.fonts.check(`16px '${trimmed}'`, testString);
      if (!loadedRetry) {
        removeGoogleFontLink(trimmed);
        return {
          success: false,
          error: `Font "${trimmed}" not found on Google Fonts. Check the exact name.`,
        };
      }
    }
  } catch {
    // Even if the link "failed", Google Fonts often returns valid CSS 
    // for fonts that exist. Check one more time.
    await new Promise((r) => setTimeout(r, 500));
    await document.fonts.ready;
    const finalCheck = document.fonts.check(`16px '${trimmed}'`);
    if (!finalCheck) {
      removeGoogleFontLink(trimmed);
      return {
        success: false,
        error: `Font "${trimmed}" not found on Google Fonts. Check the exact name.`,
      };
    }
  }

  // Save to localStorage
  const fonts = getGoogleFonts();
  fonts.push(trimmed);
  localStorage.setItem(GOOGLE_FONTS_KEY, JSON.stringify(fonts));

  return { success: true };
}

/**
 * Remove a Google Font by name.
 */
export function removeGoogleFont(fontName) {
  removeGoogleFontLink(fontName);
  const fonts = getGoogleFonts().filter(
    (f) => f.toLowerCase() !== fontName.toLowerCase()
  );
  localStorage.setItem(GOOGLE_FONTS_KEY, JSON.stringify(fonts));
}

// ─── Uploaded Fonts (IndexedDB) ─────────────────────────────

/**
 * Get all uploaded font records from IndexedDB.
 * Returns [{ name, format, dataUrl }]
 */
export async function getUploadedFonts() {
  try {
    const db = await openFontDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/**
 * Inject an @font-face rule for an uploaded font.
 */
function injectUploadedFontFace(name, format, dataUrl) {
  const id = `ufont-${name.replace(/\s+/g, "-").toLowerCase()}`;
  // Don't duplicate
  if (document.getElementById(id)) return;

  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    @font-face {
      font-family: '${name}';
      src: url('${dataUrl}') format('${format}');
      font-weight: 100 900;
      font-style: normal;
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Remove an @font-face style tag for an uploaded font.
 */
function removeUploadedFontFace(name) {
  const id = `ufont-${name.replace(/\s+/g, "-").toLowerCase()}`;
  const el = document.getElementById(id);
  if (el) el.remove();
}

/**
 * Load all uploaded fonts from IndexedDB on app startup.
 */
export async function loadAllUploadedFonts() {
  const fonts = await getUploadedFonts();
  fonts.forEach((f) => injectUploadedFontFace(f.name, f.format, f.dataUrl));
}

/**
 * Derive a clean font name from a filename.
 * e.g. "CascadiaCode-Regular.woff2" → "CascadiaCode"
 */
function fontNameFromFile(filename) {
  // Remove extension
  let name = filename.replace(/\.[^.]+$/, "");
  // Remove common suffixes like -Regular, -Bold, etc.
  name = name.replace(/[-_](Regular|Bold|Italic|Light|Medium|SemiBold|Thin|ExtraBold|ExtraLight|Black|Book)$/i, "");
  // Insert spaces before uppercase runs (CascadiaCode → Cascadia Code)
  name = name.replace(/([a-z])([A-Z])/g, "$1 $2");
  // Replace hyphens/underscores with spaces
  name = name.replace(/[-_]+/g, " ").trim();
  return name || "Custom Font";
}

/**
 * Add an uploaded font file.
 * Reads the file, stores in IndexedDB, injects @font-face.
 * Returns { success, name?, error? }
 */
export async function addUploadedFont(file) {
  if (!file) return { success: false, error: "No file selected." };

  // Validate extension
  const ext = "." + file.name.split(".").pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      success: false,
      error: `Unsupported format "${ext}". Use .ttf, .woff, .woff2, or .otf`,
    };
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max is 2MB.`,
    };
  }

  const name = fontNameFromFile(file.name);
  const format = FONT_FORMAT_MAP[ext];

  // Check duplicate
  const existing = await getUploadedFonts();
  if (existing.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
    return { success: false, error: `Font "${name}" is already uploaded.` };
  }

  // Check limit
  if (existing.length >= MAX_UPLOADED_FONTS) {
    return {
      success: false,
      error: `Maximum ${MAX_UPLOADED_FONTS} uploaded fonts reached. Remove one first.`,
    };
  }

  // Read as data URL
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  // Store in IndexedDB
  const db = await openFontDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ name, format, dataUrl });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Inject @font-face
  injectUploadedFontFace(name, format, dataUrl);

  return { success: true, name };
}

/**
 * Remove an uploaded font by name.
 */
export async function removeUploadedFont(fontName) {
  removeUploadedFontFace(fontName);

  try {
    const db = await openFontDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(fontName);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("Failed to remove uploaded font:", e);
  }
}

// ─── Combined API ───────────────────────────────────────────

/**
 * Get all custom fonts (Google + Uploaded) as a unified list.
 * Returns [{ name, type: 'google' | 'uploaded' }]
 */
export async function getAllCustomFonts() {
  const google = getGoogleFonts().map((name) => ({ name, type: "google" }));
  const uploaded = (await getUploadedFonts()).map((f) => ({
    name: f.name,
    type: "uploaded",
  }));
  return [...google, ...uploaded];
}

/**
 * Remove any custom font by name and type.
 */
export async function removeCustomFont(fontName, type) {
  if (type === "google") {
    removeGoogleFont(fontName);
  } else {
    await removeUploadedFont(fontName);
  }
}

/**
 * Build a CSS font-family value from a font name.
 */
export function buildFontFamilyValue(fontName) {
  return `'${fontName}', monospace`;
}

/**
 * Load all custom fonts on app startup.
 */
export async function loadAllCustomFonts() {
  loadAllGoogleFonts();
  await loadAllUploadedFonts();
}
