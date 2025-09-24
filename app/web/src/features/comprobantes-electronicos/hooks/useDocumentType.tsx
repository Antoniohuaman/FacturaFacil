// ===================================================================
// HOOK PARA MANEJO DE TIPOS DE DOCUMENTOS Y SERIES
// ===================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { TipoComprobante } from '../models/comprobante.types';
import { SERIES_COMPROBANTES } from '../models/constants';

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
  
  // ===================================================================
  // FUNCIONES DE UTILIDAD
  // ===================================================================

  /**
   * Obtener series disponibles para un tipo específico
   */
  const getSeriesParaTipo = useCallback((tipo: TipoComprobante): string[] => {
    return tipo === 'boleta'
      ? SERIES_COMPROBANTES.filter(s => s.startsWith('B'))
      : SERIES_COMPROBANTES.filter(s => s.startsWith('F'));
  }, []);

  /**
   * Obtener serie por defecto para un tipo específico
   */
  const getDefaultSerieParaTipo = useCallback((tipo: TipoComprobante): string => {
    const seriesParaTipo = getSeriesParaTipo(tipo);
    return seriesParaTipo[0] || SERIES_COMPROBANTES[0];
  }, [getSeriesParaTipo]);

  /**
   * Obtener todas las series disponibles
   */
  const getAllSeries = useCallback((): string[] => {
    return [...SERIES_COMPROBANTES];
  }, []);

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