// Checks the nav contract: every item resolves, and anchor clicks land the
// section heading clear of the fixed bar.
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });

const shape = await page.evaluate(() => ({
  links: [...document.querySelectorAll('header nav a')].map((a) => ({
    label: a.textContent.trim().slice(0, 12),
    href: a.getAttribute('href'),
  })),
  ids: [...document.querySelectorAll('[id]')].map((s) => s.id).filter(Boolean),
  sections: document.querySelectorAll('section').length,
}));

console.log('nav items:');
for (const l of shape.links) console.log(`  ${l.label.padEnd(12)} -> ${l.href}`);
console.log('sections:', shape.sections);
console.log('anchors present:', ['hero', 'about', 'experience', 'projects', 'archive', 'contact'].filter((id) => shape.ids.includes(id)).join(', '));

for (const id of ['about', 'experience', 'projects']) {
  await page.click(`header nav a[href="#${id}"]`);
  await page.waitForTimeout(1100);
  const top = await page.evaluate((anchor) => {
    const el = document.querySelector(`#${anchor}`).getBoundingClientRect();
    return Math.round(el.top);
  }, id);
  // scroll-padding-top is 5rem = 80px, bar is 56px, so >= 60 is clear.
  console.log(`  click #${id} -> section top ${top}px ${top >= 60 ? 'OK' : 'HIDDEN BEHIND BAR'}`);
}

console.log(errors.length ? `CONSOLE ERRORS: ${errors.join(' | ')}` : 'no console errors');
await browser.close();
