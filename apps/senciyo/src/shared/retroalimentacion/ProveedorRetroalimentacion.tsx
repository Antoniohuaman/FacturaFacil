import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { UserSession } from '../../contexts/UserSessionContext';
import { useUserSession } from '../../contexts/UserSessionContext';
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
import {
  guardarCalificacionEnSupabase,
  guardarEstadoAnimoEnSupabase,
  guardarIdeaEnSupabase,
} from './servicios/retroalimentacionSupabase';
import type { EnvioEstadoAnimo, EnvioIdea, EnvioRespuestaNps, FlujoRetroalimentacion, OrigenAperturaRetroalimentacion, RetroalimentacionApi } from './tipos';

const FLUJO_INICIAL: FlujoRetroalimentacion = 'estado_animo';

function resolverModuloDesdeRuta(pathname: string): string {
  const primerSegmento = pathname
    .split('/')
    .map((segmento) => segmento.trim())
    .filter(Boolean)[0];

  return primerSegmento?.toLowerCase() ?? 'inicio';
}

function resolverRutaActual(pathname: string, search: string): string {
  return `${pathname}${search ?? ''}` || '/';
}

function resolverNombreUsuario(session: UserSession): string {
  return session.userName?.trim()
    || session.userEmail?.trim()
    || session.userId;
}

function resolverNombreEmpresa(session: UserSession): string {
  return session.currentCompany?.razonSocial?.trim()
    || session.currentCompany?.nombreComercial?.trim()
    || session.currentCompanyId;
}

function resolverCorreoUsuario(session: UserSession): string | null {
  const correo = session.userEmail?.trim();
  return correo || null;
}

function resolverRucEmpresa(session: UserSession): string | null {
  const ruc = session.currentCompany?.ruc?.trim();
  return ruc || null;
}

function resolverRazonSocialEmpresa(session: UserSession): string | null {
  const razonSocial = session.currentCompany?.razonSocial?.trim();
  return razonSocial || null;
}

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
  const location = useLocation();
  const { session } = useUserSession();
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [flujoActivo, setFlujoActivo] = useState<FlujoRetroalimentacion>(FLUJO_INICIAL);
  const [ultimaRespuestaNpsEn, setUltimaRespuestaNpsEn] = useState<string | null>(null);

  const contextoRegistro = useMemo(() => {
    if (!session || !session.currentCompanyId || !session.currentCompany) {
      return null;
    }

    return {
      usuarioId: session.userId,
      usuarioNombre: resolverNombreUsuario(session),
      usuarioCorreo: resolverCorreoUsuario(session),
      empresaId: session.currentCompanyId,
      empresaRuc: resolverRucEmpresa(session),
      empresaRazonSocial: resolverRazonSocialEmpresa(session),
      empresaNombre: resolverNombreEmpresa(session),
      establecimientoId: session.currentEstablecimiento?.id ?? null,
      establecimientoNombre: session.currentEstablecimiento?.nombreEstablecimiento ?? null,
      modulo: resolverModuloDesdeRuta(location.pathname),
      ruta: resolverRutaActual(location.pathname, location.search),
    };
  }, [location.pathname, location.search, session]);

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

  const enviarEstadoAnimo = useCallback(async (entrada: EnvioEstadoAnimo): Promise<boolean> => {
    const comentario = normalizarTextoBreve(entrada.comentario);

    if (!entrada.estado || !validarComentarioBreve(comentario) || !contextoRegistro) {
      if (!contextoRegistro) {
        console.warn('[retroalimentacion] Contexto incompleto para guardar estado de ánimo');
      }
      return false;
    }

    try {
      await guardarEstadoAnimoEnSupabase(contextoRegistro, {
        estado: entrada.estado,
        comentario: comentario || null,
      });
      registrarEstadoAnimoEnviado(entrada.estado);
      return true;
    } catch (error) {
      console.error('[retroalimentacion] No se pudo guardar el estado de ánimo', error);
      return false;
    }
  }, [contextoRegistro]);

  const enviarIdea = useCallback(async (entrada: EnvioIdea): Promise<boolean> => {
    const contenido = normalizarTextoBreve(entrada.contenido);

    if (!validarIdea(contenido) || !contextoRegistro) {
      if (!contextoRegistro) {
        console.warn('[retroalimentacion] Contexto incompleto para guardar idea');
      }
      return false;
    }

    try {
      await guardarIdeaEnSupabase(contextoRegistro, { contenido });
      registrarIdeaEnviada();
      return true;
    } catch (error) {
      console.error('[retroalimentacion] No se pudo guardar la idea', error);
      return false;
    }
  }, [contextoRegistro]);

  const enviarRespuestaNps = useCallback(async (entrada: EnvioRespuestaNps): Promise<boolean> => {
    const respuesta = {
      ...entrada,
      comentario: normalizarTextoBreve(entrada.comentario),
    };

    if (!validarRespuestaNps(respuesta) || !contextoRegistro) {
      if (!contextoRegistro) {
        console.warn('[retroalimentacion] Contexto incompleto para guardar calificación');
      }
      return false;
    }

    try {
      await guardarCalificacionEnSupabase(contextoRegistro, {
        puntaje: respuesta.puntuacion,
        comentario: respuesta.comentario || null,
      });
      registrarNpsRespondido(respuesta.puntuacion);
      setUltimaRespuestaNpsEn(new Date().toISOString());
      return true;
    } catch (error) {
      console.error('[retroalimentacion] No se pudo guardar la calificación', error);
      return false;
    }
  }, [contextoRegistro]);

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