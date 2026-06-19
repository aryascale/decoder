import { Runner, TimeRecord } from "./types";

/**
 * Formats a duration in milliseconds to hh:mm:ss:ms (hours:minutes:seconds:milliseconds)
 */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor(ms % 1000);

  const pad = (num: number, size = 2) => String(num).padStart(size, "0");
  const padMs = (num: number) => String(num).padStart(3, "0");

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${padMs(milliseconds)}`;
}

/**
 * Formats a Date object to local time formatted as HH:MM:SS.ms
 */
export function formatTimeOfDay(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ms = date.getMilliseconds();
  
  const pad = (num: number, size = 2) => String(num).padStart(size, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${String(ms).padStart(3, "0")}`;
}

/**
 * Parses CSV text into an array of Runner objects.
 * Matches headers like "bib"/"BIB", "name"/"NAME"/"runner name", etc.
 */
export function parseRunnersCSV(text: string): Runner[] {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return [];

  // Super rudimentary CSV line parser that respects double quotes
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Find header line (first non-empty line)
  let headerIndex = -1;
  let headers: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) {
      headers = parseCSVLine(lines[i]).map(h => h.toLowerCase().replace(/["']/g, ""));
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1 || headers.length === 0) return [];

  // Identify column mappings
  // BIB headers: check "bib", "bib number", "number", "id", first column if fallback
  let bibCol = headers.findIndex(h => h.includes("bib") || h === "no" || h === "number" || h === "id");
  if (bibCol === -1) bibCol = 0;

  // Name headers: check "name", "runner", "fullname", "athlete", second column if fallback
  let nameCol = headers.findIndex(h => h.includes("name") || h.includes("runner") || h.includes("athlete"));
  if (nameCol === -1) nameCol = headers.length > 1 ? 1 : -1;

  // Optional headers
  const teamCol = headers.findIndex(h => h.includes("team") || h.includes("club") || h.includes("sponsor"));
  const catCol = headers.findIndex(h => h.includes("cat") || h.includes("age") || h.includes("group"));

  const runners: Runner[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = parseCSVLine(line);
    if (cells.length === 0 || (cells.length === 1 && !cells[0])) continue;

    const bibStr = cells[bibCol] ? cells[bibCol].replace(/["']/g, "") : "";
    if (!bibStr) continue; // Must have BIB to be registered

    // Get name, default to BIB if name column wasn't identified or cell is empty
    let nameStr = "";
    if (nameCol !== -1 && cells[nameCol]) {
      nameStr = cells[nameCol].replace(/["']/g, "");
    }
    if (!nameStr) {
      nameStr = `Runner #${bibStr}`;
    }

    const runner: Runner = {
      bib: bibStr,
      name: nameStr,
    };

    if (teamCol !== -1 && cells[teamCol]) {
      runner.team = cells[teamCol].replace(/["']/g, "");
    }
    if (catCol !== -1 && cells[catCol]) {
      runner.category = cells[catCol].replace(/["']/g, "");
    }

    runners.push(runner);
  }

  return runners;
}

/**
 * Generates a clean CSV file from lists of TimeRecords and downloads it.
 */
export function exportResultsToCSV(records: TimeRecord[]): string {
  const headers = ["Rank", "BIB", "Runner Name", "Elapsed Time (hh:mm:ss:ms)", "Wall Clock Time", "Notes"];
  
  const csvRows = [headers.join(",")];
  
  records.forEach((rec, index) => {
    const row = [
      index + 1,
      `"${rec.bib.replace(/"/g, '""')}"`,
      `"${rec.name.replace(/"/g, '""')}"`,
      `"${rec.formattedTime}"`,
      `"${rec.timeOfDay}"`,
      `"${(rec.notes || "").replace(/"/g, '""')}"`
    ];
    csvRows.push(row.join(","));
  });

  return csvRows.join("\n");
}

/**
 * Downloads a text string as a file in the browser.
 */
export function downloadFile(content: string, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generates sample runner CSV file template.
 */
export function getSampleCSV(): string {
  return `BIB,Name,Team,Category
101,John Doe,Speedsters,Male Open
102,Jane Smith,Wind Runners,Female Open
103,Alex Rivera,Trail Blazers,Male Master
104,Sam Chen,Metro Harriers,Male Open
105,Emily Taylor,Independent,Female Master
`;
}
