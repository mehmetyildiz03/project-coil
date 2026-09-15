(() => {
  'use strict';

  const COLS = 20;
  const ROWS = 28;
  const START_DELAY = 165;
  const MIN_DELAY = 62;
  const SPEED_STEP = 9;
  const FOODS_PER_LEVEL = 5;
  const SWIPE_THRESHOLD = 18;
  const STORE_KEY = 'project-coil-classic-best';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const levelEl = document.getElementById('level');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayCopy = document.getElementById('overlayCopy');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const soundBtn = document.getElementById('soundBtn');

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  let snake = [];
  let direction = DIRS.right;
  let queuedDirection = DIRS.right;
  let food = { x: 0, y: 0 };
  let score = 0;
  let best = loadBest();
  let foodsEaten = 0;
  let running = false;
  let paused = false;
  let dead = false;
  let accumulator = 0;
  let lastTime = performance.now();
  let pointerStart = null;
  let soundEnabled = true;
  let audioCtx = null;

  function loadBest() {
    try { return Number(localStorage.getItem(STORE_KEY)) || 0; }
    catch { return 0; }
  }

  function saveBest() {
    try { localStorage.setItem(STORE_KEY, String(best)); } catch {}
  }

  function vibrate(pattern) {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  }

  function ensureAudio() {
    if (!soundEnabled) return null;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    } catch { return null; }
  }

  function tone(freq, duration = 0.04, delay = 0, volume = 0.025) {
    const ac = ensureAudio();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const t = ac.currentTime + delay;
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  function resetGame() {
    const cy = Math.floor(ROWS / 2);
    const cx = Math.floor(COLS / 2);
    snake = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
      { x: cx - 3, y: cy }
    ];
    direction = DIRS.right;
    queuedDirection = DIRS.right;
    score = 0;
    foodsEaten = 0;
    running = false;
    paused = false;
    dead = false;
    accumulator = 0;
    spawnFood();
    updateHud();
    showOverlay('READY?', 'Kaydır veya yön tuşuna bas', 'START');
    pauseBtn.textContent = 'II';
  }

  function startGame() {
    if (dead) resetGame();
    running = true;
    paused = false;
    dead = false;
    accumulator = 0;
    overlay.classList.add('hidden');
    pauseBtn.textContent = 'II';
    ensureAudio();
  }

  function showOverlay(title, copy, buttonText) {
    overlayTitle.textContent = title;
    overlayCopy.textContent = copy;
    startBtn.textContent = buttonText;
    overlay.classList.remove('hidden');
  }

  function currentLevel() {
    return 1 + Math.floor(foodsEaten / FOODS_PER_LEVEL);
  }

  function tickDelay() {
    return Math.max(MIN_DELAY, START_DELAY - (currentLevel() - 1) * SPEED_STEP);
  }

  function updateHud() {
    scoreEl.textContent = String(score).padStart(4, '0');
    bestEl.textContent = String(best).padStart(4, '0');
    levelEl.textContent = String(currentLevel());
  }

  function spawnFood() {
    const free = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!snake.some(s => s.x === x && s.y === y)) free.push({ x, y });
      }
    }
    if (!free.length) {
      winGame();
      return;
    }
    food = free[Math.floor(Math.random() * free.length)];
  }

  function isOpposite(a, b) {
    return a.x + b.x === 0 && a.y + b.y === 0;
  }

  function queueDirection(dir) {
    if (!dir || isOpposite(dir, direction)) return;
    queuedDirection = dir;
    if (!running && !dead) startGame();
  }

  function step() {
    direction = queuedDirection;
    const head = snake[0];
    const next = { x: head.x + direction.x, y: head.y + direction.y };
    const ate = next.x === food.x && next.y === food.y;

    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      gameOver('WALL HIT');
      return;
    }

    const bodyToCheck = ate ? snake : snake.slice(0, -1);
    if (bodyToCheck.some(s => s.x === next.x && s.y === next.y)) {
      gameOver('SELF HIT');
      return;
    }

    snake.unshift(next);
    if (ate) {
      foodsEaten += 1;
      score += 10 * currentLevel();
      if (score > best) {
        best = score;
        saveBest();
      }
      spawnFood();
      tone(620 + Math.min(foodsEaten, 20) * 9, 0.045);
      vibrate(12);
    } else {
      snake.pop();
    }
    updateHud();
  }

  function gameOver(reason) {
    running = false;
    paused = false;
    dead = true;
    if (score > best) {
      best = score;
      saveBest();
    }
    updateHud();
    tone(260, 0.08, 0, 0.035);
    tone(170, 0.12, 0.08, 0.035);
    vibrate([35, 35, 80]);
    showOverlay('GAME OVER', `${reason} • SCORE ${String(score).padStart(4, '0')}`, 'RETRY');
  }

  function winGame() {
    running = false;
    dead = true;
    showOverlay('PERFECT!', `GRID CLEARED • SCORE ${String(score).padStart(4, '0')}`, 'AGAIN');
  }

  function togglePause() {
    if (dead) return;
    if (!running && !paused) {
      startGame();
      return;
    }
    paused = !paused;
    running = !paused;
    accumulator = 0;
    pauseBtn.textContent = paused ? '▶' : 'II';
    if (paused) showOverlay('PAUSED', 'Devam etmek için dokun', 'RESUME');
    else overlay.classList.add('hidden');
  }

  function fitCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function draw() {
    fitCanvas();
    const W = canvas.width;
    const H = canvas.height;
    const cell = Math.floor(Math.min(W / COLS, H / ROWS));
    const boardW = cell * COLS;
    const boardH = cell * ROWS;
    const ox = Math.floor((W - boardW) / 2);
    const oy = Math.floor((H - boardH) / 2);

    ctx.fillStyle = '#b9c99a';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(38,53,43,.055)';
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        ctx.fillRect(ox + x * cell + 1, oy + y * cell + 1, Math.max(1, cell - 2), Math.max(1, cell - 2));
      }
    }

    const gap = Math.max(1, Math.floor(cell * 0.12));
    const inset = Math.max(gap, 2);

    ctx.fillStyle = '#26352b';
    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i];
      const extra = i === 0 ? Math.max(0, Math.floor(cell * 0.06)) : 0;
      ctx.fillRect(
        ox + s.x * cell + inset - extra,
        oy + s.y * cell + inset - extra,
        cell - inset * 2 + extra * 2,
        cell - inset * 2 + extra * 2
      );
    }

    const fx = ox + food.x * cell;
    const fy = oy + food.y * cell;
    const q = Math.max(2, Math.floor(cell * 0.23));
    const cx = fx + Math.floor(cell / 2);
    const cy = fy + Math.floor(cell / 2);
    ctx.fillStyle = '#26352b';
    ctx.fillRect(cx - q, cy - q, q * 2, q * 2);
    ctx.fillRect(cx - Math.floor(q / 2), cy - q * 2, q, q);

    ctx.strokeStyle = 'rgba(38,53,43,.32)';
    ctx.lineWidth = Math.max(1, Math.floor(cell * 0.08));
    ctx.strokeRect(ox + 1, oy + 1, boardW - 2, boardH - 2);
  }

  function frame(now) {
    const dt = Math.min(100, now - lastTime);
    lastTime = now;
    if (running && !paused && !dead) {
      accumulator += dt;
      let safety = 0;
      while (accumulator >= tickDelay() && safety < 4) {
        accumulator -= tickDelay();
        step();
        safety += 1;
        if (!running) break;
      }
    }
    draw();
    requestAnimationFrame(frame);
  }

  function keyToDir(key) {
    const k = key.toLowerCase();
    if (k === 'arrowup' || k === 'w') return DIRS.up;
    if (k === 'arrowdown' || k === 's') return DIRS.down;
    if (k === 'arrowleft' || k === 'a') return DIRS.left;
    if (k === 'arrowright' || k === 'd') return DIRS.right;
    return null;
  }

  addEventListener('keydown', e => {
    const dir = keyToDir(e.key);
    if (dir) {
      e.preventDefault();
      queueDirection(dir);
      return;
    }
    if (e.key === ' ' || e.key.toLowerCase() === 'p') {
      e.preventDefault();
      togglePause();
    }
    if (e.key.toLowerCase() === 'r') {
      e.preventDefault();
      resetGame();
      startGame();
    }
  });

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    pointerStart = { x: e.clientX, y: e.clientY, id: e.pointerId };
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    ensureAudio();
  }, { passive: false });

  canvas.addEventListener('pointerup', e => {
    if (!pointerStart || e.pointerId !== pointerStart.id) return;
    e.preventDefault();
    const dx = e.clientX - pointerStart.x;
    const dy = e.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) > Math.abs(dy)) queueDirection(dx > 0 ? DIRS.right : DIRS.left);
    else queueDirection(dy > 0 ? DIRS.down : DIRS.up);
  }, { passive: false });

  canvas.addEventListener('pointercancel', () => { pointerStart = null; }, { passive: true });

  document.querySelectorAll('[data-dir]').forEach(btn => {
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      ensureAudio();
      queueDirection(DIRS[btn.dataset.dir]);
    }, { passive: false });
  });

  startBtn.addEventListener('click', () => {
    if (dead) resetGame();
    startGame();
  });
  pauseBtn.addEventListener('click', togglePause);
  soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundBtn.textContent = soundEnabled ? 'SOUND ON' : 'SOUND OFF';
    if (soundEnabled) tone(520, 0.03);
  });

  addEventListener('resize', draw, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running && !dead) {
      paused = true;
      running = false;
      pauseBtn.textContent = '▶';
      showOverlay('PAUSED', 'Oyuna dönünce devam et', 'RESUME');
    }
  });

  bestEl.textContent = String(best).padStart(4, '0');
  resetGame();
  requestAnimationFrame(frame);
})();
