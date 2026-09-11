# ✨ miMagia

App web personal para guardar rutinas y trucos de magia, organizados por tipo
(Cartomagia, Numismagia, Ilusionismo, Magia Tecnológica…), y poder repasarlos
antes o durante una actuación. Funciona también **sin conexión**.

- **Frontend:** HTML + CSS + JavaScript (sin frameworks ni build).
- **Backend (gratis):** Firebase → **Hosting** + **Cloud Firestore** + **Auth con Google**.
- **PWA:** instalable en el móvil y con caché offline.

## 🗂️ Estructura

```
.
├── public/                 # Lo que se publica en Firebase Hosting
│   ├── index.html
│   ├── styles.css
│   ├── app.js              # Lógica + conexión a Firebase
│   ├── firebase-config.js  # ← aquí pegas la config de TU proyecto
│   ├── manifest.webmanifest
│   ├── sw.js               # Service worker (offline)
│   └── icons/icon.svg
├── firebase.json           # Config de Hosting + Firestore
├── firestore.rules         # Reglas de seguridad (cada usuario ve solo lo suyo)
├── firestore.indexes.json
└── .firebaserc             # ID de tu proyecto de Firebase
```

## 🔧 Modelo de datos (Firestore)

```
users/{uid}/categorias/{catId}          { nombre, icono, color, createdAt }
users/{uid}/categorias/{catId}/trucos/{trickId}
                                        { nombre, descripcion, pasos, notas, createdAt, updatedAt }
```

## 🚀 Puesta en marcha

### 1. Crear el proyecto en Firebase
1. Entra en <https://console.firebase.google.com> y crea un proyecto (plan **Spark**, gratis).
2. **Build → Authentication → Get started →** activa el proveedor **Google**.
3. **Build → Firestore Database → Create database** (modo producción, la región que prefieras).
4. **⚙️ Configuración del proyecto → Tus apps → Web (`</>`)**: registra una app web y copia el objeto `firebaseConfig`.

### 2. Configurar el código
- Pega tu `firebaseConfig` en [`public/firebase-config.js`](public/firebase-config.js).
- Pon el `projectId` de tu proyecto en [`.firebaserc`](.firebaserc) (sustituye `TU_PROYECTO`).

### 3. Instalar la CLI de Firebase y desplegar
```bash
npm install -g firebase-tools
firebase login
firebase deploy
```
Al terminar te dará la URL pública (`https://TU_PROYECTO.web.app`).

### Probar en local
```bash
firebase emulators:start
# o simplemente:
firebase serve
```

> ⚠️ Para que el login con Google funcione en local, añade `localhost` en
> **Authentication → Settings → Dominios autorizados**.

## 📱 Instalar en el móvil
Abre la URL en el navegador del móvil y usa **"Añadir a pantalla de inicio"**.

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
