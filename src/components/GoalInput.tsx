"use client";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function GoalInput({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-white/90">你明天最想优先完成什么？</h3>
        <p className="text-xs text-white/35 leading-relaxed">
          告诉 AI 你的核心目标，它会优先围绕这个目标安排时间。
        </p>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例如：完成简历投递和一轮 coding"
        rows={2}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/40 resize-none"
      />
    </div>
  );
}
