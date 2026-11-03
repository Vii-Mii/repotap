/**
 * RepoTap — GitHub REST API Helper
 * Direct REST API integration — no backend required.
 */

import { buildSingleSolutionContent, appendNewVersionContent } from './utils.js';

const GITHUB_API = 'https://api.github.com';

// ── Language → File Extension ─────────────────────────────────────────────

const LANG_EXT = {
  'Python':       'py',
  'Python3':      'py',
  'Python 3':     'py',
  'JavaScript':   'js',
  'TypeScript':   'ts',
  'Java':         'java',
  'C++':          'cpp',
  'C':            'c',
  'C#':           'cs',
  'Go':           'go',
  'Rust':         'rs',
  'Ruby':         'rb',
  'Swift':        'swift',
  'Kotlin':       'kt',
  'Scala':        'scala',
  'PHP':          'php',
  'SQL':          'sql',
  'MySQL':        'sql',
  'PostgreSQL':   'sql',
  'R':            'r',
  'Bash':         'sh',
  'Shell':        'sh',
  'Dart':         'dart',
};

export function getExtension(language) {
  const lang = (language || '').trim();
  if (LANG_EXT[lang]) return LANG_EXT[lang];

  // Platforms report variants like "C++14", "Java 8", "Python 3.10"
  const l = lang.toLowerCase();
  if (l.startsWith('python')) return 'py';
  if (l.startsWith('c++') || l.startsWith('cpp')) return 'cpp';
  if (l.startsWith('c#')) return 'cs';
  if (l.startsWith('javascript') || l.startsWith('node')) return 'js';
  if (l.startsWith('typescript')) return 'ts';
  if (l.startsWith('java')) return 'java';
  if (l.startsWith('golang') || l === 'go' || l.startsWith('go ')) return 'go';
  if (l.startsWith('kotlin')) return 'kt';
  if (l.startsWith('swift')) return 'swift';
  if (l.startsWith('ruby')) return 'rb';
  if (l.startsWith('rust')) return 'rs';
  if (l.startsWith('php')) return 'php';
  if (l.startsWith('scala')) return 'scala';
  if (l.includes('sql')) return 'sql';
  if (l === 'c' || l.startsWith('c ')) return 'c';
  return 'py';
}

// ── File Path Builder ─────────────────────────────────────────────────────

export function buildFilePath(solution, targetDirectory = '') {
  const ext = getExtension(solution.language);
  const slug = (solution.slug || 'solution').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const filename = `${slug}.${ext}`;

  // Clean directory path
  const dir = (targetDirectory || '').trim().replace(/^\/+|\/+$/g, '');

  const fullPath = dir ? `${dir}/${filename}` : filename;
  return { dir, filename, fullPath };
}

// ── GitHub API Calls ──────────────────────────────────────────────────────

const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/');

async function githubRequest(method, path, body, token) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `GitHub API error: ${res.status}`);
  return data;
}

export async function getFile(repo, path, branch, token) {
  try {
    const data = await githubRequest('GET', `/repos/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`, null, token);
    return data;
  } catch (e) {
    if (e.message.includes('Not Found')) return null;
    throw e;
  }
}

export async function putFile(repo, path, content, message, branch, token, sha = null) {
  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch,
  };
  if (sha) body.sha = sha;

  const data = await githubRequest('PUT', `/repos/${repo}/contents/${encodePath(path)}`, body, token);
  return data;
}

// ── Main Commit Function ──────────────────────────────────────────────────

export async function commitToGitHub({ settings, solution, metadata, targetDirectory, versionMode }) {
  const { githubToken, repoFullName, branch = 'main' } = settings;

  // Build target file path: e.g. "two-pointer/two-sum.py"
  const dir = targetDirectory || metadata.targetDirectory || settings.baseDir || '';
  const { fullPath, filename } = buildFilePath(solution, dir);

  // Check if file already exists in repo
  const existingFile = await getFile(repoFullName, fullPath, branch, githubToken);

  let finalContent;
  let commitMessage;

  if (existingFile && versionMode === 'new_version') {
    // Decode existing content safely
    let existingContent = '';
    try {
      existingContent = decodeURIComponent(escape(atob(existingFile.content.replace(/\s/g, ''))));
    } catch (_) {
      existingContent = atob(existingFile.content.replace(/\s/g, ''));
    }

    // Append new solution with separator
    finalContent = appendNewVersionContent(existingContent, solution.code, metadata, solution.language);
    commitMessage = metadata.customMessage ||
      `feat(${solution.platform}): Add new version of ${solution.title}${metadata.timeComplexity ? ` | ${metadata.timeComplexity}` : ''}`;
  } else {
    // Single solution or Override mode
    finalContent = buildSingleSolutionContent(solution.code, metadata, solution.language);
    commitMessage = metadata.customMessage ||
      `feat(${solution.platform}): ${existingFile ? 'Update' : 'Add'} ${solution.title}${metadata.timeComplexity ? ` | ${metadata.timeComplexity}` : ''}`;
  }

  // Push to GitHub
  const result = await putFile(
    repoFullName,
    fullPath,
    finalContent,
    commitMessage,
    branch,
    githubToken,
    existingFile?.sha
  );

  return {
    success: true,
    filePath: fullPath,
    commitUrl: result.commit?.html_url || `https://github.com/${repoFullName}/blob/${branch}/${fullPath}`,
  };
}
