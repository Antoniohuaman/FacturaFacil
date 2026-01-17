// src/features/autenticacion/utils/errorMapping.ts

/**
 * ============================================
 * ERROR MAPPING - Códigos Backend → Mensajes UX
 * ============================================
 */

export const ERROR_MESSAGES: Record<string, string> = {
  // Autenticación
  AUTH_INVALID_CREDENTIALS: 'Correo o contraseña incorrectos',
  AUTH_USER_NOT_FOUND: 'Usuario no encontrado',
  AUTH_EMAIL_ALREADY_EXISTS: 'Este correo ya está registrado',
  AUTH_INVALID_TOKEN: 'Token inválido o expirado',
  AUTH_TOKEN_EXPIRED: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente',
  AUTH_SESSION_EXPIRED: 'Tu sesión ha expirado',
  AUTH_UNAUTHORIZED: 'No tienes autorización para acceder a este recurso',
  
  // Verificación
  EMAIL_UNCONFIRMED: 'Debes confirmar tu correo electrónico antes de continuar',
  EMAIL_ALREADY_VERIFIED: 'Tu correo ya está verificado',
  VERIFICATION_TOKEN_INVALID: 'El enlace de verificación es inválido o ha expirado',
  VERIFICATION_TOKEN_EXPIRED: 'El enlace de verificación ha expirado. Solicita uno nuevo',
  
  // OTP / 2FA
  OTP_INVALID: 'Código de verificación incorrecto',
  OTP_EXPIRED: 'El código de verificación ha expirado. Solicita uno nuevo',
  OTP_MAX_ATTEMPTS: 'Has excedido el número máximo de intentos',
  OTP_REQUIRED: 'Se requiere verificación de dos factores',
  
  // RUC / Workspace
  RUC_INVALID: 'RUC inválido. Debe ser un RUC empresarial (comienza con 20)',
  RUC_ALREADY_EXISTS: 'Este RUC ya está registrado en el sistema',
  RUC_VERIFICATION_FAILED: 'No se pudo verificar el RUC con SUNAT',
  SUNAT_DOWN: 'El servicio de SUNAT no está disponible. Por favor, intenta más tarde',
  WORKSPACE_REQUIRED: 'Debes configurar tu espacio de trabajo para continuar',
  WORKSPACE_ALREADY_EXISTS: 'Ya tienes un espacio de trabajo configurado',
  
  // Provisioning
  PROVISION_FAILED: 'Error al crear el espacio de trabajo. Por favor, intenta nuevamente',
  TRIAL_ACTIVATION_FAILED: 'Error al activar el período de prueba',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'Has excedido el límite de intentos. Por favor, espera unos minutos',
  TOO_MANY_REQUESTS: 'Demasiadas solicitudes. Por favor, espera un momento',
  
  // Network
  NETWORK_ERROR: 'Error de conexión. Verifica tu internet',
  SERVER_ERROR: 'Error del servidor. Por favor, intenta más tarde',
  TIMEOUT_ERROR: 'La solicitud ha tardado demasiado. Intenta nuevamente',
  
  // Contraseña
  PASSWORD_TOO_WEAK: 'La contraseña no cumple con los requisitos de seguridad',
  PASSWORD_MISMATCH: 'Las contraseñas no coinciden',
  PASSWORD_RESET_TOKEN_INVALID: 'El enlace de recuperación es inválido o ha expirado',
  
  // Invitación
  INVITATION_TOKEN_INVALID: 'El enlace de invitación es inválido o ha expirado',
  INVITATION_ALREADY_ACCEPTED: 'Esta invitación ya fue aceptada',
  INVITATION_EXPIRED: 'La invitación ha expirado',
  
  // Contexto
  CONTEXT_INVALID: 'Contexto de trabajo inválido',
  CONTEXT_UNAUTHORIZED: 'No tienes acceso a este espacio de trabajo',
  COMPANY_NOT_FOUND: 'Empresa no encontrada',
  ESTABLISHMENT_NOT_FOUND: 'Establecimiento no encontrado',
  
  // Default
  UNKNOWN_ERROR: 'Ha ocurrido un error inesperado. Por favor, intenta nuevamente',
};

/**
 * Mapea un código de error del backend a un mensaje amigable
 */
export function getErrorMessage(errorCode?: string): string {
  if (!errorCode) return ERROR_MESSAGES.UNKNOWN_ERROR;
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Determina si un error requiere acción del usuario
 */
export function isUserActionableError(errorCode?: string): boolean {
  const actionableErrors = [
    'AUTH_INVALID_CREDENTIALS',
    'EMAIL_UNCONFIRMED',
    'OTP_INVALID',
    'OTP_EXPIRED',
    'RUC_INVALID',
    'PASSWORD_TOO_WEAK',
    'PASSWORD_MISMATCH',
  ];
  
  return errorCode ? actionableErrors.includes(errorCode) : false;
}

/**
 * Determina si un error requiere reautenticación
 */
export function requiresReauthentication(errorCode?: string): boolean {
  const reauthErrors = [
    'AUTH_TOKEN_EXPIRED',
    'AUTH_SESSION_EXPIRED',
    'AUTH_INVALID_TOKEN',
  ];
  
  return errorCode ? reauthErrors.includes(errorCode) : false;
}