"use client";
import type { ScheduleResult, ScheduleMode, EnergyLevel } from "@/types";
import { normalizeScheduleItems } from "@/types";
import { useState } from "react";

interface Props {
  result: ScheduleResult | null;
  loading: boolean;
  error: string | null;
  mode: ScheduleMode;
  energy: EnergyLevel;
  onRerange: (changes: string) => void;
  onRerangeLoading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 时间轴常量
// ─────────────────────────────────────────────────────────────────────────────
const DAY_START = 8;    // 08:00
const DAY_END = 23;     // 23:00
const HOURS = Array.from({ length: (DAY_END - DAY_START) + 1 }, (_, i) => DAY_START + i);

// 计算时间轴基准：使用 scheduleItems 中最晚的结束时间，向上取整到整点
function getTimelineConfig(scheduleItems: ReturnType<typeof normalizeScheduleItems>) {
  if (scheduleItems.length === 0) {
    return { totalMinutes: (DAY_END - DAY_START) * 60, dayEnd: DAY_END, hours: HOURS };
  }
  // 找出最晚结束时间
  let lastEndMin = 0;
  for (const item of scheduleItems) {
    const endParts = item.endTime.split(":").map(Number);
    if (endParts.length >= 2 && !endParts.some(isNaN)) {
      const mins = endParts[0] * 60 + endParts[1];
      if (mins > lastEndMin) lastEndMin = mins;
    }
  }
  // 确保不早于 DAY_END
  const dayEnd = Math.max(DAY_END, Math.ceil(lastEndMin / 60));
  const totalMinutes = (dayEnd - DAY_START) * 60;
  const hours = Array.from({ length: (dayEnd - DAY_START) + 1 }, (_, i) => DAY_START + i);
  return { totalMinutes, dayEnd, hours };
}

// ─────────────────────────────────────────────────────────────────────────────
// 时间解析（统一函数，时间轴所有元素共用）
// ─────────────────────────────────────────────────────────────────────────────

/** 将 "HH:MM" 解析为总分钟数，如 "09:30" → 570 */
function parseTime(time: string | undefined): number {
  if (!time) return NaN;
  const parts = time.split(":").map(Number);
  if (parts.length < 2 || parts.some(isNaN)) return NaN;
  return parts[0] * 60 + parts[1];
}

// ─────────────────────────────────────────────────────────────────────────────
// 类型配置
// ─────────────────────────────────────────────────────────────────────────────
const typeConfig: Record<string, { bg: string; border: string; label: string; text: string; reason: string }> = {
  focus:    { bg: "bg-blue-500/15",   border: "border-l-blue-400",    label: "深度工作", text: "text-blue-200",  reason: "text-blue-400/60" },
  light:    { bg: "bg-white/6",       border: "border-l-white/40",   label: "轻任务",   text: "text-white/70",   reason: "text-white/30" },
  recovery: { bg: "bg-green-500/12",  border: "border-l-green-400",  label: "恢复",     text: "text-green-200", reason: "text-green-400/60" },
  flex:     { bg: "bg-orange-500/12", border: "border-l-orange-400",  label: "弹性时间", text: "text-orange-200",reason: "text-orange-400/60" },
  buffer:   { bg: "bg-white/3",       border: "border-l-white/20",   label: "过渡",     text: "text-white/40",   reason: "text-white/25" },
};

const modeLabel: Record<ScheduleMode, string> = {
  efficient: "高效模式",
  balanced: "平衡模式",
  easy: "轻松模式",
};

const energyLabel: Record<EnergyLevel, string> = {
  high: "精力充沛",
  medium: "精力一般",
  low: "精力疲惫",
};

// ─────────────────────────────────────────────────────────────────────────────
// 空状态
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState() {
  const tips = ["自动判断优先级", "给出节奏更合理的安排", "必要时延后低优先级任务"];
  return (
    <div className="flex flex-col items-center text-center py-16 px-6 space-y-6">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border border-white/10 bg-white/5" />
        <div className="absolute inset-3 rounded-full border border-dashed border-white/15" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl opacity-40">◷</div>
      </div>
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-white/70">你的明天还没开始安排</h3>
        <p className="text-sm text-white/35 leading-relaxed max-w-xs">
          在左边输入任务、目标和当前状态，AI 会帮你生成一份更合理的一天。
        </p>
      </div>
      <div className="w-full max-w-xs space-y-2">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-center gap-2.5 text-left">
            <div className="w-4 h-4 rounded-full border border-white/15 bg-white/6 flex items-center justify-center shrink-0">
              <span className="text-[8px] text-white/40">{i + 1}</span>
            </div>
            <span className="text-xs text-white/35">{tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 组件
// ─────────────────────────────────────────────────────────────────────────────
export default function ScheduleResult({
  result,
  loading,
  error,
  mode,
  energy,
  onRerange,
  onRerangeLoading,
}: Props) {
  const [changes, setChanges] = useState("");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 py-24 backdrop-blur-xl">
        <div className="relative mb-5">
          <div className="w-14 h-14 rounded-full border-2 border-blue-500/20 border-t-blue-400 animate-spin" />
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/10 animate-pulse" />
        </div>
        <p className="text-sm text-white/40 mb-1">AI 正在规划你的日程</p>
        <p className="text-xs text-white/25">先做判断，再做安排...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-800/50 bg-red-500/10 p-4">
        <p className="text-sm font-medium text-red-300">生成失败</p>
        <p className="text-xs text-red-400/80 mt-1">{error}</p>
      </div>
    );
  }

  if (!result) return <EmptyState />;

  // ── 統一數據解析 ──────────────────────────────────────────────────────────
  // 支持：{ schedule: [...] }、直接數組、其他字段名
  const rawSchedule = Array.isArray(result)
    ? result
    : result.schedule ?? (result as any).items ?? (result as any).data ?? [];

  const scheduleItems = normalizeScheduleItems(rawSchedule);
  const droppedTasks = Array.isArray(result)
    ? []
    : (result.droppedTasks ?? []);

  // ── 動態時間軸配置 ───────────────────────────────────────────────────────
  const { totalMinutes, hours: timelineHours } = getTimelineConfig(scheduleItems);

  function minutesToTop(timeMinutes: number): number {
    return ((timeMinutes - DAY_START * 60) / totalMinutes) * 100;
  }
  function durationToHeightPct(durationMinutes: number): number {
    return Math.max((durationMinutes / totalMinutes) * 100, 4);
  }

  return (
    <div className="space-y-4">
      {/* ── 策略卡 ── */}
      <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-widest text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            今日策略
          </span>
          <span className="rounded-full border border-white/15 bg-white/8 px-2.5 py-0.5 text-xs text-white/50">{modeLabel[mode]}</span>
          <span className="rounded-full border border-white/15 bg-white/8 px-2.5 py-0.5 text-xs text-white/50">{energyLabel[energy]}</span>
        </div>
        <p className="text-base font-semibold text-white leading-snug mb-4">{result.summary}</p>
        {result.decisions && result.decisions.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-white/25 font-semibold mb-2">AI 判断</div>
            {result.decisions.map((d, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400/60 shrink-0" />
                <p className="text-xs text-white/45 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 时间轴 ── */}
      {/*
        布局结构（从外到内）：
        1. 外层 rounded-3xl：卡片容器，含顶部标题区
        2. 中层 flex（新增）：横向排列，左=刻度标签，右=任务内容区
        3. 左列 w-12：绝对定位的小时刻度标签（参照中层左边界）
        4. 右列 flex-1 relative：任务内容区，绝对定位的网格线和任务块（参照右列左边界）
        5. 网格线和任务块统一使用 minutesToTop() 函数定位，与刻度标签绝对一致
      */}
      <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden shadow-panel backdrop-blur-xl">
        <div className="px-5 pt-4 pb-2">
          <h3 className="text-xs uppercase tracking-widest text-white/30 font-semibold mb-0.5">明日安排</h3>
          <p className="text-xs text-white/20">从早到晚展示 AI 为你规划的节奏。</p>
        </div>

        {/* 时间轴主体：横向 flex，左=刻度标签，右=内容区 */}
        <div className="flex pb-4" style={{ height: `${Math.round((totalMinutes / 60) * 52)}px` }}>

          {/* 左列：小时刻度标签，始终紧贴内容区左边界 */}
          <div className="w-12 shrink-0 relative">
            {timelineHours.map((h) => {
              const timeMin = h * 60;
              const top = minutesToTop(timeMin);
              return (
                <div
                  key={h}
                  className="absolute right-3 text-[10px] text-white/25"
                  style={{ top: `${top}%`, transform: "translateY(-50%)" }}
                >
                  {h.toString().padStart(2, "0")}:00
                </div>
              );
            })}
          </div>

          {/* 右列：内容区，唯一定位参考 */}
          <div className="flex-1 relative overflow-hidden">

            {/* 水平网格线：使用 minutesToTop()，与刻度标签绝对对齐 */}
            {timelineHours.map((h) => {
              const timeMin = h * 60;
              return (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-white/[0.04]"
                  style={{ top: `${minutesToTop(timeMin)}%` }}
                />
              );
            })}

            {/* 现在时间指示线 */}
            {(() => {
              const now = new Date();
              const nowMin = now.getHours() * 60 + now.getMinutes();
              if (nowMin >= DAY_START * 60 && nowMin < DAY_END * 60) {
                return (
                  <div
                    className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                    style={{ top: `${minutesToTop(nowMin)}%` }}
                  >
                    <div className="w-2 h-2 rounded-full bg-red-400 -ml-px shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                    <div className="flex-1 h-px bg-red-400/40" />
                  </div>
                );
              }
              return null;
            })()}

            {/* 任务卡片：统一使用标准化后的 scheduleItems */}
            {scheduleItems.map((item, i) => {
              const cfg = typeConfig[item.type] || typeConfig.buffer;
              const startMin = parseTime(item.startTime);
              if (isNaN(startMin)) return null;

              const top = minutesToTop(startMin);
              const heightPct = durationToHeightPct(item.duration);

              return (
                <div
                  key={i}
                  className={`absolute left-1 right-1 rounded-xl border-l-2 ${cfg.bg} ${cfg.border} shadow-sm overflow-hidden`}
                  style={{ top: `${top}%`, height: `${heightPct}%` }}
                >
                  <div className="w-full h-full px-2.5 py-1.5 overflow-hidden flex flex-col justify-start gap-0.5">
                    {/* 第1行：开始时间 + 任务名 */}
                    <div className="flex items-baseline gap-1.5 min-w-0">
                      <span className="text-[10px] font-mono text-white/40 shrink-0 tabular-nums leading-none">
                        {item.startTime}
                      </span>
                      <span className={`text-xs font-medium leading-snug truncate ${cfg.text}`}>
                        {item.title}
                      </span>
                    </div>
                    {/* 第2行：类型标签 + 原因 */}
                    {item.reason && (
                      <div className="flex items-start gap-1 min-w-0 overflow-hidden">
                        <span className={`shrink-0 text-[9px] px-1 py-px rounded border leading-relaxed ${cfg.bg} ${cfg.text} border-white/10`}>
                          {cfg.label}
                        </span>
                        <span className={`text-[9px] leading-relaxed ${cfg.reason} line-clamp-1`}>
                          {item.reason}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 未安排 ── */}
      {droppedTasks.length > 0 && (
        <div className="rounded-2xl border border-orange-800/40 bg-orange-500/8 p-4">
          <div className="mb-1">
            <span className="text-sm font-semibold text-orange-300">今天先不安排的事</span>
          </div>
          <p className="text-xs text-orange-400/50 mb-3 leading-relaxed">
            这些任务并不是不重要，而是今天优先级不够高，或时间不够合理。
          </p>
          <div className="space-y-1.5">
            {droppedTasks.map((t, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full border border-orange-500/40 shrink-0" />
                <div>
                  <span className="text-sm text-orange-200">{t.task}</span>
                  {t.reason && (
                    <span className="text-xs text-orange-400/60 ml-1.5">— {t.reason}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 重新安排 ── */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <div className="mb-3 space-y-0.5">
          <h3 className="text-sm font-semibold text-white/80">计划有变化？</h3>
          <p className="text-xs text-white/30 leading-relaxed">
            告诉 AI 新情况，它会在保留重点任务的前提下重新安排。
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={changes}
            onChange={(e) => setChanges(e.target.value)}
            placeholder="例如：下午 3 点要开会"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            onKeyDown={(e) => e.key === "Enter" && changes.trim() && onRerange(changes)}
          />
          <button
            onClick={() => changes.trim() && onRerange(changes)}
            disabled={onRerangeLoading || !changes.trim()}
            className="shrink-0 rounded-xl border border-orange-500/40 bg-orange-500/15 text-orange-300 px-4 py-2.5 text-sm font-semibold hover:bg-orange-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            重新安排
          </button>
        </div>
      </div>
    </div>
  );
}
