"use client";
import type { EnergyLevel, ScheduleMode } from "@/types";

interface Props {
  energy: EnergyLevel;
  mode: ScheduleMode;
  onEnergyChange: (v: EnergyLevel) => void;
  onModeChange: (v: ScheduleMode) => void;
}

const energyOptions: { value: EnergyLevel; label: string }[] = [
  { value: "high", label: "充沛" },
  { value: "medium", label: "一般" },
  { value: "low", label: "疲惫" },
];

const modeOptions: { value: ScheduleMode; label: string; desc: string }[] = [
  {
    value: "efficient",
    label: "高效模式",
    desc: "最大化产出，优先完成关键任务",
  },
  {
    value: "balanced",
    label: "平衡模式",
    desc: "兼顾效率和状态，不把一天排得太满",
  },
  {
    value: "easy",
    label: "轻松模式",
    desc: "降低压力，优先安排保底任务和恢复节奏",
  },
];

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-blue-500/60 bg-blue-500/20 text-blue-200 shadow-btn-glow"
          : "border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:bg-white/10 hover:text-white/80"
      }`}
    >
      {children}
    </button>
  );
}

export default function SettingsPanel({
  energy,
  mode,
  onEnergyChange,
  onModeChange,
}: Props) {
  return (
    <div className="space-y-5">
      {/* 精力 */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-white/90">你现在的状态怎么样？</h3>
        <div className="flex gap-2">
          {energyOptions.map((opt) => (
            <PillButton
              key={opt.value}
              active={energy === opt.value}
              onClick={() => onEnergyChange(opt.value)}
            >
              {opt.label}
            </PillButton>
          ))}
        </div>
      </div>

      {/* 模式 */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-white/90">你想怎么过这一天？</h3>
        <div className="space-y-1.5">
          {modeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onModeChange(opt.value)}
              className={`w-full flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                mode === opt.value
                  ? "border-blue-500/50 bg-blue-500/15"
                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
              }`}
            >
              <div
                className={`mt-0.5 h-3 w-3 rounded-full border-2 shrink-0 transition ${
                  mode === opt.value
                    ? "border-blue-400 bg-blue-400"
                    : "border-white/25 bg-transparent mt-1"
                }`}
              />
              <div>
                <div
                  className={`text-sm font-medium ${
                    mode === opt.value ? "text-blue-200" : "text-white/70"
                  }`}
                >
                  {opt.label}
                </div>
                <div className="text-xs text-white/35 mt-0.5 leading-relaxed">
                  {opt.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
