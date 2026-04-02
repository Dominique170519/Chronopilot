"use client";
import { useState } from "react";
import type { Task } from "@/types";

interface Props {
  tasks: Task[];
  onChange: (tasks: Task[]) => void;
}

function DurationPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  const setH = (raw: string) => {
    const n = Math.max(0, Math.min(12, parseInt(raw || "0", 10)));
    onChange(n * 60 + minutes);
  };

  const setM = (raw: string) => {
    const n = Math.max(0, Math.min(59, parseInt(raw || "0", 10)));
    onChange(hours * 60 + n);
  };

  return (
    <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 gap-1">
      <input
        type="number"
        min={0}
        max={12}
        value={pad(hours)}
        onChange={(e) => setH(e.target.value)}
        title="小时"
        className="w-8 bg-transparent text-sm text-center text-white focus:outline-none [appearance:textfield]"
      />
      <span className="text-white/30 text-xs shrink-0">h</span>
      <input
        type="number"
        min={0}
        max={59}
        value={pad(minutes)}
        onChange={(e) => setM(e.target.value)}
        title="分钟"
        className="w-8 bg-transparent text-sm text-center text-white focus:outline-none [appearance:textfield]"
      />
      <span className="text-white/30 text-xs shrink-0">m</span>
    </div>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

export default function TaskInput({ tasks, onChange }: Props) {
  const [text, setText] = useState("");
  const [duration, setDuration] = useState(30);
  const [editingId, setEditingId] = useState<string | null>(null);

  const addTask = () => {
    if (!text.trim()) return;
    onChange([...tasks, { id: Date.now().toString(), text: text.trim(), duration, required: true }]);
    setText("");
    setDuration(30);
  };

  const removeTask = (id: string) => onChange(tasks.filter((t) => t.id !== id));

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setText(task.text);
    setDuration(task.duration);
    onChange(tasks.filter((t) => t.id !== task.id));
  };

  const toggleRequired = (id: string) => {
    onChange(
      tasks.map((t) =>
        t.id === id ? { ...t, required: t.required === false ? true : false } : t
      )
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") addTask();
  };

  return (
    <div className="space-y-3 min-w-0">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-white/90">把你想做的事列出来</h3>
        <p className="text-xs text-white/35 leading-relaxed">
          写下任务和预计时长，AI 会自动判断哪些该先做，哪些可以延后。
        </p>
      </div>

      {/* Task name input */}
      <div>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入任务名称，按 Enter 添加"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/40"
        />
      </div>

      {/* Duration + Add */}
      <div className="flex items-center justify-between gap-2">
        <DurationPicker value={duration} onChange={setDuration} />
        <button
          onClick={addTask}
          className="shrink-0 rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-500 transition shadow-btn-glow whitespace-nowrap"
        >
          添加
        </button>
      </div>

      {/* Task list */}
      <ul className="space-y-1.5">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="group flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3 py-2 hover:bg-white/8 transition min-w-0 overflow-hidden"
          >
            {/* Duration */}
            <span className="shrink-0 text-[11px] text-white/35 font-mono tabular-nums w-14 text-right pr-2">
              {formatDuration(task.duration)}
            </span>

            {/* Required badge */}
            <button
              onClick={() => toggleRequired(task.id)}
              className={`shrink-0 rounded-full border px-1.5 py-px text-[10px] font-semibold transition whitespace-nowrap ${
                task.required === false
                  ? "border-orange-500/30 text-orange-400/70 bg-orange-500/10"
                  : "border-blue-500/30 text-blue-400/80 bg-blue-500/10"
              }`}
            >
              {task.required === false ? "可选" : "必须"}
            </button>

            {/* Task name */}
            <span className="flex-1 min-w-0 text-sm text-white/80 truncate">{task.text}</span>

            {/* Actions */}
            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={() => startEdit(task)}
                className="text-[11px] text-white/40 hover:text-blue-400 px-1.5 py-px rounded hover:bg-white/10"
              >
                编辑
              </button>
              <button
                onClick={() => removeTask(task.id)}
                className="text-[11px] text-white/40 hover:text-red-400 px-1.5 py-px rounded hover:bg-white/10"
              >
                删除
              </button>
            </div>
          </li>
        ))}
      </ul>

      {tasks.length === 0 && (
        <p className="text-xs text-white/20 text-center py-2">还没有添加任务</p>
      )}

      {/* 总时长统计 */}
      {tasks.length > 0 && (
        (() => {
          const totalMin = tasks.reduce((sum, t) => sum + (t.duration || 0), 0);
          const h = Math.floor(totalMin / 60);
          const m = totalMin % 60;
          const isOverload = totalMin > 600; // 超过10小时警告
          return (
            <div className={`flex items-center gap-3 pt-3 mt-2 border-t border-white/8 ${isOverload ? "border-orange-500/30" : ""}`}>
              <span className="text-xs text-white/30">
                共 {tasks.length} 项
              </span>
              <span className={`text-xs font-medium ${isOverload ? "text-orange-400" : "text-white/50"}`}>
                约 {h > 0 ? `${h}h` : ""}{m > 0 ? `${m}m` : ""} ({totalMin}min)
              </span>
              {isOverload && (
                <span className="text-xs text-orange-400/80 ml-auto">
                  时间偏多，请酌情精简
                </span>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
}
