/**
 * RepoTap — Auto Suggestion Engine
 * Infers category/directory, time/space complexity, approach, and tags
 * from problem title, slug, platform tags, and code structure.
 */

import { TAGS } from './utils.js';

// ── Slug / Title Keyword Mappings ──────────────────────────────────────────

const TOPIC_PATTERNS = [
  {
    topic: 'two-pointers',
    tag: 'two-pointer',
    keywords: ['two-sum', '3sum', '4sum', 'container-with-most-water', 'trapping-rain-water', 'sort-colors', 'remove-duplicates', 'move-zeroes', 'valid-palindrome', 'two-pointer', 'squares-of-a-sorted-array', 'boats-to-save-people', 'backspace-string-compare', 'rotate-array'],
    codeRegex: /\b(left\s*<\s*right|l\s*<\s*r|i\s*<\s*j|low\s*<\s*high)\b/i,
    approach: 'Two Pointers technique traversing from boundaries inward to find matching conditions in linear time.',
  },
  {
    topic: 'sliding-window',
    tag: 'sliding-window',
    keywords: ['sliding-window', 'longest-substring', 'minimum-window', 'fruit-into-baskets', 'permutation-in-string', 'maximum-average-subarray', 'longest-repeating-character', 'max-consecutive-ones', 'subarray-product-less-than-k'],
    codeRegex: /\b(window|right\s*-\s*left|\bmax_len\b|\bmin_len\b|while\s+.*\bleft\s*\+=)\b/i,
    approach: 'Sliding Window maintaining a valid window invariant by dynamically expanding right and contracting left.',
  },
  {
    topic: 'binary-search',
    tag: 'binary-search',
    keywords: ['binary-search', 'search-in-rotated', 'find-minimum-in-rotated', 'first-bad-version', 'median-of-two', 'peak-element', 'koko-eating-bananas', 'capacity-to-ship', 'search-a-2d-matrix', 'find-first-and-last', 'guess-number', 'split-array-largest-sum'],
    codeRegex: /\b(while\s+.*<=\s*.*\bmid\s*=|mid\s*=\s*\(|low\s*<=\s*high|left\s*<=\s*right)\b/i,
    approach: 'Binary Search repeatedly halving the search space on a monotonic sorted domain in logarithmic time.',
  },
  {
    topic: 'hashing',
    tag: 'hashing',
    keywords: ['contains-duplicate', 'group-anagrams', 'valid-anagram', 'intersection-of-two', 'subarray-sum', 'longest-consecutive', 'lru-cache', 'two-sum', 'first-unique', 'isomorphic-strings', 'word-pattern', 'brick-wall'],
    codeRegex: /\b(unordered_map|unordered_set|HashMap|HashSet|new Map|new Set|dict\(|defaultdict|Counter|\bseen\s*=\s*[{set]|hash_map)\b/i,
    approach: 'Hash Map / Set lookup storing frequencies or previous values for O(1) average-time queries.',
  },
  {
    topic: 'dynamic-programming',
    tag: 'dp',
    keywords: ['climbing-stairs', 'coin-change', 'longest-increasing-subsequence', 'word-break', 'house-robber', 'unique-paths', 'edit-distance', 'jump-game-ii', 'decode-ways', 'maximal-square', 'target-sum', 'partition-equal-subset', 'knapsack', 'longest-common-subsequence', 'burst-balloons', 'palindrome-partitioning'],
    codeRegex: /\b(dp\s*=\s*\[|dp\[i\]|memo\s*=\s*|@lru_cache|@cache|\bmemoization\b|\btabulation\b)\b/i,
    approach: 'Dynamic Programming computing optimal substructure iteratively / memoized to prevent redundant subproblem work.',
  },
  {
    topic: 'trees',
    tag: 'tree',
    keywords: ['binary-tree', 'invert-tree', 'maximum-depth', 'lowest-common-ancestor', 'diameter-of', 'level-order', 'path-sum', 'same-tree', 'subtree-of-another', 'kth-smallest-element-in-a-bst', 'validate-binary-search-tree', 'symmetric-tree', 'construct-binary-tree'],
    codeRegex: /\b(root\.left|root\.right|TreeNode|tree_node|curr\.left|curr\.right|root->left|root->right)\b/i,
    approach: 'Binary Tree recursive Depth-First / Breadth-First traversal visiting nodes and aggregating subtree results.',
  },
  {
    topic: 'graphs',
    tag: 'graph',
    keywords: ['course-schedule', 'number-of-islands', 'clone-graph', 'pacific-atlantic', 'surrounded-regions', 'graph-valid-tree', 'network-delay', 'redundant-connection', 'cheapest-flights', 'reconstruct-itinerary', 'word-ladder', 'rotting-oranges'],
    codeRegex: /\b(adj|graph\[|visited|in_degree|indegree|dijkstra|topological|bfs\(|dfs\(.*matrix)\b/i,
    approach: 'Graph traversal tracking visited vertices to identify connected components, cycles, or shortest paths.',
  },
  {
    topic: 'stack',
    tag: 'stack',
    keywords: ['valid-parentheses', 'daily-temperatures', 'min-stack', 'evaluate-reverse-polish', 'generate-parentheses', 'largest-rectangle-in-histogram', 'asteroid-collision', 'online-stock-span', 'decode-string'],
    codeRegex: /\b(stack\s*=\s*\[|stack\.append|stack\.push|stack\.pop|\bmonotone_stack\b|\bmonotonic_stack\b)\b/i,
    approach: 'Monotonic Stack / LIFO tracking to process matching boundaries and maintain ordered candidates.',
  },
  {
    topic: 'linked-list',
    tag: 'linked-list',
    keywords: ['linked-list', 'reverse-list', 'merge-two-sorted-lists', 'remove-nth-node', 'reorder-list', 'copy-list-with-random-pointer', 'add-two-numbers', 'intersection-of-two-linked', 'palindrome-linked-list'],
    codeRegex: /\b(head\.next|ListNode|curr\.next|dummy\.next|head->next|slow\.next|fast\.next)\b/i,
    approach: 'Linked List pointer manipulation with dummy head and traversal pointers.',
  },
  {
    topic: 'heap',
    tag: 'heap',
    keywords: ['kth-largest', 'top-k', 'merge-k-sorted', 'find-median-from-data-stream', 'task-scheduler', 'k-closest-points', 'reorganize-string'],
    codeRegex: /\b(heapq|heappush|heappop|PriorityQueue|priority_queue)\b/i,
    approach: 'Heap / Priority Queue maintaining top-k elements dynamically in logarithmic time per insertion.',
  },
  {
    topic: 'greedy',
    tag: 'greedy',
    keywords: ['jump-game', 'gas-station', 'assign-cookies', 'lemonade-change', 'partition-labels', 'candy', 'hand-of-straights', 'dota2-senate'],
    codeRegex: /\b(greedy|sort\(|sorted\(|intervals|curr_end|farthest)\b/i,
    approach: 'Greedy choice property making locally optimal selections at each step to reach a global optimum.',
  },
  {
    topic: 'backtracking',
    tag: 'backtracking',
    keywords: ['subsets', 'permutations', 'combination-sum', 'n-queens', 'generate-parentheses', 'word-search', 'sudoku-solver', 'palindrome-partitioning'],
    codeRegex: /\b(backtrack\(|path\.pop|path\.append|visited\.remove|\bres\.append\(path\[:\]\))\b/i,
    approach: 'Backtracking recursion exploring state space trees with decision choices and state restoration upon return.',
  },
  {
    topic: 'bit-manipulation',
    tag: 'bit-manipulation',
    keywords: ['single-number', 'number-of-1-bits', 'counting-bits', 'reverse-bits', 'missing-number', 'sum-of-two-integers'],
    codeRegex: /\b(<<|>>|\^|&=|\|=|\b0x[0-9a-fA-F]+\b|\bn\s*&\s*\(n\s*-\s*1\))\b/i,
    approach: 'Bitwise operations (XOR, masking, bit shifting) for efficient constant/linear bit-level computation.',
  },
  {
    topic: 'matrix',
    tag: 'matrix',
    keywords: ['matrix', 'spiral-matrix', 'rotate-image', 'set-matrix-zeroes', 'game-of-life', 'search-a-2d-matrix'],
    codeRegex: /\b(grid\[r\]\[c\]|matrix\[i\]\[j\]|len\(matrix\)|grid\.length)\b/i,
    approach: '2D Matrix traversal with row/column boundary simulation.',
  },
  {
    topic: 'math',
    tag: 'math',
    keywords: ['palindrome-number', 'powx-n', 'sqrtx', 'roman-to-integer', 'integer-to-roman', 'reverse-integer', 'happy-number', 'excel-sheet-column'],
    codeRegex: /\b(math\.sqrt|math\.floor|\bpow\(|\bdivmod\(|gcd\()\b/i,
    approach: 'Mathematical number property analysis and modular arithmetic.',
  },
];

// ── Time Complexity Heuristics ─────────────────────────────────────────────

function inferTimeComplexity(code, topic) {
  if (!code) return 'O(n)';

  // 3 nested loops
  const threeLoops = /(?:for|while)[^{}\n]*\{[^}]*(?:for|while)[^{}\n]*\{[^}]*(?:for|while)/s.test(code) ||
    (code.match(/\bfor\b|\bwhile\b/g) || []).length >= 4;

  if (threeLoops && (topic === 'dynamic-programming' || topic === 'matrix' || code.includes('3sum') || code.includes('4sum'))) {
    return 'O(n³)';
  }

  // 2 nested loops
  const nestedLoops = /(?:for|while)[^\n:]*[:{][^}\n]*(?:for|while)/.test(code) ||
    /for\s+.*in.*:\s*\n\s+for\s+.*in.*/.test(code) ||
    /for\s*\([^;]+;[^;]+;[^)]+\)\s*\{[^}]*for\s*\([^;]+;[^;]+;[^)]+\)/s.test(code);

  if (nestedLoops) {
    if (topic === 'matrix') return 'O(m × n)';
    return 'O(n²)';
  }

  // Sorting
  const hasSort = /\b(\.sort\(|sorted\(|Arrays\.sort|std::sort|sort_values)\b/.test(code);
  if (hasSort) {
    return 'O(n log n)';
  }

  // Binary Search
  if (topic === 'binary-search' || /\bwhile\s+.*<=\s*.*\bmid\s*=/.test(code)) {
    return 'O(log n)';
  }

  // Tree / Graph traversal
  if (topic === 'trees' || topic === 'graphs') {
    if (topic === 'graphs') return 'O(V + E)';
    return 'O(n)';
  }

  // Backtracking / Exponential
  if (topic === 'backtracking' && !hasSort) {
    return 'O(2ⁿ)';
  }

  // Constant time
  const hasLoop = /\b(for|while)\b/.test(code);
  if (!hasLoop && !code.includes('dfs') && !code.includes('bfs') && !code.includes('recur')) {
    return 'O(1)';
  }

  // Default linear
  return 'O(n)';
}

// ── Space Complexity Heuristics ────────────────────────────────────────────

function inferSpaceComplexity(code, topic) {
  if (!code) return 'O(1)';

  // Matrix or 2D DP
  if (/\bdp\s*=\s*\[\[|\bvector<vector<|\bint\[\]\[\]/.test(code)) {
    return topic === 'matrix' ? 'O(m × n)' : 'O(n²)';
  }

  // Linear space: Hash map, set, 1D DP, queue, stack, recursion
  const hasLinearSpace = /\b(dp\s*=\s*\[|unordered_map|HashMap|new Map|new Set|dict\(|set\(|defaultdict|Counter|vector<|ArrayList|stack\s*=\s*\[|deque\()\b/.test(code) ||
    topic === 'trees' || topic === 'graphs' || topic === 'hashing' || topic === 'stack' || topic === 'heap';

  if (hasLinearSpace) {
    return 'O(n)';
  }

  // In-place pointer modifications
  const inPlace = /\b(left|right|l|r|low|high|i|j|curr|ans|res|count)\b/.test(code);
  if (inPlace) {
    return 'O(1)';
  }

  return 'O(1)';
}

// ── Main Auto Suggestion Function ──────────────────────────────────────────

export function autoSuggest(solution) {
  const title = (solution?.title || '').toLowerCase();
  const slug = (solution?.slug || '').toLowerCase();
  const code = solution?.code || '';
  const domain = (solution?.domain || '').toLowerCase();
  const rawPlatformTags = (solution?.tags || solution?.topicTags || []).map(t => String(t).toLowerCase());

  let matchedPattern = null;

  // 1. Check title and slug against known keywords
  for (const p of TOPIC_PATTERNS) {
    if (p.keywords.some(k => slug.includes(k) || title.includes(k.replace(/-/g, ' ')))) {
      matchedPattern = p;
      break;
    }
  }

  // 2. Check platform tags if any
  if (!matchedPattern && rawPlatformTags.length > 0) {
    for (const p of TOPIC_PATTERNS) {
      if (rawPlatformTags.some(t => t.includes(p.tag) || t.includes(p.topic))) {
        matchedPattern = p;
        break;
      }
    }
  }

  // 3. Check code regex
  if (!matchedPattern && code) {
    for (const p of TOPIC_PATTERNS) {
      if (p.codeRegex && p.codeRegex.test(code)) {
        matchedPattern = p;
        break;
      }
    }
  }

  // 4. Check domain (HackerRank)
  if (!matchedPattern && domain && domain !== 'general') {
    matchedPattern = TOPIC_PATTERNS.find(p => p.topic.includes(domain) || domain.includes(p.topic));
  }

  const topic = matchedPattern ? matchedPattern.topic : 'algorithms';
  const primaryTag = matchedPattern ? matchedPattern.tag : 'array';

  // Gather tags
  const suggestedTags = [primaryTag];
  // Add secondary tags if found
  for (const p of TOPIC_PATTERNS) {
    if (p.tag !== primaryTag && suggestedTags.length < 3) {
      if (p.codeRegex && p.codeRegex.test(code)) {
        suggestedTags.push(p.tag);
      }
    }
  }
  suggestedTags.push('optimized');

  // Filter against valid known TAGS in utils
  const validTagIds = new Set(TAGS.map(t => t.id));
  const finalTags = suggestedTags.filter(id => validTagIds.has(id));

  // Infer complexities
  const timeComplexity = inferTimeComplexity(code, topic);
  const spaceComplexity = inferSpaceComplexity(code, topic);
  const approach = matchedPattern ? matchedPattern.approach : `Optimal solution implementing ${topic.replace(/-/g, ' ')} technique.`;

  return {
    suggestedDirectory: topic,
    timeComplexity,
    spaceComplexity,
    approach,
    suggestedTags: finalTags.length > 0 ? finalTags : ['array'],
  };
}
