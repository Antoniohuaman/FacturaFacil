import { createContext, useContext } from 'react'

export type ModoTema = 'claro' | 'oscuro'

export interface ContextoTema {
  modoTema: ModoTema
  alternarTema: () => void
}

export const TemaContexto = createContext<ContextoTema | undefined>(undefined)

export function useTema() {
  const contexto = useContext(TemaContexto)
  if (!contexto) {
    throw new Error('useTema debe utilizarse dentro de ProveedorTema')
  }
  return contexto
}
