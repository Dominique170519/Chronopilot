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
  schedules?: Record<string, ScheduleResult>;
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
}

// ── 时间轴常量 ───────────────────────────────────────────────────────────────
const DAY_START = 8;  // 08:00
const DAY_END   = 23; // 23:00
const PX_PER_Hour = 72; // 每小时视觉高度（px）

function minutesToHours(minutes: number) { return minutes / 60; }

// 时间轴总高度
const timelinePx = (DAY_END - DAY_START) * PX_PER_Hour; // 15h × 72 = 1080px

// 任务块最小高度（px），确保短任务也可见
const MIN_BLOCK_PX = 36;

// ── 类型配置 ─────────────────────────────────────────────────────────────────
const typeConfig: Record<string, { bg: string; border: string; label: string; text: string; reason: string }> = {
  focus:    { bg: "bg-blue-500/20",   border: "border-l-blue-400",    label: "深度工作", text: "text-blue-200",  reason: "text-blue-400/70" },
  light:    { bg: "bg-white/8",       border: "border-l-white/50",    label: "轻任务",   text: "text-white/75",  reason: "text-white/35" },
  recovery: { bg: "bg-green-500/15",  border: "border-l-green-400",   label: "恢复",     text: "text-green-200", reason: "text-green-400/70" },
  flex:     { bg: "bg-orange-500/15", border: "border-l-orange-400",   label: "弹性时间", text: "text-orange-200",reason: "text-green-400/70" },
  buffer:   { bg: "bg-white/4",       border: "border-l-white/25",    label: "过渡",     text: "text-white/45",  reason: "text-white/25" },
};

const modeLabel: Record<ScheduleMode, string> = {
  efficient: "高效模式", balanced: "平衡模式", easy: "轻松模式",
};
const energyLabel: Record<EnergyLevel, string> = {
  high: "精力充沛", medium: "精力一般", low: "精力疲惫",
};

function parseTime(time: string | undefined): number {
  if (!time) return NaN;
  const parts = time.split(":").map(Number);
  if (parts.length < 2 || parts.some(isNaN)) return NaN;
  return parts[0] * 60 + parts[1];
}

// ── 骨架屏 ────────────────────────────────────────────────────────────────────
function SkeletonLoader() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
        <div className="flex gap-2 mb-4">
          <div className="h-5 w-24 rounded-full bg-white/8" />
          <div className="h-5 w-16 rounded-full bg-white/5" />
          <div className="h-5 w-16 rounded-full bg-white/5" />
        </div>
        <div className="h-5 w-3/4 rounded-lg bg-white/8 mb-3" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-white/5" />
          <div className="h-3 w-5/6 rounded bg-white/5" />
          <div className="h-3 w-4/5 rounded bg-white/5" />
        </div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden p-5">
        <div className="h-3 w-24 rounded bg-white/5 mb-4" />
        <div className="flex" style={{ height: `${timelinePx}px` }}>
          <div className="w-12 shrink-0">
            {Array.from({ length: 16 }, (_, i) => (
              <div key={i} style={{ height: `${PX_PER_Hour}px` }} className="flex items-end pb-1 justify-end pr-3">
                <div className="h-2 w-6 rounded bg-white/5" />
              </div>
            ))}
          </div>
          <div className="flex-1 relative border-l border-white/[0.04]">
            {Array.from({ length: 16 }, (_, i) => (
              <div key={i} style={{ height: `${PX_PER_Hour}px` }} className="border-t border-white/[0.04]" />
            ))}
            <div className="absolute left-1 right-1 rounded-xl bg-blue-500/10 border border-l-2 border-l-blue-500/30" style={{ top: `${PX_PER_Hour * 0}px`, height: "90px" }} />
            <div className="absolute left-1 right-1 rounded-xl bg-blue-500/10 border border-l-2 border-l-blue-500/30" style={{ top: `${PX_PER_Hour * 2}px`, height: "72px" }} />
            <div className="absolute left-1 right-1 rounded-xl bg-green-500/10 border border-l-2 border-l-green-500/30" style={{ top: `${PX_PER_Hour * 3.5}px`, height: "48px" }} />
            <div className="absolute left-1 right-1 rounded-xl bg-blue-500/10 border border-l-2 border-l-blue-500/30" style={{ top: `${PX_PER_Hour * 4}px`, height: "96px" }} />
            <div className="absolute left-1 right-1 rounded-xl bg-white/4 border border-l-2 border-l-white/20" style={{ top: `${PX_PER_Hour * 6}px`, height: "36px" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 空状态 ────────────────────────────────────────────────────────────────────
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
          在左边输入任务、状态和目标，AI 会帮你生成一份更合理的一天。
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

// ── 单个任务块 ────────────────────────────────────────────────────────────────
interface BlockProps {
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: string;
  reason?: string;
  isDropped?: boolean;
  isLast?: boolean;
}

function ScheduleBlock({ title, startTime, endTime, duration, type, reason, isDropped }: BlockProps) {
  const cfg = typeConfig[type] || typeConfig.buffer;
  // 高度 = max(实际分钟对应px, 最小px)
  const heightPx = Math.max(duration * (PX_PER_Hour / 60), MIN_BLOCK_PX);

  if (isDropped) {
    return (
      <div
        className="mb-1 flex-shrink-0 rounded-xl border border-dashed border-white/20 bg-white/3 overflow-hidden"
        style={{ height: `${heightPx}px` }}
        title={`未安排：${title} — ${reason || "时间不足或优先级不够"}`}
      >
        <div className="w-full h-full px-2.5 py-1.5 flex flex-col justify-between gap-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-mono text-white/30 shrink-0 tabular-nums leading-none">{startTime}</span>
            <span className="text-xs text-white/30 line-through truncate">{title}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] px-1 py-px rounded border border-dashed border-white/20 text-white/25">
              未安排
            </span>
            <span className="text-[9px] text-white/20 truncate">{reason || "时间不足"}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mb-1 flex-shrink-0 rounded-xl border-l-2 ${cfg.bg} ${cfg.border} overflow-hidden`}
      style={{ height: `${heightPx}px` }}
      title={title}
    >
      <div className="w-full h-full px-2.5 py-1.5 flex flex-col justify-between gap-0.5">
        {/* 第1行：时间 + 任务名 */}
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-[10px] font-mono text-white/40 shrink-0 tabular-nums leading-none">
            {startTime}
          </span>
          <span className={`text-xs font-medium leading-snug ${cfg.text} line-clamp-2`}>
            {title}
          </span>
        </div>
        {/* 第2行：类型标签 + 原因 */}
        <div className="flex items-start gap-1 min-w-0 overflow-hidden">
          <span className={`shrink-0 text-[9px] px-1 py-px rounded border leading-relaxed ${cfg.bg} ${cfg.text} border-white/10`}>
            {cfg.label}
          </span>
          {reason && (
            <span className={`text-[9px] leading-relaxed ${cfg.reason} line-clamp-2 overflow-hidden`}>
              {reason}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export default function ScheduleResult({
  result, loading, error, mode, energy,
  onRerange, onRerangeLoading,
  schedules, selectedDate, onSelectDate,
}: Props) {
  const [changes, setChanges] = useState("");

  if (loading) return <SkeletonLoader />;
  if (error) return (
    <div className="rounded-2xl border border-red-800/50 bg-red-500/10 p-4">
      <p className="text-sm font-medium text-red-300">生成失败</p>
      <p className="text-xs text-red-400/80 mt-1">{error}</p>
    </div>
  );
  if (!result) return <EmptyState />;

  // ── 数据标准化 ──────────────────────────────────────────────────────────────
  const rawSchedule = Array.isArray(result)
    ? result
    : result.schedule ?? (result as any).items ?? (result as any).data ?? [];

  const scheduleItems = normalizeScheduleItems(rawSchedule);
  const droppedTasks: { task: string; reason?: string }[] = Array.isArray(result)
    ? []
    : (result.droppedTasks ?? []);

  // 按时长降序排列，用于分组显示
  const sortedItems = [...scheduleItems].sort((a, b) => {
    const aStart = parseTime(a.startTime);
    const bStart = parseTime(b.startTime);
    return (isNaN(aStart) ? 0 : aStart) - (isNaN(bStart) ? 0 : bStart);
  });

  // 生成时间轴刻度数（8点到23点，每小时一个）
  const hours = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);

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
                <p className="text-xs text-white/45 leading-relaxed line-clamp-3">{d}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 时间轴 ── */}
      <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden shadow-panel backdrop-blur-xl">
        <div className="px-5 pt-4 pb-3">
          <h3 className="text-xs uppercase tracking-widest text-white/30 font-semibold mb-0.5">明日安排</h3>
          <p className="text-xs text-white/20">从早到晚展示 AI 为你规划的节奏。</p>
        </div>

        {/* 时间轴主体：flex，左刻度 + 右内容 */}
        <div className="flex pb-4 px-5" style={{ height: `${timelinePx}px` }}>
          {/* 左：小时刻度 */}
          <div className="w-12 shrink-0">
            {hours.map((h) => (
              <div
                key={h}
                className="flex items-end justify-end pr-3"
                style={{ height: `${PX_PER_Hour}px` }}
              >
                <span className="text-[10px] text-white/25 tabular-nums">
                  {String(h).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {/* 右：内容区，含网格线 */}
          <div className="flex-1 relative border-l border-white/[0.04]">
            {/* 水平网格线 */}
            {hours.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-white/[0.04]"
                style={{ top: `${(h - DAY_START) * PX_PER_Hour}px` }}
              />
            ))}

            {/* 现在时间指示线 */}
            {(() => {
              const now = new Date();
              const nowMin = now.getHours() * 60 + now.getMinutes();
              if (nowMin >= DAY_START * 60 && nowMin < DAY_END * 60) {
                const topPx = ((nowMin - DAY_START * 60) / 60) * PX_PER_Hour;
                return (
                  <div
                    className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                    style={{ top: `${topPx}px` }}
                  >
                    <div className="w-2 h-2 rounded-full bg-red-400 -ml-px shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                    <div className="flex-1 h-px bg-red-400/40" />
                  </div>
                );
              }
              return null;
            })()}

            {/* 已安排任务块 */}
            {sortedItems.map((item, i) => {
              const startMin = parseTime(item.startTime);
              if (isNaN(startMin)) return null;
              const topPx = ((startMin - DAY_START * 60) / 60) * PX_PER_Hour;
              return (
                <div
                  key={`sched-${i}`}
                  className="absolute left-1 right-1"
                  style={{ top: `${topPx}px` }}
                >
                  <ScheduleBlock
                    title={item.title}
                    startTime={item.startTime}
                    endTime={item.endTime}
                    duration={item.duration}
                    type={item.type}
                    reason={item.reason}
                  />
                </div>
              );
            })}

            {/* 未安排任务块（底部灰显） */}
            {droppedTasks.length > 0 && sortedItems.length > 0 && (
              <div
                className="absolute left-1 right-1 bottom-0"
                style={{ maxHeight: `${PX_PER_Hour * 3}px` }}
              >
                <div className="rounded-xl border border-dashed border-white/10 bg-white/3 p-2 overflow-y-auto max-h-full">
                  <p className="text-[10px] uppercase tracking-widest text-white/20 mb-2 font-semibold">
                    未安排 · {droppedTasks.length} 项
                  </p>
                  <div className="space-y-1">
                    {droppedTasks.map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full border border-orange-500/40 shrink-0" />
                        <span className="text-xs text-white/40 line-through truncate flex-1">{t.task}</span>
                        <span className="text-[9px] text-white/20 shrink-0">{t.reason || "时间不足"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
