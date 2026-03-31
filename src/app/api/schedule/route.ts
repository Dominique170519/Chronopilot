import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { ScheduleRequest, ScheduleResult } from "@/types";

const anthropic = new Anthropic();

const buildPrompts = (body: ScheduleRequest) => {
  const isRerange = !!body.changes;

  const sleepDesc = body.sleepBlock
    ? "睡觉时间：23:00 — 08:00（绝对不能安排任务）"
    : "未启用睡觉约束";

  const mealDesc = [
    body.breakfast ? "早餐：07:00 — 08:00" : null,
    body.lunchBreak ? "午餐：12:00 — 13:00" : null,
    body.dinner ? "晚餐：18:00 — 19:00" : null,
  ].filter(Boolean).join("\n");

  const taskList = body.tasks.map((t, i) => {
    const tag = t.required === false ? "（可选）" : "（必须）";
    const deadline = t.deadline ? `，截止 ${t.deadline}` : "";
    return `${i + 1}. "${t.text}" ${tag}，预计 ${t.duration} 分钟${deadline}`;
  }).join("\n");

  const unavailableDesc = body.unavailableBlocks.length > 0
    ? body.unavailableBlocks.map(b => `  - ${b.start} — ${b.end}${b.reason ? `（${b.reason}）` : ""}`).join("\n")
    : "无";

  const baseContext = `
当前时间: ${body.currentTime}
用户核心目标: ${body.goal || "（未设定）"}
用户精力状态: ${body.energy === "high" ? "充沛" : body.energy === "medium" ? "一般" : "疲惫"}
日程模式: ${body.mode === "efficient" ? "高效模式" : body.mode === "balanced" ? "平衡模式" : "轻松模式"}

${sleepDesc}
固定用餐时间:
${mealDesc || "（未设置用餐约束）"}

不可打扰时段:
${unavailableDesc}

想做的事（共 ${body.tasks.length} 项）:
${taskList}`;

  const rerangeContext = isRerange
    ? `\n用户新情况：${body.changes}\n请基于以上变化，在保留必须任务的前提下重新调整日程。`
    : "\n请根据以上信息，生成一份合理的明日日程。";

  const systemPrompt = `你是一个冷静、清晰、有判断力的 AI 时间助理。

你的核心原则不是"把任务塞满"，而是：
1. 先做判断（哪些必须做，哪些可以延后）
2. 再做安排（按精力节奏分配时间）

【作息约束】
- 一天安排范围：默认 08:00 - 23:00
- 00:00 - 07:00 绝对不能安排任何任务（睡觉时间）
- ${body.sleepBlock ? "23:00 — 08:00 设为睡觉时段，禁止安排任务" : "未启用睡觉约束"}
${body.breakfast ? "- 07:00 — 08:00 为早餐时段" : ""}
${body.lunchBreak ? "- 12:00 — 13:00 为午餐时段" : ""}
${body.dinner ? "- 18:00 — 19:00 为晚餐时段" : ""}

【节奏约束】
- 每 90-120 分钟安排一次休息（recovery 类型，5-15分钟）
- 连续深度工作不超过 2 小时
- ${body.lunchBreak ? "午休 12:00-13:00 留出完整休息时间" : "建议安排自然午餐休息 30-60 分钟"}
- 精力 low 时不安排高强度任务（focus）

【任务类型定义】
- focus：深度工作（高强度，需要专注）
- light：轻任务（机械性、协作性、事务性）
- recovery：恢复（休息、散步、放松）
- flex：弹性时间（可灵活安排）
- buffer：过渡（任务之间的缓冲）

输出必须是纯 JSON 格式（无 markdown 代码块、无解释）：
{
  "summary": "一句话说明今天的整体安排策略",
  "decisions": [
    "判断理由1，例如：为什么把 X 任务排在上午而不是下午",
    "判断理由2，例如：为什么在这个时间安排休息",
    "判断理由3，例如：为什么放弃/延后了 Y 任务"
  ],
  "schedule": [
    {
      "time": "HH:MM（开始时间）",
      "endTime": "HH:MM（结束时间）",
      "task": "任务名称",
      "duration": 分钟数（整数）,
      "type": "focus | light | recovery | flex | buffer",
      "reason": "一句话说明为什么在这个时间安排这个任务",
      "notes": "可选补充说明"
    }
  ],
  "droppedTasks": [
    { "task": "任务名称", "reason": "今天无法完成的原因（时间不够/优先级低/精力不匹配等）" }
  ]
}

关键要求：
- 每个任务只出现一次，不要碎片化
- 必须任务（required=true）优先确保，必要时延后可选任务
- decisions 至少 3 条，展示你的判断逻辑
- 时间轴从 08:00 到 23:00，覆盖全天节奏`;

  const userPrompt = `${baseContext}${rerangeContext}`;

  return { systemPrompt, userPrompt };
};

export async function POST(req: NextRequest) {
  try {
    const body: ScheduleRequest = await req.json();

    if (!body.tasks || body.tasks.length === 0) {
      return NextResponse.json(
        { error: "请至少添加一个任务" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY 未配置" },
        { status: 500 }
      );
    }

    const { systemPrompt, userPrompt } = buildPrompts(body);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-7-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const rawText = textBlock?.type === "text" ? textBlock.text : "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json(
          { error: "AI 返回格式有误，请重试" },
          { status: 500 }
        );
      }
    }

    // 防御：如果 AI 返回的是直接数组而非对象，包装成标准格式
    if (Array.isArray(parsed)) {
      return NextResponse.json({
        summary: "日程已生成",
        decisions: [],
        schedule: parsed,
        droppedTasks: [],
      });
    }

    const result = parsed as ScheduleResult;

    // 如果缺少 schedule 字段但有 items（AI 可能用了不同字段名）
    if (!result.schedule && Array.isArray((parsed as any).items)) {
      result.schedule = (parsed as any).items;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Schedule API error:", error);
    return NextResponse.json(
      { error: "生成日程时出错，请检查 API 配置" },
      {  status: 500 }
    );
  }
}
