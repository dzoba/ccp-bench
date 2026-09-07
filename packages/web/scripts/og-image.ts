import { z } from 'zod';
import { PublicIndexSchema } from '@ccp-bench/schema';
import { Resvg } from '@resvg/resvg-js';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const origin = process.env.VITE_SITE_URL || 'https://ccp-bench-staging.web.app';
const directory = fileURLToPath(new URL('../public/', import.meta.url));
await mkdir(directory, { recursive: true });
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#f6f8f7"/><rect x="68" y="70" width="10" height="480" fill="#216d62"/><text x="115" y="132" font-family="Arial" font-size="34" fill="#216d62">CCP Bench</text><text x="110" y="280" font-family="Georgia" font-size="69" fill="#23302f">How models answer</text><text x="110" y="365" font-family="Georgia" font-size="69" fill="#23302f">sensitive questions.</text><text x="115" y="475" font-family="Arial" font-size="27" fill="#596965">Refusal. Omission. Narrative alignment.</text><text x="115" y="525" font-family="Arial" font-size="23" fill="#596965">Open methods and inspectable evidence.</text></svg>`;
await writeFile(directory + 'og.png', new Resvg(svg).render().asPng());
for (const [name, size] of [
  ['favicon.png', 32],
  ['apple-touch-icon.png', 180],
] as const) {
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><rect width="100" height="100" rx="16" fill="#216d62"/><path d="M22 75V48h13v27zm22 0V25h13v50zm22 0V38h13v37z" fill="#fff"/></svg>`;
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
