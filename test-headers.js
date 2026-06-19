const headerAliases = {
  category: ["kategori", "category", "kelas", "class"],
  ageCategory: ["kategori usia", "age category", "kategori umur", "age group", "usia", "umur", "kategori_usia", "age"],
};

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\n/g, " ")
    .trim();
}

function findColIndex(headers, key) {
  const aliases = headerAliases[key].map(norm);
  const hs = headers.map(norm);
  
  for (let i = 0; i < hs.length; i++) {
    if (aliases.includes(hs[i])) return i;
  }
  
  for (let i = 0; i < hs.length; i++) {
    const h = hs[i];
    if (aliases.some((a) => h.includes(a))) return i;
  }
  return -1;
}

const headers = ["Nama", "Kategori", "Kelamin", "BIB Number", "Warna BIB", "EPC", "Kategori Usia"];
console.log("categoryIdx:", findColIndex(headers, "category"));
console.log("ageCategoryIdx:", findColIndex(headers, "ageCategory"));
