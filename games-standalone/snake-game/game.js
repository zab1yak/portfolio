(function () {
  "use strict";

  const COLS = 21;
  const ROWS = 21;
  const STORAGE_KEY = "snakePortfolioRecords_v1";

  const SPEED_MS = {
    chill: 200,
    normal: 130,
    turbo: 85,
  };

  const SPEED_LABELS = {
    chill: "Спокойное течение",
    normal: "Обычное",
    turbo: "Ураган!",
  };

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const layoutGame = document.getElementById("layout-game");
  const canvasWrap = canvas.parentElement;
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const speedSelect = document.getElementById("speed-select");
  const btnStart = document.getElementById("btn-start");
  const overlay = document.getElementById("overlay");
  const overlayText = document.getElementById("overlay-text");
  const btnOverlay = document.getElementById("btn-overlay");
  const recordsList = document.getElementById("records-list");
  const btnClearRecords = document.getElementById("btn-clear-records");

  let cell = 20;
  let snake;
  let snakeFrom = [];
  let snakeTo = [];
  let lastStepAt = 0;
  let frozenStepT = null;
  let dir;
  let nextDir;
  let food;
  let score;
  let running = false;
  let paused = false;
  let speedKey = "normal";
  let moveInterval;
  let lastTick = 0;
  let accumulator = 0;

  function copySnake(arr) {
    return arr.map(function (s) {
      return { x: s.x, y: s.y };
    });
  }

  function smoothstep01(u) {
    var x = Math.max(0, Math.min(1, u));
    return x * x * (3 - 2 * x);
  }

  function resizeCanvas() {
    if (!canvasWrap) return;
    const pad = 8;
    const side = Math.floor(Math.min(canvasWrap.clientWidth - pad, canvasWrap.clientHeight - pad));
    cell = Math.max(14, Math.floor(side / COLS));
    const px = COLS * cell;
    canvas.width = px;
    canvas.height = px;
    canvas.style.width = px + "px";
    canvas.style.height = px + "px";
    draw();
  }

  function loadRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function saveRecords(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 15)));
  }

  function bestScoreOverall() {
    const list = loadRecords();
    if (!list.length) return 0;
    return Math.max.apply(
      null,
      list.map(function (r) {
        return r.score;
      })
    );
  }

  function pushRecord(entry) {
    const list = loadRecords();
    list.push(entry);
    list.sort(function (a, b) {
      return b.score - a.score;
    });
    saveRecords(list);
  }

  function renderRecords() {
    const list = loadRecords().slice(0, 10);
    recordsList.innerHTML = "";
    if (!list.length) {
      const li = document.createElement("li");
      li.className = "records__empty";
      li.textContent = "Пока пусто — сыграй и попади в список!";
      recordsList.appendChild(li);
      return;
    }
    list.forEach(function (r) {
      const li = document.createElement("li");
      const speedRu = SPEED_LABELS[r.speed] || r.speed;
      li.innerHTML =
        "<strong>" + r.score + "</strong> очков <span class=\"speed\">· " + speedRu + "</span>";
      recordsList.appendChild(li);
    });
  }

  function randomEmptyCell() {
    const taken = new Set(snake.map(function (s) {
      return s.x + "," + s.y;
    }));
    let x;
    let y;
    let guard = 0;
    do {
      x = Math.floor(Math.random() * COLS);
      y = Math.floor(Math.random() * ROWS);
      guard++;
    } while (taken.has(x + "," + y) && guard < 500);
    return { x: x, y: y };
  }

  function resetGame() {
    const mid = Math.floor(COLS / 2);
    snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    food = randomEmptyCell();
    score = 0;
    scoreEl.textContent = "0";
    speedKey = speedSelect.value;
    moveInterval = SPEED_MS[speedKey] || SPEED_MS.normal;
    accumulator = 0;
    lastTick = performance.now();
    snakeFrom = copySnake(snake);
    snakeTo = copySnake(snake);
    lastStepAt = performance.now();
    frozenStepT = null;
  }

  function showOverlay(text, showButton) {
    overlayText.textContent = text;
    overlay.classList.toggle("hidden", false);
    btnOverlay.classList.toggle("hidden", !showButton);
    if (!showButton) btnOverlay.classList.add("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function gameOver() {
    snakeFrom = copySnake(snake);
    snakeTo = copySnake(snake);
    frozenStepT = null;
    lastStepAt = performance.now();
    running = false;
    paused = false;
    btnStart.disabled = false;
    speedSelect.disabled = false;
    if (score > 0) {
      pushRecord({
        score: score,
        speed: speedKey,
        ts: Date.now(),
      });
    }
    bestEl.textContent = String(bestScoreOverall());
    renderRecords();
    showOverlay("Упс! Счёт: " + score, true);
    btnOverlay.textContent = "Ещё раз!";
    draw();
  }

  function tick() {
    snakeFrom = copySnake(snake);
    dir = nextDir;
    const head = snake[0];
    const nx = head.x + dir.x;
    const ny = head.y + dir.y;

    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
      gameOver();
      return;
    }
    const willEat = nx === food.x && ny === food.y;
    const checkUntil = willEat ? snake.length : snake.length - 1;
    for (let i = 0; i < checkUntil; i++) {
      if (snake[i].x === nx && snake[i].y === ny) {
        gameOver();
        return;
      }
    }

    snake.unshift({ x: nx, y: ny });
    if (willEat) {
      score += 10;
      scoreEl.textContent = String(score);
      food = randomEmptyCell();
      const minMs = speedKey === "turbo" ? 55 : speedKey === "normal" ? 70 : 100;
      moveInterval = Math.max(minMs, moveInterval - 3);
    } else {
      snake.pop();
    }
    snakeTo = copySnake(snake);
    lastStepAt = performance.now();
  }

  function draw() {
    if (!snake || !food) return;

    var tRaw;
    if (frozenStepT !== null) {
      tRaw = frozenStepT;
    } else if (!running || snakeFrom.length === 0) {
      tRaw = 1;
    } else {
      tRaw = Math.min(1, (performance.now() - lastStepAt) / moveInterval);
    }
    var t = smoothstep01(tRaw);

    function segPos(i) {
      var a = snakeFrom[i];
      var b = snakeTo[i];
      if (a && b) {
        return {
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
        };
      }
      if (b) {
        return { x: b.x, y: b.y };
      }
      if (a) {
        return { x: a.x, y: a.y };
      }
      return { x: 0, y: 0 };
    }

    var segCount = Math.max(snakeFrom.length, snakeTo.length);

    const sand = "#fff9e6";
    const sandDark = "#ffe8b0";
    ctx.fillStyle = sand;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let gx = 0; gx < COLS; gx++) {
      for (let gy = 0; gy < ROWS; gy++) {
        if ((gx + gy) % 2 === 0) {
          ctx.fillStyle = sandDark;
          ctx.fillRect(gx * cell, gy * cell, cell, cell);
        }
      }
    }

    ctx.strokeStyle = "rgba(2, 119, 189, 0.18)";
    ctx.lineWidth = Math.max(1, cell * 0.06);
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cell, 0);
      ctx.lineTo(x * cell, ROWS * cell);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cell);
      ctx.lineTo(COLS * cell, y * cell);
      ctx.stroke();
    }

    const fx = food.x * cell + cell / 2;
    const fy = food.y * cell + cell / 2;
    const r = cell * 0.38;
    ctx.fillStyle = "#f48fb1";
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(fx - r * 0.35, fy - r * 0.35, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    const holeR = Math.max(1.5, cell * 0.12);
    for (let i = 0; i < segCount; i++) {
      const seg = segPos(i);
      const px = seg.x * cell;
      const py = seg.y * cell;
      const pad = i === 0 ? cell * 0.12 : cell * 0.18;
      const w = cell - pad * 2;
      ctx.fillStyle = i === 0 ? "#fdd835" : "#fff176";
      ctx.fillRect(px + pad, py + pad, w, w);
      ctx.strokeStyle = "#f9a825";
      ctx.lineWidth = Math.max(1, cell * 0.05);
      ctx.strokeRect(px + pad, py + pad, w, w);

      if (i > 0 && i % 2 === 0) {
        ctx.fillStyle = "#c6a052";
        ctx.beginPath();
        ctx.arc(px + cell * 0.35, py + cell * 0.4, holeR, 0, Math.PI * 2);
        ctx.fill();
      }

      if (i === 0) {
        const eye = Math.max(2, cell * 0.14);
        const ox = dir.x * cell * 0.12;
        const oy = dir.y * cell * 0.12;
        ctx.fillStyle = "#fff";
        ctx.fillRect(px + cell / 2 - cell * 0.22 + ox, py + cell * 0.22 + oy, eye + 1, eye + 1);
        ctx.fillRect(px + cell / 2 + cell * 0.02 + ox, py + cell * 0.22 + oy, eye + 1, eye + 1);
        ctx.fillStyle = "#1a237e";
        ctx.fillRect(px + cell / 2 - cell * 0.18 + ox, py + cell * 0.26 + oy, eye * 0.5, eye * 0.55);
        ctx.fillRect(px + cell / 2 + cell * 0.06 + ox, py + cell * 0.26 + oy, eye * 0.5, eye * 0.55);
      }
    }
  }

  function loop(now) {
    if (!running) {
      draw();
      return;
    }
    if (!paused) {
      const dt = now - lastTick;
      lastTick = now;
      accumulator += dt;
      while (accumulator >= moveInterval) {
        accumulator -= moveInterval;
        tick();
        if (!running) return;
      }
    } else {
      lastTick = now;
    }
    draw();
    requestAnimationFrame(loop);
  }

  function startGame() {
    resetGame();
    running = true;
    paused = false;
    hideOverlay();
    btnStart.disabled = true;
    speedSelect.disabled = true;
    lastTick = performance.now();
    accumulator = 0;
    requestAnimationFrame(loop);
  }

  btnStart.addEventListener("click", function () {
    if (!running) {
      showOverlay("", false);
      overlay.classList.add("hidden");
      startGame();
    }
  });

  btnOverlay.addEventListener("click", function () {
    startGame();
  });

  btnClearRecords.addEventListener("click", function () {
    if (confirm("Стереть все рекорды?")) {
      localStorage.removeItem(STORAGE_KEY);
      bestEl.textContent = String(bestScoreOverall());
      renderRecords();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.code === "Space") {
      var tag = e.target && e.target.tagName;
      if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") {
        return;
      }
      e.preventDefault();
      if (running) {
        if (paused) {
          var ft = frozenStepT !== null ? frozenStepT : 0;
          lastStepAt = performance.now() - ft * moveInterval;
          frozenStepT = null;
          paused = false;
        } else {
          frozenStepT = Math.min(1, (performance.now() - lastStepAt) / moveInterval);
          paused = true;
        }
        lastTick = performance.now();
      } else {
        startGame();
      }
      return;
    }

    if (!running || paused) return;

    const nd = { x: nextDir.x, y: nextDir.y };
    let ok = false;

    if ((e.code === "ArrowUp" || e.code === "KeyW") && dir.y !== 1) {
      nd.x = 0;
      nd.y = -1;
      ok = true;
    } else if ((e.code === "ArrowDown" || e.code === "KeyS") && dir.y !== -1) {
      nd.x = 0;
      nd.y = 1;
      ok = true;
    } else if ((e.code === "ArrowLeft" || e.code === "KeyA") && dir.x !== 1) {
      nd.x = -1;
      nd.y = 0;
      ok = true;
    } else if ((e.code === "ArrowRight" || e.code === "KeyD") && dir.x !== -1) {
      nd.x = 1;
      nd.y = 0;
      ok = true;
    }

    if (ok) {
      e.preventDefault();
      if (nd.x !== -dir.x || nd.y !== -dir.y) {
        nextDir = nd;
      }
    }
  });

  new ResizeObserver(function () {
    resizeCanvas();
  }).observe(canvasWrap);
  if (layoutGame) {
    new ResizeObserver(function () {
      resizeCanvas();
    }).observe(layoutGame);
  }

  window.addEventListener("load", resizeCanvas);

  resetGame();
  running = false;
  paused = false;

  bestEl.textContent = String(bestScoreOverall());
  renderRecords();
  showOverlay("Жми «Старт!» или кнопку ниже", true);
  btnOverlay.textContent = "Погнали!";
  requestAnimationFrame(function () {
    resizeCanvas();
  });
})();
