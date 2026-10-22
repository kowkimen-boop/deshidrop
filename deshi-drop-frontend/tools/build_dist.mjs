// Copies only the files that belong on the web host into ./dist (upload dist/* to public_html).
import fs from 'node:fs'; import path from 'node:path';
const keep = ['index.html', '404.html', 'robots.txt', 'sitemap.xml', 'manifest.webmanifest', '.htaccess', 'css', 'js', 'img', 'gallery', '.well-known'];
fs.rmSync('dist', { recursive: true, force: true });
for (const k of keep) if (fs.existsSync(k)) fs.cpSync(k, path.join('dist', k), { recursive: true });
console.log('dist/ ready — upload its CONTENTS to public_html');
