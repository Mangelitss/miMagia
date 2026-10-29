import type { IconoCategoria } from '../components/Iconos'

export type Categoria = {
  id: string
  nombre: string
  icono: IconoCategoria
  color: string
}

// Categorías por defecto. En la Fase 1 se guardarán en Firestore y se podrán editar.
export const CATEGORIAS_INICIALES: Categoria[] = [
  { id: 'cartomagia', nombre: 'Cartomagia', icono: 'cartas', color: '#9e1b1b' },
  { id: 'monedas', nombre: 'Monedas', icono: 'moneda', color: '#b8892b' },
  { id: 'mentalismo', nombre: 'Mentalismo', icono: 'ojo', color: '#3f3a6b' },
  { id: 'cuerdas', nombre: 'Cuerdas', icono: 'cuerda', color: '#5c6b3a' },
  { id: 'objetos-cotidianos', nombre: 'Objetos cotidianos', icono: 'cubilete', color: '#2f5d62' },
  { id: 'magia-de-salon', nombre: 'Magia de salón', icono: 'telon', color: '#6d1010' },
]
