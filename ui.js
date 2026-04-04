/**
 * 数独界面：棋盘、数字条、冲突与同数高亮、新游戏/检查/求解。
 * 依赖 SudokuSolver、SudokuGenerator（按顺序先加载）。
 * @file ui.js
 */

(function () {
  'use strict';

  var boardEl = document.getElementById('board');
  var paletteEl = document.getElementById('palette');
  var messageEl = document.getElementById('message');
  var modal = document.getElementById('modal-difficulty');
  var btnNew = document.getElementById('btn-new');
  var btnCheck = document.getElementById('btn-check');
  var btnSolve = document.getElementById('btn-solve');
  var btnTheme = document.getElementById('btn-theme');
  var btnModalCancel = document.getElementById('modal-cancel');
  var victoryModal = document.getElementById('modal-victory');
  var btnVictoryClose = document.getElementById('victory-close');

  /** @type {number[][]} */
  var board = [];
  /** @type {boolean[][]} 题目初始格，不可改 */
  var given = [];
  /** @type {number[][]} */
  var solution = [];
  /** @type {{row:number,col:number}|null} */
  var selected = null;
  /** 同数字高亮：0 表示无 */
  var highlightDigit = 0;
  /** 检查谜题后错误格的 key Set("r,c") */
  var wrongCells = null;

  var cells = [];
  /** URL ?kbdlog=1 时写入 sessionStorage.debug924cd9 供底部面板显示 */
  var kbdLogEnabled = false;
  /** 隐藏 input：IME/数字键在可编辑控件上才稳定，焦点从格子移入此 input 承接按键 */
  var keyProxy = null;
  /** @type {{row:number,col:number}|null} */
  var keyProxyTarget = null;

  function pushKbdDebugEntry(payload) {
    if (!kbdLogEnabled) return;
    try {
      var ring = JSON.parse(sessionStorage.getItem('debug924cd9') || '[]');
      var row = {
        sessionId: '924cd9',
        timestamp: Date.now(),
        runId: 'kbd-panel',
        location: 'ui.js:pushKbdDebugEntry',
      };
      for (var k in payload) {
        if (Object.prototype.hasOwnProperty.call(payload, k)) row[k] = payload[k];
      }
      ring.push(row);
      if (ring.length > 100) ring = ring.slice(-100);
      sessionStorage.setItem('debug924cd9', JSON.stringify(ring));
    } catch (e) {
      try {
        sessionStorage.setItem('debug924cd9_err', String(e));
      } catch (e2) {}
    }
  }

  function emptyMatrix() {
    var m = [];
    for (var r = 0; r < 9; r++) {
      m[r] = [false, false, false, false, false, false, false, false, false];
    }
    return m;
  }

  function setMessage(text) {
    messageEl.textContent = text || '';
  }

  /** 统计同行/列/宫内重复的非空格，返回 Set "r,c" */
  function conflictKeys(b) {
    var set = new Set();
    function scan(positions) {
      var map = {};
      for (var i = 0; i < positions.length; i++) {
        var r = positions[i][0];
        var c = positions[i][1];
        var v = b[r][c];
        if (v === 0) continue;
        if (!map[v]) map[v] = [];
        map[v].push([r, c]);
      }
      for (var k in map) {
        if (map[k].length > 1) {
          for (var j = 0; j < map[k].length; j++) {
            set.add(map[k][j][0] + ',' + map[k][j][1]);
          }
        }
      }
    }
    var r, c, br, bc, i, j;
    for (r = 0; r < 9; r++) {
      var row = [];
      for (c = 0; c < 9; c++) row.push([r, c]);
      scan(row);
    }
    for (c = 0; c < 9; c++) {
      var col = [];
      for (r = 0; r < 9; r++) col.push([r, c]);
      scan(col);
    }
    for (br = 0; br < 3; br++) {
      for (bc = 0; bc < 3; bc++) {
        var box = [];
        for (i = 0; i < 3; i++) {
          for (j = 0; j < 3; j++) box.push([br * 3 + i, bc * 3 + j]);
        }
        scan(box);
      }
    }
    return set;
  }

  /** 各数字 1–9 在盘上出现次数 */
  function digitCounts(b) {
    var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        var v = b[r][c];
        if (v >= 1 && v <= 9) counts[v]++;
      }
    }
    return counts;
  }

  function buildBoardDom() {
    boardEl.innerHTML = '';
    cells = [];
    for (var r = 0; r < 9; r++) {
      cells[r] = [];
      for (var c = 0; c < 9; c++) {
        /** 不用 button：部分环境下中文 IME 对 button 不落数字 keydown；可聚焦 div 更利于 IME/beforeinput */
        var el = document.createElement('div');
        el.className = 'cell';
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        el.dataset.row = String(r);
        el.dataset.col = String(c);
        var activateCell = onCellActivate.bind(null, r, c);
        el.addEventListener('mousedown', activateCell);
        el.addEventListener('click', activateCell);
        boardEl.appendChild(el);
        cells[r][c] = el;
      }
    }
  }

  function buildPalette() {
    paletteEl.innerHTML = '';
    for (var n = 1; n <= 9; n++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'palette-btn';
      b.textContent = String(n);
      b.dataset.digit = String(n);
      b.addEventListener('click', onPaletteClick.bind(null, n));
      paletteEl.appendChild(b);
    }
  }

  function render() {
    var conflicts = conflictKeys(board);
    var counts = digitCounts(board);
    var paletteBtns = paletteEl.querySelectorAll('.palette-btn');

    for (var n = 1; n <= 9; n++) {
      var pb = paletteBtns[n - 1];
      if (pb) pb.disabled = counts[n] >= 9;
    }

    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        var el = cells[r][c];
        var v = board[r][c];
        el.textContent = v ? String(v) : '';
        el.classList.toggle('given', given[r][c]);
        el.classList.toggle('selected', selected && selected.row === r && selected.col === c);
        el.classList.toggle('same-digit', highlightDigit > 0 && v === highlightDigit);
        el.classList.toggle('conflict', v !== 0 && conflicts.has(r + ',' + c));
        el.classList.toggle('wrong', wrongCells != null && wrongCells.has(r + ',' + c));
      }
    }
  }

  function selectCell(r, c) {
    selected = { row: r, col: c };
    var v = board[r][c];
    highlightDigit = v > 0 ? v : 0;
    render();
  }

  function onBoardFocusIn(ev) {
    var t = ev && ev.target;
    if (t && t.classList && t.classList.contains('cell') && keyProxy) {
      var fr = parseInt(t.dataset.row, 10);
      var fc = parseInt(t.dataset.col, 10);
      if (!isNaN(fr) && !isNaN(fc)) {
        keyProxyTarget = { row: fr, col: fc };
        requestAnimationFrame(function () {
          try {
            keyProxy.focus({ preventScroll: true });
          } catch (e) {
            keyProxy.focus();
          }
        });
      }
    }
    syncSelectionFromFocusedCell();
  }

  /** mousedown 先于 click，便于未获得焦点前即同步 selected 与 focus（部分浏览器仅点按不聚焦 button） */
  function onCellActivate(r, c) {
    selectCell(r, c);
    try {
      cells[r][c].focus({ preventScroll: true });
    } catch (e) {
      cells[r][c].focus();
    }
    if (board[r][c] > 0) highlightDigit = board[r][c];
    render();
  }

  function onPaletteClick(n) {
    if (!selected) return;
    var r = selected.row;
    var c = selected.col;
    if (given[r][c]) return;
    board[r][c] = n;
    highlightDigit = n;
    clearWrongMarks();
    setMessage('');
    render();
    showVictoryIfSolved();
  }

  function clearWrongMarks() {
    wrongCells = null;
  }

  /** 主键盘数字行 Digit1–9、小键盘 Numpad1–9（按物理键 code，避免部分布局下 key 非 1–9） */
  var DIGIT_BY_CODE = {
    Digit1: 1,
    Digit2: 2,
    Digit3: 3,
    Digit4: 4,
    Digit5: 5,
    Digit6: 6,
    Digit7: 7,
    Digit8: 8,
    Digit9: 9,
    Numpad1: 1,
    Numpad2: 2,
    Numpad3: 3,
    Numpad4: 4,
    Numpad5: 5,
    Numpad6: 6,
    Numpad7: 7,
    Numpad8: 8,
    Numpad9: 9,
  };

  /** 单个字符 → 1–9（ASCII / 全角）；否则 null */
  function digitFromSingleChar(ch) {
    if (!ch || ch.length !== 1) return null;
    if (ch >= '1' && ch <= '9') return parseInt(ch, 10);
    var cp = ch.charCodeAt(0);
    if (cp >= 0xff11 && cp <= 0xff19) return cp - 0xff11 + 1;
    return null;
  }

  /** 主键盘 1–9、全角 １–９、Digit1–9、小键盘 Numpad1–9 */
  function digitFromKeyboard(ev) {
    var k = ev.key || '';
    var byChar = digitFromSingleChar(k);
    if (byChar != null) return byChar;
    var n = DIGIT_BY_CODE[ev.code];
    return n == null ? null : n;
  }

  /** Tab 聚焦到格子时不会触发 click，须与 document.activeElement 对齐 */
  function syncSelectionFromFocusedCell() {
    var ae = document.activeElement;
    if (keyProxy && ae === keyProxy && keyProxyTarget) {
      var kr = keyProxyTarget.row;
      var kc = keyProxyTarget.col;
      if (!selected || selected.row !== kr || selected.col !== kc) selectCell(kr, kc);
      return;
    }
    if (!ae || !ae.classList || !ae.classList.contains('cell')) return;
    var r = parseInt(ae.dataset.row, 10);
    var c = parseInt(ae.dataset.col, 10);
    if (isNaN(r) || isNaN(c) || r < 0 || r > 8 || c < 0 || c > 8) return;
    if (selected && selected.row === r && selected.col === c) return;
    selectCell(r, c);
  }

  /** 对指定格处理键盘；焦点在格子上时应用，不依赖全局 selected 是否已同步 */
  function applyKeyToCell(ev, r, c) {
    if (ev.isComposing) return false;
    if (ev.ctrlKey || ev.altKey || ev.metaKey) return false;
    if (given[r][c]) return false;

    var k = ev.key;
    if (k === 'Backspace' || k === 'Delete') {
      ev.preventDefault();
      board[r][c] = 0;
      selected = { row: r, col: c };
      highlightDigit = board[r][c] > 0 ? board[r][c] : 0;
      clearWrongMarks();
      setMessage('');
      render();
      if (keyProxy && document.activeElement === keyProxy) {
        try {
          keyProxy.value = '';
        } catch (e1) {}
      }
      return true;
    }
    var d = digitFromKeyboard(ev);
    if (d != null) {
      ev.preventDefault();
      board[r][c] = d;
      selected = { row: r, col: c };
      highlightDigit = d;
      clearWrongMarks();
      setMessage('');
      render();
      showVictoryIfSolved();
      if (keyProxy && document.activeElement === keyProxy) {
        try {
          keyProxy.value = '';
        } catch (e2) {}
      }
      return true;
    }
    return false;
  }

  function tryApplyBoardKey(ev) {
    syncSelectionFromFocusedCell();
    if (!selected) return false;
    return applyKeyToCell(ev, selected.row, selected.col);
  }

  /** compositionend / beforeinput / textInput 等路径统一写盘并打 kbd 日志 */
  function tryApplyDigitFromImeString(r, c, raw, logMsg) {
    if (given[r][c]) return;
    var d = digitFromSingleChar(raw || '');
    // #region agent log
    if (kbdLogEnabled) {
      pushKbdDebugEntry({
        hypothesisId: 'H_ime_string',
        message: logMsg || 'ime string',
        data: { r: r, c: c, raw: raw, parsedDigit: d },
      });
    }
    // #endregion
    if (d == null) return;
    board[r][c] = d;
    selected = { row: r, col: c };
    highlightDigit = d;
    clearWrongMarks();
    setMessage('');
    render();
    showVictoryIfSolved();
  }

  function onBoardCompositionStart(ev) {
    if (!kbdLogEnabled) return;
    var t = ev.target;
    if (!t || !t.classList || !t.classList.contains('cell')) return;
    pushKbdDebugEntry({
      hypothesisId: 'H_compositionstart',
      message: 'compositionstart cell',
      data: {},
    });
  }

  /** 中文等 IME：数字常不产生可识别的 keydown，在 compositionend 取最终字符 */
  function onBoardCompositionEnd(ev) {
    var t = ev.target;
    if (!t || !t.classList || !t.classList.contains('cell')) return;
    clearStaleAppInert();
    if (anyModalBlocking()) return;
    var r = parseInt(t.dataset.row, 10);
    var c = parseInt(t.dataset.col, 10);
    if (isNaN(r) || isNaN(c) || r < 0 || r > 8 || c < 0 || c > 8) return;
    tryApplyDigitFromImeString(r, c, ev.data || '', 'compositionend on cell');
  }

  /** 部分 Chromium/WebKit：数字经 beforeinput 送达，仍无 keydown */
  function onDocumentBeforeInputCapture(ev) {
    var t = ev.target;
    if (keyProxy && t === keyProxy && keyProxyTarget) {
      var itp = ev.inputType || '';
      // #region agent log
      if (kbdLogEnabled) {
        pushKbdDebugEntry({
          hypothesisId: 'H_beforeinput_proxy',
          message: 'beforeinput keyProxy',
          data: { inputType: itp, data: ev.data },
        });
      }
      // #endregion
      if (itp !== 'insertText' && itp !== 'insertCompositionText' && itp !== 'insertReplacementText') return;
      if (digitFromSingleChar(ev.data || '') == null) return;
      if (ev.cancelable) ev.preventDefault();
      clearStaleAppInert();
      if (anyModalBlocking()) return;
      tryApplyDigitFromImeString(keyProxyTarget.row, keyProxyTarget.col, ev.data || '', 'beforeinput keyproxy');
      return;
    }
    if (!t || !t.classList || !t.classList.contains('cell') || !boardEl.contains(t)) return;
    var it = ev.inputType || '';
    // #region agent log
    if (kbdLogEnabled) {
      pushKbdDebugEntry({
        hypothesisId: 'H_beforeinput_raw',
        message: 'beforeinput cell',
        data: { inputType: it, data: ev.data },
      });
    }
    // #endregion
    if (it !== 'insertText' && it !== 'insertCompositionText' && it !== 'insertReplacementText') return;
    var r = parseInt(t.dataset.row, 10);
    var c = parseInt(t.dataset.col, 10);
    if (isNaN(r) || isNaN(c) || r < 0 || r > 8 || c < 0 || c > 8) return;
    if (digitFromSingleChar(ev.data || '') == null) return;
    if (ev.cancelable) ev.preventDefault();
    clearStaleAppInert();
    if (anyModalBlocking()) return;
    tryApplyDigitFromImeString(r, c, ev.data || '', 'beforeinput digit');
  }

  /** WebKit 遗留 textInput：IME 数字偶发只走此事件 */
  function onBoardTextInput(ev) {
    var t = ev.target;
    if (!t || !t.classList || !t.classList.contains('cell')) return;
    // #region agent log
    if (kbdLogEnabled) {
      pushKbdDebugEntry({
        hypothesisId: 'H_textInput_raw',
        message: 'textInput cell',
        data: { data: ev.data },
      });
    }
    // #endregion
    if (ev.data == null || ev.data === '' || digitFromSingleChar(ev.data) == null) return;
    if (ev.preventDefault) ev.preventDefault();
    clearStaleAppInert();
    if (anyModalBlocking()) return;
    var r = parseInt(t.dataset.row, 10);
    var c = parseInt(t.dataset.col, 10);
    if (isNaN(r) || isNaN(c) || r < 0 || r > 8 || c < 0 || c > 8) return;
    tryApplyDigitFromImeString(r, c, ev.data, 'textInput digit');
  }

  function onKeyProxyCompositionEnd(ev) {
    if (!keyProxyTarget) return;
    clearStaleAppInert();
    if (anyModalBlocking()) return;
    tryApplyDigitFromImeString(keyProxyTarget.row, keyProxyTarget.col, ev.data || '', 'keyproxy compositionend');
    try {
      keyProxy.value = '';
    } catch (e) {}
  }

  function ensureKeyProxy() {
    if (keyProxy) return;
    keyProxy = document.createElement('input');
    keyProxy.type = 'text';
    keyProxy.setAttribute('inputmode', 'numeric');
    keyProxy.setAttribute('autocomplete', 'off');
    keyProxy.setAttribute('aria-label', '棋格数字输入');
    keyProxy.style.cssText =
      'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;margin:0;padding:0;border:0;pointer-events:none;';
    keyProxy.addEventListener('compositionend', onKeyProxyCompositionEnd, false);
    document.body.appendChild(keyProxy);
  }

  function onGlobalFocusIn(ev) {
    if (!keyProxy) return;
    var t = ev.target;
    if (t === keyProxy) return;
    if (t && t.classList && t.classList.contains('cell') && boardEl.contains(t)) return;
    keyProxyTarget = null;
  }

  function anyModalBlocking() {
    try {
      if (modal && modal.open) return true;
      if (victoryModal && victoryModal.open) return true;
    } catch (e) {}
    return false;
  }

  /** 棋盘捕获：keydown.target 即为当前焦点格（比仅用 selected 可靠） */
  function onBoardKeydownCapture(ev) {
    // #region agent log
    if (kbdLogEnabled) {
      var t0 = ev.target;
      pushKbdDebugEntry({
        hypothesisId: 'H_board_any',
        message: 'board keydown capture',
        data: {
          key: ev.key,
          code: ev.code,
          tagName: t0 && t0.tagName,
          cell: !!(t0 && t0.classList && t0.classList.contains('cell')),
        },
      });
    }
    // #endregion
    var t = ev.target;
    if (!t || !t.classList || !t.classList.contains('cell')) return;
    if (ev.key === ' ' || ev.key === 'Enter') ev.preventDefault();
    var r = parseInt(t.dataset.row, 10);
    var c = parseInt(t.dataset.col, 10);
    if (isNaN(r) || isNaN(c) || r < 0 || r > 8 || c < 0 || c > 8) return;
    // #region agent log
    try {
      var isDig =
        (ev.key && ev.key.length === 1 && ev.key >= '1' && ev.key <= '9') ||
        /^Digit[1-9]$/.test(ev.code || '') ||
        /^Numpad[1-9]$/.test(ev.code || '');
      if (isDig || ev.key === 'Backspace' || ev.key === 'Delete') {
        var row = {
          sessionId: '924cd9',
          runId: 'board-cap',
          hypothesisId: 'H_target_cell',
          location: 'ui.js:onBoardKeydownCapture',
          message: 'keydown on cell',
          data: {
            r: r,
            c: c,
            key: ev.key,
            code: ev.code,
            blocked: anyModalBlocking(),
            given: given[r][c],
          },
          timestamp: Date.now(),
        };
        fetch('http://127.0.0.1:7740/ingest/fd127fc0-0b90-4fc7-8150-858d279b2f78', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '924cd9' },
          body: JSON.stringify(row),
        }).catch(function () {});
      }
    } catch (e) {}
    // #endregion
    clearStaleAppInert();
    if (anyModalBlocking()) return;
    applyKeyToCell(ev, r, c);
  }

  function boardIsSolved() {
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        if (board[r][c] !== solution[r][c]) return false;
      }
    }
    return true;
  }

  function restartVictoryPenguinAnimations() {
    if (!victoryModal) return;
    var sel = victoryModal.querySelectorAll(
      '.penguin, .penguin-flipper-l, .penguin-flipper-r, .penguin-foot-l, .penguin-foot-r'
    );
    requestAnimationFrame(function () {
      for (var i = 0; i < sel.length; i++) sel[i].style.animation = 'none';
      void victoryModal.offsetHeight;
      requestAnimationFrame(function () {
        for (var j = 0; j < sel.length; j++) sel[j].style.removeProperty('animation');
      });
    });
  }

  function clearVictoryPenguinInlineAnim() {
    if (!victoryModal) return;
    var sel = victoryModal.querySelectorAll(
      '.penguin, .penguin-flipper-l, .penguin-flipper-r, .penguin-foot-l, .penguin-foot-r'
    );
    for (var k = 0; k < sel.length; k++) sel[k].style.removeProperty('animation');
  }

  function showVictoryCelebration() {
    if (!victoryModal || victoryModal.open) return;
    try {
      victoryModal.showModal();
    } catch (e) {}
    restartVictoryPenguinAnimations();
  }

  function showVictoryIfSolved() {
    if (boardIsSolved()) showVictoryCelebration();
  }

  function onDocumentKeydown(ev) {
    // #region agent log
    if (kbdLogEnabled) {
      var dt = ev.target;
      pushKbdDebugEntry({
        hypothesisId: 'H_doc_keydown',
        message: 'document keydown capture',
        data: {
          key: ev.key,
          code: ev.code,
          isComposing: !!ev.isComposing,
          tag: dt && dt.tagName,
          cls: dt && dt.className,
        },
      });
    }
    // #endregion
    clearStaleAppInert();
    if (anyModalBlocking()) return;
    var t = ev.target;
    if (t && t.tagName) {
      var tag = t.tagName.toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (!(keyProxy && t === keyProxy && keyProxyTarget)) return;
      }
    }
    tryApplyBoardKey(ev);
  }

  function startGame(difficulty) {
    try {
      if (victoryModal && victoryModal.open) victoryModal.close();
    } catch (e) {}
    var pack = SudokuGenerator.generatePuzzle(difficulty);
    solution = pack.solution;
    given = emptyMatrix();
    board = SudokuSolver.cloneBoard(pack.puzzle);
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        if (pack.puzzle[r][c] !== 0) given[r][c] = true;
      }
    }
    selected = null;
    highlightDigit = 0;
    keyProxyTarget = null;
    try {
      if (keyProxy && document.activeElement === keyProxy) keyProxy.blur();
    } catch (e) {}
    clearWrongMarks();
    setMessage('新局已开始。');
    render();
    clearStaleAppInert();
  }

  function checkPuzzle() {
    var conflicts = conflictKeys(board);
    if (conflicts.size > 0) {
      setMessage('存在冲突，请修正标红的格子。');
      render();
      return;
    }
    var wrong = [];
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          setMessage('还有空格未填。');
          return;
        }
        if (board[r][c] !== solution[r][c]) wrong.push([r, c]);
      }
    }
    if (wrong.length > 0) {
      wrongCells = new Set();
      for (var i = 0; i < wrong.length; i++) {
        wrongCells.add(wrong[i][0] + ',' + wrong[i][1]);
      }
      setMessage('有 ' + wrong.length + ' 格与解答不符（已标记）。');
      render();
      return;
    }
    setMessage('恭喜，全部正确！');
    showVictoryCelebration();
  }

  function solvePuzzle() {
    var work = SudokuSolver.cloneBoard(board);
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        if (!given[r][c]) work[r][c] = solution[r][c];
      }
    }
    board = work;
    clearWrongMarks();
    setMessage('已填入参考解答。');
    render();
    showVictoryIfSolved();
  }

  function initTheme() {
    var saved = localStorage.getItem('sudoku-theme');
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.setAttribute('data-theme', saved);
      return;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme') || 'light';
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('sudoku-theme', next);
  }

  function forceDialogShut(d) {
    if (!d) return;
    try {
      d.close();
    } catch (e) {}
    try {
      d.removeAttribute('open');
    } catch (e2) {}
  }

  function closeAllDialogs() {
    forceDialogShut(modal);
    forceDialogShut(victoryModal);
  }

  /** 弹窗已关但主区仍带 inert 时，键盘事件会被吞掉（多见于 dialog 状态异常） */
  function clearStaleAppInert() {
    try {
      var app = document.querySelector('.app');
      if (!app || !app.hasAttribute('inert')) return;
      var md = false;
      var vm = false;
      try {
        md = !!(modal && modal.open);
      } catch (e) {}
      try {
        vm = !!(victoryModal && victoryModal.open);
      } catch (e2) {}
      if (!md && !vm) app.removeAttribute('inert');
    } catch (e3) {}
  }

  /** 地址栏加 ?kbdlog=1 时在页面底部显示 debug924cd9，无需在控制台输入 */
  function startKbdLogPanel() {
    var title = document.createElement('div');
    title.textContent = '键盘调试（?kbdlog=1）← sessionStorage.debug924cd9，约每 0.8s 刷新';
    title.style.cssText =
      'position:fixed;bottom:40%;left:0;right:0;padding:6px 10px;font:12px/1.4 system-ui;background:#1e293b;color:#e2e8f0;z-index:99999;border-top:1px solid #334155;';
    var pre = document.createElement('pre');
    pre.id = 'kbd-debug-panel';
    pre.setAttribute('aria-live', 'polite');
    pre.style.cssText =
      'position:fixed;bottom:0;left:0;right:0;max-height:40vh;overflow:auto;margin:0;padding:10px;font:11px/1.45 ui-monospace,monospace;background:rgba(15,23,42,.95);color:#cbd5e1;z-index:99999;white-space:pre-wrap;word-break:break-all;';
    document.body.appendChild(title);
    document.body.appendChild(pre);
    function refresh() {
      try {
        pre.textContent = JSON.stringify(JSON.parse(sessionStorage.getItem('debug924cd9') || '[]'), null, 2);
      } catch (e) {
        pre.textContent = String(e);
      }
    }
    refresh();
    setInterval(refresh, 800);
  }

  function init() {
    kbdLogEnabled = /[?&]kbdlog=1(?:&|$)/.test(location.search);
    ensureKeyProxy();
    initTheme();
    closeAllDialogs();
    buildBoardDom();
    document.addEventListener('focusin', onGlobalFocusIn, true);
    boardEl.addEventListener('focusin', onBoardFocusIn);
    boardEl.addEventListener('keydown', onBoardKeydownCapture, true);
    boardEl.addEventListener('compositionend', onBoardCompositionEnd, false);
    boardEl.addEventListener('compositionstart', onBoardCompositionStart, false);
    boardEl.addEventListener('textInput', onBoardTextInput, false);
    document.addEventListener('beforeinput', onDocumentBeforeInputCapture, true);
    buildPalette();
    btnNew.addEventListener('click', function () {
      modal.showModal();
    });
    btnModalCancel.addEventListener('click', function () {
      modal.close();
    });
    var diffBtns = modal.querySelectorAll('[data-difficulty]');
    for (var di = 0; di < diffBtns.length; di++) {
      diffBtns[di].addEventListener('click', function () {
        var d = this.getAttribute('data-difficulty');
        modal.close();
        if (d === 'easy' || d === 'medium' || d === 'hard') startGame(d);
      });
    }
    btnCheck.addEventListener('click', checkPuzzle);
    btnSolve.addEventListener('click', solvePuzzle);
    btnTheme.addEventListener('click', toggleTheme);
    if (victoryModal) {
      victoryModal.addEventListener('close', clearVictoryPenguinInlineAnim);
    }
    if (btnVictoryClose && victoryModal) {
      btnVictoryClose.addEventListener('click', function () {
        victoryModal.close();
      });
      victoryModal.addEventListener('close', clearVictoryPenguinInlineAnim);
    }
    document.addEventListener('keydown', onDocumentKeydown, true);
    startGame('medium');
    if (kbdLogEnabled) {
      pushKbdDebugEntry({
        hypothesisId: 'H_init',
        message: 'kbdlog after startGame',
        data: { origin: location.origin },
      });
      startKbdLogPanel();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
