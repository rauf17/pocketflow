# PocketFlow

### The co-pilot for your wallet.

> A personal financial operating system built around one fundamental question:  
> **What can I safely spend today without hurting tomorrow?**

[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Gemini_AI-2.5_Flash-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Zustand](https://img.shields.io/badge/State-Zustand_5-orange?style=for-the-badge)](https://zustand-demo.pmnd.rs/)

---

## 📌 Executive Overview

Traditional budgeting apps focus backward on historical tracking—telling users where their money *went*. PocketFlow shifts the paradigm to **prospective decision-making**.

PocketFlow is a local-first, intelligence-assisted budgeting operating system. Rather than treating a bank balance as a single bucket to deplete, PocketFlow ensures **every rupee has a purpose**. It automatically reserves money for upcoming recurring obligations and protected long-term financial goals *before* calculating daily spending limits. It dynamically weighs day profiles, accommodates safe low-spend days, and redistributes surpluses smoothly across your planning horizon.

---

## 🏛 Core Financial Engine Architecture

PocketFlow enforces a protected, deterministic multi-layered financial pipeline. PocketFlow allocates available funds across protected financial commitments before calculating daily safe limits:

```
                  ┌──────────────────────────────┐
                  │       CURRENT BALANCE        │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │       RECURRING BILLS        │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │       PROTECTED GOALS        │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │      SPENDABLE BALANCE       │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │         DAY PROFILES         │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │     TODAY'S SAFE LIMIT       │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │        SPENT TODAY           │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │       REMAINING TODAY        │
                  └──────────────────────────────┘
```

### How the Budget Engine Works

1. **Recurring Bills**: Upcoming recurring bills due before or on the next payday are isolated first.
2. **Protected Goals**: Target contributions for active goals are subtracted next in priority order (`Critical` → `Important` → `Planned` → `Nice-to-Have`).
3. **Day Profiles**: Remaining `Spendable Balance` is distributed across the remaining planning horizon according to configured profile weightings (e.g. *University Day*, *Hostel Day*, *Shopping Day*).
4. **Today's Safe Limit**: The resulting daily limit representing what the user can safely spend today. Unspent funds automatically adjust **Tomorrow's Allowance**.

---

## ⚡ Product Systems

PocketFlow organizes personal finance into four integrated operational pillars:

### 1. 🎯 Plan
* **Day Profiles**: Assign distinct expected spend weights to different days of the week (e.g. *Safe Day*, *Low Spend*, *Normal*, *High Spend*).
* **Safe Days**: Mark days where little-to-no spending is anticipated, allowing the engine to allocate more budget to active social or errand days.
* **Weekly Planner**: Interactive schedule mapping profiles to days of the week.
* **Recurring Budgets**: Track subscriptions, rent, and utility bills due in the current cycle.

### 2. 🛡 Protect
* **Mission Control (`/goals`)**: Comprehensive financial goal hub.
* **Goal Priority System**: High-priority goals (`Critical`) receive protection before lower-tier objectives when funds become constrained.
* **Monthly Savings Goals**: Define fixed savings targets or percentage-based income protections.
* **Safety Limit Reached**: Automatic UI state transition when further spending would compromise protected savings.

### 3. 🧠 Decide
* **Today's Safe Limit**: The single authoritative planned ceiling for today's spend.
* **Tomorrow's Allowance**: Recalculated live as expenses are recorded throughout the day.
* **AI Co-Pilot (`/advisor`)**: Decision-first assistant powered by Gemini 2.5 Flash providing immediate assessment, metrics grid, and actionable recommendations for natural language questions.
* **LivingFlow Trajectory**: Animated bezier visual trajectory rendering projected budget nodes across the planning horizon.

### 4. 📊 Understand
* **Expense Tracker**: Real-time spending log with search and category filtering.
* **Historical Backfilling**: Record expenses for past dates without misattributing them to today's budget limit.
* **Analytics**: Detailed visualizations for daily averages, category breakdowns, and spending trends.

---

## 🤖 PocketFlow AI Co-Pilot Architecture

The PocketFlow AI Co-Pilot is designed around a strict principle: **Decision first. Explanation second.** 

Rather than functioning as a conversational chatbot, it interprets pre-derived deterministic metrics from PocketFlow's budget engine and outputs structured advice.

```
┌────────────────────────┐      ┌─────────────────────────┐      ┌────────────────────────┐
│   PocketFlow Engine    │ ───► │  Next.js API Route      │ ───► │  Gemini 2.5 Flash API  │
│  (15+ Context Values)  │      │  (/api/chat/route.ts)   │      │  (Deterministic JSON)  │
└────────────────────────┘      └─────────────────────────┘      └────────────────────────┘
                                                                             │
┌────────────────────────┐                                                   │
│   ResultCard UI        │ ◄─────────────────────────────────────────────────┘
│  (Verdict, Metrics)    │
└────────────────────────┘
```

### Context-Aware Reasoning (Goals-Optional)

The AI Co-Pilot receives a complete financial snapshot of the current state:
* Current balance & Spendable balance
* Reserved bills & Reserved goals
* Today's safe limit, spent today, & remaining today
* Days until next income
* Active day profile & safe day status
* Goals status array & recent transaction activity

> **Note**: Goals are strictly *optional* context. PocketFlow AI functions gracefully and provides full spending guidance even if zero goals are configured.

### Example User Queries

* *"Can I spend Rs500 today?"*
* *"What happens if I spend Rs2,000 today?"*
* *"How much can I safely spend across this entire week?"*
* *"What happens to my daily budget if my salary is delayed by 5 days?"*
* *"How do my upcoming recurring bills reduce my available daily budget?"*

---

## 🕒 Historical Expense Backfilling

PocketFlow supports accurate retroactive expense logging:

* **Default Date**: New expense entries always default to `TODAY`.
* **Date Restrictions**: Historical dates can be selected; future dates are strictly rejected.
* **Retroactive Budget Recalculation**: If a user logs a historical expense (e.g., *Rs 100 spent yesterday*):
  - Yesterday's recorded total increases by Rs 100.
  - Today's recorded spend is **not** affected.
  - Current balance is decremented by Rs 100.
  - Future daily allowances and trajectory nodes automatically recalculate.

---

## 🔒 Local-First Storage & Security

PocketFlow is built with a **local-first privacy architecture**:

* **State Storage**: Financial state (user details, income, expenses, bills, profiles, goals) is persisted locally in the user's browser using Zustand `persist` middleware (`localStorage`).
* **Zero Registration Required**: No account creation or external authentication servers.
* **Server-Side API Key Protection**: The Google Gemini API key is managed strictly on the server-side within the Next.js API Route (`src/app/api/chat/route.ts`). It is never exposed via `NEXT_PUBLIC_` client bundles or browser storage.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS v3](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/) |
| **Icons & Motion** | [Lucide React](https://lucide.dev/) & [Framer Motion](https://www.framer.com/motion/) |
| **State Management** | [Zustand 5](https://github.com/pmndrs/zustand) (with `persist` middleware) |
| **Date Handling** | [date-fns v4](https://date-fns.org/) |
| **AI Integration** | [Google Gemini 2.5 Flash API](https://ai.google.dev/) via `@google/genai` |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## 📁 Directory Structure

```
pocketflow/
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── advisor/      # AI Co-Pilot interface
│   │   │   ├── analytics/    # Analytics & visual charts
│   │   │   ├── budgets/      # Recurring bills management
│   │   │   ├── dashboard/    # State-aware Hero & At-a-Glance
│   │   │   ├── expenses/     # Expense log & history editor
│   │   │   ├── goals/        # Mission Control goals manager
│   │   │   ├── planner/      # Weekly day profile scheduler
│   │   │   └── settings/     # Financial preferences & reset
│   │   ├── (onboarding)/
│   │   │   └── welcome/      # Setup wizard
│   │   ├── api/
│   │   │   └── chat/         # Server-side Gemini API route
│   │   ├── favicon.ico
│   │   ├── globals.css       # Tailwind & brand theme variables
│   │   ├── icon.svg          # PocketFlow Wave P brand mark
│   │   ├── layout.tsx        # Root layout & font configuration
│   │   └── page.tsx          # Client-side router & hydration
│   ├── components/
│   │   ├── ui/               # Primitive UI components
│   │   ├── EditExpenseDialog.tsx
│   │   ├── ExpenseInput.tsx  # Floating quick-add expense drawer
│   │   ├── Gatekeeper.tsx    # Onboarding & route guard
│   │   ├── LivingFlow.tsx    # Interactive trajectory flow line
│   │   ├── Navigation.tsx    # Sidebar & mobile bottom nav
│   │   ├── PocketFlowLoader.tsx # Financial Flow startup sequence
│   │   └── PocketFlowLogo.tsx   # SVG Wave P logo component
│   ├── lib/
│   │   └── utils.ts          # Class merging & currency utilities
│   └── store/
│       ├── types.ts          # Domain type definitions
│       ├── useBudgetStore.ts # Recurring bills store
│       ├── useExpenseStore.ts# Transactions store
│       ├── useGoalStore.ts   # Goals & priority store
│       ├── useProfileStore.ts# Day profiles store
│       └── useUserStore.ts   # User profile & balance store
├── public/
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

* Node.js `18.x` or higher
* npm `9.x` or higher
* Google Gemini API Key (optional, for AI Co-Pilot features)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rauf17/pocketflow.git
   cd pocketflow
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open PocketFlow**:
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification Commands

```bash
# Run TypeScript type safety check
npx tsc --noEmit

# Run ESLint check
npm run lint

# Run production build
npm run build
```

---

## 🚀 Current Status

PocketFlow is an actively developed functional MVP. The core financial operating system is implemented and operational, featuring:

- Dynamic Daily Budget calculation engine
- Day Profiles & Weekly Schedule Planner
- Safe Days allocation algorithm
- Recurring Bills / Budgets isolation
- Expense Tracking & Historical Backfilling
- Goal Protection & Priority Engine
- Monthly Savings Goals
- Mission Control (`/goals`)
- Financial Analytics & Trend Visualizations
- AI Co-Pilot (`/advisor`) powered by Gemini 2.5 Flash
- LivingFlow Trajectory visualization
- Local-first Zustand persistence
- Responsive desktop & mobile interface

Future capabilities and feature enhancements may evolve as PocketFlow develops.

---

## 📄 License

License information has not yet been added to this repository.