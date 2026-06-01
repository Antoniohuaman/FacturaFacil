import type { CartItem, PaymentTotals } from '../../comprobantes-electronicos/models/comprobante.types';
import type { CurrencyCode } from '@/shared/currency';

export type { CartItem, PaymentTotals };
export type Currency = CurrencyCode;

export type TipoDocumentoComercial = 'cotizacion' | 'nota_venta' | 'orden_venta';

export type EstadoCotizacion =
  | 'Borrador'
  | 'Generada'
  | 'Aprobada'
  | 'Rechazada'
  | 'Cerrada perdida'
  | 'Convertida'
  | 'Anulada'
  | 'Vencida';

export type EstadoNotaVenta = 'Borrador' | 'Generada' | 'Convertida' | 'Anulada';

export type EstadoOrdenVenta =
  | 'Borrador'
  | 'Generada'
  | 'Reservada'
  | 'Atendida parcial'
  | 'Atendida total'
  | 'Convertida'
  | 'Anulada'
  | 'Vencida';

export type EstadoDocumentoComercial = EstadoCotizacion | EstadoNotaVenta | EstadoOrdenVenta;

export type TipoDocumentoCliente = 'RUC' | 'DNI' | 'CE' | 'PAS' | 'OTRO';

export interface ClienteDocumentoComercial {
  clienteId?: string | number;
  nombre: string;
  numeroDocumento: string;
  tipoDocumento: TipoDocumentoCliente;
  direccion?: string;
  email?: string;
  priceProfileId?: string;
}

export interface TrazabilidadDocumentoComercial {
  documentoOrigenId?: string;
  documentoOrigenTipo?: TipoDocumentoComercial;
  documentoOrigenNumero?: string;
  documentoDestinoId?: string;
  documentoDestinoTipo?: TipoDocumentoComercial | 'comprobante';
  documentoDestinoNumero?: string;
}

export interface CamposOpcionalesDocumentoComercial {
  fechaVencimiento?: string;
  direccion?: string;
  correo?: string;
  direccionEnvio?: string;
  ordenCompra?: string;
  guiaRemision?: string;
  centroCosto?: string;
  metodoEnvio?: string;
  fechaEntrega?: string;
  condicionEntrega?: string;
  contactoNombre?: string;
  contactoCargo?: string;
  contactoTelefono?: string;
  contactoCorreo?: string;
  presupuesto?: string;
  requiereAprobacion?: boolean;
}

export interface DocumentoComercial {
  id: string;
  tipo: TipoDocumentoComercial;
  estado: EstadoDocumentoComercial;
  esBorrador: boolean;

  serie: string;
  correlativo?: string;
  numero?: string;

  fechaEmision: string;
  fechaCreacion: string;
  fechaActualizacion: string;

  cliente?: ClienteDocumentoComercial;
  vendedor?: string;
  vendedorId?: string;

  moneda: Currency;
  tipoCambio?: number;
  formaPago?: string;
  totales: PaymentTotals;

  items: CartItem[];
  modoItems: 'catalogo' | 'libre';

  observaciones?: string;
  notaInterna?: string;

  camposOpcionales?: CamposOpcionalesDocumentoComercial;
  trazabilidad?: TrazabilidadDocumentoComercial;

  establecimientoId?: string;

  motivoAnulacion?: string;
  fechaAnulacion?: string;
  usuarioAnulacion?: string;
}

export interface FiltrosDocumentosComerciales {
  tipo: TipoDocumentoComercial;
  busqueda?: string;
  estados?: EstadoDocumentoComercial[];
  fechaDesde?: string;
  fechaHasta?: string;
  moneda?: Currency;
}

export interface DatosFormularioDocumentoComercial {
  tipo: TipoDocumentoComercial;
  serie: string;
  fechaEmision: string;
  cliente?: ClienteDocumentoComercial;
  moneda: Currency;
  formaPago?: string;
  items: CartItem[];
  modoItems: 'catalogo' | 'libre';
  observaciones?: string;
  notaInterna?: string;
  camposOpcionales?: CamposOpcionalesDocumentoComercial;
  trazabilidad?: TrazabilidadDocumentoComercial;
}

export type ModoFormularioDocumentoComercial = 'nuevo' | 'editar' | 'duplicar';
