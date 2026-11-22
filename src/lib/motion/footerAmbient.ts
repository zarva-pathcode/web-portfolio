import { isReducedMotion } from './engine';

interface Spark {
  x: number;
  y: number;
  vy: number;
  vx: number;
  life: number;
  maxLife: number;
}

// Three tone buckets per theme: cool tips -> body -> core.
const PAPER_TONES = ['rgba(61, 90, 115, 0.24)', 'rgba(61, 90, 115, 0.46)', 'rgba(47, 72, 94, 0.72)'];
const NIGHT_TONES = ['rgba(96, 132, 162, 0.42)', 'rgba(134, 170, 198, 0.72)', 'rgba(196, 218, 236, 0.90)'];

const PITCH = 7; // halftone dot spacing in CSS px
const MAX_R = PITCH * 0.52; // hottest dots just kiss their neighbours
const STEP_MS = 90; // calm cadence (~11 steps/s)
const MAX_HEAT = 64;

export function initFooterAmbient(): () => void {
  const stage = document.querySelector<HTMLElement>('[data-footer-ambient]');
  const canvas = stage?.querySelector<HTMLCanvasElement>('[data-footer-fire]');
  if (!stage || !canvas) return () => {};
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const reduced = isReducedMotion();
  let cols = 0;
  let rows = 0;
  let width = 0;
  let height = 0;
  let heat = new Float32Array(0);
  let sparks: Spark[] = [];
  let tick = 0;
  let visible = false;
  let killed = false;
  let rafId = 0;
  let lastStep = 0;

  const isNight = () => document.documentElement.getAttribute('data-theme') === 'night';

  const spawnSpark = (initial = false): Spark => ({
    x: Math.random() * Math.max(1, cols),
    y: initial ? rows * (0.3 + Math.random() * 0.5) : rows * (0.55 + Math.random() * 0.3),
    vy: 0.22 + Math.random() * 0.3,
    vx: (Math.random() - 0.5) * 0.24,
    life: initial ? Math.floor(Math.random() * 20) : 0,
    maxLife: 22 + Math.floor(Math.random() * 26),
  });

  const stepSimulation = () => {
    if (!cols || !rows) return;
    tick += 1;

    // Ember bed: slow overlapping waves so tongues swell and recede instead of flickering uniformly.
    const bottom = (rows - 1) * cols;
    for (let x = 0; x < cols; x++) {
      const wave =
        0.5 +
        0.26 * Math.sin(x * 0.06 + tick * 0.05) +
        0.16 * Math.sin(x * 0.15 - tick * 0.08) +
        0.1 * Math.cos(x * 0.031 + tick * 0.027);
      const v = wave + (Math.random() - 0.5) * 0.18;
      heat[bottom + x] = Math.max(0.1, Math.min(1, v)) * MAX_HEAT;
    }

    // Propagate upward with a slow breeze and random cooling.
    const baseCool = (MAX_HEAT / Math.max(12, rows)) * 1.22;
    const wind = Math.sin(tick * 0.035) * 0.2;
    for (let y = 0; y < rows - 1; y++) {
      const row = y * cols;
      const below = (y + 1) * cols;
      for (let x = 0; x < cols; x++) {
        const r = Math.random() + wind;
        const dx = r < 0.32 ? -1 : r > 0.68 ? 1 : 0;
        const sx = Math.min(cols - 1, Math.max(0, x + dx));
        const next = heat[below + sx] - baseCool * (0.3 + Math.random() * 1.4);
        heat[row + x] = next > 0 ? next : 0;
      }
    }

    for (let i = 0; i < sparks.length; i++) {
      const s = sparks[i];
      s.y -= s.vy;
      s.x += s.vx + Math.sin(tick * 0.07 + i) * 0.14;
      s.life += 1;
      if (s.life >= s.maxLife || s.y < 1 || s.x < 0 || s.x >= cols) sparks[i] = spawnSpark(false);
    }
  };

  const sample = (x: number, y: number) => heat[y * cols + Math.min(cols - 1, Math.max(0, x))];

  const render = () => {
    if (!cols || !rows) return;
    ctx.clearRect(0, 0, width, height);

    const tones = isNight() ? NIGHT_TONES : PAPER_TONES;
    const paths = [new Path2D(), new Path2D(), new Path2D()];
    const fadeRows = Math.max(4, rows * 0.35);

    for (let y = 0; y < rows; y++) {
      const offset = y % 2 ? PITCH / 2 : 0; // staggered rows = classic halftone screen
      const cy = y * PITCH + PITCH / 2;
      const up = Math.max(0, y - 1);
      const down = Math.min(rows - 1, y + 1);
      const topFade = y < fadeRows ? (y / fadeRows) ** 1.4 : 1;

      for (let x = 0; x < cols; x++) {
        // 3×3-ish smoothing turns noisy cells into soft flame silhouettes.
        const v =
          ((sample(x, y) * 4 +
            sample(x - 1, y) +
            sample(x + 1, y) +
            sample(x, up) +
            sample(x, down)) /
            8 /
            MAX_HEAT) *
          topFade;
        if (v < 0.08) continue;

        const r = MAX_R * Math.pow(v, 0.85);
        if (r < 0.5) continue;
        const bucket = v > 0.62 ? 2 : v > 0.32 ? 1 : 0;
        const cx = x * PITCH + PITCH / 2 + offset;
        paths[bucket].moveTo(cx + r, cy);
        paths[bucket].arc(cx, cy, r, 0, Math.PI * 2);
      }
    }

    for (const s of sparks) {
      const progress = s.life / s.maxLife;
      const r = 1.9 * (1 - progress) + 0.6;
      const cx = s.x * PITCH;
      const cy = s.y * PITCH;
      const bucket = progress < 0.4 ? 1 : 0;
      paths[bucket].moveTo(cx + r, cy);
      paths[bucket].arc(cx, cy, r, 0, Math.PI * 2);
    }

    paths.forEach((p, i) => {
      ctx.fillStyle = tones[i];
      ctx.fill(p);
    });
  };

  const resize = () => {
    const rect = stage.getBoundingClientRect();
    const nextW = Math.max(1, Math.round(rect.width));
    const nextH = Math.max(1, Math.round(rect.height));
    if (nextW === width && nextH === height) return;

    width = nextW;
    height = nextH;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.ceil(width / PITCH) + 1;
    rows = Math.ceil(height / PITCH);
    heat = new Float32Array(cols * rows);
    sparks = Array.from({ length: Math.max(8, Math.min(18, Math.floor(cols / 12))) }, () => spawnSpark(true));

    // Pre-warm so the fire is fully formed the moment it scrolls into view.
    for (let i = 0; i < rows + 16; i++) stepSimulation();
    render();
  };

  const loop = (now: number) => {
    if (killed || !visible || reduced) {
      rafId = 0;
      return;
    }
    if (now - lastStep >= STEP_MS) {
      lastStep = now;
      stepSimulation();
      render();
    }
    rafId = window.requestAnimationFrame(loop);
  };

  const start = () => {
    if (killed || visible) return;
    visible = true;
    resize();
    if (!reduced && !rafId) {
      lastStep = performance.now();
      rafId = window.requestAnimationFrame(loop);
    }
  };

  const stop = () => {
    visible = false;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  resize();

  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => resize()) : null;
  ro?.observe(stage);

  let io: IntersectionObserver | null = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? start() : stop())),
      { threshold: 0.02 }
    );
    io.observe(stage);
  } else {
    start();
  }

  // Repaint immediately on Paper ↔ Night toggle.
  const mo = new MutationObserver(() => render());
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  return () => {
    killed = true;
    stop();
    io?.disconnect();
    ro?.disconnect();
    mo.disconnect();
  };
}
