// Renders /cv through the print stylesheet so the PDF a visitor gets is
// verified rather than assumed.
import { chromium } from 'playwright';

const OUT = 'C:/Users/FUJITSU/AppData/Local/Temp/opencode/shots/cv-print';

const browser = await chromium.launch({ channel: 'chromium' });
const page = await browser.newPage();
await page.goto('http://localhost:4321/cv', { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print' });

const pdf = OUT + '.pdf';
await page.pdf({ path: pdf, format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '12mm', left: '14mm', right: '14mm' } });

// Screenshot the print rendering at A4 content width so it can be eyeballed.
await page.setViewportSize({ width: 794, height: 1123 });
await page.screenshot({ path: OUT + '.png', fullPage: true });

await browser.close();
console.log('wrote', pdf, 'and', OUT + '.png');
