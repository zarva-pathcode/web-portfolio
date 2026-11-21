// Generates public/og.png (1200×630) in the current paper identity.
import sharp from 'sharp';
import fs from 'node:fs';

const W = 1200, H = 630;
const SERIF = 'C:/Users/FUJITSU/AppData/Local/Temp/none.ttf'; // placeholder, replaced below
const fonts = {
  serif: 'D:/Zarva/project/REA/web/.fonts/InstrumentSerif-1.ttf',
  mono: 'D:/Zarva/project/REA/web/.fonts/GeistMono-5.ttf',
};

const text = async (markup, fontfile) =>
  sharp({ text: { text: markup, fontfile, rgba: true, dpi: 96 } }).png().toBuffer();

const base = await sharp({
  create: { width: W, height: H, channels: 4, background: '#F3EFE6' },
}).png().toBuffer();

const name = await text(
  '<span font="60" foreground="#14110F">Bintang Fadilah</span>\n<span font="60" foreground="#14110F">Ramadhan</span>',
  fonts.serif
);
const role = await text('<span font="19" foreground="#6A6459">MOBILE &amp; FRONTEND DEVELOPER</span>', fonts.mono);
const brand = await text('<span font="15" foreground="#B4552F">ZARVAISM</span>', fonts.mono);
const stats = await text('<span font="15" foreground="#5A6247">FLUTTER · REACT · TYPESCRIPT</span>', fonts.mono);

// halftone portrait, right side
const portrait = await sharp('design/hero-halftone-soft.png')
  .resize({ width: 620 })
  .png()
  .toBuffer();

await sharp(base)
  .composite([
    { input: portrait, left: 600, top: 30 },
    { input: brand, left: 72, top: 64 },
    { input: name, left: 72, top: 190 },
    { input: role, left: 72, top: 400 },
    { input: stats, left: 72, top: 470 },
  ])
  .png()
  .toFile('public/og.png');

console.log('og.png written', Math.round(fs.statSync('public/og.png').size / 1024), 'KB');
