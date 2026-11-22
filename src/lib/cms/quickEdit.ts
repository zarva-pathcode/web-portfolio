const EDIT_KEY = 'zarvaism:edit-mode';

const SECTION_LABELS: Record<string, { label: string; tab: string; kind: 'section' | 'collection' }> = {
  hero: { label: '01 Hero', tab: 'hero', kind: 'section' },
  about: { label: '02 About & Bento', tab: 'about', kind: 'section' },
  how: { label: '03 How I Work', tab: 'how', kind: 'section' },
  experiences: { label: '04 Experience', tab: 'experiences', kind: 'collection' },
  projects: { label: '05 Selected Work', tab: 'projects', kind: 'collection' },
  other_projects: { label: '06 Other Projects', tab: 'other_projects', kind: 'section' },
  faq: { label: '07 FAQ', tab: 'faq', kind: 'section' },
  settings: { label: 'Footer & Settings', tab: 'settings', kind: 'section' },
  cv: { label: 'Curriculum Vitae', tab: 'cv', kind: 'section' },
  blog: { label: 'Blog Writing', tab: 'blog', kind: 'collection' },
};

function renderJsonQuickFields(
  container: HTMLElement,
  data: Record<string, unknown>,
  locale: 'en' | 'id',
  onUpdate: (next: Record<string, unknown>) => void
) {
  container.innerHTML = '';

  const info = document.createElement('p');
  info.className = 'text-xs leading-relaxed text-subtle';
  info.textContent =
    'Edit teks utama secara cepat di bawah ini, atau buka Full CMS untuk menambah/mengubah daftar item & upload gambar.';
  container.appendChild(info);

  const clone = structuredClone(data) as Record<string, unknown>;

  const addInput = (labelText: string, value: string, onChange: (val: string) => void, multiline = false) => {
    const wrap = document.createElement('div');
    const lbl = document.createElement('label');
    lbl.className = 'label mb-1.5 block text-[0.5625rem]';
    lbl.textContent = labelText;
    wrap.appendChild(lbl);

    const input = multiline ? document.createElement('textarea') : document.createElement('input');
    if (multiline) {
      (input as HTMLTextAreaElement).rows = 3;
    } else {
      (input as HTMLInputElement).type = 'text';
    }
    input.className =
      'w-full border border-[color:var(--hairline)] bg-[color:var(--surface)]/40 px-3 py-2 text-sm text-ink outline-none focus:border-brand';
    input.value = value;
    input.addEventListener('input', () => {
      onChange(input.value);
      onUpdate(clone);
    });
    wrap.appendChild(input);
    container.appendChild(wrap);
  };

  for (const [k, v] of Object.entries(clone)) {
    if (typeof v === 'string' && !k.toLowerCase().includes('url') && !k.toLowerCase().includes('href')) {
      addInput(k, v, (val) => {
        clone[k] = val;
      }, v.length > 68);
    } else if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      'en' in v &&
      'id' in v &&
      typeof (v as { en: unknown }).en === 'string'
    ) {
      const locObj = v as { en: string; id: string };
      addInput(
        `${k} (${locale.toUpperCase()})`,
        locObj[locale],
        (val) => {
          locObj[locale] = val;
        },
        locObj[locale].length > 68
      );
    }
  }

  // Fallback raw JSON inspector in collapsible details for power edits
  const details = document.createElement('details');
  details.className = 'mt-4 border border-[color:var(--hairline)] p-3';
  const sum = document.createElement('summary');
  sum.className = 'label cursor-pointer text-[0.5625rem] text-brand';
  sum.textContent = 'ADVANCED JSON PAYLOAD';
  details.appendChild(sum);

  const area = document.createElement('textarea');
  area.rows = 10;
  area.className =
    'mt-3 w-full border border-[color:var(--hairline)] bg-canvas p-2 font-mono text-xs text-ink outline-none focus:border-brand';
  area.value = JSON.stringify(clone, null, 2);
  area.addEventListener('input', () => {
    try {
      const parsed = JSON.parse(area.value) as Record<string, unknown>;
      Object.keys(clone).forEach((key) => delete clone[key]);
      Object.assign(clone, parsed);
      onUpdate(clone);
    } catch {
      // ignore incomplete JSON typing until valid
    }
  });
  details.appendChild(area);
  container.appendChild(details);
}

function initQuickEditOverlay(): void {
  const root = document.getElementById('cms-quick-edit');
  if (!root) return;

  const locale = (root.dataset.locale === 'id' ? 'id' : 'en') as 'en' | 'id';
  const toggleBtn = root.querySelector<HTMLButtonElement>('[data-qe-toggle]');
  const labelEl = root.querySelector<HTMLElement>('[data-qe-label]');
  const dotEl = root.querySelector<HTMLElement>('[data-qe-dot]');
  const drawer = root.querySelector<HTMLElement>('[data-qe-drawer]');
  const backdrop = root.querySelector<HTMLElement>('[data-qe-backdrop]');
  const closeBtns = Array.from(root.querySelectorAll<HTMLElement>('[data-qe-close]'));
  const titleEl = root.querySelector<HTMLElement>('[data-qe-drawer-title]');
  const fullLink = root.querySelector<HTMLAnchorElement>('[data-qe-full-link]');
  const bodyEl = root.querySelector<HTMLElement>('[data-qe-body]');
  const statusEl = root.querySelector<HTMLElement>('[data-qe-status]');
  const saveBtn = root.querySelector<HTMLButtonElement>('[data-qe-save]');

  if (!toggleBtn || !drawer || !bodyEl || !saveBtn) return;

  let activeSectionKey = '';
  let draftData: Record<string, unknown> | null = null;

  const closeDrawer = () => {
    drawer.hidden = true;
    activeSectionKey = '';
    draftData = null;
    if (statusEl) statusEl.textContent = '';
  };

  const openSectionDrawer = async (key: string) => {
    const meta = SECTION_LABELS[key];
    if (!meta) return;

    if (meta.kind === 'collection') {
      window.location.href = `/admin?tab=${meta.tab}`;
      return;
    }

    activeSectionKey = key;
    if (titleEl) titleEl.textContent = meta.label;
    if (fullLink) fullLink.href = `/admin?tab=${meta.tab}`;
    if (statusEl) statusEl.textContent = 'Memuat data...';
    bodyEl.innerHTML = '';
    drawer.hidden = false;

    try {
      const res = await fetch(`/api/admin/sections/${key}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat');
      draftData = json.data;
      if (statusEl) statusEl.textContent = '';
      if (draftData) {
        renderJsonQuickFields(bodyEl, draftData, locale, (next) => {
          draftData = next;
        });
      }
    } catch (err) {
      if (statusEl) statusEl.textContent = err instanceof Error ? err.message : 'Error';
    }
  };

  const injectBadges = (enabled: boolean) => {
    document.querySelectorAll('.qe-section-pill').forEach((el) => el.remove());
    document.documentElement.classList.toggle('cms-edit-active', enabled);
    toggleBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    if (labelEl) {
      labelEl.textContent =
        locale === 'id'
          ? `MODE EDIT: ${enabled ? 'ON' : 'OFF'}`
          : `EDIT MODE: ${enabled ? 'ON' : 'OFF'}`;
    }
    if (dotEl) {
      dotEl.className = enabled ? 'size-1.5 rounded-full bg-brand' : 'size-1.5 rounded-full bg-subtle';
    }

    if (!enabled) return;

    document.querySelectorAll<HTMLElement>('[data-cms-section]').forEach((sec) => {
      const key = sec.dataset.cmsSection || '';
      const meta = SECTION_LABELS[key];
      if (!meta) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'qe-section-pill';
      btn.textContent = `✎ EDIT · ${meta.label}`;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openSectionDrawer(key);
      });
      sec.appendChild(btn);
    });
  };

  let isEdit = false;
  try {
    isEdit = sessionStorage.getItem(EDIT_KEY) === '1';
  } catch {}
  injectBadges(isEdit);

  toggleBtn.onclick = () => {
    isEdit = !isEdit;
    try {
      sessionStorage.setItem(EDIT_KEY, isEdit ? '1' : '0');
    } catch {}
    injectBadges(isEdit);
  };

  backdrop?.addEventListener('click', closeDrawer);
  closeBtns.forEach((b) => b.addEventListener('click', closeDrawer));

  saveBtn.onclick = async () => {
    if (!activeSectionKey || !draftData) return;
    saveBtn.disabled = true;
    if (statusEl) statusEl.textContent = 'Menyimpan...';
    try {
      const res = await fetch(`/api/admin/sections/${activeSectionKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan');
      if (statusEl) statusEl.textContent = 'Tersimpan! Memuat ulang...';
      window.location.reload();
    } catch (err) {
      if (statusEl) statusEl.textContent = err instanceof Error ? err.message : 'Gagal';
    } finally {
      saveBtn.disabled = false;
    }
  };
}

document.addEventListener('astro:page-load', initQuickEditOverlay);
if (document.readyState !== 'loading') {
  initQuickEditOverlay();
}
