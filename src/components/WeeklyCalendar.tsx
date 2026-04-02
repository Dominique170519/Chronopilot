"use client";
import { useMemo } from "react";
import { getWeekDays, formatDateStr, type WeekDay } from "@/types";
import { normalizeScheduleItems } from "@/types";
import type { ScheduleResult, ScheduleMode, EnergyLevel } from "@/types";

interface Props {
  weekOffset: number;
  selectedDate: string;
  schedules: Record<string, ScheduleResult>;
  onSelectDate: (date: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onGenerate: (date: string) => void;
  mode: ScheduleMode;
  energy: EnergyLevel;
}

const typeColors: Record<string, string> = {
  focus: "bg-blue-500",
  light: "bg-white/40",
  recovery: "bg-green-500",
  flex: "bg-orange-400",
  buffer: "bg-white/25",
};

export default function WeeklyCalendar({
  weekOffset,
  selectedDate,
  schedules,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  onGenerate,
  mode,
  energy,
}: Props) {
  // Compute the Monday of the target week
  const baseDate = useMemo(() => {
    const today = new Date();
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dow + 6) % 7));
    monday.setDate(monday.getDate() + weekOffset * 7);
    return monday;
  }, [weekOffset]);

  const days: WeekDay[] = useMemo(() => {
    return getWeekDays(baseDate, selectedDate).map((d) => ({
      ...d,
      hasSchedule: !!schedules[d.date],
    }));
  }, [baseDate, selectedDate, schedules]);

  const weekLabel = useMemo(() => {
    const first = days[0];
    const last = days[6];
    if (first.monthLabel === last.monthLabel) {
      return `${first.monthLabel}`;
    }
    return `${first.monthLabel} — ${last.monthLabel}`;
  }, [days]);

  const isCurrentWeek = weekOffset === 0;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-panel backdrop-blur-xl">
      {/* ── 导航栏 ── */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevWeek}
          className="w-8 h-8 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 transition"
          aria-label="上一周"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.5 3L5 7l3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="text-sm font-semibold text-white/80">
          {isCurrentWeek ? "本周" : weekLabel}
        </div>

        <button
          onClick={onNextWeek}
          className="w-8 h-8 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 transition"
          aria-label="下一周"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5.5 3L9 7l-3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ── 7 天格子 ── */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const schedule = schedules[day.date];
          const items = schedule
            ? normalizeScheduleItems(schedule.schedule ?? [])
            : [];

          return (
            <button
              key={day.date}
              onClick={() => onSelectDate(day.date)}
              className={`
                relative flex flex-col items-center rounded-2xl py-2 px-1 transition-all text-xs
                ${day.isSelected
                  ? "bg-blue-500/25 border border-blue-500/40 text-white"
                  : day.isToday
                    ? "bg-white/8 border border-white/15 text-white"
                    : "border border-transparent text-white/50 hover:bg-white/6 hover:text-white/70"
                }
              `}
            >
              {/* 星期 */}
              <span className={`text-[10px] mb-1 ${day.isSelected ? "text-blue-300" : ""}`}>
                {day.dayLabel}
              </span>

              {/* 日期数字 */}
              <span className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold
                ${day.isToday && !day.isSelected ? "bg-blue-500/30 text-blue-200" : ""}
                ${day.isSelected ? "bg-blue-500 text-white" : ""}
              `}>
                {day.dayNum}
              </span>

              {/* 有日程的彩色块 */}
              {items.length > 0 && (
                <div className="mt-1.5 w-full space-y-0.5 px-1">
                  {items.slice(0, 5).map((item, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full ${typeColors[item.type] ?? "bg-white/25"}`}
                    />
                  ))}
                  {items.length > 5 && (
                    <div className="text-[8px] text-white/25 leading-none text-center">
                      +{items.length - 5}
                    </div>
                  )}
                </div>
              )}

              {/* 无日程提示 */}
              {!schedule && (
                <div className="mt-1.5 w-full flex justify-center">
                  <span className="text-[8px] text-white/20">—</span>
                </div>
              )}

              {/* 选中指示 */}
              {day.isSelected && (
                <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── 选中日快速生成 ── */}
      {schedules[selectedDate] ? (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-white/30">
            {selectedDate} · {normalizeScheduleItems(schedules[selectedDate].schedule ?? []).length} 个安排
          </span>
          <button
            onClick={() => onGenerate(selectedDate)}
            className="text-xs text-blue-400/70 hover:text-blue-300 transition"
          >
            重新生成
          </button>
        </div>
      ) : (
        <button
          onClick={() => onGenerate(selectedDate)}
          className="mt-3 w-full rounded-xl border border-dashed border-white/15 bg-white/3 py-2 text-xs text-white/40 hover:border-blue-500/30 hover:text-blue-300/70 hover:bg-blue-500/8 transition"
        >
          为 {selectedDate} 生成日程
        </button>
      )}
    </div>
  );
}
