import type { SVGProps } from 'react'

// Iconos dibujados a mano en línea fina, a juego con el estilo de cartel antiguo.
type P = SVGProps<SVGSVGElement>

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export const Chistera = (p: P) => (
  <svg {...base} {...p}>
    <path d="M7 4.5h10l-.6 11H7.6z" />
    <path d="M7.4 12.5h9.2" strokeWidth={2.4} />
    <path d="M2.5 17c2.5 2.6 16.5 2.6 19 0-2-1.4-17-1.4-19 0z" />
  </svg>
)

export const Libro = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 6.5C9.5 4.8 6 4.5 3 5v13.5c3-.5 6.5-.2 9 1.5 2.5-1.7 6-2 9-1.5V5c-3-.5-6.5-.2-9 1.5z" />
    <path d="M12 6.5V20" />
    <path d="M6 9c1.4-.2 2.8 0 4 .5M6 12.5c1.4-.2 2.8 0 4 .5M14 9.5c1.2-.5 2.6-.7 4-.5" />
  </svg>
)

export const Corazon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" />
  </svg>
)

export const Varita = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 20 15 9" strokeWidth={2.6} />
    <path d="M13.5 10.5 15 9" stroke="currentColor" strokeWidth={4} />
    <path d="M18 3v3M16.5 4.5h3M20.5 9.5v2M19.5 10.5h2M9.5 3.5v2M8.5 4.5h2" />
  </svg>
)

export const Lupa = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="M15 15l5.5 5.5" strokeWidth={2.2} />
  </svg>
)

export const Cartas = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="5.5" width="10" height="14" rx="1.5" transform="rotate(-12 8 12.5)" />
    <rect x="10" y="4" width="10" height="14" rx="1.5" transform="rotate(10 15 11)" />
    <path d="M15.3 8.6c-1 1.3-2.2 2.2-2.2 3.2a1.2 1.2 0 0 0 2.2.6 1.2 1.2 0 0 0 2.2-.4c0-1-1.2-2-2.2-3.4z" fill="currentColor" stroke="none" />
  </svg>
)

export const Moneda = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="6" strokeDasharray="1.2 1.6" />
    <path d="M12 8.6l1 2.2 2.4.2-1.8 1.6.6 2.4-2.2-1.3-2.2 1.3.6-2.4-1.8-1.6 2.4-.2z" fill="currentColor" stroke="none" />
  </svg>
)

export const Ojo = (p: P) => (
  <svg {...base} {...p}>
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
    <circle cx="12" cy="12" r="3.2" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <path d="M12 2v1.8M5 4.5l1.1 1.4M19 4.5l-1.1 1.4" />
  </svg>
)

export const Cuerda = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 19c3 0 4-3 6-6s4-4 6-4a3 3 0 0 1 0 6c-2 0-3.5-1.5-4.5-3.5S8 5 5 5" />
    <path d="M15 15c2 0 3 1 3 2.5S19.5 20 21 20" />
  </svg>
)

export const Cubilete = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 18 8.2 5h7.6L18 18z" />
    <path d="M7.5 9h9M6.8 13.5h10.4" />
    <path d="M4 18.5h16" />
    <circle cx="20" cy="15.5" r="1.6" fill="currentColor" />
  </svg>
)

export const Telon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M2.5 3.5h19" strokeWidth={2} />
    <path d="M3.5 3.5v17c2.5 0 5-1 6-3.5C8.5 12 6.5 7 3.5 3.5zM20.5 3.5v17c-2.5 0-5-1-6-3.5 1-5 3-10 6-13.5z" />
    <path d="M9.5 6.5c1 .6 4 .6 5 0" />
    <path d="M12 12.5l.8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.2z" fill="currentColor" stroke="none" />
  </svg>
)

export const Salir = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" />
    <path d="M10 8l-4 4 4 4M6 12h10" />
  </svg>
)

export const ICONOS_CATEGORIA = {
  cartas: Cartas,
  moneda: Moneda,
  ojo: Ojo,
  cuerda: Cuerda,
  cubilete: Cubilete,
  telon: Telon,
  chistera: Chistera,
  varita: Varita,
} as const

export type IconoCategoria = keyof typeof ICONOS_CATEGORIA
