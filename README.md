# miMagia

App privada de rutinas de magia y escuela, con estilo de cartel de mago antiguo.

## Tecnologías

Vite + React + TypeScript, Tailwind CSS, Motion, React Router, Firebase (Auth con Google + Firestore),
PWA con vite-plugin-pwa. Despliegue con GitHub Actions en Firebase Hosting (proyecto `mimagia-app`).

## Desarrollo

```bash
npm install
npm run dev
```

- `npm run build`: compila en `dist/` (incluye el service worker y los iconos PWA generados desde `public/logo.svg`).
- `npm run lint`: revisa el código con oxlint.

## Acceso

Hay que iniciar sesión con Google. Solo entran las cuentas de `CUENTAS_PERMITIDAS` (`src/config.ts`),
y las dos ven y editan los mismos datos. `firestore.rules` repite esa lista: si cambias una, cambia la otra.

## Despliegue

`.github/workflows/deploy.yml`:

- **Pull request**: compila y publica una URL de vista previa (7 días) que se comenta en el PR.
- **Push a `main`**: publica en producción (Hosting + reglas de Firestore).

Necesita el secreto `FIREBASE_SERVICE_ACCOUNT` en GitHub (JSON de la cuenta `firebase-adminsdk-fbsvc`, con los roles Administrador de Firebase y Consumidor de Service Usage). Para iniciar sesión en una URL de vista previa,
añade su dominio en Firebase Console → Authentication → Settings → Authorized domains.

## Versiones

- **Móvil**: interfaz sencilla con barra inferior (Rutinas, Favoritos, Ajustes) y cambio de pestaña deslizando.
  El modo edición se activa desde Ajustes.
- **Ordenador** (desde 1024 px): barra lateral, edición completa y Escuela.
