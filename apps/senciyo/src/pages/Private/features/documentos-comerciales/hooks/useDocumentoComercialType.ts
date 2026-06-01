import { useState, useMemo, useCallback } from 'react';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useTenant } from '@/shared/tenant/TenantContext';
import type { TipoDocumentoComercial } from '../models/documentoComercial.types';
import {
  TIPO_DOCUMENTO_COMERCIAL_CODIGOS,
  TIPO_DOCUMENTO_COMERCIAL_CATEGORIAS,
} from '../models/documentoComercial.constants';

export interface UseDocumentoComercialTypeReturn {
  tipoDocumento: TipoDocumentoComercial;
  serieSeleccionada: string;
  seriesFiltradas: string[];
  setTipoDocumento: (tipo: TipoDocumentoComercial) => void;
  setSerieSeleccionada: (serie: string) => void;
  getSeriesParaTipo: (tipo: TipoDocumentoComercial) => string[];
  getSerieDefaultParaTipo: (tipo: TipoDocumentoComercial) => string;
  haySeriespara: (tipo: TipoDocumentoComercial) => boolean;
}

export function useDocumentoComercialType(
  tipoInicial: TipoDocumentoComercial = 'cotizacion',
): UseDocumentoComercialTypeReturn {
  const { state } = useConfigurationContext();
  const { activeEstablecimientoId } = useTenant();

  const [tipoDocumento, setTipoDocumentoInterno] = useState<TipoDocumentoComercial>(tipoInicial);
  const [serieSeleccionada, setSerieSeleccionada] = useState<string>('');

  const seriesActivas = useMemo(() => {
    if (!state.series || state.series.length === 0) return [];
    return state.series.filter((s) => {
      if (!s.isActive || s.status !== 'ACTIVE') return false;
      if (activeEstablecimientoId && s.EstablecimientoId !== activeEstablecimientoId) return false;
      return true;
    });
  }, [state.series, activeEstablecimientoId]);

  const getSeriesParaTipo = useCallback(
    (tipo: TipoDocumentoComercial): string[] => {
      const codigos = TIPO_DOCUMENTO_COMERCIAL_CODIGOS[tipo].map((c) => c.toUpperCase());
      const categorias = TIPO_DOCUMENTO_COMERCIAL_CATEGORIAS[tipo].map((c) => c.toUpperCase());

      return seriesActivas
        .filter((s) => {
          const code = (s.documentType.code ?? '').toUpperCase();
          const category = (s.documentType.category ?? '').toUpperCase();
          const name = (s.documentType.name ?? '').toLowerCase();

          return (
            codigos.includes(code) ||
            categorias.includes(category) ||
            codigos.some((c) => name.includes(c.toLowerCase()))
          );
        })
        .map((s) => s.series);
    },
    [seriesActivas],
  );

  const getSerieDefaultParaTipo = useCallback(
    (tipo: TipoDocumentoComercial): string => {
      const codigos = TIPO_DOCUMENTO_COMERCIAL_CODIGOS[tipo].map((c) => c.toUpperCase());
      const categorias = TIPO_DOCUMENTO_COMERCIAL_CATEGORIAS[tipo].map((c) => c.toUpperCase());

      const seriesParaTipo = seriesActivas.filter((s) => {
        const code = (s.documentType.code ?? '').toUpperCase();
        const category = (s.documentType.category ?? '').toUpperCase();
        const name = (s.documentType.name ?? '').toLowerCase();
        return (
          codigos.includes(code) ||
          categorias.includes(category) ||
          codigos.some((c) => name.includes(c.toLowerCase()))
        );
      });

      const serieConDefault = seriesParaTipo.find((s) => s.isDefault);
      return serieConDefault?.series ?? seriesParaTipo[0]?.series ?? '';
    },
    [seriesActivas],
  );

  const haySeriespara = useCallback(
    (tipo: TipoDocumentoComercial): boolean => getSeriesParaTipo(tipo).length > 0,
    [getSeriesParaTipo],
  );

  const seriesFiltradas = useMemo(
    () => getSeriesParaTipo(tipoDocumento),
    [getSeriesParaTipo, tipoDocumento],
  );

  const setTipoDocumento = useCallback(
    (tipo: TipoDocumentoComercial) => {
      setTipoDocumentoInterno(tipo);
      const serieDefault = getSerieDefaultParaTipo(tipo);
      setSerieSeleccionada(serieDefault);
    },
    [getSerieDefaultParaTipo],
  );

  return {
    tipoDocumento,
    serieSeleccionada,
    seriesFiltradas,
    setTipoDocumento,
    setSerieSeleccionada,
    getSeriesParaTipo,
    getSerieDefaultParaTipo,
    haySeriespara,
  };
}
