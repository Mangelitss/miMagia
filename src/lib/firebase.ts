import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

// Estos valores no son secretos: la seguridad la ponen las reglas de firestore.rules.
const host = typeof window !== 'undefined' ? window.location.hostname : ''
// En Firebase Hosting (web y canales de vista previa) el inicio de sesión se sirve desde
// el propio dominio, así el redirect funciona en móviles que bloquean cookies de terceros.
const enHosting = host.endsWith('.web.app') || host.endsWith('.firebaseapp.com')

export const firebaseApp = initializeApp({
  apiKey: 'AIzaSyDwTRrFpusZKCVSI6p1k4jTL3FBOEw-L_c',
  authDomain: enHosting ? host : 'mimagia-app.firebaseapp.com',
  projectId: 'mimagia-app',
  storageBucket: 'mimagia-app.firebasestorage.app',
  messagingSenderId: '433436508091',
  appId: '1:433436508091:web:f7239a6bb6dcdc594d0e9e',
})

export const auth = getAuth(firebaseApp)
auth.languageCode = 'es'

export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

// Caché local persistente: las rutinas se pueden consultar sin conexión.
export const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
