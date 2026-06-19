import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const DEFAULT_CATEGORIES_FILE = path.join(process.cwd(), 'data', 'default-categories.json');

const DEFAULT_CATEGORIES = [
  '10K Laki-laki',
  '10K Perempuan',
  '5K Laki-Laki',
  '5K Perempuan',
];

export async function getDefaultCategories(): Promise<string[]> {
  try {
    if (existsSync(DEFAULT_CATEGORIES_FILE)) {
      const content = await readFile(DEFAULT_CATEGORIES_FILE, 'utf-8');
      const data = JSON.parse(content);
      return data.categories || DEFAULT_CATEGORIES;
    }
    return DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export async function saveDefaultCategories(categories: string[]): Promise<string[]> {
  const dataDir = path.dirname(DEFAULT_CATEGORIES_FILE);
  if (!existsSync(dataDir)) await mkdir(dataDir, { recursive: true });
  await writeFile(DEFAULT_CATEGORIES_FILE, JSON.stringify({ categories }, null, 2));
  return categories;
}

export async function resetDefaultCategories(): Promise<string[]> {
  return saveDefaultCategories(DEFAULT_CATEGORIES);
}
