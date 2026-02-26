import {
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from 'react'
import { TemaContexto, type ContextoTema, type ModoTema } from '@/compartido/tema/contextoTema'

const CLAVE_ALMACENAMIENTO = 'portal_pm_tema'

function obtenerTemaInicial(): ModoTema {
  if (typeof window === 'undefined') {
    return 'claro'
  }

  const guardado = window.localStorage.getItem(CLAVE_ALMACENAMIENTO)
  if (guardado === 'claro' || guardado === 'oscuro') {
    return guardado
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'
}

export function ProveedorTema({ children }: PropsWithChildren) {
  const [modoTema, setModoTema] = useState<ModoTema>(obtenerTemaInicial)

  useEffect(() => {
    const esOscuro = modoTema === 'oscuro'
    document.documentElement.classList.toggle('dark', esOscuro)
    document.documentElement.setAttribute('data-theme', modoTema)
    window.localStorage.setItem(CLAVE_ALMACENAMIENTO, modoTema)
  }, [modoTema])

  const valor = useMemo<ContextoTema>(
    () => ({
      modoTema,
      alternarTema: () => setModoTema((actual) => (actual === 'claro' ? 'oscuro' : 'claro'))
    }),
    [modoTema]
  )

  return <TemaContexto.Provider value={valor}>{children}</TemaContexto.Provider>
}
