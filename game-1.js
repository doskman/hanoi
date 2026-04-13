/* ============================================================
   Tower of Hanoi — BFS Solver
   game.js
   ============================================================ */

// ── Constants ────────────────────────────────────────────────
const COLORS = [
  "#ff6b6b", "#ff9f43", "#ffd166", "#06d6a0",
  "#48cae4", "#7b61ff", "#f72585", "#4cc9f0",
  "#80ed99", "#f4a261"
];

const ROD_NAMES   = ["A", "B", "C"];
const DISK_H      = 22;
const MAX_DISK_W  = 160;
const MIN_DISK_W  = 38;
const ROD_H       = 220;

// ── Game State ───────────────────────────────────────────────
let numDisks    = 4;
let rods        = [[], [], []];
let selected    = null;
let moves       = 0;
let history     = [];
let won         = false;
let isSolving   = false;
let solveTimer  = null;
let solveDelay  = 700; // ms between moves

// ── BFS Solver ───────────────────────────────────────────────

/**
 * Encodes the rod state as a compact string key for the BFS visited set.
 * Each rod is represented as a comma-joined list of disk sizes, rods separated by |
 * @param {Array[]} state - Array of 3 arrays of disk sizes
 * @returns {string}
 */
function encodeState(state) {
  return state.map(rod => rod.join(",")).join("|");
}

/**
 * Runs BFS from the initial state (all disks on rod 0) to any goal state
 * (all disks on rod 1 or rod 2). Returns the sequence of moves as:
 * [{from: rodIndex, to: rodIndex}, ...]
 *
 * State space: each state is 3 arrays of disk sizes (numbers).
 * BFS guarantees the shortest (optimal) path is found first.
 *
 * @param {number} n - number of disks
 * @returns {Array} moves array
 */
function bfsSolve(n) {
  // Initial state: all disks on rod 0, largest at index 0, smallest at end
  const initialState = [
    Array.from({ length: n }, (_, i) => n - i), // rod A: [n, n-1, ..., 1]
    [],
    []
  ];

  const goalCheck = (state) =>
    state[1].length === n || state[2].length === n;

  const startKey = encodeState(initialState);
  const visited  = new Map(); // key -> parent key
  const moveMap  = new Map(); // key -> move that produced this state
  const queue    = [initialState];

  visited.set(startKey, null);
  moveMap.set(startKey, null);

  while (queue.length > 0) {
    const current = queue.shift();

    if (goalCheck(current)) {
      // Reconstruct path
      return reconstructPath(current, visited, moveMap, startKey);
    }

    // Generate all valid moves
    for (let from = 0; from < 3; from++) {
      if (current[from].length === 0) continue;
      const disk = current[from][current[from].length - 1];

      for (let to = 0; to < 3; to++) {
        if (from === to) continue;
        const topDest = current[to][current[to].length - 1];
        if (topDest !== undefined && topDest < disk) continue; // invalid

        // Apply move
        const next = current.map(rod => [...rod]);
        next[to].push(next[from].pop());

        const nextKey = encodeState(next);
        if (!visited.has(nextKey)) {
          visited.set(nextKey, encodeState(current));
          moveMap.set(nextKey, { from, to });
          queue.push(next);
        }
      }
    }
  }

  return []; // no solution (shouldn't happen)
}

/**
 * Reconstructs the move sequence by backtracking through the BFS parent map.
 * @param {Array[]} goalState
 * @param {Map} visited - key -> parent key
 * @param {Map} moveMap - key -> move
 * @param {string} startKey
 * @returns {Array} ordered list of moves
 */
function reconstructPath(goalState, visited, moveMap, startKey) {
  const path   = [];
  let key      = encodeState(goalState);

  while (key !== startKey) {
    const move      = moveMap.get(key);
    const parentKey = visited.get(key);
    path.unshift(move);
    key = parentKey;
  }

  return path;
}

// ── Disk Helpers ─────────────────────────────────────────────

/** Returns pixel width for a given disk size */
function getDiskWidth(size) {
  return MIN_DISK_W + ((size - 1) / (numDisks - 1 || 1)) * (MAX_DISK_W - MIN_DISK_W);
}

/** Returns minimum moves to solve n disks: 2^n - 1 */
function minMoves(n) {
  return Math.pow(2, n) - 1;
}

/** Generates the initial disk stack for rod A */
function generateDisks(n) {
  return Array.from({ length: n }, (_, i) => ({
    id:    i,
    size:  n - i,
    color: COLORS[i % COLORS.length],
  }));
}

// ── DOM Helpers ──────────────────────────────────────────────

/** Updates all stats displays */
function updateStats() {
  document.getElementById("moves-val").textContent   = moves;
  document.getElementById("optimal-val").textContent = minMoves(numDisks);
  document.getElementById("disks-val").textContent   = numDisks;
  document.getElementById("undo-btn").disabled       = history.length === 0 || isSolving;
  document.getElementById("reset-btn").disabled      = isSolving;
  document.getElementById("mode-val").textContent    = isSolving ? "BFS Auto" : "Manual";
}

/**
 * Shows a message in the banner.
 * @param {"win"|"invalid"|""} type
 * @param {string} msg
 */
function showBanner(type, msg) {
  const b       = document.getElementById("banner");
  b.className   = type;
  b.textContent = msg;
  if (type === "invalid") {
    setTimeout(() => { b.className = ""; b.textContent = ""; }, 700);
  }
}

/** Sets the BFS status line */
function setBfsStatus(msg, running = false) {
  const el      = document.getElementById("bfs-status");
  el.textContent = msg;
  el.className  = running ? "running" : "";
}

/** Sets the instruction hint */
function setInstruction(msg) {
  document.getElementById("instruction").textContent = msg;
}

/** Appends a move to the move log */
function logMove(fromIdx, toIdx, diskSize, isBfs = false) {
  const log = document.getElementById("move-log");
  const empty = log.querySelector(".log-empty");
  if (empty) empty.remove();

  const entry = document.createElement("div");
  entry.className = "log-entry" + (isBfs ? " bfs-move" : "");
  entry.innerHTML = `
    <span class="log-num">#${moves}</span>
    <span class="log-disk">disk&nbsp;${diskSize}</span>
    <span class="log-from">Rod&nbsp;${ROD_NAMES[fromIdx]}</span>
    <span class="log-arrow">→</span>
    <span class="log-to">Rod&nbsp;${ROD_NAMES[toIdx]}</span>
  `;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

/** Clears the move log */
function clearLog() {
  const log = document.getElementById("move-log");
  log.innerHTML = '<p class="log-empty">No moves yet.</p>';
}

// ── Rendering ────────────────────────────────────────────────

/** Rebuilds the full game area from current state */
function renderGame() {
  const area = document.getElementById("game-area");
  area.querySelectorAll(".rod-container").forEach(el => el.remove());

  rods.forEach((rod, rodIdx) => {
    const isSelected = selected === rodIdx;

    // Container
    const container = document.createElement("div");
    container.className = "rod-container" + (isSelected ? " selected selected-highlight" : "");
    if (!isSolving) {
      container.addEventListener("click", () => handleRodClick(rodIdx));
    }

    // Label
    const label = document.createElement("div");
    label.className   = "rod-label";
    label.textContent = "Rod " + ROD_NAMES[rodIdx];
    container.appendChild(label);

    // Stack
    const stack = document.createElement("div");
    stack.className    = "rod-stack";
    stack.style.height = ROD_H + "px";
    stack.style.width  = (MAX_DISK_W + 20) + "px";

    // Pole
    const pole = document.createElement("div");
    pole.className    = "rod-pole";
    pole.style.height = ROD_H + "px";
    stack.appendChild(pole);

    // Disk wrapper (column-reverse = bottom disk at bottom visually)
    const diskWrapper = document.createElement("div");
    diskWrapper.style.cssText = `
      position: absolute; bottom: 0; left: 0; right: 0;
      display: flex; flex-direction: column-reverse;
      align-items: center;
    `;

    rod.forEach((disk, diskIdx) => {
      const isTop    = diskIdx === rod.length - 1;
      const isLifted = isSelected && isTop && !isSolving;
      const w        = getDiskWidth(disk.size);

      const el = document.createElement("div");
      el.className = "disk" + (isLifted ? " lifted" : "");
      el.style.cssText = `
        width: ${w}px;
        height: ${DISK_H}px;
        background: ${disk.color};
        box-shadow: ${isLifted
          ? `0 10px 28px ${disk.color}99`
          : `0 2px 8px rgba(0,0,0,0.6)`};
        margin-bottom: 2px;
      `;
      el.textContent = disk.size;
      diskWrapper.appendChild(el);
    });

    stack.appendChild(diskWrapper);
    container.appendChild(stack);
    area.appendChild(container);
  });

  updateStats();
}

// ── Manual Game Logic ────────────────────────────────────────

/**
 * Handles a rod click during manual play.
 * @param {number} rodIdx
 */
function handleRodClick(rodIdx) {
  if (won || isSolving) return;

  // Select
  if (selected === null) {
    if (rods[rodIdx].length === 0) return;
    selected = rodIdx;
    setInstruction(`Rod ${ROD_NAMES[rodIdx]} selected — click destination`);
    renderGame();
    return;
  }

  // Deselect same rod
  if (selected === rodIdx) {
    selected = null;
    setInstruction("Click a rod to pick up its top disk");
    renderGame();
    return;
  }

  // Validate move
  const fromRod = rods[selected];
  const toRod   = rods[rodIdx];
  const disk    = fromRod[fromRod.length - 1];
  const topDest = toRod[toRod.length - 1];

  if (topDest && topDest.size < disk.size) {
    showBanner("invalid", "✗ Can't place a larger disk on a smaller one");
    selected = null;
    renderGame();
    return;
  }

  // Apply move
  applyMove(selected, rodIdx, false);
}

/**
 * Applies a move from one rod to another.
 * @param {number} fromIdx
 * @param {number} toIdx
 * @param {boolean} isBfs - whether this is an auto-solve move
 */
function applyMove(fromIdx, toIdx, isBfs) {
  const disk = rods[fromIdx][rods[fromIdx].length - 1];
  history.push({ from: fromIdx, to: toIdx });
  rods[toIdx].push(rods[fromIdx].pop());
  moves++;
  selected = null;

  logMove(fromIdx, toIdx, disk.size, isBfs);
  setInstruction("Click a rod to pick up its top disk");

  // Win check
  if (!isBfs && (toIdx !== 0) && rods[toIdx].length === numDisks) {
    won = true;
    const perfect = moves === minMoves(numDisks);
    showBanner("win", perfect
      ? `✓ Perfect! Solved in ${moves} moves`
      : `✓ Solved in ${moves} moves`
    );
    setInstruction("Puzzle complete!");
  }

  renderGame();
}

// ── BFS Auto-Solve ───────────────────────────────────────────

/** Starts the BFS auto-solve sequence */
function startAutoSolve() {
  if (isSolving) {
    stopAutoSolve();
    return;
  }

  // Reset to initial state first
  hardReset(numDisks, false);

  setBfsStatus("⚙ Running BFS — computing optimal path...", true);

  // Run BFS (synchronous, fast enough for up to 8 disks)
  const solution = bfsSolve(numDisks);

  if (solution.length === 0) {
    setBfsStatus("BFS found no solution.");
    return;
  }

  setBfsStatus(`✓ BFS complete — ${solution.length} moves found. Animating...`);

  isSolving = true;
  document.getElementById("auto-btn").textContent = "⏹ Stop";
  document.getElementById("auto-btn").classList.add("solving");
  document.getElementById("speed-control").classList.add("visible");
  renderGame();

  let step = 0;

  function playStep() {
    if (step >= solution.length || !isSolving) {
      finishAutoSolve(step >= solution.length);
      return;
    }

    const move = solution[step];
    applyMove(move.from, move.to, true);
    step++;

    solveTimer = setTimeout(playStep, solveDelay);
  }

  playStep();
}

/** Called when the auto-solve completes or is stopped */
function finishAutoSolve(completed) {
  isSolving = false;
  clearTimeout(solveTimer);

  document.getElementById("auto-btn").textContent = "⚡ Auto Solve (BFS)";
  document.getElementById("auto-btn").classList.remove("solving");
  document.getElementById("speed-control").classList.remove("visible");

  if (completed) {
    won = true;
    const perfect = moves === minMoves(numDisks);
    showBanner("win", perfect
      ? `✓ BFS Solved! ${moves} moves — Optimal`
      : `✓ BFS Solved in ${moves} moves`
    );
    setBfsStatus(`BFS completed in ${moves} moves (optimal: ${minMoves(numDisks)})`);
    setInstruction("Puzzle solved by BFS!");
  } else {
    setBfsStatus("Auto-solve stopped.");
    setInstruction("Click a rod to pick up its top disk");
  }

  renderGame();
}

/** Stops a running auto-solve */
function stopAutoSolve() {
  isSolving = false;
  clearTimeout(solveTimer);
  document.getElementById("auto-btn").textContent = "⚡ Auto Solve (BFS)";
  document.getElementById("auto-btn").classList.remove("solving");
  document.getElementById("speed-control").classList.remove("visible");
  setBfsStatus("Auto-solve stopped.");
  setInstruction("Click a rod to pick up its top disk");
  renderGame();
}

// ── Reset & Undo ─────────────────────────────────────────────

/**
 * Resets the game.
 * @param {number} n - number of disks
 * @param {boolean} clearBfsStatus - whether to clear the BFS status line
 */
function hardReset(n, clearBfsStatus = true) {
  if (isSolving) stopAutoSolve();

  numDisks = n || numDisks;
  rods     = [generateDisks(numDisks), [], []];
  selected = null;
  moves    = 0;
  history  = [];
  won      = false;

  showBanner("", "");
  setInstruction("Click a rod to pick up its top disk");
  if (clearBfsStatus) setBfsStatus("");
  clearLog();

  document.querySelectorAll(".disk-btn").forEach(btn => {
    btn.classList.toggle("active", parseInt(btn.dataset.n) === numDisks);
  });

  renderGame();
}

/** Undoes the last manual move */
function undo() {
  if (history.length === 0 || isSolving || won) return;
  const last = history.pop();
  rods[last.from].push(rods[last.to].pop());
  moves--;
  selected = null;

  // Remove last log entry
  const log     = document.getElementById("move-log");
  const entries = log.querySelectorAll(".log-entry");
  if (entries.length > 0) entries[entries.length - 1].remove();
  if (log.querySelectorAll(".log-entry").length === 0) {
    log.innerHTML = '<p class="log-empty">No moves yet.</p>';
  }

  renderGame();
}

// ── Event Listeners ──────────────────────────────────────────
document.getElementById("auto-btn").addEventListener("click", startAutoSolve);
document.getElementById("reset-btn").addEventListener("click", () => hardReset(numDisks));
document.getElementById("undo-btn").addEventListener("click", undo);

document.querySelectorAll(".disk-btn").forEach(btn => {
  btn.addEventListener("click", () => hardReset(parseInt(btn.dataset.n)));
});

const speedSlider = document.getElementById("speed-slider");
const speedLabel  = document.getElementById("speed-label");

speedSlider.addEventListener("input", () => {
  // Invert: left = fast, right = slow
  const raw  = parseInt(speedSlider.value);
  solveDelay = raw;
  speedLabel.textContent = raw + "ms";
});

// ── Init ─────────────────────────────────────────────────────
hardReset(4);
