import { z } from 'zod';
import { PublicIndexSchema } from '@ccp-bench/schema';
import { Resvg } from '@resvg/resvg-js';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const origin = process.env.VITE_SITE_URL || 'https://ccp-bench-staging.web.app';
const directory =
  process.env.CCP_SITE_ASSETS_OUT ||
  fileURLToPath(new URL('../public/', import.meta.url));
await mkdir(directory, { recursive: true });
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#ffffff"/><text x="80" y="100" font-family="Arial" font-size="30" fill="#254de8">CCP Bench</text><text x="80" y="240" font-family="Arial" font-size="68" fill="#182039">AI answers.</text><text x="80" y="320" font-family="Arial" font-size="61" fill="#182039">CCP narrative alignment.</text><text x="80" y="455" font-family="Arial" font-size="26" fill="#626c80">Compare the models. Inspect the evidence.</text><path d="M82 525h480m-480 25h340m-340 25h120" stroke="#254de8" stroke-width="12"/></svg>`;
await writeFile(directory + 'og.png', new Resvg(svg).render().asPng());
for (const [name, size] of [
  ['favicon.png', 32],
  ['apple-touch-icon.png', 180],
] as const) {
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><rect width="100" height="100" rx="16" fill="#254de8"/><path d="M22 75V48h13v27zm22 0V25h13v50zm22 0V38h13v37z" fill="#fff"/></svg>`;
  await writeFile(directory + name, new Resvg(icon).render().asPng());
}
const pointer = z
  .object({ version: z.string().regex(/^[\w.-]+$/) })
  .parse(JSON.parse(await readFile(directory + 'data/current.json', 'utf8')));
const index = PublicIndexSchema.parse(
  JSON.parse(
    await readFile(directory + `data/${pointer.version}/index.json`, 'utf8'),
  ),
);
const routes = [
  '/',
  '/results',
  '/items',
  '/compare',
  '/languages',
  '/methodology',
  '/sources',
  '/changelog',
  '/about',
  ...index.models.map((m) => '/models/' + m.key),
  ...index.items.map((i) => '/items/' + i.id),
];
await writeFile(
  directory + 'sitemap.xml',
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    routes.map((r) => `<url><loc>${origin}${r}</loc></url>`).join('') +
    '</urlset>',
);
await writeFile(
  directory + 'robots.txt',
  `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${origin}/sitemap.xml\n`,
);
console.log('Generated PNG social image, icons, robots, and sitemap.');
