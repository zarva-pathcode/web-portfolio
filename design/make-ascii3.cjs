const sharp = require('sharp');
const fs = require('fs');

const FONT = 'D:/Zarva/project/REA/web/.fonts/GeistMono-5.ttf';
const OUT = 'D:/Zarva/project/web/portfolio/design';

const JOBS = [
  {
    src: 'D:/Zarva/project/web/portfolio/src/assets/bg-image.jpg',
    name: 'ascii-cinematic',
    // head-and-shoulders crop of the 1460x871 frame
    extract: { left: 520, top: 0, width: 660, height: 762 },
    mode: 'light-on-dark', // bright subject, dark background
    cut: 0.14,
    gamma: 0.95,
    cols: 80,
    rows: 62,
  },
];

const CHARS = ' .:-=+*#%@';
const W = 760;
const H = 880;

async function asciiRows(job) {
  const { data } = await sharp(job.src)
    .extract(job.extract)
    .resize(job.cols, job.rows, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rows = [];
  for (let y = 0; y < job.rows; y++) {
    let line = '';
    for (let x = 0; x < job.cols; x++) {
      const v = data[y * job.cols + x] / 255;
      let t;
      if (job.mode === 'dark-on-light') {
        if (v >= job.cut) { line += ' '; continue; }
        t = (job.cut - v) / job.cut;
      } else {
        if (v <= job.cut) { line += ' '; continue; }
        t = (v - job.cut) / (1 - job.cut);
      }
      t = Math.pow(Math.min(1, Math.max(0, t)), job.gamma);
      const idx = Math.min(CHARS.length - 1, Math.max(1, Math.round(t * (CHARS.length - 1))));
      line += CHARS[idx];
    }
    rows.push(line);
  }
  return rows;
}

(async () => {
  for (const job of JOBS) {
    const rows = await asciiRows(job);
    const escaped = rows.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    for (const [suffix, color] of [
      ['clay', '#B4552F'],
      ['ink', '#14110F'],
    ]) {
      const textBuf = await sharp({
        text: {
          text: `<span font="12" foreground="${color}">${escaped}</span>`,
          fontfile: FONT,
          rgba: true,
          dpi: 96,
        },
      })
        .png()
        .toBuffer();

      const art = await sharp(textBuf).resize(W, H, { fit: 'fill' }).png().toBuffer();

      await sharp({ create: { width: W, height: H, channels: 4, background: '#F3EFE6' } })
        .composite([{ input: art, top: 0, left: 0 }])
        .png()
        .toFile(`${OUT}/${job.name}-${suffix}.png`);

      console.log(job.name, suffix, 'ok');
    }
  }
})();
