const sharp = require('sharp');

const SRC = 'D:/Zarva/project/web/portfolio/design/my-profile.png';
const OUT = 'D:/Zarva/project/web/portfolio/design';
const W = 760;
const H = 880;
const CROP = { left: 545, top: 80, width: 320, height: 369 };
const GAMMA = 2.2;

const RAMP = [
  [0.0, [16, 14, 13]],
  [0.45, [78, 36, 24]],
  [0.72, [138, 61, 38]],
  [0.92, [199, 99, 64]],
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
  const lifted = await sharp(SRC)
    .extract(CROP)
    .grayscale()
    .gamma(GAMMA)
    .normalize()
    .png()
    .toBuffer();

  const { data } = await sharp(lifted)
    .resize(W, H, { fit: 'cover' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // percentile report for the honest diagnosis
  const sorted = Array.from(data).sort((a, b) => a - b);
  const pct = (p) => sorted[Math.floor(sorted.length * p)];
  console.log('percentiles', { p5: pct(0.05), p25: pct(0.25), p50: pct(0.5), p75: pct(0.75), p95: pct(0.95) });

  const out = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    const [r, g, b] = rampAt(Math.pow(data[i] / 255, 0.95));
    const grain = (Math.random() - 0.5) * 4;
    const o = i * 3;
    out[o] = Math.min(255, Math.max(0, Math.round(r + grain)));
    out[o + 1] = Math.min(255, Math.max(0, Math.round(g + grain)));
    out[o + 2] = Math.min(255, Math.max(0, Math.round(b + grain)));
  }

  await sharp(out, { raw: { width: W, height: H, channels: 3 } })
    .png()
    .toFile(`${OUT}/tritone-myprofile.png`);

  console.log('ok');
})();
