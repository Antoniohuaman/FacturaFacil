import type { CartItem, TipoComprobante, ClientData, PaymentTotals } from '../../models/comprobante.types';

export type ComprobanteField =
  | 'tipoComprobante'
  | 'serie'
  | 'cliente'
  | 'formaPago'
  | 'fechaEmision'
  | 'moneda'
  | 'productos';

export interface ComprobanteValidationError {
  field: ComprobanteField;
  message: string;
}

export interface ComprobanteValidationInput {
  tipoComprobante?: TipoComprobante | string | null;
  serieSeleccionada?: string | null;
  cliente?: ClientData | null;
  formaPago?: string | null;
  fechaEmision?: string | null;
  moneda?: { code?: string } | string | null;
  cartItems: CartItem[];
  totals?: PaymentTotals | null;
}

export interface ComprobanteValidationResult {
  isValid: boolean;
  errors: ComprobanteValidationError[];
}

export const validateComprobanteNormativa = (
  input: ComprobanteValidationInput
): ComprobanteValidationResult => {
  const errors: ComprobanteValidationError[] = [];

  const tipo = (input.tipoComprobante || '').toString().trim().toLowerCase();

  if (!tipo || (tipo !== 'factura' && tipo !== 'boleta')) {
    errors.push({
      field: 'tipoComprobante',
      message: 'Debe seleccionar un tipo de comprobante (Factura o Boleta).',
    });
  }

  if (!input.serieSeleccionada || input.serieSeleccionada.trim() === '') {
    errors.push({
      field: 'serie',
      message: 'Debe seleccionar una serie para el comprobante.',
    });
  }

  if (!input.cliente) {
    errors.push({
      field: 'cliente',
      message: 'Debe seleccionar un cliente antes de continuar.',
    });
  }

  if (!input.formaPago || input.formaPago.trim() === '') {
    errors.push({
      field: 'formaPago',
      message: 'Debe seleccionar una forma de pago.',
    });
  }

  if (!input.fechaEmision || input.fechaEmision.trim() === '') {
    errors.push({
      field: 'fechaEmision',
      message: 'Debe ingresar una fecha de emisión.',
    });
  }

  const monedaCodigo = typeof input.moneda === 'string' ? input.moneda : input.moneda?.code ?? '';

  if (!monedaCodigo || monedaCodigo.toString().trim() === '') {
    errors.push({
      field: 'moneda',
      message: 'Debe seleccionar una moneda.',
    });
  }

  if (!input.cartItems || input.cartItems.length === 0) {
    errors.push({
      field: 'productos',
      message: 'Debe agregar al menos un producto al comprobante.',
    });
  } else {
    const invalidItems = input.cartItems.filter(
      (item) => !item.quantity || item.quantity <= 0 || !item.price || item.price <= 0
    );

    if (invalidItems.length > 0) {
      errors.push({
        field: 'productos',
        message:
          'Todos los productos deben tener cantidad mayor a 0 y precio unitario mayor a 0.',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
