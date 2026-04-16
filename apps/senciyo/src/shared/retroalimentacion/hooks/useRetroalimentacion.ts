import { useContext } from 'react';
import { ContextoRetroalimentacion } from '../ContextoRetroalimentacion';
import type { RetroalimentacionApi } from '../tipos';

export function useRetroalimentacion(): RetroalimentacionApi {
  const contexto = useContext(ContextoRetroalimentacion);

  if (!contexto) {
    throw new Error('useRetroalimentacion debe usarse dentro de <ProveedorRetroalimentacion />');
  }

  return contexto;
}