import type {
  CartItem,
  ContextoOrigenNotaCredito,
  TipoComprobante,
  ClientData,
  PaymentTotals,
  PaymentCollectionMode,
  DatosNotaCredito,
} from '../../models/comprobante.types';
import { esCodigoNotaCreditoValido, obtenerDescriptorCodigoNC } from '../../models/constants';

export type ComprobanteField =
  | 'tipoComprobante'
  | 'serie'
  | 'cliente'
  | 'formaPago'
  | 'fechaEmision'
  | 'moneda'
  | 'productos'
  | 'codigoNotaCredito'
  | 'motivoNotaCredito'
  | 'documentoRelacionado';

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
  notaCredito?: DatosNotaCredito | null;
  cartItems: CartItem[];
  totals?: PaymentTotals | null;
  paymentMode?: PaymentCollectionMode;
  /**
   * Contexto del documento origen para validaciones normativas de NC.
   * Solo se pasa cuando el tipo es 'nota_credito'.
   */
  contextoOrigenNC?: ContextoOrigenNotaCredito | null;
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

  if (!tipo || (tipo !== 'factura' && tipo !== 'boleta' && tipo !== 'nota_credito')) {
    errors.push({
      field: 'tipoComprobante',
      message: 'Debe seleccionar un tipo de comprobante válido.',
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
    if (tipo !== 'nota_credito') {
      errors.push({
        field: 'formaPago',
        message: 'Debe seleccionar una forma de pago.',
      });
    }
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

  if (tipo === 'nota_credito') {
    const codigo = input.notaCredito?.codigo?.trim() ?? '';
    const motivo = input.notaCredito?.motivo?.trim() ?? '';
    const documentoRelacionado = input.notaCredito?.documentoRelacionado;
    const contexto = input.contextoOrigenNC ?? null;

    // — Código: requerido y debe pertenecer al catálogo 01–13
    if (!codigo) {
      errors.push({
        field: 'codigoNotaCredito',
        message: 'Debe seleccionar el código de Nota de Crédito.',
      });
    } else if (!esCodigoNotaCreditoValido(codigo)) {
      errors.push({
        field: 'codigoNotaCredito',
        message: 'El código de Nota de Crédito no es válido según el catálogo SUNAT (01–13).',
      });
    }

    // — Motivo: requerido
    if (!motivo) {
      errors.push({
        field: 'motivoNotaCredito',
        message: 'Debe ingresar el motivo de emisión de la Nota de Crédito.',
      });
    }

    // — Documento relacionado: requerido con todos sus campos clave
    if (
      !documentoRelacionado
      || !documentoRelacionado.tipoComprobanteOrigen
      || !documentoRelacionado.tipoDocumentoCodigoOrigen
      || !documentoRelacionado.serie
      || !documentoRelacionado.numero
    ) {
      errors.push({
        field: 'documentoRelacionado',
        message: 'La Nota de Crédito debe estar vinculada a una factura o boleta origen.',
      });
    }

    // — Código 13: solo para Facturas al crédito
    if (codigo === '13') {
      const tipoOrigenCode =
        contexto?.tipoDocumentoCodigoOrigen ??
        documentoRelacionado?.tipoDocumentoCodigoOrigen ??
        null;

      if (tipoOrigenCode !== '01') {
        errors.push({
          field: 'codigoNotaCredito',
          message:
            'El código 13 solo aplica a Notas de Crédito sobre Facturas. No es aplicable a Boletas.',
        });
      } else if (contexto !== null && !contexto.tieneCredito) {
        errors.push({
          field: 'codigoNotaCredito',
          message:
            'El código 13 solo aplica cuando la Factura fue emitida al crédito (con términos de pago o fecha de vencimiento).',
        });
      }
    }

    // — Restricciones adicionales por descriptor de código
    if (codigo && esCodigoNotaCreditoValido(codigo)) {
      const descriptor = obtenerDescriptorCodigoNC(codigo);
      if (descriptor?.soloFactura) {
        const tipoOrigenCode =
          contexto?.tipoDocumentoCodigoOrigen ??
          documentoRelacionado?.tipoDocumentoCodigoOrigen ??
          null;
        // Solo emitir error si el origen es Boleta (código '03') de forma confirmada
        if (tipoOrigenCode === '03') {
          errors.push({
            field: 'codigoNotaCredito',
            message: `El código ${codigo} solo aplica a Notas de Crédito sobre Facturas, no sobre Boletas.`,
          });
        }
      }
    }

    // — Validaciones con contexto del documento origen
    if (contexto !== null) {
      // Fecha NC >= fecha del documento origen (comparación ISO YYYY-MM-DD)
      const fechaNCStr = (input.fechaEmision ?? '').substring(0, 10);
      const fechaOrigenStr = (contexto.fechaEmisionOrigen ?? '').substring(0, 10);
      if (fechaNCStr && fechaOrigenStr && fechaNCStr < fechaOrigenStr) {
        errors.push({
          field: 'fechaEmision',
          message: `La fecha de la Nota de Crédito (${fechaNCStr}) no puede ser anterior a la fecha del comprobante que modifica (${fechaOrigenStr}).`,
        });
      }

      // Moneda NC debe coincidir con la moneda del documento origen
      const monedaNCCode =
        typeof input.moneda === 'string'
          ? input.moneda
          : (input.moneda?.code ?? '');
      if (monedaNCCode && contexto.monedaOrigen && monedaNCCode !== contexto.monedaOrigen) {
        errors.push({
          field: 'moneda',
          message: `La moneda de la Nota de Crédito (${monedaNCCode}) debe coincidir con la del comprobante que modifica (${contexto.monedaOrigen}).`,
        });
      }

      // Total NC no puede exceder el total del documento origen
      const totalNC = input.totals?.total ?? 0;
      const TOLERANCIA_FLOTANTE = 0.01;
      if (
        contexto.totalOrigen != null &&
        contexto.totalOrigen > 0 &&
        totalNC > contexto.totalOrigen + TOLERANCIA_FLOTANTE
      ) {
        errors.push({
          field: 'productos',
          message: `El total de la Nota de Crédito (${totalNC.toFixed(2)}) no puede exceder el total del comprobante que modifica (${contexto.totalOrigen.toFixed(2)}).`,
        });
      }
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

  if (tipo === 'nota_credito' && options?.paymentMode) {
    errors.push({
      field: 'formaPago',
      message: 'La Nota de Crédito no se procesa mediante cobranza.',
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
