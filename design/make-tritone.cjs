const sharp = require('sharp');

const SRC = 'D:/Zarva/project/web/portfolio/src/assets/bg-image.jpg';
const OUT = 'D:/Zarva/project/web/portfolio/design';
const W = 760;
const H = 880;
const CROP = { left: 545, top: 0, width: 620, height: 718 };

// Tritone ramp: ink → deep clay → bright clay → paper highlight
const RAMP = [
  [0.0, [16, 14, 13]],
  [0.5, [84, 39, 25]],
  [0.78, [138, 61, 38]],
  [0.94, [196, 96, 62]],
  [1.0, [243, 239, 230]],
];

const lerp = (a, b, t) => a + (b - a) * t;

function rampAt(t) {
  for (let i = 1; i < RAMP.length; i++) {
    if (t <= RAMP[i][0] || i === RAMP.length - 1) {
      const [t0, c0] = RAMP[i - 1];
      const [t1, c1] = RAMP[i];
      const k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
      return [lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k)];
    }
  }
  return RAMP[0][1];
}

(async () => {
  const { data } = await sharp(SRC)
    .extract(CROP)
    .resize(W, H, { fit: 'cover' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(W * H * 3);

  for (let i = 0; i < W * H; i++) {
    let v = data[i] / 255;
    // lift the face, keep the background deep
    v = Math.pow(v, 0.82);
    const [r, g, b] = rampAt(v);
    const grain = (Math.random() - 0.5) * 4;
    const o = i * 3;
    out[o] = Math.min(255, Math.max(0, Math.round(r + grain)));
    out[o + 1] = Math.min(255, Math.max(0, Math.round(g + grain)));
    out[o + 2] = Math.min(255, Math.max(0, Math.round(b + grain)));
  }

  await sharp(out, { raw: { width: W, height: H, channels: 3 } })
    .png()
    .toFile(`${OUT}/portrait-tritone.png`);

  console.log('ok', W, H);
})();
