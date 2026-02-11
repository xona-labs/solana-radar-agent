# 📡 XONA Radar

An autonomous AI agent that detects emerging narratives and early signals within the Solana ecosystem. It analyzes on-chain, social, developer, and research data to surface trends before they're obvious — and generates concrete build ideas for each narrative.

**Refreshed fortnightly. Built by [Xona Labs](https://xona-agent.com) for [Superteam Earn](https://superteam.fun/earn).**

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    SIGNAL COLLECTION                         │
│                                                              │
│  📱 Social/X   ⛓️ On-Chain    👨‍💻 GitHub    📊 Research     │
│  ─────────    ──────────    ─────────    ──────────          │
│  KOL posts    Helius RPC    New repos    Messari             │
│  Trending     PumpFun       Trending     Electric Capital    │
│  Topic search DexScreener   Anchor       Delphi Digital      │
│               Token boosts  Categories   Solana Foundation   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  SIGNAL PROCESSING                           │
│                                                              │
│  1. Normalize → unified format                              │
│  2. De-duplicate                                             │
│  3. Tag (topics, sentiment, signal type)                    │
│  4. Store timestamped snapshot                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                NARRATIVE DETECTION (AI)                       │
│                                                              │
│  1. Cluster → Grok groups signals into narrative themes     │
│  2. Score → cross-source strength, novelty, velocity        │
│  3. Rank → top narratives by composite score                │
│  4. Build Ideas → 3-5 product ideas per narrative           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      OUTPUT                                  │
│                                                              │
│  🌐 Dashboard    📡 REST API    📁 JSON snapshots           │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Sources

### 1. Social / X (via Grok x_search)

| Source Type | What We Monitor |
|-------------|-----------------|
| **Tier 1 KOLs** | Toly, Mert, Raj, Armani — core ecosystem leaders |
| **Tier 2 Builders** | Jupiter, Helius, Tensor, MarginFi accounts |
| **Research Accounts** | Messari, Electric Capital, The Block, Delphi |
| **Trending Posts** | High-engagement Solana posts (200+ likes) |
| **Topic Searches** | AI agents, DePIN, RWA, restaking, PayFi, gaming, new DeFi |

### 2. On-Chain Data

| Source | Data |
|--------|------|
| **Solana RPC** | Network TPS, slot performance (any RPC provider) |
| **PumpFun** | Trending tokens, top movers, token descriptions |
| **DexScreener** | Boosted tokens, new token profiles on Solana |

### 3. Developer Activity (GitHub)

| Search | What We Track |
|--------|---------------|
| **New Repos** | Solana-tagged repos created in last 14 days with 5+ stars |
| **Trending Repos** | Active repos pushed in last 7 days with 20+ stars |
| **Anchor Projects** | New Rust programs using `anchor-lang` |
| **Category Repos** | AI agents, DePIN, RWA, payments, gaming on Solana |

### 4. Research & Reports

| Source | Signal |
|--------|--------|
| **Messari** | Published reports mentioning Solana |
| **Electric Capital** | Developer ecosystem reports |
| **Helius blog** | Technical and ecosystem analysis |
| **Delphi Digital** | Research and market intelligence |
| **Solana Foundation** | Official announcements and updates |

---

## Signal Detection & Ranking

### How Signals Are Detected

1. **Collection**: All 4 source collectors run in parallel, fetching data from the last 14 days
2. **Normalization**: Raw signals are mapped to a unified schema with `source`, `topics`, `sentiment`, `date`, `text`
3. **De-duplication**: Signals are hashed by source + content to prevent duplicates
4. **Topic extraction**: Each signal gets tagged with relevant topic keywords

### How Narratives Are Ranked

Each narrative gets a composite score out of 110 points:

| Factor | Max Points | How It's Measured |
|--------|-----------|-------------------|
| **Cross-source strength** | 30 | Signals from multiple source types (social + onchain + github = 24pts) |
| **Evidence quality** | 25 | Number of specific evidence points backing the narrative |
| **Velocity** | 20 | Rising (20), Stable (10), Declining (5) |
| **Stage** | 15 | Emerging (15), Accelerating (12), Maturing (5) |
| **AI confidence** | 10 | Grok's confidence in the narrative classification |
| **Signal match** | 10 | Count of signals whose topics match the narrative |

**Priority**: Emerging + rising + multi-source = highest score. We optimize for **early detection**, not volume.

---

## Quick Start

### Prerequisites

- Node.js 18+
- xAI API key (required) — [console.x.ai](https://console.x.ai/)
- Solana RPC URL (optional) — any provider (QuickNode, Triton, Helius, Alchemy, etc.)
- GitHub token (optional, increases rate limit) — [github.com/settings/tokens](https://github.com/settings/tokens)

### Install & Run

```bash
# Clone the repo
git clone https://github.com/xona-labs/solana-radar-agent.git
cd solana-radar-agent

# Install dependencies
npm install

# Configure environment
cp env.example .env
# Edit .env and add your XAI_API_KEY (required)

# Start the agent
npm start
```

The agent will:
1. Start the API server on `http://localhost:3010`
2. Run an initial full pipeline (collect signals + detect narratives)
3. Schedule daily collection and fortnightly analysis

### Dashboard

Open `http://localhost:3010` to see the interactive dashboard with:
- Detected narratives ranked by score
- Score breakdowns per narrative
- Evidence points from collected signals
- Build ideas with difficulty ratings and Solana-specific justifications

### CLI Commands

```bash
# Full pipeline (collect + analyze)
npm run full-run

# Collect signals only
npm run collect

# Analyze existing signals
npm run analyze

# Development mode (auto-restart)
npm run dev
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/narratives` | Latest detected narratives with build ideas |
| `GET` | `/api/narratives/:id` | Single narrative with score breakdown |
| `GET` | `/api/signals` | Latest collected signals (filterable by `?source=`) |
| `GET` | `/api/stats` | Combined signal and narrative statistics |
| `GET` | `/api/history` | Historical narrative snapshots |
| `POST` | `/api/collect` | Trigger signal collection |
| `POST` | `/api/analyze` | Trigger narrative analysis |
| `POST` | `/api/full-run` | Trigger full pipeline |
| `GET` | `/health` | Health check |

---

## Architecture

```
solana-radar-agent/
├── index.js                  # Entry point — starts server, cron, initial run
├── server.js                 # Express API + dashboard serving
├── package.json
├── .env                      # Environment variables (not committed)
├── env.example               # Template for .env
├── services/
│   └── grok.js               # Grok API client (x_search + chat + JSON parsing)
├── sources/
│   ├── social.js             # X/KOL signal collector (via Grok x_search)
│   ├── onchain.js            # Helius + PumpFun + DexScreener collector
│   ├── github.js             # GitHub API developer activity collector
│   └── research.js           # Research report collector (via Grok x_search)
├── analysis/
│   ├── signals.js            # Signal normalization, dedup, tagging
│   ├── clustering.js         # AI narrative clustering (via Grok)
│   ├── scoring.js            # Narrative scoring & ranking algorithm
│   └── build-ideas.js        # Build idea generation (via Grok)
├── storage/
│   └── store.js              # JSON file persistence for signals & narratives
├── cron/
│   └── scheduler.js          # Collection & analysis scheduling
├── dashboard/
│   └── index.html            # Interactive single-page dashboard
└── data/                     # Generated data snapshots (not committed)
```

---

## Build Ideas

Each detected narrative comes with 3-5 concrete build ideas. Each idea includes:

- **Name** and one-liner description
- **Detailed description** of what it does and who it's for
- **Why Solana** — specific reasons this benefits from Solana's capabilities
- **Technical approach** — one-line implementation strategy
- **Difficulty** — easy / medium / hard
- **Target user** — who would use this
- **Monetization** — how it could generate revenue

Ideas are generated by Grok AI with full context of the narrative evidence, making them specific and actionable rather than generic.

---

## Refresh Schedule

| Task | Frequency | Time |
|------|-----------|------|
| Signal collection | Daily | 06:00 UTC |
| Full analysis (narratives + ideas) | Fortnightly | 1st & 15th at 08:00 UTC |
| Manual trigger | On-demand | Via dashboard or API |

---

## Tech Stack

- **AI Engine**: [xAI Grok](https://x.ai/) — x_search for social intelligence, chat for analysis & clustering
- **On-Chain**: Solana RPC (any provider), [PumpFun](https://pump.fun/) API, [DexScreener](https://dexscreener.com/) API
- **Developer Data**: [GitHub Search API](https://docs.github.com/en/rest/search)
- **Runtime**: Node.js + Express
- **Storage**: JSON file snapshots (zero-dependency persistence)
- **Scheduling**: node-cron

---

## License

MIT — Built by [Xona Labs](https://xona-agent.com)
