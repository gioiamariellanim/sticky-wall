// ✅ Paste your Apps Script /exec URL here:
const API = "https://script.google.com/macros/s/AKfycbzUFPOqlRbtS-uExuoM6XsZ7KuDQ70t8y-6OKbnKAuvl6747WdPhtNUCYrtZeN4NKZE6Q/exec";

const GRID = 20;
const STICKY = 151;
const MAX_CHARS = 160;

const BG = (color) => `./assets/sticky-${color}.svg`;

const notesLayer = document.getElementById("notesLayer");
const newBtn = document.getElementById("newStickyBtn");

const statusEl = document.getElementById("status");

const composer = document.getElementById("composer");
const preview = document.getElementById("preview");
const postBtn = document.getElementById("postBtn");
const charCount = document.getElementById("charCount");
const closeComposer = document.getElementById("closeComposer");

let draft = null; // { el, ta, x, y, color, id }

// ---------- UI helpers ----------
function showStatus(msg, ms = 3000){
  statusEl.textContent = msg;
  statusEl.classList.remove("hidden");
  if (ms > 0) setTimeout(() => statusEl.classList.add("hidden"), ms);
}
function hideStatus(){ statusEl.classList.add("hidden"); }

function openComposer(color="yellow"){
  preview.style.backgroundImage = `url("${BG(color)}")`;
  composer.classList.remove("hidden");
}
function closeComposerUI(){
  composer.classList.add("hidden");
}

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

// ---------- API helpers ----------
async function apiGetNotes(){
  const r = await fetch(`${API}?action=getNotes`, { method: "GET" });
  return r.json();
}

async function apiPost(payload){
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify(payload),
  });
  return r.json();
}

// ---------- Sticky rendering ----------
function makeStickyEl({ id, x, y, color, text, editable }){
  const el = document.createElement("div");
  el.className = "sticky";
  el.dataset.id = id || "";
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.backgroundImage = `url("${BG(color)}")`;

  const ta = document.createElement("textarea");
  ta.maxLength = MAX_CHARS;
  ta.spellcheck = false;
  ta.value = text || "";
  ta.placeholder = editable ? "Write something…" : "";
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

      // Save position only for posted notes (has id)
      const id = getId();
      if (id) {
        try {
          await apiPost({ action: "updatePosition", id, x: p.x, y: p.y });
        } catch {
          showStatus("Couldn’t save position (API issue).", 3500);
        }
      }

      // If dragging draft, keep its coordinates updated
      if (draft && el === draft.el) {
        draft.x = p.x;
        draft.y = p.y;
      }
    };

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  });
}

// ---------- Draft logic ----------
function updateDraftControls(){
  if (!draft) return;
  const text = draft.ta.value || "";
  charCount.textContent = `${text.length} / ${MAX_CHARS}`;

  const ok =
    text.trim().length > 0 &&
    text.length <= MAX_CHARS &&
    !isLinky(text);

  postBtn.disabled = !ok;
}

function removeDraft(){
  if (draft?.el) draft.el.remove();
  draft = null;
  closeComposerUI();
}

// ---------- Init ----------
(async function init(){
  // Load existing notes (and show a friendly status if API blocks)
  try{
    const data = await apiGetNotes();
    if (!data.ok) {
      showStatus("API is responding, but returned an error.", 5000);
      return;
    }

    data.notes.forEach(n => {
      const p = within(Number(n.x || 0), Number(n.y || 0));
      const { el } = makeStickyEl({
        id: n.id,
        x: p.x,
        y: p.y,
        color: (n.color || "yellow"),
        text: (n.text || ""),
        editable: false
      });
      enableDrag(el, () => n.id);
    });
  } catch (e){
    // This is where “public access still not right” will show up
    showStatus("Can’t reach the Google Script API. Check deployment access = Anyone.", 7000);
  }
})();

// New Sticky always creates a local draft immediately (no API needed)
newBtn.addEventListener("click", () => {
  hideStatus();

  // Remove existing draft if any
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

  draft = {
    el: created.el,
    ta: created.ta,
    x: center.x,
    y: center.y,
    color: "yellow",
    id: ""
  };

  enableDrag(draft.el, () => draft.id);
  openComposer("yellow");

  draft.ta.addEventListener("input", updateDraftControls);
  updateDraftControls();
  draft.ta.focus();
});

// Color chips
document.querySelectorAll(".chip").forEach(btn => {
  btn.addEventListener("click", () => {
    if (!draft) return;
    const color = btn.dataset.color;
    draft.color = color;
    draft.el.style.backgroundImage = `url("${BG(color)}")`;
    preview.style.backgroundImage = `url("${BG(color)}")`;
  });
});

// Close composer
closeComposer.addEventListener("click", removeDraft);

// Post (save to Google Sheets)
postBtn.addEventListener("click", async () => {
  if (!draft) return;

  const text = (draft.ta.value || "").trim();

  if (!text) {
    showStatus("Write something first.", 2500);
    return;
  }
  if (isLinky(text)) {
    showStatus("Links aren’t allowed.", 3500);
    return;
  }

  try{
    const res = await apiPost({
      action: "addNote",
      text,
      color: draft.color,
      x: draft.x,
      y: draft.y
    });

    if (!res.ok) {
      showStatus("Couldn’t save note. (Backend rejected it)", 5000);
      return;
    }

    // Reload to show the saved note as communal (read-only)
    location.reload();
  } catch {
    showStatus("Couldn’t save note (API access issue). Make deployment access = Anyone.", 7000);
  }
});

// Click outside composer closes it (optional)
document.addEventListener("mousedown", (e) => {
  if (composer.classList.contains("hidden")) return;
  const clickInside = composer.contains(e.target) || newBtn.contains(e.target) || draft?.el?.contains(e.target);
  if (!clickInside) closeComposerUI();
});
