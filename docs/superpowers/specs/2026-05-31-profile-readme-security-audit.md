# Final Security Audit — Agentic Profile README Change

- **Date:** 2026-05-31
- **Branch audited:** `feature/agentic-profile-readme` (diff base: `main`)
- **Lens:** Bounty-hunter / adversarial. Scope = remotely-reachable, user-controlled
  attack paths: command injection (CWE-78), script injection, SSRF, auth bypass,
  secret exfiltration, supply-chain unpinned actions (CWE-1357).
- **Method:** Read every changed file end-to-end; traced attacker-controlled data
  flow; independently re-ran the static gate. Prior claims in the diff comments were
  not trusted and were verified against the actual code.

## Change Surface

```
.github/workflows/contribution-art.yml |  58 ++
.github/workflows/minesweeper.yml      |  68 ++
AGENTS.md                              |  39 ++
README.md                              | 136 +-
docs/pinned-actions.md                 |  16 ++
llms.txt                               |  18 ++
scripts/check-img-urls.sh              |  27 ++
scripts/minesweeper.js                 |  64 ++
scripts/minesweeper.test.js            |  24 ++
```

There is **no application/server code**. The only code-execution surfaces are the two
GitHub Actions workflows. README.md, AGENTS.md, llms.txt are static content.
`scripts/check-img-urls.sh` is a local/CI utility (not workflow-invoked) operating on
a repo-controlled README. `scripts/minesweeper.js` is a pure, I/O-free engine.

---

## Workflow 1 — `.github/workflows/minesweeper.yml`

### Trigger & attacker control
- Trigger: `on: issues: types: [opened]` (lines 3–5). **Attacker-controllable: yes.**
  Any GitHub user can open an issue on a public profile repo, fully controlling
  `github.event.issue.title` and `github.event.issue.body`.
- Job guard: `if: startsWith(github.event.issue.title, 'mine:')` (line 15). Evaluated by
  the Actions expression engine, not a shell — not an injection sink.

### Permissions
- `permissions: contents: write, issues: write` (lines 8–10). `contents: write` is
  needed to commit board state; `issues: write` to comment/close. This is scoped to the
  job's actual needs (no `packages`, `id-token`, `actions`, etc.). **Minimal: acceptable.**
  Note: `contents: write` on an `issues: opened` trigger is inherently sensitive, but the
  only thing written is a static, engine-produced JSON file via fixed git commands — see
  data-flow verdict below.

### `uses:` pinning
- `actions/checkout@900f2210b1d28bbbd0bd22d17926b9e224e8f231` (line 19) — 40-hex SHA.
- `actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3` (line 24) — 40-hex SHA.
- Both match `docs/pinned-actions.md`. **All pinned.**

---

## Candidate 1 — Minesweeper issue-title Command Injection (CWE-78)

### Description
The workflow processes a fully attacker-controlled value (`github.event.issue.title`).
The classic failure mode is interpolating that value directly into a `run:` shell block
or into a `github-script` `script:` template (`${{ ... }}`), which would let an attacker
embed `$(...)`, backticks, or `"; cmd; "` and achieve RCE on the runner with a write
token. We must confirm the untrusted title NEVER reaches a shell and is constrained by an
allowlist.

### Vulnerable Code (the path examined)
`.github/workflows/minesweeper.yml`:
```yaml
27:          RAW_TITLE: ${{ github.event.issue.title }}      # crosses boundary as env var
...
32:            const raw = process.env.RAW_TITLE.replace(/^mine:\s*/i, "");  # read via Node
42:            const move = engine.parseMove(raw);            # strict allowlist
...
62:      - name: Commit board state
63:        run: |
64:          git config user.name "github-actions[bot]"
65:          git config user.email "github-actions[bot]@users.noreply.github.com"
66:          git add .minesweeper-state.json
67:          git commit -m "chore: minesweeper move" || echo "no change"
68:          git push
```
`scripts/minesweeper.js`:
```js
6: const MOVE_RE = /^([A-I])([1-9])$/; // STRICT allowlist for untrusted input
8: function parseMove(raw) {
9:   const m = MOVE_RE.exec((raw || "").trim().toUpperCase());
10:   if (!m) return null;
11:   return { c: COLS.indexOf(m[1]), r: Number(m[2]) - 1 };
12: }
```

### Data-flow trace (verified independently)
1. `github.event.issue.title` is referenced in exactly two places (verified via
   `grep -nE 'github\.event\.issue\.title'`): line 15 (`if:` guard, expression engine)
   and line 27 (`env: RAW_TITLE`). It is interpolated into **no** `run:` step and **no**
   `script:` template.
2. The only `${{ ...github.event... }}` interpolation in either workflow is line 27, an
   `env:` assignment (verified via `grep -nE '\$\{\{[^}]*github\.event'`). github-script
   passes `env:` values through to `process.env`; this is the recommended safe boundary —
   the value is data, never code.
3. Inside `script:`, the title is read as `process.env.RAW_TITLE` (line 32) and passed to
   `engine.parseMove` (line 42). The strict `^([A-I])([1-9])$` regex rejects every shell
   metacharacter; any non-match returns `null` and the workflow posts an "Invalid move"
   comment and returns (lines 43–49). The derived `move` is `{c:int, r:int}` only.
4. The single `run:` step (lines 62–68) contains only static git commands and stages a
   fixed filename `.minesweeper-state.json` whose contents are produced by the engine
   (`JSON.stringify(state)`, line 52) from validated integers — no title text reaches it.

### Proof of Concept (attempted, fails)
An attacker opens an issue titled:
```
mine: B3"; id; echo "
```
or
```
mine: $(rm -rf /)
```
After `replace(/^mine:\s*/i,"")`, `parseMove` runs the payload through
`^([A-I])([1-9])$` → no match → `null` → "Invalid move" comment, no state mutation, no
shell execution. This exact behavior is asserted by `scripts/minesweeper.test.js:5–11`
(`parseMove('B3"; id; echo "')` and `parseMove("$(rm -rf /)")` both return `null`), and
the test suite passes (3/3, see below). There is no reachable shell sink for the title.

### Impact
None realized. If the title had been interpolated into a `run:` step, impact would be
RCE on the runner with a `contents:write`/`issues:write` token (secret exfil, malicious
commits). The chosen `env:` → `process.env` → regex-allowlist design eliminates this.

### Affected Version
`feature/agentic-profile-readme` @ current HEAD.

### VERDICT: **MITIGATED** (not exploitable).

---

## Workflow 2 — `.github/workflows/contribution-art.yml`

### Trigger & attacker control
- Trigger: `on: schedule (cron "0 0 * * *")` + `workflow_dispatch` (lines 4–6).
  **Not attacker-controllable.** `workflow_dispatch` requires repo write access; `schedule`
  runs on the default branch only. No `pull_request_target`, `issue_comment`, or fork PR
  surface.

### Data flow
- All action inputs are derived from `github.repository_owner` (lines 24, 33, 42) — a
  trusted repo-context value, not user input — and `secrets.GITHUB_TOKEN`. No
  `github.event.*` attacker field reaches any sink. The one `run:` step (lines 47–49) is
  static (`mkdir`/`cp` on fixed paths). No SSRF/injection sink for untrusted data.

### Permissions
- `permissions: contents: write` (lines 9–10), needed to publish the generated SVGs to
  the `output` branch via `peaceiris/actions-gh-pages`. Checkout uses
  `persist-credentials: false` (line 19), and the publish step authenticates with an
  explicit `github_token` (line 54). **Minimal: acceptable.**

### `uses:` pinning
- `actions/checkout@900f2210...` (19), `Platane/snk@90544406...` (22),
  `abozanona/pacman-contribution-graph@93ebd011...` (31),
  `yoshi389111/github-profile-3d-contrib@f234ae01...` (39),
  `peaceiris/actions-gh-pages@cf520ea9...` (52). All 40-hex SHAs, all matching
  `docs/pinned-actions.md`. **All pinned.**

### VERDICT: **NO EXPLOITABLE PATH.** Trigger is not attacker-reachable; no untrusted
data reaches a sink.

---

## Candidate 2 — Supply-chain / Action Pinning (CWE-1357)

### Description
Third-party actions referenced by mutable tags/branches can be hijacked by an upstream
maintainer moving the tag, achieving code execution in this repo's CI with whatever token
the job grants. Mitigation is full 40-hex commit-SHA pinning.

### Vulnerable Code (the area examined)
All 7 `uses:` references across both workflows.

### Verification (independent)
- `grep -nE 'uses:' .github/workflows/*.yml | grep -vE '@[0-9a-f]{40}'` → `ALL SHA-PINNED`
  (zero tag/branch references).
- All 6 distinct actions are listed with matching SHAs in `docs/pinned-actions.md`
  (cross-check passed exactly).
- `zizmor --persona=regular` reports **no findings** (the 10 suppressed items are the
  informational pinning/expected ones for this persona).

### Impact
None realized. Residual supply-chain risk is the standard "pinned to a SHA that itself
could be a malicious commit" — but that is not in scope for this change and is the
accepted best-practice posture. Four of the third-party actions run with
`secrets.GITHUB_TOKEN` (`contents:write`); SHA pinning is the correct control and is
applied.

### Affected Version
`feature/agentic-profile-readme` @ current HEAD.

### VERDICT: **MITIGATED** (not exploitable).

---

## Other paths considered (low signal, dismissed)

- **`scripts/check-img-urls.sh` SSRF / arg injection:** It runs `curl` over URLs grepped
  from a repo-controlled README, invoked manually/in CI — not from a workflow and not over
  attacker input. URLs are passed as a single `curl` argument (not shell-evaluated). The
  `set -euo pipefail` and `--max-time 20` bound it. Not remotely reachable. No issue.
- **Secret exfiltration via minesweeper comment body:** The comment body is the
  engine-rendered board (`render()`), built only from validated integers/static markdown —
  no secret or env interpolation. No issue.
- **State-file poisoning:** `.minesweeper-state.json` is parsed with `JSON.parse`; the
  engine treats `mines`/`revealed` as integer arrays and never `eval`s content. Worst case
  is a malformed board, not code execution. Out of scope / no exploit.

---

## Static Gate Results (re-run independently 2026-05-31)

| Gate | Command | Result | Exit |
|------|---------|--------|------|
| actionlint | `actionlint .github/workflows/*.yml` | no output | **0** |
| zizmor | `zizmor --persona=regular .github/workflows/*.yml` | "No findings to report. Good job! (10 suppressed)" | **0** |
| unit tests | `node --test "scripts/*.test.js"` | 3 pass / 0 fail (injection-payload tests pass) | **0** |
| url check | `bash scripts/check-img-urls.sh README.md` | see note below | **1** |

**URL-check note (exit=1 is expected, NOT a vulnerability):** Three URLs fail as
documented graceful-degradation cases — GitHub renders alt-text for these:
- `github-readme-stats.vercel.app` → **503** (public instance overloaded/down).
- `github-profile-trophy.vercel.app` → **402** (public instance rate/billing limited).
- `www.linkedin.com/in/...` → **999** (LinkedIn anti-bot response to non-browser UA).

All other ~35 URLs (shields.io badges, summary-cards, streak/typing SVGs, profile links)
return **200**. The three `output/` branch SVGs are correctly `SKIP`ped (generated by the
contribution-art workflow). No new or unexpected failures.

---

## Overall Verdict

**No exploitable, in-scope vulnerability found in this change.**

- Minesweeper CWE-78 path: untrusted issue title reaches the engine **only** via
  `env:` → `process.env.RAW_TITLE`, never string-interpolated into a `run:` or `script:`
  template, and is gated by the strict `^([A-I])([1-9])$` allowlist that rejects all shell
  metacharacters (verified by code read + passing injection tests). MITIGATED.
- Supply-chain CWE-1357: all 7 `uses:` are full 40-hex SHA pins matching
  `docs/pinned-actions.md`; zizmor clean. MITIGATED.
- contribution-art workflow: trigger not attacker-reachable; no untrusted data reaches a
  sink.
- Permissions are minimal-per-job in both workflows.

**Status: PASS — no blocker.**
