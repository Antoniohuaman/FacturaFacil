import { useCallback, useState } from 'react';

type EstadoEnvioLocal = 'inactivo' | 'enviando' | 'enviado';

export function useEstadoEnvioLocal() {
  const [estadoEnvio, setEstadoEnvio] = useState<EstadoEnvioLocal>('inactivo');

  const reiniciarEstadoEnvio = useCallback(() => {
    setEstadoEnvio('inactivo');
  }, []);

  const ejecutarEnvioLocal = useCallback(async (accion: () => boolean | Promise<boolean>) => {
    setEstadoEnvio('enviando');

    const resultado = await Promise.resolve(accion());
    setEstadoEnvio(resultado ? 'enviado' : 'inactivo');

    return resultado;
  }, []);

  return {
    estadoEnvio,
    enviando: estadoEnvio === 'enviando',
    enviado: estadoEnvio === 'enviado',
    ejecutarEnvioLocal,
    reiniciarEstadoEnvio,
  } as const;
}