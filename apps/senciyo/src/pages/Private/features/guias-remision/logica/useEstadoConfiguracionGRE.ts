import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/shared/tenant/TenantContext';
import { conexionSunatDataSource } from '../../configuracion-sistema/api/fuenteDatosConexionSunat';
import { datosTransportistaDataSource } from '../../configuracion-sistema/api/fuenteDatosTransporte';
import { ENTIDADES_AUTORIZADORAS_D37 } from '../../configuracion-sistema/datos/catalogosGRE';
import type { ConexionSunat } from '../../configuracion-sistema/modelos/ConexionSunat';
import type { DatosTransportista } from '../../configuracion-sistema/modelos/Transporte';

export interface AutorizacionEmisorGRE {
  entidadNombre: string;
  numeroAutorizacion: string;
}

export interface EstadoConfiguracionGRE {
  credencialesCompletas: boolean;
  puedeEmitirPorConfiguracion: boolean;
  faltantesCredenciales: string[];
  autorizacionEspecialEmisor: AutorizacionEmisorGRE | undefined;
  cargando: boolean;
  refrescar: () => void;
}

export type DerivacionEstadoConfiguracionGRE = Omit<EstadoConfiguracionGRE, 'cargando' | 'refrescar'>;

/**
 * Lógica PURA (sin React) que decide si una empresa puede emitir GRE según su configuración real
 * de credenciales SUNAT — GRE-P1-003. Extraída del hook para que la misma regla pueda probarse
 * sin renderizar un componente y, en principio, consumirse desde cualquier capa que la necesite
 * sin arrastrar una dependencia de React. `emitir()` en `FormularioGREPage.tsx` y el banner/botón
 * de la UI leen exactamente el mismo resultado — nunca dos cálculos distintos.
 */
export function derivarEstadoConfiguracionGRE(
  conexion: ConexionSunat | null | undefined,
  transportista: DatosTransportista | null | undefined,
): DerivacionEstadoConfiguracionGRE {
  const solCompleto = Boolean(conexion?.accesoSOL?.usuarioSOL?.trim() && conexion?.accesoSOL?.claveSOL?.trim());
  const greCompleto = Boolean(conexion?.credencialesGRE?.clientId?.trim() && conexion?.credencialesGRE?.clientSecret?.trim());
  const credencialesCompletas = solCompleto && greCompleto;

  const faltantesCredenciales: string[] = [];
  if (!solCompleto) faltantesCredenciales.push('Acceso SOL (usuario y clave)');
  if (!greCompleto) faltantesCredenciales.push('Credenciales GRE (Client ID y Client Secret)');

  const codigoEnt = transportista?.codigoEntidadAutorizadora?.trim();
  const numAut = transportista?.numeroAutorizacion?.trim();
  let autorizacionEspecialEmisor: AutorizacionEmisorGRE | undefined;
  if (codigoEnt && numAut) {
    const entidad = ENTIDADES_AUTORIZADORAS_D37.find((e) => e.codigo === codigoEnt);
    autorizacionEspecialEmisor = { entidadNombre: entidad?.entidad ?? codigoEnt, numeroAutorizacion: numAut };
  }

  return {
    credencialesCompletas,
    puedeEmitirPorConfiguracion: credencialesCompletas,
    faltantesCredenciales,
    autorizacionEspecialEmisor,
  };
}

export function useEstadoConfiguracionGRE(): EstadoConfiguracionGRE {
  const { tenantId } = useTenant();
  const [derivado, setDerivado] = useState<DerivacionEstadoConfiguracionGRE>(() =>
    derivarEstadoConfiguracionGRE(undefined, undefined),
  );
  const [cargando, setCargando] = useState(true);
  const [refKey, setRefKey] = useState(0);

  useEffect(() => {
    if (!tenantId) {
      setCargando(false);
      return;
    }
    setCargando(true);
    let cancelled = false;
    void Promise.all([
      conexionSunatDataSource.get(tenantId) as Promise<ConexionSunat | null>,
      datosTransportistaDataSource.get(tenantId) as Promise<DatosTransportista | null>,
    ]).then(([conexion, transportista]) => {
      if (cancelled) return;
      setDerivado(derivarEstadoConfiguracionGRE(conexion, transportista));
      setCargando(false);
    });
    return () => {
      cancelled = true;
    };
  }, [tenantId, refKey]);

  const refrescar = useCallback(() => setRefKey((k) => k + 1), []);

  return { ...derivado, cargando, refrescar };
}
