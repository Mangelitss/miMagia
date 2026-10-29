import { motion } from 'motion/react'
import { Navigate, Route, Routes } from 'react-router'
import Layout from './components/Layout'
import { Estrella } from './components/Ornamentos'
import { useAuth } from './lib/auth'
import { useIsDesktop } from './lib/useIsDesktop'
import Ajustes from './pages/Ajustes'
import Login from './pages/Login'
import Proximamente from './pages/Proximamente'
import Rutinas from './pages/Rutinas'

function Cargando() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}>
        <Estrella className="size-12 text-rojo" />
      </motion.div>
    </div>
  )
}

export default function App() {
  const auth = useAuth()
  const isDesktop = useIsDesktop()

  if (auth.status === 'cargando') return <Cargando />
  if (auth.status !== 'dentro') return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Rutinas />} />
        <Route
          path="favoritos"
          element={<Proximamente antetitulo="Lo mejor del repertorio" titulo="Favoritos" texto="Aquí aparecerán tus rutinas marcadas como favoritas." />}
        />
        <Route
          path="escuela/*"
          element={
            isDesktop ? (
              <Proximamente antetitulo="Academia de artes mágicas" titulo="Escuela" texto="Cursos, lecciones en vídeo y entrenamientos." />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="ajustes" element={<Ajustes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
