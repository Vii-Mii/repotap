/**
 * RepoTap — GitHub OAuth App configuration
 *
 * Setup (one-time):
 *   1. Load the unpacked extension once to read its ID at chrome://extensions.
 *   2. Register an OAuth App at https://github.com/settings/developers
 *      with "Authorization callback URL" = https://<extension-id>.chromiumapp.org/
 *   3. Copy .env.example to .env and fill in REPOtap_GITHUB_CLIENT_SECRET.
 *   4. Rebuild (the secret is inlined at build time, never committed).
 *
 * The client secret is required for the web application flow. For a browser
 * extension (a public client) it is not truly secret, but keeping it out of
 * the repo means it can be rotated without rewriting git history.
 */

// Client ID is public — safe to commit.
export const GITHUB_CLIENT_ID = 'Ov23limmkJiFpRSpxKtm';

// Inlined at build time from process.env.REPOTAP_GITHUB_CLIENT_SECRET (see .env).
// Falls back to empty string so the build still works without a .env file;
// GitHub login will report "not configured" until the secret is provided.
export const GITHUB_CLIENT_SECRET = __REPOTAP_GITHUB_CLIENT_SECRET__;

// 'repo' grants access to private repositories (parity with the old PAT flow).
export const GITHUB_SCOPES = 'repo';