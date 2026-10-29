import { motion } from 'motion/react'
import { Cabecera } from '../components/Cabecera'
import { Chistera } from '../components/Iconos'
import { Marco } from '../components/Ornamentos'

/** Página provisional para las secciones de fases posteriores. */
export default function Proximamente({ titulo, antetitulo, texto }: { titulo: string; antetitulo: string; texto: string }) {
  return (
    <section>
      <Cabecera antetitulo={antetitulo} titulo={titulo} />
      <Marco className="mx-auto max-w-md">
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <motion.div
            animate={{ y: [0, -10, 0], rotate: [0, -6, 6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Chistera className="size-16 text-rojo" />
          </motion.div>
          <p className="font-titulo text-2xl">Próximamente en cartel</p>
          <p className="text-tinta-suave italic">{texto}</p>
        </div>
      </Marco>
    </section>
  )
}
