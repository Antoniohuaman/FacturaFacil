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

export function useEstadoConfiguracionGRE(): EstadoConfiguracionGRE {
  const { tenantId } = useTenant();
  const [solCompleto, setSolCompleto] = useState(false);
  const [greCompleto, setGreCompleto] = useState(false);
  const [autorizacion, setAutorizacion] = useState<AutorizacionEmisorGRE | undefined>(undefined);
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
      setSolCompleto(
        Boolean(conexion?.accesoSOL?.usuarioSOL?.trim() && conexion?.accesoSOL?.claveSOL?.trim()),
      );
      setGreCompleto(
        Boolean(conexion?.credencialesGRE?.clientId?.trim() && conexion?.credencialesGRE?.clientSecret?.trim()),
      );
      const codigoEnt = transportista?.codigoEntidadAutorizadora?.trim();
      const numAut = transportista?.numeroAutorizacion?.trim();
      if (codigoEnt && numAut) {
        const entidad = ENTIDADES_AUTORIZADORAS_D37.find((e) => e.codigo === codigoEnt);
        setAutorizacion({
          entidadNombre: entidad?.entidad ?? codigoEnt,
          numeroAutorizacion: numAut,
        });
      } else {
        setAutorizacion(undefined);
      }
      setCargando(false);
    });
    return () => {
      cancelled = true;
    };
  }, [tenantId, refKey]);

  const refrescar = useCallback(() => setRefKey((k) => k + 1), []);

  const credencialesCompletas = solCompleto && greCompleto;
  const faltantesCredenciales: string[] = [];
  if (!solCompleto) faltantesCredenciales.push('Acceso SOL (usuario y clave)');
  if (!greCompleto) faltantesCredenciales.push('Credenciales GRE (Client ID y Client Secret)');

  return {
    credencialesCompletas,
    puedeEmitirPorConfiguracion: credencialesCompletas,
    faltantesCredenciales,
    autorizacionEspecialEmisor: autorizacion,
    cargando,
    refrescar,
  };
}
