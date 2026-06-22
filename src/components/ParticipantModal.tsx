import { useState, useEffect } from "react";
import { renderCertificatePNG, downloadDataUrl } from "../lib/certificate";
import { calculatePace } from "../lib/time";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
  eventId?: string;
  eventName?: string;
  data: {
    name: string;
    bib: string;
    gender: string;
    category: string;
    ageCategory?: string;
    startTimeRaw?: string;
    finishTimeRaw: string;
    totalTimeDisplay: string;
    totalTimeMs: number;
    checkpointTimes: string[];
    penaltyMs?: number;
    overallRank: number | null;
    genderRank: number | null;
    categoryRank: number | null;
    ageRank: number | null;
  } | null;
};

function onlyTime(raw: string) {
  const m = raw.match(/(\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)/);
  if (!m) return raw;
  let t = m[1];
  if (t.includes(".")) {
    const [hhmmss, frac] = t.split(".");
    t = `${hhmmss}.${frac.padEnd(3, "0").slice(0, 3)}`;
  } else {
    t = `${t}.000`;
  }
  return t;
}

export default function ParticipantModal({ open, onClose, eventId, eventName, data }: Props) {
  const [downloading, setDownloading] = useState(false);

  const cp =
    data && data.checkpointTimes.length > 0
      ? data.checkpointTimes.map(onlyTime).join(", ")
      : "-";

  const onDownloadCert = async () => {
    if (!data) return;
    try {
      setDownloading(true);
      const png = await renderCertificatePNG({
        eventId,
        eventName,
        name: data.name,
        bib: data.bib,
        gender: data.gender,
        category: data.category,
        ageCategory: data.ageCategory,
        finishTime: data.finishTimeRaw,
        totalTimeDisplay: data.totalTimeDisplay,
        pace: data.totalTimeMs ? calculatePace(data.totalTimeMs, data.category) : undefined,
        overallRank: data.overallRank,
        genderRank: data.genderRank,
        categoryRank: data.categoryRank,
        ageRank: data.ageRank,
      });
      const slug = (eventName || "event").replace(/\s+/g, "-").toLowerCase();
      downloadDataUrl(png, `${slug}-certif-lumpat.png`);
    } catch (err: any) {
      console.error("Browser anda error");
      if (err.message === "Belum ada template") {
        alert("Browser anda error");
      } else {
        alert("Browser anda error");
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && data && (
        <motion.div 
          className="modal-backdrop" 
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div 
            className="modal-card relative overflow-hidden" 
            style={{ touchAction: 'none' }} // Prevent scrolling when dragging
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 50, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.8 }}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) onClose();
            }}
          >

            {/* Drag Handle Indicator */}
            <div className="w-full flex justify-center pt-1 pb-3">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-800">Participant Detail</h3>
              <button 
                onClick={onClose} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mt-4 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto pr-1 pb-1 scrollbar-hide">
              <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Name</div>
                <div className="font-semibold text-slate-800 text-sm sm:text-base">{data.name || "-"}</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">NO BIB</div>
                <div className="font-mono font-bold text-red-500 text-sm sm:text-base">{data.bib || "-"}</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Race Category</div>
                <div className="font-semibold text-slate-800 text-xs sm:text-sm">{data.category || "-"}</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Gender</div>
                <div className="font-semibold text-slate-800 text-xs sm:text-sm">{data.gender || "-"}</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Age Category</div>
                <div className="font-semibold text-slate-800 text-xs sm:text-sm">{data.ageCategory?.trim() || "-"}</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Start Time</div>
                <div className="font-mono font-semibold text-emerald-600 text-xs sm:text-sm">{data.startTimeRaw || "-"}</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Finish Time</div>
                <div className="font-mono font-semibold text-rose-500 text-xs sm:text-sm">{data.finishTimeRaw || "-"}</div>
              </div>

              <div className="col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-3 sm:p-4 flex justify-between items-center shadow-inner">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Total Time</div>
                  <div className="font-mono font-black text-white text-lg sm:text-xl">
                    {data.totalTimeDisplay || "-"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Avg Pace</div>
                  <div className="font-mono font-bold text-yellow-400 text-sm sm:text-base">
                    {data.totalTimeMs ? calculatePace(data.totalTimeMs, data.category) : "--:--"} /km
                  </div>
                </div>
              </div>

              {(data.penaltyMs && data.penaltyMs > 0) ? (
                <div className="col-span-2 bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-orange-400 uppercase mb-0.5">Penalty</div>
                  <div className="font-mono font-bold text-orange-600 text-sm">
                    +{String(Math.floor(data.penaltyMs / 3600000)).padStart(2, '0')}:{String(Math.floor((data.penaltyMs % 3600000) / 60000)).padStart(2, '0')}:{String(Math.floor((data.penaltyMs % 60000) / 1000)).padStart(2, '0')}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 w-full">
              <button
                className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-3 sm:py-3.5 px-4 rounded-xl shadow-md transition-all text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onDownloadCert}
                disabled={downloading}
              >
                {downloading ? "Rendering…" : "Download E-Certificate"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
