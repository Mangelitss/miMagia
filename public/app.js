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
};

function showView(name) {
  Object.entries(views).forEach(([k, el]) => (el.hidden = k !== name));
  $("backBtn").hidden = name !== "tricks";
  const loggedIn = name !== "login";
  $("logoutBtn").hidden = !loggedIn;
  $("userChip").hidden = !loggedIn;
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

onAuthStateChanged(auth, (user) => {
  cleanupSubscriptions();
  if (user) {
    uid = user.uid;
    $("userChip").textContent = user.displayName || user.email || "";
    watchCategories();
    goToCategories();
  } else {
    uid = null;
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
//  SERVICE WORKER (PWA / offline del "cascarón")
// ============================================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW:", e));
  });
}
