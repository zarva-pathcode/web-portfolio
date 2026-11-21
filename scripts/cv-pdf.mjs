// Generates public/cv/bintang-fadilah-cv.pdf from the built /cv page.
// One source of truth: the PDF is the page, printed. Run after `npm run build`.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve('dist');
const PORT = 4390;
const OUT = path.resolve('public/cv/bintang-fadilah-cv.pdf');

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, url);
  if (url.endsWith('/')) file = path.join(file, 'index.html');
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
  if (!fs.existsSync(file)) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

// Prefer the user's own Chrome: no 150 MB download, same renderer.
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome' });
} catch {
  browser = await chromium.launch();
}
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

// force the print-safe theme before the stylesheet paints
await page.addInitScript(() => {
  try {
    localStorage.setItem('theme', 'paper');
  } catch {}
});

await page.goto(`http://127.0.0.1:${PORT}/cv`, { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print' });
await page.evaluate(() => document.fonts.ready);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
await page.pdf({
  path: OUT,
  format: 'A4',
  printBackground: true,
  margin: { top: '14mm', right: '14mm', bottom: '14mm', left: '14mm' },
});

await browser.close();
server.close();

const kb = Math.round(fs.statSync(OUT).size / 1024);
console.log(`CV PDF written: ${path.relative(process.cwd(), OUT)} (${kb} KB)`);
