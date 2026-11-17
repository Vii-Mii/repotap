import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { cpSync, existsSync, mkdirSync } from 'fs';

export default defineConfig(({ mode }) => {
  // Load .env from the project root (not committed)
  const env = loadEnv(mode, process.cwd(), 'REPOTAP_');

  return {
    plugins: [
      react(),
      // Copy manifest.json (repo root) and icons (public/) to dist/
      {
        name: 'copy-manifest',
        closeBundle() {
          const dest = resolve(__dirname, 'dist');
          if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
          // Manifest from repo root
          cpSync(resolve(__dirname, 'manifest.json'), resolve(dest, 'manifest.json'));
          // Icons from public/
          const pubIcons = resolve(__dirname, 'public', 'icons');
          if (existsSync(pubIcons)) {
            cpSync(pubIcons, resolve(dest, 'icons'), { recursive: true });
          }
        },
      },
    ],
    // The secret is replaced at build time by this string. Using a bare
    // identifier avoids Vite's env replacement quirks with dotted keys.
    define: {
      __REPOTAP_GITHUB_CLIENT_SECRET__: JSON.stringify(env.REPOTAP_GITHUB_CLIENT_SECRET || ''),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'popup.html'),
          'content/leetcode': resolve(__dirname, 'src/content/leetcode.js'),
          'content/hackerrank': resolve(__dirname, 'src/content/hackerrank.js'),
          'content/geeksforgeeks': resolve(__dirname, 'src/content/geeksforgeeks.js'),
          'content/page-bridge': resolve(__dirname, 'src/content/page-bridge.js'),
          'content/toast': resolve(__dirname, 'src/content/toast.js'),
          'background/service-worker': resolve(__dirname, 'src/background/service-worker.js'),
        },
        output: {
          entryFileNames: (chunk) => {
            if (chunk.name.includes('content/')) return `${chunk.name}.js`;
            if (chunk.name.includes('background/')) return `${chunk.name}.js`;
            return 'popup/[name]-[hash].js';
          },
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});