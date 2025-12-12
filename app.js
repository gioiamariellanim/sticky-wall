const API = "https://script.google.com/macros/s/AKfycbzUFPOqlRbtS-uExuoM6XsZ7KuDQ70t8y-6OKbnKAuvl6747WdPhtNUCYrtZeN4NKZE6Q/exec";

const wall = document.getElementById("wall");
const picker = document.getElementById("picker");
const newBtn = document.getElementById("newStickyBtn");

let activeSticky = null;

const GRID = 20;
const BG = (c) => `./assets/sticky-${c}.svg`;

const snap = (n) => Math.round(n / GRID) * GRID;

/* ---------------- LOAD EXISTING NOTES ---------------- */

fetch(`${API}?action=getNotes`)
  .then(r => r.json())
  .then(d => (d.notes || []).forEach(render))
  .catch(() => {});

/* ---------------- NEW STICKY ---------------- */

newBtn.onclick = () => {
  const el = createSticky("yellow", true);
  activeSticky = el;
  picker.classList.remove("hidden");
};

/* ---------------- COLOR PICKER ---------------- */

document.querySelectorAll(".chips button").forEach(btn => {
  btn.onclick = () => {
    if (!activeSticky) return;
    const color = btn.dataset.color;
    activeSticky.dataset.color = color;
    activeSticky.style.backgroundImage = `url("${BG(color)}")`;
    picker.classList.add("hidden");
    activeSticky.querySelector("textarea").focus();
  };
});

/* ---------------- CREATE STICKY ---------------- */

function createSticky(color, editable) {
  const el = document.createElement("d
