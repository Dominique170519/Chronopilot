"use client";

interface Props {
  value: string; // HH:MM
  onChange: (v: string) => void;
  onBlur?: () => void;
  className?: string;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function parseValue(value: string): { h: number; m: number } {
  const parts = value.split(":").map(Number);
  return { h: parts[0] ?? 0, m: parts[1] ?? 0 };
}

export default function TimeInput({ value, onChange, onBlur, className = "" }: Props) {
  const { h, m } = parseValue(value);

  const clamp = (field: "h" | "m", delta: number) => {
    const limits = { h: 23, m: 59 };
    const val = { h, m };
    const next = Math.max(0, Math.min(limits[field], val[field] + delta));
    onChange(`${pad(next)}:${pad(field === "m" ? next : m)}`);
  };

  const setH = (raw: string) => {
    const n = Math.max(0, Math.min(23, parseInt(raw || "0", 10)));
    onChange(`${pad(n)}:${pad(m)}`);
  };

  const setM = (raw: string) => {
    const n = Math.max(0, Math.min(59, parseInt(raw || "0", 10)));
    onChange(`${pad(h)}:${pad(n)}`);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Hours */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => clamp("h", 1)}
          className="w-5 h-5 flex items-center justify-center rounded text-white/30 hover:text-white/60 hover:bg-white/8 text-xs"
        >
          ▲
        </button>
        <input
          type="number"
          min={0}
          max={23}
          value={pad(h)}
          onChange={(e) => setH(e.target.value)}
          onBlur={onBlur}
          className="w-8 bg-white/5 border border-white/10 rounded-lg px-1 py-1 text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 [appearance:textfield]"
        />
        <button
          type="button"
          onClick={() => clamp("h", -1)}
          className="w-5 h-5 flex items-center justify-center rounded text-white/30 hover:text-white/60 hover:bg-white/8 text-xs"
        >
          ▼
        </button>
      </div>

      <span className="text-white/30 text-xs">:</span>

      {/* Minutes */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => clamp("m", 1)}
          className="w-5 h-5 flex items-center justify-center rounded text-white/30 hover:text-white/60 hover:bg-white/8 text-xs"
        >
          ▲
        </button>
        <input
          type="number"
          min={0}
          max={59}
          value={pad(m)}
          onChange={(e) => setM(e.target.value)}
          onBlur={onBlur}
          className="w-8 bg-white/5 border border-white/10 rounded-lg px-1 py-1 text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 [appearance:textfield]"
        />
        <button
          type="button"
          onClick={() => clamp("m", -1)}
          className="w-5 h-5 flex items-center justify-center rounded text-white/30 hover:text-white/60 hover:bg-white/8 text-xs"
        >
          ▼
        </button>
      </div>
    </div>
  );
}
