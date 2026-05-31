# Agentic-Era Profile README — reusable template

A GitHub **profile README** template with a "for humans / for agents" layout, live
contribution art (Pac-Man + snake), self-computed stat badges, and an issue-driven
Minesweeper. Everything is keyless — it runs on the built-in `GITHUB_TOKEN`.

> This is the generalized version of [`adrijshikhar`](https://github.com/adrijshikhar/adrijshikhar)'s profile.
> Replace the placeholders and it's yours.

## What's in here

```
template/
├── README.md                         # the profile (placeholders: YOUR_USERNAME, etc.)
├── AGENTS.md                         # agent-readable profile spec
├── llms.txt                          # machine-readable about block
├── scripts/
│   ├── gen-pacman.mjs                # Pac-Man SVG generator (npm lib + jsdom, no canvas OOM)
│   └── minesweeper.js                # pure Minesweeper engine (+ tests)
└── .github/workflows/
    ├── contribution-art.yml          # daily: snake + Pac-Man + self-computed stat badges → `output` branch
    └── minesweeper.yml               # issue-driven Minesweeper (hardened against injection)
```

## Setup (5 steps)

1. **Create your profile repo.** Make a repo named exactly your username
   (`YOUR_USERNAME/YOUR_USERNAME`). Its README renders on your profile.

2. **Copy the files** from this `template/` folder into the root of that repo:
   `README.md`, `AGENTS.md`, `llms.txt`, `scripts/`, and `.github/workflows/`.

3. **Replace placeholders** — search-and-replace across `README.md`, `AGENTS.md`,
   `llms.txt`:
   - `YOUR_USERNAME` → your GitHub username (appears in image/badge/raw URLs)
   - `YOUR NAME`, the bio bullets, the social links, and the Stack badges → your details
   The workflows and scripts need **no edits** — they read `${{ github.repository_owner }}`.

4. **Enable workflow write access.** Repo → Settings → Actions → General → Workflow
   permissions → **Read and write permissions**. (The workflow declares
   `permissions: contents: write`, but the repo setting must allow it.)

5. **Generate the art.** Actions tab → `contribution-art` → **Run workflow**. It creates
   the `output` branch with `snake.svg`, `pacman.svg`, and the stat-badge JSON endpoints.
   It re-runs daily via cron. The README's `<img>` tags point at that branch.

That's it. Open `github.com/YOUR_USERNAME` — the profile renders.

## Notes / gotchas

- **Image URLs are camo-proxied by GitHub.** After the first workflow run, give the page a
  minute for images to appear (camo fetches them async).
- **Light/dark:** the stat cards and snake use `<picture>` with `prefers-color-scheme`,
  so they adapt to the viewer's theme.
- **Don't show auto language stats** if your main work is in private repos — they only see
  public repos and will misrepresent you. The hand-curated Stack badges are the honest
  source. (This template omits language-pie widgets for that reason.)
- **Minesweeper security:** the issue title is attacker-controlled. It is passed only via
  `env:` into `actions/github-script` and validated by a strict `^([A-I])([1-9])$`
  allowlist — never interpolated into a shell `run:` step (avoids CWE-78). Keep it that way.
- **Pinned actions:** third-party actions are pinned to commit SHAs (supply-chain safety).
  Refresh them periodically.

## Credits

Tools used: [github-readme-stats](https://github.com/anuraghazra/github-readme-stats),
[readme-typing-svg](https://github.com/DenverCoder1/readme-typing-svg),
[Platane/snk](https://github.com/Platane/snk) (snake),
[pacman-contribution-graph](https://github.com/abozanona/pacman-contribution-graph),
[github-readme-activity-graph](https://github.com/Ashutosh00710/github-readme-activity-graph),
[Shields.io](https://shields.io), [Simple Icons](https://simpleicons.org).
