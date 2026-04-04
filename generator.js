/**
 * 数独题目生成：随机终盘 + 按难度挖空并保证唯一解。
 * 依赖全局 SudokuSolver（solver.js 须先加载）。
 * @file generator.js
 */

(function (global) {
  'use strict';

  var S = function () {
    return global.SudokuSolver;
  };

  /** 难度：空格数量（与 spec 一致） */
  var BLANKS_BY_DIFFICULTY = {
    easy: 40,
    medium: 50,
    hard: 60,
  };

  function emptyBoard() {
    var b = [];
    for (var r = 0; r < 9; r++) {
      b[r] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
    return b;
  }

  /**
   * 生成一盘完整合法终盘（随机分布）。
   */
  function generateFullBoard() {
    var board = emptyBoard();
    S().fillBoardRandom(board);
    return board;
  }

  function shuffleIndices() {
    var idx = [];
    for (var i = 0; i < 81; i++) idx.push(i);
    for (var j = 80; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var t = idx[j];
      idx[j] = idx[k];
      idx[k] = t;
    }
    return idx;
  }

  /**
   * 在完整终盘上挖空，保证剩余谜题唯一解；targetBlanks 为目标空格数。
   * 每轮按随机顺序尝试所有非空格；一轮中后移除的格可能使先前失败的格变为可挖，故多轮直至无进展。
   */
  function digUnique(fullBoard, targetBlanks) {
    var puzzle = S().cloneBoard(fullBoard);
    var currentBlanks = 0;
    var sweeps = 0;
    var maxSweeps = 80;

    while (currentBlanks < targetBlanks && sweeps < maxSweeps) {
      sweeps++;
      var order = shuffleIndices();
      var madeProgress = false;
      for (var o = 0; o < 81 && currentBlanks < targetBlanks; o++) {
        var flat = order[o];
        var r = Math.floor(flat / 9);
        var c = flat % 9;
        if (puzzle[r][c] === 0) continue;
        var saved = puzzle[r][c];
        puzzle[r][c] = 0;
        var trial = S().cloneBoard(puzzle);
        if (S().countSolutions(trial, 2) === 1) {
          currentBlanks++;
          madeProgress = true;
        } else {
          puzzle[r][c] = saved;
        }
      }
      if (!madeProgress) break;
    }

    return { puzzle: puzzle, blanks: currentBlanks };
  }

  /**
   * 生成一道题：{ puzzle, solution }。
   * @param {string} difficulty 'easy' | 'medium' | 'hard'
   */
  function generatePuzzle(difficulty) {
    var target = BLANKS_BY_DIFFICULTY[difficulty];
    if (target == null) target = BLANKS_BY_DIFFICULTY.medium;

    var maxAttempts = 12;
    var best = null;
    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      var solution = generateFullBoard();
      var result = digUnique(solution, target);
      if (!best || result.blanks > best.blanks) {
        best = { puzzle: result.puzzle, solution: S().cloneBoard(solution), blanks: result.blanks };
      }
      if (result.blanks >= target) {
        return {
          puzzle: result.puzzle,
          solution: S().cloneBoard(solution),
        };
      }
    }

    return {
      puzzle: best.puzzle,
      solution: best.solution,
    };
  }

  global.SudokuGenerator = {
    emptyBoard: emptyBoard,
    generateFullBoard: generateFullBoard,
    generatePuzzle: generatePuzzle,
    BLANKS_BY_DIFFICULTY: BLANKS_BY_DIFFICULTY,
  };
})(typeof window !== 'undefined' ? window : globalThis);
