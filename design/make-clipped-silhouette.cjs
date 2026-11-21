const sharp = require('sharp');

const SRC = 'D:/Zarva/project/web/portfolio/design/hero-halftone-soft.png';
const OUT = 'D:/Zarva/project/web/portfolio/design/hero-halftone-dark.png';

const P = [
  [0.300, 0.080], [0.305, 0.040], [0.330, 0.018], [0.370, 0.012], [0.420, 0.020], [0.470, 0.045],
  [0.520, 0.090], [0.565, 0.160], [0.600, 0.250], [0.620, 0.350], [0.630, 0.470], [0.628, 0.600],
  [0.615, 0.720], [0.598, 0.830], [0.580, 0.940], [0.560, 0.985],
  [0.300, 0.985], [0.280, 0.930], [0.245, 0.885], [0.225, 0.845], [0.250, 0.800], [0.300, 0.760],
  [0.345, 0.720], [0.360, 0.680], [0.352, 0.640], [0.330, 0.610], [0.318, 0.575], [0.310, 0.545],
  [0.300, 0.515], [0.292, 0.480], [0.300, 0.455], [0.288, 0.420], [0.292, 0.390], [0.283, 0.350],
  [0.285, 0.310], [0.292, 0.260], [0.296, 0.200], [0.298, 0.140]
];

const inside = (px, py) => {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i];
    const [xj, yj] = P[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

(async () => {
  const meta = await sharp(SRC).metadata();
  const W = meta.width, H = meta.height;
  const { data } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // supersample the polygon mask 2x for smooth edges
  const SS = 2;
  const mask = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let acc = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = (x + (sx + 0.5) / SS) / W;
          const py = (y + (sy + 0.5) / SS) / H;
          if (inside(px, py)) acc++;
        }
      }
      // feather 20px inward for a soft edge
      mask[y * W + x] = acc / (SS * SS);
    }
  }

  const out = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const a = data[i * 4 + 3] / 255;
    const m = mask[i];
    if (m <= 0.01) { out[i * 4 + 3] = 0; continue; }
    // cream plate everywhere inside the silhouette
    let r = 242, g = 237, b = 227, al = 255 * m;
    // black dots on top where the light asset had dots
    if (a > 0.15) { r = 18; g = 16; b = 14; al = a * 255 * m; }
    else { al = 255 * m; }
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = Math.round(al);
  }

  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(OUT);

  const bg = await sharp({ create: { width: W, height: H, channels: 4, background: '#12100E' } }).png().toBuffer();
  await sharp(bg).composite([{ input: OUT }]).png().toFile('D:/Zarva/project/web/portfolio/design/_tests/13-clipped.png');
  console.log('ok');
})();
