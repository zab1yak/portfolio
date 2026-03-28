(function () {
  "use strict";

  const PRESETS = {
    easy: { rows: 8, cols: 8, mines: 8 },
    normal: { rows: 9, cols: 9, mines: 10 },
    hard: { rows: 12, cols: 12, mines: 28 },
  };

  const boardEl = document.getElementById("board");
  const minesLeftEl = document.getElementById("mines-left");
  const timerEl = document.getElementById("timer");
  const messageEl = document.getElementById("message");
  const btnNew = document.getElementById("btn-new");
  const difficultySelect = document.getElementById("difficulty-select");

  let rows = 9;
  let cols = 9;
  let mineCount = 10;
  let cells = [];
  let minesPlaced = false;
  let gameOver = false;
  let won = false;
  let timerId = null;
  let seconds = 0;
  let longPressTimer = null;

  function shuffle(arr) {
    var i = arr.length;
    var j;
    var t;
    while (i > 0) {
      j = Math.floor(Math.random() * i);
      i--;
      t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function placeMines(safeR, safeC) {
    var banned = new Set();
    var dr;
    var dc;
    for (dr = -1; dr <= 1; dr++) {
      for (dc = -1; dc <= 1; dc++) {
        banned.add(safeR + dr + "," + (safeC + dc));
      }
    }
    var pool = [];
    var r;
    var c;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        if (!banned.has(r + "," + c)) {
          pool.push([r, c]);
        }
      }
    }
    shuffle(pool);
    var m;
    for (m = 0; m < mineCount && m < pool.length; m++) {
      var p = pool[m];
      cells[p[0]][p[1]].mine = true;
    }
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        if (cells[r][c].mine) {
          cells[r][c].adjacent = -1;
          continue;
        }
        var n = 0;
        for (dr = -1; dr <= 1; dr++) {
          for (dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) {
              continue;
            }
            var nr = r + dr;
            var nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && cells[nr][nc].mine) {
              n++;
            }
          }
        }
        cells[r][c].adjacent = n;
      }
    }
  }

  function flagCount() {
    var n = 0;
    var r;
    var c;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        if (cells[r][c].flagged && !cells[r][c].revealed) {
          n++;
        }
      }
    }
    return n;
  }

  function updateMinesLeft() {
    minesLeftEl.textContent = String(Math.max(0, mineCount - flagCount()));
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    stopTimer();
    seconds = 0;
    timerEl.textContent = "0";
    timerId = setInterval(function () {
      seconds++;
      timerEl.textContent = String(seconds);
    }, 1000);
  }

  function checkWin() {
    var r;
    var c;
    var allSafeRevealed = true;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        if (!cells[r][c].mine && !cells[r][c].revealed) {
          allSafeRevealed = false;
          break;
        }
      }
      if (!allSafeRevealed) {
        break;
      }
    }
    if (allSafeRevealed && minesPlaced) {
      won = true;
      stopTimer();
      messageEl.textContent =
        "Победа! Серые клетки — мины (игра окончена). «Новая игра», чтобы сыграть ещё раз.";
      messageEl.className = "message message--win";
      var r2;
      var c2;
      for (r2 = 0; r2 < rows; r2++) {
        for (c2 = 0; c2 < cols; c2++) {
          if (cells[r2][c2].mine) {
            cells[r2][c2].flagged = true;
          }
        }
      }
      updateMinesLeft();
      render();
    }
  }

  function loseGame() {
    gameOver = true;
    stopTimer();
    messageEl.textContent = "Мина! Конец игры.";
    messageEl.className = "message message--lose";
    var r;
    var c;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        if (cells[r][c].mine) {
          cells[r][c].revealed = true;
        }
        if (cells[r][c].flagged && !cells[r][c].mine) {
          cells[r][c].badFlag = true;
        }
      }
    }
    render();
  }

  function revealCell(r, c) {
    if (gameOver || won) {
      return;
    }
    var cell = cells[r][c];
    if (cell.revealed || cell.flagged) {
      return;
    }
    if (!minesPlaced) {
      placeMines(r, c);
      minesPlaced = true;
      startTimer();
    }
    if (cell.mine) {
      loseGame();
      return;
    }
    var stack = [[r, c]];
    while (stack.length) {
      var p = stack.pop();
      var rr = p[0];
      var cc = p[1];
      var ch = cells[rr][cc];
      if (ch.revealed || ch.flagged) {
        continue;
      }
      ch.revealed = true;
      if (ch.adjacent === 0) {
        var dr;
        var dc;
        for (dr = -1; dr <= 1; dr++) {
          for (dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) {
              continue;
            }
            var nr = rr + dr;
            var nc = cc + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !cells[nr][nc].revealed) {
              stack.push([nr, nc]);
            }
          }
        }
      }
    }
    checkWin();
    render();
  }

  function toggleFlag(r, c) {
    if (gameOver || won) {
      return;
    }
    var cell = cells[r][c];
    if (cell.revealed) {
      return;
    }
    cell.flagged = !cell.flagged;
    updateMinesLeft();
    render();
  }

  function render() {
    var r;
    var c;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        var cell = cells[r][c];
        var el = cell.el;
        el.className = "cell";
        el.textContent = "";
        el.innerHTML = "";
        if (cell.revealed) {
          el.classList.add("cell--open");
          if (cell.mine) {
            el.classList.add("cell--mine");
            var sp = document.createElement("span");
            sp.className = "cell__mine";
            sp.textContent = "●";
            el.appendChild(sp);
          } else if (cell.adjacent > 0) {
            el.classList.add("cell--n" + cell.adjacent);
            el.textContent = String(cell.adjacent);
          }
        } else if (cell.flagged) {
          el.classList.add("cell--flagged");
          var fl = document.createElement("span");
          fl.className = "cell__flag";
          fl.textContent = "⚑";
          el.appendChild(fl);
        }
        if (cell.badFlag) {
          el.classList.add("cell--bad-flag");
        }
        var ended = gameOver || won;
        el.disabled = false;
        el.setAttribute("aria-disabled", ended ? "true" : "false");
      }
    }
  }

  function buildBoard() {
    boardEl.innerHTML = "";
    boardEl.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
    cells = [];
    for (let r = 0; r < rows; r++) {
      cells[r] = [];
      for (let c = 0; c < cols; c++) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cell";
        btn.setAttribute("aria-label", "Клетка " + (r + 1) + "," + (c + 1));
        btn.addEventListener("click", function () {
          revealCell(r, c);
        });
        btn.addEventListener("contextmenu", function (e) {
          e.preventDefault();
          toggleFlag(r, c);
        });
        btn.addEventListener(
          "touchstart",
          function (e) {
            longPressTimer = setTimeout(function () {
              longPressTimer = null;
              toggleFlag(r, c);
              e.preventDefault();
            }, 480);
          },
          { passive: false }
        );
        btn.addEventListener("touchend", function () {
          if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
          }
        });
        btn.addEventListener("touchmove", function () {
          if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
          }
        });
        boardEl.appendChild(btn);
        cells[r][c] = {
          mine: false,
          adjacent: 0,
          revealed: false,
          flagged: false,
          badFlag: false,
          el: btn,
        };
      }
    }
  }

  function newGame() {
    stopTimer();
    var key = difficultySelect.value;
    var p = PRESETS[key] || PRESETS.normal;
    rows = p.rows;
    cols = p.cols;
    mineCount = p.mines;
    minesPlaced = false;
    gameOver = false;
    won = false;
    seconds = 0;
    timerEl.textContent = "0";
    messageEl.textContent = "";
    messageEl.className = "message";
    buildBoard();
    updateMinesLeft();
    render();
  }

  difficultySelect.addEventListener("change", function () {
    newGame();
  });

  btnNew.addEventListener("click", function () {
    newGame();
  });

  newGame();
})();
