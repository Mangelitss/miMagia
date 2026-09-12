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
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDocs,
  writeBatch,
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
let unsubscribeCategories = null;
let unsubscribeTricks = null;
let categories = []; // {id, nombre, icono, color}
let currentCategory = null; // {id, nombre, ...}

// ---------- Atajos DOM ----------
const $ = (id) => document.getElementById(id);
const views = {
  login: $("loginView"),
  categories: $("categoriesView"),
  tricks: $("tricksView"),
  settings: $("settingsView"),
};

let currentView = "login";

function showView(name) {
  currentView = name;
  Object.entries(views).forEach(([k, el]) => (el.hidden = k !== name));
  const loggedIn = name !== "login";
  // La flecha atrás aparece en las vistas internas.
  $("backBtn").hidden = !(name === "tricks" || name === "settings");
  // El engranaje de ajustes, cuando hay sesión y no estamos ya en ajustes.
  $("settingsBtn").hidden = !loggedIn || name === "settings";
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 2600);
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

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  cleanupSubscriptions();
  if (user) {
    uid = user.uid;
    currentUser = user;
    watchCategories();
    goToCategories();
  } else {
    uid = null;
    currentUser = null;
    categories = [];
    currentCategory = null;
    showView("login");
  }
});

function cleanupSubscriptions() {
  if (unsubscribeCategories) unsubscribeCategories();
  if (unsubscribeTricks) unsubscribeTricks();
  unsubscribeCategories = null;
  unsubscribeTricks = null;
}

// ============================================================
//  RUTAS DE DATOS  (users/{uid}/categorias/{catId}/trucos/{trickId})
// ============================================================
const categoriesCol = () => collection(db, "users", uid, "categorias");
const tricksCol = (catId) => collection(db, "users", uid, "categorias", catId, "trucos");

// ============================================================
//  NAVEGACIÓN
// ============================================================
function goToCategories() {
  currentCategory = null;
  $("title").textContent = "✨ miMagia";
  if (unsubscribeTricks) { unsubscribeTricks(); unsubscribeTricks = null; }
  showView("categories");
}

function goToTricks(category) {
  currentCategory = category;
  $("moduleTitle").textContent = `${category.icono || "✨"} ${category.nombre}`;
  showView("tricks");
  watchTricks(category.id);
}

$("backBtn").addEventListener("click", goToCategories);
$("settingsBtn").addEventListener("click", goToSettings);

// ============================================================
//  CATEGORÍAS
// ============================================================
function watchCategories() {
  const q = query(categoriesCol(), orderBy("nombre"));
  unsubscribeCategories = onSnapshot(
    q,
    (snap) => {
      categories = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderCategories();
      refreshSettingsIfOpen();
    },
    (err) => { console.error(err); toast("Error al cargar tipos de magia."); }
  );
}

async function renderCategories() {
  const grid = $("categoriesGrid");
  $("categoriesEmpty").hidden = categories.length > 0;
  grid.innerHTML = "";

  // Contar trucos de cada categoría (una sola lectura por categoría).
  const counts = await Promise.all(
    categories.map(async (c) => {
      try {
        const s = await getDocs(tricksCol(c.id));
        return s.size;
      } catch { return 0; }
    })
  );

  categories.forEach((c, i) => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.setProperty("--cat-color", c.color || "#8b5cf6");
    card.innerHTML = `
      <button class="card-edit" title="Editar">✎</button>
      <div class="card-icon">${c.icono || "✨"}</div>
      <div>
        <div class="card-name"></div>
        <div class="card-count">${counts[i]} truco${counts[i] === 1 ? "" : "s"}</div>
      </div>`;
    card.querySelector(".card-name").textContent = c.nombre;
    card.addEventListener("click", () => goToTricks(c));
    card.querySelector(".card-edit").addEventListener("click", (e) => {
      e.stopPropagation();
      openCategoryDialog(c);
    });
    grid.appendChild(card);
  });
}

// ----- Modal categoría -----
const categoryDialog = $("categoryDialog");
let editingCategoryId = null;

$("addCategoryBtn").addEventListener("click", () => openCategoryDialog(null));

function openCategoryDialog(cat) {
  editingCategoryId = cat ? cat.id : null;
  $("categoryDialogTitle").textContent = cat ? "Editar tipo de magia" : "Nuevo tipo de magia";
  $("categoryName").value = cat ? cat.nombre : "";
  $("categoryIcon").value = cat ? cat.icono || "" : "";
  $("categoryColor").value = cat ? cat.color || "#7c3aed" : "#7c3aed";
  categoryDialog.showModal();
}

$("saveCategoryBtn").addEventListener("click", async (e) => {
  const nombre = $("categoryName").value.trim();
  if (!nombre) { e.preventDefault(); return; }
  e.preventDefault();
  const data = {
    nombre,
    icono: $("categoryIcon").value.trim() || "✨",
    color: $("categoryColor").value,
  };
  try {
    if (editingCategoryId) {
      await updateDoc(doc(categoriesCol(), editingCategoryId), data);
      toast("Tipo actualizado.");
    } else {
      await addDoc(categoriesCol(), { ...data, createdAt: serverTimestamp() });
      toast("Tipo creado.");
    }
    categoryDialog.close();
  } catch (err) {
    console.error(err);
    toast("No se pudo guardar.");
  }
});

// ============================================================
//  TRUCOS
// ============================================================
function watchTricks(catId) {
  if (unsubscribeTricks) unsubscribeTricks();
  const q = query(tricksCol(catId), orderBy("nombre"));
  unsubscribeTricks = onSnapshot(
    q,
    (snap) => {
      const tricks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderTricks(tricks);
    },
    (err) => { console.error(err); toast("Error al cargar los trucos."); }
  );
}

function renderTricks(tricks) {
  const list = $("tricksList");
  $("tricksEmpty").hidden = tricks.length > 0;
  list.innerHTML = "";
  tricks.forEach((t) => {
    const el = document.createElement("div");
    el.className = "trick";
    el.innerHTML = `<h3></h3><p></p>`;
    el.querySelector("h3").textContent = t.nombre;
    el.querySelector("p").textContent = t.descripcion || t.pasos || "Sin descripción";
    el.addEventListener("click", () => openTrickDialog(t));
    list.appendChild(el);
  });
}

// ----- Modal truco -----
const trickDialog = $("trickDialog");
let editingTrickId = null;

$("addTrickBtn").addEventListener("click", () => openTrickDialog(null));

function openTrickDialog(trick) {
  editingTrickId = trick ? trick.id : null;
  $("trickDialogTitle").textContent = trick ? "Editar truco" : "Nuevo truco";
  $("trickName").value = trick ? trick.nombre : "";
  $("trickDescription").value = trick ? trick.descripcion || "" : "";
  $("trickSteps").value = trick ? trick.pasos || "" : "";
  $("trickNotes").value = trick ? trick.notas || "" : "";
  $("deleteTrickBtn").hidden = !trick;
  trickDialog.showModal();
}

$("saveTrickBtn").addEventListener("click", async (e) => {
  const nombre = $("trickName").value.trim();
  if (!nombre || !currentCategory) { e.preventDefault(); return; }
  e.preventDefault();
  const data = {
    nombre,
    descripcion: $("trickDescription").value.trim(),
    pasos: $("trickSteps").value.trim(),
    notas: $("trickNotes").value.trim(),
    updatedAt: serverTimestamp(),
  };
  try {
    if (editingTrickId) {
      await updateDoc(doc(tricksCol(currentCategory.id), editingTrickId), data);
      toast("Truco actualizado.");
    } else {
      await addDoc(tricksCol(currentCategory.id), { ...data, createdAt: serverTimestamp() });
      toast("Truco guardado.");
    }
    trickDialog.close();
  } catch (err) {
    console.error(err);
    toast("No se pudo guardar el truco.");
  }
});

$("deleteTrickBtn").addEventListener("click", async () => {
  if (!editingTrickId || !currentCategory) return;
  if (!confirm("¿Eliminar este truco? No se puede deshacer.")) return;
  try {
    await deleteDoc(doc(tricksCol(currentCategory.id), editingTrickId));
    trickDialog.close();
    toast("Truco eliminado.");
  } catch (err) {
    console.error(err);
    toast("No se pudo eliminar.");
  }
});

// ----- Cerrar diálogos con botones "Cancelar" -----
document.querySelectorAll("[data-close]").forEach((btn) =>
  btn.addEventListener("click", () => btn.closest("dialog").close())
);

// ============================================================
//  AJUSTES  (módulo de desarrollo)
// ============================================================
function goToSettings() {
  $("title").textContent = "⚙️ Ajustes";
  if (unsubscribeTricks) { unsubscribeTricks(); unsubscribeTricks = null; }
  currentCategory = null;
  showView("settings");
  renderSettings();
}

async function renderSettings() {
  // Cuenta
  $("settingsUser").textContent = currentUser
    ? `${currentUser.displayName || "Sin nombre"} · ${currentUser.email || ""}`
    : "";

  // Lista de tipos con nº de trucos y botón de borrar
  const wrap = $("settingsCategories");
  wrap.innerHTML = "";
  let totalTricks = 0;

  const counts = await Promise.all(
    categories.map(async (c) => {
      try { return (await getDocs(tricksCol(c.id))).size; } catch { return 0; }
    })
  );

  if (categories.length === 0) {
    wrap.innerHTML = `<p class="settings-empty">No hay ningún tipo todavía.</p>`;
  } else {
    categories.forEach((c, i) => {
      totalTricks += counts[i];
      const row = document.createElement("div");
      row.className = "settings-row";
      row.innerHTML = `
        <span class="dot" style="background:${c.color || "#8b5cf6"}"></span>
        <span class="row-name"></span>
        <span class="row-count">${counts[i]} truco${counts[i] === 1 ? "" : "s"}</span>
        <button class="row-del" title="Borrar tipo">🗑️</button>`;
      row.querySelector(".row-name").textContent = `${c.icono || "✨"} ${c.nombre}`;
      row.querySelector(".row-del").addEventListener("click", () => deleteCategory(c, counts[i]));
      wrap.appendChild(row);
    });
  }

  // Resumen
  $("settingsStats").textContent =
    `${categories.length} tipo${categories.length === 1 ? "" : "s"} de magia · ${totalTricks} truco${totalTricks === 1 ? "" : "s"} en total.`;
}

// Al crear/editar/borrar categorías, si estamos en Ajustes, refrescamos la vista.
function refreshSettingsIfOpen() {
  if (currentView === "settings") renderSettings();
}

// ----- Añadir tipo desde Ajustes (reutiliza el modal) -----
$("settingsAddCategory").addEventListener("click", () => openCategoryDialog(null));

// ----- Borrar un tipo y todos sus trucos -----
async function deleteCategory(cat, count) {
  const msg = count > 0
    ? `¿Borrar "${cat.nombre}" y sus ${count} truco(s)? No se puede deshacer.`
    : `¿Borrar "${cat.nombre}"?`;
  if (!confirm(msg)) return;
  try {
    // Borra la subcolección de trucos en lotes y luego la categoría.
    const snap = await getDocs(tricksCol(cat.id));
    let batch = writeBatch(db);
    let n = 0;
    for (const d of snap.docs) {
      batch.delete(d.ref);
      if (++n === 400) { await batch.commit(); batch = writeBatch(db); n = 0; }
    }
    if (n > 0) await batch.commit();
    await deleteDoc(doc(categoriesCol(), cat.id));
    toast("Tipo eliminado.");
    renderSettings();
  } catch (err) {
    console.error(err);
    toast("No se pudo borrar el tipo.");
  }
}

// ----- Datos de ejemplo -----
const DEMO = [
  { nombre: "Cartomagia", icono: "🃏", color: "#7c3aed", trucos: [
    { nombre: "El as viajero", descripcion: "Un as salta de un montón a otro.", pasos: "Doble volteo + empalme.", notas: "Presentar despacio." },
    { nombre: "Cartas ambiciosas", descripcion: "La carta firmada sube siempre arriba.", pasos: "Control + doble.", notas: "" },
  ]},
  { nombre: "Numismagia", icono: "🪙", color: "#0ea5e9", trucos: [
    { nombre: "Moneda que desaparece", descripcion: "La moneda se esfuma en la mano.", pasos: "Empalme francés.", notas: "" },
  ]},
  { nombre: "Ilusionismo", icono: "🎩", color: "#f59e0b", trucos: [] },
  { nombre: "Magia tecnológica", icono: "📱", color: "#22c55e", trucos: [] },
];

$("seedBtn").addEventListener("click", async () => {
  if (!confirm("¿Cargar tipos y trucos de ejemplo? Se añadirán a los que ya tengas.")) return;
  try {
    for (const cat of DEMO) {
      const catRef = await addDoc(categoriesCol(), {
        nombre: cat.nombre, icono: cat.icono, color: cat.color, createdAt: serverTimestamp(),
      });
      for (const t of cat.trucos) {
        await addDoc(tricksCol(catRef.id), { ...t, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
    }
    toast("Datos de ejemplo cargados.");
    renderSettings();
  } catch (err) {
    console.error(err);
    toast("No se pudieron cargar los datos.");
  }
});

// ----- Exportar a JSON -----
$("exportBtn").addEventListener("click", async () => {
  try {
    const data = { app: "miMagia", exportadoEl: new Date().toISOString(), tipos: [] };
    for (const c of categories) {
      const snap = await getDocs(tricksCol(c.id));
      data.tipos.push({
        nombre: c.nombre, icono: c.icono || "✨", color: c.color || "#8b5cf6",
        trucos: snap.docs.map((d) => {
          const { nombre, descripcion, pasos, notas } = d.data();
          return { nombre, descripcion: descripcion || "", pasos: pasos || "", notas: notas || "" };
        }),
      });
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mimagia-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Datos exportados.");
  } catch (err) {
    console.error(err);
    toast("No se pudo exportar.");
  }
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
    if (!confirm(`¿Importar ${data.tipos.length} tipo(s)? Se añadirán a tus datos actuales.`)) return;
    for (const cat of data.tipos) {
      if (!cat.nombre) continue;
      const catRef = await addDoc(categoriesCol(), {
        nombre: String(cat.nombre), icono: cat.icono || "✨", color: cat.color || "#8b5cf6",
        createdAt: serverTimestamp(),
      });
      for (const t of cat.trucos || []) {
        if (!t.nombre) continue;
        await addDoc(tricksCol(catRef.id), {
          nombre: String(t.nombre), descripcion: t.descripcion || "", pasos: t.pasos || "", notas: t.notas || "",
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
      }
    }
    toast("Datos importados.");
    renderSettings();
  } catch (err) {
    console.error(err);
    toast("Archivo no válido o error al importar.");
  }
});

// ----- Borrar TODOS los datos -----
$("wipeBtn").addEventListener("click", async () => {
  if (!confirm("⚠️ Esto borrará TODOS tus tipos y trucos. ¿Seguro?")) return;
  if (!confirm("Última confirmación: no se puede deshacer. ¿Borrar todo?")) return;
  try {
    for (const c of categories) {
      const snap = await getDocs(tricksCol(c.id));
      let batch = writeBatch(db);
      let n = 0;
      for (const d of snap.docs) {
        batch.delete(d.ref);
        if (++n === 400) { await batch.commit(); batch = writeBatch(db); n = 0; }
      }
      if (n > 0) await batch.commit();
      await deleteDoc(doc(categoriesCol(), c.id));
    }
    toast("Todos los datos han sido borrados.");
    renderSettings();
  } catch (err) {
    console.error(err);
    toast("No se pudo borrar todo.");
  }
});

// ============================================================
//  SERVICE WORKER (PWA / offline del "cascarón")
// ============================================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW:", e));
  });
}
