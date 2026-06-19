import type { CsvKind } from "../../../lib/config";
import { putCsvFile, deleteCsvFile } from "../../../lib/idb";
import { parseCsv, countDataRows } from "../../../lib/csvParse";

interface DataPageProps {
  csvMeta: Array<{ key: CsvKind; filename: string; updatedAt: number; rows: number }>;
  eventId?: string;
  onCsvChange: () => void;
  onDataVersionBump: () => void;
  onConfigChanged: () => void;
}

export default function DataPage({ csvMeta, eventId, onCsvChange, onDataVersionBump, onConfigChanged }: DataPageProps) {
  const uploadCsv = async (kind: CsvKind, file: File) => {
    const text = await file.text();
    const grid = parseCsv(text);

    if (!grid || grid.length === 0) {
      alert(`CSV '${kind}': File kosong atau tidak valid.`);
      return;
    }

    const headers = (grid[0] || []).map((x) => String(x || "").trim());

    // Normalize headers untuk matching (sama seperti di data.ts)
    function norm(s: string) {
      return String(s || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/\n/g, " ")
        .trim();
    }

    const headersNorm = headers.map(norm);

    // Menggunakan headerAliases yang sama dengan data.ts
    const headerAliases: Record<string, string[]> = {
      epc: ["epc", "uid", "tag", "rfid", "chip epc", "epc code"],
      bib: ["bib", "no bib", "bib number", "race bib", "nomor bib", "no. bib"],
      name: ["nama lengkap", "full name", "name", "nama", "participant name"],
      gender: ["jenis kelamin", "gender", "sex", "jk", "kelamin"],
      category: ["kategori", "category", "kelas", "class"],
      times: ["times", "time", "timestamp", "start time", "finish time", "jam", "checkpoint time", "cp time"],
    };

    // Validasi untuk Master CSV
    if (kind === "master") {
      const epcAliases = headerAliases.epc.map(norm);
      const hasEpc = headersNorm.some((h) =>
        epcAliases.some((alias) => h === alias || h.includes(alias))
      );

      if (!hasEpc) {
        const headerList = headers.length > 0 ? headers.join(", ") : "(tidak ada header)";
        alert(
          `CSV '${kind}': kolom EPC tidak ditemukan.\n\n` +
          `Kolom yang ditemukan: ${headerList}\n\n` +
          `Format Master CSV harus memiliki kolom:\n` +
          `- EPC (atau UID, Tag, RFID, Chip EPC)\n` +
          `- NO BIB (atau BIB, Bib Number)\n` +
          `- Nama Lengkap (atau Name, Nama)\n` +
          `- Gender (atau Jenis Kelamin, JK)\n` +
          `- Kategori (atau Category, Kelas)\n\n` +
          `Catatan: CSV yang diupload sepertinya adalah hasil export leaderboard.\n` +
          `Master CSV harus berisi data peserta dengan kolom EPC untuk matching.`
        );
        return;
      }
    }

    // Validasi untuk Start, Finish, Checkpoint CSV
    if (kind !== "master") {
      const epcAliases = headerAliases.epc.map(norm);
      const timesAliases = headerAliases.times.map(norm);

      const hasEpc = headersNorm.some((h) =>
        epcAliases.some((alias) => h === alias || h.includes(alias))
      );
      const hasTimes = headersNorm.some((h) =>
        timesAliases.some((alias) => h === alias || h.includes(alias))
      );

      if (!hasEpc) {
        const headerList = headers.length > 0 ? headers.join(", ") : "(tidak ada header)";
        alert(
          `CSV '${kind}': kolom EPC tidak ditemukan.\n\n` +
          `Kolom yang ditemukan: ${headerList}\n\n` +
          `Format CSV '${kind}' harus memiliki:\n` +
          `- EPC (atau UID, Tag, RFID)\n` +
          `- Times (atau Time, Timestamp, Jam)`
        );
        return;
      }

      if (!hasTimes) {
        const headerList = headers.length > 0 ? headers.join(", ") : "(tidak ada header)";
        alert(
          `CSV '${kind}': kolom Times/Time tidak ditemukan.\n\n` +
          `Kolom yang ditemukan: ${headerList}\n\n` +
          `Format CSV '${kind}' harus memiliki:\n` +
          `- EPC (atau UID, Tag, RFID)\n` +
          `- Times (atau Time, Timestamp, Jam)`
        );
        return;
      }
    }

    const rows = countDataRows(grid);

    await putCsvFile({ kind, text, filename: file.name, rows, eventId });

    onDataVersionBump();
    onConfigChanged();
    onCsvChange();
    alert(`'${kind}' berhasil diupload (${rows} baris)`);
  };

  const clearAllCsv = async () => {
    if (!confirm("Reset semua CSV yang sudah diupload?")) return;
    for (const k of ["master", "start", "finish", "checkpoint"] as CsvKind[]) {
      await deleteCsvFile(k, eventId);
    }
    onDataVersionBump();
    onConfigChanged();
    onCsvChange();
    alert("Semua CSV yang diupload telah dihapus");
  };

  const metaByKind: Partial<Record<CsvKind, { filename: string; updatedAt: number; rows: number }>> = {};
  csvMeta.forEach((x) => {
    metaByKind[x.key] = { filename: x.filename, updatedAt: x.updatedAt, rows: x.rows };
  });

  return (
    <>
      {/* CSV Upload */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="section-title">CSV Upload</h2>
            <div className="subtle text-sm">
              Data timing sekarang berasal dari file CSV upload.
              <b> Master &amp; Finish wajib</b>. <b>Start tidak wajib</b> jika kamu memakai
              <b> Category Start Times</b> di Timing page.
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button className="btn ghost w-full sm:w-auto text-sm" onClick={onCsvChange}>
              Refresh
            </button>
            <button className="btn w-full sm:w-auto text-sm" onClick={clearAllCsv}>
              Reset All
            </button>
          </div>
        </div>

        {/* Desktop Table - hidden on mobile */}
        <div className="hidden md:block table-wrap">
          <table className="f1-table compact">
            <thead>
              <tr>
                <th style={{ width: 140 }}>Type</th>
                <th>Upload</th>
                <th style={{ width: 320 }}>Current File</th>
                <th style={{ width: 120 }}>Rows</th>
                <th style={{ width: 200 }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {(["master", "start", "finish", "checkpoint"] as CsvKind[]).map((kind) => {
                const meta = metaByKind[kind];
                return (
                  <tr key={kind} className="row-hover">
                    <td className="mono strong">{kind.toUpperCase()}</td>
                    <td>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(e) => {
                          const f = (e.target as HTMLInputElement).files?.[0];
                          if (f) uploadCsv(kind, f);
                        }}
                      />
                    </td>
                    <td className="mono">{meta?.filename || "-"}</td>
                    <td className="mono">{meta?.rows ?? "-"}</td>
                    <td className="mono">
                      {meta?.updatedAt
                        ? new Date(meta.updatedAt).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards - visible only on mobile */}
        <div className="md:hidden space-y-3">
          {(["master", "start", "finish", "checkpoint"] as CsvKind[]).map((kind) => {
            const meta = metaByKind[kind];
            const isRequired = kind === "master" || kind === "finish";
            return (
              <div key={kind} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="mono font-bold text-gray-900">{kind.toUpperCase()}</span>
                    {isRequired && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Required</span>
                    )}
                  </div>
                  {meta ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                      Uploaded
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                      Empty
                    </span>
                  )}
                </div>
                
                {meta && (
                  <div className="text-sm text-gray-600 mb-3 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">File:</span>
                      <span className="mono truncate max-w-[180px]">{meta.filename}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Rows:</span>
                      <span className="mono">{meta.rows}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Updated:</span>
                      <span className="mono text-xs">{new Date(meta.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <label className="block">
                  <span className="sr-only">Upload {kind} CSV</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-medium
                      file:bg-gray-100 file:text-gray-700
                      hover:file:bg-gray-200
                      cursor-pointer"
                    onChange={(e) => {
                      const f = (e.target as HTMLInputElement).files?.[0];
                      if (f) uploadCsv(kind, f);
                    }}
                  />
                </label>
              </div>
            );
          })}
        </div>

        <div className="subtle text-sm mt-4">
          Format kolom minimal:
          <ul className="mt-2 ml-4 space-y-1">
            <li><b>Master</b>: EPC, Nama, Kelamin, Kategori, BIB</li>
            <li><b>Finish / Checkpoint</b>: EPC, Times</li>
            <li><b>Start</b>: optional (EPC, Times)</li>
          </ul>
        </div>
      </div>
    </>
  );
}
