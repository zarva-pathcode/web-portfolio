import { chromium } from 'playwright';

const BASE = 'http://localhost:4322';
const ARTIFACTS = 'C:/Users/FUJITSU/.gemini/antigravity-cli/brain/db74d77f-7fb6-453e-aa9a-1117e4ea1de8';

let browser;
for (const opts of [{ channel: 'chrome' }, { channel: 'msedge' }, {}]) {
  try {
    browser = await chromium.launch(opts);
    break;
  } catch {}
}
if (!browser) throw new Error('No Chromium browser available');

let fails = 0;
const errors = [];
const ok = (label, pass, detail = '') => {
  if (!pass) fails++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
};

try {
  // 1. Unauthenticated / Anonymous Checks
  console.log('\n[Auth Guard & Anonymous Visitor]');
  const anonCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const anonPage = await anonCtx.newPage();
  anonPage.on('pageerror', (e) => errors.push(`anon pageerror: ${e.message}`));

  await anonPage.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  ok('unauthenticated /admin redirects to /admin/login', anonPage.url().includes('/admin/login'), anonPage.url());

  const unauthPut = await anonPage.evaluate(async () => {
    const r = await fetch('/api/admin/sections/hero', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    return r.status;
  });
  ok('unauthenticated PUT /api/admin/sections/hero returns 401', unauthPut === 401, `status=${unauthPut}`);

  await anonPage.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const hasOverlayAnon = await anonPage.evaluate(() => Boolean(document.getElementById('cms-quick-edit')));
  ok('anonymous visitor has zero Quick Edit overlay markup in DOM', !hasOverlayAnon);
  await anonCtx.close();

  // 2. Authenticated Admin Flow
  console.log('\n[Admin Login & Dashboard]');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`admin console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`admin pageerror: ${e.message}`));

  await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', 'bintangfara363@gmail.com');
  await page.fill('input[name="password"]', 'zarvaism-admin-2026');
  await page.click('#login-submit');
  await page.waitForURL(`${BASE}/admin`, { timeout: 10000 });
  await page.waitForSelector('h1', { timeout: 10000 });
  const dashTitle = await page.textContent('#cms-stage h1');
  ok('login succeeds & opens Studio Overview', dashTitle?.includes('Studio Overview'), dashTitle);
  await page.screenshot({ path: `${ARTIFACTS}/verify-v11-admin-overview.png` });

  // Open Blog Studio tab & preview
  await page.click('[data-cms-tab="blog"]');
  await page.waitForTimeout(300);
  await page.click('#cms-stage button:has-text("+ ARTIKEL BARU")');
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${ARTIFACTS}/verify-v11-admin-blog.png` });

  // 3. Section CRUD Live Reflection (Hero eyebrow -> live / -> reset)
  console.log('\n[Section CRUD Live]');
  const heroRes = await page.evaluate(async () => {
    const g = await (await fetch('/api/admin/sections/hero')).json();
    const orig = g.data;
    const mod = structuredClone(orig);
    mod.eyebrowRole = 'CMS Live Test Engineer';
    const put = await fetch('/api/admin/sections/hero', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mod),
    });
    return { status: put.status, origRole: orig.eyebrowRole };
  });
  ok('PUT /api/admin/sections/hero saves updated copy', heroRes.status === 200);

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const liveHeroText = await page.textContent('#hero [data-hero-eyebrow]');
  ok('public / reflects updated Hero copy immediately without rebuild', liveHeroText?.includes('CMS LIVE TEST ENGINEER'), liveHeroText);

  // Reset hero back to default
  await page.evaluate(async () => {
    await fetch('/api/admin/sections/hero', { method: 'DELETE' });
  });

  // 4. Quick Edit Mode Overlay on /
  console.log('\n[Quick Edit Mode Overlay]');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const hasOverlayAdmin = await page.evaluate(() => Boolean(document.getElementById('cms-quick-edit')));
  ok('authenticated admin sees Quick Edit capsule on /', hasOverlayAdmin);

  await page.click('[data-qe-toggle]');
  await page.waitForTimeout(200);
  const pillCount = await page.locator('.qe-section-pill').count();
  ok('Edit Mode ON renders editable section pills', pillCount >= 7, `pills=${pillCount}`);

  await page.click('#faq .qe-section-pill');
  await page.waitForTimeout(350);
  const drawerVisible = await page.evaluate(() => !document.querySelector('[data-qe-drawer]')?.hidden);
  ok('clicking section pill opens slide-over Quick Edit drawer', drawerVisible);
  await page.screenshot({ path: `${ARTIFACTS}/verify-v11-quick-edit-drawer.png` });

  await page.click('[data-qe-close]');
  await page.click('[data-qe-toggle]'); // turn Edit Mode OFF cleanly

  // 5. Blog CRUD (Draft -> Publish -> XSS sanitization -> RSS -> Delete)
  console.log('\n[Blog CRUD & Draft/Publish]');
  const createdPost = await page.evaluate(async () => {
    const res = await fetch('/api/admin/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: 'cms-smoke-post',
        lang: 'en',
        title: 'CMS Smoke Article',
        description: 'Testing live blog CRUD pipeline.',
        bodyMarkdown: '## Live Markdown\n\nHello **Zarvaism**.\n\n<script>window.__xss=1</script>',
        coverUrl: '',
        tags: ['Testing', 'SSR'],
        published: false,
        pubDate: '2026-11-22',
        updatedDate: '',
      }),
    });
    return { status: res.status, data: await res.json() };
  });
  ok('creates Draft blog post (201)', createdPost.status === 201);

  await page.goto(`${BASE}/blog`, { waitUntil: 'networkidle' });
  const draftHiddenOnIndex = !(await page.textContent('main')).includes('CMS Smoke Article');
  ok('Draft blog post is hidden from public /blog index', draftHiddenOnIndex);

  // Publish the post
  const pubId = createdPost.data.item.id;
  await page.evaluate(async (id) => {
    const g = await (await fetch(`/api/admin/posts/${id}`)).json();
    const item = g.item;
    await fetch(`/api/admin/posts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: item.slug,
        lang: item.lang,
        title: item.title,
        description: item.description,
        bodyMarkdown: item.bodyMarkdown,
        coverUrl: item.coverUrl,
        tags: item.tags,
        published: true,
        pubDate: item.pubDate,
        updatedDate: '2026-11-22',
      }),
    });
  }, pubId);

  await page.goto(`${BASE}/blog`, { waitUntil: 'networkidle' });
  ok('Published blog post appears immediately on /blog', (await page.textContent('main')).includes('CMS Smoke Article'));

  await page.goto(`${BASE}/blog/cms-smoke-post`, { waitUntil: 'networkidle' });
  const postAudit = await page.evaluate(() => ({
    h2: document.querySelector('.prose h2')?.textContent || '',
    hasScript: Boolean(document.querySelector('.prose script')) || Boolean(window.__xss),
  }));
  ok('Blog post renders sanitized Markdown inside .prose', postAudit.h2 === 'Live Markdown' && !postAudit.hasScript, JSON.stringify(postAudit));

  const rssXml = await page.evaluate(async () => await (await fetch('/rss.xml')).text());
  ok('/rss.xml includes newly published blog post', rssXml.includes('CMS Smoke Article'));

  // Delete smoke post
  await page.evaluate(async (id) => {
    await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
  }, pubId);

  // 6. Experience & Project CRUD
  console.log('\n[Experience & Project CRUD]');
  const expId = await page.evaluate(async () => {
    const res = await fetch('/api/admin/experiences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: 'smoke-exp',
        company: 'Smoke Test Lab',
        role: 'Principal Tester',
        type: 'Contract',
        location: 'Remote',
        period: '2026',
        sortOrder: 99,
        project: 'QA',
        summary: 'Temporary QA item.',
        stack: ['Playwright'],
        points: ['Verified live CRUD'],
      }),
    });
    return (await res.json()).item.id;
  });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  ok('new Experience renders on /', (await page.textContent('#experience')).includes('Smoke Test Lab'));
  await page.evaluate(async (id) => await fetch(`/api/admin/experiences/${id}`, { method: 'DELETE' }), expId);

  const projId = await page.evaluate(async () => {
    const res = await fetch('/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: 'smoke-proj',
        title: 'Smoke Case',
        year: 2026,
        role: 'Architect',
        category: 'System',
        platform: 'Web',
        panelLabel: 'smoke.case',
        summary: 'Temporary case study.',
        coverUrl: '/images/projects/artiva-cover.png',
        coverAlt: 'Smoke cover',
        videoUrl: '',
        coverPosition: 'center',
        featured: false,
        published: true,
        sortOrder: 99,
        stack: ['Astro'],
        metrics: [],
        problem: 'Test problem',
        approach: 'Test approach',
        result: 'Test result',
        highlights: ['Clean pass'],
        gallery: [],
        links: [],
        bodyMarkdown: '',
      }),
    });
    return (await res.json()).item.id;
  });
  const projStatus = (await page.goto(`${BASE}/projects/smoke-proj`, { waitUntil: 'networkidle' })).status();
  ok('new Project renders live at /projects/smoke-proj', projStatus === 200);
  await page.evaluate(async (id) => await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' }), projId);

  // 7. Media Upload & Local Serving
  console.log('\n[Media Upload & Serving]');
  const mediaCheck = await page.evaluate(async () => {
    // 1x1 transparent PNG
    const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const file = new File([bytes], 'smoke-pixel.png', { type: 'image/png' });
    const fd = new FormData();
    fd.append('file', file);
    const up = await fetch('/api/admin/media', { method: 'POST', body: fd });
    const upJson = await up.json();
    const fetched = await fetch(upJson.item.url);
    const ct = fetched.headers.get('content-type') || '';
    const del = await fetch(`/api/admin/media/${upJson.item.id}`, { method: 'DELETE' });
    return { upStatus: up.status, getStatus: fetched.status, ct, delStatus: del.status };
  });
  ok(
    'media upload, serve (image/png), and delete succeed cleanly',
    mediaCheck.upStatus === 201 &&
      mediaCheck.getStatus === 200 &&
      mediaCheck.ct.includes('image/png') &&
      mediaCheck.delStatus === 200,
    JSON.stringify(mediaCheck)
  );

  ok('zero console/page errors across CMS verification', errors.length === 0, errors.join(' | '));
  await ctx.close();
} finally {
  await browser.close();
}

console.log(fails === 0 ? '\nALL CMS CHECKS PASSED' : `\n${fails} CMS CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
