(function () {
  "use strict";

  const STORAGE_KEY = "asteroidsPortfolioBest_v1";

  const DIFF = {
    chill: { vm: 0.72, extraAst: -1 },
    normal: { vm: 1, extraAst: 0 },
    hard: { vm: 1.28, extraAst: 2 },
  };

  const RAD = [38, 22, 12];
  const SCORE = [20, 50, 100];

  /** Волна по счёту: каждые WAVE_STEP очков номер волны +1 */
  const WAVE_STEP = 500;
  /** Потолок больших астероидов за один полный спавн поля */
  const SPAWN_AST_CAP = 18;
  /** Макс. доп. астероидов при переходе на новую «волну по счёту» */
  const EXTRA_AST_CAP = 7;
  const MAX_AMMO = 10;
  const RELOAD_SEC = 0.5;
  const FIRE_GAP_MS = 42;
  /** Неуязвимость после смерти + «поле» */
  const INV_RESPAWN_MS = 10000;
  /** Короткая защита в начале партии */
  const INV_START_MS = 2800;
  /** Доля экрана — радиус зоны очистки от астероидов у центра */
  const SAFE_ZONE_FR = 0.26;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const canvasWrap = canvas.parentElement;
  const layoutGame = document.getElementById("layout-game");
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const waveEl = document.getElementById("wave");
  const ammoEl = document.getElementById("ammo");
  const ammoFill = document.getElementById("ammo-fill");
  const bestEl = document.getElementById("best");
  const difficultySelect = document.getElementById("difficulty-select");
  const btnStart = document.getElementById("btn-start");
  const overlay = document.getElementById("overlay");
  const overlayText = document.getElementById("overlay-text");
  const btnOverlay = document.getElementById("btn-overlay");

  let W = 800;
  let H = 600;
  let stars = [];
  let running = false;
  let paused = false;
  let difficultyKey = "normal";
  let score = 0;
  let lives = 3;
  /** Последняя «волна по счёту», для которой уже докинули астероиды */
  let lastWaveSpawned = 0;
  let ship;
  let bullets = [];
  let asteroids = [];
  let keys = {};
  let lastShot = 0;
  let lastFrame = 0;
  let invUntil = 0;
  let ammo = MAX_AMMO;
  let reloadAcc = 0;

  function waveFromScore(s) {
    return Math.max(1, 1 + Math.floor(s / WAVE_STEP));
  }

  function speedMulForWave(w) {
    return Math.min(1.58, 1 + 0.065 * (w - 1));
  }

  function updateAmmoUI() {
    if (ammoEl) {
      ammoEl.textContent = String(ammo);
    }
    if (ammoFill) {
      var pct;
      if (ammo >= MAX_AMMO) {
        pct = 100;
      } else {
        pct = Math.min(100, (reloadAcc / RELOAD_SEC) * 100);
      }
      ammoFill.style.width = pct + "%";
    }
  }

  function loadBest() {
    try {
      var v = parseInt(localStorage.getItem(STORAGE_KEY), 10);
      return isNaN(v) ? 0 : v;
    } catch {
      return 0;
    }
  }

  function saveBest(v) {
    try {
      localStorage.setItem(STORAGE_KEY, String(v));
    } catch (_) {}
  }

  function hash(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function wrap(x, y) {
    return {
      x: ((x % W) + W) % W,
      y: ((y % H) + H) % H,
    };
  }

  function dist(ax, ay, bx, by) {
    var dx = bx - ax;
    var dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Убирает астероиды, пересекающие безопасный круг в центре (респавн корабля). */
  function clearAsteroidsNearCenter() {
    var cx = W * 0.5;
    var cy = H * 0.5;
    var safeR = Math.min(W, H) * SAFE_ZONE_FR;
    var ai;
    for (ai = asteroids.length - 1; ai >= 0; ai--) {
      var a = asteroids[ai];
      if (dist(a.x, a.y, cx, cy) < safeR + a.r) {
        asteroids.splice(ai, 1);
      }
    }
    if (asteroids.length === 0) {
      spawnWave();
    }
  }

  function shieldRadiusPx() {
    return 52 + Math.min(W, H) * 0.02;
  }

  function resizeCanvas() {
    if (!canvasWrap) return;
    W = Math.max(320, canvasWrap.clientWidth);
    H = Math.max(320, canvasWrap.clientHeight);
    canvas.width = W;
    canvas.height = H;
    stars = [];
    var i;
    for (i = 0; i < 120; i++) {
      stars.push({
        x: hash(i * 7 + 1) * W,
        y: hash(i * 7 + 3) * H,
        s: 0.5 + hash(i * 7 + 5) * 1.5,
        a: 0.3 + hash(i * 7 + 9) * 0.7,
      });
    }
    if (ship) {
      var w = wrap(ship.x, ship.y);
      ship.x = w.x;
      ship.y = w.y;
    }
    draw();
  }

  function makeShip() {
    return {
      x: W * 0.5,
      y: H * 0.5,
      angle: -Math.PI / 2,
      vx: 0,
      vy: 0,
    };
  }

  function asteroidVerts(seed, r) {
    var n = 9 + Math.floor(hash(seed * 1.7) * 4);
    var pts = [];
    var i;
    for (i = 0; i < n; i++) {
      var t = (i / n) * Math.PI * 2;
      var rr = r * (0.78 + hash(seed * 13 + i * 3) * 0.38);
      pts.push({ x: Math.cos(t) * rr, y: Math.sin(t) * rr });
    }
    return pts;
  }

  function spawnAsteroid(sizeLevel, x, y, vx, vy, rot, rotSpeed, seed) {
    var r = RAD[Math.min(sizeLevel, 2)];
    return {
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      size: sizeLevel,
      r: r,
      rot: rot || 0,
      rotSpeed: rotSpeed || (hash(seed) * 1.4 - 0.7) * (0.8 + sizeLevel * 0.4),
      seed: seed || Math.random() * 10000,
      verts: asteroidVerts(seed || 1, r),
    };
  }

  function burstFromEdge() {
    var w = waveFromScore(score);
    var sm = speedMulForWave(w);
    var edge = Math.floor(hash(w * 17 + asteroids.length) * 4);
    var m = 40;
    var x;
    var y;
    var vx;
    var vy;
    var vm = 55 * DIFF[difficultyKey].vm * sm;
    if (edge === 0) {
      x = hash(asteroids.length + 1) * W;
      y = -m;
      vx = (hash(asteroids.length + 2) - 0.5) * vm;
      vy = vm * 0.4 + hash(asteroids.length + 3) * vm * 0.35;
    } else if (edge === 1) {
      x = W + m;
      y = hash(asteroids.length + 4) * H;
      vx = -vm * 0.45 - hash(asteroids.length + 5) * vm * 0.3;
      vy = (hash(asteroids.length + 6) - 0.5) * vm;
    } else if (edge === 2) {
      x = hash(asteroids.length + 7) * W;
      y = H + m;
      vx = (hash(asteroids.length + 8) - 0.5) * vm;
      vy = -vm * 0.45 - hash(asteroids.length + 9) * vm * 0.35;
    } else {
      x = -m;
      y = hash(asteroids.length + 10) * H;
      vx = vm * 0.4 + hash(asteroids.length + 11) * vm * 0.35;
      vy = (hash(asteroids.length + 12) - 0.5) * vm;
    }
    return spawnAsteroid(0, x, y, vx, vy, hash(asteroids.length) * 6, null, w * 100 + asteroids.length);
  }

  function spawnWave() {
    asteroids = [];
    var w = waveFromScore(score);
    var n = Math.min(4 + w * 2 + DIFF[difficultyKey].extraAst, SPAWN_AST_CAP);
    var i;
    for (i = 0; i < n; i++) {
      asteroids.push(burstFromEdge());
    }
  }

  function checkWaveFromScore() {
    var w = waveFromScore(score);
    if (waveEl) {
      waveEl.textContent = String(w);
    }
    while (lastWaveSpawned < w) {
      lastWaveSpawned++;
      var extra = Math.min(2 + lastWaveSpawned, EXTRA_AST_CAP);
      var j;
      for (j = 0; j < extra; j++) {
        asteroids.push(burstFromEdge());
      }
    }
  }

  function resetRound() {
    bullets = [];
    ship = makeShip();
    invUntil = performance.now() + INV_START_MS;
    ammo = MAX_AMMO;
    reloadAcc = 0;
    lastShot = 0;
    lastWaveSpawned = 0;
    spawnWave();
    clearAsteroidsNearCenter();
    lastWaveSpawned = waveFromScore(score);
    if (waveEl) {
      waveEl.textContent = String(waveFromScore(score));
    }
    updateAmmoUI();
  }

  function resetGame() {
    score = 0;
    lives = 3;
    scoreEl.textContent = "0";
    livesEl.textContent = "3";
    waveEl.textContent = "1";
    difficultyKey = difficultySelect.value;
    resetRound();
  }

  function gameOver() {
    running = false;
    paused = false;
    btnStart.disabled = false;
    difficultySelect.disabled = false;
    var b = loadBest();
    if (score > b) {
      saveBest(score);
      bestEl.textContent = String(score);
    } else {
      bestEl.textContent = String(b);
    }
    overlayText.textContent = "Игра окончена! Счёт: " + score;
    btnOverlay.textContent = "Ещё раз!";
    overlay.classList.remove("hidden");
    btnOverlay.classList.remove("hidden");
    draw();
  }

  function hitShip() {
    lives -= 1;
    livesEl.textContent = String(lives);
    if (lives <= 0) {
      gameOver();
      return;
    }
    ship = makeShip();
    invUntil = performance.now() + INV_RESPAWN_MS;
    bullets = [];
    ammo = MAX_AMMO;
    reloadAcc = 0;
    clearAsteroidsNearCenter();
    updateAmmoUI();
  }

  function splitAsteroid(a, hitX, hitY) {
    var idx = asteroids.indexOf(a);
    if (idx >= 0) {
      asteroids.splice(idx, 1);
    }
    score += SCORE[a.size];
    scoreEl.textContent = String(score);
    checkWaveFromScore();
    if (a.size < 2) {
      var i;
      var wNow = waveFromScore(score);
      var spd = 95 * DIFF[difficultyKey].vm * speedMulForWave(wNow);
      for (i = 0; i < 2; i++) {
        var ang = hash(a.seed + i * 31 + 2) * Math.PI * 2;
        var vx = Math.cos(ang) * spd * 0.55 + a.vx * 0.35;
        var vy = Math.sin(ang) * spd * 0.55 + a.vy * 0.35;
        asteroids.push(
          spawnAsteroid(
            a.size + 1,
            hitX + Math.cos(ang) * 8,
            hitY + Math.sin(ang) * 8,
            vx,
            vy,
            a.rot,
            a.rotSpeed * 1.2,
            a.seed + i * 999
          )
        );
      }
    }
    if (asteroids.length === 0) {
      spawnWave();
    }
  }

  function update(dt) {
    var now = performance.now();
    var d = DIFF[difficultyKey];
    var rotSpeed = 2.8 * d.vm;
    var thrust = 520 * d.vm;
    var maxSp = 420 * d.vm;
    var bulletLife = 0.95;

    if (keys["ArrowLeft"] || keys["KeyA"]) {
      ship.angle -= rotSpeed * dt;
    }
    if (keys["ArrowRight"] || keys["KeyD"]) {
      ship.angle += rotSpeed * dt;
    }
    if (keys["ArrowUp"] || keys["KeyW"]) {
      ship.vx += Math.cos(ship.angle) * thrust * dt;
      ship.vy += Math.sin(ship.angle) * thrust * dt;
    }
    var sp = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (sp > maxSp) {
      ship.vx = (ship.vx / sp) * maxSp;
      ship.vy = (ship.vy / sp) * maxSp;
    }
    ship.vx *= 0.998;
    ship.vy *= 0.998;

    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    var wp = wrap(ship.x, ship.y);
    ship.x = wp.x;
    ship.y = wp.y;

    if (ammo < MAX_AMMO) {
      reloadAcc += dt;
      while (reloadAcc >= RELOAD_SEC && ammo < MAX_AMMO) {
        reloadAcc -= RELOAD_SEC;
        ammo++;
      }
      updateAmmoUI();
    } else {
      reloadAcc = 0;
    }

    if (keys["Space"] && ammo > 0 && now - lastShot >= FIRE_GAP_MS) {
      lastShot = now;
      ammo--;
      updateAmmoUI();
      var bs = 580 * d.vm * speedMulForWave(waveFromScore(score));
      bullets.push({
        x: ship.x + Math.cos(ship.angle) * 18,
        y: ship.y + Math.sin(ship.angle) * 18,
        vx: Math.cos(ship.angle) * bs + ship.vx * 0.3,
        vy: Math.sin(ship.angle) * bs + ship.vy * 0.3,
        t: bulletLife,
      });
    }

    var bi;
    for (bi = bullets.length - 1; bi >= 0; bi--) {
      var b = bullets[bi];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.t -= dt;
      var wb = wrap(b.x, b.y);
      b.x = wb.x;
      b.y = wb.y;
      if (b.t <= 0) {
        bullets.splice(bi, 1);
      }
    }

    var ai;
    for (ai = 0; ai < asteroids.length; ai++) {
      var a = asteroids[ai];
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rot += a.rotSpeed * dt;
      var wa = wrap(a.x, a.y);
      a.x = wa.x;
      a.y = wa.y;
    }

    for (bi = bullets.length - 1; bi >= 0; bi--) {
      var bullet = bullets[bi];
      for (ai = asteroids.length - 1; ai >= 0; ai--) {
        var ast = asteroids[ai];
        if (dist(bullet.x, bullet.y, ast.x, ast.y) < ast.r + 3) {
          bullets.splice(bi, 1);
          splitAsteroid(ast, ast.x, ast.y);
          break;
        }
      }
    }

    if (now > invUntil) {
      var sr = 11;
      for (ai = 0; ai < asteroids.length; ai++) {
        var rock = asteroids[ai];
        if (dist(ship.x, ship.y, rock.x, rock.y) < rock.r + sr) {
          hitShip();
          break;
        }
      }
    }
  }

  function draw() {
    var i;
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0e0620");
    g.addColorStop(0.5, "#120a28");
    g.addColorStop(1, "#050210");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (i = 0; i < asteroids.length; i++) {
      var ast = asteroids[i];
      ctx.save();
      ctx.translate(ast.x, ast.y);
      ctx.rotate(ast.rot);
      ctx.strokeStyle = "#b39ddb";
      ctx.fillStyle = "rgba(40, 25, 70, 0.55)";
      ctx.lineWidth = Math.max(2, ast.r * 0.08);
      ctx.beginPath();
      var v;
      for (v = 0; v < ast.verts.length; v++) {
        var p = ast.verts[v];
        if (v === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    for (i = 0; i < bullets.length; i++) {
      var bul = bullets[i];
      ctx.fillStyle = "#fff59d";
      ctx.shadowColor = "#ffeb3b";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(bul.x, bul.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (ship) {
      var nowDraw = performance.now();
      var shieldOn = nowDraw < invUntil;
      if (shieldOn) {
        var sr = shieldRadiusPx();
        var pulse = 0.5 + 0.5 * Math.sin(nowDraw / 180);
        var alpha1 = 0.28 + pulse * 0.22;
        var alpha2 = 0.14 + pulse * 0.12;
        ctx.save();
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, sr + 10 + pulse * 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(124, 77, 255, " + (0.08 + pulse * 0.06) + ")";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, sr + 4 + pulse * 3, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(180, 230, 255, " + alpha1 + ")";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, sr + 14 + pulse * 2, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(179, 136, 255, " + alpha2 + ")";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);
      ctx.strokeStyle = "#e1bee7";
      ctx.fillStyle = "#7c4dff";
      ctx.lineWidth = 2;
      if (shieldOn) {
        ctx.globalAlpha = 0.92;
      }
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-14, 12);
      ctx.lineTo(-14, -12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  function loop(now) {
    if (!running) {
      draw();
      return;
    }
    var dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    if (!paused) {
      update(dt);
      if (!running) {
        return;
      }
    }
    draw();
    requestAnimationFrame(loop);
  }

  function startGame() {
    resetGame();
    running = true;
    paused = false;
    overlay.classList.add("hidden");
    btnStart.disabled = true;
    difficultySelect.disabled = true;
    lastFrame = performance.now();
    lastShot = 0;
    updateAmmoUI();
    requestAnimationFrame(loop);
  }

  btnStart.addEventListener("click", function () {
    if (!running) {
      overlay.classList.add("hidden");
      startGame();
    }
  });

  btnOverlay.addEventListener("click", function () {
    startGame();
  });

  document.addEventListener("keydown", function (e) {
    keys[e.code] = true;
    var tag = e.target && e.target.tagName;
    if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") {
      return;
    }
    if (e.code === "Escape") {
      if (running) {
        e.preventDefault();
        paused = !paused;
        if (paused) {
          overlayText.textContent = "Пауза";
          overlay.classList.remove("hidden");
          btnOverlay.classList.add("hidden");
        } else {
          overlay.classList.add("hidden");
          lastFrame = performance.now();
        }
      }
      return;
    }
    if (e.code === "Space") {
      e.preventDefault();
      if (!running) {
        startGame();
      }
      return;
    }
  });

  document.addEventListener("keyup", function (e) {
    keys[e.code] = false;
  });

  new ResizeObserver(resizeCanvas).observe(canvasWrap);
  if (layoutGame) {
    new ResizeObserver(resizeCanvas).observe(layoutGame);
  }
  window.addEventListener("load", resizeCanvas);

  bestEl.textContent = String(loadBest());
  resetGame();
  updateAmmoUI();
  running = false;
  overlayText.textContent = "Жми «Старт!» или пробел";
  btnOverlay.textContent = "В бой!";
  overlay.classList.remove("hidden");
  requestAnimationFrame(function () {
    resizeCanvas();
  });
})();
