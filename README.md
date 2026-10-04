# ✨ miMagia

App web personal para guardar rutinas y trucos de magia, organizados por tipo
(Cartomagia, Numismagia, Ilusionismo, Magia Tecnológica…), y poder repasarlos
antes o durante una actuación. Funciona también **sin conexión**.

- **Frontend:** HTML + CSS + JavaScript (sin frameworks ni build).
- **Backend (gratis):** Firebase → **Hosting** + **Cloud Firestore** + **Auth con Google**.
- **PWA:** instalable en el móvil y con caché offline.
- **Proyecto de Firebase:** `mimagia-d9092` → <https://mimagia-d9092.web.app>

## 🪄 Qué se puede hacer

- **Tipos de magia**: crear, editar (nombre, emoji, color) y borrar.
- **Trucos**: efecto, pasos/secreto, material, duración, dificultad, etiquetas,
  vídeo de referencia y notas. Se pueden **mover de un tipo a otro**.
- **Ficha del truco**: vista de lectura cómoda; pulsar una etiqueta busca todos los trucos con ella.
- **🔍 Buscador** en todos los tipos a la vez (sin importar tildes ni mayúsculas;
  `#etiqueta` filtra por etiqueta).
- **🎭 Repertorios**: listas ordenadas de trucos para una actuación, con fecha,
  notas y duración total.
- **▶️ Modo actuación**: pantalla completa, letra grande ajustable, un truco por
  pantalla; se pasa con botones, deslizando el dedo o con las flechas/un mando
  Bluetooth. Mantiene la pantalla encendida.
- **Sin conexión**: todo se guarda en el móvil y se sincroniza al volver la red
  (aparece el aviso 📴 en la barra).
- **⚙️ Ajustes**: datos de ejemplo, exportar/importar copia de seguridad (JSON) y borrar todo.
- El botón **atrás** del móvil vuelve a la pantalla anterior.

## 🗂️ Estructura

```
.
├── public/                 # Lo que se publica en Firebase Hosting
│   ├── index.html
│   ├── styles.css
│   ├── app.js              # Lógica + conexión a Firebase
│   ├── firebase-config.js  # Config pública del proyecto mimagia-d9092
│   ├── manifest.webmanifest
│   ├── sw.js               # Service worker (offline, "primero la red")
│   └── icons/              # SVG + PNG (192, 512, maskable, apple-touch-icon)
├── .github/workflows/deploy.yml  # Comprueba y despliega al fusionar en main
├── firebase.json           # Config de Hosting (+ cabeceras de caché) y Firestore
├── firestore.rules         # Reglas de seguridad (cada usuario ve solo lo suyo)
├── firestore.indexes.json
└── .firebaserc             # ID del proyecto de Firebase
```

## 🔧 Modelo de datos (Firestore)

```
users/{uid}/categorias/{catId}          { nombre, icono, color, createdAt }
users/{uid}/categorias/{catId}/trucos/{trickId}
    { nombre, descripcion, pasos, material, duracion (min), dificultad (0-5),
      etiquetas: [string], video, notas, createdAt, updatedAt }
users/{uid}/repertorios/{setlistId}     { nombre, fecha ("AAAA-MM-DD"), notas,
                                          trucos: [trickId] (en orden), createdAt, updatedAt }
```

Al mover un truco de tipo se conserva su `trickId`, así los repertorios siguen apuntando a él.

## 🚀 Desplegar

### A mano
```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

### Automático con GitHub Actions
El workflow [`deploy.yml`](.github/workflows/deploy.yml) comprueba el código en cada
pull request y **despliega Hosting + reglas de Firestore** en cada push a `main`.
Solo hay que configurarlo una vez:

1. En <https://console.cloud.google.com/iam-admin/serviceaccounts?project=mimagia-d9092>
   crea una cuenta de servicio (p. ej. `github-deploy`) con el rol **Firebase Admin**.
2. En esa cuenta → **Claves → Añadir clave → JSON**. Se descarga un archivo.
3. En GitHub: **Settings → Secrets and variables → Actions → New repository secret**,
   nombre `FIREBASE_SERVICE_ACCOUNT`, y pega el contenido completo del JSON.
4. Borra el archivo JSON de tu ordenador.

### Probar en local
```bash
firebase serve
```

> ⚠️ Para que el login con Google funcione en local, `localhost` debe estar en
> **Authentication → Settings → Dominios autorizados** (viene por defecto).

## 📱 Instalar en el móvil
Abre la URL en el navegador del móvil y usa **"Añadir a pantalla de inicio"**
(en iPhone: Safari → Compartir → *Añadir a pantalla de inicio*).

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
