import type { CsvKind } from './config';

export function getPublicUrl(url: string): string {
  return url;
}

export function getCsvPublicUrl(_eventId: string, _kind: CsvKind): string {
  // URL will be provided by the API response
  return '';
}

export function getCsvMetaPublicUrl(_eventId: string): string {
  // URL will be provided by the API response
  return '';
}

export type StoredCsvMeta = {
  kind: CsvKind;
  filename: string;
  path: string;
  url: string;
  rows: number;
  updatedAt: number;
};

export async function fetchCsvContent(
  eventId: string,
  kind: CsvKind
): Promise<{ text: string; meta: StoredCsvMeta } | null> {
  try {
    const response = await fetch(`/api/csv-read?kind=${kind}&eventId=${encodeURIComponent(eventId)}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch CSV: ${response.status}`);
    }

    const data = await response.json();

    if (data.text === null) {
      return {
        text: '',
        meta: data.meta || {
          kind,
          filename: `${kind}.csv`,
          path: `csv/${kind}.csv`,
          url: '',
          rows: 0,
          updatedAt: Date.now()
        }
      };
    }

    return {
      text: data.text,
      meta: {
        kind,
        filename: data.filename || `${kind}.csv`,
        path: `csv/${kind}.csv`,
        url: data.url || '',
        rows: data.text.split('\n').length - 1,
        updatedAt: data.updatedAt || Date.now()
      }
    };
  } catch (error: any) {
    console.error(`Error fetching CSV ${kind}:`, error);
    return null;
  }
}

// Fetch CSV metadata from server API
export async function fetchCsvMeta(
  eventId: string,
  kind: CsvKind
): Promise<StoredCsvMeta | null> {
  try {
    const response = await fetch(`/api/csv-list?eventId=${encodeURIComponent(eventId)}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const metaList = await response.json() as StoredCsvMeta[];
    return metaList.find(m => m.kind === kind) || null;
  } catch {
    return null;
  }
}

export async function fetchAllCsvMeta(eventId: string): Promise<StoredCsvMeta[]> {
  try {
    // Add cache-busting timestamp
    const timestamp = Date.now();
    const response = await fetch(`/api/csv-list?eventId=${encodeURIComponent(eventId)}&_t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      console.error('[fetchAllCsvMeta] Response not OK:', response.status);
      return [];
    }

    const data = await response.json() as StoredCsvMeta[];
    console.log('[fetchAllCsvMeta] Loaded meta for', eventId, ':', data);
    return data;
  } catch (error) {
    console.error('[fetchAllCsvMeta] Error:', error);
    return [];
  }
}

export async function uploadCsvViaApi(
  eventId: string,
  kind: CsvKind,
  text: string,
  filename: string,
  rows: number
): Promise<StoredCsvMeta> {
  const response = await fetch(`/api/csv-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      eventId,
      kind,
      content: text,
      filename,
      rows,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to upload CSV');
  }

  return await response.json();
}

export async function uploadBannerViaApi(
  eventId: string,
  file: File,
  alt?: string,
  order?: number
): Promise<{ path: string; url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('eventId', eventId);
  if (alt) formData.append('alt', alt);
  if (order !== undefined) formData.append('order', String(order));

  // Changed to standardized endpoint
  const response = await fetch('/api/upload-banner', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = 'Failed to upload banner';
    if (response.status === 413) {
      errorMsg = 'File is too large. Maximum allowed size is 4.5MB.';
    } else {
      const error = await response.json().catch(() => ({}));
      errorMsg = error.error || errorMsg;
    }
    throw new Error(errorMsg);
  }

  return await response.json();
}

export async function deleteCsvViaApi(
  eventId: string,
  kind: CsvKind
): Promise<void> {
  const response = await fetch(`/api/csv-delete?kind=${kind}&eventId=${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete CSV');
  }
}

export async function deleteBannerViaApi(bannerId: string, imageUrl: string): Promise<void> {
  // standardized to delete-banner with query params
  const response = await fetch(`/api/delete-banner?bannerId=${bannerId}&imageUrl=${encodeURIComponent(imageUrl)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete banner');
  }
}
