const API = "https://script.google.com/macros/s/AKfycbzUFPOqlRbtS-uExuoM6XsZ7KuDQ70t8y-6OKbnKAuvl6747WdPhtNUCYrtZeN4NKZE6Q/exec
";

const GRID = 20;
const STICKY = 151;

const notesLayer = document.getElementById("notesLayer");
const newBtn = document.getElementById("newStickyBtn");

const picker = document.getElementById("picker");
const pickerPreview = document.getElementById("pickerPreview");
const postBtn = document.getElementById("postBtn");
const charCount = document.getElementById("charCount");

const BG = (color) => `./assets/sticky-${color}.svg`;

let draft = null; // { el, ta, x, y, color }

function snap(n){ return Math.round(n / GRID) * GRID; }

function within(x, y){
  const pad = 10;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const maxX = w - STICKY - pad;
  const maxY = h - STICKY - pad - 90;
  return {
    x: Math.min(Math.max(snap(x), pad), snap(maxX)),
    y: Math.min(Math.max(snap(y), pad), snap(maxY)),
  };
}

function isLinky(text){
  return /(https?:\/\/|www\.|\.com\b|\.net\b|\.org\b|\.io\b|\.gg\b|\.ph\b)/i.test(text);
}

async function apiGet(){
  const r = await fetch(`${API}?action=getNotes`);
  return r.json();
}

async function apiPost(payload){
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify(payload)
  });
  return r.json();
}

function showPicker(color="yellow"){
  pickerPreview.style.backgroundImage = `url("${BG(color)}")`;
  picker.classList.remove("hidden");
}

function hidePicker(){
  picker.classList.add("hidden");
}

function makeStickyEl({id, x, y, color, text, editable}){
  const el = document.createElement("div");
  el.className = "sticky";
  el.dataset.id = id || "";
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.backgroundImage = `url("${BG(color)}")`;

  const ta = document.createElement("textarea");
  ta.maxLength = 160;
  ta.spellcheck = false;
  ta.placeholder = editable ? "Write something…" : "";
  ta.value = text || "";
  ta.disabled = !editable;

  el.appendChild(ta);
  notesLayer.appendChild(el);

  return { el, ta };
}

function enableDrag(el, getId){
  let offX = 0, offY = 0;

  el.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "TEXTAREA") return;

    el.classList.add("dragging");
    offX = e.clientX - el.offsetLeft;
    offY = e.clientY - el.offsetTop;

    const move = (m) => {
      el.style.left = `${m.clientX - offX}px`;
      el.style.top = `${m.clientY - offY}px`;
    };

    const up = async () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      el.classList.remove("dragging");

      const p = within(el.offsetLeft, el.offsetTop);
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;

      // Only save position if posted (has id)
      const id = getId();
      if (id) await apiPost({ action:"updatePosition", id, x:p.x, y:p.y });

      // Keep draft coords updated so posting uses the latest
      if (draft && el === draft.el) {
        draft.x = p.x;
        draft.y = p.y;
      }
    };

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  });
}

function updateDraftUI(){
  if (!draft) return;
  const text = draft.ta.value || "";
  charCount.textContent = `${text.length} / 160`;

  const ok = text.trim().length > 0 && text.length <= 160 && !isLinky(text);
  postBtn.disabled = !ok;
}

// Load existing notes
(async function init(){
  try{
    const data = await apiGet();
    if (!data.ok) return;

    data.notes.forEach(n => {
      const p = within(Number(n.x||0), Number(n.y||0));
      const { el } = makeStickyEl({
        id: n.id,
        x: p.x,
        y: p.y,
        color: n.color || "yellow",
        text: n.text || "",
        editable: false
      });
      enableDrag(el, () => n.id);
    });
  } catch (e){
    console.error("Init error:", e);
  }
})();

// New sticky
newBtn.addEventListener("click", () => {
  if (draft?.el) draft.el.remove();

  const center = within((window.innerWidth - STICKY) / 2, (window.innerHeight - STICKY) / 2);
  const created = makeStickyEl({
    id: "",
    x: center.x,
    y: center.y,
    color: "yellow",
    text: "",
    editable: true
  });

  draft = { el: created.el, ta: created.ta, x: center.x, y: center.y, color: "yellow", id: "" };

  enableDrag(draft.el, () => draft.id); // draft is draggable too
  showPicker("yellow");

  draft.ta.addEventListener("input", updateDraftUI);
  updateDraftUI();
  draft.ta.focus();
});

// Color picker chips
document.querySelectorAll(".chip").forEach(btn => {
  btn.addEventListener("click", () => {
    if (!draft) return;
    const color = btn.dataset.color;
    draft.color = color;
    draft.el.style.backgroundImage = `url("${BG(color)}")`;
    pickerPreview.style.backgroundImage = `url("${BG(color)}")`;
  });
});

// Post button
postBtn.addEventListener("click", async () => {
  if (!draft) return;

  const text = (draft.ta.value || "").trim();
  if (!text) return;

  if (isLinky(text)) {
    alert("Links aren’t allowed.");
    return;
  }

  const res = await apiPost({
    action: "addNote",
    text,
    color: draft.color,
    x: draft.x,
    y: draft.y
  });

  if (!res.ok) {
    alert(res.error || "Could not save note.");
    return;
  }

  // simplest: reload to fetch new id + render read-only
  location.reload();
});

// Hide picker when clicking outside it (optional)
document.addEventListener("mousedown", (e) => {
  if (picker.classList.contains("hidden")) return;
  const clickInside = picker.contains(e.target) || newBtn.contains(e.target) || draft?.el?.contains(e.target);
  if (!clickInside) hidePicker();
});
