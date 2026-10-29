import { motion } from 'motion/react'
import { useState } from 'react'
import { Estrella, Marco, Separador } from '../components/Ornamentos'
import { useAuth } from '../lib/auth'

const ESTRELLAS = [
  { x: '8%', y: '12%', s: 'size-4', d: 0 },
  { x: '86%', y: '9%', s: 'size-6', d: 0.7 },
  { x: '14%', y: '78%', s: 'size-5', d: 1.4 },
  { x: '82%', y: '84%', s: 'size-4', d: 0.3 },
  { x: '92%', y: '46%', s: 'size-3', d: 1.1 },
  { x: '4%', y: '44%', s: 'size-3', d: 1.8 },
]

export default function Login() {
  const auth = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  const entrar = async () => {
    setError(null)
    setEntrando(true)
    try {
      await auth.entrar()
    } catch {
      setError('No se pudo iniciar sesión. Inténtalo de nuevo.')
    } finally {
      setEntrando(false)
    }
  }

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-5 py-10">
      {ESTRELLAS.map((e) => (
        <div key={e.d} className="absolute" style={{ left: e.x, top: e.y }}>
          <Estrella className={`${e.s} text-dorado`} brillo retraso={e.d} />
        </div>
      ))}

      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 40, rotate: -3 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14 }}
      >
        <Marco className="text-center">
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-xs tracking-[0.35em] text-rojo uppercase">Se presenta</p>
            <motion.img
              src="/logo.svg"
              alt=""
              className="size-24 drop-shadow-xl"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 140, damping: 11, delay: 0.25 }}
            />
            <motion.h1
              className="texto-relieve font-cartel text-5xl text-tinta"
              initial={{ opacity: 0, scale: 1.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, type: 'spring', stiffness: 200, damping: 14 }}
            >
              miMagia
            </motion.h1>
            <p className="font-titulo text-lg text-rojo-oscuro">El gran repertorio del mago</p>
            <Separador className="w-full" />

            {auth.status === 'denegado' ? (
              <div className="space-y-3">
                <p className="text-sm">
                  La cuenta <strong>{auth.user.email}</strong> no tiene entrada para esta función.
                </p>
                <button type="button" onClick={auth.salir} className="text-sm text-rojo underline underline-offset-4">
                  Usar otra cuenta
                </button>
              </div>
            ) : (
              <motion.button
                type="button"
                onClick={entrar}
                disabled={entrando || auth.status === 'cargando'}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96, rotate: -1 }}
                className="relative mt-2 w-full border-2 border-dorado bg-rojo px-6 py-3.5 font-titulo text-xl tracking-wide text-crema shadow-cartel disabled:opacity-70"
              >
                <span className="absolute inset-1 border border-dashed border-crema/40" />
                {entrando ? 'Abriendo el telón…' : 'Entrar con Google'}
              </motion.button>
            )}
            {error && <p className="text-sm text-rojo">{error}</p>}
            <p className="mt-2 text-xs text-tinta-suave italic">Función privada. Acceso solo con tus cuentas.</p>
          </div>
        </Marco>
      </motion.div>
    </div>
  )
}
