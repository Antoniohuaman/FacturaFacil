// ===================================================================
// HOOK PARA MANEJO DE TIPOS DE DOCUMENTOS Y SERIES
// ===================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import type { TipoComprobante } from '../models/comprobante.types';

export interface UseDocumentTypeReturn {
  // Estados principales
  tipoComprobante: TipoComprobante;
  serieSeleccionada: string;
  seriesFiltradas: string[];
  
  // Funciones de cambio
  setTipoComprobante: (tipo: TipoComprobante) => void;
  setSerieSeleccionada: (serie: string) => void;
  handleTipoComprobanteChange: (tipo: TipoComprobante) => void;
  handleSerieChange: (serie: string) => void;
  
  // Utilidades
  getSeriesParaTipo: (tipo: TipoComprobante) => string[];
  getDefaultSerieParaTipo: (tipo: TipoComprobante) => string;
  getAllSeries: () => string[];
}

export const useDocumentType = (): UseDocumentTypeReturn => {
  const location = useLocation();
  const { state } = useConfigurationContext();
  
  // ===================================================================
  // SERIES DINÁMICAS DESDE CONFIGURACIÓN
  // ===================================================================
  
  /**
   * Obtener series desde configuración SOLO si existe empresa configurada
   * NO usar fallback - si no hay empresa, retornar array vacío
   */
  const availableSeries = useMemo(() => {
    // Verificar si existe empresa configurada
    if (!state.company || !state.company.ruc) {
      // Sin empresa configurada = sin series disponibles
      return [];
    }
    
    if (state.series.length > 0) {
      // Usar series configuradas (del onboarding o configuración manual)
      return state.series
        .filter(s => s.isActive && s.status === 'ACTIVE')
        .map(s => s.series);
    }
    
    // Si hay empresa pero no hay series, retornar vacío (no usar fallback)
    return [];
  }, [state.series, state.company]);
  
  // ===================================================================
  // FUNCIONES DE UTILIDAD
  // ===================================================================

  /**
   * Obtener series disponibles para un tipo específico
   */
  const getSeriesParaTipo = useCallback((tipo: TipoComprobante): string[] => {
    // Filtrar por código de documento
    // Boleta: código '03' → series que empiezan con 'B' o 'BE'
    // Factura: código '01' → series que empiezan con 'F' o 'FE'
    if (tipo === 'boleta') {
      if (state.series.length > 0) {
        return state.series
          .filter(s => s.isActive && s.status === 'ACTIVE' && s.documentType.code === '03')
          .map(s => s.series);
      }
      return availableSeries.filter(s => s.startsWith('B'));
    } else {
      if (state.series.length > 0) {
        return state.series
          .filter(s => s.isActive && s.status === 'ACTIVE' && s.documentType.code === '01')
          .map(s => s.series);
      }
      return availableSeries.filter(s => s.startsWith('F'));
    }
  }, [state.series, availableSeries]);

  /**
   * Obtener serie por defecto para un tipo específico
   * Retorna cadena vacía si no hay empresa configurada
   */
  const getDefaultSerieParaTipo = useCallback((tipo: TipoComprobante): string => {
    const seriesParaTipo = getSeriesParaTipo(tipo);
    return seriesParaTipo[0] || '';
  }, [getSeriesParaTipo]);

  /**
   * Obtener todas las series disponibles
   */
  const getAllSeries = useCallback((): string[] => {
    return [...availableSeries];
  }, [availableSeries]);

  /**
   * Detectar tipo desde URL parameters
   */
  const detectTipoFromURL = useCallback((): TipoComprobante => {
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get('tipo');
    if (tipo === 'factura') return 'factura';
    if (tipo === 'boleta') return 'boleta';
    return 'boleta'; // Valor por defecto
  }, []);

  /**
   * Detectar serie desde URL parameters según el tipo
   */
  const detectSerieFromURL = useCallback((tipo?: TipoComprobante): string => {
    const params = new URLSearchParams(window.location.search);
    const tipoFromURL = params.get('tipo') as TipoComprobante;
    const targetTipo = tipo || tipoFromURL || 'boleta';
    
    return getDefaultSerieParaTipo(targetTipo);
  }, [getDefaultSerieParaTipo]);

  // ===================================================================
  // ESTADOS PRINCIPALES
  // ===================================================================

  /**
   * Estado del tipo de comprobante con inicialización desde URL
   */
  const [tipoComprobante, setTipoComprobanteState] = useState<TipoComprobante>(() => {
    return detectTipoFromURL();
  });

  /**
   * Ref para trackear el valor actual sin dependencia circular
   */
  const tipoComprobanteRef = useRef(tipoComprobante);
  tipoComprobanteRef.current = tipoComprobante;

  /**
   * Estado de la serie seleccionada con inicialización inteligente
   */
  const [serieSeleccionada, setSerieSeleccionadaState] = useState(() => {
    return detectSerieFromURL(detectTipoFromURL());
  });

  // ===================================================================
  // EFECTOS DE SINCRONIZACIÓN
  // ===================================================================

  /**
   * Sincronizar SOLO en la carga inicial desde URL
   * No interfiere con cambios manuales del usuario
   */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tipoFromURL = params.get('tipo') as TipoComprobante;
    
    // Solo aplicar si hay un tipo específico en la URL y es diferente al actual
    if (tipoFromURL && tipoFromURL !== tipoComprobanteRef.current) {
      if (tipoFromURL === 'factura' || tipoFromURL === 'boleta') {
        setTipoComprobanteState(tipoFromURL);
        setSerieSeleccionadaState(getDefaultSerieParaTipo(tipoFromURL));
      }
    }
  }, [location.search, getDefaultSerieParaTipo]);

  // ===================================================================
  // VALORES CALCULADOS
  // ===================================================================

  /**
   * Series filtradas según el tipo actual
   * Mantiene exactamente la misma lógica del componente original
   */
  const seriesFiltradas = getSeriesParaTipo(tipoComprobante);

  // ===================================================================
  // FUNCIONES DE CAMBIO
  // ===================================================================

  /**
   * Cambiar tipo de comprobante
   */
  const setTipoComprobante = useCallback((tipo: TipoComprobante) => {
    setTipoComprobanteState(tipo);
    // Auto-actualizar serie al cambiar tipo
    setSerieSeleccionadaState(getDefaultSerieParaTipo(tipo));
  }, [getDefaultSerieParaTipo]);

  /**
   * Cambiar serie seleccionada
   */
  const setSerieSeleccionada = useCallback((serie: string) => {
    setSerieSeleccionadaState(serie);
  }, []);

  /**
   * Manejar cambio de tipo con actualización automática de serie
   * Mantiene exactamente la misma lógica del componente original
   */
  const handleTipoComprobanteChange = useCallback((tipo: TipoComprobante) => {
    setTipoComprobanteState(tipo);
    
    // Buscar primera serie disponible para el nuevo tipo
    const seriesParaTipo = getSeriesParaTipo(tipo);
    if (seriesParaTipo.length > 0) {
      setSerieSeleccionadaState(seriesParaTipo[0]);
    }
  }, [getSeriesParaTipo]);

  /**
   * Manejar cambio de serie
   */
  const handleSerieChange = useCallback((serie: string) => {
    setSerieSeleccionadaState(serie);
  }, []);

  // ===================================================================
  // RETORNO DEL HOOK
  // ===================================================================
  return {
    // Estados principales
    tipoComprobante,
    serieSeleccionada,
    seriesFiltradas,
    
    // Funciones de cambio
    setTipoComprobante,
    setSerieSeleccionada,
    handleTipoComprobanteChange,
    handleSerieChange,
    
    // Utilidades
    getSeriesParaTipo,
    getDefaultSerieParaTipo,
    getAllSeries,
  };
};