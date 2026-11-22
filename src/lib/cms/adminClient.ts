import {
  bilingualPair,
  checkboxField,
  el,
  inputField,
  mediaUrlField,
  renderRepeater,
  showToast,
  slugify,
  uploadFile,
} from './adminDom';
import type { AllSectionsMap, ExperienceRecord, MediaRecord, PostRecord, ProjectRecord } from './repository';
import type { SectionKey } from './validators';

interface CmsAdminState {
  sections: AllSectionsMap;
  experiences: ExperienceRecord[];
  projects: ProjectRecord[];
  posts: PostRecord[];
  media: MediaRecord[];
  adminEmail: string;
}

async function apiJson<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) {
    const detail = Array.isArray(data.issues)
      ? data.issues.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`).join('; ')
      : '';
    throw new Error(detail ? `${data.error} (${detail})` : data.error || 'Request gagal');
  }
  return data as T;
}

function csvToArr(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function linesToArr(raw: string): string[] {
  return raw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function initCmsAdmin(): void {
  const seedEl = document.getElementById('cms-initial-state');
  const stageEl = document.getElementById('cms-stage');
  if (!seedEl || !stageEl) return;
  const stage: HTMLElement = stageEl;

  const state = JSON.parse(seedEl.textContent || '{}') as CmsAdminState;
  const params = new URLSearchParams(window.location.search);
  let activeTab = params.get('tab') || 'overview';
  let editId = params.get('edit') || '';
  let wantNew = params.get('new') === '1';

  const refreshNavCounts = () => {
    const counts: Record<string, number> = {
      experiences: state.experiences.length,
      projects: state.projects.length,
      blog: state.posts.length,
      media: state.media.length,
    };
    document.querySelectorAll<HTMLElement>('[data-cms-count]').forEach((badge) => {
      const key = badge.dataset.cmsCount || '';
      if (key in counts) badge.textContent = String(counts[key]);
    });
  };

  const setActiveNav = (tab: string) => {
    document.querySelectorAll<HTMLButtonElement>('[data-cms-tab]').forEach((btn) => {
      const isMatch = btn.dataset.cmsTab === tab;
      btn.setAttribute('aria-current', isMatch ? 'page' : 'false');
      btn.dataset.active = isMatch ? 'true' : 'false';
      if (isMatch) {
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    });
    refreshNavCounts();
  };

  const navigate = (tab: string, opts: { edit?: string; isNew?: boolean } = {}) => {
    activeTab = tab;
    editId = opts.edit || '';
    wantNew = Boolean(opts.isNew);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('tab', tab);
    if (editId) nextUrl.searchParams.set('edit', editId);
    else nextUrl.searchParams.delete('edit');
    if (wantNew) nextUrl.searchParams.set('new', '1');
    else nextUrl.searchParams.delete('new');
    window.history.replaceState({}, '', nextUrl.toString());
    renderTab();
  };

  // Global top actions
  document.getElementById('cms-theme-btn')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'night' ? 'paper' : 'night';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {}
  });

  document.getElementById('cms-seed-btn')?.addEventListener('click', async () => {
    try {
      const res = await apiJson<{ seeded: Record<string, number> }>('/api/admin/seed', { method: 'POST' });
      showToast(`DB Sync selesai: ${JSON.stringify(res.seeded)}`);
      window.location.reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Seed gagal', true);
    }
  });

  document.getElementById('cms-logout-btn')?.addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  });

  document.querySelectorAll<HTMLButtonElement>('[data-cms-tab]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.cmsTab || 'overview'));
  });

  const renderSectionToolbar = (
    title: string,
    subtitle: string,
    key: SectionKey,
    onSave: () => Promise<void>
  ): HTMLDivElement => {
    const bar = el('div', 'mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[color:var(--hairline)] pb-5');
    const left = el('div');
    left.appendChild(el('p', 'label text-[0.5625rem] text-brand', `SECTION · ${key.toUpperCase()}`));
    left.appendChild(el('h2', 'display mt-1 text-[2rem] leading-none', title));
    left.appendChild(el('p', 'mt-2 text-sm text-subtle', subtitle));

    const actions = el('div', 'flex flex-wrap gap-2');
    const resetBtn = el('button', 'btn btn--ghost h-10 cursor-pointer px-4 text-[0.625rem]', 'RESET DEFAULT');
    resetBtn.type = 'button';
    resetBtn.onclick = async () => {
      if (!confirm(`Kembalikan section "${title}" ke nilai bawaan kode?`)) return;
      try {
        const res = await apiJson<{ data: unknown }>(`/api/admin/sections/${key}`, { method: 'DELETE' });
        (state.sections as unknown as Record<string, unknown>)[key] = res.data;
        showToast(`${title} di-reset ke default.`);
        renderTab();
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Reset gagal', true);
      }
    };

    const saveBtn = el('button', 'btn btn--solid h-10 cursor-pointer px-5 text-[0.625rem]', 'SIMPAN PERUBAHAN');
    saveBtn.type = 'button';
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'MENYIMPAN...';
      try {
        await onSave();
        showToast(`${title} berhasil disimpan & langsung live!`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Gagal menyimpan', true);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'SIMPAN PERUBAHAN';
      }
    };

    actions.append(resetBtn, saveBtn);
    bar.append(left, actions);
    return bar;
  };

  function renderOverview(): void {
    stage.innerHTML = '';
    const head = el('div', 'mb-8 border-b border-[color:var(--hairline)] pb-5');
    head.appendChild(el('p', 'label text-brand', `SIGNED IN AS ${state.adminEmail}`));
    head.appendChild(el('h1', 'display mt-2 text-[2.5rem] leading-none', 'Studio Overview.'));
    head.appendChild(
      el('p', 'mt-2 text-sm text-subtle', 'Kelola seluruh section portofolio, studi kasus, pengalaman, media, dan blog secara instan.')
    );
    stage.appendChild(head);

    const publishedPosts = state.posts.filter((p) => p.published).length;
    const draftPosts = state.posts.length - publishedPosts;
    const stats = [
      { k: 'SECTIONS', v: '7', sub: 'Hero, About, How, Archive, FAQ, CV, Settings', tab: 'hero' },
      { k: 'EXPERIENCE', v: String(state.experiences.length), sub: 'Urutan 1 otomatis berstatus ACTIVE', tab: 'experiences' },
      { k: 'PROJECTS', v: String(state.projects.length), sub: `${state.projects.filter((p) => p.featured).length} featured case studies`, tab: 'projects' },
      { k: 'BLOG POSTS', v: String(state.posts.length), sub: `${publishedPosts} published · ${draftPosts} draft`, tab: 'blog' },
    ];

    const grid = el('div', 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4');
    stats.forEach((st) => {
      const card = el(
        'button',
        'cursor-pointer border border-[color:var(--hairline)] bg-[color:var(--surface)]/45 p-5 text-left transition-colors hover:border-brand'
      );
      card.type = 'button';
      card.onclick = () => navigate(st.tab);
      card.appendChild(el('span', 'label text-[0.5625rem] text-brand', st.k));
      card.appendChild(el('span', 'display mt-3 block text-[2.75rem] leading-none', st.v));
      card.appendChild(el('span', 'mt-2 block text-xs text-subtle', st.sub));
      grid.appendChild(card);
    });
    stage.appendChild(grid);

    const quick = el('div', 'mt-8 border border-[color:var(--hairline)] bg-[color:var(--surface)]/30 p-6');
    quick.appendChild(el('p', 'label mb-4 text-brand', 'AKSI CEPAT'));
    const row = el('div', 'flex flex-wrap gap-3');
    const b1 = el('button', 'btn btn--solid h-10 cursor-pointer px-5 text-[0.625rem]', '+ TULIS ARTIKEL BLOG');
    b1.onclick = () => navigate('blog', { isNew: true });
    const b2 = el('button', 'btn btn--ghost h-10 cursor-pointer px-5 text-[0.625rem]', '+ TAMBAH PROJECT');
    b2.onclick = () => navigate('projects', { isNew: true });
    const b3 = el('button', 'btn btn--ghost h-10 cursor-pointer px-5 text-[0.625rem]', '+ TAMBAH EXPERIENCE');
    b3.onclick = () => navigate('experiences', { isNew: true });
    const b4 = el('a', 'btn btn--ghost h-10 px-5 text-[0.625rem]', 'BUKA HALAMAN UTAMA ↗');
    b4.href = '/';
    row.append(b1, b2, b3, b4);
    quick.appendChild(row);
    stage.appendChild(quick);
  }

  function renderSectionEditor(key: SectionKey): void {
    stage.innerHTML = '';
    const card = el('div', 'space-y-6');

    const saveSection = async (payload: unknown) => {
      const res = await apiJson<{ data: unknown }>(`/api/admin/sections/${key}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      (state.sections as unknown as Record<string, unknown>)[key] = res.data;
    };

    if (key === 'hero') {
      const d = state.sections.hero;
      card.appendChild(renderSectionToolbar('Hero Section', 'Headline, CTA, stats odometer, ticker, dan potret Hero.', 'hero', () => saveSection(d)));
      card.appendChild(inputField('Eyebrow Role', d.eyebrowRole, (v) => (d.eyebrowRole = v)));
      card.appendChild(bilingualPair('Availability Pill', d.availability));
      card.appendChild(bilingualPair('Headline Utama', d.headline));
      card.appendChild(bilingualPair('Headline Accent (Clay)', d.headlineAccent));
      card.appendChild(bilingualPair('Subheadline', d.sub, { multiline: true, rows: 2 }));
      card.appendChild(bilingualPair('Primary CTA', d.ctaPrimary));
      card.appendChild(bilingualPair('Secondary CTA', d.ctaSecondary));
      card.appendChild(
        inputField('Hero Ticker (pisahkan koma)', d.ticker.join(', '), (v) => (d.ticker = csvToArr(v)))
      );
      card.appendChild(
        mediaUrlField(
          'Override Portrait Image (kosongkan untuk memakai bg-image.jpg halftone default)',
          d.portraitUrl,
          (v) => (d.portraitUrl = v),
          (m) => state.media.unshift({ ...m, pathname: m.url, createdAt: Date.now() })
        )
      );
      card.appendChild(
        renderRepeater(
          'Hero Stats (Odometer)',
          d.stats,
          () => ({ value: '1+', label: { en: 'New stat', id: 'Stat baru' } }),
          (st) => {
            const box = el('div', 'space-y-3');
            box.appendChild(inputField('Angka / Value', st.value, (v) => (st.value = v)));
            box.appendChild(bilingualPair('Label', st.label));
            return box;
          }
        )
      );
    } else if (key === 'about') {
      const d = state.sections.about;
      card.appendChild(renderSectionToolbar('About & Bento Cards', 'Pernyataan utama, bio, metadata, dan 3 kartu keahlian.', 'about', () => saveSection(d)));
      card.appendChild(bilingualPair('Statement Utama', d.statement, { multiline: true, rows: 2 }));
      card.appendChild(bilingualPair('Paragraf Bio', d.body, { multiline: true, rows: 3 }));
      const metaEnText = d.meta.en.map(([k, v]) => `${k}: ${v}`).join('\n');
      const metaIdText = d.meta.id.map(([k, v]) => `${k}: ${v}`).join('\n');
      const metaGrid = el('div', 'grid gap-4 md:grid-cols-2');
      const parseMetaLines = (raw: string): [string, string][] =>
        linesToArr(raw).map((l) => {
          const i = l.indexOf(':');
          return i > -1 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [l, '-'];
        });
      metaGrid.appendChild(
        inputField('Meta List EN (1 per baris: Key: Value)', metaEnText, (v) => (d.meta.en = parseMetaLines(v)), { multiline: true, rows: 3, mono: true })
      );
      metaGrid.appendChild(
        inputField('Meta List ID (1 per baris: Key: Value)', metaIdText, (v) => (d.meta.id = parseMetaLines(v)), { multiline: true, rows: 3, mono: true })
      );
      card.appendChild(metaGrid);
      card.appendChild(
        renderRepeater(
          'Bento Discipline Cards',
          d.disciplines,
          () => ({
            index: '04',
            slug: 'New',
            title: 'Discipline',
            body: 'Description EN',
            bodyId: 'Deskripsi ID',
            tags: ['Tag'],
          }),
          (disc) => {
            const g = el('div', 'space-y-3');
            const top = el('div', 'grid gap-3 sm:grid-cols-3');
            top.appendChild(inputField('Index', disc.index, (v) => (disc.index = v)));
            top.appendChild(inputField('Slug Label', disc.slug, (v) => (disc.slug = v)));
            top.appendChild(inputField('Title', disc.title, (v) => (disc.title = v)));
            g.appendChild(top);
            g.appendChild(inputField('Body (EN)', disc.body, (v) => (disc.body = v), { multiline: true, rows: 2 }));
            g.appendChild(inputField('Body (ID)', disc.bodyId, (v) => (disc.bodyId = v), { multiline: true, rows: 2 }));
            g.appendChild(inputField('Tags (koma)', disc.tags.join(', '), (v) => (disc.tags = csvToArr(v))));
            return g;
          }
        )
      );
    } else if (key === 'how') {
      const d = state.sections.how;
      card.appendChild(renderSectionToolbar('How I Work', 'Judul, pengantar, dan kartu langkah proses kerja.', 'how', () => saveSection(d)));
      card.appendChild(bilingualPair('Judul Section', d.title));
      card.appendChild(bilingualPair('Pengantar Section', d.lede, { multiline: true, rows: 2 }));
      card.appendChild(
        renderRepeater(
          'Workflow Steps',
          d.steps,
          () => ({ n: '05', title: { en: 'Step', id: 'Langkah' }, body: { en: 'Detail', id: 'Detail' }, out: 'Deliverable' }),
          (st) => {
            const box = el('div', 'space-y-3');
            const r = el('div', 'grid gap-3 sm:grid-cols-2');
            r.appendChild(inputField('Nomor', st.n, (v) => (st.n = v)));
            r.appendChild(inputField('Artifact / Output', st.out, (v) => (st.out = v)));
            box.appendChild(r);
            box.appendChild(bilingualPair('Judul Langkah', st.title));
            box.appendChild(bilingualPair('Deskripsi', st.body, { multiline: true, rows: 2 }));
            return box;
          }
        )
      );
    } else if (key === 'other_projects') {
      const d = state.sections.other_projects;
      card.appendChild(renderSectionToolbar('Other Projects (Archive)', 'Tabel proyek sekunder di bagian bawah halaman.', 'other_projects', () => saveSection(d)));
      card.appendChild(bilingualPair('Judul Section', d.title));
      card.appendChild(
        renderRepeater(
          'Baris Arsip Proyek',
          d.items,
          () => ({ year: '2026', project: 'New Project', category: 'Web', stack: 'React, TS', artifact: 'Production' }),
          (it) => {
            const g = el('div', 'grid gap-3 sm:grid-cols-2');
            g.appendChild(inputField('Tahun', it.year, (v) => (it.year = v)));
            g.appendChild(inputField('Nama Proyek', it.project, (v) => (it.project = v)));
            g.appendChild(inputField('Kategori', it.category, (v) => (it.category = v)));
            g.appendChild(inputField('Tech Stack', it.stack, (v) => (it.stack = v)));
            g.appendChild(inputField('Artefak', it.artifact, (v) => (it.artifact = v)));
            return g;
          }
        )
      );
    } else if (key === 'faq') {
      const d = state.sections.faq;
      card.appendChild(renderSectionToolbar('FAQ Accordion', 'Daftar tanya-jawab bilingual untuk section 07 FAQ.', 'faq', () => saveSection(d)));
      card.appendChild(bilingualPair('Judul Section', d.title));
      card.appendChild(
        renderRepeater(
          'FAQ Items (EN)',
          d.items.en,
          () => ['New question?', 'Answer here.'] as [string, string],
          (pair, idx) => {
            const b = el('div', 'space-y-2');
            b.appendChild(inputField('Question (EN)', pair[0], (v) => (d.items.en[idx][0] = v)));
            b.appendChild(inputField('Answer (EN)', pair[1], (v) => (d.items.en[idx][1] = v), { multiline: true, rows: 2 }));
            return b;
          }
        )
      );
      card.appendChild(
        renderRepeater(
          'FAQ Items (ID)',
          d.items.id,
          () => ['Pertanyaan baru?', 'Jawaban di sini.'] as [string, string],
          (pair, idx) => {
            const b = el('div', 'space-y-2');
            b.appendChild(inputField('Pertanyaan (ID)', pair[0], (v) => (d.items.id[idx][0] = v)));
            b.appendChild(inputField('Jawaban (ID)', pair[1], (v) => (d.items.id[idx][1] = v), { multiline: true, rows: 2 }));
            return b;
          }
        )
      );
    } else if (key === 'cv') {
      const d = state.sections.cv;
      card.appendChild(renderSectionToolbar('Curriculum Vitae Data', 'Pendidikan, sertifikasi, organisasi, skill, dan tautan PDF CV.', 'cv', () => saveSection(d)));
      const top = el('div', 'grid gap-4 sm:grid-cols-2');
      top.appendChild(inputField('Tahun CV', d.year, (v) => (d.year = v)));
      top.appendChild(inputField('Path / URL PDF CV', d.pdfHref, (v) => (d.pdfHref = v)));
      card.appendChild(top);
      card.appendChild(
        renderRepeater(
          'Skills Groups',
          d.skillGroups,
          () => ({ label: 'Category', items: 'Skill A · Skill B' }),
          (g) => {
            const r = el('div', 'grid gap-3 sm:grid-cols-2');
            r.appendChild(inputField('Kelompok', g.label, (v) => (g.label = v)));
            r.appendChild(inputField('Daftar Skill', g.items, (v) => (g.items = v)));
            return r;
          }
        )
      );
      card.appendChild(
        renderRepeater(
          'Education',
          d.education,
          () => ({ school: 'University', degree: { en: 'Degree', id: 'Gelar' }, period: '2026' }),
          (e) => {
            const b = el('div', 'space-y-3');
            const r = el('div', 'grid gap-3 sm:grid-cols-2');
            r.appendChild(inputField('Institusi', e.school, (v) => (e.school = v)));
            r.appendChild(inputField('Periode', e.period, (v) => (e.period = v)));
            b.appendChild(r);
            b.appendChild(bilingualPair('Jurusan / Gelar', e.degree));
            return b;
          }
        )
      );
      card.appendChild(
        renderRepeater(
          'Certifications & Recognition',
          d.certifications,
          () => ({ title: 'Certification', issuer: 'Issuer', period: '2026' }),
          (c) => {
            const r = el('div', 'grid gap-3 sm:grid-cols-3');
            r.appendChild(inputField('Judul', c.title, (v) => (c.title = v)));
            r.appendChild(inputField('Penerbit', c.issuer, (v) => (c.issuer = v)));
            r.appendChild(inputField('Tahun', c.period, (v) => (c.period = v)));
            return r;
          }
        )
      );
      card.appendChild(
        renderRepeater(
          'Organisation & Committees',
          d.organisation,
          () => ({ role: { en: 'Role', id: 'Peran' }, period: '2025' }),
          (o) => {
            const b = el('div', 'space-y-3');
            b.appendChild(bilingualPair('Peran', o.role));
            b.appendChild(inputField('Periode', o.period, (v) => (o.period = v)));
            return b;
          }
        )
      );
    } else if (key === 'settings') {
      const d = state.sections.settings;
      card.appendChild(renderSectionToolbar('Global Settings & Footer', 'Identitas brand, email kontak, tautan sosial, dan motto footer.', 'settings', () => saveSection(d)));
      const g1 = el('div', 'grid gap-4 sm:grid-cols-2');
      g1.appendChild(inputField('Brand', d.brand, (v) => (d.brand = v)));
      g1.appendChild(inputField('Nama Lengkap', d.name, (v) => (d.name = v)));
      g1.appendChild(inputField('Role Default', d.role, (v) => (d.role = v)));
      g1.appendChild(inputField('Email Kontak', d.email, (v) => (d.email = v), { type: 'email' }));
      g1.appendChild(inputField('Lokasi Lengkap', d.location, (v) => (d.location = v)));
      g1.appendChild(inputField('Lokasi Singkat', d.shortLocation, (v) => (d.shortLocation = v)));
      card.appendChild(g1);
      card.appendChild(bilingualPair('Meta Description', d.description, { multiline: true, rows: 2 }));
      card.appendChild(bilingualPair('Footer Ticker Motto', d.footer.tickerMotto));
      card.appendChild(bilingualPair('Footer Reply Note', d.footer.replyNote));
      card.appendChild(bilingualPair('Footer Motto', d.footer.motto));
      card.appendChild(
        renderRepeater(
          'Social Links',
          d.social,
          () => ({ label: 'Platform', handle: '@handle', href: 'https://' }),
          (s) => {
            const r = el('div', 'grid gap-3 sm:grid-cols-3');
            r.appendChild(inputField('Label', s.label, (v) => (s.label = v)));
            r.appendChild(inputField('Handle', s.handle, (v) => (s.handle = v)));
            r.appendChild(inputField('URL', s.href, (v) => (s.href = v)));
            return r;
          }
        )
      );
    }

    stage.appendChild(card);
  }

  function renderExperiencesTab(): void {
    refreshNavCounts();
    stage.innerHTML = '';
    const head = el('div', 'mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[color:var(--hairline)] pb-5');
    const left = el('div');
    left.appendChild(el('p', 'label text-brand', 'COLLECTION · EXPERIENCES'));
    left.appendChild(el('h2', 'display mt-1 text-[2rem] leading-none', 'Work Experience CRUD.'));
    left.appendChild(el('p', 'mt-2 text-sm text-subtle', 'Urutan teratas otomatis mendapat badge ACTIVE di Career Spine.'));
    const addBtn = el('button', 'btn btn--solid h-10 cursor-pointer px-5 text-[0.625rem]', '+ TAMBAH ROLE');
    addBtn.onclick = () => openExpEditor(null);
    head.append(left, addBtn);
    stage.appendChild(head);

    const openExpEditor = (existing: ExperienceRecord | null) => {
      const formWrap = el('div', 'mb-8 border border-brand/60 bg-[color:var(--surface)]/45 p-6 space-y-4');
      const draft = existing
        ? structuredClone(existing)
        : {
            id: '',
            slug: '',
            company: '',
            role: '',
            type: 'Full-time',
            location: 'Purwokerto',
            period: '2026 — Present',
            sortOrder: state.experiences.length,
            project: '',
            summary: '',
            stack: [] as string[],
            points: [''],
            updatedAt: 0,
          };

      formWrap.appendChild(el('h3', 'display text-2xl', existing ? `Edit: ${existing.company}` : 'Tambah Pengalaman Baru'));
      const g = el('div', 'grid gap-4 sm:grid-cols-2');
      const slugInpWrap = inputField('Slug URL (unik)', draft.slug, (v) => (draft.slug = v), { mono: true });
      g.appendChild(
        inputField('Perusahaan / Institusi', draft.company, (v) => {
          draft.company = v;
          if (!existing && !draft.slug) {
            draft.slug = slugify(v);
            const inp = slugInpWrap.querySelector('input');
            if (inp) inp.value = draft.slug;
          }
        })
      );
      g.appendChild(slugInpWrap);
      g.appendChild(inputField('Jabatan / Role', draft.role, (v) => (draft.role = v)));
      g.appendChild(inputField('Tipe (Full-time/Contract/Intern)', draft.type, (v) => (draft.type = v)));
      g.appendChild(inputField('Lokasi', draft.location, (v) => (draft.location = v)));
      g.appendChild(inputField('Periode', draft.period, (v) => (draft.period = v)));
      g.appendChild(inputField('Fokus Proyek', draft.project, (v) => (draft.project = v)));
      g.appendChild(inputField('Tech Stack (pisahkan koma)', draft.stack.join(', '), (v) => (draft.stack = csvToArr(v))));
      formWrap.appendChild(g);
      formWrap.appendChild(inputField('Ringkasan', draft.summary, (v) => (draft.summary = v), { multiline: true, rows: 2 }));
      formWrap.appendChild(
        inputField(
          'Poin Impact (+ IMPACT — 1 poin per baris)',
          draft.points.join('\n'),
          (v) => (draft.points = linesToArr(v)),
          { multiline: true, rows: 5 }
        )
      );

      const bar = el('div', 'flex gap-3 pt-2');
      const save = el('button', 'btn btn--solid h-10 cursor-pointer px-5 text-[0.625rem]', existing ? 'UPDATE ROLE' : 'SIMPAN ROLE');
      save.onclick = async () => {
        save.disabled = true;
        try {
          const payload = {
            slug: draft.slug || slugify(draft.company),
            company: draft.company,
            role: draft.role,
            type: draft.type,
            location: draft.location,
            period: draft.period,
            sortOrder: draft.sortOrder,
            project: draft.project,
            summary: draft.summary,
            stack: draft.stack,
            points: draft.points,
          };
          if (existing) {
            const res = await apiJson<{ item: ExperienceRecord }>(`/api/admin/experiences/${existing.id}`, {
              method: 'PUT',
              body: JSON.stringify(payload),
            });
            const idx = state.experiences.findIndex((e) => e.id === existing.id);
            if (idx >= 0) state.experiences[idx] = res.item;
            showToast('Experience diperbarui!');
          } else {
            const res = await apiJson<{ item: ExperienceRecord }>('/api/admin/experiences', {
              method: 'POST',
              body: JSON.stringify(payload),
            });
            state.experiences.push(res.item);
            showToast('Experience baru ditambahkan!');
          }
          renderExperiencesTab();
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Gagal menyimpan', true);
        } finally {
          save.disabled = false;
        }
      };
      const cancel = el('button', 'btn btn--ghost h-10 cursor-pointer px-4 text-[0.625rem]', 'BATAL');
      cancel.onclick = () => formWrap.remove();
      bar.append(save, cancel);
      formWrap.appendChild(bar);
      stage.insertBefore(formWrap, listEl);
    };

    const listEl = el('div', 'divide-y divide-[color:var(--hairline)] border-y border-[color:var(--hairline)]');
    state.experiences.forEach((item, idx) => {
      const row = el('div', 'flex flex-wrap items-center justify-between gap-4 py-4');
      const info = el('div');
      const titleLine = el('div', 'flex items-center gap-2.5');
      titleLine.appendChild(el('span', 'numeral text-sm text-brand', String(idx + 1).padStart(2, '0')));
      titleLine.appendChild(el('h3', 'display text-xl', item.company));
      if (idx === 0) titleLine.appendChild(el('span', 'tag text-signal', 'ACTIVE'));
      info.appendChild(titleLine);
      info.appendChild(el('p', 'label mt-1 text-[0.5625rem] text-subtle', `${item.role} · ${item.period}`));

      const btns = el('div', 'flex items-center gap-2');
      const move = async (dir: -1 | 1) => {
        const target = idx + dir;
        if (target < 0 || target >= state.experiences.length) return;
        [state.experiences[idx], state.experiences[target]] = [state.experiences[target], state.experiences[idx]];
        state.experiences.forEach((e, i) => (e.sortOrder = i));
        await apiJson('/api/admin/experiences/reorder', {
          method: 'POST',
          body: JSON.stringify({ ids: state.experiences.map((e) => e.id) }),
        });
        showToast('Urutan disimpan!');
        renderExperiencesTab();
      };
      const up = el('button', 'btn btn--ghost h-8 cursor-pointer px-2.5 text-[0.5625rem]', '↑');
      up.disabled = idx === 0;
      up.onclick = () => move(-1);
      const down = el('button', 'btn btn--ghost h-8 cursor-pointer px-2.5 text-[0.5625rem]', '↓');
      down.disabled = idx === state.experiences.length - 1;
      down.onclick = () => move(1);
      const editBtn = el('button', 'btn btn--ghost h-8 cursor-pointer px-3 text-[0.5625rem]', 'EDIT');
      editBtn.onclick = () => openExpEditor(item);
      const delBtn = el('button', 'btn btn--ghost h-8 cursor-pointer px-3 text-[0.5625rem] text-brand', 'HAPUS');
      delBtn.onclick = async () => {
        if (!confirm(`Hapus pengalaman "${item.company}"?`)) return;
        await apiJson(`/api/admin/experiences/${item.id}`, { method: 'DELETE' });
        state.experiences.splice(idx, 1);
        showToast('Experience dihapus.');
        renderExperiencesTab();
      };

      btns.append(up, down, editBtn, delBtn);
      row.append(info, btns);
      listEl.appendChild(row);
    });
    stage.appendChild(listEl);

    if (wantNew) {
      wantNew = false;
      openExpEditor(null);
    }
  }

  function renderProjectsTab(): void {
    refreshNavCounts();
    stage.innerHTML = '';
    const head = el('div', 'mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[color:var(--hairline)] pb-5');
    const left = el('div');
    left.appendChild(el('p', 'label text-brand', 'COLLECTION · PROJECTS'));
    left.appendChild(el('h2', 'display mt-1 text-[2rem] leading-none', 'Selected Work & Case Studies.'));
    left.appendChild(el('p', 'mt-2 text-sm text-subtle', 'Proyek berstatus Featured & Published tampil sebagai Stacking Showcase Cards di beranda.'));
    const addBtn = el('button', 'btn btn--solid h-10 cursor-pointer px-5 text-[0.625rem]', '+ TAMBAH PROJECT');
    addBtn.onclick = () => openProjectEditor(null);
    head.append(left, addBtn);
    stage.appendChild(head);

    const openProjectEditor = (existing: ProjectRecord | null) => {
      const formWrap = el('div', 'mb-8 border border-brand/60 bg-[color:var(--surface)]/45 p-6 space-y-4');
      const draft: ProjectRecord = existing
        ? structuredClone(existing)
        : {
            id: '',
            slug: '',
            title: '',
            year: 2026,
            role: 'Mobile & Frontend Developer',
            category: 'Mobile App',
            platform: 'Android & Web',
            panelLabel: 'case.study.v1',
            summary: '',
            coverUrl: '/images/projects/artiva-cover.png',
            coverAlt: 'Project cover preview',
            videoUrl: '',
            coverPosition: 'center',
            featured: true,
            published: true,
            sortOrder: state.projects.length,
            stack: ['Flutter', 'TypeScript'],
            metrics: [{ value: '100%', label: 'Launch metric' }],
            problem: '',
            approach: '',
            result: '',
            highlights: [],
            gallery: [],
            links: [],
            bodyMarkdown: '',
            updatedAt: 0,
          };

      formWrap.appendChild(el('h3', 'display text-2xl', existing ? `Edit Case: ${existing.title}` : 'Tambah Studi Kasus Baru'));
      const g = el('div', 'grid gap-4 sm:grid-cols-2');
      const slugWrap = inputField('Slug URL', draft.slug, (v) => (draft.slug = v), { mono: true });
      g.appendChild(
        inputField('Judul Proyek', draft.title, (v) => {
          draft.title = v;
          if (!existing && !draft.slug) {
            draft.slug = slugify(v);
            const inp = slugWrap.querySelector('input');
            if (inp) inp.value = draft.slug;
          }
        })
      );
      g.appendChild(slugWrap);
      g.appendChild(inputField('Tahun', String(draft.year), (v) => (draft.year = Number(v) || 2026), { type: 'number' }));
      g.appendChild(inputField('Role', draft.role, (v) => (draft.role = v)));
      g.appendChild(inputField('Kategori', draft.category, (v) => (draft.category = v)));
      g.appendChild(inputField('Platform', draft.platform, (v) => (draft.platform = v)));
      g.appendChild(inputField('Panel Label', draft.panelLabel, (v) => (draft.panelLabel = v), { mono: true }));
      g.appendChild(inputField('Urutan (0 = paling atas)', String(draft.sortOrder), (v) => (draft.sortOrder = Number(v) || 0), { type: 'number' }));
      formWrap.appendChild(g);

      const flags = el('div', 'flex flex-wrap gap-6 py-1');
      flags.appendChild(checkboxField('Featured (Tampil di Beranda)', draft.featured, (v) => (draft.featured = v)));
      flags.appendChild(checkboxField('Published (Tayang Publik)', draft.published, (v) => (draft.published = v)));
      formWrap.appendChild(flags);

      formWrap.appendChild(
        mediaUrlField('Cover Image URL / Upload', draft.coverUrl, (v) => (draft.coverUrl = v))
      );
      formWrap.appendChild(inputField('Cover Alt Text', draft.coverAlt, (v) => (draft.coverAlt = v)));
      formWrap.appendChild(mediaUrlField('Opsional Hover Video (.mp4 / .webm)', draft.videoUrl, (v) => (draft.videoUrl = v)));
      formWrap.appendChild(inputField('Ringkasan Singkat', draft.summary, (v) => (draft.summary = v), { multiline: true, rows: 2 }));
      formWrap.appendChild(inputField('Problem', draft.problem, (v) => (draft.problem = v), { multiline: true, rows: 3 }));
      formWrap.appendChild(inputField('Approach', draft.approach, (v) => (draft.approach = v), { multiline: true, rows: 3 }));
      formWrap.appendChild(inputField('Result', draft.result, (v) => (draft.result = v), { multiline: true, rows: 3 }));
      formWrap.appendChild(inputField('Stack (pisahkan koma)', draft.stack.join(', '), (v) => (draft.stack = csvToArr(v))));
      formWrap.appendChild(inputField('Highlights (1 poin per baris)', draft.highlights.join('\n'), (v) => (draft.highlights = linesToArr(v)), { multiline: true, rows: 4 }));
      formWrap.appendChild(inputField('Catatan Tambahan (Markdown Opsional)', draft.bodyMarkdown, (v) => (draft.bodyMarkdown = v), { multiline: true, rows: 4, mono: true }));

      formWrap.appendChild(
        renderRepeater(
          'Metrics / Impact Figures',
          draft.metrics,
          () => ({ value: '1', label: 'Metric' }),
          (m) => {
            const r = el('div', 'grid gap-3 sm:grid-cols-2');
            r.appendChild(inputField('Value', m.value, (v) => (m.value = v)));
            r.appendChild(inputField('Label', m.label, (v) => (m.label = v)));
            return r;
          }
        )
      );

      formWrap.appendChild(
        renderRepeater(
          'Gallery Images',
          draft.gallery,
          () => '/images/projects/artiva-gallery-1.png',
          (urlStr, idx) =>
            mediaUrlField(`Gallery #${idx + 1}`, urlStr, (v) => {
              draft.gallery[idx] = v;
            })
        )
      );

      formWrap.appendChild(
        renderRepeater(
          'External Links',
          draft.links,
          () => ({ label: 'Live Demo', href: 'https://' }),
          (lnk) => {
            const r = el('div', 'grid gap-3 sm:grid-cols-2');
            r.appendChild(inputField('Label', lnk.label, (v) => (lnk.label = v)));
            r.appendChild(inputField('URL', lnk.href, (v) => (lnk.href = v)));
            return r;
          }
        )
      );

      const bar = el('div', 'flex gap-3 pt-2');
      const save = el('button', 'btn btn--solid h-10 cursor-pointer px-5 text-[0.625rem]', existing ? 'UPDATE PROJECT' : 'SIMPAN PROJECT');
      save.onclick = async () => {
        save.disabled = true;
        try {
          const payload = { ...draft, slug: draft.slug || slugify(draft.title) };
          if (existing) {
            const res = await apiJson<{ item: ProjectRecord }>(`/api/admin/projects/${existing.id}`, {
              method: 'PUT',
              body: JSON.stringify(payload),
            });
            const idx = state.projects.findIndex((p) => p.id === existing.id);
            if (idx >= 0) state.projects[idx] = res.item;
            showToast('Project berhasil diperbarui!');
          } else {
            const res = await apiJson<{ item: ProjectRecord }>('/api/admin/projects', {
              method: 'POST',
              body: JSON.stringify(payload),
            });
            state.projects.push(res.item);
            showToast('Project baru ditambahkan!');
          }
          renderProjectsTab();
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Gagal menyimpan', true);
        } finally {
          save.disabled = false;
        }
      };
      const cancel = el('button', 'btn btn--ghost h-10 cursor-pointer px-4 text-[0.625rem]', 'BATAL');
      cancel.onclick = () => formWrap.remove();
      bar.append(save, cancel);
      formWrap.appendChild(bar);
      stage.insertBefore(formWrap, listEl);
    };

    const listEl = el('div', 'divide-y divide-[color:var(--hairline)] border-y border-[color:var(--hairline)]');
    state.projects.forEach((p, idx) => {
      const row = el('div', 'flex flex-wrap items-center justify-between gap-4 py-4');
      const info = el('div', 'flex items-center gap-4');
      const thumb = el('img', 'h-14 w-20 border border-[color:var(--hairline)] bg-[color:var(--surface)] object-cover');
      thumb.src = p.coverUrl;
      thumb.alt = p.title;

      const meta = el('div');
      const titleRow = el('div', 'flex flex-wrap items-center gap-2');
      titleRow.appendChild(el('h3', 'display text-xl', p.title));
      if (p.featured) titleRow.appendChild(el('span', 'tag text-brand', 'FEATURED'));
      if (!p.published) titleRow.appendChild(el('span', 'tag text-subtle', 'DRAFT'));
      meta.appendChild(titleRow);
      meta.appendChild(el('p', 'label mt-1 text-[0.5625rem] text-subtle', `${p.year} · ${p.category} · /projects/${p.slug}`));
      info.append(thumb, meta);

      const btns = el('div', 'flex items-center gap-2');
      const view = el('a', 'btn btn--ghost h-8 px-3 text-[0.5625rem]', 'LIHAT ↗');
      view.href = `/projects/${p.slug}`;
      const edit = el('button', 'btn btn--ghost h-8 cursor-pointer px-3 text-[0.5625rem]', 'EDIT');
      edit.onclick = () => openProjectEditor(p);
      const del = el('button', 'btn btn--ghost h-8 cursor-pointer px-3 text-[0.5625rem] text-brand', 'HAPUS');
      del.onclick = async () => {
        if (!confirm(`Hapus proyek "${p.title}"?`)) return;
        await apiJson(`/api/admin/projects/${p.id}`, { method: 'DELETE' });
        state.projects.splice(idx, 1);
        showToast('Project dihapus.');
        renderProjectsTab();
      };
      btns.append(view, edit, del);
      row.append(info, btns);
      listEl.appendChild(row);
    });
    stage.appendChild(listEl);

    if (wantNew) {
      wantNew = false;
      openProjectEditor(null);
    }
  }

  function renderBlogTab(): void {
    refreshNavCounts();
    stage.innerHTML = '';
    let filterLang: 'all' | 'en' | 'id' = 'all';

    const head = el('div', 'mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[color:var(--hairline)] pb-5');
    const left = el('div');
    left.appendChild(el('p', 'label text-brand', 'EDITORIAL · BLOG WRITING'));
    left.appendChild(el('h2', 'display mt-1 text-[2rem] leading-none', 'Blog Studio.'));
    left.appendChild(el('p', 'mt-2 text-sm text-subtle', 'Tulis artikel dalam Markdown dengan live preview, atur Draft/Publish, dan sinkron otomatis ke RSS.'));
    const addBtn = el('button', 'btn btn--solid h-10 cursor-pointer px-5 text-[0.625rem]', '+ ARTIKEL BARU');
    addBtn.onclick = () => openPostEditor(null);
    head.append(left, addBtn);
    stage.appendChild(head);

    const openPostEditor = (existing: PostRecord | null) => {
      const wrap = el('div', 'mb-8 border border-brand/60 bg-[color:var(--surface)]/45 p-6 space-y-5');
      const today = new Date().toISOString().slice(0, 10);
      const draft: PostRecord = existing
        ? structuredClone(existing)
        : {
            id: '',
            slug: '',
            lang: 'id',
            title: '',
            description: '',
            bodyMarkdown: '## Mulai menulis\n\nTulis catatan atau pembahasan teknismu di sini...',
            coverUrl: '',
            tags: ['Engineering'],
            published: false,
            pubDate: today,
            updatedDate: '',
            createdAt: 0,
            updatedAt: 0,
          };

      wrap.appendChild(el('h3', 'display text-2xl', existing ? `Edit Artikel: ${existing.title}` : 'Tulis Artikel Blog Baru'));

      const metaGrid = el('div', 'grid gap-4 sm:grid-cols-2');
      const slugWrap = inputField('Slug URL', draft.slug, (v) => (draft.slug = v), { mono: true });
      metaGrid.appendChild(
        inputField('Judul Artikel', draft.title, (v) => {
          draft.title = v;
          if (!existing && !draft.slug) {
            draft.slug = slugify(v);
            const inp = slugWrap.querySelector('input');
            if (inp) inp.value = draft.slug;
          }
        })
      );
      metaGrid.appendChild(slugWrap);

      const langWrap = el('div');
      langWrap.appendChild(el('label', 'label mb-1.5 block text-[0.5625rem] text-subtle', 'Bahasa Artikel'));
      const sel = el('select', 'w-full border border-[color:var(--hairline)] bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-brand');
      sel.innerHTML = `<option value="en">English (/blog/...)</option><option value="id">Indonesia (/id/blog/...)</option>`;
      sel.value = draft.lang;
      sel.onchange = () => (draft.lang = sel.value === 'id' ? 'id' : 'en');
      langWrap.appendChild(sel);
      metaGrid.appendChild(langWrap);

      metaGrid.appendChild(inputField('Tanggal Terbit', draft.pubDate, (v) => (draft.pubDate = v), { type: 'date' }));
      metaGrid.appendChild(inputField('Tags (pisahkan koma)', draft.tags.join(', '), (v) => (draft.tags = csvToArr(v))));
      metaGrid.appendChild(mediaUrlField('Cover Image (Opsional)', draft.coverUrl, (v) => (draft.coverUrl = v)));
      wrap.appendChild(metaGrid);

      wrap.appendChild(inputField('Ringkasan / SEO Description', draft.description, (v) => (draft.description = v), { multiline: true, rows: 2 }));
      wrap.appendChild(checkboxField('Publish Artikel ke Publik (non-centang = Draft)', draft.published, (v) => (draft.published = v)));

      // Split Markdown Editor + Live Preview
      const editorSplit = el('div', 'grid gap-4 lg:grid-cols-2');
      const leftPane = el('div', 'space-y-2');
      const mdToolbar = el('div', 'flex items-center justify-between');
      mdToolbar.appendChild(el('span', 'label text-[0.5625rem] text-brand', 'MARKDOWN BODY'));
      const imgFile = el('input', 'hidden');
      imgFile.type = 'file';
      imgFile.accept = 'image/*';
      const insImgBtn = el('button', 'label cursor-pointer text-[0.5625rem] text-ink hover:text-brand', '+ SISIPKAN GAMBAR');
      insImgBtn.type = 'button';
      insImgBtn.onclick = () => imgFile.click();
      mdToolbar.append(insImgBtn, imgFile);
      leftPane.appendChild(mdToolbar);

      const mdArea = el(
        'textarea',
        'h-[360px] w-full border border-[color:var(--hairline)] bg-canvas p-3.5 font-mono text-xs leading-relaxed text-ink outline-none focus:border-brand'
      );
      mdArea.value = draft.bodyMarkdown;
      leftPane.appendChild(mdArea);

      const rightPane = el('div', 'space-y-2');
      rightPane.appendChild(el('span', 'label block text-[0.5625rem] text-subtle', 'LIVE PROSE PREVIEW'));
      const previewBox = el(
        'div',
        'prose h-[360px] max-w-none overflow-y-auto border border-[color:var(--hairline)] bg-canvas p-5 text-sm'
      );
      rightPane.appendChild(previewBox);

      let previewTimer = 0;
      const refreshPreview = () => {
        window.clearTimeout(previewTimer);
        previewTimer = window.setTimeout(async () => {
          try {
            const res = await apiJson<{ html: string }>('/api/admin/preview-markdown', {
              method: 'POST',
              body: JSON.stringify({ markdown: draft.bodyMarkdown }),
            });
            previewBox.innerHTML = res.html;
          } catch {}
        }, 200);
      };

      mdArea.addEventListener('input', () => {
        draft.bodyMarkdown = mdArea.value;
        refreshPreview();
      });
      imgFile.addEventListener('change', async () => {
        const f = imgFile.files?.[0];
        if (!f) return;
        try {
          const item = await uploadFile(f);
          mdArea.value += `\n\n![${f.name}](${item.url})\n`;
          draft.bodyMarkdown = mdArea.value;
          refreshPreview();
          showToast('Gambar disisipkan ke Markdown.');
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Upload gagal', true);
        } finally {
          imgFile.value = '';
        }
      });

      editorSplit.append(leftPane, rightPane);
      wrap.appendChild(editorSplit);
      refreshPreview();

      const bar = el('div', 'flex gap-3 pt-2');
      const saveBtn = el('button', 'btn btn--solid h-10 cursor-pointer px-5 text-[0.625rem]', existing ? 'UPDATE ARTIKEL' : 'SIMPAN ARTIKEL');
      saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        try {
          const payload = {
            slug: draft.slug || slugify(draft.title),
            lang: draft.lang,
            title: draft.title,
            description: draft.description,
            bodyMarkdown: draft.bodyMarkdown,
            coverUrl: draft.coverUrl,
            tags: draft.tags,
            published: draft.published,
            pubDate: draft.pubDate,
            updatedDate: existing ? today : '',
          };
          if (existing) {
            const res = await apiJson<{ item: PostRecord }>(`/api/admin/posts/${existing.id}`, {
              method: 'PUT',
              body: JSON.stringify(payload),
            });
            const idx = state.posts.findIndex((p) => p.id === existing.id);
            if (idx >= 0) state.posts[idx] = res.item;
            showToast('Artikel diperbarui!');
          } else {
            const res = await apiJson<{ item: PostRecord }>('/api/admin/posts', {
              method: 'POST',
              body: JSON.stringify(payload),
            });
            state.posts.unshift(res.item);
            showToast('Artikel berhasil disimpan!');
          }
          renderBlogTab();
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Gagal menyimpan', true);
        } finally {
          saveBtn.disabled = false;
        }
      };
      const cancelBtn = el('button', 'btn btn--ghost h-10 cursor-pointer px-4 text-[0.625rem]', 'BATAL');
      cancelBtn.onclick = () => wrap.remove();
      bar.append(saveBtn, cancelBtn);
      wrap.appendChild(bar);
      stage.insertBefore(wrap, filterRow);
    };

    const filterRow = el('div', 'mb-4 flex gap-2');
    (['all', 'en', 'id'] as const).forEach((l) => {
      const b = el('button', 'btn btn--ghost h-8 cursor-pointer px-3 text-[0.5625rem]', l.toUpperCase());
      b.onclick = () => {
        filterLang = l;
        drawList();
      };
      filterRow.appendChild(b);
    });
    stage.appendChild(filterRow);

    const listEl = el('div', 'divide-y divide-[color:var(--hairline)] border-y border-[color:var(--hairline)]');
    stage.appendChild(listEl);

    const drawList = () => {
      listEl.innerHTML = '';
      const filtered = state.posts.filter((p) => (filterLang === 'all' ? true : p.lang === filterLang));
      if (!filtered.length) {
        listEl.appendChild(el('p', 'py-8 text-sm text-subtle', 'Belum ada artikel di filter ini.'));
        return;
      }
      filtered.forEach((p) => {
        const row = el('div', 'flex flex-wrap items-center justify-between gap-4 py-4');
        const info = el('div');
        const tRow = el('div', 'flex flex-wrap items-center gap-2');
        tRow.appendChild(el('span', 'tag text-brand', p.lang.toUpperCase()));
        tRow.appendChild(el('span', p.published ? 'tag text-signal' : 'tag text-subtle', p.published ? 'PUBLISHED' : 'DRAFT'));
        tRow.appendChild(el('h3', 'display text-xl', p.title));
        info.appendChild(tRow);
        info.appendChild(
          el('p', 'label mt-1 text-[0.5625rem] text-subtle', `${p.pubDate} · ${p.lang === 'id' ? `/id/blog/${p.slug}` : `/blog/${p.slug}`}`)
        );

        const btns = el('div', 'flex items-center gap-2');
        const view = el('a', 'btn btn--ghost h-8 px-3 text-[0.5625rem]', 'PREVIEW ↗');
        view.href = p.lang === 'id' ? `/id/blog/${p.slug}` : `/blog/${p.slug}`;
        const edit = el('button', 'btn btn--ghost h-8 cursor-pointer px-3 text-[0.5625rem]', 'EDIT');
        edit.onclick = () => openPostEditor(p);
        const del = el('button', 'btn btn--ghost h-8 cursor-pointer px-3 text-[0.5625rem] text-brand', 'HAPUS');
        del.onclick = async () => {
          if (!confirm(`Hapus artikel "${p.title}"?`)) return;
          await apiJson(`/api/admin/posts/${p.id}`, { method: 'DELETE' });
          const idx = state.posts.findIndex((x) => x.id === p.id);
          if (idx >= 0) state.posts.splice(idx, 1);
          showToast('Artikel dihapus.');
          drawList();
        };
        btns.append(view, edit, del);
        row.append(info, btns);
        listEl.appendChild(row);
      });
    };

    drawList();

    if (editId) {
      const target = state.posts.find((p) => p.id === editId || p.slug === editId);
      editId = '';
      if (target) openPostEditor(target);
    } else if (wantNew) {
      wantNew = false;
      openPostEditor(null);
    }
  }

  function renderMediaTab(): void {
    refreshNavCounts();
    stage.innerHTML = '';
    const head = el('div', 'mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[color:var(--hairline)] pb-5');
    const left = el('div');
    left.appendChild(el('p', 'label text-brand', 'ASSETS · MEDIA LIBRARY'));
    left.appendChild(el('h2', 'display mt-1 text-[2rem] leading-none', 'Uploaded Media.'));
    left.appendChild(el('p', 'mt-2 text-sm text-subtle', 'Upload gambar/video untuk dipakai di Hero, Projects, dan Blog.'));

    const inp = el('input', 'hidden');
    inp.type = 'file';
    inp.accept = 'image/*,video/mp4,video/webm';
    const upBtn = el('button', 'btn btn--solid h-10 cursor-pointer px-5 text-[0.625rem]', '+ UPLOAD MEDIA');
    upBtn.onclick = () => inp.click();
    inp.onchange = async () => {
      const file = inp.files?.[0];
      if (!file) return;
      upBtn.disabled = true;
      try {
        const item = await uploadFile(file);
        state.media.unshift({ ...item, pathname: item.url, createdAt: Date.now() });
        showToast('Media berhasil diupload!');
        renderMediaTab();
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Upload gagal', true);
      } finally {
        upBtn.disabled = false;
        inp.value = '';
      }
    };

    head.append(left, upBtn, inp);
    stage.appendChild(head);

    if (!state.media.length) {
      stage.appendChild(el('p', 'text-sm text-subtle', 'Belum ada file media yang diupload.'));
      return;
    }

    const grid = el('div', 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3');
    state.media.forEach((m, idx) => {
      const card = el('div', 'border border-[color:var(--hairline)] bg-[color:var(--surface)]/35 p-3 space-y-2');
      if (m.mimeType.startsWith('video/')) {
        const vid = el('video', 'h-40 w-full bg-canvas object-contain');
        vid.src = m.url;
        vid.muted = true;
        vid.controls = true;
        card.appendChild(vid);
      } else {
        const img = el('img', 'h-40 w-full bg-canvas object-contain');
        img.src = m.url;
        img.alt = m.filename;
        card.appendChild(img);
      }
      card.appendChild(el('p', 'truncate font-mono text-xs text-ink', m.filename));
      card.appendChild(el('p', 'truncate font-mono text-[0.625rem] text-subtle', m.url));
      const row = el('div', 'flex gap-2 pt-1');
      const copy = el('button', 'btn btn--ghost h-8 flex-1 cursor-pointer px-2 text-[0.5625rem]', 'COPY URL');
      copy.onclick = async () => {
        await navigator.clipboard?.writeText(m.url);
        showToast('URL disalin!');
      };
      const del = el('button', 'btn btn--ghost h-8 cursor-pointer px-3 text-[0.5625rem] text-brand', 'HAPUS');
      del.onclick = async () => {
        if (!confirm(`Hapus file "${m.filename}"?`)) return;
        await apiJson(`/api/admin/media/${m.id}`, { method: 'DELETE' });
        state.media.splice(idx, 1);
        showToast('Media dihapus.');
        renderMediaTab();
      };
      row.append(copy, del);
      card.appendChild(row);
      grid.appendChild(card);
    });
    stage.appendChild(grid);
  }

  function renderTab(): void {
    setActiveNav(activeTab);
    if (activeTab === 'overview') return renderOverview();
    if (activeTab === 'experiences') return renderExperiencesTab();
    if (activeTab === 'projects') return renderProjectsTab();
    if (activeTab === 'blog') return renderBlogTab();
    if (activeTab === 'media') return renderMediaTab();
    if (
      activeTab === 'hero' ||
      activeTab === 'about' ||
      activeTab === 'how' ||
      activeTab === 'other_projects' ||
      activeTab === 'faq' ||
      activeTab === 'cv' ||
      activeTab === 'settings'
    ) {
      return renderSectionEditor(activeTab);
    }
    renderOverview();
  }

  renderTab();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCmsAdmin);
} else {
  initCmsAdmin();
}
