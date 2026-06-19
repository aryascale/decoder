import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Clock, Edit2, Check } from "lucide-react";
import { formatDuration } from "./utils";

interface ClockControlsProps {
  isRunning: boolean;
  elapsedTime: number; // Current elapsed time in ms
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSetCustomTime: (ms: number) => void;
}

export default function ClockControls({
  isRunning,
  elapsedTime,
  onStart,
  onPause,
  onReset,
  onSetCustomTime,
}: ClockControlsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editHours, setEditHours] = useState("00");
  const [editMinutes, setEditMinutes] = useState("00");
  const [editSeconds, setEditSeconds] = useState("00");

  const toggleEdit = () => {
    if (isEditing) {
      // Parse inputs and update
      const hrs = parseInt(editHours, 10) || 0;
      const mins = parseInt(editMinutes, 10) || 0;
      const secs = parseInt(editSeconds, 10) || 0;
      const totalMs = (hrs * 3600 + mins * 60 + secs) * 1000;
      onSetCustomTime(totalMs);
      setIsEditing(false);
    } else {
      // Load current elapsed time into edit inputs
      const hrs = Math.floor(elapsedTime / 3600000);
      const mins = Math.floor((elapsedTime % 3600000) / 60000);
      const secs = Math.floor((elapsedTime % 60000) / 1000);
      setEditHours(String(hrs).padStart(2, "0"));
      setEditMinutes(String(mins).padStart(2, "0"));
      setEditSeconds(String(secs).padStart(2, "0"));
      setIsEditing(true);
    }
  };

  return (
    <div id="clock_controls_container" className="bg-[#111] border border-[#222] rounded-none p-6 text-[#E0E0E0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="flex flex-col gap-1">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#666] flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#FFD700]" />
          Master Race Clock
        </div>

        {isEditing ? (
          <div className="flex items-center gap-2 mt-2">
            <input
              id="edit-hours"
              type="number"
              min="0"
              max="99"
              value={editHours}
              onChange={(e) => setEditHours(e.target.value.slice(0, 2))}
              className="w-16 text-3xl font-mono text-center bg-[#1E1E1E] border border-[#333] rounded-none p-1 text-white focus:outline-none focus:border-[#FFD700]"
              placeholder="HH"
            />
            <span className="text-2xl font-mono text-[#666]">:</span>
            <input
              id="edit-minutes"
              type="number"
              min="0"
              max="59"
              value={editMinutes}
              onChange={(e) => setEditMinutes(e.target.value.slice(0, 2))}
              className="w-16 text-3xl font-mono text-center bg-[#1E1E1E] border border-[#333] rounded-none p-1 text-white focus:outline-none focus:border-[#FFD700]"
              placeholder="MM"
            />
            <span className="text-2xl font-mono text-[#666]">:</span>
            <input
              id="edit-seconds"
              type="number"
              min="0"
              max="59"
              value={editSeconds}
              onChange={(e) => setEditSeconds(e.target.value.slice(0, 2))}
              className="w-16 text-3xl font-mono text-center bg-[#1E1E1E] border border-[#333] rounded-none p-1 text-white focus:outline-none focus:border-[#FFD700]"
              placeholder="SS"
            />
            <button
              id="save-clock-time-btn"
              onClick={toggleEdit}
              className="ml-3 px-3 py-2 bg-[#FFD700] hover:bg-white text-black font-bold uppercase text-xs tracking-wider rounded-none transition-colors cursor-pointer"
              title="Save time"
            >
              Save
            </button>
          </div>
        ) : (
          <div className="flex items-baseline gap-3 mt-1">
            <span id="race_time_display" className="text-4xl md:text-5xl font-mono font-bold tracking-tight text-[#FFD700] select-all">
              {formatDuration(elapsedTime)}
            </span>
            <button
              id="edit-clock-time-btn"
              onClick={toggleEdit}
              className="px-2 py-1 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#333] hover:border-[#FFD700] text-[#888] hover:text-white text-[10px] font-mono uppercase tracking-wider transition rounded-none cursor-pointer"
              title="Edit start duration"
            >
              Adjust
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isRunning ? (
          <button
            id="pause-race-clock-btn"
            onClick={onPause}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-none bg-[#FFD700] hover:bg-[#FFC000] text-black font-bold uppercase tracking-wider text-xs transition cursor-pointer select-none"
          >
            <Pause className="w-3.5 h-3.5 fill-black" />
            Pause Timer
          </button>
        ) : (
          <button
            id="start-race-clock-btn"
            onClick={onStart}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-none bg-[#FFD700] hover:bg-white text-black font-bold uppercase tracking-wider text-xs transition cursor-pointer select-none"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            Start Timer
          </button>
        )}

        <button
          id="reset-race-clock-btn"
          onClick={() => {
            if (window.confirm("Are you sure you want to reset the race timer to 0? This will not delete your logged times, but will reset the baseline for future logging.")) {
              onReset();
            }
          }}
          className="p-3 border border-[#333] hover:border-[#FFD700] bg-[#1a1a1a] text-[#888] hover:text-rose-400 rounded-none transition cursor-pointer"
          title="Reset clock"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
