"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import GoalInput from "@/components/GoalInput";
import TaskInput from "@/components/TaskInput";
import SettingsPanel from "@/components/SettingsPanel";
import UnavailableSettings from "@/components/UnavailableSettings";
import ScheduleResult from "@/components/ScheduleResult";
import WeeklyCalendar from "@/components/WeeklyCalendar";
import { Toast } from "@/components/Toast";
import { formatDateStr } from "@/types";
import type {
  Task,
  EnergyLevel,
  ScheduleMode,
  ScheduleResult as ScheduleResultType,
} from "@/types";
import type { NormalizedScheduleItem } from "@/types";

const STATE_KEY = "chronopilot_state";
const SCHEDULES_KEY = "chronopilot_schedules";

interface PersistedState {
  goal: string;
  tasks: Task[];
  energy: EnergyLevel;
  mode: ScheduleMode;
  sleepBlock: boolean;
  breakfast: boolean;
  lunchBreak: boolean;
  dinner: boolean;
  unavailableBlocks: { start: string; end: string; reason?: string }[];
}

function todayStr() {
  return formatDateStr(new Date());
}

export default function Home() {
  const [goal, setGoal] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [energy, setEnergy] = useState<EnergyLevel>("medium");
  const [mode, setMode] = useState<ScheduleMode>("efficient");
  const [sleepBlock, setSleepBlock] = useState(true);
  const [breakfast, setBreakfast] = useState(true);
  const [lunchBreak, setLunchBreak] = useState(true);
  const [dinner, setDinner] = useState(true);
  const [unavailableBlocks, setUnavailableBlocks] = useState<
    { start: string; end: string; reason?: string }[]
  >([]);

  // Multi-day state
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [weekOffset, setWeekOffset] = useState(0);
  const [schedules, setSchedules] = useState<Record<string, ScheduleResultType>>({});

  // UI state
  const [result, setResult] = useState<ScheduleResultType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // 键盘快捷键
  const generateRef = useRef<() => void>(() => {});
  generateRef.current = () => generateSchedule();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key === "Enter" && !loading) { e.preventDefault(); generateRef.current(); }
      if (e.key === "Escape") { setResult(null); setError(null); setToast(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [loading]);

  // Load persisted state
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STATE_KEY);
      if (stored) {
        const parsed: PersistedState = JSON.parse(stored);
        setGoal(parsed.goal ?? "");
        setTasks(parsed.tasks ?? []);
        setEnergy(parsed.energy ?? "medium");
        setMode(parsed.mode ?? "efficient");
        setSleepBlock(parsed.sleepBlock ?? true);
        setBreakfast(parsed.breakfast ?? true);
        setLunchBreak(parsed.lunchBreak ?? true);
        setDinner(parsed.dinner ?? true);
        setUnavailableBlocks(parsed.unavailableBlocks ?? []);
      }
    } catch { /* ignore */ }

    try {
      const storedSchedules = localStorage.getItem(SCHEDULES_KEY);
      if (storedSchedules) {
        const parsed: Record<string, ScheduleResultType> = JSON.parse(storedSchedules);
        setSchedules(parsed);
        // Load today's schedule into result if exists
        const today = todayStr();
        if (parsed[today]) setResult(parsed[today]);
      }
    } catch { /* ignore */ }
  }, []);

  // Persist form state
  const persistState = useCallback(
    (overrides?: Partial<PersistedState>) => {
      const state: PersistedState = {
        goal, tasks, energy, mode, sleepBlock, breakfast, lunchBreak, dinner, unavailableBlocks,
        ...overrides,
      };
      try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
    },
    [goal, tasks, energy, mode, sleepBlock, breakfast, lunchBreak, dinner, unavailableBlocks]
  );

  // Persist schedules
  const persistSchedules = useCallback((next: Record<string, ScheduleResultType>) => {
    try { localStorage.setItem(SCHEDULES_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  // Wrapper setters
  const setGoalAndPersist   = (v: string) => { setGoal(v); setTimeout(() => persistState({ goal: v }), 0); };
  const setTasksAndPersist  = (v: Task[]) => { setTasks(v); setTimeout(() => persistState({ tasks: v }), 0); };
  const setEnergyAndPersist = (v: EnergyLevel) => { setEnergy(v); setTimeout(() => persistState({ energy: v }), 0); };
  const setModeAndPersist   = (v: ScheduleMode) => { setMode(v); setTimeout(() => persistState({ mode: v }), 0); };
  const setSleepBlockAndPersist    = (v: boolean) => { setSleepBlock(v); setTimeout(() => persistState({ sleepBlock: v }), 0); };
  const setBreakfastAndPersist     = (v: boolean) => { setBreakfast(v); setTimeout(() => persistState({ breakfast: v }), 0); };
  const setLunchBreakAndPersist    = (v: boolean) => { setLunchBreak(v); setTimeout(() => persistState({ lunchBreak: v }), 0); };
  const setDinnerAndPersist        = (v: boolean) => { setDinner(v); setTimeout(() => persistState({ dinner: v }), 0); };
  const setUnavailableBlocksAndPersist = (v: { start: string; end: string; reason?: string }[]) => {
    setUnavailableBlocks(v);
    setTimeout(() => persistState({ unavailableBlocks: v }), 0);
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleString("zh-CN", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  };

  const generateSchedule = async (targetDate?: string) => {
    const date = targetDate || selectedDate;

    if (tasks.length === 0) {
      setError("请至少添加一个任务");
      return;
    }
    const emptyTask = tasks.find((t) => !t.text.trim());
    if (emptyTask) { setError("任务描述不能为空"); return; }
    const zeroDuration = tasks.find((t) => t.duration <= 0);
    if (zeroDuration) { setError("任务时长必须大于 0 分钟"); return; }
    const invalidBlock = unavailableBlocks.find((b) => {
      const [sh, sm] = b.start.split(":").map(Number);
      const [eh, em] = b.end.split(":").map(Number);
      return sh * 60 + sm >= eh * 60 + em;
    });
    if (invalidBlock) {
      setError(`不可用时段 "${invalidBlock.reason || invalidBlock.start}" 的结束时间必须晚于开始时间`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks, energy, goal, mode,
          sleepBlock, breakfast, lunchBreak, dinner,
          unavailableBlocks,
          currentTime: `${date} ${getCurrentTime().split(" ")[1]}`,
          changes: undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError((data as { error?: string }).error || "生成失败");
        setToast({ message: "生成失败", type: "error" });
        return;
      }

      const scheduleData = data as ScheduleResultType;

      // Save to schedules map
      const next = { ...schedules, [date]: scheduleData };
      setSchedules(next);
      persistSchedules(next);
      setResult(scheduleData);
      setSelectedDate(date);
      setToast({ message: `${date} 日程已生成`, type: "success" });
    } catch {
      setError("网络请求失败，请检查连接");
      setToast({ message: "网络请求失败", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleRerange = async (overrideChanges: string) => {
    const date = selectedDate;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks, energy, goal, mode,
          sleepBlock, breakfast, lunchBreak, dinner,
          unavailableBlocks,
          currentTime: `${date} ${getCurrentTime().split(" ")[1]}`,
          changes: overrideChanges,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError((data as { error?: string }).error || "重新生成失败");
        return;
      }

      const scheduleData = data as ScheduleResultType;
      const next = { ...schedules, [date]: scheduleData };
      setSchedules(next);
      persistSchedules(next);
      setResult(scheduleData);
      setToast({ message: "日程已重新生成", type: "success" });
    } catch {
      setError("网络请求失败，请检查连接");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setError(null);
    setResult(schedules[date] ?? null);
  };

  return (
    <div className="min-h-screen bg-aurora text-white relative">
      {/* Dot grid */}
      <div className="pointer-events-none absolute inset-0 bg-dot bg-[length:22px_22px] opacity-100" />

      {/* Header */}
      <header className="relative z-10 px-6 py-5 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
                让 AI 安排你的明天
              </h1>
              <p className="text-sm text-white/40 mt-0.5 leading-relaxed">
                输入任务、状态和目标，AI 会帮你做取舍、排优先级，并生成更合理的一天。
              </p>
            </div>
            <div className="flex-1" />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-300 mb-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              AI 时间助理
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-6 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)] gap-6 pt-6">

          {/* ── Left: Tell AI ── */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:overflow-auto lg:pr-2 pb-6">

            {/* 1. Goal */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur-xl">
              <GoalInput value={goal} onChange={setGoalAndPersist} />
            </div>

            {/* 2. Tasks */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur-xl">
              <TaskInput tasks={tasks} onChange={setTasksAndPersist} />
            </div>

            {/* 3. Energy + 4. Mode */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur-xl">
              <SettingsPanel
                energy={energy}
                mode={mode}
                onEnergyChange={setEnergyAndPersist}
                onModeChange={setModeAndPersist}
              />
            </div>

            {/* 5. Unavailable times */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur-xl">
              <UnavailableSettings
                sleepBlock={sleepBlock}
                breakfast={breakfast}
                lunchBreak={lunchBreak}
                dinner={dinner}
                unavailableBlocks={unavailableBlocks}
                onSleepChange={setSleepBlockAndPersist}
                onBreakfastChange={setBreakfastAndPersist}
                onLunchChange={setLunchBreakAndPersist}
                onDinnerChange={setDinnerAndPersist}
                onUnavailableChange={setUnavailableBlocksAndPersist}
              />
            </div>

            {/* 6. CTA */}
            <button
              onClick={() => generateSchedule()}
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 text-white py-4 text-sm font-bold hover:bg-blue-500 transition shadow-btn-glow disabled:opacity-40 disabled:cursor-not-allowed tracking-wide"
            >
              {loading ? "规划中..." : "让 AI 安排我的一天"}
            </button>

            {error && !loading && (
              <div className="rounded-xl border border-red-800/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
          </aside>

          {/* ── Right: AI Result ── */}
          <section className="min-w-0 space-y-4">

            {/* 周日历视图 */}
            <WeeklyCalendar
              weekOffset={weekOffset}
              selectedDate={selectedDate}
              schedules={schedules}
              onSelectDate={handleSelectDate}
              onPrevWeek={() => setWeekOffset((w) => w - 1)}
              onNextWeek={() => setWeekOffset((w) => w + 1)}
              onGenerate={generateSchedule}
              mode={mode}
              energy={energy}
            />

            {/* 当日详情 */}
            <div>
              <div className="mb-3">
                <h2 className="text-lg font-bold text-white">
                  {selectedDate === todayStr() ? "今日安排" : `${selectedDate} 的安排`}
                </h2>
                <p className="text-sm text-white/30 mt-0.5">
                  先做判断，再做安排。
                </p>
              </div>

              <ScheduleResult
                result={result}
                loading={loading}
                error={error}
                mode={mode}
                energy={energy}
                onRerange={handleRerange}
                onRerangeLoading={loading}
                schedules={schedules}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                userTasks={tasks}
              />
            </div>
          </section>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
