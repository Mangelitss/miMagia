import { motion } from 'motion/react'
import type { ReactNode } from 'react'

const STAR = 'M12 1.5l3 7.1 7.6.6-5.8 5 1.8 7.4L12 17.7l-6.6 3.9 1.8-7.4-5.8-5 7.6-.6z'

/** Estrella de circo. Con `brillo` parpadea suavemente. */
export function Estrella({
  className = '',
  brillo = false,
  retraso = 0,
}: {
  className?: string
  brillo?: boolean
  retraso?: number
}) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      animate={brillo ? { scale: [1, 1.25, 1], rotate: [0, 18, 0], opacity: [0.85, 1, 0.85] } : undefined}
      transition={brillo ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: retraso } : undefined}
    >
      <path d={STAR} fill="currentColor" />
    </motion.svg>
  )
}

/** Separador: línea, rombo, estrella, rombo, línea. */
export function Separador({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-dorado ${className}`} aria-hidden>
      <motion.span
        className="h-px flex-1 bg-gradient-to-r from-transparent to-current"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        style={{ originX: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      <span className="size-1.5 rotate-45 bg-current" />
      <Estrella className="size-4 text-rojo" brillo />
      <span className="size-1.5 rotate-45 bg-current" />
      <motion.span
        className="h-px flex-1 bg-gradient-to-l from-transparent to-current"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        style={{ originX: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  )
}

/** Filigrana de esquina para los marcos. */
function Esquina({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={`pointer-events-none absolute size-7 text-dorado ${className}`}>
      <path
        d="M3 37V12C3 7 7 3 12 3h25M9 37V16c0-4 3-7 7-7h21"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M3 3l6 6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="2.4" fill="currentColor" />
      <path d="M22 16c4-1 7-4 8-8M16 22c-1 4-4 7-8 8" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

/** Marco ornamentado de cartel: doble borde con filigranas doradas en las esquinas. */
export function Marco({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative border-[3px] border-double border-tinta bg-crema/85 p-1.5 shadow-cartel ${className}`}>
      <div className="relative h-full border border-dorado/70 p-4">
        <Esquina className="top-0.5 left-0.5" />
        <Esquina className="top-0.5 right-0.5 -scale-x-100" />
        <Esquina className="bottom-0.5 left-0.5 -scale-y-100" />
        <Esquina className="right-0.5 bottom-0.5 -scale-100" />
        {children}
      </div>
    </div>
  )
}

/** Cinta roja para títulos de sección. */
export function Cinta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative mx-auto w-fit ${className}`}>
      <svg viewBox="0 0 20 40" aria-hidden className="absolute top-1.5 -left-4 h-full text-rojo-oscuro" preserveAspectRatio="none">
        <path d="M0 0h20v40H0l8-20z" fill="currentColor" />
      </svg>
      <svg viewBox="0 0 20 40" aria-hidden className="absolute top-1.5 -right-4 h-full -scale-x-100 text-rojo-oscuro" preserveAspectRatio="none">
        <path d="M0 0h20v40H0l8-20z" fill="currentColor" />
      </svg>
      <div className="relative bg-rojo px-5 py-1.5 font-cartel tracking-wide text-crema shadow-md">{children}</div>
    </div>
  )
}
