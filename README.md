<div align="center">

<h1>🧬 Cambrian</h1>

<p><strong>The evolutionary idea engine. Feed it a problem. Watch ideas compete, die, and evolve.</strong></p>

[![GitHub Stars](https://img.shields.io/github/stars/janshibhavsar24-gif/cambrian?style=flat-square&color=6366f1)](https://github.com/janshibhavsar24-gif/cambrian/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/janshibhavsar24-gif/cambrian?style=flat-square&color=8b5cf6)](https://github.com/janshibhavsar24-gif/cambrian/forks)
[![License](https://img.shields.io/github/license/janshibhavsar24-gif/cambrian?style=flat-square&color=a855f7)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.9%2B-blue?style=flat-square)](https://python.org)
[![Claude](https://img.shields.io/badge/Powered%20by-Claude-orange?style=flat-square)](https://anthropic.com)

</div>

---

## ⚡ Overview

Most AI tools give you a flat list of ideas. **Cambrian makes ideas compete.**

Inspired by the Cambrian explosion — when life on Earth suddenly diversified into thousands of new forms in 20 million years — Cambrian applies the same principle to thinking. You describe a problem. Eight AI agents with radically different cognitive styles attack it simultaneously. The weakest ideas get culled. The survivors **cross-breed and mutate** across multiple generations.

The result is solutions that no single agent — or human — would have produced alone.

> **Feed it a problem → 8 agents seed ideas → red team attacks every solution → survivors evolve → you get ideas that emerged, not just generated.**

---

## 🧠 How It Works

### Phase 1 — Seeding
Eight agents with distinct cognitive phenotypes independently generate solutions:

| Phenotype | Approach |
|---|---|
| **First Principles** | Strips all assumptions, rebuilds from scratch |
| **Contrarian** | Assumes the obvious answer is wrong, inverts the problem |
| **Analogical** | Borrows solutions from biology, military, architecture, ecology |
| **Incrementalist** | Finds the smallest change with the highest leverage |
| **Radical** | Ignores all constraints — designs what *should* exist |
| **Economist** | Thinks in incentives, game theory, misaligned interests |
| **Systems Thinker** | Maps feedback loops and second-order effects |
| **Historian** | Finds historical analogues and extracts what actually worked |

### Phase 2 — Combat
Three red team agents attack every solution on different vectors:
- **Devil's Advocate** — finds the fundamental flaw
- **Skeptical User** — exposes hidden friction and adoption costs
- **Resource Realist** — challenges what's actually buildable

Each solution is scored on **novelty**, **feasibility**, and **robustness**. Weakest solutions are eliminated.

### Phase 3 — Evolution
Survivors breed. A synthesis agent finds the hidden principle connecting two different survivors and produces a hybrid stronger than either parent. Top solutions are also mutated — one core assumption challenged, one variant produced.

Repeat across N generations.

```
Generation 1:  8 seeds → combat → 8 survive
                    ↓ crossover + mutation
Generation 2:  10 offspring → combat → 8 survive
                    ↓ crossover + mutation
Generation 3:  10 offspring → combat → top 5 final
```

### Phase 4 — Report
Every seed, every attack, every score, every evolution step is written to a structured markdown report **in real time** — so nothing is lost even if the run crashes.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com)

### 1. Clone & install

```bash
git clone https://github.com/janshibhavsar24-gif/cambrian.git
cd cambrian

# Backend
pip install -r requirements.txt

# Frontend
cd frontend && npm install && cd ..
```

### 2. Configure

```bash
cp .env.claude.example .env
# Add your Anthropic API key to .env
```

```env
LLM_API_KEY=your_anthropic_api_key_here
LLM_MODEL=claude-sonnet-4-6
```

### 3. Run

**Option A — CLI (fastest)**
```bash
python3 -m cli.main evolve "How do you make AI agents reliable enough to trust with real tasks?"
```

**Option B — Web UI**
```bash
# Terminal 1 — backend
python3 -m backend.api.server

# Terminal 2 — frontend
cd frontend && npm run dev
```

Then open `http://localhost:5173`

---

## 🖥️ Web UI

The web interface streams the full evolution live — every seed, every combat score, every generation transition — as it happens via WebSocket.

When the run completes, the top solutions appear with full content, lineage, and score breakdown. A full report is saved to `reports/` automatically.

---

## 📄 Report Format

Every run produces a timestamped markdown report in `reports/` capturing the complete evolutionary journey:

```
# Cambrian Run Report

Problem: How do you make AI agents reliable enough to trust?

## Generation 1

### [a1b2] — Contrarian
[full solution]

#### Red Team Attacks
**Devil's Advocate:** [full attack]
**Skeptical User:** [full attack]
**Resource Realist:** [full attack]

#### Fitness Score
| Novelty | Feasibility | Robustness | Average |
| 8/10    | 5/10        | 6/10       | 6.3/10  |

Outcome: ✅ Survived

---

### Evolution → Generation 2
**Crossover:** a1b2 × c3d4 → e5f6
Synthesis reasoning: Both solutions circle the same insight...

## Final Results — Top 5 Evolved Solutions
...
```

---

## 🔧 CLI Reference

```bash
# Run with default 3 generations
python3 -m cli.main evolve "your problem here"

# Run with custom generations
python3 -m cli.main evolve "your problem here" --generations 5
```

---

## ⚙️ Configuration

| Variable | Default | Description |
|---|---|---|
| `LLM_API_KEY` | — | Your Anthropic API key |
| `LLM_MODEL` | `claude-sonnet-4-6` | Model to use |

**Tunable constants in `backend/core/engine.py`:**

| Constant | Default | Description |
|---|---|---|
| `CONCURRENCY` | `2` | Max parallel LLM calls |
| `survivors_per_gen` | `8` | Solutions kept after each combat round |
| `generations` | `3` | Evolutionary generations per run |

---

## 🏗️ Architecture

```
cambrian/
├── backend/
│   ├── core/
│   │   ├── phenotypes.py    # 8 cognitive agent types
│   │   ├── population.py    # solution model + lineage tracking
│   │   ├── combat.py        # red team adversarial layer
│   │   ├── evolution.py     # crossover + mutation
│   │   └── engine.py        # full orchestration loop
│   ├── llm/
│   │   └── adapter.py       # Anthropic Claude adapter
│   ├── api/
│   │   └── routes.py        # FastAPI + WebSocket endpoints
│   └── report/
│       ├── log.py            # passive run logger
│       └── generator.py     # incremental markdown writer
├── frontend/                # React + TypeScript (Vite)
│   └── src/
│       ├── hooks/useCambrian.ts   # WebSocket state management
│       └── components/            # EventFeed, FinalResults
└── cli/
    └── main.py              # Typer CLI
```

---

## 💡 Example Problems

Cambrian works on any domain. Some starting points:

- *"How do you make AI agents reliable enough to trust with real tasks?"*
- *"How do you stop technical debt from killing a codebase?"*
- *"Why do most people quit learning something new after the first week?"*
- *"How do you build trust between strangers on the internet?"*
- *"How do you make open source financially sustainable?"*

The more stuck the conventional thinking, the more Cambrian shines.

---

## 🤝 Contributing

Contributions are welcome. High-value areas:

- **New phenotypes** — add cognitive agent types in `backend/core/phenotypes.py`
- **New attackers** — add red team agents in `backend/core/combat.py`
- **Evolutionary tree visualization** — D3.js component showing idea lineage
- **Multi-model support** — add OpenAI / Gemini / local model adapters

---

## ⭐ Star History

If Cambrian produced a solution that surprised you, consider starring the repo — it helps others find it.

---

## 📜 License

MIT — use it, fork it, build on it.

---

<div align="center">
<sub>Built with Claude · Inspired by the Cambrian explosion · Ideas that earn their survival</sub>
</div>
