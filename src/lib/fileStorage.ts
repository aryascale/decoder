import fs from 'node:fs';
import path from 'node:path';

type CsvKind = 'master' | 'start' | 'finish' | 'checkpoint';

const getUploadDir = (): string => process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const getBaseUrl = (): string => process.env.BASE_URL || 'http://localhost:3001';

export type StoredCsvMeta = {
  kind: CsvKind;
  filename: string;
  path: string;
  url: string;
  rows: number;
  updatedAt: number;
};

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function getCsvDir(eventId: string): string {
  return path.join(getUploadDir(), 'events', eventId, 'csv');
}

function getImagesDir(eventId: string): string {
  return path.join(getUploadDir(), 'events', eventId, 'images');
}

function getCsvFilePath(eventId: string, kind: CsvKind): string {
  return path.join(getCsvDir(eventId), `${kind}.csv`);
}

function getCsvMetaPath(eventId: string): string {
  return path.join(getCsvDir(eventId), '_meta.json');
}

function filePathToUrl(filePath: string): string {
  const relativePath = filePath.replace(getUploadDir(), '').replace(/\\/g, '/');
  return `/uploads${relativePath}`;
}

export async function uploadCsvFile(
  eventId: string,
  kind: CsvKind,
  text: string,
  filename: string,
  rows: number
): Promise<StoredCsvMeta> {
  ensureDir(getCsvDir(eventId));
  const filePath = getCsvFilePath(eventId, kind);
  fs.writeFileSync(filePath, text, 'utf-8');

  const meta: StoredCsvMeta = {
    kind,
    filename,
    path: filePath,
    url: filePathToUrl(filePath),
    rows,
    updatedAt: Date.now(),
  };

  await updateCsvMetadata(eventId, kind, meta);
  return meta;
}

async function updateCsvMetadata(eventId: string, kind: CsvKind, meta: StoredCsvMeta): Promise<void> {
  const metaPath = getCsvMetaPath(eventId);
  let allMeta: Record<string, StoredCsvMeta> = {};

  try {
    if (fs.existsSync(metaPath)) {
      allMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    }
  } catch {
    allMeta = {};
  }

  allMeta[kind] = meta;
  fs.writeFileSync(metaPath, JSON.stringify(allMeta, null, 2), 'utf-8');
}

export async function getCsvFileContent(
  eventId: string,
  kind: CsvKind
): Promise<{ text: string; meta: StoredCsvMeta } | null> {
  const filePath = getCsvFilePath(eventId, kind);

  try {
    if (!fs.existsSync(filePath)) return null;

    const text = fs.readFileSync(filePath, 'utf-8');
    const stats = fs.statSync(filePath);
    const meta = await getCsvMeta(eventId, kind);

    return {
      text,
      meta: meta || {
        kind,
        filename: `${kind}.csv`,
        path: filePath,
        url: filePathToUrl(filePath),
        rows: text.split('\n').length - 1,
        updatedAt: stats.mtimeMs,
      },
    };
  } catch {
    return null;
  }
}

export async function getCsvMeta(eventId: string, kind: CsvKind): Promise<StoredCsvMeta | null> {
  const metaPath = getCsvMetaPath(eventId);

  try {
    if (!fs.existsSync(metaPath)) return null;
    const allMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as Record<string, StoredCsvMeta>;
    return allMeta[kind] || null;
  } catch {
    return null;
  }
}

export async function listCsvMetadata(eventId: string): Promise<StoredCsvMeta[]> {
  const metaPath = getCsvMetaPath(eventId);

  try {
    if (!fs.existsSync(metaPath)) return [];
    const allMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as Record<string, StoredCsvMeta>;
    return Object.values(allMeta);
  } catch {
    return [];
  }
}

export async function deleteCsvFileFromStorage(eventId: string, kind: CsvKind): Promise<void> {
  const filePath = getCsvFilePath(eventId, kind);

  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}

  const metaPath = getCsvMetaPath(eventId);
  try {
    if (fs.existsSync(metaPath)) {
      const allMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as Record<string, StoredCsvMeta>;
      delete allMeta[kind];
      fs.writeFileSync(metaPath, JSON.stringify(allMeta, null, 2), 'utf-8');
    }
  } catch {}
}

export async function deleteAllCsvFiles(eventId: string): Promise<void> {
  const kinds: CsvKind[] = ['master', 'start', 'finish', 'checkpoint'];
  for (const kind of kinds) {
    await deleteCsvFileFromStorage(eventId, kind).catch(() => {});
  }
}

export async function uploadFile(
  eventId: string,
  fileBuffer: Buffer,
  originalFilename: string,
  folder: 'csv' | 'images'
): Promise<{ path: string; url: string }> {
  const dir = folder === 'csv' ? getCsvDir(eventId) : getImagesDir(eventId);
  ensureDir(dir);

  const fileExt = path.extname(originalFilename);
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}${fileExt}`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, fileBuffer);

  return { path: filePath, url: filePathToUrl(filePath) };
}

export async function uploadBannerImage(
  eventId: string,
  fileBuffer: Buffer,
  originalFilename: string
): Promise<{ path: string; url: string }> {
  return uploadFile(eventId, fileBuffer, originalFilename, 'images');
}

export async function deleteFile(filePath: string): Promise<void> {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

export async function deleteFileByUrl(fileUrl: string): Promise<void> {
  const relativePath = fileUrl.replace(`${getBaseUrl()}/uploads`, '');
  const filePath = path.join(getUploadDir(), relativePath);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

export async function listFiles(eventId: string, folder: 'csv' | 'images'): Promise<string[]> {
  const dir = folder === 'csv' ? getCsvDir(eventId) : getImagesDir(eventId);
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).map(f => path.join(dir, f));
  } catch {
    return [];
  }
}

export function getFileUrl(filePath: string): string {
  return filePathToUrl(filePath);
}

export function getStorageConfig() {
  return {
    provider: 'local-filesystem',
    uploadDir: getUploadDir(),
    baseUrl: getBaseUrl(),
  };
}
