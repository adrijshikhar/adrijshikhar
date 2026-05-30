# Design: Agentic-Era GitHub Profile README

**Date:** 2026-05-31
**Repo:** `adrijshikhar/adrijshikhar` (GitHub profile README repo)
**Status:** Approved — ready for implementation planning

## Goal

Replace the default-template profile README with a distinctive, AI-era profile that
showcases Adrij Shikhar (Senior SWE @ Hevo — real-time data infrastructure) using a
mix of static content, hosted dynamic SVGs, scheduled GitHub Actions, and
agent-readable metadata files. Zero API keys / secrets required for v1.

## Scope

Build sequence is **core-first, Minesweeper as phase 2** (approved approach A).

**v1 (this spec's primary deliverable):**
- `README.md` — hybrid layout (see Layout)
- `AGENTS.md` — agent-readable profile spec
- `llms.txt` — machine-readable about block
- Hosted dynamic SVGs (typing header, stats, streak, summary cards, trophy, moon, views, badges)
- `.github/workflows/contribution-art.yml` — daily cron generating snake + Pac-Man + 3D isometric SVGs

**v2 (sequenced after v1 ships):**
- `.github/workflows/minesweeper.yml` — issue-driven playable Minesweeper

### Explicitly out of scope (dropped)
- LLM-powered "Ask my profile" chatbot (needed API key — dropped per user)
- LLM self-writing README (needed API key — dropped per user)

## Content source

All profile facts sourced from the portfolio repo
`/Users/nemesis/Projects/my-projects/adrijshikhar.github.io` (`src/content/*.md`):
identity, role, experience highlights, skills, socials, projects.

Key facts:
- Senior Software Engineer @ Hevo Data, Bengaluru. IIT Roorkee (Chemical Eng → software).
- Real-time data infra: Debezium MySQL CDC (Binlog V2, 100% of MySQL pipelines),
  Hermes control plane (Java 17, Dropwizard, Temporal), 25,000+ source objects/pipeline,
  60s→sub-second API latency, 200+ P0/P1 incidents, 1,889 PRs across 47 repos.
- Focus: intersection of data infrastructure and AI.
- Socials: GitHub `adrijshikhar`, LinkedIn `adrij-shikhar`, dev.to `adrijshikhar`,
  Reddit `nemesis0009`, email `adrijshikhar85@gmail.com`. Portfolio: adrijshikhar.github.io

## Layout (C + B hybrid)

Agentic "for humans / for agents" framing (C) with a two-column humans block (B).

README flow, top → bottom:
1. **Typing-SVG header** — cycles taglines: "I build real-time data infrastructure" →
   "CDC · streaming · distributed systems" → "data infra ∩ AI".
2. **👤 For humans** — two-column:
   - Left: bio + tagline; tech badge wall; social links.
   - Right: github-readme-stats card; streak-stats; profile-summary-cards.
3. **🤖 For agents** — callout linking `AGENTS.md` + `llms.txt` with a one-line "why".
4. **Collapsible `<details>` sections:**
   - Contribution art — Pac-Man graph (default open)
   - Contribution art — Snake + 3D isometric calendar
   - 🎮 Play Minesweeper (added in v2)
5. **Trophy row** — github-profile-trophy.
6. **Footer** — moon-phase SVG + profile-views counter.

## File structure

```
README.md                       # profile (hybrid layout)
AGENTS.md                       # agent-readable profile spec
llms.txt                        # machine-readable about block
.github/workflows/
  contribution-art.yml          # cron: snake + pacman + 3D → commit SVGs
  minesweeper.yml               # v2: issue-triggered game
assets/                         # generated SVGs referenced by README (on output branch)
```

Generated SVGs commit to a dedicated `output` branch to keep `main` history clean;
README references them via raw URLs to that branch.

## Components

### Hosted dynamic SVGs (no workflow — `<img>` only)

| Element        | Service |
|----------------|---------|
| Typing header  | readme-typing-svg (herokuapp) |
| Stats card     | github-readme-stats (vercel) |
| Streak         | github-readme-streak-stats |
| Summary cards  | github-profile-summary-cards |
| Trophy         | github-profile-trophy |
| Moon phase     | moon-phase SVG service |
| Views counter  | komarev.com/ghpvc |
| Tech badges    | img.shields.io + Simple Icons |

Theme: dark-mode variants (`theme=github_dark` / transparent) to match GitHub dark UI.

### `contribution-art.yml`

- Triggers: cron `0 0 * * *` (daily) + `workflow_dispatch` (manual).
- Permissions: `contents: write`.
- Auth: built-in `GITHUB_TOKEN` only — no secrets.
- Steps: generate snake (`Platane/snk`) → Pac-Man (`abozanona/pacman-contribution-graph`)
  → 3D isometric (`yoshi389111/github-profile-3d-contrib`); push resulting SVGs to
  `output` branch.

### Agent files

**`AGENTS.md`** — profile-as-agent-spec. Sections: Identity; Expertise map (data infra /
CDC / distributed systems / data∩AI with proficiency); Notable work (Binlog V2, Hermes,
25K scaling, failure classifier); How to reach / collaborate; an "agent instructions"
block on how to summarize/cite accurately.

**`llms.txt`** — terse machine-readable about following the llms.txt convention
(H1 name, `>` summary, `## About`, `## Links`).

### Minesweeper (v2 — `minesweeper.yml`)

- Trigger: `issues` / `issue_comment` carrying a move command (e.g. issue title `mine: B3`).
- Action parses move → updates board state (JSON file on `output` branch) → re-renders
  board as a markdown table in a README section → commits.
- README contains "reveal a cell" links that open prefilled issues.
- Isolated and built/tested only after v1 ships.

## Error handling / degradation

- Dead hosted SVG service → `<img>` falls back to alt-text; README stays readable.
- Workflow failure → last committed SVG remains; cron retries next day; `workflow_dispatch`
  available for manual rerun.
- Minesweeper invalid input → Action validates, comments the error, makes no state change.

## Verification

1. Markdown lint + local render check (VS Code preview / `grip`).
2. All `<img>` URLs return HTTP 200 (curl check script).
3. Trigger `contribution-art.yml` via `workflow_dispatch`; confirm SVGs land on `output`
   branch and render.
4. Visual check on live `github.com/adrijshikhar`.
5. v2: open a test issue; confirm the board updates.

## Risks / notes

- Third-party hosted SVG services are outside our control; degradation is graceful (alt-text).
- `output` branch must exist before README raw-URL references resolve — workflow creates/pushes it.
- Minesweeper is the highest-complexity / highest-maintenance piece — deliberately deferred to v2.
