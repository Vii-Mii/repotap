/**
 * RepoTap — Utility helpers & Constants
 */

export const PLATFORM_META = {
  leetcode: {
    label: 'LeetCode',
    color: '#FFA116',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-400',
  },
  hackerrank: {
    label: 'HackerRank',
    color: '#00EA64',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-400',
  },
  geeksforgeeks: {
    label: 'GeeksForGeeks',
    color: '#2F8D46',
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    textClass: 'text-emerald-700 dark:text-emerald-400',
  },
};

export const DIFFICULTY_COLORS = {
  easy:   'text-green-500 dark:text-green-400',
  medium: 'text-yellow-500 dark:text-yellow-400',
  hard:   'text-red-500 dark:text-red-400',
  unknown: 'text-zinc-400',
};

export const TAGS = [
  // Core Patterns & Algorithms
  { id: 'two-pointer',         label: 'Two Pointers' },
  { id: 'sliding-window',      label: 'Sliding Window' },
  { id: 'hashing',             label: 'Hash Map / Set' },
  { id: 'binary-search',       label: 'Binary Search' },
  { id: 'dp',                  label: 'Dynamic Programming' },
  { id: 'greedy',              label: 'Greedy' },
  { id: 'backtracking',        label: 'Backtracking' },
  { id: 'bfs',                 label: 'BFS (Breadth-First)' },
  { id: 'dfs',                 label: 'DFS (Depth-First)' },
  { id: 'recursion',           label: 'Recursion' },
  { id: 'bit-manipulation',    label: 'Bit Manipulation' },
  { id: 'divide-and-conquer',  label: 'Divide & Conquer' },
  { id: 'topological-sort',    label: 'Topological Sort' },
  { id: 'union-find',          label: 'Union Find' },
  { id: 'math',                label: 'Math' },
  { id: 'sorting',             label: 'Sorting' },
  { id: 'prefix-sum',          label: 'Prefix Sum' },
  { id: 'kadane',              label: "Kadane's Algorithm" },
  { id: 'fast-slow-pointer',   label: 'Fast & Slow Pointers' },
  { id: 'intervals',           label: 'Intervals' },
  { id: 'memoization',         label: 'Memoization' },
  { id: 'tabulation',          label: 'Tabulation' },
  { id: 'bitmask',             label: 'Bitmask' },
  { id: 'counting',            label: 'Counting' },
  { id: 'simulation',          label: 'Simulation' },
  { id: 'number-theory',       label: 'Number Theory' },
  { id: 'combinatorics',       label: 'Combinatorics' },
  { id: 'geometry',            label: 'Geometry' },
  { id: 'string-matching',     label: 'String Matching (KMP / Rabin-Karp)' },
  { id: 'shortest-path',       label: 'Shortest Path' },
  { id: 'dijkstra',            label: "Dijkstra's" },
  { id: 'mst',                 label: 'Minimum Spanning Tree' },
  { id: 'game-theory',         label: 'Game Theory' },
  { id: 'randomized',          label: 'Randomized' },
  { id: 'two-heaps',           label: 'Two Heaps' },
  { id: 'design',              label: 'Design' },

  // Data Structures
  { id: 'array',               label: 'Array' },
  { id: 'string',              label: 'String' },
  { id: 'linked-list',         label: 'Linked List' },
  { id: 'matrix',              label: 'Matrix' },
  { id: 'stack',               label: 'Stack' },
  { id: 'queue',               label: 'Queue' },
  { id: 'monotonic-stack',     label: 'Monotonic Stack' },
  { id: 'heap',                label: 'Heap / Priority Queue' },
  { id: 'tree',                label: 'Binary Tree' },
  { id: 'bst',                 label: 'Binary Search Tree' },
  { id: 'graph',               label: 'Graph' },
  { id: 'trie',                label: 'Trie' },
  { id: 'segment-tree',        label: 'Segment Tree' },
  { id: 'binary-indexed-tree', label: 'Fenwick Tree (BIT)' },
  { id: 'deque',               label: 'Deque' },
  { id: 'doubly-linked-list',  label: 'Doubly Linked List' },
  { id: 'ordered-set',         label: 'Ordered Set' },
  { id: 'hash-table',          label: 'Hash Table' },
  { id: 'database',            label: 'Database / SQL' },

  // Status & Study Markers
  { id: 'learned-today',       label: '📚 Learned Today' },
  { id: 'revisit',             label: '🔁 Revisit' },
  { id: 'interview-ready',     label: '🎯 Interview Ready' },
  { id: 'optimized',           label: '⚡ Optimized' },
  { id: 'contest',             label: '🏆 Contest' },
  { id: 'brute-force',         label: '🔨 Brute Force' },
];

export const COMPLEXITY_PRESETS = [
  'O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(n³)', 'O(2ⁿ)', 'O(n!)',
];

export function formatDate(isoStr) {
  return new Date(isoStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function platformLabel(platform) {
  return PLATFORM_META[platform]?.label || platform;
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

// ── Code Comment Formatter ──────────────────────────────────────────────────

const HASH_LANGS = ['python', 'bash', 'shell', 'ruby', 'r'];

function commentStyle(language) {
  const lang = (language || '').toLowerCase().trim();
  if (HASH_LANGS.some(l => lang === l || lang.startsWith(`${l} `) || lang.startsWith(l + '3'))) return 'hash';
  if (lang.includes('sql')) return 'sql';
  return 'block';
}

/**
 * Creates the commented-out metadata block placed below the solution.
 * Only the fields the user provided are included.
 */
export function formatSolutionComments(metadata, language) {
  const m = metadata || {};
  const entries = [
    ['Time Complexity', m.timeComplexity],
    ['Space Complexity', m.spaceComplexity],
    ['Approach', m.approach],
    ['Tags', m.tags && m.tags.length > 0 ? m.tags.join(', ') : ''],
    ['Notes', m.notes],
  ].filter(([, v]) => v && String(v).trim());

  if (entries.length === 0) return '';

  const lines = entries.flatMap(([label, value]) => {
    const [first, ...rest] = String(value).trim().split('\n');
    return [`${label}: ${first}`, ...rest.map(l => `    ${l}`)];
  });

  const style = commentStyle(language);
  if (style === 'hash') return `\n\n${lines.map(l => `# ${l}`).join('\n')}\n`;
  if (style === 'sql') return `\n\n${lines.map(l => `-- ${l}`).join('\n')}\n`;
  return `\n\n/*\n${lines.map(l => ` * ${l}`).join('\n')}\n */\n`;
}

/**
 * Combines solution code and commented metadata block.
 */
export function buildSingleSolutionContent(code, metadata, language) {
  const cleanCode = (code || '').trim();
  const comments = formatSolutionComments(metadata, language);
  return `${cleanCode}${comments}`;
}

/**
 * Appends a new version below the existing content, separated by a huge line.
 */
export function appendNewVersionContent(existingContent, newCode, metadata, language) {
  const style = commentStyle(language);
  const prefix = style === 'hash' ? '#' : style === 'sql' ? '--' : '//';
  const rule = `${prefix} ${'-'.repeat(80)}`;
  const separator = `\n\n${rule}\n${prefix} Next Solution Version\n${rule}\n\n`;

  const newSolutionBlock = buildSingleSolutionContent(newCode, metadata, language);
  return `${(existingContent || '').trim()}${separator}${newSolutionBlock}`;
}
