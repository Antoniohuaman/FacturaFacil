// Validation utilities for Caja (Cash Register) fields
// Pure functions following Single Responsibility Principle

import type { CreateCajaInput, UpdateCajaInput, Caja, MedioPago } from '../modelos/Caja';
import type { User } from '../modelos/User';
import { CAJA_CONSTRAINTS } from '../modelos/Caja';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validates caja name
 */
export function validateNombre(nombreCaja: string): ValidationError | null {
  if (!nombreCaja || nombreCaja.trim().length === 0) {
    return { field: 'nombreCaja', message: 'El nombre es requerido' };
  }

  if (nombreCaja.length > CAJA_CONSTRAINTS.maxLongitudNombreCaja) {
    return { 
      field: 'nombreCaja', 
      message: `El nombre no puede exceder ${CAJA_CONSTRAINTS.maxLongitudNombreCaja} caracteres` 
    };
  }

  return null;
}

/**
 * Validates nombre uniqueness within an Establecimiento
 */
export function validateNombreUniqueness(
  nombreCaja: string,
  existingCajas: Caja[],
  establecimientoIdCaja?: string,
  currentCajaId?: string
): ValidationError | null {
  const normalizedName = nombreCaja.trim().toLowerCase();
  if (!normalizedName) {
    return null;
  }

  const normalizedEstablecimientoId = establecimientoIdCaja?.trim();
  if (!normalizedEstablecimientoId) {
    return null;
  }

  const duplicate = existingCajas.some(
    (caja) =>
      caja.establecimientoIdCaja === normalizedEstablecimientoId &&
      caja.nombreCaja.trim().toLowerCase() === normalizedName &&
      caja.id !== currentCajaId
  );

  if (duplicate) {
    return {
      field: 'nombreCaja',
      message: 'Ya existe una caja con este nombre en el establecimiento'
    };
  }

  return null;
}

/**
 * Validates currency selection
 */
export function validateMoneda(monedaIdCaja: string): ValidationError | null {
  if (!monedaIdCaja || monedaIdCaja.trim().length === 0) {
    return { field: 'monedaIdCaja', message: 'Debe seleccionar una moneda' };
  }

  return null;
}

/**
 * Validates Establecimiento selection
 */
export function validateEstablecimiento(establecimientoIdCaja: string): ValidationError | null {
  if (!establecimientoIdCaja || establecimientoIdCaja.trim().length === 0) {
    return { field: 'establecimientoIdCaja', message: 'Debe seleccionar un establecimiento' };
  }

  return null;
}

/**
 * Validates payment methods
 */
export function validateMediosPago(
  mediosPago: MedioPago[], 
  habilitadaCaja: boolean
): ValidationError | null {
  if (habilitadaCaja && mediosPago.length === 0) {
    return { 
      field: 'mediosPagoPermitidos', 
      message: 'Debe seleccionar al menos un medio de pago si la caja está habilitada' 
    };
  }

  return null;
}

/**
 * Validates maximum limit
 */
export function validateLimiteMaximo(limite: number): ValidationError | null {
  if (limite < CAJA_CONSTRAINTS.LIMITE_MIN) {
    return { 
      field: 'limiteMaximoCaja', 
      message: `El límite máximo no puede ser menor a ${CAJA_CONSTRAINTS.LIMITE_MIN}` 
    };
  }

  if (isNaN(limite)) {
    return { field: 'limiteMaximoCaja', message: 'El límite máximo debe ser un número válido' };
  }

  return null;
}

/**
 * Validates discrepancy margin
 */
export function validateMargenDescuadre(margen: number): ValidationError | null {
  if (margen < CAJA_CONSTRAINTS.MARGEN_MIN || margen > CAJA_CONSTRAINTS.MARGEN_MAX) {
    return { 
      field: 'margenDescuadreCaja', 
      message: `El margen de descuadre debe estar entre ${CAJA_CONSTRAINTS.MARGEN_MIN} y ${CAJA_CONSTRAINTS.MARGEN_MAX}` 
    };
  }

  if (isNaN(margen)) {
    return { field: 'margenDescuadreCaja', message: 'El margen de descuadre debe ser un número válido' };
  }

  return null;
}

export function validateUsuariosAutorizados(
  usuariosAutorizadosCaja: string[] | undefined,
  users: User[],
  habilitadaCaja: boolean
): ValidationError | null {
  // If not provided, default to empty array
  const usuarios = usuariosAutorizadosCaja || [];

  // Validate that all IDs exist in users
  const invalidIds = usuarios.filter(id => 
    !users.some(user => user.id === id)
  );

  if (invalidIds.length > 0) {
    return {
      field: 'usuariosAutorizados',
      message: `Los siguientes usuarios no existen: ${invalidIds.join(', ')}`
    };
  }

  // If caja is enabled, at least one authorized user is required
  if (habilitadaCaja && usuarios.length === 0) {
    return {
      field: 'usuariosAutorizadosCaja',
      message: 'Debe autorizar al menos un usuario para operar esta caja'
    };
  }

  return null;
}

/**
 * Validates complete caja creation input
 */
export function validateCreateCaja(
  input: CreateCajaInput,
  existingCajas: Caja[],
  users: User[] = []
): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate nombre
  const nombreError = validateNombre(input.nombreCaja);
  if (nombreError) errors.push(nombreError);

  // Check uniqueness
  const uniquenessError = validateNombreUniqueness(
    input.nombreCaja,
    existingCajas,
    input.establecimientoIdCaja
  );
  if (uniquenessError) errors.push(uniquenessError);

  // Validate moneda
  const monedaError = validateMoneda(input.monedaIdCaja);
  if (monedaError) errors.push(monedaError);

  // Validate medios de pago
  const mediosPagoError = validateMediosPago(input.mediosPagoPermitidos, input.habilitadaCaja);
  if (mediosPagoError) errors.push(mediosPagoError);

  // Validate limite
  const limiteError = validateLimiteMaximo(input.limiteMaximoCaja);
  if (limiteError) errors.push(limiteError);

  // Validate margen
  const margenError = validateMargenDescuadre(input.margenDescuadreCaja);
  if (margenError) errors.push(margenError);

  // Validate usuarios autorizados
  const usuariosError = validateUsuariosAutorizados(
    input.usuariosAutorizadosCaja,
    users,
    input.habilitadaCaja
  );
  if (usuariosError) errors.push(usuariosError);

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates caja update input
 */
export function validateUpdateCaja(
  input: UpdateCajaInput,
  existingCajas: Caja[],
  currentCajaId: string,
  users: User[] = []
): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate nombre if provided
  if (input.nombreCaja !== undefined) {
    const nombreError = validateNombre(input.nombreCaja);
    if (nombreError) errors.push(nombreError);

    const currentCaja = existingCajas.find(c => c.id === currentCajaId);
    const targetEstablecimientoId = input.establecimientoIdCaja ?? currentCaja?.establecimientoIdCaja;
    const uniquenessError = validateNombreUniqueness(
      input.nombreCaja,
      existingCajas,
      targetEstablecimientoId,
      currentCajaId
    );
    if (uniquenessError) errors.push(uniquenessError);
  }

  // Validate moneda if provided
  if (input.monedaIdCaja !== undefined) {
    const monedaError = validateMoneda(input.monedaIdCaja);
    if (monedaError) errors.push(monedaError);
  }

  // Validate medios de pago if habilitada is being changed or medios are being updated
  if (input.habilitadaCaja !== undefined || input.mediosPagoPermitidos !== undefined) {
    const currentCaja = existingCajas.find(c => c.id === currentCajaId);
    const habilitadaCaja = input.habilitadaCaja ?? currentCaja?.habilitadaCaja ?? false;
    const mediosPago = input.mediosPagoPermitidos ?? currentCaja?.mediosPagoPermitidos ?? [];
    
    const mediosPagoError = validateMediosPago(mediosPago, habilitadaCaja);
    if (mediosPagoError) errors.push(mediosPagoError);
  }

  // Validate limite if provided
  if (input.limiteMaximoCaja !== undefined) {
    const limiteError = validateLimiteMaximo(input.limiteMaximoCaja);
    if (limiteError) errors.push(limiteError);
  }

  // Validate margen if provided
  if (input.margenDescuadreCaja !== undefined) {
    const margenError = validateMargenDescuadre(input.margenDescuadreCaja);
    if (margenError) errors.push(margenError);
  }

  // Validate usuarios autorizados if provided or if habilitada is changing
  if (input.usuariosAutorizadosCaja !== undefined || input.habilitadaCaja !== undefined) {
    const currentCaja = existingCajas.find(c => c.id === currentCajaId);
    const habilitadaCaja = input.habilitadaCaja ?? currentCaja?.habilitadaCaja ?? false;
    const usuariosAutorizadosCaja = input.usuariosAutorizadosCaja ?? currentCaja?.usuariosAutorizadosCaja ?? [];
    
    const usuariosError = validateUsuariosAutorizados(
      usuariosAutorizadosCaja,
      users,
      habilitadaCaja
    );
    if (usuariosError) errors.push(usuariosError);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Helper to get error message for a specific field
 */
export function getFieldError(errors: ValidationError[], field: string): string | undefined {
  return errors.find(e => e.field === field)?.message;
}

/**
 * Helper to check if a field has an error
 */
export function hasFieldError(errors: ValidationError[], field: string): boolean {
  return errors.some(e => e.field === field);
}
