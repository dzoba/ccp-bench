import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  process.env.VITE_SITE_URL ||=
    env.VITE_SITE_URL || 'https://ccp-bench-staging.web.app';
  return { plugins: [react(), tailwindcss()] };
});
