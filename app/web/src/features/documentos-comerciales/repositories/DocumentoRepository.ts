// app/web/src/features/documentos-comerciales/repositories/DocumentoRepository.ts

import type { 
  IDocumentoRepository,
  Cotizacion,
  NotaVenta,
  DocumentoFormData,
  FiltrosDocumentos,
  DocumentoCliente,
  DocumentoItem,
  DocumentoBase
} from '../models/types';
import { 
  DocumentoGeneratorService,
  DocumentoCalculoService,
  DocumentoConversionService,
  DocumentoValidationService
} from '../services';

/**
 * Repositorio de documentos (implementación con datos mock)
 * Dependency Inversion: Implementa la interfaz IDocumentoRepository
 */
export class DocumentoRepository implements IDocumentoRepository {
  private cotizaciones: Map<string, Cotizacion> = new Map();
  private notasVenta: Map<string, NotaVenta> = new Map();
  
  private generatorService = new DocumentoGeneratorService();
  private calculoService = new DocumentoCalculoService();
  private conversionService = new DocumentoConversionService(this.generatorService);
  private validationService = new DocumentoValidationService();

  constructor() {
    this.inicializarDatosMock();
  }

  // ==================== COTIZACIONES ====================

  async obtenerCotizaciones(filtros?: FiltrosDocumentos): Promise<Cotizacion[]> {
    await this.simularLatencia();
    
    let resultado = Array.from(this.cotizaciones.values());
    
    if (filtros) {
      resultado = this.aplicarFiltros(resultado, filtros) as Cotizacion[];
    }
    
    return resultado.sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision));
  }

  async obtenerCotizacion(id: string): Promise<Cotizacion> {
    await this.simularLatencia();
    
    const cotizacion = this.cotizaciones.get(id);
    if (!cotizacion) {
      throw new Error(`Cotización ${id} no encontrada`);
    }
    
    return cotizacion;
  }

  async crearCotizacion(data: DocumentoFormData): Promise<Cotizacion> {
    await this.simularLatencia();
    
    // Validar datos
    const validacion = this.validationService.validarDocumento(data);
    if (!validacion.valido) {
      throw new Error(`Errores de validación: ${validacion.errores.join(', ')}`);
    }

    // Crear cotización
    const cotizacion: Cotizacion = {
      id: this.generatorService.generarId(),
      tipo: 'COTIZACION',
      serieNumero: this.generatorService.generarNumeroCotizacion(),
      fechaEmision: data.fechaEmision,
      validoHasta: data.validoHasta || this.calcularFechaVencimiento(data.fechaEmision, 15),
      moneda: data.moneda,
      tipoCambio: data.moneda !== 'PEN' ? data.tipoCambio : undefined,
      establecimientoId: data.establecimientoId,
      establecimientoNombre: 'Tienda Principal', // Mock
      vendedorId: data.vendedorId,
      vendedorNombre: 'Usuario Actual', // Mock
      formaPago: data.formaPago,
      diasCredito: data.diasCredito,
      cliente: data.cliente,
      items: this.procesarItems(data.items),
      totales: this.calculoService.calcularTotales(
        this.procesarItems(data.items),
        data.descuentoGlobal
      ),
      condicionesAtencion: data.condicionesAtencion,
      observaciones: data.observaciones,
      bancos: data.bancos,
      referencias: data.referenciaOrigen ? {
        referenciaOrigen: {
          ...data.referenciaOrigen,
          numero: '' // Se asignará cuando se tenga el número real
        },
        canal: data.canal,
        listaPreciosId: data.listaPreciosId
      } : undefined,
      estado: 'BORRADOR',
      creadoPor: 'usuario_actual',
      creadoEn: new Date().toISOString(),
      uiVisibility: this.generatorService.obtenerConfiguracion().uiVisibilityDefecto
    };

    this.cotizaciones.set(cotizacion.id, cotizacion);
    return cotizacion;
  }

  async actualizarCotizacion(id: string, data: Partial<DocumentoFormData>): Promise<Cotizacion> {
    await this.simularLatencia();
    
    const cotizacion = await this.obtenerCotizacion(id);
    
    if (cotizacion.estado !== 'BORRADOR' && cotizacion.estado !== 'EMITIDO') {
      throw new Error('Solo se pueden editar cotizaciones en estado borrador o emitido');
    }

    // Actualizar campos manteniendo el tipo correcto
    const itemsActualizados = data.items ? this.procesarItems(data.items) : cotizacion.items;
    const totalesActualizados = data.items ? this.calculoService.calcularTotales(
      itemsActualizados,
      data.descuentoGlobal || cotizacion.totales.descuentoGlobal
    ) : cotizacion.totales;

    const actualizada: Cotizacion = {
      ...cotizacion,
      fechaEmision: data.fechaEmision || cotizacion.fechaEmision,
      moneda: data.moneda || cotizacion.moneda,
      tipoCambio: data.tipoCambio !== undefined ? data.tipoCambio : cotizacion.tipoCambio,
      establecimientoId: data.establecimientoId || cotizacion.establecimientoId,
      vendedorId: data.vendedorId || cotizacion.vendedorId,
      formaPago: data.formaPago || cotizacion.formaPago,
      diasCredito: data.diasCredito !== undefined ? data.diasCredito : cotizacion.diasCredito,
      validoHasta: data.validoHasta || cotizacion.validoHasta,
      cliente: data.cliente || cotizacion.cliente,
      items: itemsActualizados,
      totales: totalesActualizados,
      condicionesAtencion: data.condicionesAtencion !== undefined ? data.condicionesAtencion : cotizacion.condicionesAtencion,
      observaciones: data.observaciones !== undefined ? data.observaciones : cotizacion.observaciones,
      bancos: data.bancos !== undefined ? data.bancos : cotizacion.bancos,
      actualizadoPor: 'usuario_actual',
      actualizadoEn: new Date().toISOString()
    };

    this.cotizaciones.set(id, actualizada);
    return actualizada;
  }

  async anularCotizacion(id: string, motivo: string): Promise<void> {
    await this.simularLatencia();
    
    const cotizacion = await this.obtenerCotizacion(id);
    
    if (cotizacion.estado === 'ANULADO') {
      throw new Error('La cotización ya está anulada');
    }
    
    if (cotizacion.estado === 'CONVERTIDO') {
      throw new Error('No se puede anular una cotización convertida');
    }

    cotizacion.estado = 'ANULADO';
    cotizacion.anuladoPor = 'usuario_actual';
    cotizacion.anuladoEn = new Date().toISOString();
    cotizacion.motivoAnulacion = motivo;
    
    this.cotizaciones.set(id, cotizacion);
  }

  // ==================== NOTAS DE VENTA ====================

  async obtenerNotasVenta(filtros?: FiltrosDocumentos): Promise<NotaVenta[]> {
    await this.simularLatencia();
    
    let resultado = Array.from(this.notasVenta.values());
    
    if (filtros) {
      resultado = this.aplicarFiltros(resultado, filtros) as NotaVenta[];
    }
    
    return resultado.sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision));
  }

  async obtenerNotaVenta(id: string): Promise<NotaVenta> {
    await this.simularLatencia();
    
    const notaVenta = this.notasVenta.get(id);
    if (!notaVenta) {
      throw new Error(`Nota de venta ${id} no encontrada`);
    }
    
    return notaVenta;
  }

  async crearNotaVenta(data: DocumentoFormData): Promise<NotaVenta> {
    await this.simularLatencia();
    
    // Validar datos
    const validacion = this.validationService.validarDocumento(data);
    if (!validacion.valido) {
      throw new Error(`Errores de validación: ${validacion.errores.join(', ')}`);
    }

    // Crear nota de venta
    const notaVenta: NotaVenta = {
      id: this.generatorService.generarId(),
      tipo: 'NOTA_VENTA',
      serieNumero: this.generatorService.generarNumeroNotaVenta(),
      fechaEmision: data.fechaEmision,
      moneda: data.moneda,
      tipoCambio: data.moneda !== 'PEN' ? data.tipoCambio : undefined,
      establecimientoId: data.establecimientoId,
      establecimientoNombre: 'Tienda Principal',
      vendedorId: data.vendedorId,
      vendedorNombre: 'Usuario Actual',
      formaPago: data.formaPago,
      diasCredito: data.diasCredito,
      cliente: data.cliente,
      items: this.procesarItems(data.items),
      totales: this.calculoService.calcularTotales(
        this.procesarItems(data.items),
        data.descuentoGlobal
      ),
      condicionesAtencion: data.condicionesAtencion,
      observaciones: data.observaciones,
      bancos: data.bancos,
      referencias: data.referenciaOrigen ? {
        referenciaOrigen: {
          ...data.referenciaOrigen,
          numero: '' // Se asignará cuando se tenga el número real
        },
        canal: data.canal,
        listaPreciosId: data.listaPreciosId
      } : undefined,
      estado: 'EMITIDO',
      creadoPor: 'usuario_actual',
      creadoEn: new Date().toISOString(),
      uiVisibility: this.generatorService.obtenerConfiguracion().uiVisibilityDefecto
    };

    this.notasVenta.set(notaVenta.id, notaVenta);
    return notaVenta;
  }

  async actualizarNotaVenta(id: string, data: Partial<DocumentoFormData>): Promise<NotaVenta> {
    await this.simularLatencia();
    
    const notaVenta = await this.obtenerNotaVenta(id);
    
    if (notaVenta.estado !== 'BORRADOR' && notaVenta.estado !== 'EMITIDO') {
      throw new Error('Solo se pueden editar notas de venta en estado borrador o emitido');
    }

    // Actualizar campos manteniendo el tipo correcto
    const itemsActualizados = data.items ? this.procesarItems(data.items) : notaVenta.items;
    const totalesActualizados = data.items ? this.calculoService.calcularTotales(
      itemsActualizados,
      data.descuentoGlobal || notaVenta.totales.descuentoGlobal
    ) : notaVenta.totales;

    const actualizada: NotaVenta = {
      ...notaVenta,
      fechaEmision: data.fechaEmision || notaVenta.fechaEmision,
      moneda: data.moneda || notaVenta.moneda,
      tipoCambio: data.tipoCambio !== undefined ? data.tipoCambio : notaVenta.tipoCambio,
      establecimientoId: data.establecimientoId || notaVenta.establecimientoId,
      vendedorId: data.vendedorId || notaVenta.vendedorId,
      formaPago: data.formaPago || notaVenta.formaPago,
      diasCredito: data.diasCredito !== undefined ? data.diasCredito : notaVenta.diasCredito,
      cliente: data.cliente || notaVenta.cliente,
      items: itemsActualizados,
      totales: totalesActualizados,
      condicionesAtencion: data.condicionesAtencion !== undefined ? data.condicionesAtencion : notaVenta.condicionesAtencion,
      observaciones: data.observaciones !== undefined ? data.observaciones : notaVenta.observaciones,
      bancos: data.bancos !== undefined ? data.bancos : notaVenta.bancos,
      actualizadoPor: 'usuario_actual',
      actualizadoEn: new Date().toISOString()
    };

    this.notasVenta.set(id, actualizada);
    return actualizada;
  }

  async anularNotaVenta(id: string, motivo: string): Promise<void> {
    await this.simularLatencia();
    
    const notaVenta = await this.obtenerNotaVenta(id);
    
    if (notaVenta.estado === 'ANULADO') {
      throw new Error('La nota de venta ya está anulada');
    }
    
    if (notaVenta.estado === 'CONVERTIDO') {
      throw new Error('No se puede anular una nota de venta convertida');
    }

    notaVenta.estado = 'ANULADO';
    notaVenta.anuladoPor = 'usuario_actual';
    notaVenta.anuladoEn = new Date().toISOString();
    notaVenta.motivoAnulacion = motivo;
    
    this.notasVenta.set(id, notaVenta);
  }

  // ==================== CONVERSIONES ====================

  async convertirCotizacionANotaVenta(cotizacionId: string): Promise<NotaVenta> {
    await this.simularLatencia();
    
    const cotizacion = await this.obtenerCotizacion(cotizacionId);
    const notaVenta = this.conversionService.cotizacionANotaVenta(cotizacion);
    
    // Actualizar estado de cotización
    cotizacion.estado = 'CONVERTIDO';
    cotizacion.convertidoANotaVenta = {
      id: notaVenta.id,
      numero: notaVenta.serieNumero,
      fecha: notaVenta.fechaEmision
    };
    
    this.cotizaciones.set(cotizacionId, cotizacion);
    this.notasVenta.set(notaVenta.id, notaVenta);
    
    return notaVenta;
  }

  async convertirCotizacionAComprobante(cotizacionId: string): Promise<any> {
    await this.simularLatencia();
    
    const cotizacion = await this.obtenerCotizacion(cotizacionId);
    const comprobante = this.conversionService.cotizacionAComprobante(cotizacion);
    
    // Actualizar estado
    cotizacion.estado = 'CONVERTIDO';
    cotizacion.convertidoAComprobante = {
      id: comprobante.id || 'COMP001',
      numero: `${comprobante.serie}-${comprobante.numero}`,
      fecha: new Date().toISOString().split('T')[0]
    };
    
    this.cotizaciones.set(cotizacionId, cotizacion);
    
    return comprobante;
  }

  async convertirNotaVentaAComprobante(notaVentaId: string): Promise<any> {
    await this.simularLatencia();
    
    const notaVenta = await this.obtenerNotaVenta(notaVentaId);
    const comprobante = this.conversionService.notaVentaAComprobante(notaVenta);
    
    // Actualizar estado
    notaVenta.estado = 'CONVERTIDO';
    notaVenta.convertidoAComprobante = {
      id: comprobante.id || 'COMP002',
      numero: `${comprobante.serie}-${comprobante.numero}`,
      fecha: new Date().toISOString().split('T')[0]
    };
    
    this.notasVenta.set(notaVentaId, notaVenta);
    
    return comprobante;
  }

  // ==================== MÉTODOS AUXILIARES ====================

  private aplicarFiltros(documentos: DocumentoBase[], filtros: FiltrosDocumentos): DocumentoBase[] {
    let resultado = [...documentos];

    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      resultado = resultado.filter(doc => 
        doc.serieNumero.toLowerCase().includes(busqueda) ||
        doc.cliente.razonSocial.toLowerCase().includes(busqueda) ||
        doc.cliente.numeroDocumento.includes(busqueda)
      );
    }

    if (filtros.estado && filtros.estado !== 'TODOS') {
      resultado = resultado.filter(doc => doc.estado === filtros.estado);
    }

    if (filtros.fechaInicio) {
      resultado = resultado.filter(doc => doc.fechaEmision >= filtros.fechaInicio!);
    }

    if (filtros.fechaFin) {
      resultado = resultado.filter(doc => doc.fechaEmision <= filtros.fechaFin!);
    }

    if (filtros.moneda) {
      resultado = resultado.filter(doc => doc.moneda === filtros.moneda);
    }

    if (filtros.vendedorId) {
      resultado = resultado.filter(doc => doc.vendedorId === filtros.vendedorId);
    }

    if (filtros.establecimientoId) {
      resultado = resultado.filter(doc => doc.establecimientoId === filtros.establecimientoId);
    }

    return resultado;
  }

  private procesarItems(items: any[]): DocumentoItem[] {
    return items.map((item, index) => ({
      ...item,
      item: index + 1,
      importe: this.calculoService.calcularImporteItem(item, false)
    }));
  }

  private calcularFechaVencimiento(fechaEmision: string, dias: number): string {
    const fecha = new Date(fechaEmision);
    fecha.setDate(fecha.getDate() + dias);
    return fecha.toISOString().split('T')[0];
  }

  private async simularLatencia(ms: number = 300): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== DATOS MOCK ====================

  private inicializarDatosMock(): void {
    // Clientes de ejemplo
    const clientes: DocumentoCliente[] = [
      {
        tipoDocumento: 'RUC',
        numeroDocumento: '20512345678',
        razonSocial: 'Empresa Constructora SAC',
        direccion: 'Av. Los Constructores 123, Lima',
        correo: 'contacto@constructora.pe',
        telefono: '01-2345678'
      },
      {
        tipoDocumento: 'RUC',
        numeroDocumento: '20498765432',
        razonSocial: 'Distribuidora Lima Norte EIRL',
        direccion: 'Jr. Comercio 456, Los Olivos',
        correo: 'ventas@distlima.pe',
        telefono: '01-3456789'
      },
      {
        tipoDocumento: 'DNI',
        numeroDocumento: '45678912',
        razonSocial: 'Juan Pérez Rodríguez',
        direccion: 'Calle Las Flores 789, Miraflores',
        correo: 'jperez@gmail.com',
        telefono: '987654321'
      }
    ];

    // Items de ejemplo
    const itemsEjemplo: Omit<DocumentoItem, 'item' | 'importe'>[] = [
      {
        cantidad: 5,
        unidad: 'UND',
        descripcion: 'Laptop HP ProBook 450 G8',
        impuesto: 'IGV',
        precioUnitario: 2800,
        codigo: 'LAP001',
        marca: 'HP',
        modelo: 'ProBook 450 G8'
      },
      {
        cantidad: 10,
        unidad: 'UND',
        descripcion: 'Mouse Logitech MX Master 3',
        impuesto: 'IGV',
        precioUnitario: 350,
        descuentoItem: {
          tipo: 'PORCENTAJE',
          valor: 10,
          monto: 350
        },
        codigo: 'MOU001',
        marca: 'Logitech',
        modelo: 'MX Master 3'
      }
    ];

    // Crear cotizaciones de ejemplo
    // NOTA: Los siguientes datos son MOCK para demostración inicial
    // Los documentos reales creados desde los formularios usarán el establishmentId dinámico del usuario
    const cotizacion1: Cotizacion = {
      id: 'COT001',
      tipo: 'COTIZACION',
      serieNumero: 'COT001-00000001',
      fechaEmision: '2025-01-15',
      validoHasta: '2025-01-30',
      moneda: 'PEN',
      establecimientoId: 'est-1', // Mock data - los nuevos documentos usan establishmentId real
      establecimientoNombre: 'Establecimiento Principal',
      vendedorId: 'VEN001',
      vendedorNombre: 'Carlos Mendoza',
      formaPago: 'CREDITO',
      diasCredito: 30,
      cliente: clientes[0],
      items: this.procesarItems(itemsEjemplo),
      totales: this.calculoService.calcularTotales(this.procesarItems(itemsEjemplo)),
      condicionesAtencion: 'Entrega en 5 días hábiles',
      observaciones: 'Cliente frecuente - aplicar descuento especial',
      estado: 'EMITIDO',
      creadoPor: 'admin',
      creadoEn: '2025-01-15T10:00:00Z'
    };

    const cotizacion2: Cotizacion = {
      id: 'COT002',
      tipo: 'COTIZACION',
      serieNumero: 'COT001-00000002',
      fechaEmision: '2025-01-14',
      validoHasta: '2025-01-29',
      moneda: 'USD',
      tipoCambio: 3.75,
      establecimientoId: 'est-1', // Mock data
      establecimientoNombre: 'Establecimiento Principal',
      vendedorId: 'VEN002',
      vendedorNombre: 'Ana García',
      formaPago: 'CONTADO',
      cliente: clientes[1],
      items: this.procesarItems([itemsEjemplo[0]]),
      totales: this.calculoService.calcularTotales(this.procesarItems([itemsEjemplo[0]])),
      estado: 'APROBADO',
      creadoPor: 'vendedor1',
      creadoEn: '2025-01-14T14:30:00Z'
    };

    // Crear nota de venta de ejemplo
    const notaVenta1: NotaVenta = {
      id: 'NV001',
      tipo: 'NOTA_VENTA',
      serieNumero: 'NV001-00000001',
      fechaEmision: '2025-01-15',
      moneda: 'PEN',
      establecimientoId: 'est-1', // Mock data
      establecimientoNombre: 'Establecimiento Principal',
      vendedorId: 'VEN001',
      vendedorNombre: 'Carlos Mendoza',
      formaPago: 'CREDITO',
      diasCredito: 30,
      cliente: clientes[0],
      items: this.procesarItems(itemsEjemplo),
      totales: this.calculoService.calcularTotales(this.procesarItems(itemsEjemplo)),
      referencias: {
        referenciaOrigen: {
          tipo: 'COTIZACION',
          id: 'COT002',
          numero: 'COT001-00000002'
        }
      },
      estado: 'EMITIDO',
      creadoPor: 'admin',
      creadoEn: '2025-01-15T11:00:00Z'
    };

    // Agregar a los maps
    this.cotizaciones.set(cotizacion1.id, cotizacion1);
    this.cotizaciones.set(cotizacion2.id, cotizacion2);
    this.notasVenta.set(notaVenta1.id, notaVenta1);
  }
}

// Singleton para mantener estado en la aplicación
export const documentoRepository = new DocumentoRepository();