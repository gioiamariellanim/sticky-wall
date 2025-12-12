// Paste your Apps Script /exec URL here:
const API = "https://script.google.com/macros/s/AKfycbzUFPOqlRbtS-uExuoM6XsZ7KuDQ70t8y-6OKbnKAuvl6747WdPhtNUCYrtZeN4NKZE6Q/exec";

const wall = document.getElementById("wall");
const picker = document.getElementById("picker");
const newBtn = document.getElementById("newStickyBtn");

let activeSticky = null;

const GRID = 20;
const BG = (c) => `./assets/sticky-${c}.svg`;

function snap(n){ return Math.round(n / GRID) * GRID; }

// Load saved notes
fetch(`${API}?action=getNotes`)
  .then(r => r.json())
  .then(d => (d.notes || []).forEach(render))
  .catch(() => {
    // If API fails, app still works locally.
  });

newBtn.onclick = () => {
  // Create a new draft sticky (does NOT delete old ones)
  const el = createSticky("yellow", true);
  activeSticky = el;
  picker.classList.remove("hidden");
};

document.querySelectorAll(".chips button").forEach(btn => {
  btn.onclick = () => {
    if (!activeSticky) return;
    const color = btn.dataset.color;
    activeSticky.style.backgroundImage = `url("${BG(color)}")`;
    activeSticky.dataset.color = color;

    // Hide picker after choosing a color, then write
    picker.classList.add("hidden");
    activeSticky.querySelector("textarea").focus();
  };
});

function createSticky(color, editable) {
  const el = document.createElement("div");
  el.className = "sticky";
  el.dataset.color = color;
  el.style.backgroundImage = `url("${BG(color)}")`;

  // center-ish
  el.style.left = snap(window.innerWidth / 2 - 75) + "px";
  el.style.top  = snap(window.innerHeight / 2 - 110) + "px";

  const ta = document.createElement("textarea");
  ta.disabled = !editable;
  ta.maxLength = 160;
  el.appendChild(ta);

  wall.appendChild(el);
  drag(el);

  // Save to Sheets on blur (if backend works)
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
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({
      action: "addNote",
      text: text.trim(),
      color: el.dataset.color || "yellow",
      x: el.offsetLeft,
      y: el.offsetTop
    })
  })
  .then(r => r.json())
  .then(d => {
    if (d && d.id) el.dataset.id = d.id;
  })
  .catch(() => {
    // silently fail for now
  });
}

// Smooth drag using transform during move + snap on drop
function drag(el) {
  let startX = 0, startY = 0;
  let originLeft = 0, originTop = 0;

  let pendingX = 0, pendingY = 0;
  let rafId = null;

  const apply = () => {
    rafId = null;
    el.style.transform = `translate3d(${pendingX}px, ${pendingY}px, 0)`;
  };

  el.addEventListener("pointerdown", (e) => {
    if (e.target && e.target.tagName === "TEXTAREA") return;

    el.setPointerCapture(e.pointerId);
    el.classList.add("dragging");
    el.classList.remove("settle");

    originLeft = el.offsetLeft;
    originTop  = el.offsetTop;

    startX = e.clientX;
    startY = e.clientY;

    pendingX = 0;
    pendingY = 0;
    el.style.transform = `translate3d(0,0,0)`;

    const onMove = (m) => {
      pendingX = (m.clientX - startX);
      pendingY = (m.clientY - startY);

      if (!rafId) rafId = requestAnimationFrame(apply);
    };

    const onUp = () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);

      el.classList.remove("dragging");
      el.classList.add("settle");

      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      const finalLeft = snap(originLeft + pendingX);
      const finalTop  = snap(originTop + pendingY);

      el.style.left = finalLeft + "px";
      el.style.top  = finalTop + "px";
      el.style.transform = `translate3d(0,0,0)`;

      // Save position if it has been saved (has id)
      if (el.dataset.id) {
        fetch(API, {
          method: "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify({
            action: "updatePosition",
            id: el.dataset.id,
            x: finalLeft,
            y: finalTop
          })
        }).catch(() => {});
      }
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  });
}
