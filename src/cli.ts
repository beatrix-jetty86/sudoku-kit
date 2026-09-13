#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseBoard, formatBoard, findConflicts, solve, SudokuFormatError } from "./sudoku.js";

function readInput(source: string | undefined): string {
  if (source && source !== "-") {
    return readFileSync(source, "utf8");
  }
  return readFileSync(0, "utf8");
}

function printUsage(): void {
  console.error("usage: sudoku-kit <show|check|solve> [file]");
  console.error("  reads an 81-character puzzle (. or 0 for blanks) from a file or stdin");
}

function main(argv: string[]): number {
  const [command, source] = argv;
  if (!command || command === "--help" || command === "-h") {
    printUsage();
    return command ? 0 : 1;
  }

  if (!["show", "check", "solve"].includes(command)) {
    printUsage();
    return 1;
  }

  let raw: string;
  try {
    raw = readInput(source);
  } catch (err) {
    console.error(`could not read puzzle: ${(err as Error).message}`);
    return 1;
  }

  let board;
  try {
    board = parseBoard(raw);
  } catch (err) {
    if (err instanceof SudokuFormatError) {
      console.error(`invalid puzzle: ${err.message}`);
      return 1;
    }
    throw err;
  }

  switch (command) {
    case "show":
      console.log(formatBoard(board));
      return 0;
    case "check": {
      const conflicts = findConflicts(board);
      if (conflicts.length === 0) {
        console.log("no conflicts");
        return 0;
      }
      for (const c of conflicts) {
        console.log(`${c.value} repeats in ${c.reason} at row ${c.row + 1}, col ${c.col + 1}`);
      }
      return 1;
    }
    case "solve": {
      const solved = solve(board);
      if (!solved) {
        console.error("no solution");
        return 1;
      }
      console.log(formatBoard(solved));
      return 0;
    }
    default:
      return 1;
  }
}

process.exit(main(process.argv.slice(2)));
