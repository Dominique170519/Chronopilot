# Chronopilot

让 AI 安排你的明天 — 输入任务、状态和目标，AI 会帮你做取舍、排优先级，并生成更合理的一天。

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

## 功能特性

- **智能日程生成** — 基于 Claude AI，自动判断任务优先级，生成全天日程
- **精力感知** — 支持「充沛 / 一般 / 疲惫」三种精力状态，AI 据此分配任务难度
- **三种模式** — 高效模式 / 平衡模式 / 轻松模式，适应不同节奏需求
- **固定时间保护** — 睡觉、三餐等固定时间自动避开
- **动态时间轴** — 可视化展示一天节奏，支持重新调整
- **灵活改排** — 输入新情况（如临时开会），AI 重新生成安排

## 截图

```
┌──────────────────────────────────────────────┐
│  🕐 时间轴视图                               │
│                                              │
│  08:00 ┌─ 起床 + 早餐 [恢复]               │
│  09:00 ┌─ 任务1 [深度工作]                  │
│  10:00 ┌─ recovery [休息]                   │
│  11:00 ┌─ light事务 [轻任务]                │
│  12:00 ┌─ 午餐 [恢复]                       │
│  ...                                        │
└──────────────────────────────────────────────┘
```

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Dominique170519/Chronopilot.git
cd Chronopilot
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 API Key

在项目根目录创建 `.env.local` 文件：

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

> API Key 可在 [Anthropic Console](https://console.anthropic.com/) 获取

### 4. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

## 项目结构

```
src/
├── app/
│   ├── page.tsx          # 主页面
│   ├── layout.tsx        # 布局
│   ├── globals.css       # 全局样式
│   └── api/schedule/
│       └── route.ts      # AI 日程生成 API
├── components/
│   ├── GoalInput.tsx     # 目标输入
│   ├── TaskInput.tsx     # 任务管理
│   ├── SettingsPanel.tsx # 精力/模式设置
│   ├── UnavailableSettings.tsx  # 不可用时段
│   ├── ScheduleResult.tsx # 日程结果 & 时间轴
│   └── TimeInput.tsx     # 时间选择器
└── types/
    └── index.ts          # TypeScript 类型定义
```

## 技术栈

- **框架**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind CSS 3
- **AI**: Anthropic Claude API
- **语言**: TypeScript

## License

MIT
