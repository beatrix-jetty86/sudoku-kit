# sudoku-kit

A small TypeScript library for parsing, validating, and solving sudoku
boards, plus a thin CLI on top of it.

## The problem

Sudoku puzzles show up in a lot of places as plain text: an 81-character
string where each character is a digit 1-9 or a placeholder for a blank
cell. Before you can do anything useful with one you need to turn that
string into a real 9x9 grid, catch the ways the text can be malformed or
the givens can already contradict each other, and only then hand it to a
solver. This library covers those three steps and nothing else.

## Board format

A board is `.` or `0` for blank cells and `1`-`9` for filled ones, 81
characters total. Whitespace (including newlines) is ignored, so a board
can be written as one long string or as nine lines of nine characters:

```
53..7....
6..195...
.98....6.
8...6...3
4..8.3..1
7...2...6
.6....28.
...419..5
....8..79
```

## Library usage

```ts
import { parseBoard, findConflicts, solve, formatBoard } from "./src/sudoku.js";

const board = parseBoard(`
  53..7....
  6..195...
  .98....6.
  8...6...3
  4..8.3..1
  7...2...6
  .6....28.
  ...419..5
  ....8..79
`);

const conflicts = findConflicts(board);
if (conflicts.length > 0) {
  throw new Error("puzzle has contradictory givens");
}

const solved = solve(board);
if (solved) {
  console.log(formatBoard(solved));
}
```

`parseBoard` throws a `SudokuFormatError` for anything that isn't exactly
81 valid cells. `findConflicts` reports every cell that shares a row,
column, or box with a duplicate value, which is the case a solver can't
recover from on its own. `solve` returns a filled-in copy of the board, or
`null` if it's unsolvable.

`countSolutions(board, limit = 2)` counts completions of the board,
stopping as soon as it hits `limit` rather than exhausting the search
space, and `hasUniqueSolution(board)` is a thin wrapper over it. This is
what tells a real puzzle (one solution) apart from an under-constrained
grid (many) or a contradictory one (zero).

`generateSolvedBoard()` returns a random, fully filled, conflict-free
board. `generatePuzzle(minClues = 17)` builds on it: it fills a board, then
removes givens one at a time in random order, undoing any removal that
would leave more than one solution, until it either runs out of safe
removals or hits `minClues`. 17 is the fewest givens known to determine a
sudoku uniquely, so that's the default floor.

## CLI usage

Build first, then run against a file or stdin:

```
npm run build
node dist/src/cli.js show puzzle.txt
node dist/src/cli.js check puzzle.txt
node dist/src/cli.js solve puzzle.txt
cat puzzle.txt | node dist/src/cli.js solve
node dist/src/cli.js generate
node dist/src/cli.js generate 30
```

`show` pretty-prints the board, `check` lists any conflicting givens, and
`solve` prints a completed board or exits non-zero with "no solution".
`generate` prints a fresh puzzle with a unique solution; the optional
argument sets the minimum number of givens (default and floor: 17).

## Testing

Tests use Node's built-in test runner, so there's nothing extra to
install:

```
npm test
```

The suite is table-driven and deliberately pokes at the awkward cases:
mixed blank characters, wrong-length input, boards with newlines in them,
duplicate givens in a row/column/box, an already-solved board, and an
empty board that has to be solved from scratch.

## Status

Early skeleton: parsing, conflict detection, a backtracking solver,
solution counting for uniqueness checks, and a puzzle generator. No
difficulty rating yet, and the CLI only handles one puzzle per run.
