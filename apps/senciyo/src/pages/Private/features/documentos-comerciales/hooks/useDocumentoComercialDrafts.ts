import { useCallback } from 'react';
import { useBorradorEnProgreso } from '@/shared/borradores/useBorradorEnProgreso';
import { crearClaveBorradorEnProgreso } from '@/shared/borradores/almacenamientoBorradorEnProgreso';
import { useTenant } from '@/shared/tenant/TenantContext';
import {
  BORRADOR_EN_PROGRESO_VERSION,
  BORRADOR_EN_PROGRESO_TTL_DIAS,
} from '../models/documentoComercial.constants';
import type {
  TipoDocumentoComercial,
  DatosFormularioDocumentoComercial,
} from '../models/documentoComercial.types';

interface ConfiguracionBorradorDoc {
  tipoDocumento: TipoDocumentoComercial;
  serieSeleccionada: string;
  habilitado: boolean;
  extraerEstado: () => DatosFormularioDocumentoComercial;
  aplicarEstado: (datos: DatosFormularioDocumentoComercial) => void;
  debePersistir?: (datos: DatosFormularioDocumentoComercial) => boolean;
}

export interface UseDocumentoComercialDraftsReturn {
  restaurarBorrador: () => void;
  limpiarBorrador: () => void;
  forzarGuardadoBorrador: () => void;
}

export function useDocumentoComercialDrafts(
  config: ConfiguracionBorradorDoc,
): UseDocumentoComercialDraftsReturn {
  const { tenantId, activeEstablecimientoId } = useTenant();

  const clave = crearClaveBorradorEnProgreso({
    app: 'documentos_comerciales',
    tenantId: tenantId ?? undefined,
    establecimientoId: activeEstablecimientoId ?? undefined,
    tipoDocumento: config.tipoDocumento,
    serie: config.serieSeleccionada || 'sin_serie',
    modo: 'formulario',
  });

  const control = useBorradorEnProgreso<
    DatosFormularioDocumentoComercial,
    DatosFormularioDocumentoComercial
  >({
    habilitado: config.habilitado,
    clave,
    version: BORRADOR_EN_PROGRESO_VERSION,
    ttlDias: BORRADOR_EN_PROGRESO_TTL_DIAS,
    debounceMs: 500,
    extraerEstado: config.extraerEstado,
    convertirAStorage: (estado) => estado,
    aplicarDesdeStorage: config.aplicarEstado,
    debePersistir: config.debePersistir,
    limpiarSiNoDebePersistir: false,
  });

  const restaurarBorrador = useCallback(() => {
    control.restaurar();
  }, [control]);

  const limpiarBorrador = useCallback(() => {
    control.limpiar();
  }, [control]);

  const forzarGuardadoBorrador = useCallback(() => {
    control.forzarGuardado();
  }, [control]);

  return { restaurarBorrador, limpiarBorrador, forzarGuardadoBorrador };
}
