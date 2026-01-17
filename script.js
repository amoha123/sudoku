// ----------------------
// Sudoku Starter (Option A)
// ----------------------

// 0 means empty
const PUZZLES = [
  {
    name: "Sample",
    puzzle: [
      [5,3,0, 0,7,0, 0,0,0],
      [6,0,0, 1,9,5, 0,0,0],
      [0,9,8, 0,0,0, 0,6,0],

      [8,0,0, 0,6,0, 0,0,3],
      [4,0,0, 8,0,3, 0,0,1],
      [7,0,0, 0,2,0, 0,0,6],

      [0,6,0, 0,0,0, 2,8,0],
      [0,0,0, 4,1,9, 0,0,5],
      [0,0,0, 0,8,0, 0,7,9],
    ],
  },
];

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const newGameBtn = document.getElementById("newGameBtn");
const resetBtn = document.getElementById("resetBtn");
const notesToggle = document.getElementById("notesToggle");
const numpadEl = document.getElementById("numpad");

let puzzle = deepCopy(PUZZLES[0].puzzle);
let startGrid = deepCopy(puzzle);     // used for Reset
let grid = deepCopy(puzzle);          // current play grid

let given = makeGivenMask(startGrid); // true where locked
let notes = makeEmptyNotes();         // Set per cell (0..80)

let selected = { r: 0, c: 0 };

// ---------- helpers ----------
function deepCopy(arr) {
  return arr.map(row => row.slice());
}

function idx(r, c) { return r * 9 + c; }

function makeGivenMask(g) {
  const mask = Array.from({ length: 9 }, () => Array(9).fill(false));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      mask[r][c] = g[r][c] !== 0;
    }
  }
  return mask;
}

function makeEmptyNotes() {
  // notes[cellIndex] = Set of numbers
  return Array.from({ length: 81 }, () => new Set());
}

function boxStart(n) { return Math.floor(n / 3) * 3; }

// Check if placing val at (r,c) violates sudoku constraints (ignores itself)
function isValidMove(g, r, c, val) {
  if (val === 0) return true;

  // row
  for (let cc = 0; cc < 9; cc++) {
    if (cc !== c && g[r][cc] === val) return false;
  }
  // col
  for (let rr = 0; rr < 9; rr++) {
    if (rr !== r && g[rr][c] === val) return false;
  }
  // box
  const br = boxStart(r);
  const bc = boxStart(c);
  for (let rr = br; rr < br + 3; rr++) {
    for (let cc = bc; cc < bc + 3; cc++) {
      if ((rr !== r || cc !== c) && g[rr][cc] === val) return false;
    }
  }
  return true;
}

// For rendering conflicts: returns true if current value at (r,c) conflicts
function isCellConflict(g, r, c) {
  const val = g[r][c];
  if (val === 0) return false;
  return !isValidMove(g, r, c, val);
}

function isSolved(g) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (g[r][c] === 0) return false;
      if (isCellConflict(g, r, c)) return false;
    }
  }
  return true;
}

// ---------- UI ----------
function buildNumpad() {
  numpadEl.innerHTML = "";
  for (let n = 1; n <= 9; n++) {
    const b = document.createElement("button");
    b.textContent = String(n);
    b.addEventListener("click", () => applyInput(n));
    numpadEl.appendChild(b);
  }
  const clear = document.createElement("button");
  clear.textContent = "Clear";
  clear.style.gridColumn = "span 3";
  clear.addEventListener("click", () => applyInput(0));
  numpadEl.appendChild(clear);
}

function render() {
  boardEl.innerHTML = "";

  const sel = selected;
  const selBoxR = boxStart(sel.r);
  const selBoxC = boxStart(sel.c);

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      // Alternate box shading
      const boxParity = ((Math.floor(r/3) + Math.floor(c/3)) % 2 === 0);
      if (!boxParity) cell.classList.add("alt");

      // Thicker separators
      if (c === 2 || c === 5) cell.classList.add("sep-right");
      if (r === 2 || r === 5) cell.classList.add("sep-bottom");

      // Given
      if (given[r][c]) cell.classList.add("given");

      // Selected + related highlights
      const sameRow = r === sel.r;
      const sameCol = c === sel.c;
      const sameBox = (r >= selBoxR && r < selBoxR+3 && c >= selBoxC && c < selBoxC+3);

      if (r === sel.r && c === sel.c) cell.classList.add("selected");
      else if (sameRow || sameCol || sameBox) cell.classList.add("related");

      // Conflicts
      if (isCellConflict(grid, r, c)) cell.classList.add("conflict");

      cell.dataset.r = String(r);
      cell.dataset.c = String(c);

      const val = grid[r][c];
      if (val !== 0) {
        cell.textContent = String(val);
      } else {
        // show notes if any
        const s = notes[idx(r, c)];
        if (s.size > 0) {
          const notesEl = document.createElement("div");
          notesEl.className = "notes";
          for (let n = 1; n <= 9; n++) {
            const d = document.createElement("div");
            d.className = "note";
            d.textContent = s.has(n) ? String(n) : "";
            notesEl.appendChild(d);
          }
          cell.appendChild(notesEl);
        } else {
          cell.textContent = "";
        }
      }

      cell.addEventListener("click", () => {
        selected = { r, c };
        render();
      });

      boardEl.appendChild(cell);
    }
  }

  if (isSolved(grid)) {
    statusEl.textContent = "✅ Solved! Nice.";
    statusEl.style.color = "var(--good)";
  } else {
    statusEl.textContent = notesToggle.checked
      ? "Notes mode: add/remove pencil marks."
      : "Type 1–9. Backspace/Delete to clear.";
    statusEl.style.color = "var(--muted)";
  }
}

function applyInput(val) {
  const { r, c } = selected;
  if (given[r][c]) return;

  if (notesToggle.checked) {
    // Toggle notes
    const s = notes[idx(r, c)];
    if (val === 0) {
      s.clear();
    } else {
      if (s.has(val)) s.delete(val);
      else s.add(val);
    }
    render();
    return;
  }

  // Normal entry
  if (val === 0) {
    grid[r][c] = 0;
    notes[idx(r, c)].clear();
    render();
    return;
  }

  grid[r][c] = val;
  notes[idx(r, c)].clear();
  render();
}

// ---------- input handlers ----------
document.addEventListener("keydown", (e) => {
  const key = e.key;

  // Arrow navigation
  if (key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight") {
    e.preventDefault();
    let { r, c } = selected;
    if (key === "ArrowUp") r = (r + 8) % 9;
    if (key === "ArrowDown") r = (r + 1) % 9;
    if (key === "ArrowLeft") c = (c + 8) % 9;
    if (key === "ArrowRight") c = (c + 1) % 9;
    selected = { r, c };
    render();
    return;
  }

  // Numbers
  if (/^[1-9]$/.test(key)) {
    applyInput(Number(key));
    return;
  }

  // Clear
  if (key === "Backspace" || key === "Delete" || key === "0") {
    applyInput(0);
    return;
  }
});

// ---------- buttons ----------
newGameBtn.addEventListener("click", () => {
  // For now pick the sample; later we’ll add difficulty + generator
  puzzle = deepCopy(PUZZLES[0].puzzle);
  startGrid = deepCopy(puzzle);
  grid = deepCopy(puzzle);
  given = makeGivenMask(startGrid);
  notes = makeEmptyNotes();
  selected = { r: 0, c: 0 };
  render();
});

resetBtn.addEventListener("click", () => {
  grid = deepCopy(startGrid);
  notes = makeEmptyNotes();
  render();
});

// ---------- init ----------
buildNumpad();
render();
