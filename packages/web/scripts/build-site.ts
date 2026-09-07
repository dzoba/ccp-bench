import { build, loadEnv } from 'vite';
const index = process.argv.indexOf('--mode');
const mode = index >= 0 ? process.argv[index + 1] : 'staging';
if (!mode || !['staging', 'production'].includes(mode))
  throw new Error('Build mode must be staging or production');
const env = loadEnv(mode, process.cwd(), 'VITE_');
process.env.VITE_SITE_URL ||=
  env.VITE_SITE_URL || 'https://ccp-bench-staging.web.app';
await import('./og-image');
await build({ mode });
