import React, { useState, useEffect, useRef } from "react";
import { 
  PlusCircle, 
  Keyboard, 
  Check, 
  Info
} from "lucide-react";
import ClockControls from "../../components/checkpoint/ClockControls";
import RunnerUpload from "../../components/checkpoint/RunnerUpload";
import Numpad from "../../components/checkpoint/Numpad";
import ResultsList from "../../components/checkpoint/ResultsList";
import { Runner, TimeRecord } from "../../components/checkpoint/types";
import { formatDuration, formatTimeOfDay, exportResultsToCSV, downloadFile } from "../../components/checkpoint/utils";

export default function App() {
  // Safe LocalStorage helpers
  const getStorageItem = <T,>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.warn(`LocalStorage blocked or unavailable for key: ${key}`, e);
      return defaultValue;
    }
  };

  const setStorageItem = <T,>(key: string, value: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`LocalStorage set failed for key: ${key}`, e);
    }
  };

  // State Declarations
  const [runners, setRunners] = useState<Runner[]>(() => getStorageItem("race_runners", []));
  const [records, setRecords] = useState<TimeRecord[]>(() => getStorageItem("race_records", []));
  
  // Stopwatch Master States
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [accumulatedTime, setAccumulatedTime] = useState(() => getStorageItem("race_accumulated_time", 0));

  // Input states
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus keeper for quick entry
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Sync state back to LocalStorage
  useEffect(() => {
    setStorageItem("race_runners", runners);
  }, [runners]);

  useEffect(() => {
    setStorageItem("race_records", records);
  }, [records]);

  useEffect(() => {
    setStorageItem("race_accumulated_time", accumulatedTime);
  }, [accumulatedTime]);

  // Master Clock continuous tick effect
  useEffect(() => {
    let animationId: number;

    const tick = () => {
      if (isRunning && startTime !== null) {
        setElapsedTime(accumulatedTime + (Date.now() - startTime));
        animationId = requestAnimationFrame(tick);
      }
    };

    if (isRunning && startTime !== null) {
      animationId = requestAnimationFrame(tick);
    } else {
      setElapsedTime(accumulatedTime);
    }

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isRunning, startTime, accumulatedTime]);

  // Handle matching runner names from BIB
  const resolveRunnerName = (bibCode: string, currentRunners: Runner[] = runners): string => {
    const code = bibCode.trim();
    if (!code) return "Unknown Runner";
    const found = currentRunners.find(r => r.bib.trim() === code);
    if (found) {
      let displayName = found.name;
      const extras: string[] = [];
      if (found.team) extras.push(found.team);
      if (found.category) extras.push(found.category);
      if (extras.length > 0) {
        displayName += ` [${extras.join(" | ")}]`;
      }
      return displayName;
    }
    return "Unknown Runner";
  };

  // Synchronize record names if the runners database changes
  useEffect(() => {
    setRecords(prev => prev.map(rec => ({
      ...rec,
      name: resolveRunnerName(rec.bib, runners)
    })));
  }, [runners]);

  // Logger trigger
  const handleRecordFinish = (bibCode: string) => {
    const trimmed = bibCode.trim();
    const finalBib = trimmed || "???";

    // Grab extremely precise instant elapsed ms before any state batches
    const now = Date.now();
    const exactRecordMs = isRunning && startTime !== null 
      ? accumulatedTime + (now - startTime) 
      : accumulatedTime;

    const formatted = formatDuration(exactRecordMs);
    const wallClock = formatTimeOfDay(new Date(now));

    const newRecord: TimeRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : `rec-${Math.random().toString(36).substring(2, 9)}`,
      bib: finalBib,
      name: resolveRunnerName(finalBib),
      timestamp: exactRecordMs,
      formattedTime: formatted,
      timeOfDay: wallClock,
      notes: trimmed ? "" : "Unidentified BIB at finish"
    };

    setRecords(prev => [...prev, newRecord]);
    setInputValue("");
    inputRef.current?.focus();
  };

  // Numpad Keys Handlers
  const handleNumpadPress = (num: string) => {
    setInputValue(prev => prev + num);
    inputRef.current?.focus();
  };

  const handleNumpadBackspace = () => {
    setInputValue(prev => prev.slice(0, -1));
    inputRef.current?.focus();
  };

  const handleNumpadClear = () => {
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleNumpadEnter = () => {
    handleRecordFinish(inputValue);
  };

  // Master Clock Actions
  const handleClockStart = () => {
    setIsRunning(true);
    setStartTime(Date.now());
  };

  const handleClockPause = () => {
    if (isRunning && startTime !== null) {
      const sessionDelta = Date.now() - startTime;
      setAccumulatedTime(prev => prev + sessionDelta);
    }
    setIsRunning(false);
    setStartTime(null);
  };

  const handleClockReset = () => {
    setIsRunning(false);
    setStartTime(null);
    setAccumulatedTime(0);
    setElapsedTime(0);
  };

  const handleClockSetCustom = (newMs: number) => {
    if (isRunning) {
      setStartTime(Date.now());
      setAccumulatedTime(newMs);
    } else {
      setAccumulatedTime(newMs);
      setElapsedTime(newMs);
    }
  };

  // Multi-Record Actions
  const handleUpdateRecord = (id: string, newBib: string, notes: string) => {
    setRecords(prev => prev.map(rec => {
      if (rec.id === id) {
        return {
          ...rec,
          bib: newBib || "???",
          name: resolveRunnerName(newBib || "???"),
          notes: notes
        };
      }
      return rec;
    }));
  };

  const handleDeleteRecord = (id: string) => {
    setRecords(prev => prev.filter(rec => rec.id !== id));
  };

  const handleClearAllRecords = () => {
    setRecords([]);
  };

  const handleExportCSV = () => {
    if (records.length === 0) return;
    const csvContent = exportResultsToCSV(records);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(csvContent, `race_results_${dateStr}.csv`, "text/csv");
  };

  const handleAddCustomRecord = () => {
    // Adds a placeholder record starting at current clock time
    // extremely useful for flagging a finisher first, and entering their bib when it is resolved later
    handleRecordFinish("");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col font-sans text-[#E0E0E0]">
      {/* App Header */}
      <header id="app_header" className="bg-[#0A0A0A] border-b border-[#222] py-4 px-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FFD700] rounded-none text-black font-extrabold font-mono text-base tracking-tighter shadow-none">
              LUMPAT
            </div>
            <div>
              <h1 className="text-sm font-mono uppercase tracking-[0.25em] text-white">
                Lumpat Chrono Time IZT
              </h1>
              <p className="text-[10px] text-[#666] font-mono mt-0.5 uppercase tracking-wider">
                Precision Finish-Line Chronometer & Live CSV Runner Matcher
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[#FFD700] text-xs font-mono bg-[#111] px-3 py-1.5 rounded-none border border-[#222]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700] animate-ping" />
            LIVE WALL TIME: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </header>

      {/* Main Single-View Layout Container */}
      <main className="flex-grow p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
        
        {/* Top Section: Master Race Clock */}
        <ClockControls
          isRunning={isRunning}
          elapsedTime={elapsedTime}
          onStart={handleClockStart}
          onPause={handleClockPause}
          onReset={handleClockReset}
          onSetCustomTime={handleClockSetCustom}
        />

        {/* Middle Section: Double Column Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Column A (Size 7): BIB Entry Console & Keypad instructions */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* BIB Input Console */}
            <div id="bib_input_console" className="bg-[#0D0D0D] border border-[#222] rounded-none p-6 shadow-none flex flex-col gap-4">
              <label htmlFor="bib_code_entry" className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#666] font-semibold">
                Bib Number Entry Console
              </label>

              <div className="relative flex items-stretch gap-2.5">
                <input
                  id="bib_code_entry"
                  ref={inputRef}
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="Enter active runner BIB..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleEnterSubmit();
                    }
                  }}
                  className="w-full text-3xl font-mono font-bold tracking-wider px-5 py-3 border border-[#333] rounded-none bg-[#111] text-[#FFD700] focus:bg-black focus:outline-none focus:border-[#FFD700] transition placeholder:text-[#444] placeholder:font-mono placeholder:text-lg"
                />

                <button
                  id="submit_bib_timestamp_btn"
                  onClick={() => handleRecordFinish(inputValue)}
                  className="px-6 font-bold text-xs uppercase tracking-widest text-black bg-[#FFD700] hover:bg-white rounded-none flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  Log BIB
                </button>
              </div>

              {/* Dynamic Runner Lookup Match Preview */}
              <div 
                id="runner_live_match_panel" 
                className={`py-3 px-4 rounded-none border border-dashed transition text-xs font-mono flex items-center justify-between ${
                  inputValue.trim()
                    ? runners.some(r => r.bib.trim() === inputValue.trim())
                      ? "bg-emerald-950/20 border-emerald-800 text-emerald-400"
                      : "bg-[#291711] border-amber-900/60 text-amber-500"
                    : "bg-[#111] border-[#222] text-[#888]"
                }`}
              >
                <div>
                  <span className="font-mono text-[10px] text-[#555] mr-2 uppercase tracking-wide">Live Preview:</span>
                  <span className="font-semibold">
                    {inputValue.trim() 
                      ? resolveRunnerName(inputValue) 
                      : "Awaiting BIB entry..."}
                  </span>
                </div>
                {inputValue.trim() && !runners.some(r => r.bib.trim() === inputValue.trim()) && (
                  <span className="text-[9px] bg-amber-950 text-amber-400 font-bold px-2 py-0.5 rounded-none font-mono uppercase tracking-wider border border-amber-800">
                    Atypical BIB
                  </span>
                )}
              </div>

              {/* Instant "Placeholder / Quick Timestamps" button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#222] mt-2">
                <div className="text-[10px] font-mono text-[#555] flex items-center gap-1.5 uppercase">
                  <Keyboard className="w-3.5 h-3.5" />
                  Press <kbd className="bg-[#222] px-1 py-0.5 rounded-none text-[#FFF] font-semibold">Enter</kbd> to record instantly.
                </div>

                <button
                  id="tag_quick_timestamp_placeholder"
                  onClick={handleAddCustomRecord}
                  className="w-full sm:w-auto text-[10px] font-mono uppercase tracking-wider text-[#FFD700] hover:text-white flex items-center justify-center gap-1.5 py-1.5 px-3 border border-dashed border-[#FFD700]/30 hover:border-[#FFD700] bg-transparent rounded-none transition cursor-pointer"
                  title="Marks a timestamp for a finisher whose BIB was missed, allowing you to add the BIB later."
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Quick Stamp (BIB missed)
                </button>
              </div>
            </div>

            {/* Browser Tactile Numpad Wrapper */}
            <Numpad
              onKeyPress={handleNumpadPress}
              onBackspace={handleNumpadBackspace}
              onClear={handleNumpadClear}
              onEnter={handleNumpadEnter}
            />

          </div>

          {/* Column B (Size 5): CSV Import Dropzone & Instructions Card */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* CSV Import */}
            <RunnerUpload
              runnersCount={runners.length}
              onUpload={setRunners}
              onClear={() => {
                if (window.confirm("Are you sure you want to delete all loaded runners? Recorded finishes will not be deleted but they will revert to 'Unknown Runner'.")) {
                  setRunners([]);
                }
              }}
            />

            {/* Helpful quick rules / instructions card */}
            <div id="quick_instructions_box" className="bg-[#0D0D0D] border border-[#222] rounded-none p-5 shadow-none text-xs flex flex-col gap-3 font-mono">
              <h3 className="font-semibold text-white flex items-center gap-2 uppercase tracking-[0.15em] text-[10px] border-b border-[#222] pb-2">
                <Info className="w-4 h-4 text-[#FFD700]" />
                Finish Line Operations
              </h3>
              <ul className="list-disc pl-4 text-[#888] space-y-2">
                <li>
                  <strong>Master Race Clock:</strong> Start at the official gun start. All logged times are accurate chronometer offsets.
                </li>
                <li>
                  <strong>Missed BIBs?</strong> Click <span className="text-[#FFD700]">Quick Stamp</span>. This logs a placeholder row so you can fill in the runner’s BIB tag once checked.
                </li>
                <li>
                  <strong>Dynamic Lookup:</strong> Upload a contestant CSV file to instantly resolve BIB tags to names, categories, and teams on-the-fly.
                </li>
              </ul>
            </div>

          </div>

        </div>

        {/* Bottom Section: Timing logs list */}
        <ResultsList
          records={records}
          onUpdateRecord={handleUpdateRecord}
          onDeleteRecord={handleDeleteRecord}
          onClearAll={handleClearAllRecords}
          onExport={handleExportCSV}
          onAddCustomRecord={handleAddCustomRecord}
        />

      </main>

      {/* Footer */}
      <footer id="app_footer" className="bg-[#0D0D0D] border-t border-[#222] mt-auto py-5 text-center text-[9px] text-[#555] font-mono uppercase tracking-[0.2em]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p>© 2026 Lumpat Chrono Time IZT. All rights reserved.</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700] animate-pulse" />
            <span>Console Online • Local Persistence Active</span>
          </div>
        </div>
      </footer>
    </div>
  );

  // Helper inside to submit control
  function handleEnterSubmit() {
    handleRecordFinish(inputValue);
  }
}
