import { parseCsv } from './src/lib/csvParse';
const headerAliases = {
  epc: ["epc", "uid", "tag", "rfid", "chip epc", "epc code"],
  bib: ["bib", "no bib", "bib number", "race bib", "nomor bib", "no. bib"],
  name: ["nama lengkap", "full name", "name", "nama", "participant name"],
  gender: ["jenis kelamin", "gender", "sex", "jk", "kelamin"],
  category: ["kategori", "category", "kelas", "class"],
  ageCategory: ["kategori usia", "age category", "kategori umur", "age group", "usia", "umur", "kategori_usia", "age"],
  times: ["times", "time", "timestamp", "start time", "finish time", "jam", "checkpoint time", "cp time"],
};

function norm(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").replace(/\n/g, " ").trim();
}

function findColIndex(headers, key) {
  const aliases = headerAliases[key].map(norm);
  const hs = headers.map(norm);
  
  // Pass 1: exact match
  for (let i = 0; i < hs.length; i++) {
    if (aliases.includes(hs[i])) return i;
  }
  
  // Pass 2: includes (fallback)
  for (let i = 0; i < hs.length; i++) {
    const h = hs[i];
    const belongsToOther = Object.entries(headerAliases).some(([k, als]) => {
      if (k === key) return false;
      return als.map(norm).includes(h);
    });
    if (belongsToOther) continue;
    if (aliases.some((a) => h.includes(a))) return i;
  }
  return -1;
}

const headers = ["Nama Lengkap", "Kategori", "Kelamin", "BIB", "Kategori Usia"];
console.log("ageCategory:", findColIndex(headers, "ageCategory"));
console.log("category:", findColIndex(headers, "category"));
