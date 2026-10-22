// Usage: node tools/set_site.mjs https://deshiee.com   (or https://drop.deshiee.com)
// Replaces the placeholder domain in SEO files. Safe to re-run with the same placeholder only once;
// pass the old value as 2nd arg to change again.
import fs from 'node:fs';
const to = (process.argv[2] || '').replace(/\/+$/, '');
const from = (process.argv[3] || 'https://drop.example.com').replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9.-]+$/i.test(to)) { console.error('Give a full https URL, e.g. https://deshiee.com'); process.exit(1); }
const files = ['index.html', 'robots.txt', 'sitemap.xml', '.well-known/security.txt'];
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  s = s.split(from).join(to).split(from.replace('https://', 'security@')).join('security@' + to.replace('https://', ''));
  fs.writeFileSync(f, s);
}
console.log('Updated', files.join(', '), '->', to);
