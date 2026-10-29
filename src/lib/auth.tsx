import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import { createContext, use, useEffect, useState, type ReactNode } from 'react'
import { CUENTAS_PERMITIDAS } from '../config'
import { auth, googleProvider } from './firebase'

type AuthState =
  | { status: 'cargando' }
  | { status: 'fuera' }
  | { status: 'denegado'; user: User }
  | { status: 'dentro'; user: User }

type AuthContextValue = AuthState & {
  entrar: () => Promise<void>
  salir: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'cargando' })

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        if (!user) setState({ status: 'fuera' })
        else if (user.email && CUENTAS_PERMITIDAS.includes(user.email) && user.emailVerified) setState({ status: 'dentro', user })
        else setState({ status: 'denegado', user })
      }),
    [],
  )

  const entrar = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      // Las PWA instaladas en móvil a veces bloquean las ventanas emergentes.
      const code = (err as { code?: string }).code
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, googleProvider)
      } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        throw err
      }
    }
  }

  const salir = () => signOut(auth)

  return <AuthContext value={{ ...state, entrar, salir }}>{children}</AuthContext>
}

export function useAuth() {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
