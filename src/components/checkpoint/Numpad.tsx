import React from "react";
import { Delete, CornerDownLeft, XCircle } from "lucide-react";

interface NumpadProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onEnter: () => void;
}

export default function Numpad({ onKeyPress, onBackspace, onClear, onEnter }: NumpadProps) {
  const keys = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
  ];

  return (
    <div id="onscreen_numpad_container" className="bg-[#0D0D0D] border border-[#222] rounded-none p-5 text-white flex flex-col gap-3 shadow-none select-none">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#666] font-semibold">
        Keypad Console (Touch Enabled)
      </div>

      <div className="grid grid-cols-3 gap-2 flex-grow h-[260px] md:h-[300px]">
        {keys.map((row, rIdx) => (
          <React.Fragment key={rIdx}>
            {row.map((num) => (
              <button
                id={`numpad-key-${num}`}
                key={num}
                type="button"
                onClick={() => onKeyPress(num)}
                className="flex items-center justify-center text-2xl font-mono bg-[#1A1A1A] border border-[#222] hover:bg-[#2A2A2A] hover:border-[#333] hover:text-[#FFD700] active:scale-95 rounded-none transition cursor-pointer"
              >
                {num}
              </button>
            ))}
          </React.Fragment>
        ))}

        {/* Bottom row: Clear, 0, Backspace */}
        <button
          id="numpad-key-clear"
          type="button"
          onClick={onClear}
          className="flex items-center justify-center text-rose-500 hover:text-rose-400 bg-[#1A1A1A] border border-[#222] hover:bg-[#2A2A2A] active:scale-95 rounded-none transition cursor-pointer text-[10px] uppercase font-mono tracking-widest font-semibold"
          title="Clear"
        >
          Clear
        </button>

        <button
          id="numpad-key-0"
          type="button"
          onClick={() => onKeyPress("0")}
          className="flex items-center justify-center text-2xl font-mono bg-[#1A1A1A] border border-[#222] hover:bg-[#2A2A2A] hover:border-[#333] hover:text-[#FFD700] active:scale-95 rounded-none transition cursor-pointer"
        >
          0
        </button>

        <button
          id="numpad-key-backspace"
          type="button"
          onClick={onBackspace}
          className="flex items-center justify-center text-slate-400 hover:text-white bg-[#1A1A1A] border border-[#222] hover:bg-[#2A2A2A] active:scale-95 rounded-none transition cursor-pointer"
          title="Backspace"
        >
          <Delete className="w-4 h-4" />
        </button>
      </div>

      {/* Large Enter key */}
      <button
        id="numpad-key-enter"
        type="button"
        onClick={onEnter}
        className="flex items-center justify-center gap-2 py-4 rounded-none bg-[#FFD700] hover:bg-white text-black font-bold uppercase tracking-[0.2em] text-xs transition active:scale-[0.98] cursor-pointer h-14"
      >
        <CornerDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
        ENTER & TIMESTAMP
      </button>
    </div>
  );
}
