import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ContextoRetroalimentacion } from './ContextoRetroalimentacion';
import {
  MAXIMO_COMENTARIO_BREVE_RETROALIMENTACION,
  MAXIMO_IDEA_RETROALIMENTACION,
  PUNTUACION_NPS_MAXIMA,
  PUNTUACION_NPS_MINIMA,
} from './constantes';
import {
  registrarAperturaAccesoRetroalimentacion,
  registrarAperturaPanelRetroalimentacion,
  registrarCambioFlujoRetroalimentacion,
  registrarCierrePanelRetroalimentacion,
  registrarEstadoAnimoEnviado,
  registrarIdeaEnviada,
  registrarNpsRespondido,
} from './integracionAnalitica';
import { esPuntuacionNpsValida, normalizarTextoBreve } from './reglasFrecuencia';
import type { EnvioEstadoAnimo, EnvioIdea, EnvioRespuestaNps, FlujoRetroalimentacion, OrigenAperturaRetroalimentacion, RetroalimentacionApi } from './tipos';

const FLUJO_INICIAL: FlujoRetroalimentacion = 'estado_animo';

function validarComentarioBreve(comentario: string | undefined): boolean {
  return normalizarTextoBreve(comentario).length <= MAXIMO_COMENTARIO_BREVE_RETROALIMENTACION;
}

function validarIdea(contenido: string): boolean {
  const texto = normalizarTextoBreve(contenido);
  return texto.length > 0 && texto.length <= MAXIMO_IDEA_RETROALIMENTACION;
}

function validarRespuestaNps(entrada: EnvioRespuestaNps): boolean {
  return esPuntuacionNpsValida(entrada.puntuacion)
    && validarComentarioBreve(entrada.comentario)
    && entrada.puntuacion >= PUNTUACION_NPS_MINIMA
    && entrada.puntuacion <= PUNTUACION_NPS_MAXIMA;
}

export function ProveedorRetroalimentacion({ children }: { children: ReactNode }) {
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [flujoActivo, setFlujoActivo] = useState<FlujoRetroalimentacion>(FLUJO_INICIAL);
  const [ultimaRespuestaNpsEn, setUltimaRespuestaNpsEn] = useState<string | null>(null);

  const abrirPanel = useCallback((
    flujo: FlujoRetroalimentacion = FLUJO_INICIAL,
    origen: OrigenAperturaRetroalimentacion = 'header',
  ) => {
    registrarAperturaAccesoRetroalimentacion(origen);
    registrarAperturaPanelRetroalimentacion(flujo, origen);
    setFlujoActivo(flujo);
    setPanelAbierto(true);
  }, []);

  const cerrarPanel = useCallback(() => {
    registrarCierrePanelRetroalimentacion(flujoActivo);
    setPanelAbierto(false);
  }, [flujoActivo]);

  const cambiarFlujo = useCallback((flujo: FlujoRetroalimentacion) => {
    setFlujoActivo((actual) => {
      if (actual !== flujo) {
        registrarCambioFlujoRetroalimentacion(flujo);
      }
      return flujo;
    });
    setPanelAbierto(true);
  }, []);

  const solicitarEncuestaNps = useCallback(() => {
    abrirPanel('nps', 'automatico');
  }, [abrirPanel]);

  const enviarEstadoAnimo = useCallback((entrada: EnvioEstadoAnimo): boolean => {
    const comentario = normalizarTextoBreve(entrada.comentario);

    if (!entrada.estado || !validarComentarioBreve(comentario)) {
      return false;
    }

    registrarEstadoAnimoEnviado(entrada.estado);
    return true;
  }, []);

  const enviarIdea = useCallback((entrada: EnvioIdea): boolean => {
    const contenido = normalizarTextoBreve(entrada.contenido);

    if (!validarIdea(contenido)) {
      return false;
    }

    registrarIdeaEnviada();
    return true;
  }, []);

  const enviarRespuestaNps = useCallback((entrada: EnvioRespuestaNps): boolean => {
    const respuesta = {
      ...entrada,
      comentario: normalizarTextoBreve(entrada.comentario),
    };

    if (!validarRespuestaNps(respuesta)) {
      return false;
    }

    registrarNpsRespondido(respuesta.puntuacion);
    setUltimaRespuestaNpsEn(new Date().toISOString());
    return true;
  }, []);

  const value = useMemo<RetroalimentacionApi>(() => ({
    panelAbierto,
    flujoActivo,
    ultimaRespuestaNpsEn,
    abrirPanel,
    cerrarPanel,
    cambiarFlujo,
    solicitarEncuestaNps,
    enviarEstadoAnimo,
    enviarIdea,
    enviarRespuestaNps,
  }), [
    panelAbierto,
    flujoActivo,
    ultimaRespuestaNpsEn,
    abrirPanel,
    cerrarPanel,
    cambiarFlujo,
    solicitarEncuestaNps,
    enviarEstadoAnimo,
    enviarIdea,
    enviarRespuestaNps,
  ]);

  return <ContextoRetroalimentacion.Provider value={value}>{children}</ContextoRetroalimentacion.Provider>;
}