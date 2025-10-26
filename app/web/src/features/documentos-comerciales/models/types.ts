// app/web/src/features/documentos-comerciales/models/types.ts

// ==================== ENUMS Y TIPOS BASE ====================

export type TipoDocumentoIdentidad = 'RUC' | 'DNI' | 'CE' | 'PASAPORTE';
export type TipoMoneda = 'PEN' | 'USD' | 'EUR';
export type FormaPago = 'CONTADO' | 'CREDITO';
export type TipoImpuesto = 'IGV' | 'EXONERADO' | 'INAFECTO';
export type EstadoDocumento = 'BORRADOR' | 'EMITIDO' | 'APROBADO' | 'RECHAZADO' | 'ANULADO' | 'CONVERTIDO';
export type TipoProducto = 'BIEN' | 'SERVICIO';
export type TipoDescuento = 'PORCENTAJE' | 'MONTO';
export type TipoDocumento = 'COTIZACION' | 'NOTA_VENTA';
export type CanalOrigen = 'MOSTRADOR' | 'WEB' | 'TELEFONO' | 'WHATSAPP';

// ==================== INTERFACES DE DOMINIO ====================

/**
 * Cliente del documento
 */
export interface DocumentoCliente {
  tipoDocumento: TipoDocumentoIdentidad;
  numeroDocumento: string;
  razonSocial: string;
  direccion: string;
  correo?: string;
  telefono?: string;
}

/**
 * Item/Línea del documento
 */
export interface DocumentoItem {
  // Campos principales (siempre visibles)
  item: number; // Número de línea
  cantidad: number;
  unidad: string;
  descripcion: string;
  impuesto: TipoImpuesto;
  precioUnitario: number;
  importe: number; // Calculado automáticamente
  
  // Descuento por item
  descuentoItem?: {
    tipo: TipoDescuento;
    valor: number; // Si es PORCENTAJE (0-100), si es MONTO (valor absoluto)
    monto: number; // Monto final del descuento calculado
  };
  
  // Campos opcionales (toggleables)
  codigo?: string;
  codigoBarras?: string;
  codigoFabrica?: string;
  codigoSunat?: string;
  marca?: string;
  modelo?: string;
  alias?: string;
  imagenUrl?: string;
  
  // Metadatos del producto
  productoId?: string;
  tipoProducto?: TipoProducto;
  categoriaId?: string;
}

/**
 * Totales e impuestos del documento
 */
export interface DocumentoTotales {
  // Descuento global
  descuentoGlobal?: {
    tipo: TipoDescuento;
    valor: number;
    monto: number; // Monto calculado
  };
  
  // Operaciones (calculadas)
  opGravada: number;
  opExonerada: number;
  opInafecta: number;
  
  // Impuestos
  igv: number;
  
  // Totales
  subtotal: number;
  totalDescuentos: number;
  total: number;
  
  // Texto
  montoEnLetras: string;
}

/**
 * Información bancaria
 */
export interface DocumentoBanco {
  banco: string;
  moneda: TipoMoneda;
  numeroCuenta: string;
  cci: string;
}

/**
 * Referencias para trazabilidad
 */
export interface DocumentoReferencias {
  referenciaOrigen?: {
    tipo: TipoDocumento;
    id: string;
    numero: string;
  };
  canal?: CanalOrigen;
  listaPreciosId?: string;
}

/**
 * Configuración de visibilidad UI
 */
export interface UIVisibilityConfig {
  // Encabezado
  establecimiento?: boolean;
  vendedor?: boolean;
  formaPago?: boolean;
  validoHasta?: boolean; // Solo cotización
  
  // Cliente
  correo?: boolean;
  telefono?: boolean;
  
  // Items - columnas opcionales
  codigo?: boolean;
  codigoBarras?: boolean;
  codigoFabrica?: boolean;
  codigoSunat?: boolean;
  marca?: boolean;
  modelo?: boolean;
  alias?: boolean;
  imagen?: boolean;
  descuentoItem?: boolean;
  
  // Totales
  descuentoGlobal?: boolean;
  
  // Secciones completas
  condiciones?: boolean;
  bancos?: boolean;
  referencias?: boolean;
}

// ==================== DOCUMENTO BASE (COMÚN) ====================

/**
 * Estructura base compartida entre Cotización y Nota de Venta
 * Siguiendo el principio DRY (Don't Repeat Yourself)
 */
export interface DocumentoBase {
  // Identificación
  id: string;
  tipo: TipoDocumento;
  
  // Encabezado
  serieNumero: string;
  fechaEmision: string;
  moneda: TipoMoneda;
  tipoCambio?: number; // Si moneda !== 'PEN'
  establecimientoId: string;
  establecimientoNombre?: string;
  vendedorId: string;
  vendedorNombre?: string;
  formaPago: FormaPago;
  diasCredito?: number; // Solo si formaPago === 'CREDITO'
  
  // Cliente
  cliente: DocumentoCliente;
  
  // Items
  items: DocumentoItem[];
  
  // Totales
  totales: DocumentoTotales;
  
  // Condiciones
  condicionesAtencion?: string;
  observaciones?: string;
  
  // Bancos
  bancos?: DocumentoBanco[];
  
  // Referencias
  referencias?: DocumentoReferencias;
  
  // Estado
  estado: EstadoDocumento;
  
  // Metadatos
  creadoPor: string;
  creadoEn: string;
  actualizadoPor?: string;
  actualizadoEn?: string;
  anuladoPor?: string;
  anuladoEn?: string;
  motivoAnulacion?: string;
  
  // Configuración UI
  uiVisibility?: UIVisibilityConfig;
}

// ==================== COTIZACIÓN ====================

export interface Cotizacion extends DocumentoBase {
  tipo: 'COTIZACION';
  validoHasta: string; // Campo exclusivo de cotización
  
  // Tracking de conversión
  convertidoANotaVenta?: {
    id: string;
    numero: string;
    fecha: string;
  };
  convertidoAComprobante?: {
    id: string;
    numero: string;
    fecha: string;
  };
}

// ==================== NOTA DE VENTA ====================

export interface NotaVenta extends DocumentoBase {
  tipo: 'NOTA_VENTA';
  
  // Tracking de conversión
  convertidoAComprobante?: {
    id: string;
    numero: string;
    fecha: string;
  };
}

// ==================== DTOs PARA FORMULARIOS ====================

export interface DocumentoFormData {
  tipo: TipoDocumento;
  
  // Encabezado
  fechaEmision: string;
  moneda: TipoMoneda;
  tipoCambio?: number;
  establecimientoId: string;
  vendedorId: string;
  formaPago: FormaPago;
  diasCredito?: number;
  validoHasta?: string; // Solo cotización
  
  // Cliente
  cliente: DocumentoCliente;
  
  // Items (sin item ni importe, se calculan)
  items: Omit<DocumentoItem, 'item' | 'importe'>[];
  
  // Totales (se calculan automáticamente)
  descuentoGlobal?: {
    tipo: TipoDescuento;
    valor: number;
    monto: number;
  };
  
  // Condiciones
  condicionesAtencion?: string;
  observaciones?: string;
  
  // Bancos
  bancos?: DocumentoBanco[];
  
  // Referencias (para conversiones)
  referenciaOrigen?: {
    tipo: TipoDocumento;
    id: string;
  };
  canal?: CanalOrigen;
  listaPreciosId?: string;
}

// ==================== FILTROS Y BÚSQUEDA ====================

export interface FiltrosDocumentos {
  tipo?: TipoDocumento;
  busqueda?: string;
  estado?: EstadoDocumento | 'TODOS';
  fechaInicio?: string;
  fechaFin?: string;
  clienteId?: string;
  vendedorId?: string;
  moneda?: TipoMoneda;
  establecimientoId?: string;
}

// ==================== ESTADÍSTICAS ====================

export interface EstadisticasDocumento {
  total: number;
  borradores: number;
  emitidos: number;
  aprobados: number;
  convertidos: number;
  anulados: number;
  
  montoTotal: number;
  montoAprobado: number;
  montoConvertido: number;
  
  tasaConversion: number;
  promedioMonto: number;
}

// ==================== CONFIGURACIÓN DEL SISTEMA ====================

export interface ConfiguracionDocumentos {
  // Prefijos y series
  cotizacion: {
    prefijo: string;
    serie: string;
    siguienteNumero: number;
    diasValidezDefecto: number;
  };
  notaVenta: {
    prefijo: string;
    serie: string;
    siguienteNumero: number;
  };
  
  // Impuestos
  igvPorcentaje: number;
  
  // Moneda
  monedaDefecto: TipoMoneda;
  tipoCambioDefecto: number;
  
  // UI
  mostrarPreciosConIGV: boolean;
  permitirEditarImpuestos: boolean;
  permitirDescuentosItem: boolean;
  permitirDescuentoGlobal: boolean;
  
  // Visibilidad por defecto
  uiVisibilityDefecto: UIVisibilityConfig;
}

// ==================== HELPERS Y UTILS ====================

/**
 * Interface para el servicio de conversión de documentos
 */
export interface IDocumentoConversionService {
  cotizacionANotaVenta(cotizacion: Cotizacion): NotaVenta;
  cotizacionAComprobante(cotizacion: Cotizacion): any; // Comprobante type
  notaVentaAComprobante(notaVenta: NotaVenta): any; // Comprobante type
}

/**
 * Interface para el servicio de cálculo
 */
export interface IDocumentoCalculoService {
  calcularTotales(items: DocumentoItem[], descuentoGlobal?: DocumentoTotales['descuentoGlobal'], igvPorcentaje?: number): DocumentoTotales;
  calcularImporteItem(item: Partial<DocumentoItem>, conIGV: boolean): number;
  numeroALetras(numero: number, moneda: TipoMoneda): string;
}

/**
 * Interface para el repositorio (principio de inversión de dependencias)
 */
export interface IDocumentoRepository {
  // Cotizaciones
  obtenerCotizaciones(filtros?: FiltrosDocumentos): Promise<Cotizacion[]>;
  obtenerCotizacion(id: string): Promise<Cotizacion>;
  crearCotizacion(data: DocumentoFormData): Promise<Cotizacion>;
  actualizarCotizacion(id: string, data: Partial<DocumentoFormData>): Promise<Cotizacion>;
  anularCotizacion(id: string, motivo: string): Promise<void>;
  
  // Notas de Venta
  obtenerNotasVenta(filtros?: FiltrosDocumentos): Promise<NotaVenta[]>;
  obtenerNotaVenta(id: string): Promise<NotaVenta>;
  crearNotaVenta(data: DocumentoFormData): Promise<NotaVenta>;
  actualizarNotaVenta(id: string, data: Partial<DocumentoFormData>): Promise<NotaVenta>;
  anularNotaVenta(id: string, motivo: string): Promise<void>;
  
  // Conversiones
  convertirCotizacionANotaVenta(cotizacionId: string): Promise<NotaVenta>;
  convertirCotizacionAComprobante(cotizacionId: string): Promise<any>;
  convertirNotaVentaAComprobante(notaVentaId: string): Promise<any>;
}

// ==================== VALIDACIONES ====================

export interface TipoDocumentoValidation {
  longitud: number | number[];
  pattern: RegExp;
}

export interface DocumentoValidationRules {
  cliente: {
    tipoDocumento: {
      RUC: TipoDocumentoValidation;
      DNI: TipoDocumentoValidation;
      CE: TipoDocumentoValidation;
    };
  };
  items: {
    cantidadMinima: number;
    precioMinimo: number;
    descuentoMaximoPorcentaje: number;
  };
  documento: {
    diasCreditoMaximo: number;
    diasValidezMaximo: number;
  };
}

export const documentoValidationRules: DocumentoValidationRules = {
  cliente: {
    tipoDocumento: {
      RUC: { longitud: 11, pattern: /^[12]\d{10}$/ },
      DNI: { longitud: 8, pattern: /^\d{8}$/ },
      CE: { longitud: [9, 12], pattern: /^[A-Z0-9]+$/ }
    }
  },
  items: {
    cantidadMinima: 1,
    precioMinimo: 0.01,
    descuentoMaximoPorcentaje: 100
  },
  documento: {
    diasCreditoMaximo: 365,
    diasValidezMaximo: 90
  }
};