import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import { useState, type ComponentType, type SVGProps } from 'react'
import { NavLink, useLocation, useNavigate, useOutlet } from 'react-router'
import { useIsDesktop } from '../lib/useIsDesktop'
import { Chistera, Corazon, Libro, Varita } from './Iconos'
import { Estrella } from './Ornamentos'

type Pestana = { to: string; label: string; Icono: ComponentType<SVGProps<SVGSVGElement>> }

const RUTINAS: Pestana = { to: '/', label: 'Rutinas', Icono: Chistera }
const FAVORITOS: Pestana = { to: '/favoritos', label: 'Favoritos', Icono: Corazon }
const ESCUELA: Pestana = { to: '/escuela', label: 'Escuela', Icono: Libro }
const AJUSTES: Pestana = { to: '/ajustes', label: 'Ajustes', Icono: Varita }

// La Escuela solo existe en la versión de ordenador.
const PESTANAS_MOVIL = [RUTINAS, FAVORITOS, AJUSTES]
const PESTANAS_ORDENADOR = [RUTINAS, FAVORITOS, ESCUELA, AJUSTES]

function indiceDe(pestanas: Pestana[], path: string) {
  const i = pestanas.findIndex((p) => (p.to === '/' ? path === '/' : path.startsWith(p.to)))
  return i === -1 ? 0 : i
}

export default function Layout() {
  const isDesktop = useIsDesktop()
  return isDesktop ? <LayoutOrdenador /> : <LayoutMovil />
}

/** Mantiene la página saliente congelada mientras se anima su salida. */
function PaginaAnimada({ direccion }: { direccion: number }) {
  const location = useLocation()
  const outlet = useOutlet()
  return (
    <AnimatePresence mode="popLayout" initial={false} custom={direccion}>
      <motion.div
        key={location.pathname}
        custom={direccion}
        variants={{
          entra: (d: number) => ({ x: d * 60, opacity: 0, rotate: d * 1.5 }),
          quieta: { x: 0, opacity: 1, rotate: 0 },
          sale: (d: number) => ({ x: d * -60, opacity: 0, rotate: d * -1.5 }),
        }}
        initial="entra"
        animate="quieta"
        exit="sale"
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="w-full"
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  )
}

function useDireccion(pestanas: Pestana[]) {
  const { pathname } = useLocation()
  const actual = indiceDe(pestanas, pathname)
  // La dirección (1 hacia la derecha, -1 hacia la izquierda) decide hacia dónde se desliza la página.
  const [previo, setPrevio] = useState({ indice: actual, direccion: 1 })
  if (previo.indice !== actual) {
    const direccion = actual > previo.indice ? 1 : -1
    setPrevio({ indice: actual, direccion })
    return { actual, direccion }
  }
  return { actual, direccion: previo.direccion }
}

function LayoutMovil() {
  const navigate = useNavigate()
  const { actual, direccion } = useDireccion(PESTANAS_MOVIL)

  const alSoltar = (_: unknown, info: PanInfo) => {
    const umbral = info.offset.x < -70 || info.velocity.x < -450 ? 1 : info.offset.x > 70 || info.velocity.x > 450 ? -1 : 0
    const destino = PESTANAS_MOVIL[actual + umbral]
    if (umbral && destino) navigate(destino.to)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="pt-seguro sticky top-0 z-20 bg-tinta text-crema shadow-lg">
        <div className="flex items-center justify-center gap-3 py-2.5">
          <Estrella className="size-3 text-dorado-claro" brillo />
          <span className="font-cartel text-xl tracking-wider">miMagia</span>
          <Estrella className="size-3 text-dorado-claro" brillo retraso={1.3} />
        </div>
        <div className="h-1 bg-[repeating-linear-gradient(90deg,var(--color-rojo)_0_14px,var(--color-crema)_14px_28px)]" />
      </header>

      <motion.main
        className="flex-1 overflow-x-clip px-4 pt-5 pb-28"
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        onDragEnd={alSoltar}
      >
        <PaginaAnimada direccion={direccion} />
      </motion.main>

      <nav className="pb-seguro fixed inset-x-0 bottom-0 z-30 border-t-[3px] border-double border-dorado bg-tinta">
        <ul className="flex">
          {PESTANAS_MOVIL.map((p, i) => (
            <li key={p.to} className="flex-1">
              <NavLink to={p.to} end={p.to === '/'} className="relative flex flex-col items-center gap-0.5 py-2.5">
                {i === actual && (
                  <motion.span
                    layoutId="pestana-activa"
                    className="absolute inset-x-3 inset-y-1.5 rounded-sm border border-dorado/60 bg-rojo"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <motion.span
                  className={`relative ${i === actual ? 'text-dorado-claro' : 'text-crema/70'}`}
                  animate={i === actual ? { y: [0, -4, 0], rotate: [0, -8, 0] } : { y: 0, rotate: 0 }}
                  transition={{ duration: 0.45 }}
                >
                  <p.Icono className="size-6" />
                </motion.span>
                <span className={`relative text-[11px] tracking-widest uppercase ${i === actual ? 'text-crema' : 'text-crema/60'}`}>
                  {p.label}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

function LayoutOrdenador() {
  const { actual, direccion } = useDireccion(PESTANAS_ORDENADOR)

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 flex h-dvh w-64 shrink-0 flex-col bg-tinta text-crema shadow-2xl">
        <div className="h-1.5 bg-[repeating-linear-gradient(90deg,var(--color-rojo)_0_14px,var(--color-crema)_14px_28px)]" />
        <div className="flex flex-col items-center gap-2 px-6 pt-8 pb-6">
          <motion.img
            src="/logo.svg"
            alt=""
            className="size-20 drop-shadow-lg"
            initial={{ rotate: -12, scale: 0.6, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          />
          <span className="font-cartel text-3xl tracking-wider text-crema">miMagia</span>
          <div className="flex gap-2 text-dorado-claro">
            {[0, 0.4, 0.8].map((d) => (
              <Estrella key={d} className="size-3" brillo retraso={d} />
            ))}
          </div>
        </div>
        <nav className="flex-1 px-4">
          <ul className="space-y-1.5">
            {PESTANAS_ORDENADOR.map((p, i) => (
              <li key={p.to}>
                <NavLink to={p.to} end={p.to === '/'} className="group relative flex items-center gap-3 px-4 py-3">
                  {i === actual && (
                    <motion.span
                      layoutId="pestana-activa-ordenador"
                      className="absolute inset-0 border border-dorado/60 bg-rojo"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <p.Icono
                    className={`relative size-6 transition-transform group-hover:-rotate-12 ${i === actual ? 'text-dorado-claro' : 'text-crema/70'}`}
                  />
                  <span className={`relative font-titulo text-lg tracking-wide ${i === actual ? 'text-crema' : 'text-crema/70 group-hover:text-crema'}`}>
                    {p.label}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <p className="px-6 py-4 text-center text-xs text-crema/40 italic">Función privada</p>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-clip px-10 py-10">
        <div className="mx-auto max-w-6xl">
          <PaginaAnimada direccion={direccion} />
        </div>
      </main>
    </div>
  )
}
