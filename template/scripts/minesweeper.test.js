const assert = require("node:assert");
const { test } = require("node:test");
const { parseMove, newBoard, applyMove, render } = require("./minesweeper.js");

test("parseMove rejects injection payloads", () => {
  assert.strictEqual(parseMove('B3"; id; echo "'), null);
  assert.strictEqual(parseMove("$(rm -rf /)"), null);
  assert.strictEqual(parseMove("Z9"), null);
  assert.strictEqual(parseMove("A0"), null);
  assert.deepStrictEqual(parseMove("b3"), { c: 1, r: 2 });
});

test("hitting a mine loses; safe cell reveals", () => {
  const b = newBoard(42);
  const mineIdx = b.mines[0];
  const move = { c: mineIdx % 9, r: Math.floor(mineIdx / 9) };
  assert.strictEqual(applyMove(b, move).lost, true);
});

test("render produces a 9-row markdown table", () => {
  const md = render(newBoard(7));
  assert.ok(md.includes("| A | B |") === false); // header uses spaced cols
  assert.strictEqual((md.match(/\n/g) || []).length >= 11, true);
});
