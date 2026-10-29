import { motion } from 'motion/react'
import { Cabecera } from '../components/Cabecera'
import { Salir } from '../components/Iconos'
import { Marco } from '../components/Ornamentos'
import { useAuth } from '../lib/auth'
import { useEditMode } from '../lib/editMode'
import { useIsDesktop } from '../lib/useIsDesktop'

export default function Ajustes() {
  const auth = useAuth()
  const isDesktop = useIsDesktop()
  const { edicionMovil, setEdicionMovil } = useEditMode()
  const user = auth.status === 'dentro' ? auth.user : null

  return (
    <section className="mx-auto max-w-lg space-y-6">
      <Cabecera antetitulo="Entre bastidores" titulo="Ajustes" />

      <Marco>
        <div className="flex items-center gap-4">
          {user?.photoURL && (
            <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="size-14 rounded-full border-2 border-dorado" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-titulo text-xl">{user?.displayName ?? 'Mago'}</p>
            <p className="truncate text-sm text-tinta-suave">{user?.email}</p>
          </div>
        </div>
      </Marco>

      {!isDesktop && (
        <Marco>
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block font-titulo text-lg">Modo edición</span>
              <span className="text-sm text-tinta-suave">Muestra los controles para modificar contenido desde el móvil.</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={edicionMovil}
              onClick={() => setEdicionMovil(!edicionMovil)}
              className={`relative h-8 w-14 shrink-0 rounded-full border-2 border-tinta transition-colors ${edicionMovil ? 'bg-rojo' : 'bg-papel'}`}
            >
              <motion.span
                className="absolute top-0.5 size-6 rounded-full border-2 border-dorado bg-crema shadow"
                animate={{ left: edicionMovil ? 26 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </label>
        </Marco>
      )}

      <motion.button
        type="button"
        onClick={auth.salir}
        whileTap={{ scale: 0.97 }}
        className="flex w-full items-center justify-center gap-2 border-[3px] border-double border-tinta bg-tinta py-3 font-titulo text-lg tracking-wide text-crema shadow-cartel"
      >
        <Salir className="size-5" />
        Cerrar sesión
      </motion.button>

      <p className="text-center text-xs text-tinta-suave italic">miMagia v{__APP_VERSION__}</p>
    </section>
  )
}
