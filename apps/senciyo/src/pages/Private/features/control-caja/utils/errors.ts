/**
 * Tipos de errores específicos para el módulo de Control de Caja
 */

export class CajaError extends Error {
  code?: string;
  
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'CajaError';
    this.code = code;
  }
}

export class NetworkError extends CajaError {
  constructor(message: string = 'Error de conexión. Verifica tu conexión a internet.') {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class ValidationError extends CajaError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class DescuadreError extends CajaError {
  descuadre: number;
  margen: number;
  
  constructor(descuadre: number, margen: number) {
    super(
      `El descuadre de S/ ${descuadre.toFixed(2)} excede el margen permitido de S/ ${margen.toFixed(2)}`,
      'DESCUADRE_EXCEDIDO'
    );
    this.name = 'DescuadreError';
    this.descuadre = descuadre;
    this.margen = margen;
  }
}

export class CajaCerradaError extends CajaError {
  constructor() {
    super('La caja está cerrada. Debe abrir la caja antes de continuar.', 'CAJA_CERRADA');
    this.name = 'CajaCerradaError';
  }
}

export class CajaAbiertaError extends CajaError {
  constructor() {
    super('Ya existe una caja abierta. Debe cerrarla antes de abrir una nueva.', 'CAJA_ABIERTA');
    this.name = 'CajaAbiertaError';
  }
}

/**
 * Maneja errores de forma centralizada y retorna un mensaje amigable
 */
export const handleCajaError = (error: unknown): string => {
  if (error instanceof DescuadreError) {
    return error.message;
  }
  
  if (error instanceof CajaCerradaError || error instanceof CajaAbiertaError) {
    return error.message;
  }
  
  if (error instanceof ValidationError) {
    return error.message;
  }
  
  if (error instanceof NetworkError) {
    return error.message;
  }
  
  if (error instanceof CajaError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Ha ocurrido un error inesperado. Por favor, intente nuevamente.';
};
