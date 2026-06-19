import { type CsvKind, DEFAULT_EVENT_ID } from "./config";
import { 
  fetchCsvContent, 
  fetchAllCsvMeta,
  uploadCsvViaApi,
  deleteCsvViaApi
} from "./storage";

type StoredFile = {
  key: string;
  eventId: string;
  kind: CsvKind;
  text: string;
  filename: string;
  updatedAt: number;
  rows: number;
};

export async function putCsvFile(args: {
  kind: CsvKind;
  text: string;
  filename: string;
  rows: number;
  eventId?: string;
}): Promise<void> {
  const eventId = args.eventId || DEFAULT_EVENT_ID;
  
  await uploadCsvViaApi(
    eventId,
    args.kind,
    args.text,
    args.filename,
    args.rows
  );
}

export async function getCsvFile(
  kind: CsvKind,
  eventId: string = DEFAULT_EVENT_ID
): Promise<StoredFile | null> {
  const result = await fetchCsvContent(eventId, kind);
  
  if (!result) return null;
  
  return {
    key: `${eventId}:${kind}`,
    eventId,
    kind,
    text: result.text,
    filename: result.meta.filename,
    updatedAt: result.meta.updatedAt,
    rows: result.meta.rows
  };
}

export async function deleteCsvFile(
  kind: CsvKind,
  eventId: string = DEFAULT_EVENT_ID
): Promise<void> {
  await deleteCsvViaApi(eventId, kind);
}

export async function listCsvMeta(eventId?: string): Promise<
  Array<Pick<StoredFile, "key" | "kind" | "filename" | "updatedAt" | "rows">>
> {
  const targetEventId = eventId || DEFAULT_EVENT_ID;
  const metaList = await fetchAllCsvMeta(targetEventId);

  return metaList.map((meta: any) => ({
    key: meta.key || meta.kind,
    kind: meta.key || meta.kind,
    filename: meta.filename,
    updatedAt: meta.updatedAt,
    rows: meta.rows,
  }));
}

export async function clearAllCsvFiles(eventId: string = DEFAULT_EVENT_ID): Promise<void> {
  const kinds: CsvKind[] = ['master', 'start', 'finish', 'checkpoint'];
  for (const kind of kinds) {
    try {
      await deleteCsvViaApi(eventId, kind);
    } catch {
    }
  }
}
