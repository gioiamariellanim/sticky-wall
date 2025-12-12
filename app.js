const API = "PASTE YOUR APPS SCRIPT URL HERE";

const wall = document.getElementById("wall");
const newBtn = document.getElementById("new");

const colors = ["yellow","blue","green","pink","gray"];

fetch(`${API}?action=getNotes`)
  .then(r => r.json())
  .then(d => d.notes.forEach(render));

newBtn.onclick = () => {
  const note = {
    text: "",
    color: "yellow",
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  };

  fetch(API, {
    method: "POST",
    body: JSON.stringify({ action: "addNote", ...note })
  }).then(() => location.reload());
};

function render(note) {
  const el = document.createElement("div");
  el.className = "sticky";
  el.style.left = note.x + "px";
  el.style.top = note.y + "px";
  el.style.background = `url("./assets/sticky-${note.color}.svg") center / contain no-repeat`;

  const ta = document.createElement("textarea");
  ta.value = note.text;
  el.appendChild(ta);

  drag(el, note.id);
  wall.appendChild(el);
}

function drag(el, id) {
  let startX, startY;

  el.onmousedown = e => {
    startX = e.clientX - el.offsetLeft;
    startY = e.clientY - el.offsetTop;

    document.onmousemove = m => {
      el.style.left = m.clientX - startX + "px";
      el.style.top = m.clientY - startY + "px";
    };

    document.onmouseup = () => {
      document.onmousemove = null;

      fetch(API, {
        method: "POST",
        body: JSON.stringify({
          action: "updatePosition",
          id,
          x: el.offsetLeft,
          y: el.offsetTop
        })
      });
    };
  };
}
