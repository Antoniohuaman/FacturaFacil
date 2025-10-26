// app/web/src/features/documentos-comerciales/services/DocumentoConversionService.ts

import type { 
  Cotizacion, 
  NotaVenta, 
  IDocumentoConversionService,
  EstadoDocumento
} from '../models/types';
import { DocumentoGeneratorService } from './DocumentoGeneratorService';

/**
 * Servicio de conversión entre documentos
 * Open/Closed: Abierto para extensión (nuevas conversiones), cerrado para modificación
 */
export class DocumentoConversionService implements IDocumentoConversionService {
  private generatorService: DocumentoGeneratorService;
  
  constructor(generatorService: DocumentoGeneratorService) {
    this.generatorService = generatorService;
  }

  /**
   * Convierte Cotización a Nota de Venta
   */
  cotizacionANotaVenta(cotizacion: Cotizacion): NotaVenta {
    if (cotizacion.estado !== 'APROBADO') {
      throw new Error('Solo se pueden convertir cotizaciones aprobadas');
    }

    // Crear nota de venta base sin campos de cotización
    const { validoHasta, convertidoANotaVenta, convertidoAComprobante, ...baseData } = cotizacion as any;

    const notaVenta: NotaVenta = {
      ...baseData,
      id: this.generatorService.generarId(),
      tipo: 'NOTA_VENTA',
      serieNumero: this.generatorService.generarNumeroNotaVenta(),
      fechaEmision: new Date().toISOString().split('T')[0],
      estado: 'EMITIDO' as EstadoDocumento,
      
      // Agregar referencias
      referencias: {
        referenciaOrigen: {
          tipo: 'COTIZACION',
          id: cotizacion.id,
          numero: cotizacion.serieNumero
        },
        canal: cotizacion.referencias?.canal,
        listaPreciosId: cotizacion.referencias?.listaPreciosId
      },
      
      // Metadatos
      creadoPor: 'usuario_actual', // En producción vendría del contexto
      creadoEn: new Date().toISOString()
    };

    return notaVenta;
  }

  /**
   * Convierte Cotización directamente a Comprobante
   */
  cotizacionAComprobante(cotizacion: Cotizacion): any {
    if (cotizacion.estado !== 'APROBADO') {
      throw new Error('Solo se pueden convertir cotizaciones aprobadas');
    }

    // Aquí iría la lógica para convertir a comprobante
    // Por ahora retornamos un objeto placeholder
    return {
      tipo: 'FACTURA',
      serie: 'F001',
      numero: '00001',
      referenciaOrigen: {
        tipo: 'COTIZACION',
        id: cotizacion.id,
        numero: cotizacion.serieNumero
      },
      // ... resto de campos del comprobante
    };
  }

  /**
   * Convierte Nota de Venta a Comprobante
   */
  notaVentaAComprobante(notaVenta: NotaVenta): any {
    if (notaVenta.estado !== 'APROBADO' && notaVenta.estado !== 'EMITIDO') {
      throw new Error('Solo se pueden convertir notas de venta aprobadas o emitidas');
    }

    // Aquí iría la lógica para convertir a comprobante
    return {
      tipo: 'FACTURA',
      serie: 'F001',
      numero: '00002',
      referenciaOrigen: {
        tipo: 'NOTA_VENTA',
        id: notaVenta.id,
        numero: notaVenta.serieNumero
      },
      // ... resto de campos del comprobante
    };
  }
}

// ============================================================