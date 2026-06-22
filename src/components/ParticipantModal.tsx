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

            <div className="modal-header pt-0">
              <div className="modal-title">Participant Detail</div>
              <button className="btn ghost" onClick={onClose}>
                Close
              </button>
            </div>

            <div className="modal-grid">
              <div className="modal-item">
                <div className="label">Name</div>
                <div className="value">{data.name || "-"}</div>
              </div>

              <div className="modal-item">
                <div className="label">NO BIB</div>
                <div className="value mono">{data.bib || "-"}</div>
              </div>

              <div className="modal-item">
                <div className="label">Gender</div>
                <div className="value">{data.gender || "-"}</div>
              </div>

              <div className="modal-item">
                <div className="label">Race Category</div>
                <div className="value">{data.category || "-"}</div>
              </div>

              <div className="modal-item">
                <div className="label">Start Time</div>
                <div className="value mono">{data.startTimeRaw || "-"}</div>
              </div>

              <div className="modal-item">
                <div className="label">Finish Time</div>
                <div className="value mono">{data.finishTimeRaw || "-"}</div>
              </div>

              <div className="modal-item">
                <div className="label">Total Time</div>
                <div className="value mono strong">
                  {data.totalTimeDisplay || "-"}
                </div>
              </div>

              <div className="modal-item">
                <div className="label">Avg Pace</div>
                <div className="value mono strong text-yellow-600">
                  {data.totalTimeMs ? calculatePace(data.totalTimeMs, data.category) : "--:--"} /km
                </div>
              </div>

              {(data.penaltyMs && data.penaltyMs > 0) ? (
                <div className="modal-item">
                  <div className="label">Penalty</div>
                  <div className="value">
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      background: '#fff7ed',
                      color: '#c2410c',
                      border: '1px solid #fed7aa',
                      fontFamily: 'monospace',
                    }}>
                      +{String(Math.floor(data.penaltyMs / 3600000)).padStart(2, '0')}:{String(Math.floor((data.penaltyMs % 3600000) / 60000)).padStart(2, '0')}:{String(Math.floor((data.penaltyMs % 60000) / 1000)).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Temporarily hidden
              <div className="modal-item modal-wide">
                <div className="label">Checkpoint Time</div>
                <div className="value mono">{cp}</div>
              </div>
              */}

              <div className="modal-item">
                <div className="label">Age Category</div>
                <div className="value">
                  {data.ageCategory?.trim() || "-"}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button
                className="btn"
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
