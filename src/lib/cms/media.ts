import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { del, put } from '@vercel/blob';

const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), '.data', 'uploads');

const ALLOWED_MIME = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/avif', '.avif'],
  ['video/mp4', '.mp4'],
  ['video/webm', '.webm'],
]);

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB

function readBlobToken(): string {
  return (
    process.env.BLOB_READ_WRITE_TOKEN ||
    ((import.meta.env as Record<string, string | undefined> | undefined)?.BLOB_READ_WRITE_TOKEN ?? '')
  ).trim();
}

function sanitizeFileBase(name: string): string {
  const base = path.basename(name, path.extname(name)).toLowerCase();
  return base.replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'asset';
}

export interface UploadedFileResult {
  id: string;
  url: string;
  pathname: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export async function uploadMediaFile(file: File): Promise<UploadedFileResult> {
  const ext = ALLOWED_MIME.get(file.type);
  if (!ext) {
    throw new Error('Format file tidak didukung. Gunakan JPG, PNG, WebP, GIF, AVIF, MP4, atau WebM.');
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error('Ukuran file maksimal 12 MB.');
  }

  const id = crypto.randomUUID();
  const safeBase = sanitizeFileBase(file.name);
  const storedName = `${id.slice(0, 8)}-${safeBase}${ext}`;
  const blobToken = readBlobToken();

  if (blobToken) {
    const blob = await put(`zarvaism/${storedName}`, file, {
      access: 'public',
      token: blobToken,
      addRandomSuffix: false,
    });
    return {
      id,
      url: blob.url,
      pathname: blob.pathname,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    };
  }

  // Local dev fallback stored in .data/uploads and served via /api/media/[file]
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(LOCAL_UPLOAD_DIR, storedName), bytes);

  return {
    id,
    url: `/api/media/${storedName}`,
    pathname: storedName,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

export async function deleteStoredMedia(url: string, pathname: string): Promise<void> {
  const blobToken = readBlobToken();
  if (blobToken && url.startsWith('http')) {
    try {
      await del(url, { token: blobToken });
    } catch {
      // ignore if already removed from Blob storage
    }
    return;
  }

  const safeName = path.basename(pathname || url);
  const localPath = path.join(LOCAL_UPLOAD_DIR, safeName);
  if (fs.existsSync(localPath)) {
    fs.unlinkSync(localPath);
  }
}

export function resolveLocalMediaFile(filename: string): { buffer: Buffer; mimeType: string } | null {
  const safeName = path.basename(filename);
  if (!safeName || safeName !== filename) return null;

  const localPath = path.join(LOCAL_UPLOAD_DIR, safeName);
  if (!fs.existsSync(localPath)) return null;

  const ext = path.extname(safeName).toLowerCase();
  let mimeType = 'application/octet-stream';
  for (const [mime, mExt] of ALLOWED_MIME.entries()) {
    if (mExt === ext) {
      mimeType = mime;
      break;
    }
  }

  return {
    buffer: fs.readFileSync(localPath),
    mimeType,
  };
}
