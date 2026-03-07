import type { CartItem, TipoComprobante, ClientData, PaymentTotals, PaymentCollectionMode } from '../../models/comprobante.types';

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
  paymentMode?: PaymentCollectionMode;
}

export interface ComprobanteValidationResult {
  isValid: boolean;
  errors: ComprobanteValidationError[];
}

const BOLETA_CLIENTE_GENERAL_THRESHOLD = 700;

export const isClienteGeneral = (cliente?: ClientData | null): boolean => {
  if (!cliente) return false;
  const tipo = (cliente.tipoDocumentoCodigo ?? cliente.tipoDocumento ?? '').toString().trim().toUpperCase();
  const normalizedTipo = tipo === '1' ? 'DNI' : tipo;
  const numero = (cliente.documento ?? '').toString().trim();

  return normalizedTipo === 'DNI' && numero === '00000000';
};

export const resolveBoletaClienteRequirement = (input: ComprobanteValidationInput) => {
  const tipo = (input.tipoComprobante || '').toString().trim().toLowerCase();
  const total = Number(input.totals?.total ?? 0);
  const isBoleta = tipo === 'boleta';

  return {
    allowsMissingClient: isBoleta && total < BOLETA_CLIENTE_GENERAL_THRESHOLD,
    requiresRealClient: isBoleta && total >= BOLETA_CLIENTE_GENERAL_THRESHOLD,
  };
};

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

  const boletaRequirement = resolveBoletaClienteRequirement(input);

  if (!input.cliente) {
    if (!boletaRequirement.allowsMissingClient) {
      errors.push({
        field: 'cliente',
        message: 'Debe seleccionar un cliente antes de continuar.',
      });
    }
  } else if (boletaRequirement.requiresRealClient && isClienteGeneral(input.cliente)) {
    errors.push({
      field: 'cliente',
      message: 'Para boletas de S/ 700 o más debe seleccionar un cliente con documento válido.',
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

interface ReadyForCobranzaOptions {
  onError?: (error: ComprobanteValidationError) => void;
  paymentMode?: PaymentCollectionMode;
}

export const validateComprobanteReadyForCobranza = (
  input: ComprobanteValidationInput,
  options?: ReadyForCobranzaOptions,
): ComprobanteValidationResult => {
  const baseResult = validateComprobanteNormativa(input);
  const errors = [...baseResult.errors];
  const tipo = (input.tipoComprobante || '').toString().trim().toLowerCase();

  if (tipo === 'boleta' && options?.paymentMode === 'credito') {
    errors.push({
      field: 'formaPago',
      message: 'Las boletas solo se pueden emitir al contado.',
    });
  }

  if (errors.length > 0 && options?.onError) {
    errors.forEach(options.onError);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
