import { useSyncExternalStore } from 'react'
import { DESKTOP_QUERY } from '../config'

const mql = window.matchMedia(DESKTOP_QUERY)

const subscribe = (cb: () => void) => {
  mql.addEventListener('change', cb)
  return () => mql.removeEventListener('change', cb)
}

export function useIsDesktop() {
  return useSyncExternalStore(subscribe, () => mql.matches)
}
