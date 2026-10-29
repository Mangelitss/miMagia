import { motion } from 'motion/react'
import { Cabecera } from '../components/Cabecera'
import { ICONOS_CATEGORIA } from '../components/Iconos'
import { Estrella } from '../components/Ornamentos'
import { CATEGORIAS_INICIALES } from '../data/categoriasIniciales'

export default function Rutinas() {
  return (
    <section>
      <Cabecera antetitulo="El gran repertorio" titulo="Rutinas" />
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:gap-6 xl:grid-cols-4">
        {CATEGORIAS_INICIALES.map((c, i) => {
          const Icono = ICONOS_CATEGORIA[c.icono]
          return (
            <motion.li
              key={c.id}
              // Reparto en cascada, como cartas que salen del mazo.
              initial={{ opacity: 0, y: 120, rotate: i % 2 ? 14 : -14, scale: 0.7 }}
              animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.08 * i }}
              whileHover={{ y: -6, rotate: i % 2 ? 1.5 : -1.5 }}
              whileTap={{ scale: 0.96 }}
            >
              <button
                type="button"
                className="group relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 overflow-hidden border-[3px] border-double border-tinta bg-crema p-3 text-center shadow-cartel"
              >
                <span className="absolute inset-1.5 border border-dorado/60" />
                <span
                  className="relative grid size-16 place-items-center rounded-full border-2 border-dorado text-crema shadow-inner lg:size-20"
                  style={{ backgroundColor: c.color }}
                >
                  <Icono className="size-9 transition-transform duration-500 group-hover:rotate-[360deg] lg:size-11" />
                </span>
                <span className="relative font-titulo text-lg leading-tight lg:text-2xl">{c.nombre}</span>
                <Estrella className="absolute top-3 left-3 size-3 text-dorado" />
                <Estrella className="absolute top-3 right-3 size-3 text-dorado" />
                <span className="relative text-[10px] tracking-[0.25em] text-tinta-suave uppercase">Próximamente</span>
              </button>
            </motion.li>
          )
        })}
      </ul>
    </section>
  )
}
