import parseTimeToMs from "./time";
import { parseCsv } from "./csvParse";
import { getCsvFile } from "./idb";
import { type CategoryKey } from "./config";

const headerAliases: Record<string, string[]> = {
  epc: ["epc", "uid", "tag", "rfid", "chip epc", "epc code"],
  bib: ["bib", "no bib", "bib number", "race bib", "nomor bib", "no. bib"],
  name: ["nama lengkap", "full name", "name", "nama", "participant name"],
  gender: ["jenis kelamin", "gender", "sex", "jk", "kelamin"],
  category: ["kategori", "category", "kelas", "class"],
  ageCategory: ["kategori usia", "age category", "kategori umur", "age group", "usia", "umur", "kategori_usia", "age"],
  times: [
    "times",
    "time",
    "timestamp",
    "start time",
    "finish time",
    "jam",
    "checkpoint time",
    "cp time",
  ],
};

function norm(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\n/g, " ")
    .trim();
}

function findColIndex(headers: string[], key: keyof typeof headerAliases): number {
  const aliases = headerAliases[key].map(norm);
  const hs = headers.map(norm);
  
  // Pass 1: exact match
  for (let i = 0; i < hs.length; i++) {
    if (aliases.includes(hs[i])) return i;
  }
  
  // Pass 2: includes (fallback) but ensure we don't accidentally match another valid header alias
  // e.g. "category" (aliases: "kategori") should not match "kategori usia" if "kategori usia" is an alias for "ageCategory"
  for (let i = 0; i < hs.length; i++) {
    const h = hs[i];
    // Check if this header matches ANY other known exact alias exactly (if it does, skip it to avoid stealing)
    const belongsToOther = Object.entries(headerAliases).some(([k, als]) => {
      if (k === key) return false;
      return als.map(norm).includes(h);
    });
    
    if (belongsToOther) continue;

    if (aliases.some((a) => h.includes(a))) return i;
  }
  
  return -1;
}

function normalizeGender(v: string): string {
  const s = norm(v);
  if (!s) return v;
  if (s.includes("perempuan") || s.includes("wanita") || s === "f" || s.includes("female")) return "Perempuan";
  if (s.includes("laki") || s.includes("pria") || s === "m" || s.includes("male")) return "Laki-laki";
  return v;
}


export type MasterParticipant = {
  epc: string;
  bib: string;
  name: string;
  gender: string;
  category: string;
  sourceCategoryKey: CategoryKey;
  ageCategory?: string;
};

async function requireCsvText(kind: "master" | "start" | "finish" | "checkpoint", eventId: string = 'default'): Promise<string> {
  // Get CSV for this specific event only - NO fallback to default
  const file = await getCsvFile(kind, eventId);

  if (!file?.text) {
    throw new Error(
      `CSV '${kind}' belum diupload untuk event ini. Silakan login Admin → Upload CSV.`
    );
  }
  return file.text;
}

async function getCsvTextOptional(kind: "master" | "start" | "finish" | "checkpoint", eventId: string = 'default'): Promise<string | null> {
  // Get CSV for this specific event only - NO fallback to default
  const file = await getCsvFile(kind, eventId);
  return file?.text || null;
}

export async function loadMasterParticipants(
  eventId: string = 'default'
): Promise<{
  all: MasterParticipant[];
  byCategoryKey: Record<string, MasterParticipant[]>;
  byEpc: Map<string, MasterParticipant>;
  uniqueCategories: string[];
}> {
  const text = await requireCsvText("master", eventId);
  const grid = parseCsv(text);
  if (!grid || grid.length <= 1) {
    return { all: [], byCategoryKey: {}, byEpc: new Map(), uniqueCategories: [] };
  }

  const headers = (grid[0] || []).map(String);
  const epcIdx = findColIndex(headers, "epc");
  const bibIdx = findColIndex(headers, "bib");
  const nameIdx = findColIndex(headers, "name");
  const genderIdx = findColIndex(headers, "gender");
  const categoryIdx = findColIndex(headers, "category");
  const ageCategoryIdx = findColIndex(headers, "ageCategory");


  if (epcIdx < 0) {
    throw new Error("Kolom EPC tidak ditemukan di Master CSV.");
  }

  const byEpc = new Map<string, MasterParticipant>();
  const byCategoryKey: Record<string, MasterParticipant[]> = {};

  // Track unique categories from CSV
  const uniqueCategoriesSet = new Set<string>();

  grid.slice(1).forEach((r) => {
    const epc = String(r[epcIdx] ?? "").trim();
    if (!epc) return;

    const rawGender = genderIdx >= 0 ? String(r[genderIdx] ?? "").trim() : "";
    const rawCategory = categoryIdx >= 0 ? String(r[categoryIdx] ?? "").trim() : "";
    const rawAgeCategory = ageCategoryIdx >= 0 ? String(r[ageCategoryIdx] ?? "").trim() : "";

    // Use original category from CSV, not normalized
    const category = rawCategory || "Uncategorized";

    // Track unique categories
    if (rawCategory) {
      uniqueCategoriesSet.add(rawCategory);
    }

    const gender = normalizeGender(rawGender);

    const p: MasterParticipant = {
      epc,
      bib: bibIdx >= 0 ? String(r[bibIdx] ?? "").trim() : "",
      name: nameIdx >= 0 ? String(r[nameIdx] ?? "").trim() : "",
      gender,
      category: category,
      sourceCategoryKey: category as CategoryKey,
      ageCategory: rawAgeCategory,
    };

    byEpc.set(epc, p);
  });

  const all = Array.from(byEpc.values());

  // Group by original category name
  all.forEach((p) => {
    const catKey = p.category;
    if (!byCategoryKey[catKey]) {
      byCategoryKey[catKey] = [];
    }
    byCategoryKey[catKey].push(p);
  });

  return {
    all,
    byCategoryKey,
    byEpc,
    uniqueCategories: Array.from(uniqueCategoriesSet).sort()
  };
}

export type TimeEntry = { ms: number | null; raw: string };

export async function loadTimesMap(kind: "start" | "finish", eventId: string = 'default', tzOffset?: number): Promise<Map<string, TimeEntry>> {
  const text = await getCsvTextOptional(kind, eventId);
  if (!text) {
    return new Map();
  }
  const grid = parseCsv(text);
  if (!grid || grid.length <= 1) return new Map();

  const headers = (grid[0] || []).map(String);
  const epcIdx = findColIndex(headers, "epc");
  const timesIdx = findColIndex(headers, "times");
  if (epcIdx < 0 || timesIdx < 0) {
    throw new Error(
      `Kolom EPC / Times tidak ditemukan di CSV '${kind}'. Pastikan ada kolom EPC dan Times.`
    );
  }

  const map = new Map<string, TimeEntry>();
  grid.slice(1).forEach((r) => {
    const epc = String(r[epcIdx] ?? "").trim();
    if (!epc) return;

    const rawStr = String(r[timesIdx] ?? "").trim();
    if (!rawStr) return;

    // Use default tzOffset = 7 for Indonesian events if not provided by caller
    const parsed = parseTimeToMs(rawStr, tzOffset ?? 7);
    const entry: TimeEntry = { ms: parsed.ms, raw: rawStr };

    const existing = map.get(epc);
    if (!existing) {
      map.set(epc, entry);
      return;
    }

    const newMs = entry.ms ?? null;
    const oldMs = existing.ms ?? null;

    if (kind === "finish") {
      if (newMs != null && (oldMs == null || newMs > oldMs)) {
        map.set(epc, entry);
      }
      return;
    }

    if (kind === "start") {
      if (newMs != null && (oldMs == null || newMs < oldMs)) {
        map.set(epc, entry);
      }
      return;
    }
  });

  return map;
}

export async function loadCheckpointTimesMap(eventId: string = 'default'): Promise<Map<string, string[]>> {
  // Get CSV for this specific event only - NO fallback to default
  const file = await getCsvFile("checkpoint", eventId);
  
  if (!file?.text) return new Map();

  const grid = parseCsv(file.text);
  if (!grid || grid.length <= 1) return new Map();

  const headers = (grid[0] || []).map(String);
  const epcIdx = findColIndex(headers, "epc");
  const timesIdx = findColIndex(headers, "times");
  if (epcIdx < 0) return new Map();

  const map = new Map<string, string[]>();
  grid.slice(1).forEach((r) => {
    const epc = String(r[epcIdx] ?? "").trim();
    if (!epc) return;

    const rawStr = timesIdx >= 0 ? String(r[timesIdx] ?? "").trim() : "";
    if (!map.has(epc)) map.set(epc, []);
    if (rawStr) map.get(epc)!.push(rawStr);
  });

  return map;
}
