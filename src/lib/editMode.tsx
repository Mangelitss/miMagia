import { createContext, use, useState, type ReactNode } from 'react'
import { useIsDesktop } from './useIsDesktop'

const KEY = 'mimagia:modo-edicion-movil'

type EditModeValue = {
  /** Si se muestran los controles de edición. En ordenador siempre es true. */
  editando: boolean
  /** Preferencia del móvil, que se cambia desde Ajustes. */
  edicionMovil: boolean
  setEdicionMovil: (v: boolean) => void
}

const EditModeContext = createContext<EditModeValue | null>(null)

function leer() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function EditModeProvider({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop()
  const [edicionMovil, setState] = useState(leer)

  const setEdicionMovil = (v: boolean) => {
    setState(v)
    try {
      localStorage.setItem(KEY, v ? '1' : '0')
    } catch {
      // Sin almacenamiento: la preferencia dura solo esta sesión.
    }
  }

  return (
    <EditModeContext value={{ editando: isDesktop || edicionMovil, edicionMovil, setEdicionMovil }}>
      {children}
    </EditModeContext>
  )
}

export function useEditMode() {
  const ctx = use(EditModeContext)
  if (!ctx) throw new Error('useEditMode debe usarse dentro de EditModeProvider')
  return ctx
}
