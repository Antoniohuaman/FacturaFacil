import { useCallback, useRef, useState } from 'react';

type EstadoEnvioLocal = 'inactivo' | 'enviando' | 'enviado';
type ResultadoEnvioLocal = 'exitoso' | 'fallido' | 'omitido';

export function useEstadoEnvioLocal() {
  const [estadoEnvio, setEstadoEnvio] = useState<EstadoEnvioLocal>('inactivo');
  const envioEnCursoRef = useRef(false);

  const reiniciarEstadoEnvio = useCallback(() => {
    setEstadoEnvio('inactivo');
  }, []);

  const ejecutarEnvioLocal = useCallback(async (accion: () => boolean | Promise<boolean>) => {
    if (envioEnCursoRef.current) {
      return 'omitido' as ResultadoEnvioLocal;
    }

    envioEnCursoRef.current = true;
    setEstadoEnvio('enviando');

    try {
      const resultado = await Promise.resolve(accion());
      setEstadoEnvio(resultado ? 'enviado' : 'inactivo');
      return resultado ? 'exitoso' as ResultadoEnvioLocal : 'fallido' as ResultadoEnvioLocal;
    } catch {
      setEstadoEnvio('inactivo');
      return 'fallido' as ResultadoEnvioLocal;
    } finally {
      envioEnCursoRef.current = false;
    }
  }, []);

  return {
    estadoEnvio,
    enviando: estadoEnvio === 'enviando',
    enviado: estadoEnvio === 'enviado',
    ejecutarEnvioLocal,
    reiniciarEstadoEnvio,
  } as const;
}