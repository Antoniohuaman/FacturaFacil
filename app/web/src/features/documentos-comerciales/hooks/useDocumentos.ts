// app/web/src/features/documentos-comerciales/hooks/useDocumentos.ts

import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  Cotizacion,
  NotaVenta,
  DocumentoFormData,
  FiltrosDocumentos,
  EstadisticasDocumento,
  TipoDocumento,
  EstadoDocumento,
  UIVisibilityConfig
} from '../models/types';
import { documentoRepository } from '../repositories/DocumentoRepository';
import { DocumentoValidationService } from '../services';

interface UseDocumentosReturn {
  // Estado
  cotizaciones: Cotizacion[];
  notasVenta: NotaVenta[];
  loading: boolean;
  error: string | null;
  
  // Filtros
  filtros: FiltrosDocumentos;
  setFiltros: (filtros: FiltrosDocumentos) => void;
  limpiarFiltros: () => void;
  
  // Estadísticas
  estadisticasCotizaciones: EstadisticasDocumento;
  estadisticasNotasVenta: EstadisticasDocumento;
  
  // Operaciones CRUD - Cotizaciones
  crearCotizacion: (data: DocumentoFormData) => Promise<Cotizacion>;
  actualizarCotizacion: (id: string, data: Partial<DocumentoFormData>) => Promise<Cotizacion>;
  anularCotizacion: (id: string, motivo: string) => Promise<void>;
  duplicarCotizacion: (id: string) => Promise<Cotizacion>;
  cambiarEstadoCotizacion: (id: string, estado: EstadoDocumento) => Promise<void>;
  
  // Operaciones CRUD - Notas de Venta
  crearNotaVenta: (data: DocumentoFormData) => Promise<NotaVenta>;
  actualizarNotaVenta: (id: string, data: Partial<DocumentoFormData>) => Promise<NotaVenta>;
  anularNotaVenta: (id: string, motivo: string) => Promise<void>;
  duplicarNotaVenta: (id: string) => Promise<NotaVenta>;
  cambiarEstadoNotaVenta: (id: string, estado: EstadoDocumento) => Promise<void>;
  
  // Conversiones
  convertirCotizacionANotaVenta: (cotizacionId: string) => Promise<NotaVenta>;
  convertirCotizacionAComprobante: (cotizacionId: string) => Promise<any>;
  convertirNotaVentaAComprobante: (notaVentaId: string) => Promise<any>;
  
  // Utilidades
  recargarDatos: () => Promise<void>;
  exportarDocumentos: (tipo: TipoDocumento, formato: 'excel' | 'pdf') => Promise<void>;
  validarDocumento: (data: DocumentoFormData) => { valido: boolean; errores: string[] };
  
  // Configuración UI
  actualizarVisibilidad: (config: Partial<UIVisibilityConfig>) => void;
  obtenerVisibilidad: () => UIVisibilityConfig;
}

/**
 * Hook principal para gestionar documentos comerciales
 * Facade Pattern: Simplifica la interacción con los servicios
 */
export function useDocumentos(): UseDocumentosReturn {
  // Estado principal
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [notasVenta, setNotasVenta] = useState<NotaVenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosDocumentos>({});
  
  // Configuración UI (en producción vendría del backend)
  const [uiVisibility, setUiVisibility] = useState<UIVisibilityConfig>({
    establecimiento: true,
    vendedor: true,
    formaPago: true,
    validoHasta: true,
    correo: true,
    telefono: false,
    codigo: true,
    codigoBarras: false,
    marca: true,
    modelo: false,
    descuentoItem: true,
    descuentoGlobal: true,
    condiciones: true,
    bancos: false,
    referencias: true
  });

  // Servicio de validación
  const validationService = useMemo(() => new DocumentoValidationService(), []);

  // ==================== CARGA INICIAL ====================

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [cotizacionesData, notasVentaData] = await Promise.all([
        documentoRepository.obtenerCotizaciones(filtros),
        documentoRepository.obtenerNotasVenta(filtros)
      ]);
      
      setCotizaciones(cotizacionesData);
      setNotasVenta(notasVentaData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar documentos');
      console.error('Error al cargar documentos:', err);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ==================== ESTADÍSTICAS ====================

  const calcularEstadisticas = useCallback((documentos: (Cotizacion | NotaVenta)[]): EstadisticasDocumento => {
    const total = documentos.length;
    const borradores = documentos.filter(d => d.estado === 'BORRADOR').length;
    const emitidos = documentos.filter(d => d.estado === 'EMITIDO').length;
    const aprobados = documentos.filter(d => d.estado === 'APROBADO').length;
    const convertidos = documentos.filter(d => d.estado === 'CONVERTIDO').length;
    const anulados = documentos.filter(d => d.estado === 'ANULADO').length;

    const documentosActivos = documentos.filter(d => 
      d.estado !== 'ANULADO' && d.estado !== 'RECHAZADO'
    );

    const montoTotal = documentosActivos.reduce((sum, d) => {
      const monto = d.moneda === 'USD' ? d.totales.total * (d.tipoCambio || 3.75) : d.totales.total;
      return sum + monto;
    }, 0);

    const montoAprobado = documentos
      .filter(d => d.estado === 'APROBADO')
      .reduce((sum, d) => {
        const monto = d.moneda === 'USD' ? d.totales.total * (d.tipoCambio || 3.75) : d.totales.total;
        return sum + monto;
      }, 0);

    const montoConvertido = documentos
      .filter(d => d.estado === 'CONVERTIDO')
      .reduce((sum, d) => {
        const monto = d.moneda === 'USD' ? d.totales.total * (d.tipoCambio || 3.75) : d.totales.total;
        return sum + monto;
      }, 0);

    const tasaConversion = total > 0 ? (convertidos / total) * 100 : 0;
    const promedioMonto = documentosActivos.length > 0 ? montoTotal / documentosActivos.length : 0;

    return {
      total,
      borradores,
      emitidos,
      aprobados,
      convertidos,
      anulados,
      montoTotal,
      montoAprobado,
      montoConvertido,
      tasaConversion,
      promedioMonto
    };
  }, []);

  const estadisticasCotizaciones = useMemo(() => 
    calcularEstadisticas(cotizaciones), 
    [cotizaciones, calcularEstadisticas]
  );

  const estadisticasNotasVenta = useMemo(() => 
    calcularEstadisticas(notasVenta), 
    [notasVenta, calcularEstadisticas]
  );

  // ==================== OPERACIONES COTIZACIONES ====================

  const crearCotizacion = useCallback(async (data: DocumentoFormData): Promise<Cotizacion> => {
    setLoading(true);
    setError(null);
    
    try {
      const nuevaCotizacion = await documentoRepository.crearCotizacion(data);
      await cargarDatos();
      return nuevaCotizacion;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al crear cotización';
      setError(mensaje);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cargarDatos]);

  const actualizarCotizacion = useCallback(async (
    id: string, 
    data: Partial<DocumentoFormData>
  ): Promise<Cotizacion> => {
    setLoading(true);
    setError(null);
    
    try {
      const cotizacionActualizada = await documentoRepository.actualizarCotizacion(id, data);
      await cargarDatos();
      return cotizacionActualizada;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al actualizar cotización';
      setError(mensaje);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cargarDatos]);

  const anularCotizacion = useCallback(async (id: string, motivo: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await documentoRepository.anularCotizacion(id, motivo);
      await cargarDatos();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al anular cotización';
      setError(mensaje);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cargarDatos]);

  const duplicarCotizacion = useCallback(async (id: string): Promise<Cotizacion> => {
    setLoading(true);
    setError(null);
    
    try {
      const cotizacionOriginal = await documentoRepository.obtenerCotizacion(id);
      
      // Crear copia con nuevos datos
      const datosNuevos: DocumentoFormData = {
        tipo: 'COTIZACION',
        fechaEmision: new Date().toISOString().split('T')[0],
        moneda: cotizacionOriginal.moneda,
        tipoCambio: cotizacionOriginal.tipoCambio,
        establecimientoId: cotizacionOriginal.establecimientoId,
        vendedorId: cotizacionOriginal.vendedorId,
        formaPago: cotizacionOriginal.formaPago,
        diasCredito: cotizacionOriginal.diasCredito,
        validoHasta: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        cliente: cotizacionOriginal.cliente,
        items: cotizacionOriginal.items.map(({ item, importe, ...resto }) => resto),
        descuentoGlobal: cotizacionOriginal.totales.descuentoGlobal,
        condicionesAtencion: cotizacionOriginal.condicionesAtencion,
        observaciones: `Duplicado de ${cotizacionOriginal.serieNumero}`,
        bancos: cotizacionOriginal.bancos
      };
      
      const nuevaCotizacion = await documentoRepository.crearCotizacion(datosNuevos);
      await cargarDatos();
      return nuevaCotizacion;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al duplicar cotización';
      setError(mensaje);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cargarDatos]);

  const cambiarEstadoCotizacion = useCallback(async (
    id: string, 
    estado: EstadoDocumento
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const cotizacion = await documentoRepository.obtenerCotizacion(id);
      await documentoRepository.actualizarCotizacion(id, {
        ...cotizacion,
        estado
      } as any);
      await cargarDatos();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al cambiar estado';
      setError(mensaje);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cargarDatos]);

  // ==================== OPERACIONES NOTAS DE VENTA ====================

  const crearNotaVenta = useCallback(async (data: DocumentoFormData): Promise<NotaVenta> => {
    setLoading(true);
    setError(null);
    
    try {
      const nuevaNotaVenta = await documentoRepository.crearNotaVenta(data);
      await cargarDatos();
      return nuevaNotaVenta;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al crear nota de venta';
      setError(mensaje);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cargarDatos]);

  const actualizarNotaVenta = useCallback(async (
    id: string, 
    data: Partial<DocumentoFormData>
  ): Promise<NotaVenta> => {
    setLoading(true);
    setError(null);
    
    try {
      const notaVentaActualizada = await documentoRepository.actualizarNotaVenta(id, data);
      await cargarDatos();
      return notaVentaActualizada;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al actualizar nota de venta';
      setError(mensaje);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cargarDatos]);

  const anularNotaVenta = useCallback(async (id: string, motivo: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await documentoRepository.anularNotaVenta(id, motivo);
      await cargarDatos();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al anular nota de venta';
      setError(mensaje);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cargarDatos]);

  const duplicarNotaVenta = useCallback(async (id: string): Promise<NotaVenta> => {
    setLoading(true);
    setError(null);
    
    try {
      const notaOriginal = await documentoRepository.obtenerNotaVenta(id);
      
      // Crear copia con nuevos datos
      const datosNuevos: DocumentoFormData = {
        tipo: 'NOTA_VENTA',
        fechaEmision: new Date().toISOString().split('T')[0],
        moneda: notaOriginal.moneda,
        tipoCambio: notaOriginal.tipoCambio,
        establecimientoId: notaOriginal.establecimientoId,
        vendedorId: notaOriginal.vendedorId,
        formaPago: notaOriginal.formaPago,
        diasCredito: notaOriginal.diasCredito,
        cliente: notaOriginal.cliente,
        items: notaOriginal.items.map(({ item, importe, ...resto }) => resto),
        descuentoGlobal: notaOriginal.totales.descuentoGlobal,
        condicionesAtencion: notaOriginal.condicionesAtencion,
        observaciones: `Duplicado de ${notaOriginal.serieNumero}`,
        bancos: notaOriginal.bancos
      };
      
      const nuevaNotaVenta = await documentoRepository.crearNotaVenta(datosNuevos);
      await cargarDatos();
      return nuevaNotaVenta;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al duplicar nota de venta';
      setError(mensaje);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cargarDatos]);

  const cambiarEstadoNotaVenta = useCallback(async (
    id: string, 
    estado: EstadoDocumento
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const notaVenta = await documentoRepository.obtenerNotaVenta(id);
      await documentoRepository.actualizarNotaVenta(id, {
        ...notaVenta,
        estado
      } as any);
      await cargarDatos();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al cambiar estado';
      setError(mensaje);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cargarDatos]);

  // ==================== CONVERSIONES ====================

  const convertirCotizacionANotaVenta = useCallback(async (cotizacionId: string): Promise<NotaVenta> => {
    setLoading(true);
    setError(null);
    
    try {
      const notaVenta = await documentoRepository.convertirCotizacionANotaVenta(cotizacionId);
      await cargarDatos();
      return notaVenta;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al convertir a nota de venta';
      setError(mensaje);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cargarDatos]);

  const convertirCotizacionAComprobante = useCallback(async (cotizacionId: string): Promise<any> => {
    setLoading(true);
    setError(null);
    
    try {
      const comprobante = await documentoRepository.convertirCotizacionAComprobante(cotizacionId);
      await cargarDatos();
      return comprobante;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al convertir a comprobante';
      setError(mensaje);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cargarDatos]);

  const convertirNotaVentaAComprobante = useCallback(async (notaVentaId: string): Promise<any> => {
    setLoading(true);
    setError(null);
    
    try {
      const comprobante = await documentoRepository.convertirNotaVentaAComprobante(notaVentaId);
      await cargarDatos();
      return comprobante;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al convertir a comprobante';
      setError(mensaje);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cargarDatos]);

  // ==================== UTILIDADES ====================

  const limpiarFiltros = useCallback(() => {
    setFiltros({});
  }, []);

  const exportarDocumentos = useCallback(async (
    tipo: TipoDocumento, 
    formato: 'excel' | 'pdf'
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      // Simular exportación
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // En producción aquí iría la lógica real de exportación
      console.log(`Exportando ${tipo} en formato ${formato}`);
      
      // Simular descarga
      const blob = new Blob(['Datos exportados'], { type: formato === 'excel' ? 'application/vnd.ms-excel' : 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tipo}_${new Date().toISOString().split('T')[0]}.${formato}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al exportar';
      setError(mensaje);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const validarDocumento = useCallback((data: DocumentoFormData) => {
    return validationService.validarDocumento(data);
  }, [validationService]);

  const actualizarVisibilidad = useCallback((config: Partial<UIVisibilityConfig>) => {
    setUiVisibility(prev => ({ ...prev, ...config }));
  }, []);

  const obtenerVisibilidad = useCallback(() => {
    return uiVisibility;
  }, [uiVisibility]);

  // ==================== RETORNO ====================

  return {
    // Estado
    cotizaciones,
    notasVenta,
    loading,
    error,
    
    // Filtros
    filtros,
    setFiltros,
    limpiarFiltros,
    
    // Estadísticas
    estadisticasCotizaciones,
    estadisticasNotasVenta,
    
    // Operaciones CRUD - Cotizaciones
    crearCotizacion,
    actualizarCotizacion,
    anularCotizacion,
    duplicarCotizacion,
    cambiarEstadoCotizacion,
    
    // Operaciones CRUD - Notas de Venta
    crearNotaVenta,
    actualizarNotaVenta,
    anularNotaVenta,
    duplicarNotaVenta,
    cambiarEstadoNotaVenta,
    
    // Conversiones
    convertirCotizacionANotaVenta,
    convertirCotizacionAComprobante,
    convertirNotaVentaAComprobante,
    
    // Utilidades
    recargarDatos: cargarDatos,
    exportarDocumentos,
    validarDocumento,
    
    // Configuración UI
    actualizarVisibilidad,
    obtenerVisibilidad
  };
}