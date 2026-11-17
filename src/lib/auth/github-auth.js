/**
 * RepoTap — GitHub OAuth login (auto token generation)
 * Authorization-code flow with PKCE (S256) via chrome.identity.launchWebAuthFlow.
 * Runs in the service worker; the popup talks to it through messages.
 */

import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_SCOPES } from './config.js';
import { getSettings, saveSettings } from '../storage.js';

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const API_ROOT = 'https://api.github.com';
const AUTH_FLOW_KEY = 'rt_auth_flow'; // { state, verifier, redirectUri, at }
const AUTH_FLOW_TTL_MS = 10 * 60 * 1000; // codes expire after 10 minutes

// ── Helpers ───────────────────────────────────────────────────────────────

function storageGet(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (res) => resolve(res[key]));
  });
}

function storageSet(obj) {
  return new Promise((resolve) => {
    chrome.storage.local.set(obj, resolve);
  });
}

function storageRemove(key) {
  return new Promise((resolve) => {
    chrome.storage.local.remove(key, resolve);
  });
}

function base64url(bytes) {
  let str = '';
  for (const b of new Uint8Array(bytes)) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

async function pkceChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(digest);
}

export function isAuthConfigured() {
  return Boolean(GITHUB_CLIENT_ID);
}

export function getRedirectUri() {
  return chrome.identity.getRedirectURL();
}

// ── Flow state (survives service worker restarts) ─────────────────────────

async function saveAuthFlow(flow) {
  await storageSet({ [AUTH_FLOW_KEY]: { ...flow, at: Date.now() } });
}

async function takeAuthFlow() {
  const flow = await storageGet(AUTH_FLOW_KEY);
  await storageRemove(AUTH_FLOW_KEY);
  if (!flow || Date.now() - flow.at > AUTH_FLOW_TTL_MS) return null;
  return flow;
}

// ── Web auth flow ─────────────────────────────────────────────────────────

function launchWebAuthFlow(url) {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url, interactive: true }, (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) {
        reject(new Error(chrome.runtime.lastError?.message || 'Authorization window was closed'));
        return;
      }
      resolve(redirectUrl);
    });
  });
}

async function requestLogin() {
  if (!isAuthConfigured()) {
    throw new Error('GitHub OAuth is not configured. Add the OAuth App client_id to src/lib/auth/config.js and rebuild.');
  }

  const redirectUri = getRedirectUri();
  const state = randomString(24);
  const verifier = randomString(48);
  const challenge = await pkceChallenge(verifier);

  await saveAuthFlow({ state, verifier, redirectUri });

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: GITHUB_SCOPES,
    response_type: 'code',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  const redirectUrl = await launchWebAuthFlow(`${AUTHORIZE_URL}?${params.toString()}`);

  const url = new URL(redirectUrl);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');

  if (url.searchParams.get('error')) {
    throw new Error(`GitHub authorization denied: ${url.searchParams.get('error_description') || url.searchParams.get('error')}`);
  }
  if (!code) throw new Error('No authorization code returned by GitHub.');
  if (returnedState !== state) throw new Error('State mismatch — authorization aborted (possible CSRF).');

  return { ...(await takeAuthFlow()), code };
}

// ── Token exchange + identity verification ────────────────────────────────

async function exchangeCodeForToken(code, verifier, redirectUri) {
  const body = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });
  if (GITHUB_CLIENT_SECRET) body.set('client_secret', GITHUB_CLIENT_SECRET);

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(`Token exchange failed: ${data.error_description || data.error || `HTTP ${res.status}`}`);
  }
  return data;
}

export async function getAuthenticatedUser(token) {
  const res = await fetch(`${API_ROOT}/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`Could not verify GitHub account: ${data.message || `HTTP ${res.status}`}`);
  }
  return res.json();
}

// ── Public API (called by the service worker) ─────────────────────────────

/**
 * Runs the full OAuth flow and persists the token + user info into settings.
 * Returns { login, avatarUrl }.
 */
export async function login() {
  const flow = await requestLogin();
  if (!flow) throw new Error('Login flow state was lost — please try again.');

  const tokenData = await exchangeCodeForToken(flow.code, flow.verifier, flow.redirectUri);
  const user = await getAuthenticatedUser(tokenData.access_token);

  const settings = await getSettings();
  await saveSettings({
    ...settings,
    githubToken: tokenData.access_token,
    githubLogin: user.login,
    githubAvatarUrl: user.avatar_url || '',
    authMethod: 'oauth',
    authedAt: new Date().toISOString(),
    tokenExpiresAt: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null,
  });
  return { login: user.login, avatarUrl: user.avatar_url || '' };
}

export async function logout() {
  const settings = await getSettings();
  const {
    githubToken, githubLogin, githubAvatarUrl, authMethod, authedAt, tokenExpiresAt,
    ...rest
  } = settings;
  await saveSettings(rest);
  return { ok: true };
}

export async function getAuthState() {
  const settings = await getSettings();
  return {
    configured: isAuthConfigured(),
    authed: Boolean(settings.githubToken),
    login: settings.githubLogin || null,
    avatarUrl: settings.githubAvatarUrl || null,
    authMethod: settings.authMethod || (settings.githubToken ? 'pat' : null),
    tokenExpiresAt: settings.tokenExpiresAt || null,
  };
}