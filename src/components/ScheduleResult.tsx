"use client";
import type { ScheduleResult, ScheduleMode, EnergyLevel } from "@/types";
import { normalizeScheduleItems } from "@/types";
import type { Task } from "@/types";
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
  /** 用户原始输入的任务列表，用于匹配时间轴上的色块 */
  userTasks?: Task[];
}

// ── 工具函数 ─────────────────────────────────────────────────────────────────

function parseTime(time: string | undefined): number {
  if (!time) return NaN;
  const parts = time.split(":").map(Number);
  if (parts.length < 2 || parts.some(isNaN)) return NaN;
  return parts[0] * 60 + parts[1];
}

/** 把任务名规范化为比较用的小写字符串（去空格、符号） */
function norm(s: string) {
  return s.replace(/\s+/g, "").replace(/[^\w\u4e00-\u9fff]/g, "").toLowerCase();
}

/**
 * 将 AI 返回的 schedule 项与用户原始任务匹配
 * 只返回能匹配到用户任务的项目（排除 AI 自动插入的休息/缓冲等）
 */
function matchUserTasks(
  items: ReturnType<typeof normalizeScheduleItems>,
  userTasks: Task[]
): ReturnType<typeof normalizeScheduleItems> {
  if (!userTasks || userTasks.length === 0) return items;
  return items.filter((item) => {
    const itemNorm = norm(item.title);
    return userTasks.some((t) => {
      const tNorm = norm(t.text);
      // 完全包含匹配：AI 任务名包含用户任务名，或反之
      return itemNorm.includes(tNorm) || tNorm.includes(itemNorm);
    });
  });
}

// ── 类型配置 ─────────────────────────────────────────────────────────────────
const typeConfig: Record<string, { bg: string; border: string; label: string; text: string; dot: string }> = {
  focus:    { bg: "bg-blue-500/20",   border: "border-l-blue-400",    label: "深度工作", text: "text-blue-200",  dot: "bg-blue-400" },
  light:    { bg: "bg-white/8",       border: "border-l-white/50",    label: "轻任务",   text: "text-white/75",  dot: "bg-white/50" },
  recovery: { bg: "bg-green-500/15",  border: "border-l-green-400",   label: "恢复",     text: "text-green-200", dot: "bg-green-400" },
  flex:     { bg: "bg-orange-500/15", border: "border-l-orange-400",  label: "弹性时间", text: "text-orange-200",dot: "bg-orange-400" },
  buffer:   { bg: "bg-white/4",       border: "border-l-white/25",    label: "过渡",     text: "text-white/45",  dot: "bg-white/25" },
};

const modeLabel: Record<ScheduleMode, string> = {
  efficient: "高效模式", balanced: "平衡模式", easy: "轻松模式",
};
const energyLabel: Record<EnergyLevel, string> = {
  high: "精力充沛", medium: "精力一般", low: "精力疲惫",
};

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
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 items-center">
              <div className="h-8 w-12 rounded-lg bg-white/5 shrink-0" />
              <div className="flex-1 h-8 rounded-lg bg-white/5" />
            </div>
          ))}
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

// ── 主组件 ────────────────────────────────────────────────────────────────────
export default function ScheduleResult({
  result, loading, error, mode, energy,
  onRerange, onRerangeLoading,
  userTasks = [],
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

  // ── 数据 ────────────────────────────────────────────────────────────────────
  const rawSchedule = Array.isArray(result)
    ? result
    : result.schedule ?? (result as any).items ?? (result as any).data ?? [];

  const allItems = normalizeScheduleItems(rawSchedule);

  // 只保留匹配到用户任务的项目（过滤掉 AI 自动插入的休息/缓冲等）
  const userItems = matchUserTasks(allItems, userTasks);

  // 按开始时间排序
  const sortedItems = [...userItems].sort((a, b) => {
    const aT = parseTime(a.startTime);
    const bT = parseTime(b.startTime);
    if (isNaN(aT)) return 1;
    if (isNaN(bT)) return -1;
    return aT - bT;
  });

  // 未安排的任务
  const droppedTasks: { task: string; reason?: string }[] = Array.isArray(result)
    ? []
    : (result.droppedTasks ?? []);

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

      {/* ── 时间轴：柱状列表 ── */}
      <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden shadow-panel backdrop-blur-xl">
        <div className="px-5 pt-4 pb-3">
          <h3 className="text-xs uppercase tracking-widest text-white/30 font-semibold mb-0.5">明日安排</h3>
          <p className="text-xs text-white/20">
            共 {sortedItems.length} 项 · 从早到晚排列
          </p>
        </div>

        <div className="px-5 pb-4 space-y-2">
          {sortedItems.length === 0 && (
            <p className="text-sm text-white/30 text-center py-6">暂无已安排的任务</p>
          )}
          {sortedItems.map((item, i) => {
            const cfg = typeConfig[item.type] || typeConfig.buffer;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-2xl border-l-4 ${cfg.bg} ${cfg.border} px-4 py-3`}
              >
                {/* 时间 */}
                <div className="shrink-0 text-center w-14">
                  <div className="text-sm font-mono font-semibold text-white/70 tabular-nums leading-none">
                    {item.startTime}
                  </div>
                  <div className="text-[10px] text-white/30 mt-0.5">至 {item.endTime}</div>
                </div>

                {/* 分隔线 */}
                <div className="w-px h-8 bg-white/10 shrink-0" />

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 任务名 — 完全显示，不截断 */}
                    <span className={`text-sm font-medium ${cfg.text}`}>{item.title}</span>
                    {/* 类型标签 */}
                    <span className={`shrink-0 text-[10px] px-1.5 py-px rounded-full border ${cfg.bg} ${cfg.text} border-white/10`}>
                      {cfg.label}
                    </span>
                    {/* 时长 */}
                    <span className="shrink-0 text-[10px] text-white/30">
                      {item.duration >= 60
                        ? `${Math.floor(item.duration / 60)}h${item.duration % 60 ? item.duration % 60 + "m" : ""}`
                        : `${item.duration}m`}
                    </span>
                  </div>
                  {/* 原因说明 */}
                  {item.reason && (
                    <p className={`text-xs mt-1 leading-relaxed ${cfg.text} opacity-60`}>
                      {item.reason}
                    </p>
                  )}
                </div>

                {/* 右侧色点 */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 未安排的任务 ── */}
      {droppedTasks.length > 0 && (
        <div className="rounded-3xl border border-orange-800/40 bg-orange-500/8 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-orange-300">今天先不安排的事</span>
            <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-px text-[10px] text-orange-400">
              {droppedTasks.length} 项
            </span>
          </div>
          <p className="text-xs text-orange-400/50 mb-4 leading-relaxed">
            这些任务并不是不重要，而是今天优先级不够高，或时间不够合理。
          </p>
          <div className="space-y-2">
            {droppedTasks.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full border border-orange-500/40 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-orange-200/70 line-through">{t.task}</span>
                  {t.reason && (
                    <span className="text-xs text-orange-400/50 ml-2">{t.reason}</span>
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
