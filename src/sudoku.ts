export const SIZE = 9;
export const BOX = 3;

export type Board = number[][];

export class SudokuFormatError extends Error {}

/**
 * Accepts an 81-character puzzle string. Blanks may be written as "." or
 * "0". Whitespace (including newlines, so a puzzle can be pasted as nine
 * lines of nine characters) is stripped before parsing.
 */
export function parseBoard(input: string): Board {
  const cleaned = input.replace(/\s+/g, "");
  if (cleaned.length !== SIZE * SIZE) {
    throw new SudokuFormatError(
      `expected ${SIZE * SIZE} cells, got ${cleaned.length}`
    );
  }

  const board: Board = [];
  for (let r = 0; r < SIZE; r++) {
    const row: number[] = [];
    for (let c = 0; c < SIZE; c++) {
      const ch = cleaned[r * SIZE + c];
      if (ch === "." || ch === "0") {
        row.push(0);
      } else if (ch >= "1" && ch <= "9") {
        row.push(Number(ch));
      } else {
        throw new SudokuFormatError(
          `unexpected character ${JSON.stringify(ch)} at position ${r * SIZE + c}`
        );
      }
    }
    board.push(row);
  }
  return board;
}

export function serializeBoard(board: Board): string {
  return board.map((row) => row.map((v) => (v === 0 ? "." : String(v))).join("")).join("");
}

export function formatBoard(board: Board): string {
  const lines: string[] = [];
  for (let r = 0; r < SIZE; r++) {
    if (r > 0 && r % BOX === 0) lines.push("------+-------+------");
    const cells = board[r].map((v, c) => {
      const s = v === 0 ? "." : String(v);
      return c > 0 && c % BOX === 0 ? `| ${s}` : s;
    });
    lines.push(cells.join(" "));
  }
  return lines.join("\n");
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

export function isComplete(board: Board): boolean {
  return board.every((row) => row.every((v) => v !== 0));
}

export interface Conflict {
  row: number;
  col: number;
  value: number;
  reason: "row" | "column" | "box";
}

/**
 * Reports every cell that shares a row, column, or box with another cell
 * holding the same value. A puzzle with givens that already contradict each
 * other (the case a solver can't recover from) shows up here first.
 */
export function findConflicts(board: Board): Conflict[] {
  const conflicts: Conflict[] = [];

  const checkGroup = (cells: Array<[number, number]>, reason: Conflict["reason"]) => {
    const seen = new Map<number, [number, number]>();
    for (const [r, c] of cells) {
      const value = board[r][c];
      if (value === 0) continue;
      const prior = seen.get(value);
      if (prior) {
        conflicts.push({ row: r, col: c, value, reason });
        conflicts.push({ row: prior[0], col: prior[1], value, reason });
      } else {
        seen.set(value, [r, c]);
      }
    }
  };

  for (let r = 0; r < SIZE; r++) {
    checkGroup(
      Array.from({ length: SIZE }, (_, c) => [r, c] as [number, number]),
      "row"
    );
  }
  for (let c = 0; c < SIZE; c++) {
    checkGroup(
      Array.from({ length: SIZE }, (_, r) => [r, c] as [number, number]),
      "column"
    );
  }
  for (let br = 0; br < SIZE; br += BOX) {
    for (let bc = 0; bc < SIZE; bc += BOX) {
      const cells: Array<[number, number]> = [];
      for (let r = br; r < br + BOX; r++) {
        for (let c = bc; c < bc + BOX; c++) cells.push([r, c]);
      }
      checkGroup(cells, "box");
    }
  }
  return conflicts;
}

/**
 * Backtracking solver. Returns a new board with every cell filled in, or
 * null if the givens contradict each other or admit no completion.
 */
export function solve(board: Board): Board | null {
  const working = cloneBoard(board);
  if (findConflicts(working).length > 0) return null;
  return backtrack(working) ? working : null;
}

function backtrack(board: Board): boolean {
  const spot = findEmptyCell(board);
  if (!spot) return true;
  const [row, col] = spot;
  for (let value = 1; value <= SIZE; value++) {
    if (canPlace(board, row, col, value)) {
      board[row][col] = value;
      if (backtrack(board)) return true;
      board[row][col] = 0;
    }
  }
  return false;
}

function findEmptyCell(board: Board): [number, number] | null {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) return [r, c];
    }
  }
  return null;
}

interface CountState {
  count: number;
  limit: number;
}

function countBacktrack(board: Board, state: CountState): void {
  if (state.count >= state.limit) return;
  const spot = findEmptyCell(board);
  if (!spot) {
    state.count++;
    return;
  }
  const [row, col] = spot;
  for (let value = 1; value <= SIZE; value++) {
    if (state.count >= state.limit) return;
    if (canPlace(board, row, col, value)) {
      board[row][col] = value;
      countBacktrack(board, state);
      board[row][col] = 0;
    }
  }
}

/**
 * Counts completions of the board, stopping as soon as `limit` is reached
 * so a puzzle with many solutions doesn't cost a full search. The default
 * limit of 2 is exactly what's needed to tell "unique" from "not unique"
 * without counting the rest.
 */
export function countSolutions(board: Board, limit = 2): number {
  if (limit < 1) throw new RangeError("limit must be at least 1");
  const working = cloneBoard(board);
  if (findConflicts(working).length > 0) return 0;
  const state: CountState = { count: 0, limit };
  countBacktrack(working, state);
  return state.count;
}

export function hasUniqueSolution(board: Board): boolean {
  return countSolutions(board, 2) === 1;
}

function shuffledValues(): number[] {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

function fillRandomly(board: Board): boolean {
  const spot = findEmptyCell(board);
  if (!spot) return true;
  const [row, col] = spot;
  for (const value of shuffledValues()) {
    if (canPlace(board, row, col, value)) {
      board[row][col] = value;
      if (fillRandomly(board)) return true;
      board[row][col] = 0;
    }
  }
  return false;
}

/**
 * Produces a random, fully filled, internally consistent board by running
 * the same backtracking search as `solve` against an empty board, but with
 * values tried in random order instead of ascending. Useful on its own, and
 * as the starting point for `generatePuzzle`.
 */
export function generateSolvedBoard(): Board {
  const board: Board = Array.from({ length: SIZE }, () => new Array(SIZE).fill(0));
  fillRandomly(board);
  return board;
}

/**
 * Builds a puzzle by filling a random solved board, then knocking out
 * givens one at a time in random order, undoing any removal that would
 * leave more than one solution. Stops once no remaining cell can be removed
 * without breaking uniqueness, or once `minClues` is reached, whichever
 * comes first. 17 is the smallest number of givens known to admit a unique
 * solution, so that's the floor.
 */
export function generatePuzzle(minClues = 17): Board {
  if (minClues < 17) throw new RangeError("minClues must be at least 17");
  const board = generateSolvedBoard();

  const positions: Array<[number, number]> = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) positions.push([r, c]);
  }
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  let clues = SIZE * SIZE;
  for (const [row, col] of positions) {
    if (clues <= minClues) break;
    const saved = board[row][col];
    board[row][col] = 0;
    if (hasUniqueSolution(board)) {
      clues--;
    } else {
      board[row][col] = saved;
    }
  }
  return board;
}

function canPlace(board: Board, row: number, col: number, value: number): boolean {
  for (let i = 0; i < SIZE; i++) {
    if (board[row][i] === value) return false;
    if (board[i][col] === value) return false;
  }
  const br = row - (row % BOX);
  const bc = col - (col % BOX);
  for (let r = br; r < br + BOX; r++) {
    for (let c = bc; c < bc + BOX; c++) {
      if (board[r][c] === value) return false;
    }
  }
  return true;
}
