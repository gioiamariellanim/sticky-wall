const API = "https://script.google.com/macros/s/AKfycbzUFPOqlRbtS-uExuoM6XsZ7KuDQ70t8y-6OKbnKAuvl6747WdPhtNUCYrtZeN4NKZE6Q/exec";

const wall = document.getElementById("wall");
const picker = document.getElementById("picker");
const newBtn = document.getElementById("newStickyBtn");

let activeSticky = null;

const GRID = 20;
const BG = (c) => `./assets/sticky-${c}.svg`;
const snap = (n) => Math.round(n / GRID) * GRID;

/* Load saved notes */
fetch(`${API}?action=getNotes`)
  .then(r => r.json())
  .then(d => (d.notes || []).forEach(render))
  .catch(() => {});

/* New Sticky */
newBtn.onclick = () => {
  const el = createSticky("yellow", true);
  activeSticky = el;
  picker.classList.remove("hidden");
};

/* Color picker */
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

function createSticky(color, editable) {
  const el = document.createElement("div");
  el.className = "sticky";
  el.dataset.color = color;
  el.style.backgroundImage = `url("${BG(color)}")`;

  const startX = snap(window.innerWidth / 2 - 75);
  const startY = snap(window.innerHeight / 2 - 110);
  el.style.left = startX + "px";
  el.style.top  = startY + "px";

  const ta = document.createElement("textarea");
  ta.disabled = !editable;
  ta.maxLength = 160;
  el.appendChild(ta);

  wall.appendChild(el);
  enableSmoothDrag(el);

  if (editable) {
    ta.onblur = () => save(el, ta.value);
  }

  return el;
}

function render(note) {
  const el = createSticky(note.color || "yellow", false);
  el.style.left = (note.x || 0) + "px";
  el.style.top  = (note.y || 0) + "px";
  el.querySelector("textarea").value = note.text || "";
  el.dataset.id = note.id || "";
}

function save(el, text) {
  if (!text.trim()) return;

  fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "addNote",
      text: text.trim(),
      color: el.dataset.color || "yellow",
      x: el.offsetLeft,
      y: el.offsetTop
    })
  })
    .then(r => r.json())
    .then(d => { if (d?.id) el.dataset.id = d.id; })
    .catch(() => {});
}

/* Smooth drag: transform only while moving, snap on drop */
function enableSmoothDrag(el) {
  let baseLeft = 0, baseTop = 0;
  let startX = 0, startY = 0;
  let dx = 0, dy = 0;
  let dragging = false;

  const apply = () => {
    // Slight rotate for “alive” feel, but ALWAYS combined with translate in JS
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(1deg)`;
    raf = null;
  };

  let raf = null;

  el.addEventListener("pointerdown", (e) => {
    if (e.target.tagName === "TEXTAREA") return;

    e.preventDefault(); // prevents selection/scroll jitter
    dragging = true;
    el.classList.add("dragging");

    baseLeft = el.offsetLeft;
    baseTop = el.offsetTop;

    startX = e.clientX;
    startY = e.clientY;

    dx = 0;
    dy = 0;

    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;

    dx = e.clientX - startX;
    dy = e.clientY - startY;

    if (!raf) raf = requestAnimationFrame(apply);
  });

  const end = () => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove("dragging");

    if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }

    const finalLeft = snap(baseLeft + dx);
    const finalTop = snap(baseTop + dy);

    el.style.left = finalLeft + "px";
    el.style.top = finalTop + "px";

    // IMPORTANT: clear transform entirely after dropping
    el.style.transform = "translate3d(0,0,0)";

    dx = 0; dy = 0;

    if (el.dataset.id) {
      fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updatePosition",
          id: el.dataset.id,
          x: finalLeft,
          y: finalTop
        })
      }).catch(() => {});
    }
  };

  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}
