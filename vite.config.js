import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs';

// Plugin to copy manifest + icons into dist
// Also strips any "export {}" or top-level export statements from plain content scripts
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

      // Strip "export {}" from plain-script content files (rollup may emit it for IIFE entries)
      ['toast', 'leetcode', 'hackerrank', 'geeksforgeeks', 'page-bridge'].forEach(name => {
        const f = `dist/content/${name}.js`;
        if (existsSync(f)) {
          let src = readFileSync(f, 'utf8');
          // Remove any trailing "export {};" or "export { ... };" that rollup emits
          src = src.replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '');
          writeFileSync(f, src, 'utf8');
        }
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
        toast: resolve(__dirname, 'src/content/toast.js'),
        leetcode: resolve(__dirname, 'src/content/leetcode.js'),
        hackerrank: resolve(__dirname, 'src/content/hackerrank.js'),
        geeksforgeeks: resolve(__dirname, 'src/content/geeksforgeeks.js'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background/service-worker.js';
          if (chunkInfo.name === 'bridge') return 'content/page-bridge.js';
          if (['leetcode', 'hackerrank', 'geeksforgeeks', 'toast'].includes(chunkInfo.name)) {
            return `content/${chunkInfo.name}.js`;
          }
          return '[name]/[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Prevent rollup from tree-shaking the IIFE globals or emitting module wrappers
        generatedCode: { constBindings: false },
      },
    },
    minify: false,
  },
});
