// ============================================================
//  miMagia — lógica principal
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  arrayRemove,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

// ---------- Inicialización ----------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
// Firestore con caché local persistente => funciona offline (útil sobre el escenario).
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

// ---------- Estado ----------
let uid = null;
let currentUser = null;
let categories = [];             // [{id, nombre, icono, color}] ordenadas por nombre
let categoriesLoaded = false;
const tricksByCat = new Map();   // catId -> [{id, catId, nombre, ...}]
const trickUnsubs = new Map();   // catId -> unsubscribe
let setlists = [];               // [{id, nombre, fecha, notas, trucos: [trickId]}]
let setlistsLoaded = false;
let unsubscribeCategories = null;
let unsubscribeSetlists = null;

// IDs recién creados o movidos: durante unos segundos no se consideran "desaparecidos"
// aunque el listener todavía no los haya devuelto.
const graceIds = new Set();
function addGrace(id) {
  graceIds.add(id);
  setTimeout(() => { graceIds.delete(id); scheduleRender(); }, 3000);
}

// ---------- Utilidades ----------
const $ = (id) => document.getElementById(id);

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const DEFAULT_COLOR = "#8b5cf6";
const safeColor = (c) => (/^#[0-9a-f]{6}$/i.test(c || "") ? c : DEFAULT_COLOR);

const safeUrl = (u) => {
  try {
    const url = new URL(u);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch { return ""; }
};

// Quita tildes y pasa a minúsculas para buscar "como se escribe".
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const byName = (a, b) => String(a.nombre).localeCompare(String(b.nombre), "es", { sensitivity: "base" });

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

const parseTags = (s) =>
  [...new Set(String(s || "").split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean))].slice(0, 20);

const duration = (t) => Math.max(0, Math.round(Number(t.duracion) || 0));
const difficulty = (t) => Math.min(5, Math.max(0, Math.round(Number(t.dificultad) || 0)));

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 2600);
}

// Firestore aplica las escrituras al instante en la caché local, pero la promesa no se
// resuelve hasta que el servidor confirma (¡nunca, si estás sin conexión!). Por eso no
// las esperamos: avisamos ya y solo mostramos un error si el servidor la rechaza.
function save(promise, okMsg, errMsg = "No se pudo guardar.") {
  if (okMsg) toast(okMsg);
  promise.catch((err) => { console.error(err); toast(errMsg); });
}

// Ejecuta muchas operaciones en lotes (máx. 500 por lote en Firestore).
function batchedWrite(ops) {
  const commits = [];
  let batch = writeBatch(db);
  let n = 0;
  for (const op of ops) {
    op(batch);
    if (++n === 450) { commits.push(batch.commit()); batch = writeBatch(db); n = 0; }
  }
  if (n > 0) commits.push(batch.commit());
  return Promise.all(commits);
}

// ============================================================
//  RUTAS DE DATOS
//    users/{uid}/categorias/{catId}/trucos/{trickId}
//    users/{uid}/repertorios/{setlistId}
// ============================================================
const categoriesCol = () => collection(db, "users", uid, "categorias");
const tricksCol = (catId) => collection(db, "users", uid, "categorias", catId, "trucos");
const setlistsCol = () => collection(db, "users", uid, "repertorios");

const getCategory = (id) => categories.find((c) => c.id === id);
const getSetlist = (id) => setlists.find((s) => s.id === id);
const allTricks = () => categories.flatMap((c) => tricksByCat.get(c.id) || []);
function findTrick(id) {
  for (const list of tricksByCat.values()) {
    const t = list.find((x) => x.id === id);
    if (t) return t;
  }
  return null;
}

// ============================================================
//  NAVEGACIÓN
//  Pila propia sincronizada con el historial del navegador, para que el botón
//  "atrás" del móvil vuelva a la pantalla anterior en lugar de cerrar la app.
// ============================================================
const views = {
  login: $("loginView"),
  categories: $("categoriesView"),
  tricks: $("tricksView"),
  trick: $("trickView"),
  search: $("searchView"),
  setlists: $("setlistsView"),
  setlist: $("setlistView"),
  settings: $("settingsView"),
  perform: $("performView"),
};

const TITLES = {
  categories: "✨ miMagia",
  tricks: "✨ miMagia",
  trick: "✨ miMagia",
  search: "🔍 Buscar",
  setlists: "🎭 Repertorios",
  setlist: "🎭 Repertorios",
  settings: "⚙️ Ajustes",
};

let stack = [{ view: "login", params: {} }];
let pendingBack = false;
const current = () => stack[stack.length - 1];

function navigate(view, params = {}) {
  stack.push({ view, params });
  history.pushState({ depth: stack.length }, "");
  onEnter(view, params);
  render();
}

function goBack() {
  if (stack.length <= 1 || pendingBack) return;
  pendingBack = true;
  history.back();
}

function resetTo(view) {
  if (current().view === "perform") onLeave("perform");
  stack = [{ view, params: {} }];
  render();
}

window.addEventListener("popstate", () => {
  pendingBack = false;
  if (stack.length > 1) {
    const left = stack.pop();
    onLeave(left.view);
    render();
  }
});

$("backBtn").addEventListener("click", goBack);
$("settingsBtn").addEventListener("click", () => navigate("settings"));
$("searchBtn").addEventListener("click", () => navigate("search"));
$("setlistsBtn").addEventListener("click", () => navigate("setlists"));

// Si lo que se está viendo ya no existe (se borró), volvemos atrás.
function missing(id) {
  if (!graceIds.has(id)) goBack();
}

// Al entrar/salir de algunas pantallas hay que preparar cosas.
function onEnter(view, params) {
  if (view === "search") {
    if (params.q !== undefined) searchQuery = params.q;
    $("searchInput").value = searchQuery;
    if (params.q === undefined) setTimeout(() => $("searchInput").focus(), 0);
  }
  if (view === "perform") startPerform();
}
function onLeave(view) {
  if (view === "perform") stopPerform();
}

let renderQueued = false;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  queueMicrotask(() => { renderQueued = false; render(); });
}

function render() {
  const { view, params } = current();
  Object.entries(views).forEach(([k, el]) => (el.hidden = k !== view));
  const loggedIn = view !== "login";
  document.querySelector(".topbar").hidden = view === "perform";
  $("title").textContent = TITLES[view] || "✨ miMagia";
  $("backBtn").hidden = stack.length <= 1;
  $("searchBtn").hidden = !loggedIn || view === "search";
  $("setlistsBtn").hidden = !loggedIn || view === "setlists";
  $("settingsBtn").hidden = !loggedIn || view === "settings";

  switch (view) {
    case "categories": return renderCategories();
    case "tricks": return renderTricks(params.catId);
    case "trick": return renderTrickDetail(params.trickId);
    case "search": return renderSearch();
    case "setlists": return renderSetlists();
    case "setlist": return renderSetlist(params.setlistId);
    case "settings": return renderSettings();
    case "perform": return renderPerform(params.setlistId);
  }
}

// ============================================================
//  AUTENTICACIÓN
// ============================================================
$("loginBtn").addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error(e);
    toast("No se pudo iniciar sesión: " + (e.code || e.message));
  }
});

$("logoutBtn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  cleanupSubscriptions();
  categories = [];
  setlists = [];
  categoriesLoaded = setlistsLoaded = false;
  if (user) {
    uid = user.uid;
    currentUser = user;
    watchCategories();
    watchSetlists();
    resetTo("categories");
  } else {
    uid = null;
    currentUser = null;
    resetTo("login");
  }
});

function cleanupSubscriptions() {
  if (unsubscribeCategories) unsubscribeCategories();
  if (unsubscribeSetlists) unsubscribeSetlists();
  unsubscribeCategories = unsubscribeSetlists = null;
  trickUnsubs.forEach((u) => u());
  trickUnsubs.clear();
  tricksByCat.clear();
}

// ============================================================
//  SUSCRIPCIONES EN TIEMPO REAL
//  Escuchamos todas las categorías y los trucos de cada una. Así los contadores,
//  el buscador y los repertorios se calculan en memoria (y funcionan offline)
//  sin volver a descargar los trucos cada vez.
// ============================================================
function watchCategories() {
  unsubscribeCategories = onSnapshot(
    categoriesCol(),
    (snap) => {
      categories = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byName);
      categoriesLoaded = true;
      const ids = new Set(categories.map((c) => c.id));
      // Nuevas categorías → escuchar sus trucos.
      for (const id of ids) if (!trickUnsubs.has(id)) watchTricks(id);
      // Categorías borradas → dejar de escuchar.
      for (const [id, unsub] of trickUnsubs) {
        if (!ids.has(id)) { unsub(); trickUnsubs.delete(id); tricksByCat.delete(id); }
      }
      scheduleRender();
    },
    (err) => { console.error(err); toast("Error al cargar tipos de magia."); }
  );
}

function watchTricks(catId) {
  const unsub = onSnapshot(
    tricksCol(catId),
    (snap) => {
      tricksByCat.set(catId, snap.docs.map((d) => ({ id: d.id, catId, ...d.data() })).sort(byName));
      scheduleRender();
    },
    (err) => { console.error(err); toast("Error al cargar los trucos."); }
  );
  trickUnsubs.set(catId, unsub);
}

function watchSetlists() {
  unsubscribeSetlists = onSnapshot(
    setlistsCol(),
    (snap) => {
      setlists = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) =>
        String(b.fecha || "").localeCompare(String(a.fecha || "")) || byName(a, b));
      setlistsLoaded = true;
      scheduleRender();
    },
    (err) => { console.error(err); toast("Error al cargar los repertorios."); }
  );
}

// ============================================================
//  PIEZAS DE INTERFAZ REUTILIZABLES
// ============================================================
function categoryChip(c) {
  if (!c) return "";
  return `<span class="chip" style="--chip:${safeColor(c.color)}">${esc(c.icono || "✨")} ${esc(c.nombre)}</span>`;
}

function metaChips(t, { showCategory = false, clickableTags = false } = {}) {
  const parts = [];
  if (showCategory) parts.push(categoryChip(getCategory(t.catId)));
  if (duration(t)) parts.push(`<span class="chip">⏱ ${duration(t)} min</span>`);
  if (difficulty(t)) parts.push(`<span class="chip" title="Dificultad">${"★".repeat(difficulty(t))}</span>`);
  for (const tag of t.etiquetas || []) {
    parts.push(clickableTags
      ? `<button type="button" class="chip tag" data-tag="${esc(tag)}">#${esc(tag)}</button>`
      : `<span class="chip tag">#${esc(tag)}</span>`);
  }
  return parts.join("");
}

function trickItem(t, { showCategory = false } = {}) {
  const el = document.createElement("div");
  el.className = "trick";
  const meta = metaChips(t, { showCategory });
  el.innerHTML = `
    <h3>${esc(t.nombre)}</h3>
    <p>${esc(t.descripcion || t.pasos || "Sin descripción")}</p>
    ${meta ? `<div class="meta-row">${meta}</div>` : ""}`;
  el.addEventListener("click", () => navigate("trick", { trickId: t.id }));
  return el;
}

// Bloques de texto de un truco (detalle y modo actuación).
function trickSections(t) {
  const sec = (title, text) =>
    text ? `<section><h4>${title}</h4><p class="pre">${esc(text)}</p></section>` : "";
  const video = safeUrl(t.video);
  return [
    sec("✨ Efecto", t.descripcion),
    sec("🔑 Pasos / secreto", t.pasos),
    sec("🧰 Material", t.material),
    sec("📝 Notas", t.notas),
    video ? `<section><h4>🎬 Vídeo</h4><p><a href="${esc(video)}" target="_blank" rel="noopener noreferrer">${esc(video)}</a></p></section>` : "",
  ].join("") || `<p class="muted">Este truco aún no tiene contenido. Pulsa ✎ Editar.</p>`;
}

// ============================================================
//  CATEGORÍAS
// ============================================================
function renderCategories() {
  const grid = $("categoriesGrid");
  $("categoriesEmpty").hidden = !categoriesLoaded || categories.length > 0;
  grid.innerHTML = "";
  for (const c of categories) {
    const tricks = tricksByCat.get(c.id);
    const card = document.createElement("div");
    card.className = "card";
    card.style.setProperty("--cat-color", safeColor(c.color));
    card.innerHTML = `
      <button class="card-edit" title="Editar" aria-label="Editar">✎</button>
      <div class="card-icon">${esc(c.icono || "✨")}</div>
      <div>
        <div class="card-name">${esc(c.nombre)}</div>
        <div class="card-count">${tricks ? plural(tricks.length, "truco") : "…"}</div>
      </div>`;
    card.addEventListener("click", () => navigate("tricks", { catId: c.id }));
    card.querySelector(".card-edit").addEventListener("click", (e) => {
      e.stopPropagation();
      openCategoryDialog(c);
    });
    grid.appendChild(card);
  }
}

// ----- Modal categoría -----
const categoryDialog = $("categoryDialog");
let editingCategory = null;

$("addCategoryBtn").addEventListener("click", () => openCategoryDialog(null));
$("settingsAddCategory").addEventListener("click", () => openCategoryDialog(null));

function openCategoryDialog(cat) {
  editingCategory = cat;
  $("categoryDialogTitle").textContent = cat ? "Editar tipo de magia" : "Nuevo tipo de magia";
  $("categoryName").value = cat ? cat.nombre : "";
  $("categoryIcon").value = cat ? cat.icono || "" : "";
  $("categoryColor").value = cat ? safeColor(cat.color) : "#7c3aed";
  $("deleteCategoryBtn").hidden = !cat;
  categoryDialog.showModal();
}

$("saveCategoryBtn").addEventListener("click", (e) => {
  e.preventDefault();
  const nombre = $("categoryName").value.trim();
  if (!nombre) { $("categoryName").reportValidity(); return; }
  const data = {
    nombre,
    icono: $("categoryIcon").value.trim() || "✨",
    color: safeColor($("categoryColor").value),
  };
  if (editingCategory) {
    save(updateDoc(doc(categoriesCol(), editingCategory.id), data), "Tipo actualizado.");
  } else {
    save(setDoc(doc(categoriesCol()), { ...data, createdAt: serverTimestamp() }), "Tipo creado.");
  }
  categoryDialog.close();
});

$("deleteCategoryBtn").addEventListener("click", () => {
  if (!editingCategory) return;
  if (deleteCategory(editingCategory)) categoryDialog.close();
});

// Borra un tipo y todos sus trucos (y los quita de los repertorios).
function deleteCategory(cat) {
  const tricks = tricksByCat.get(cat.id) || [];
  const msg = tricks.length > 0
    ? `¿Borrar "${cat.nombre}" y sus ${plural(tricks.length, "truco")}? No se puede deshacer.`
    : `¿Borrar "${cat.nombre}"?`;
  if (!confirm(msg)) return false;
  const ids = new Set(tricks.map((t) => t.id));
  const ops = tricks.map((t) => (b) => b.delete(doc(tricksCol(cat.id), t.id)));
  ops.push((b) => b.delete(doc(categoriesCol(), cat.id)));
  for (const s of setlists) {
    if ((s.trucos || []).some((id) => ids.has(id))) {
      ops.push((b) => b.update(doc(setlistsCol(), s.id), { trucos: s.trucos.filter((id) => !ids.has(id)) }));
    }
  }
  save(batchedWrite(ops), "Tipo eliminado.", "No se pudo borrar el tipo.");
  return true;
}

// ============================================================
//  TRUCOS
// ============================================================
function renderTricks(catId) {
  const cat = getCategory(catId);
  if (!cat) return missing(catId);
  $("moduleTitle").textContent = `${cat.icono || "✨"} ${cat.nombre}`;
  const tricks = tricksByCat.get(catId);
  const list = $("tricksList");
  list.innerHTML = "";
  $("tricksEmpty").hidden = !tricks || tricks.length > 0;
  (tricks || []).forEach((t) => list.appendChild(trickItem(t)));
}

$("addTrickBtn").addEventListener("click", () => openTrickDialog(null, current().params.catId));

// ----- Detalle de un truco -----
function renderTrickDetail(trickId) {
  const t = findTrick(trickId);
  if (!t) return missing(trickId);
  const cat = getCategory(t.catId);
  $("trickViewCategory").innerHTML = cat ? `${esc(cat.icono || "✨")} ${esc(cat.nombre)}` : "";
  $("trickViewName").textContent = t.nombre;
  $("trickViewMeta").innerHTML = metaChips(t, { clickableTags: true });
  $("trickViewBody").innerHTML = trickSections(t);
}

$("editTrickBtn").addEventListener("click", () => {
  const t = findTrick(current().params.trickId);
  if (t) openTrickDialog(t);
});

// Pulsar una etiqueta busca todos los trucos con esa etiqueta.
$("trickViewMeta").addEventListener("click", (e) => {
  const tag = e.target.closest("[data-tag]")?.dataset.tag;
  if (tag) navigate("search", { q: "#" + tag });
});

// ----- Modal truco -----
const trickDialog = $("trickDialog");
let editingTrick = null;

function openTrickDialog(trick, defaultCatId) {
  editingTrick = trick;
  const catId = trick ? trick.catId : defaultCatId;
  $("trickDialogTitle").textContent = trick ? "Editar truco" : "Nuevo truco";
  $("trickCategory").innerHTML = categories
    .map((c) => `<option value="${esc(c.id)}">${esc(c.icono || "✨")} ${esc(c.nombre)}</option>`)
    .join("");
  $("trickCategory").value = catId;
  $("trickName").value = trick ? trick.nombre : "";
  $("trickDescription").value = trick?.descripcion || "";
  $("trickSteps").value = trick?.pasos || "";
  $("trickMaterial").value = trick?.material || "";
  $("trickDuration").value = trick && duration(trick) ? duration(trick) : "";
  $("trickDifficulty").value = String(trick ? difficulty(trick) : 0);
  $("trickTags").value = (trick?.etiquetas || []).join(", ");
  $("trickVideo").value = trick?.video || "";
  $("trickNotes").value = trick?.notas || "";
  $("deleteTrickBtn").hidden = !trick;
  trickDialog.showModal();
}

$("saveTrickBtn").addEventListener("click", (e) => {
  e.preventDefault();
  const nombre = $("trickName").value.trim();
  if (!nombre) { $("trickName").reportValidity(); return; }
  const catId = $("trickCategory").value;
  if (!getCategory(catId)) return;
  const video = $("trickVideo").value.trim();
  if (video && !safeUrl(video)) { $("trickVideo").reportValidity(); return; }
  const dur = Math.round(Number($("trickDuration").value) || 0);
  const data = {
    nombre,
    descripcion: $("trickDescription").value.trim(),
    pasos: $("trickSteps").value.trim(),
    material: $("trickMaterial").value.trim(),
    duracion: dur > 0 ? dur : null,
    dificultad: Number($("trickDifficulty").value) || 0,
    etiquetas: parseTags($("trickTags").value),
    video,
    notas: $("trickNotes").value.trim(),
    updatedAt: serverTimestamp(),
  };

  if (!editingTrick) {
    const ref = doc(tricksCol(catId));
    save(setDoc(ref, { ...data, createdAt: serverTimestamp() }), "Truco guardado.");
  } else if (editingTrick.catId === catId) {
    save(updateDoc(doc(tricksCol(catId), editingTrick.id), data), "Truco actualizado.");
  } else {
    // Mover a otro tipo: se copia con el MISMO id (así los repertorios lo siguen
    // encontrando) y se borra del tipo antiguo, todo en un único lote atómico.
    const { id, catId: oldCatId, ...rest } = editingTrick;
    addGrace(id);
    const batch = writeBatch(db);
    batch.set(doc(tricksCol(catId), id), { ...rest, ...data });
    batch.delete(doc(tricksCol(oldCatId), id));
    save(batch.commit(), `Truco movido a ${getCategory(catId).nombre}.`);
  }
  trickDialog.close();
});

$("deleteTrickBtn").addEventListener("click", () => {
  const t = editingTrick;
  if (!t || !confirm("¿Eliminar este truco? No se puede deshacer.")) return;
  const batch = writeBatch(db);
  batch.delete(doc(tricksCol(t.catId), t.id));
  for (const s of setlists) {
    if ((s.trucos || []).includes(t.id)) batch.update(doc(setlistsCol(), s.id), { trucos: arrayRemove(t.id) });
  }
  save(batch.commit(), "Truco eliminado.", "No se pudo eliminar.");
  trickDialog.close();
  if (current().view === "trick") goBack();
});

// ----- Cerrar diálogos con botones "Cancelar" -----
document.querySelectorAll("[data-close]").forEach((btn) =>
  btn.addEventListener("click", () => btn.closest("dialog").close())
);

// ============================================================
//  BUSCADOR
//  Busca en todos los tipos a la vez: nombre, efecto, pasos, material, notas,
//  etiquetas (#etiqueta) y nombre del tipo. Varias palabras = deben estar todas.
// ============================================================
let searchQuery = "";

function trickMatches(t, terms) {
  const cat = getCategory(t.catId);
  const hay = norm([
    t.nombre, t.descripcion, t.pasos, t.material, t.notas, cat?.nombre,
    (t.etiquetas || []).map((x) => "#" + x).join(" "),
  ].join(" \n "));
  return terms.every((term) => hay.includes(term));
}

function renderSearch() {
  const terms = norm(searchQuery).split(/\s+/).filter(Boolean);
  const tricks = allTricks();
  const results = $("searchResults");
  results.innerHTML = "";

  if (terms.length === 0) {
    // Sin búsqueda: mostramos las etiquetas existentes como atajo.
    const tags = [...new Set(tricks.flatMap((t) => t.etiquetas || []))].sort((a, b) => a.localeCompare(b, "es"));
    $("searchInfo").textContent = `${plural(tricks.length, "truco")} en total.` + (tags.length ? " Etiquetas:" : "");
    if (tags.length) {
      const cloud = document.createElement("div");
      cloud.className = "meta-row";
      cloud.innerHTML = tags.map((tag) => `<button type="button" class="chip tag" data-tag="${esc(tag)}">#${esc(tag)}</button>`).join("");
      results.appendChild(cloud);
    }
    return;
  }

  const found = tricks.filter((t) => trickMatches(t, terms)).sort(byName);
  $("searchInfo").textContent = found.length ? plural(found.length, "resultado") : "Sin resultados.";
  found.forEach((t) => results.appendChild(trickItem(t, { showCategory: true })));
}

$("searchInput").addEventListener("input", (e) => {
  searchQuery = e.target.value;
  renderSearch();
});

$("searchResults").addEventListener("click", (e) => {
  const tag = e.target.closest("[data-tag]")?.dataset.tag;
  if (!tag) return;
  searchQuery = "#" + tag;
  $("searchInput").value = searchQuery;
  renderSearch();
});

// ============================================================
//  REPERTORIOS  (lista ordenada de trucos para una actuación)
// ============================================================
const setlistTricks = (s) => (s.trucos || []).map(findTrick).filter(Boolean);
const totalMinutes = (tricks) => tricks.reduce((sum, t) => sum + duration(t), 0);

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? "" : d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function setlistSummary(s) {
  const tricks = setlistTricks(s);
  const min = totalMinutes(tricks);
  return [formatDate(s.fecha), plural(tricks.length, "truco"), min ? `~${min} min` : ""].filter(Boolean).join(" · ");
}

function renderSetlists() {
  const list = $("setlistsList");
  list.innerHTML = "";
  $("setlistsEmpty").hidden = !setlistsLoaded || setlists.length > 0;
  for (const s of setlists) {
    const el = document.createElement("div");
    el.className = "trick";
    el.innerHTML = `<h3>${esc(s.nombre)}</h3><p>${esc(setlistSummary(s))}</p>`;
    el.addEventListener("click", () => navigate("setlist", { setlistId: s.id }));
    list.appendChild(el);
  }
}

function renderSetlist(setlistId) {
  const s = getSetlist(setlistId);
  if (!s) return missing(setlistId);
  const tricks = setlistTricks(s);
  $("setlistName").textContent = s.nombre;
  $("setlistInfo").textContent = setlistSummary(s);
  $("setlistNotes").textContent = s.notas || "";
  $("setlistNotes").hidden = !s.notas;
  $("setlistEmpty").hidden = tricks.length > 0;
  $("performBtn").disabled = tricks.length === 0;

  const list = $("setlistTricks");
  list.innerHTML = "";
  tricks.forEach((t, i) => {
    const row = document.createElement("div");
    row.className = "trick setlist-row";
    row.innerHTML = `
      <span class="setlist-num">${i + 1}</span>
      <div class="setlist-main">
        <h3>${esc(t.nombre)}</h3>
        <div class="meta-row">${metaChips(t, { showCategory: true })}</div>
      </div>
      <div class="setlist-tools">
        <button class="mini-btn" data-move="-1" aria-label="Subir" ${i === 0 ? "disabled" : ""}>↑</button>
        <button class="mini-btn" data-move="1" aria-label="Bajar" ${i === tricks.length - 1 ? "disabled" : ""}>↓</button>
        <button class="mini-btn danger" data-remove aria-label="Quitar">✕</button>
      </div>`;
    row.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return navigate("trick", { trickId: t.id });
      e.stopPropagation();
      const ids = tricks.map((x) => x.id); // de paso limpia ids de trucos borrados
      if (btn.dataset.move) {
        const j = i + Number(btn.dataset.move);
        [ids[i], ids[j]] = [ids[j], ids[i]];
      } else {
        ids.splice(i, 1);
      }
      save(updateDoc(doc(setlistsCol(), s.id), { trucos: ids, updatedAt: serverTimestamp() }));
    });
    list.appendChild(row);
  });
}

// ----- Modal repertorio -----
const setlistDialog = $("setlistDialog");
let editingSetlist = null;

$("addSetlistBtn").addEventListener("click", () => openSetlistDialog(null));
$("editSetlistBtn").addEventListener("click", () => openSetlistDialog(getSetlist(current().params.setlistId)));

function openSetlistDialog(s) {
  editingSetlist = s;
  $("setlistDialogTitle").textContent = s ? "Editar repertorio" : "Nuevo repertorio";
  $("setlistNameInput").value = s?.nombre || "";
  $("setlistDate").value = s?.fecha || "";
  $("setlistNotesInput").value = s?.notas || "";
  $("deleteSetlistBtn").hidden = !s;
  setlistDialog.showModal();
}

$("saveSetlistBtn").addEventListener("click", (e) => {
  e.preventDefault();
  const nombre = $("setlistNameInput").value.trim();
  if (!nombre) { $("setlistNameInput").reportValidity(); return; }
  const data = {
    nombre,
    fecha: $("setlistDate").value || "",
    notas: $("setlistNotesInput").value.trim(),
    updatedAt: serverTimestamp(),
  };
  setlistDialog.close();
  if (editingSetlist) {
    save(updateDoc(doc(setlistsCol(), editingSetlist.id), data), "Repertorio actualizado.");
  } else {
    const ref = doc(setlistsCol());
    addGrace(ref.id);
    save(setDoc(ref, { ...data, trucos: [], createdAt: serverTimestamp() }), "Repertorio creado.");
    navigate("setlist", { setlistId: ref.id });
  }
});

$("deleteSetlistBtn").addEventListener("click", () => {
  const s = editingSetlist;
  if (!s || !confirm(`¿Eliminar el repertorio "${s.nombre}"? Los trucos no se borran.`)) return;
  save(deleteDoc(doc(setlistsCol(), s.id)), "Repertorio eliminado.", "No se pudo eliminar.");
  setlistDialog.close();
  if (current().view === "setlist") goBack();
});

// ----- Modal elegir trucos -----
const pickerDialog = $("pickerDialog");
const picked = new Set();

$("pickTricksBtn").addEventListener("click", () => {
  if (allTricks().length === 0) { toast("Primero crea algún truco."); return; }
  picked.clear();
  $("pickerSearch").value = "";
  renderPicker();
  pickerDialog.showModal();
});

function renderPicker() {
  const s = getSetlist(current().params.setlistId);
  const inSetlist = new Set(s?.trucos || []);
  const terms = norm($("pickerSearch").value).split(/\s+/).filter(Boolean);
  const html = [];
  for (const c of categories) {
    const tricks = (tricksByCat.get(c.id) || []).filter((t) => trickMatches(t, terms));
    if (!tricks.length) continue;
    html.push(`<p class="picker-group">${esc(c.icono || "✨")} ${esc(c.nombre)}</p>`);
    for (const t of tricks) {
      const already = inSetlist.has(t.id);
      html.push(`
        <label class="picker-item${already ? " disabled" : ""}">
          <input type="checkbox" value="${esc(t.id)}" ${already || picked.has(t.id) ? "checked" : ""} ${already ? "disabled" : ""} />
          <span>${esc(t.nombre)}${already ? ' <span class="muted small">(ya está)</span>' : ""}</span>
          ${duration(t) ? `<span class="muted small">${duration(t)} min</span>` : ""}
        </label>`);
    }
  }
  $("pickerList").innerHTML = html.join("") || `<p class="muted">Ningún truco coincide.</p>`;
  $("pickerCount").textContent = picked.size ? `${picked.size} seleccionado${picked.size === 1 ? "" : "s"}` : "";
}

$("pickerSearch").addEventListener("input", renderPicker);

$("pickerList").addEventListener("change", (e) => {
  const cb = e.target;
  if (cb.type !== "checkbox") return;
  cb.checked ? picked.add(cb.value) : picked.delete(cb.value);
  $("pickerCount").textContent = picked.size ? `${picked.size} seleccionado${picked.size === 1 ? "" : "s"}` : "";
});

$("pickerSave").addEventListener("click", (e) => {
  e.preventDefault();
  const s = getSetlist(current().params.setlistId);
  if (s && picked.size) {
    // Se añaden al final, en el orden en que aparecen en la lista.
    const order = allTricks().map((t) => t.id).filter((id) => picked.has(id));
    const ids = [...setlistTricks(s).map((t) => t.id), ...order];
    save(updateDoc(doc(setlistsCol(), s.id), { trucos: ids, updatedAt: serverTimestamp() }),
      `${plural(order.length, "truco")} añadido${order.length === 1 ? "" : "s"}.`);
  }
  pickerDialog.close();
});

// ============================================================
//  MODO ACTUACIÓN
//  Pantalla completa, letra grande, un truco por pantalla. Se pasa con los
//  botones, deslizando el dedo o con las flechas del teclado / un mando.
//  Mantiene la pantalla encendida mientras está abierto.
// ============================================================
let performIndex = 0;
let wakeLock = null;

const FONT_KEY = "mimagia.performScale";
let performScale = 1;
try { performScale = Number(localStorage.getItem(FONT_KEY)) || 1; } catch {}

$("performBtn").addEventListener("click", () => {
  const s = getSetlist(current().params.setlistId);
  if (!s || setlistTricks(s).length === 0) { toast("Añade trucos al repertorio primero."); return; }
  navigate("perform", { setlistId: s.id });
});

async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator && document.visibilityState === "visible") {
      wakeLock = await navigator.wakeLock.request("screen");
    }
  } catch (e) { console.warn("WakeLock:", e); }
}

function startPerform() {
  performIndex = 0;
  document.body.classList.add("performing");
  requestWakeLock();
}

function stopPerform() {
  document.body.classList.remove("performing");
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}

// Al volver a la app (p. ej. tras bloquear el móvil) el wake lock se pierde: lo pedimos otra vez.
document.addEventListener("visibilitychange", () => {
  if (current().view === "perform" && document.visibilityState === "visible") requestWakeLock();
});

function renderPerform(setlistId) {
  const s = getSetlist(setlistId);
  if (!s) return missing(setlistId);
  const tricks = setlistTricks(s);
  if (tricks.length === 0) return goBack();
  performIndex = Math.min(Math.max(performIndex, 0), tricks.length - 1);
  const t = tricks[performIndex];
  const remaining = totalMinutes(tricks.slice(performIndex));

  document.documentElement.style.setProperty("--perform-scale", performScale);
  $("performProgress").textContent =
    `${performIndex + 1} / ${tricks.length}` + (remaining ? ` · quedan ~${remaining} min` : "");
  const meta = metaChips(t, { showCategory: true });
  $("performCard").innerHTML = `
    <h2>${esc(t.nombre)}</h2>
    ${meta ? `<div class="meta-row">${meta}</div>` : ""}
    ${trickSections(t)}`;
  $("performCard").scrollTop = 0;
  $("performPrev").disabled = performIndex === 0;
  $("performNext").textContent = performIndex === tricks.length - 1 ? "Terminar ✓" : "Siguiente →";
}

function performStep(delta) {
  const s = getSetlist(current().params.setlistId);
  if (!s) return;
  const n = setlistTricks(s).length;
  const next = performIndex + delta;
  if (next >= n) return goBack();
  if (next < 0) return;
  performIndex = next;
  renderPerform(s.id);
}

function setPerformScale(delta) {
  performScale = Math.min(2, Math.max(0.7, Math.round((performScale + delta) * 10) / 10));
  try { localStorage.setItem(FONT_KEY, String(performScale)); } catch {}
  document.documentElement.style.setProperty("--perform-scale", performScale);
}

$("performClose").addEventListener("click", goBack);
$("performPrev").addEventListener("click", () => performStep(-1));
$("performNext").addEventListener("click", () => performStep(1));
$("performSmaller").addEventListener("click", () => setPerformScale(-0.1));
$("performBigger").addEventListener("click", () => setPerformScale(0.1));

document.addEventListener("keydown", (e) => {
  if (current().view !== "perform" || document.querySelector("dialog[open]")) return;
  if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); performStep(1); }
  if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); performStep(-1); }
  if (e.key === "Escape") goBack();
});

// Deslizar el dedo a izquierda/derecha cambia de truco.
let touchStart = null;
$("performCard").addEventListener("touchstart", (e) => {
  const p = e.changedTouches[0];
  touchStart = { x: p.clientX, y: p.clientY };
}, { passive: true });
$("performCard").addEventListener("touchend", (e) => {
  if (!touchStart) return;
  const p = e.changedTouches[0];
  const dx = p.clientX - touchStart.x;
  const dy = p.clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) performStep(dx < 0 ? 1 : -1);
}, { passive: true });

// ============================================================
//  AJUSTES  (módulo de desarrollo)
// ============================================================
function renderSettings() {
  // Cuenta
  $("settingsUser").textContent = currentUser
    ? `${currentUser.displayName || "Sin nombre"} · ${currentUser.email || ""}`
    : "";

  // Lista de tipos con nº de trucos y botón de borrar
  const wrap = $("settingsCategories");
  wrap.innerHTML = "";
  if (categories.length === 0) {
    wrap.innerHTML = `<p class="settings-empty">No hay ningún tipo todavía.</p>`;
  }
  for (const c of categories) {
    const n = (tricksByCat.get(c.id) || []).length;
    const row = document.createElement("div");
    row.className = "settings-row";
    row.innerHTML = `
      <span class="dot" style="background:${safeColor(c.color)}"></span>
      <span class="row-name">${esc(c.icono || "✨")} ${esc(c.nombre)}</span>
      <span class="row-count">${plural(n, "truco")}</span>
      <button class="row-del" title="Borrar tipo" aria-label="Borrar tipo">🗑️</button>`;
    row.querySelector(".row-del").addEventListener("click", () => deleteCategory(c));
    wrap.appendChild(row);
  }

  // Resumen
  $("settingsStats").textContent =
    `${plural(categories.length, "tipo")} de magia · ${plural(allTricks().length, "truco")} · ` +
    `${plural(setlists.length, "repertorio")}.`;
}

// ----- Datos de ejemplo -----
const DEMO = [
  { nombre: "Cartomagia", icono: "🃏", color: "#7c3aed", trucos: [
    { nombre: "El as viajero", descripcion: "Un as salta de un montón a otro.", pasos: "Doble volteo + empalme.", notas: "Presentar despacio.",
      material: "Baraja normal", duracion: 4, dificultad: 3, etiquetas: ["close-up", "apertura"] },
    { nombre: "Cartas ambiciosas", descripcion: "La carta firmada sube siempre arriba.", pasos: "Control + doble.", notas: "",
      material: "Baraja + rotulador", duracion: 6, dificultad: 2, etiquetas: ["close-up", "carta firmada"] },
  ]},
  { nombre: "Numismagia", icono: "🪙", color: "#0ea5e9", trucos: [
    { nombre: "Moneda que desaparece", descripcion: "La moneda se esfuma en la mano.", pasos: "Empalme francés.", notas: "",
      material: "Moneda de 2 €", duracion: 2, dificultad: 2, etiquetas: ["close-up", "sin preparación"] },
  ]},
  { nombre: "Ilusionismo", icono: "🎩", color: "#f59e0b", trucos: [] },
  { nombre: "Magia tecnológica", icono: "📱", color: "#22c55e", trucos: [] },
];

// Prepara las operaciones para añadir tipos+trucos (+repertorios) con ids nuevos.
// Admite el formato de exportación (versión 1 y 2) y los datos de ejemplo.
function importOps(tipos, repertorios = []) {
  const ops = [];
  const idMap = new Map(); // id antiguo de truco -> id nuevo
  const str = (v, max) => String(v ?? "").slice(0, max);
  for (const cat of tipos) {
    if (!cat || !cat.nombre) continue;
    const catRef = doc(categoriesCol());
    ops.push((b) => b.set(catRef, {
      nombre: str(cat.nombre, 40), icono: str(cat.icono || "✨", 8), color: safeColor(cat.color),
      createdAt: serverTimestamp(),
    }));
    for (const t of Array.isArray(cat.trucos) ? cat.trucos : []) {
      if (!t || !t.nombre) continue;
      const ref = doc(tricksCol(catRef.id));
      if (t.id) idMap.set(String(t.id), ref.id);
      ops.push((b) => b.set(ref, {
        nombre: str(t.nombre, 80), descripcion: str(t.descripcion, 5000), pasos: str(t.pasos, 20000),
        notas: str(t.notas, 5000), material: str(t.material, 2000),
        duracion: duration(t) || null, dificultad: difficulty(t),
        etiquetas: parseTags(Array.isArray(t.etiquetas) ? t.etiquetas.join(",") : ""),
        video: safeUrl(t.video), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }));
    }
  }
  for (const s of Array.isArray(repertorios) ? repertorios : []) {
    if (!s || !s.nombre) continue;
    const ref = doc(setlistsCol());
    const trucos = (Array.isArray(s.trucos) ? s.trucos : []).map((id) => idMap.get(String(id))).filter(Boolean);
    ops.push((b) => b.set(ref, {
      nombre: str(s.nombre, 80), fecha: /^\d{4}-\d{2}-\d{2}$/.test(s.fecha || "") ? s.fecha : "",
      notas: str(s.notas, 5000), trucos, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
  }
  return ops;
}

$("seedBtn").addEventListener("click", () => {
  if (!confirm("¿Cargar tipos y trucos de ejemplo? Se añadirán a los que ya tengas.")) return;
  save(batchedWrite(importOps(DEMO)), "Datos de ejemplo cargados.", "No se pudieron cargar los datos.");
});

// ----- Exportar a JSON -----
$("exportBtn").addEventListener("click", () => {
  const data = {
    app: "miMagia",
    version: 2,
    exportadoEl: new Date().toISOString(),
    tipos: categories.map((c) => ({
      nombre: c.nombre, icono: c.icono || "✨", color: safeColor(c.color),
      trucos: (tricksByCat.get(c.id) || []).map((t) => ({
        id: t.id, nombre: t.nombre, descripcion: t.descripcion || "", pasos: t.pasos || "",
        material: t.material || "", duracion: duration(t) || null, dificultad: difficulty(t),
        etiquetas: t.etiquetas || [], video: t.video || "", notas: t.notas || "",
      })),
    })),
    repertorios: setlists.map((s) => ({
      nombre: s.nombre, fecha: s.fecha || "", notas: s.notas || "", trucos: s.trucos || [],
    })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mimagia-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Datos exportados.");
});

// ----- Importar desde JSON -----
$("importBtn").addEventListener("click", () => $("importFile").click());

$("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = ""; // permite volver a elegir el mismo archivo
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.tipos)) throw new Error("Formato no válido");
    const nRep = Array.isArray(data.repertorios) ? data.repertorios.length : 0;
    const what = `${plural(data.tipos.length, "tipo")}` + (nRep ? ` y ${plural(nRep, "repertorio")}` : "");
    if (!confirm(`¿Importar ${what}? Se añadirán a tus datos actuales.`)) return;
    save(batchedWrite(importOps(data.tipos, data.repertorios)), "Datos importados.", "Error al importar.");
  } catch (err) {
    console.error(err);
    toast("Archivo no válido.");
  }
});

// ----- Borrar TODOS los datos -----
$("wipeBtn").addEventListener("click", () => {
  if (!confirm("⚠️ Esto borrará TODOS tus tipos, trucos y repertorios. ¿Seguro?")) return;
  if (!confirm("Última confirmación: no se puede deshacer. ¿Borrar todo?")) return;
  const ops = [];
  for (const c of categories) {
    for (const t of tricksByCat.get(c.id) || []) ops.push((b) => b.delete(doc(tricksCol(c.id), t.id)));
    ops.push((b) => b.delete(doc(categoriesCol(), c.id)));
  }
  for (const s of setlists) ops.push((b) => b.delete(doc(setlistsCol(), s.id)));
  save(batchedWrite(ops), "Todos los datos han sido borrados.", "No se pudo borrar todo.");
});

// ============================================================
//  INDICADOR DE CONEXIÓN
// ============================================================
function updateOnline() { $("offlinePill").hidden = navigator.onLine; }
window.addEventListener("online", updateOnline);
window.addEventListener("offline", updateOnline);
updateOnline();

// ============================================================
//  SERVICE WORKER (PWA / offline del "cascarón")
// ============================================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW:", e));
  });
}
