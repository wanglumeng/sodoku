/**
 * 数独求解器：9x9 棋盘用二维数组表示，0 表示空格。
 * @file solver.js
 *
 * 数独工具函数（sudoku_utils）：
 * - isValid(board, row, col, num) — 检查在 (row,col) 放置 num 是否合法
 * - findEmpty(board) — 找到第一个空格，返回 { row, col }，无则 null
 * - solve(board) — 返回是否可解，同时修改原数组
 */

(function (global) {
  'use strict';

  /** 深拷贝棋盘 */
  function cloneBoard(board) {
    return board.map(function (row) {
      return row.slice();
    });
  }

  /**
   * 检查在 (row, col) 放置 num 是否满足数独规则（同行/列/宫无重复）。
   */
  function isValid(board, row, col, num) {
    for (var c = 0; c < 9; c++) {
      if (c !== col && board[row][c] === num) return false;
    }
    for (var r = 0; r < 9; r++) {
      if (r !== row && board[r][col] === num) return false;
    }
    var br = Math.floor(row / 3) * 3;
    var bc = Math.floor(col / 3) * 3;
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        var rr = br + i;
        var cc = bc + j;
        if ((rr !== row || cc !== col) && board[rr][cc] === num) return false;
      }
    }
    return true;
  }

  /** 找到第一个空格，返回 { row, col }，若无则 null */
  function findEmpty(board) {
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        if (board[r][c] === 0) return { row: r, col: c };
      }
    }
    return null;
  }

  /** Fisher–Yates 洗牌（就地修改数组） */
  function shuffleInPlace(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  /**
   * 回溯求解（1..9 顺序尝试），用于 UI「求解」与唯一解计数，速度快且确定性强。
   * @returns {boolean} 是否成功填满
   */
  function solve(board) {
    var cell = findEmpty(board);
    if (!cell) return true;
    var row = cell.row;
    var col = cell.col;
    for (var num = 1; num <= 9; num++) {
      if (isValid(board, row, col, num)) {
        board[row][col] = num;
        if (solve(board)) return true;
        board[row][col] = 0;
      }
    }
    return false;
  }

  /**
   * 随机顺序回溯填满空盘，用于生成合法终盘。
   */
  function fillBoardRandom(board) {
    var cell = findEmpty(board);
    if (!cell) return true;
    var row = cell.row;
    var col = cell.col;
    var nums = shuffleInPlace([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (var k = 0; k < 9; k++) {
      var num = nums[k];
      if (isValid(board, row, col, num)) {
        board[row][col] = num;
        if (fillBoardRandom(board)) return true;
        board[row][col] = 0;
      }
    }
    return false;
  }

  function boxIndex(row, col) {
    return ((row / 3) | 0) * 3 + ((col / 3) | 0);
  }

  /**
   * 统计解的个数（MRV + 位掩码，供生成器大量调用）。
   */
  function countSolutions(board, limit) {
    limit = limit == null ? 2 : limit;
    var rows = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    var cols = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    var boxes = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    var r, c, v, bit, bi;
    for (r = 0; r < 9; r++) {
      for (c = 0; c < 9; c++) {
        v = board[r][c];
        if (v !== 0) {
          bit = 1 << (v - 1);
          rows[r] |= bit;
          cols[c] |= bit;
          boxes[boxIndex(r, c)] |= bit;
        }
      }
    }

    function rec() {
      var bestR = -1;
      var bestC = -1;
      var minOpt = 10;
      var used;
      var n;
      var rr;
      var cc;
      for (rr = 0; rr < 9; rr++) {
        for (cc = 0; cc < 9; cc++) {
          if (board[rr][cc] !== 0) continue;
          used = rows[rr] | cols[cc] | boxes[boxIndex(rr, cc)];
          var opts = 0;
          for (n = 1; n <= 9; n++) {
            if ((used & (1 << (n - 1))) === 0) opts++;
          }
          if (opts === 0) return 0;
          if (opts < minOpt) {
            minOpt = opts;
            bestR = rr;
            bestC = cc;
            if (minOpt === 1) break;
          }
        }
        if (minOpt === 1) break;
      }
      if (bestR < 0) return 1;

      var acc = 0;
      var biLocal = boxIndex(bestR, bestC);
      used = rows[bestR] | cols[bestC] | boxes[biLocal];
      for (n = 1; n <= 9; n++) {
        if ((used & (1 << (n - 1))) !== 0) continue;
        var bitMask = 1 << (n - 1);
        board[bestR][bestC] = n;
        rows[bestR] |= bitMask;
        cols[bestC] |= bitMask;
        boxes[biLocal] |= bitMask;
        acc += rec();
        rows[bestR] ^= bitMask;
        cols[bestC] ^= bitMask;
        boxes[biLocal] ^= bitMask;
        board[bestR][bestC] = 0;
        if (acc >= limit) return acc;
      }
      return acc;
    }

    return rec();
  }

  global.SudokuSolver = {
    cloneBoard: cloneBoard,
    isValid: isValid,
    findEmpty: findEmpty,
    solve: solve,
    countSolutions: countSolutions,
    fillBoardRandom: fillBoardRandom,
  };

  /** 与 skill sudoku_utils 对齐的便捷命名空间（函数与 SudokuSolver 内相同） */
  global.sudoku_utils = {
    isValid: isValid,
    findEmpty: findEmpty,
    solve: solve,
  };
})(typeof window !== 'undefined' ? window : globalThis);
