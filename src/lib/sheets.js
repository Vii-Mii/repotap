/**
 * RepoTap — DSA Sheets
 * Static sheet definitions + progress computation on top of rt_sheet_progress.
 */

import blind74 from '../data/sheets/blind74.json';
import striver150 from '../data/sheets/striver150.json';
import neetcode150 from '../data/sheets/neetcode150.json';
import { getSheetProgress, markSheetSolved } from './storage.js';

export const SHEETS = [blind74, striver150, neetcode150];

// slug → [sheetIds] lookup for auto-marking from accepted submissions
const slugIndex = new Map();
for (const sheet of SHEETS) {
  for (const problem of sheet.problems) {
    if (!problem.slug) continue;
    if (!slugIndex.has(problem.slug)) slugIndex.set(problem.slug, []);
    slugIndex.get(problem.slug).push(sheet.id);
  }
}

export function getSheets() {
  return SHEETS;
}

/** Stable progress-map key: the LeetCode slug, or a synthetic key for TUF-only items. */
export function problemKey(problem) {
  return problem.slug || `__manual_${problem.title}`;
}

export function getSheetById(id) {
  return SHEETS.find(s => s.id === id) || null;
}

/**
 * Marks every sheet containing `slug` as solved. Returns the list of sheet
 * ids that were updated (for tests / notifications).
 */
export async function markSolvedForSlug(slug, source = 'auto') {
  if (!slug || slug === 'unknown') return [];
  const sheetIds = slugIndex.get(slug) || [];
  for (const sheetId of sheetIds) {
    await markSheetSolved(sheetId, slug, source);
  }
  return sheetIds;
}

/**
 * Progress for one sheet:
 * { total, solved, percent, byDifficulty: { Easy: {total, solved} },
 *   topics: [{ name, total, solved, problems: [{...problem, solved, solvedAt, source}] }] }
 */
export function computeSheetProgress(sheet, progress) {
  const sheetProgress = progress[sheet.id] || {};
  const byDifficulty = {};
  const topics = [];
  let solved = 0;

  for (const problem of sheet.problems) {
    const entry = sheetProgress[problemKey(problem)] || null;
    const isSolved = Boolean(entry);
    if (isSolved) solved += 1;

    const diff = problem.difficulty || 'Medium';
    if (!byDifficulty[diff]) byDifficulty[diff] = { total: 0, solved: 0 };
    byDifficulty[diff].total += 1;
    if (isSolved) byDifficulty[diff].solved += 1;

    let topic = topics.find(t => t.name === problem.topic);
    if (!topic) {
      topic = { name: problem.topic, total: 0, solved: 0, problems: [] };
      topics.push(topic);
    }
    topic.total += 1;
    if (isSolved) topic.solved += 1;
    topic.problems.push({ ...problem, solved: isSolved, solvedAt: entry?.solvedAt || null, source: entry?.source || null });
  }

  const total = sheet.problems.length;
  return {
    total,
    solved,
    percent: total ? Math.round((solved / total) * 100) : 0,
    byDifficulty,
    topics,
  };
}

/** Progress for all sheets at once. */
export async function computeAllSheetProgress() {
  const progress = await getSheetProgress();
  return SHEETS.map(sheet => ({ sheet, progress: computeSheetProgress(sheet, progress) }));
}

/** leetcode.com/problems/<slug> URL for a problem, when it exists on LeetCode. */
export function problemUrl(problem) {
  return problem.slug ? `https://leetcode.com/problems/${problem.slug}/` : null;
}