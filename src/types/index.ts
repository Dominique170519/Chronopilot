export interface Task {
  id: string;
  text: string;
  duration: number; // minutes
  required?: boolean; // 必须 / 可选
  deadline?: string;
}

export interface UnavailableBlock {
  start: string; // HH:MM
  end: string; // HH:MM
  reason?: string;
}

export interface ScheduleItem {
  time: string;
  endTime: string;
  task: string;
  duration: number;
  type: "focus" | "light" | "recovery" | "flex" | "buffer";
  reason: string;
  notes?: string;
}

export interface ScheduleResult {
  summary: string;
  schedule: ScheduleItem[];
  droppedTasks: { task: string; reason: string }[];
  decisions: string[];
}

/** 时间轴渲染用的标准化任务项 */
export interface NormalizedScheduleItem {
  title: string;
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  duration: number;   // 分钟
  type: ScheduleItem["type"];
  reason: string;
  notes?: string;
}

/**
 * 标准化任意格式的 API 返回數組
 * 兼容字段名：title/task/name, startTime/start/start_time,
 *            endTime/end/end_time, duration/minutes
 * 同時自動推導缺失的 endTime 或 duration
 */
export function normalizeScheduleItems(raw: unknown): NormalizedScheduleItem[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((item: any, i: number): NormalizedScheduleItem => {
    // 标题
    const title: string =
      item.title ?? item.task ?? item.name ?? item.subject ?? `[任务 ${i + 1}]`;

    // 开始时间
    const startTimeRaw =
      item.startTime ?? item.start ?? item.start_time ?? item.time;
    const startTime = parseHHMM(String(startTimeRaw ?? ""));

    // 时长
    const durationRaw: number =
      typeof item.duration === "number"
        ? item.duration
        : parseInt(String(item.duration ?? "0"), 10);

    // 结束时间（優先取 endTime，否則用 startTime + duration 推算）
    const endTimeRaw =
      item.endTime ?? item.end ?? item.end_time ?? item.finish;
    const endTimeFromField = parseHHMM(String(endTimeRaw ?? ""));
    const endTimeFromDuration =
      startTime ? addMinutes(startTime, durationRaw) : "";

    const endTime: string =
      endTimeFromField || endTimeFromDuration || "";

    // 如果有 startTime + endTime，倒推 duration
    const duration =
      durationRaw > 0
        ? durationRaw
        : startTime && endTime
        ? diffMinutes(endTime, startTime)
        : 30;

    const type: NormalizedScheduleItem["type"] =
      item.type === "focus" ||
      item.type === "light" ||
      item.type === "recovery" ||
      item.type === "flex" ||
      item.type === "buffer"
        ? item.type
        : "light";

    return {
      title,
      startTime,
      endTime,
      duration,
      type,
      reason: item.reason ?? item.note ?? item.notes ?? "",
      notes: item.notes ?? item.note,
    };
  });
}

/** 將 "HH:MM" / "H:MM" / "HHmm" 規範化為 "HH:MM"，無效則返回空字符串 */
function parseHHMM(raw: string): string {
  if (!raw) return "";
  const cleaned = raw.trim().replace(/[^\d:]/g, "");
  const parts = cleaned.split(":");
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m)) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }
  // 嘗試 "HHMM" 格式
  if (/^\d{3,4}$/.test(cleaned)) {
    const h = parseInt(cleaned.slice(0, -2), 10);
    const m = parseInt(cleaned.slice(-2), 10);
    if (!isNaN(h) && !isNaN(m)) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }
  return "";
}

/** 從 "HH:MM" 加 N 分鐘，返回新的 "HH:MM" */
function addMinutes(time: string, minutes: number): string {
  const parts = time.split(":").map(Number);
  if (parts.length < 2 || parts.some(isNaN)) return time;
  const total = parts[0] * 60 + parts[1] + minutes;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 從 "HH:MM" 減 "HH:MM"，返回分鐘數（可能為負） */
function diffMinutes(end: string, start: string): number {
  const ep = end.split(":").map(Number);
  const sp = start.split(":").map(Number);
  if (ep.length < 2 || sp.length < 2) return 0;
  return ep[0] * 60 + ep[1] - (sp[0] * 60 + sp[1]);
}

export type EnergyLevel = "high" | "medium" | "low";
export type ScheduleMode = "efficient" | "balanced" | "easy";

// ── 周视图工具 ────────────────────────────────────────────────────────────────

export type WeekDay = {
  date: string;        // "YYYY-MM-DD"
  dayLabel: string;     // "周一" / "周二" ...
  dayNum: string;       // "1" / "2" ...
  monthLabel: string;   // "4月" / "12月" ...
  isToday: boolean;
  isSelected: boolean;
  hasSchedule: boolean;
};

/** 获取以给定日期为基准的一周的 7 天信息 */
export function getWeekDays(baseDate: Date, selectedDate: string): WeekDay[] {
  const today = new Date();
  const todayStr = formatDateStr(today);
  const sel = selectedDate || todayStr;

  const dow = baseDate.getDay(); // 0=Sun
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - ((dow + 6) % 7)); // Mon

  const dayNames = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const str = formatDateStr(d);
    return {
      date: str,
      dayLabel: dayNames[i],
      dayNum: String(d.getDate()),
      monthLabel: `${d.getMonth() + 1}月`,
      isToday: str === todayStr,
      isSelected: str === sel,
      hasSchedule: false, // filled by caller
    };
  });
}

/** Date → "YYYY-MM-DD" */
export function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "YYYY-MM-DD" → Date */
export function parseDateStr(str: string): Date {
  const [y, m, day] = str.split("-").map(Number);
  return new Date(y, m - 1, day);
}

export interface ScheduleRequest {
  tasks: Task[];
  energy: EnergyLevel;
  goal: string;
  mode: ScheduleMode;
  sleepBlock: boolean;        // 睡觉时间（23:00-08:00）
  breakfast: boolean;        // 早餐（07:00-08:00）
  lunchBreak: boolean;        // 午餐（12:00-13:00）
  dinner: boolean;            // 晚餐（18:00-19:00）
  unavailableBlocks: UnavailableBlock[];
  currentTime: string;
  changes?: string;
}
