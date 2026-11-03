# RepoTap Privacy Policy

Last updated: 3 November 2026

RepoTap is a browser extension that saves your accepted coding-practice solutions to a GitHub repository you choose. It has no server and no account system.

## What RepoTap stores
Stored only on your device, in Chrome's local extension storage (`chrome.storage.local`):
- Your GitHub personal access token, repository name, branch, base folder and theme choice
- Accepted solutions waiting to be committed (code, title, language, difficulty, runtime and memory)
- A local history of the last 200 commits made through RepoTap

## What RepoTap reads
On leetcode.com, hackerrank.com and geeksforgeeks.org, RepoTap detects an accepted submission and reads the submitted code and problem details from the page. It does not read anything before a submission is accepted.

## What leaves your browser
Only when you press **Commit**, RepoTap sends the solution file and commit message to `api.github.com`, together with your token for authentication. The Settings "Test" button also contacts `api.github.com`. Nothing is sent anywhere else.

## What RepoTap does not do
- No analytics, tracking, advertising or telemetry
- No data sold or shared with third parties
- No remote code; everything runs from the installed package

## Your control
You can dismiss any solution instead of committing it, clear your history in the app, and remove all stored data by uninstalling the extension. You can revoke your token at any time in GitHub → Settings → Developer settings.

## Contact
Open an issue at https://github.com/Vii-Mii/repotap/issues
