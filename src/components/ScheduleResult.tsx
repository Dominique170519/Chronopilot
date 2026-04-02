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
  userTasks?: Task[];
}

// ── 工具函数 ─────────────────────────────────────────────────────────────────
function parseTime(time: string | undefined): number {
  if (!time) return NaN;
  const parts = time.split(":").map(Number);
  if (parts.length < 2 || parts.some(isNaN)) return NaN;
  return parts[0] * 60 + parts[1];
}

function norm(s: string) {
  return s.replace(/\s+/g, "").replace(/[^\w\u4e00-\u9fff]/g, "").toLowerCase();
}

function isUserTask(item: ReturnType<typeof normalizeScheduleItems>[0], userTasks: Task[]) {
  if (!userTasks || userTasks.length === 0) return false;
  const itemNorm = norm(item.title);
  return userTasks.some((t) => {
    const tNorm = norm(t.text);
    return itemNorm.includes(tNorm) || tNorm.includes(itemNorm);
  });
}

// ── 统计计算 ────────────────────────────────────────────────────────────────
interface Stats {
  scheduledMin: number;      // 已安排的分钟数（仅用户任务）
  requestedMin: number;      // 用户请求的总分钟数
  coverage: number;         // 覆盖率 0-100
  focusMin: number;         // 深度工作分钟数
  recoveryMin: number;      // 恢复时间分钟数
  score: number;            // 总分 0-100
  verdict: string;          // 简短评价
  verdictColor: string;     // 颜色class
}

function calcStats(
  allItems: ReturnType<typeof normalizeScheduleItems>,
  userTasks: Task[]
): Stats {
  const userItems = allItems.filter((item) => isUserTask(item, userTasks));

  const scheduledMin = userItems.reduce((sum, item) => sum + (item.duration || 0), 0);
  const requestedMin = (userTasks || []).reduce((sum, t) => sum + (t.duration || 0), 0);

  // 覆盖率
  const coverage = requestedMin > 0
    ? Math.min(100, Math.round((scheduledMin / requestedMin) * 100))
    : 0;

  // 各类时长
  const focusMin = allItems
    .filter((i) => i.type === "focus")
    .reduce((s, i) => s + (i.duration || 0), 0);
  const recoveryMin = allItems
    .filter((i) => i.type === "recovery")
    .reduce((s, i) => s + (i.duration || 0), 0);

  // 分数计算
  const coverageScore = Math.round((coverage / 100) * 40);                    // 0-40
  const balanceScore = recoveryMin >= 20 ? 15 : recoveryMin > 0 ? 10 : 0;       // 0-15
  const focusRatio = scheduledMin > 0 ? focusMin / scheduledMin : 0;
  const energyScore =
    focusRatio < 0.5 ? 20 :
    focusRatio < 0.7 ? 15 :
    focusRatio < 0.85 ? 10 : 5;                                               // 0-20
  const completenessBonus = userItems.length >= (userTasks || []).length ? 25 : // 0-25
    userItems.length >= ((userTasks || []).length * 0.7) ? 15 : 0;

  const score = Math.min(100, coverageScore + balanceScore + energyScore + completenessBonus);

  // 简短评价
  let verdict: string;
  let verdictColor: string;
  if (score >= 85) {
    verdict = "充实高效";
    verdictColor = "text-green-400";
  } else if (score >= 70) {
    verdict = "张弛有度";
    verdictColor = "text-blue-400";
  } else if (score >= 50) {
    verdict = "略有空白";
    verdictColor = "text-orange-400";
  } else {
    verdict = "时间紧张";
    verdictColor = "text-red-400";
  }

  return { scheduledMin, requestedMin, coverage, focusMin, recoveryMin, score, verdict, verdictColor };
}

// ── 类型配置 ─────────────────────────────────────────────────────────────────
const typeConfig: Record<string, { bg: string; border: string; label: string; text: string; dot: string; chipBg: string }> = {
  focus:    { bg: "bg-blue-500/20",   border: "border-l-blue-400",    label: "深度工作", text: "text-blue-200",  dot: "bg-blue-400",   chipBg: "bg-blue-500/25" },
  light:    { bg: "bg-white/8",       border: "border-l-white/50",    label: "轻任务",   text: "text-white/75",  dot: "bg-white/50",   chipBg: "bg-white/10" },
  recovery: { bg: "bg-green-500/15",  border: "border-l-green-400",   label: "恢复",     text: "text-green-200", dot: "bg-green-400",  chipBg: "bg-green-500/20" },
  flex:     { bg: "bg-orange-500/15", border: "border-l-orange-400",  label: "弹性时间", text: "text-orange-200",dot: "bg-orange-400", chipBg: "bg-orange-500/20" },
  buffer:   { bg: "bg-white/4",       border: "border-l-white/25",    label: "过渡",     text: "text-white/45",  dot: "bg-white/25",   chipBg: "bg-white/6" },
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
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="h-4 w-2/3 rounded bg-white/8 mb-2" />
        <div className="h-3 w-1/2 rounded bg-white/5" />
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden p-5">
        <div className="space-y-3">
          {[{ w: "w-3/4" }, { w: "w-1/2" }, { w: "w-5/6" }, { w: "w-2/3" }].map((b, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 w-12 rounded bg-white/5 shrink-0" />
              <div className={`h-4 ${b.w} rounded bg-white/5`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 空状态 ────────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6 space-y-5">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border border-white/10 bg-white/5" />
        <div className="absolute inset-3 rounded-full border border-dashed border-white/15" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl opacity-40">◷</div>
      </div>
      <div>
        <h3 className="text-base font-semibold text-white/60">还没有日程安排</h3>
        <p className="text-sm text-white/30 mt-1">在左侧添加任务，让 AI 为你规划一天</p>
      </div>
    </div>
  );
}

// ── 单条任务行 ────────────────────────────────────────────────────────────────
function ScheduleRow({
  item, isUser,
}: {
  item: ReturnType<typeof normalizeScheduleItems>[0];
  isUser: boolean;
}) {
  const cfg = typeConfig[item.type] || typeConfig.buffer;
  return (
    <div className="flex gap-3">
      {/* 时间 */}
      <div className="w-12 shrink-0 pt-2">
        <div className="text-xs font-mono font-medium text-white/50 tabular-nums leading-none">{item.startTime}</div>
        <div className="text-[10px] text-white/25 mt-0.5 leading-none">至 {item.endTime}</div>
      </div>
      {/* 圆点 + 纵线 */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-2 h-2 rounded-full mt-2 ${cfg.dot} ring-1 ring-white/10`} />
        <div className="flex-1 w-px bg-white/[0.06]" />
      </div>
      {/* 内容卡片 */}
      <div className={`flex-1 min-w-0 mb-3 rounded-2xl border-l-4 ${cfg.bg} ${cfg.border} px-3 py-2.5`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium leading-snug ${isUser ? cfg.text : "text-white/55"}`}>{item.title}</span>
          <span className={`shrink-0 text-[10px] px-1.5 py-px rounded-full ${cfg.chipBg} ${cfg.text} border border-white/10`}>{cfg.label}</span>
          <span className="shrink-0 text-[10px] text-white/30">
            {item.duration >= 60 ? `${Math.floor(item.duration / 60)}h${item.duration % 60 ? item.duration % 60 + "m" : ""}` : `${item.duration}m`}
          </span>
        </div>
        {item.reason && (
          <p className={`text-xs mt-1.5 leading-relaxed ${isUser ? cfg.text : "text-white/35"}`} style={{ opacity: isUser ? 0.7 : 1 }}>
            {item.reason}
          </p>
        )}
      </div>
    </div>
  );
}

// ── 统计卡 ─────────────────────────────────────────────────────────────────────
function StatsCard({ stats }: { stats: Stats }) {
  const fmtMin = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}h${min > 0 ? min + "m" : ""}` : `${min}m`;
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      {/* 顶部：总分 + 评价 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* 圆形分数 */}
          <div className="relative w-14 h-14 shrink-0">
            <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
              <circle cx="24" cy="24" r="20" fill="none" stroke="white" strokeWidth="3" strokeOpacity="0.08" />
              <circle
                cx="24" cy="24" r="20" fill="none"
                stroke={stats.score >= 70 ? "#34d399" : stats.score >= 50 ? "#60a5fa" : "#fb923c"}
                strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - stats.score / 100)}`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-white/80">{stats.score}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-white/30 mb-0.5">今日安排</div>
            <div className={`text-base font-bold ${stats.verdictColor}`}>{stats.verdict}</div>
          </div>
        </div>

        {/* 覆盖率 */}
        <div className="text-right">
          <div className="text-xs text-white/30">覆盖率</div>
          <div className="text-lg font-bold text-white/70">{stats.coverage}%</div>
        </div>
      </div>

      {/* 明细指标 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white/5 px-3 py-2.5 text-center">
          <div className="text-xs text-white/30 mb-1">已安排</div>
          <div className="text-sm font-semibold text-white/80">{fmtMin(stats.scheduledMin)}</div>
        </div>
        <div className="rounded-xl bg-white/5 px-3 py-2.5 text-center">
          <div className="text-xs text-white/30 mb-1">深度工作</div>
          <div className="text-sm font-semibold text-blue-300">{fmtMin(stats.focusMin)}</div>
        </div>
        <div className="rounded-xl bg-white/5 px-3 py-2.5 text-center">
          <div className="text-xs text-white/30 mb-1">休息恢复</div>
          <div className="text-sm font-semibold text-green-300">{fmtMin(stats.recoveryMin)}</div>
        </div>
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

  const rawSchedule = Array.isArray(result)
    ? result
    : result.schedule ?? (result as any).items ?? (result as any).data ?? [];

  const allItems = normalizeScheduleItems(rawSchedule);

  const sortedItems = [...allItems].sort((a, b) => {
    const aT = parseTime(a.startTime);
    const bT = parseTime(b.startTime);
    if (isNaN(aT)) return 1;
    if (isNaN(bT)) return -1;
    return aT - bT;
  });

  const droppedTasks: { task: string; reason?: string }[] = Array.isArray(result)
    ? []
    : (result.droppedTasks ?? []);

  const stats = calcStats(allItems, userTasks);

  return (
    <div className="space-y-4">
      {/* ── 简化策略卡 ── */}
      {result.summary && (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
          <p className="text-sm font-semibold text-white/80 leading-snug">{result.summary}</p>
        </div>
      )}

      {/* ── 时间轴 ── */}
      <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden shadow-panel backdrop-blur-xl">
        <div className="px-5 pt-4 pb-3">
          <h3 className="text-xs uppercase tracking-widest text-white/30 font-semibold mb-0.5">明日安排</h3>
          <p className="text-xs text-white/20">从早到晚 · {sortedItems.length} 个时段</p>
        </div>
        <div className="px-5 pb-4 max-h-[520px] overflow-y-auto">
          {sortedItems.length === 0 && (
            <p className="text-sm text-white/30 text-center py-8">暂无安排</p>
          )}
          {sortedItems.map((item, i) => (
            <ScheduleRow key={i} item={item} isUser={isUserTask(item, userTasks)} />
          ))}
        </div>
      </div>

      {/* ── 未安排的任务 ── */}
      {droppedTasks.length > 0 && (
        <div className="rounded-2xl border border-orange-800/40 bg-orange-500/8 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-orange-300">未安排</span>
            <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-px text-[10px] text-orange-400">{droppedTasks.length} 项</span>
          </div>
          <div className="space-y-1.5">
            {droppedTasks.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-orange-500/40 shrink-0 mt-0.5" />
                <span className="text-xs text-orange-200/60 line-through flex-1">{t.task}</span>
                {t.reason && <span className="text-[10px] text-orange-400/40 shrink-0">{t.reason}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 统计与评价 ── */}
      <StatsCard stats={stats} />

      {/* ── 重新安排 ── */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <div className="mb-2">
          <h3 className="text-sm font-semibold text-white/70">计划有变化？</h3>
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
