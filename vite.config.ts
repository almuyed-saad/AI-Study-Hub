import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import fs from 'fs';

export default defineConfig(() => {
  // Try to load firebase-applet-config.json if it exists and inject into env define
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  let fbConfig: Record<string, string> = {};
  if (fs.existsSync(configPath)) {
    try {
      fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
      console.warn('Failed to parse firebase-applet-config.json:', e);
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(fbConfig.projectId || process.env.VITE_FIREBASE_PROJECT_ID || ''),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(fbConfig.appId || process.env.VITE_FIREBASE_APP_ID || ''),
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(fbConfig.apiKey || process.env.VITE_FIREBASE_API_KEY || ''),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(fbConfig.authDomain || process.env.VITE_FIREBASE_AUTH_DOMAIN || ''),
      'import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID': JSON.stringify(fbConfig.firestoreDatabaseId || process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || ''),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(fbConfig.storageBucket || process.env.VITE_FIREBASE_STORAGE_BUCKET || ''),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(fbConfig.messagingSenderId || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
