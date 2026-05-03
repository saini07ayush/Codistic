// githubSnippets.js
// Place this in src/services/githubSnippets.js

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

const HEADERS = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github.v3+json",
};

// Popular MIT-licensed repos per language
const REPO_SOURCES = {
  python: [
    { owner: "TheAlgorithms", repo: "Python", path: "sorts" },
    { owner: "TheAlgorithms", repo: "Python", path: "data_structures" },
  ],
  javascript: [
    { owner: "TheAlgorithms", repo: "JavaScript", path: "Data-Structures" },
    { owner: "trekhleb", repo: "javascript-algorithms", path: "src/algorithms/sorting" },
  ],
  java: [
    { owner: "TheAlgorithms", repo: "Java", path: "src/main/java/com/thealgorithms/sorts" },
  ],
  cpp: [
    { owner: "TheAlgorithms", repo: "C-Plus-Plus", path: "sorting" },
  ],
  go: [
    { owner: "TheAlgorithms", repo: "Go", path: "sort" },
  ],
  rust: [
    { owner: "TheAlgorithms", repo: "Rust", path: "src/sorting" },
  ],
};

// Fetch file list from a GitHub repo path
async function fetchFileList(owner, repo, path) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

// Fetch raw content of a single file
async function fetchFileContent(downloadUrl) {
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error("Failed to fetch file content");
  return res.text();
}

// Remove docstrings from Python code
function stripDocstrings(code) {
  // Remove triple-quoted strings (docstrings)
  return code.replace(/"""[\s\S]*?"""/g, "").replace(/'''[\s\S]*?'''/g, "");
}

// Normalize indentation: remove common leading whitespace
function normalizeIndent(lines) {
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return lines;
  const minIndent = Math.min(...nonEmpty.map((l) => l.match(/^(\s*)/)[1].length));
  return lines.map((l) => l.slice(minIndent));
}

// Extract clean functions from raw code
function extractSnippets(rawCode, length = "short") {
  // Strip docstrings first
  let code = stripDocstrings(rawCode);

  if (length === "long") {
    const lines = normalizeIndent(code.split("\n"));
    const clean = lines
      .join("\n")
      .replace(/^\s*\/\/.*/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*#.*/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return [clean.split("\n").slice(0, 150).join("\n")];
  }

  const lines = code.split("\n");
  const snippets = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect function definitions (works for Python, JS, Java, Go, Rust, C++)
    const isFuncStart =
      /^(def |function |public |private |protected |static |func |fn |void |int |bool |string |auto )/.test(line.trim()) &&
      line.trim().length > 5;

    if (isFuncStart) {
      const minLines = length === "short" ? 5 : 15;
      const maxLines = length === "short" ? 15 : 35;

      let block = [];
      let j = i;
      let braceDepth = 0;
      let started = false;

      while (j < lines.length && block.length <= maxLines) {
        const l = lines[j];
        block.push(l);

        for (const ch of l) {
          if (ch === "{") { braceDepth++; started = true; }
          if (ch === "}") braceDepth--;
        }

        if (!l.includes("{") && block.length > 1 && l.trim() === "" && started === false) break;
        if (started && braceDepth === 0 && block.length > 1) break;

        j++;
      }

      // Normalize indentation so first line starts at col 0
      const normalized = normalizeIndent(block);

      const clean = normalized
        .join("\n")
        .replace(/^\s*\/\/.*/gm, "")      // remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, "") // remove block comments
        .replace(/^\s*#.*/gm, "")         // remove Python comments
        .replace(/\n{3,}/g, "\n\n")       // collapse excess blank lines
        .trim();

      if (clean.split("\n").length >= minLines) {
        snippets.push(clean);
      }

      i = j + 1;
    } else {
      i++;
    }
  }

  return snippets;
}

// Main function: get a random snippet for a language
export async function getSnippet(language = "python", length = "short") {
  const lang = language.toLowerCase();
  const sources = REPO_SOURCES[lang];

  if (!sources) throw new Error(`Language "${language}" not supported`);

  // Pick a random source
  const source = sources[Math.floor(Math.random() * sources.length)];

  try {
    const ext = { python: ".py", javascript: ".js", java: ".java", cpp: ".cpp", go: ".go", rust: ".rs" };
    const targetExt = ext[lang] || ".py";
    let file = null;
    let currentPath = source.path;

    for (let attempts = 0; attempts < 4; attempts++) {
      const files = await fetchFileList(source.owner, source.repo, currentPath);

      const codeFiles = files.filter(
        (f) =>
          f.type === "file" &&
          f.name.endsWith(targetExt) &&
          f.name !== "__init__.py" &&
          f.name !== "mod.rs" &&
          f.size > 500
      );

      if (codeFiles.length > 0) {
        file = codeFiles[Math.floor(Math.random() * codeFiles.length)];
        break;
      }

      // If no valid files, try entering a random subdirectory
      const dirs = files.filter((f) => f.type === "dir");
      if (dirs.length === 0) break;
      currentPath = dirs[Math.floor(Math.random() * dirs.length)].path;
    }

    if (!file) throw new Error("No code files found");
    const raw = await fetchFileContent(file.download_url);

    const snippets = extractSnippets(raw, length);

    if (snippets.length === 0) {
      const fallbackLengths = { short: 15, medium: 30, long: 150 };
      const maxLines = fallbackLengths[length] || 15;
      // fallback: return lines of the file
      return {
        code: raw.split("\n").slice(0, maxLines).join("\n").trim(),
        source: `github.com/${source.owner}/${source.repo}`,
        file: file.name,
        language: lang,
      };
    }

    const chosen = snippets[Math.floor(Math.random() * snippets.length)];

    return {
      code: chosen,
      source: `github.com/${source.owner}/${source.repo}`,
      file: file.name,
      language: lang,
    };
  } catch (err) {
    console.error("getSnippet error:", err);
    throw err;
  }
}

// Preload multiple snippets for smooth UX
export async function preloadSnippets(language = "python", length = "short", count = 3) {
  const results = await Promise.allSettled(
    Array.from({ length: count }, () => getSnippet(language, length))
  );
  return results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);
}
