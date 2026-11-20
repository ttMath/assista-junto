import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

// Read only the explicitly public URL. Never expose the root .env to the browser.
export default defineConfig(({ mode, command, isPreview }) => {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const env = loadEnv(mode, root, 'API_BASE_URL');
  const api = process.env.API_BASE_URL || env.API_BASE_URL;
  const development = command === 'serve' && !isPreview;
  const useHttps = development && mode === 'development-https';
  const https = useHttps ? {
    cert: readFileSync(new URL('./.certs/localhost.pem', import.meta.url)),
    key: readFileSync(new URL('./.certs/localhost.key', import.meta.url)),
  } : undefined;
  const proxy = api ? Object.fromEntries(['/api', '/hubs'].map(path => [path, {
    target: api, changeOrigin: true, ws: true, secure: !development,
  }])) : undefined;
  return {
    plugins: [react()],
    server: { host: useHttps ? 'localhost' : '127.0.0.1', port: 5173, strictPort: true, proxy, https },
    preview: { host: '127.0.0.1', port: 4173, strictPort: true, proxy },
  };
});
