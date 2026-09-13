import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseBoard,
  serializeBoard,
  findConflicts,
  solve,
  isComplete,
  SudokuFormatError,
} from "../src/sudoku.js";

const EASY_PUZZLE =
  "53..7...." +
  "6..195..." +
  ".98....6." +
  "8...6...3" +
  "4..8.3..1" +
  "7...2...6" +
  ".6....28." +
  "...419..5" +
  "....8..79";

const EASY_SOLUTION =
  "534678912" +
  "672195348" +
  "198342567" +
  "859761423" +
  "426853791" +
  "713924856" +
  "961537284" +
  "287419635" +
  "345286179";

test("parseBoard: table of awkward inputs", async (t) => {
  const cases: Array<{ name: string; input: string; expect: "ok" | "error" }> = [
    { name: "dots for blanks", input: EASY_PUZZLE, expect: "ok" },
    { name: "zeros for blanks", input: EASY_PUZZLE.replace(/\./g, "0"), expect: "ok" },
    {
      name: "newlines and spaces between rows",
      input: EASY_PUZZLE.match(/.{9}/g)!.join("\n"),
      expect: "ok",
    },
    { name: "too short", input: EASY_PUZZLE.slice(0, 80), expect: "error" },
    { name: "too long", input: EASY_PUZZLE + "1", expect: "error" },
    { name: "letter instead of digit", input: "x" + EASY_PUZZLE.slice(1), expect: "error" },
    { name: "empty string", input: "", expect: "error" },
  ];

  for (const c of cases) {
    await t.test(c.name, () => {
      if (c.expect === "ok") {
        assert.doesNotThrow(() => parseBoard(c.input));
      } else {
        assert.throws(() => parseBoard(c.input), SudokuFormatError);
      }
    });
  }
});

test("serializeBoard round-trips through parseBoard", () => {
  const board = parseBoard(EASY_PUZZLE);
  assert.equal(serializeBoard(board), EASY_PUZZLE);
});

test("findConflicts: table of duplicate placements", async (t) => {
  const cases: Array<{ name: string; input: string; expectConflicts: boolean }> = [
    { name: "clean puzzle has no conflicts", input: EASY_PUZZLE, expectConflicts: false },
    { name: "duplicate in a row", input: "55" + EASY_PUZZLE.slice(2), expectConflicts: true },
    {
      name: "duplicate in a column",
      input: (() => {
        const b = parseBoard(EASY_PUZZLE);
        b[1][0] = b[0][0];
        return serializeBoard(b);
      })(),
      expectConflicts: true,
    },
    {
      name: "duplicate in a box",
      input: (() => {
        const b = parseBoard(EASY_PUZZLE);
        b[0][1] = 3;
        b[1][1] = 3;
        return serializeBoard(b);
      })(),
      expectConflicts: true,
    },
    { name: "all blanks has no conflicts", input: ".".repeat(81), expectConflicts: false },
  ];

  for (const c of cases) {
    await t.test(c.name, () => {
      const board = parseBoard(c.input);
      const conflicts = findConflicts(board);
      assert.equal(conflicts.length > 0, c.expectConflicts);
    });
  }
});

test("solve: known puzzle reaches the known solution", () => {
  const board = parseBoard(EASY_PUZZLE);
  const solved = solve(board);
  assert.ok(solved);
  assert.equal(serializeBoard(solved!), EASY_SOLUTION);
});

test("solve: does not mutate the input board", () => {
  const board = parseBoard(EASY_PUZZLE);
  const before = serializeBoard(board);
  solve(board);
  assert.equal(serializeBoard(board), before);
});

test("solve: a board with conflicting givens is unsolvable", () => {
  const board = parseBoard(EASY_PUZZLE);
  board[0][1] = board[0][0]; // two 5s in the same row, before any search starts
  assert.equal(solve(board), null);
});

test("solve: an already-solved board is returned as-is", () => {
  const board = parseBoard(EASY_SOLUTION);
  const solved = solve(board);
  assert.ok(solved);
  assert.equal(serializeBoard(solved!), EASY_SOLUTION);
  assert.ok(isComplete(solved!));
});

test("solve: an empty board is solvable and internally consistent", () => {
  const board = parseBoard(".".repeat(81));
  const solved = solve(board);
  assert.ok(solved);
  assert.ok(isComplete(solved!));
  assert.equal(findConflicts(solved!).length, 0);
});
