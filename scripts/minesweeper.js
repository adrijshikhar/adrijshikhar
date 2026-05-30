// Pure Minesweeper engine. No I/O, no shell. State is a JSON-serializable object.
// Board: 9x9, columns A-I, rows 1-9. Mines seeded from a numeric seed (deterministic).
const COLS = "ABCDEFGHI";
const SIZE = 9;
const MINES = 10;
const MOVE_RE = /^([A-I])([1-9])$/; // STRICT allowlist for untrusted input

function parseMove(raw) {
  const m = MOVE_RE.exec((raw || "").trim().toUpperCase());
  if (!m) return null;
  return { c: COLS.indexOf(m[1]), r: Number(m[2]) - 1 };
}

function newBoard(seed) {
  let s = seed >>> 0 || 1;
  const rand = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const mines = new Set();
  while (mines.size < MINES) mines.add(Math.floor(rand() * SIZE * SIZE));
  return { seed, mines: [...mines], revealed: [], lost: false, won: false };
}

function neighborMines(idx, mineSet) {
  const r = Math.floor(idx / SIZE), c = idx % SIZE;
  let n = 0;
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && mineSet.has(nr * SIZE + nc)) n++;
    }
  return n;
}

function applyMove(state, move) {
  if (!move || state.lost || state.won) return state;
  const idx = move.r * SIZE + move.c;
  const mineSet = new Set(state.mines);
  const revealed = new Set(state.revealed);
  if (mineSet.has(idx)) return { ...state, lost: true };
  revealed.add(idx);
  const won = revealed.size === SIZE * SIZE - MINES;
  return { ...state, revealed: [...revealed], won };
}

function render(state) {
  const mineSet = new Set(state.mines);
  const revealed = new Set(state.revealed);
  let md = "|   | " + COLS.split("").map((c) => `**${c}**`).join(" | ") + " |\n";
  md += "|---|" + "---|".repeat(SIZE) + "\n";
  for (let r = 0; r < SIZE; r++) {
    let row = `| **${r + 1}** |`;
    for (let c = 0; c < SIZE; c++) {
      const idx = r * SIZE + c;
      if (state.lost && mineSet.has(idx)) row += " 💣 |";
      else if (revealed.has(idx)) row += ` ${neighborMines(idx, mineSet) || "·"} |`;
      else row += " ⬜ |";
    }
    md += row + "\n";
  }
  if (state.lost) md += "\n💥 **Boom.** Open a new issue titled `mine: new` to reset.\n";
  else if (state.won) md += "\n🎉 **Cleared!** Open `mine: new` to play again.\n";
  return md;
}

module.exports = { parseMove, newBoard, applyMove, render, MOVE_RE };
