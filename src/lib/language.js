/**
 * RepoTap — language → file extension → comment style.
 * The extension is the single source of truth: file name and comment syntax both derive from it.
 */

// Exact names / LeetCode slugs (compared lowercase, spaces removed)
const EXACT = {
  python: 'py', python3: 'py', pythondata: 'py', pandas: 'py',
  javascript: 'js', js: 'js', nodejs: 'js',
  typescript: 'ts',
  java: 'java',
  'c++': 'cpp', cpp: 'cpp',
  c: 'c',
  'c#': 'cs', csharp: 'cs',
  go: 'go', golang: 'go',
  rust: 'rs',
  ruby: 'rb',
  swift: 'swift',
  kotlin: 'kt',
  scala: 'scala',
  php: 'php',
  dart: 'dart',
  r: 'r',
  bash: 'sh', shell: 'sh',
  racket: 'rkt',
  erlang: 'erl',
  elixir: 'ex',
  sql: 'sql', mysql: 'sql', mssql: 'sql', oraclesql: 'sql', postgresql: 'sql',
};

// Variants like "C++14", "Java 8", "Python3Auto" — most specific prefixes first
const PREFIXES = [
  ['javascript', 'js'], ['typescript', 'ts'], ['python', 'py'], ['c++', 'cpp'], ['cpp', 'cpp'],
  ['c#', 'cs'], ['csharp', 'cs'], ['java', 'java'], ['golang', 'go'], ['kotlin', 'kt'],
  ['swift', 'swift'], ['ruby', 'rb'], ['rust', 'rs'], ['php', 'php'], ['scala', 'scala'],
  ['racket', 'rkt'], ['erlang', 'erl'], ['elixir', 'ex'], ['dart', 'dart'], ['bash', 'sh'],
];

export function extensionFromLanguage(language) {
  const l = (language || '').toLowerCase().replace(/\s+/g, '');
  if (!l) return null;
  if (EXACT[l]) return EXACT[l];
  if (l.includes('sql')) return 'sql';
  const hit = PREFIXES.find(([p]) => l.startsWith(p));
  return hit ? hit[1] : null;
}

/** Confident guesses only; returns null when the code is ambiguous. */
export function extensionFromCode(code) {
  const c = code || '';
  if (!c.trim()) return null;

  if (/^\s*(#include\s*[<"]|using namespace\b)|\bstd::|\bvector<|\bunordered_map<|\bpublic:\s*$/m.test(c)) return 'cpp';
  if (/^\s*<\?php/m.test(c)) return 'php';
  if (/^\s*(select|with)\b[\s\S]*\bfrom\b/im.test(c) && !/[{};]\s*$/m.test(c)) return 'sql';
  if (/^\s*class\s+Solution\s*:/m.test(c) || /^\s*(async\s+)?def\s+\w+\s*\(.*\)\s*(->\s*[^:]+)?:\s*$/m.test(c)) return 'py';
  if (/\bimpl\s+Solution\b|\bfn\s+\w+\s*\(/.test(c)) return 'rs';
  const funcLine = c.match(/^\s*func\s+.*$/m);
  if (funcLine) return /->/.test(funcLine[0]) ? 'swift' : 'go';
  if (/\bfun\s+\w+\s*\(/.test(c)) return 'kt';
  if (/\bpublic\s+(static\s+)?\w[\w<>\[\],\s]*\s+\w+\s*\(/.test(c) && /\bclass\s+Solution\b/.test(c)) return 'java';
  if (/\bvar\s+\w+\s*=\s*function\b|\bfunction\s+\w+\s*\(|=>\s*[{(]/.test(c)) return /:\s*(number|string|boolean)\b/.test(c) ? 'ts' : 'js';
  return null;
}

/**
 * Picks the extension for a solution. The language name wins, except when the code is
 * clearly Python while the name says otherwise (or vice versa) — a misread language label.
 */
export function resolveExtension(solution) {
  const fromLang = extensionFromLanguage(solution?.language);
  const fromCode = extensionFromCode(solution?.code);

  if (!fromLang) return fromCode || 'txt';
  if (fromCode && (fromCode === 'py') !== (fromLang === 'py')) return fromCode;
  return fromLang;
}

const LINE_PREFIX = { py: '#', sh: '#', rb: '#', r: '#', ex: '#', sql: '--', rkt: ';', erl: '%' };

/** Line-comment prefix for hash/dash style languages, or null for C-style block comments. */
export function linePrefixFor(ext) {
  return LINE_PREFIX[ext] || null;
}
