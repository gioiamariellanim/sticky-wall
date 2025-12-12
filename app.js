const API = "PASTE_YOUR_APPS_SCRIPT_URL_HERE";

const wall = document.getElementById("wall");
const newBtn = document.getElementById("new");

const GRID = 20;
const STICKY_SIZE = 151;

function snap(n) {
  return Math.round(n / GRID) * GRID;
}

// Load notes
fetch(`${API}?action=getNotes`)
  .then(res => res.json())
  .then(data => {
    if (!data.ok) return;
    data.notes.forEach(renderSticky);
  });

// Create new sticky (local first)
newBtn.onclick = () => {
  const x = snap(window.innerWidth / 2 - STICKY_SIZE / 2);
  const y = snap(window.innerHeight / 2 - STICKY_SIZE / 2);

  const el = document.createElement("div");
  el.className = "sticky";
  el.style.left = x + "px";
  el.style.top = y + "px";
  el.style.background =
    `url("./assets/sticky-yellow.svg") center / contain no-repeat`;

  const ta = document.createElement("textarea");
  ta.placeholder = "Write something…";
  el.appendChild(ta);
  wall.appendChild(el);

  ta.focus();

  // Save to backend on blur
  ta.onblur = () => {
    const text = ta.value.trim();
    if (!text) {
      el.remove();
      return;
    }

    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addNote",
        text,
        color: "yellow",
        x,
        y
      })
    }).then(() => location.reload());
  };
};

function renderSticky(note) {
  const el = document.createElement("div");
  el.className = "sticky";
  el.style.left = snap(note.x) + "px";
  el.style.top = snap(note.y) + "px";
  el.style.background =
    `url("./assets/sticky-${note.color}.svg") center / contain no-repeat`;

  const ta = document.createElement("textarea");
  ta.value = note.text;
  ta.disabled = true;
  el.appendChild(ta);

  enableDrag(el, note.id);
  wall.appendChild(el);
}

function enableDrag(el, id) {
  let offsetX, offsetY;

  el.onmousedown = e => {
    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;

    document.onmousemove = m => {
      el.style.left = m.clientX - offsetX + "px";
      el.style.top = m.clientY - offsetY + "px";
    };

    document.onmouseup = () => {
      document.onmousemove = null;

      const x = snap(el.offsetLeft);
      const y = snap(el.offsetTop);
      el.style.left = x + "px";
      el.style.top = y + "px";

      fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updatePosition",
          id,
          x,
          y
        })
      });
    };
  };
}
