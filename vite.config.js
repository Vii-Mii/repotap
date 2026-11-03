import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

// Plugin to copy manifest + icons into dist
function copyExtensionFiles() {
  return {
    name: 'copy-extension-files',
    closeBundle() {
      // Copy manifest
      copyFileSync('manifest.json', 'dist/manifest.json');

      // Copy icons if they exist
      const iconsDir = 'dist/icons';
      if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });
      ['icon16.png', 'icon48.png', 'icon128.png'].forEach(icon => {
        const src = `public/icons/${icon}`;
        if (existsSync(src)) copyFileSync(src, `${iconsDir}/${icon}`);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), copyExtensionFiles()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'src/background/service-worker.js'),
        bridge: resolve(__dirname, 'src/content/page-bridge.js'),
        leetcode: resolve(__dirname, 'src/content/leetcode.js'),
        hackerrank: resolve(__dirname, 'src/content/hackerrank.js'),
        geeksforgeeks: resolve(__dirname, 'src/content/geeksforgeeks.js'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background/service-worker.js';
          if (chunkInfo.name === 'bridge') return 'content/page-bridge.js';
          if (['leetcode', 'hackerrank', 'geeksforgeeks'].includes(chunkInfo.name)) {
            return `content/${chunkInfo.name}.js`;
          }
          return '[name]/[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    minify: false,
  },
});
