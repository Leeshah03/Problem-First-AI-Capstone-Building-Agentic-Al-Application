# Project Sift — AI-Driven Signal Prioritization Platform

Project Sift is an agentic AI application that ingests customer signals from multiple data sources, classifies and deduplicates them using an LLM pipeline, and surfaces high-priority product insights for review. Built as a capstone project for the **Problem-First AI: Building Agentic AI Applications for Product Prioritization** course.

---

## What It Does

Product teams are overwhelmed by feedback scattered across tools — support tickets, sales calls, NPS surveys, feature requests. Sift automates the triage:

1. **Ingests** signals from Canny, Gong, Jira, Pendo, and Salesforce via pluggable connectors
2. **Classifies** each signal by theme using Claude (Anthropic) with bias detection
3. **Embeds** signals with OpenAI and merges near-duplicate themes via vector similarity
4. **Flags** low-confidence signals for human review
5. **Presents** a prioritized dashboard with real-time pipeline status via Server-Sent Events

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Vercel)                  │
│         React 19 + Vite  ·  Clerk Auth              │
│         Real-time SSE dashboard + review queue       │
└────────────────────┬────────────────────────────────┘
                     │ REST + SSE
┌────────────────────▼────────────────────────────────┐
│                  Backend (Railway)                   │
│              Express.js API Server                   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │              AI Pipeline                      │   │
│  │  classify → biasDetect → embed →             │   │
│  │  mergeThemes → flagLowConfidence             │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Connectors: Canny · Gong · Jira · Pendo · SF       │
│  Scheduler: node-cron  ·  EventBus: SSE             │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│              PostgreSQL (Drizzle ORM)                │
│         signals · themes · pipelineRuns             │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Clerk (auth) |
| Backend | Node.js, Express.js |
| Database | PostgreSQL, Drizzle ORM |
| AI | Anthropic Claude (classify + bias), OpenAI (embeddings) |
| Connectors | Canny, Gong, Jira, Pendo, Salesforce |
| Observability | Sentry, PostHog |
| Deployment | Vercel (frontend), Railway (backend) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Accounts for: Anthropic, OpenAI, Clerk

### 1. Clone and install

```bash
git clone https://github.com/Leeshah03/Problem-First-AI-Capstone-Building-Agentic-Al-Application.git
cd Problem-First-AI-Capstone-Building-Agentic-Al-Application
npm install
```

### 2. Configure environment

```bash
cp .env.production.example .env
```

Fill in the required values in `.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/sift

# Auth (Clerk)
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...

# AI
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Frontend
VITE_API_URL=http://localhost:3001/api
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
```

### 3. Set up the database

```bash
npm run db:migrate   # run migrations
npm run db:seed      # seed demo data
```

### 4. Run locally

```bash
npm run dev          # starts Vite (port 5173) + Express (port 3001) concurrently
```

---

## Pipeline Overview

The core pipeline runs on a schedule (via `node-cron`) and can also be triggered manually via the API:

```
Fetch unclassified signals
        ↓
  classifyBatch()       — Claude labels each signal with a theme + confidence score
        ↓
  detectBiasBatch()     — Claude checks for recency/channel/volume bias
        ↓
  embedBatch()          — OpenAI embeds signal text into vectors
        ↓
  mergeThemeClusters()  — cosine similarity merges near-duplicate themes
        ↓
  flagLowConfidence()   — signals below threshold queued for human review
```

Pipeline status is streamed live to the dashboard via Server-Sent Events.

---

## Data Connectors

Each connector extends `BaseConnector` and implements a `fetchSignals()` method. Supported sources:

| Connector | Signal Type |
|---|---|
| Canny | Feature requests and votes |
| Gong | Sales call transcripts |
| Jira | Bug reports and tickets |
| Pendo | In-app feedback and NPS |
| Salesforce | CRM notes and cases |

---

## Deployment

### Frontend → Vercel

```bash
vercel deploy --prod
```

Set `VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_SENTRY_DSN`, and `VITE_POSTHOG_KEY` in the Vercel dashboard.

### Backend → Railway

The `railway.json` config is included. Set all server-side env vars in the Railway dashboard and deploy via the Railway CLI or GitHub integration.

---

## Project Structure

```
├── server/
│   ├── api/          # Express route handlers
│   ├── connectors/   # Canny, Gong, Jira, Pendo, Salesforce
│   ├── db/           # Drizzle schema, migrations, seed
│   ├── pipeline/     # classify, embed, merge, bias, confidence
│   ├── scheduler/    # node-cron pipeline scheduler
│   └── events/       # SSE event bus
├── src/
│   ├── hooks/        # useEventStream, useReviewQueue, useThemes
│   ├── api/          # API client
│   └── data/         # Demo data fallback
└── .github/
    └── workflows/    # CI/CD deploy pipeline
```

---

## Course Context

This project was built as part of the **Problem-First AI** capstone — an approach to AI product development that starts with a real user problem (signal overload for product teams) and works backward to an agentic solution, rather than starting with AI capabilities and looking for applications.

---

## License

Private project — all rights reserved.
