"use client";
import type { UnavailableBlock } from "@/types";
import TimeInput from "./TimeInput";

interface Props {
  sleepBlock: boolean;
  breakfast: boolean;
  lunchBreak: boolean;
  dinner: boolean;
  unavailableBlocks: UnavailableBlock[];
  onSleepChange: (v: boolean) => void;
  onBreakfastChange: (v: boolean) => void;
  onLunchChange: (v: boolean) => void;
  onDinnerChange: (v: boolean) => void;
  onUnavailableChange: (v: UnavailableBlock[]) => void;
}

function MealToggle({
  label,
  timeRange,
  enabled,
  onChange,
}: {
  label: string;
  timeRange: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/4 px-4 py-3">
      <div>
        <div className="text-sm text-white/70 font-medium">{label}</div>
        <div className="text-xs text-white/30 mt-0.5">{timeRange}</div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative h-7 w-12 rounded-full transition shrink-0 ml-4 ${
          enabled ? "bg-blue-600" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function UnavailableSettings({
  sleepBlock,
  breakfast,
  lunchBreak,
  dinner,
  unavailableBlocks,
  onSleepChange,
  onBreakfastChange,
  onLunchChange,
  onDinnerChange,
  onUnavailableChange,
}: Props) {
  const addBlock = () => {
    onUnavailableChange([
      ...unavailableBlocks,
      { start: "14:00", end: "15:00", reason: "" },
    ]);
  };

  const updateBlock = (
    index: number,
    field: "start" | "end" | "reason",
    value: string
  ) => {
    const updated = [...unavailableBlocks];
    updated[index] = { ...updated[index], [field]: value };
    onUnavailableChange(updated);
  };

  const removeBlock = (index: number) => {
    onUnavailableChange(unavailableBlocks.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-white/90">
          先留出不能被打扰的时间
        </h3>
        <p className="text-xs text-white/35 leading-relaxed">
          睡觉、三餐等固定时间，AI 会自动避开。
        </p>
      </div>

      <div className="space-y-2.5">
        {/* 睡觉 */}
        <MealToggle
          label="睡觉时间"
          timeRange="23:00 — 08:00"
          enabled={sleepBlock}
          onChange={onSleepChange}
        />

        {/* 三餐 */}
        <MealToggle
          label="早餐"
          timeRange="07:00 — 08:00"
          enabled={breakfast}
          onChange={onBreakfastChange}
        />
        <MealToggle
          label="午餐"
          timeRange="12:00 — 13:00"
          enabled={lunchBreak}
          onChange={onLunchChange}
        />
        <MealToggle
          label="晚餐"
          timeRange="18:00 — 19:00"
          enabled={dinner}
          onChange={onDinnerChange}
        />

        {/* 其他不可用时段 */}
        <div className="rounded-xl border border-white/10 bg-white/4 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40 font-medium uppercase tracking-wider">
              其他固定安排
            </span>
            <button
              onClick={addBlock}
              className="text-xs text-blue-400/70 hover:text-blue-300 transition"
            >
              + 添加
            </button>
          </div>

          {unavailableBlocks.length > 0 ? (
            <div className="space-y-2">
              {unavailableBlocks.map((block, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <TimeInput
                    value={block.start}
                    onChange={(v) => updateBlock(i, "start", v)}
                    className="flex-1 min-w-0 [&_input]:w-7 [&_button]:w-4 [&_button]:h-4"
                  />
                  <span className="text-white/25 text-xs shrink-0">至</span>
                  <TimeInput
                    value={block.end}
                    onChange={(v) => updateBlock(i, "end", v)}
                    className="flex-1 min-w-0 [&_input]:w-7 [&_button]:w-4 [&_button]:h-4"
                  />
                  <input
                    type="text"
                    value={block.reason ?? ""}
                    onChange={(e) => updateBlock(i, "reason", e.target.value)}
                    placeholder="备注"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500/50 min-w-0"
                  />
                  <button
                    onClick={() => removeBlock(i)}
                    className="text-white/25 hover:text-red-400 transition text-xs w-5 shrink-0 flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/20 py-1">
              暂无其他固定安排
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
