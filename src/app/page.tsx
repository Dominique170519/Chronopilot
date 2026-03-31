"use client";
import { useState } from "react";
import GoalInput from "@/components/GoalInput";
import TaskInput from "@/components/TaskInput";
import SettingsPanel from "@/components/SettingsPanel";
import UnavailableSettings from "@/components/UnavailableSettings";
import ScheduleResult from "@/components/ScheduleResult";
import type {
  Task,
  EnergyLevel,
  ScheduleMode,
  ScheduleResult as ScheduleResultType,
} from "@/types";

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
  const [result, setResult] = useState<ScheduleResultType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const generateSchedule = async (overrideChanges?: string) => {
    if (tasks.length === 0) {
      setError("请至少添加一个任务");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks,
          energy,
          goal,
          mode,
          sleepBlock,
          breakfast,
          lunchBreak,
          dinner,
          unavailableBlocks,
          currentTime: getCurrentTime(),
          changes: overrideChanges,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "生成失败");
        return;
      }

      setResult(data);
    } catch {
      setError("网络请求失败，请检查连接");
    } finally {
      setLoading(false);
    }
  };

  const handleRerange = (overrideChanges: string) => {
    generateSchedule(overrideChanges);
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
            {/* AI badge */}
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
              <GoalInput value={goal} onChange={setGoal} />
            </div>

            {/* 2. Tasks */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur-xl">
              <TaskInput tasks={tasks} onChange={setTasks} />
            </div>

            {/* 3. Energy + 4. Mode */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur-xl">
              <SettingsPanel
                energy={energy}
                mode={mode}
                onEnergyChange={setEnergy}
                onModeChange={setMode}
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
                onSleepChange={setSleepBlock}
                onBreakfastChange={setBreakfast}
                onLunchChange={setLunchBreak}
                onDinnerChange={setDinner}
                onUnavailableChange={setUnavailableBlocks}
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
          <section className="min-w-0">
            {/* Section header */}
            <div className="mb-5">
              <h2 className="text-lg font-bold text-white">AI 为你设计的一天</h2>
              <p className="text-sm text-white/35 mt-0.5">
                不是把任务塞满，而是先做判断，再做安排。
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
            />
          </section>
        </div>
      </main>
    </div>
  );
}
