import { motion } from 'motion/react'
import { Separador } from './Ornamentos'

/** Título de página con aire de cartel: antetítulo, título grande y separador. */
export function Cabecera({ antetitulo, titulo }: { antetitulo?: string; titulo: string }) {
  return (
    <header className="mb-6 text-center lg:mb-10">
      {antetitulo && (
        <motion.p
          className="text-xs tracking-[0.3em] text-rojo uppercase lg:text-sm"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {antetitulo}
        </motion.p>
      )}
      <motion.h1
        className="texto-relieve font-cartel text-4xl leading-tight text-tinta lg:text-6xl"
        initial={{ opacity: 0, scale: 0.85, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.05 }}
      >
        {titulo}
      </motion.h1>
      <Separador className="mx-auto mt-3 max-w-xs" />
    </header>
  )
}
