export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

export function showToast(message: string, isError = false): void {
  const host = document.getElementById('cms-toast');
  if (!host) return;
  host.textContent = message;
  host.className = isError
    ? 'fixed right-6 bottom-6 z-[100] border border-brand bg-brand px-4 py-2.5 font-mono text-xs text-[#f3efe6] shadow-xl'
    : 'fixed right-6 bottom-6 z-[100] border border-[color:var(--hairline)] bg-ink px-4 py-2.5 font-mono text-xs text-canvas shadow-xl';
  host.hidden = false;
  window.clearTimeout((host as unknown as { _t?: number })._t);
  (host as unknown as { _t?: number })._t = window.setTimeout(() => {
    host.hidden = true;
  }, 3200);
}

export function inputField(
  label: string,
  value: string,
  onInput: (val: string) => void,
  opts: { type?: string; placeholder?: string; multiline?: boolean; rows?: number; mono?: boolean } = {}
): HTMLDivElement {
  const wrap = el('div');
  const lbl = el('label', 'label mb-1.5 block text-[0.5625rem] text-subtle', label);
  wrap.appendChild(lbl);

  const cls = `w-full border border-[color:var(--hairline)] bg-canvas px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand ${
    opts.mono ? 'font-mono text-xs' : ''
  }`;

  if (opts.multiline) {
    const area = el('textarea', cls);
    area.rows = opts.rows ?? 3;
    area.value = value ?? '';
    if (opts.placeholder) area.placeholder = opts.placeholder;
    area.addEventListener('input', () => onInput(area.value));
    wrap.appendChild(area);
  } else {
    const inp = el('input', cls);
    inp.type = opts.type ?? 'text';
    inp.value = value ?? '';
    if (opts.placeholder) inp.placeholder = opts.placeholder;
    inp.addEventListener('input', () => onInput(inp.value));
    wrap.appendChild(inp);
  }
  return wrap;
}

export function checkboxField(
  label: string,
  checked: boolean,
  onChange: (val: boolean) => void
): HTMLLabelElement {
  const wrap = el('label', 'inline-flex cursor-pointer items-center gap-2.5 select-none');
  const cb = el('input', 'size-4 accent-[#b4552f]');
  cb.type = 'checkbox';
  cb.checked = checked;
  cb.addEventListener('change', () => onChange(cb.checked));
  wrap.appendChild(cb);
  wrap.appendChild(el('span', 'label text-[0.625rem] text-ink', label));
  return wrap;
}

export function bilingualPair(
  label: string,
  obj: { en: string; id: string },
  opts: { multiline?: boolean; rows?: number } = {}
): HTMLDivElement {
  const grid = el('div', 'grid gap-4 md:grid-cols-2');
  grid.appendChild(
    inputField(`${label} (EN)`, obj.en, (v) => {
      obj.en = v;
    }, opts)
  );
  grid.appendChild(
    inputField(`${label} (ID)`, obj.id, (v) => {
      obj.id = v;
    }, opts)
  );
  return grid;
}

export async function uploadFile(file: File): Promise<{ id: string; url: string; filename: string; mimeType: string; sizeBytes: number }> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload gagal');
  return data.item;
}

export function mediaUrlField(
  label: string,
  value: string,
  onChange: (nextUrl: string) => void,
  onUploaded?: (item: { id: string; url: string; filename: string; mimeType: string; sizeBytes: number }) => void
): HTMLDivElement {
  const wrap = el('div', 'space-y-2');
  const lbl = el('label', 'label block text-[0.5625rem] text-subtle', label);
  wrap.appendChild(lbl);

  const row = el('div', 'flex flex-wrap gap-2');
  const inp = el(
    'input',
    'min-w-[200px] flex-1 border border-[color:var(--hairline)] bg-canvas px-3 py-2 font-mono text-xs text-ink outline-none focus:border-brand'
  );
  inp.type = 'text';
  inp.value = value ?? '';
  inp.placeholder = '/images/projects/... atau https://...';
  inp.addEventListener('input', () => onChange(inp.value));

  const fileInput = el('input', 'hidden');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,video/mp4,video/webm';

  const upBtn = el('button', 'btn btn--ghost h-9 cursor-pointer px-3 text-[0.5625rem]', 'UPLOAD FILE');
  upBtn.type = 'button';
  upBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    upBtn.disabled = true;
    upBtn.textContent = 'UPLOADING...';
    try {
      const item = await uploadFile(file);
      inp.value = item.url;
      onChange(item.url);
      onUploaded?.(item);
      showToast(`Uploaded: ${item.filename}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload gagal', true);
    } finally {
      upBtn.disabled = false;
      upBtn.textContent = 'UPLOAD FILE';
      fileInput.value = '';
    }
  });

  row.append(inp, upBtn, fileInput);
  wrap.appendChild(row);
  return wrap;
}

export function renderRepeater<T>(
  title: string,
  items: T[],
  createEmpty: () => T,
  renderRow: (item: T, index: number, refresh: () => void) => HTMLElement,
  onMutate?: () => void
): HTMLDivElement {
  const box = el('div', 'border border-[color:var(--hairline)] bg-[color:var(--surface)]/30 p-4 space-y-3');
  const head = el('div', 'flex items-center justify-between');
  head.appendChild(el('span', 'label text-[0.625rem] text-brand', title));

  const addBtn = el('button', 'btn btn--ghost h-8 cursor-pointer px-3 text-[0.5625rem]', '+ TAMBAH');
  addBtn.type = 'button';
  head.appendChild(addBtn);
  box.appendChild(head);

  const list = el('div', 'space-y-3');
  box.appendChild(list);

  const draw = () => {
    list.innerHTML = '';
    if (!items.length) {
      list.appendChild(el('p', 'text-xs text-subtle', 'Belum ada item. Klik + TAMBAH untuk membuat.'));
      return;
    }
    items.forEach((item, idx) => {
      const rowWrap = el('div', 'border border-[color:var(--hairline)] bg-canvas p-3 space-y-3');
      const bar = el('div', 'flex items-center justify-between border-b border-[color:var(--hairline)] pb-2');
      bar.appendChild(el('span', 'numeral text-xs text-subtle', `#${String(idx + 1).padStart(2, '0')}`));

      const actions = el('div', 'flex items-center gap-1.5');
      const upBtn = el('button', 'label cursor-pointer px-1.5 py-0.5 text-[0.5625rem] hover:text-brand', '↑');
      upBtn.type = 'button';
      upBtn.disabled = idx === 0;
      upBtn.onclick = () => {
        if (idx === 0) return;
        [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
        onMutate?.();
        draw();
      };

      const downBtn = el('button', 'label cursor-pointer px-1.5 py-0.5 text-[0.5625rem] hover:text-brand', '↓');
      downBtn.type = 'button';
      downBtn.disabled = idx === items.length - 1;
      downBtn.onclick = () => {
        if (idx === items.length - 1) return;
        [items[idx + 1], items[idx]] = [items[idx], items[idx + 1]];
        onMutate?.();
        draw();
      };

      const delBtn = el('button', 'label cursor-pointer px-1.5 py-0.5 text-[0.5625rem] text-brand hover:underline', 'HAPUS');
      delBtn.type = 'button';
      delBtn.onclick = () => {
        items.splice(idx, 1);
        onMutate?.();
        draw();
      };

      actions.append(upBtn, downBtn, delBtn);
      bar.appendChild(actions);
      rowWrap.appendChild(bar);
      rowWrap.appendChild(renderRow(item, idx, draw));
      list.appendChild(rowWrap);
    });
  };

  addBtn.onclick = () => {
    items.push(createEmpty());
    onMutate?.();
    draw();
  };

  draw();
  return box;
}
