const sharp = require('sharp');

const SRC = 'D:/Zarva/project/web/portfolio/design/my-profile.png';
const OUT = 'D:/Zarva/project/web/portfolio/design';
const CROP = { left: 250, top: 55, width: 1100, height: 750 };
const GW = 440;
const GH = 300;
const W = 1320;
const H = 900;

const THRESHOLDS = [0.3, 0.42, 0.55];

(async () => {
  const lifted = await sharp(SRC)
    .extract(CROP)
    .grayscale()
    .gamma(2.3)
    .normalize()
    .blur(1)
    .png()
    .toBuffer();

  const { data } = await sharp(lifted).grayscale().resize(GW, GH, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });

  for (const T of THRESHOLDS) {
    const subject = new Uint8Array(GW * GH);
    for (let i = 0; i < GW * GH; i++) subject[i] = data[i] / 255 < T ? 1 : 0;

    // remove subject blobs that touch the border (background bleeding in)
    const seen = new Uint8Array(GW * GH);
    const stack = [];
    for (let x = 0; x < GW; x++) { stack.push(x, 0, x, GH - 1); }
    for (let y = 0; y < GH; y++) { stack.push(0, y, GW - 1, y); }
    while (stack.length) {
      const y = stack.pop();
      const x = stack.pop();
      const idx = y * GW + x;
      if (x < 0 || y < 0 || x >= GW || y >= GH || seen[idx]) continue;
      seen[idx] = 1;
      if (!subject[idx]) continue;
      subject[idx] = 0;
      stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }

    // fill holes: background not reachable from the border becomes subject
    const bg = new Uint8Array(GW * GH);
    const st2 = [];
    for (let x = 0; x < GW; x++) { st2.push(x, 0, x, GH - 1); }
    for (let y = 0; y < GH; y++) { st2.push(0, y, GW - 1, y); }
    while (st2.length) {
      const y = st2.pop();
      const x = st2.pop();
      const idx = y * GW + x;
      if (x < 0 || y < 0 || x >= GW || y >= GH || bg[idx]) continue;
      bg[idx] = 1;
      if (subject[idx]) continue;
      st2.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }
    for (let i = 0; i < GW * GH; i++) if (!bg[i]) subject[i] = 1;

    const rgba = Buffer.alloc(GW * GH * 4);
    for (let i = 0; i < GW * GH; i++) {
      const on = subject[i];
      rgba[i * 4] = 180;
      rgba[i * 4 + 1] = 85;
      rgba[i * 4 + 2] = 47;
      rgba[i * 4 + 3] = on ? 255 : 0;
    }

    await sharp(rgba, { raw: { width: GW, height: GH, channels: 4 } })
      .resize(W, H, { kernel: 'cubic' })
      .png()
      .toFile(`${OUT}/silhouette-${String(T).replace('.', '')}.png`);

    console.log('ok', T);
  }
})();
