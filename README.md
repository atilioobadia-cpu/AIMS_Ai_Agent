<div align="center">

<img src="public/aims-logo.png" alt="AIMS AI Agent" width="120" />

# AIMS AI Agent

**Alpha Integrated Management System — AI-Powered Tax & Accounting Assistant for Tanzania**

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#license)

</div>

---

AIMS AI Agent is a bilingual (English / Kiswahili) conversational assistant that helps Tanzanian businesses navigate tax compliance, accounting standards, and data protection regulations. It combines **deterministic tax calculators**, a **retrieval-augmented generation (RAG)** pipeline grounded in official TRA and PDPC sources, and **Google Gemini** for natural language responses — ensuring accurate, source-cited answers without hallucination.

## Features

### AI Chat with RAG
- Streaming responses via Server-Sent Events
- Keyword-based retrieval with Kiswahili synonym expansion
- Source-grounded answers with inline citations and confidence scoring
- High-risk question detection (audit, penalties, disputes) with human-review flagging
- Bilingual automatic detection and response

### Deterministic Tax Calculators
| Calculator | Description | Rule Version |
|------------|-------------|--------------|
| **PAYE** | 5-band monthly income tax (0%–30%) | `TRA-MAINLAND-2025-2026` |
| **VAT** | 18% exclusive / inclusive calculation | `TRA-VAT-18PCT-MAINLAND` |
| **SDL** | Skills Development Levy (3.5%, 10+ employees) | `TRA-SDL-3.5PCT-2023` |
| **WHT** | 7-category withholding tax (5%–15%) | Current TRA rates |

Natural language input is automatically routed to the correct calculator — the LLM explains results but never computes them.

### Document Management
- Upload PDFs (up to 12MB) for instant indexing
- Automatic text extraction, chunking, and metadata generation
- Uploaded documents merge into the knowledge base and become searchable in chat

### Knowledge Base
- 9 curated entries from official Tanzanian sources (TRA, PDPC)
- Bilingual content with source URLs, categories, and review dates
- Dynamic merging with user-uploaded documents

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 15](https://nextjs.org) (App Router) |
| Language | [TypeScript 5.8](https://www.typescriptlang.org) |
| UI | [React 19](https://react.dev) |
| State | [Zustand 5](https://github.com/pmndrs/zustand) with localStorage persistence |
| LLM | [Google Gemini 2.0 Flash](https://ai.google.dev) |
| PDF Parsing | [pdf-parse 2.x](https://github.com/nicholasgasior/pdf-parse) |
| Styling | Custom CSS (dark theme) |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Google Gemini API key](https://ai.google.dev)

### Installation

```bash
git clone https://github.com/atilioobadia-cpu/AIMS_Ai_Agent.git
cd AIMS_Ai_Agent
npm install
```

### Configuration

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.0-flash
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production

```bash
npm run build
npm start
```

## Project Structure

```
aims-ai-agent/
├── app/
│   ├── api/
│   │   ├── chat/              # Chat endpoints (streaming + fallback)
│   │   ├── calculations/      # Tax calculator APIs (PAYE, VAT, SDL, WHT)
│   │   └── documents/         # PDF upload, listing, deletion
│   ├── page.tsx               # Main UI (chat + documents view)
│   ├── layout.tsx             # Root layout
│   └── globals.css            # Dark theme styles
├── lib/
│   ├── knowledge-base.ts      # Static knowledge entries + dynamic merging
│   ├── retrieval.ts           # Keyword search with Swahili expansion
│   ├── llm.ts                 # Gemini client + system prompt
│   ├── tax-calculators.ts     # Deterministic tax computation functions
│   ├── document-store.ts      # File-based document persistence
│   ├── pdf-extract.ts         # PDF text extraction
│   ├── store.ts               # Zustand conversation store
│   └── types.ts               # TypeScript type definitions
├── data/                      # Document storage
├── docs/                      # Architecture & roadmap documentation
├── scripts/                   # Utility scripts (PDF generation)
└── public/                    # Static assets
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System design and technical architecture |
| [Agent System](docs/AGENT-SYSTEM.md) | Multi-agent orchestration design |
| [Roadmap](docs/ROADMAP.md) | 7-phase implementation plan |

## Roadmap

| Phase | Focus |
|-------|-------|
| 1 | PostgreSQL + pgvector for vector search |
| 2 | Intent classification, BM25 + hybrid retrieval |
| 3 | ERPNext/Frappe bidirectional integration |
| 4 | Multi-agent system (8 specialized agents) |
| 5 | Multi-tenancy, JWT auth, RBAC |
| 6 | OCR, financial analysis, WhatsApp/SMS |
| 7 | Testing, CI/CD, monitoring, production deployment |

## License

Proprietary — All rights reserved. Contact [atilioobadia-cpu](https://github.com/atilioobadia-cpu) for licensing inquiries.
