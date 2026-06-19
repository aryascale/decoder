import React, { useState, useRef, DragEvent, ChangeEvent } from "react";
import { UploadCloud, FileSpreadsheet, Download, Trash2, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { parseRunnersCSV, getSampleCSV, downloadFile } from "./utils";
import { Runner } from "./types";

interface RunnerUploadProps {
  runnersCount: number;
  onUpload: (runners: Runner[]) => void;
  onClear: () => void;
}

export default function RunnerUpload({ runnersCount, onUpload, onClear }: RunnerUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setErrorMessage("Please upload a valid CSV file (.csv)");
      return;
    }

    setErrorMessage("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setErrorMessage("Could not read file content.");
        return;
      }
      try {
        const runnersList = parseRunnersCSV(text);
        if (runnersList.length === 0) {
          setErrorMessage("No runners found. Ensure your CSV has headers and data.");
        } else {
          onUpload(runnersList);
        }
      } catch (err: any) {
        setErrorMessage(`CSV Parsing failed: ${err?.message || "Invalid file"}`);
      }
    };
    reader.onerror = () => {
      setErrorMessage("Error reading file.");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const downloadTemplate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const templateContent = getSampleCSV();
    downloadFile(templateContent, "race_runner_template.csv", "text/csv");
  };

  return (
    <div id="runner_upload_container" className="bg-[#0D0D0D] border border-[#222] rounded-none p-6 shadow-none flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-[#E0E0E0] flex items-center gap-2">
          <Users className="w-4 h-4 text-[#FFD700]" />
          Import Race Runners (CSV)
        </h3>
        {runnersCount > 0 && (
          <button
            id="clear_runners_dataset_btn"
            onClick={onClear}
            className="text-[10px] font-mono uppercase tracking-wider text-rose-500 hover:text-rose-450 flex items-center gap-1.5 px-2 py-1 bg-transparent hover:bg-rose-950/20 border border-transparent hover:border-[#333] rounded-none transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Dataset
          </button>
        )}
      </div>

      {runnersCount > 0 ? (
        <div id="runners_success_summary" className="p-4 bg-[#151515] border border-[#222] rounded-none flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-950/30 border border-emerald-900 text-emerald-400 rounded-none">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-mono font-medium text-white">{runnersCount} Runners Loaded</div>
              <div className="text-xs text-[#666] mt-0.5">
                Incoming BIB entries will match automatically.
              </div>
            </div>
          </div>
          <button
            id="reupload_runners_csv_action"
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#FFD700] hover:text-white cursor-pointer"
          >
            Update CSV
          </button>
        </div>
      ) : (
        <div
          id="csv_drop_zone"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-none p-6 text-center cursor-pointer transition ${
            isDragActive
              ? "border-[#FFD700] bg-[#1A1A1A]"
              : "border-[#333] hover:border-[#FFD700] bg-[#111] hover:bg-[#151515]"
          }`}
        >
          <input
            id="runners-csv-file-input"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-2.5">
            <div className="p-3 bg-[#1A1A1A] text-[#888] rounded-none border border-[#222]">
              <UploadCloud className="w-6 h-6 text-[#FFD700]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#CCC]">
                Drag & drop your runner CSV here, or <span className="text-[#FFD700] underline">browse</span>
              </p>
              <p className="text-xs text-[#666] mt-1">
                Headers should contain "BIB" and "Name". Supports Team/Category.
              </p>
            </div>
            <button
              id="download_runners_template_btn"
              onClick={downloadTemplate}
              className="text-[10px] font-mono uppercase tracking-wider text-[#FFD700] hover:text-[#E0E0E0] hover:border-[#FFD700] flex items-center gap-1.5 mt-2 px-2.5 py-1.5 bg-black border border-[#222] rounded-none transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV Template
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div id="upload_error_display" className="p-3.5 bg-rose-950/20 border border-rose-900 text-rose-400 rounded-none text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
