const API = "https://script.google.com/macros/s/AKfycbzUFPOqlRbtS-uExuoM6XsZ7KuDQ70t8y-6OKbnKAuvl6747WdPhtNUCYrtZeN4NKZE6Q/exec";

const wall = document.getElementById("wall");
const picker = document.getElementById("picker");
const newBtn = document.getElementById("newStickyBtn");

let activeSticky = null;

const BG = c => `./assets/sticky-${c}.svg`;

function snap(n){ return Math.round(n / 20) * 20; }

// Load saved notes
fetch(`${API}?action=getNotes`)
  .then(r => r.json())
  .then(d => d.notes.forEach(render));

newBtn.onclick = () => {
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
    picker.classList.add("hidden");
    activeSticky.querySelector("textarea").focus();
  };
});

function createSticky(color, editable) {
  const el = document.createElement("div");
  el.className = "sticky";
  el.dataset.color = color;
  el.style.backgroundImage = `url("${BG(color)}")`;
  el.style.left = snap(window.innerWidth / 2) + "px";
  el.style.top = snap(window.innerHeight / 2) + "px";

  const ta = document.createElement("textarea");
  ta.disabled = !editable;
  el.appendChild(ta);

  wall.appendChild(el);
  drag(el);

  if (editable) {
    ta.onblur = () => save(el, ta.value);
  }

  return el;
}

function render(note) {
  const el = createSticky(note.color, false);
  el.style.left = note.x + "px";
  el.style.top = note.y + "px";
  el.querySelector("textarea").value = note.text;
  el.dataset.id = note.id;
}

function save(el, text) {
  if (!text.trim()) return;

  fetch(API, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({
      action: "addNote",
      text,
      color: el.dataset.color,
      x: el.offsetLeft,
      y: el.offsetTop
    })
  })
  .then(r => r.json())
  .then(d => el.dataset.id = d.id);
}

function drag(el) {
  let ox, oy;
  el.onmousedown = e => {
    ox = e.clientX - el.offsetLeft;
    oy = e.clientY - el.offsetTop;

    document.onmousemove = m => {
      el.style.left = snap(m.clientX - ox) + "px";
      el.style.top = snap(m.clientY - oy) + "px";
    };

    document.onmouseup = () => {
      document.onmousemove = null;
      if (el.dataset.id) {
        fetch(API, {
          method: "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify({
            action: "updatePosition",
            id: el.dataset.id,
            x: el.offsetLeft,
            y: el.offsetTop
          })
        });
      }
    };
  };
}
