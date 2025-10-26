// src/features/autenticacion/types/auth.types.ts

/**
 * ============================================
 * TIPOS DE AUTENTICACIÓN - SENCIYO/FACTURAFÁCIL
 * ============================================
 */

// ==================== ENUMS AS CONST OBJECTS ====================
export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  CONTADOR: 'contador',
  VENDEDOR: 'vendedor',
  ALMACENERO: 'almacenero',
  VIEWER: 'viewer',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const UserStatus = {
  ACTIVO: 'activo',
  INACTIVO: 'inactivo',
  SUSPENDIDO: 'suspendido',
  PENDIENTE: 'pendiente',
} as const;

export type UserStatus = typeof UserStatus[keyof typeof UserStatus];

export const RegimenTributario = {
  GENERAL: 'general',
  MYPE: 'mype',
  ESPECIAL: 'especial',
} as const;

export type RegimenTributario = typeof RegimenTributario[keyof typeof RegimenTributario];

export const EmpresaStatus = {
  ACTIVA: 'activa',
  SUSPENDIDA: 'suspendida',
  BAJA: 'baja',
} as const;

export type EmpresaStatus = typeof EmpresaStatus[keyof typeof EmpresaStatus];

export const AuthStatus = {
  IDLE: 'idle',
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  ERROR: 'error',
  CONTEXT_SELECTION: 'context_selection',
} as const;

export type AuthStatus = typeof AuthStatus[keyof typeof AuthStatus];

export const AuthErrorCode = {
  INVALID_CREDENTIALS: 'invalid_credentials',
  USER_NOT_FOUND: 'user_not_found',
  EMAIL_ALREADY_EXISTS: 'email_already_exists',
  RUC_ALREADY_EXISTS: 'ruc_already_exists',
  INVALID_TOKEN: 'invalid_token',
  TOKEN_EXPIRED: 'token_expired',
  SESSION_EXPIRED: 'session_expired',
  UNAUTHORIZED: 'unauthorized',
  NETWORK_ERROR: 'network_error',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  INVALID_RUC: 'invalid_ruc',
  SUNAT_SERVICE_ERROR: 'sunat_service_error',
} as const;

export type AuthErrorCode = typeof AuthErrorCode[keyof typeof AuthErrorCode];

export const PermissionAction = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  EXPORT: 'export',
  APPROVE: 'approve',
} as const;

export type PermissionAction = typeof PermissionAction[keyof typeof PermissionAction];

// ==================== USUARIO ====================
export interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  avatar?: string;
  rol: UserRole;
  estado: UserStatus;
  emailVerificado: boolean;
  require2FA: boolean;
  ultimoAcceso?: string;
  fechaCreacion: string;
}

// ==================== EMPRESA/TENANT ====================
export interface Empresa {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  logo?: string;
  direccion: string;
  telefono?: string;
  email?: string;
  actividadEconomica?: string;
  regimen?: RegimenTributario;
  estado: EmpresaStatus;
  establecimientos: Establecimiento[];
  configuracion: EmpresaConfig;
}

export interface Establecimiento {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  esPrincipal: boolean;
  activo: boolean;
}

export interface EmpresaConfig {
  emisionElectronica: boolean;
  certificadoDigital?: string;
  seriesPorDefecto?: {
    factura?: string;
    boleta?: string;
    notaCredito?: string;
    notaDebito?: string;
  };
}

// ==================== CONTEXTO DE TRABAJO ====================
export interface WorkspaceContext {
  empresaId: string;
  establecimientoId: string;
  empresa: Empresa;
  establecimiento: Establecimiento;
  permisos: string[];
  configuracion: Record<string, unknown>;
}

// ==================== AUTENTICACIÓN ====================
export interface LoginCredentials {
  email: string;
  password: string;
  recordarme?: boolean;
}

export interface RegisterData {
  // Paso 1: Usuario
  email: string;
  password: string;
  nombre: string;
  apellido: string;

  // Paso 2: Empresa
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion: string;
  telefono?: string;

  // Paso 3: Configuración inicial
  regimen: RegimenTributario;
  actividadEconomica?: string;
  aceptaTerminos: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
  empresas: Empresa[];
  requiereSeleccionContexto: boolean;
  contextoActual?: WorkspaceContext;
}

export interface ContextSelectionPayload {
  empresaId: string;
  establecimientoId: string;
}

// ==================== RECUPERACIÓN DE CONTRASEÑA ====================
export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  password: string;
  passwordConfirmation: string;
}

// ==================== VALIDACIÓN RUC ====================
export interface RucValidationResult {
  valido: boolean;
  ruc: string;
  razonSocial?: string;
  direccion?: string;
  estado?: string;
  condicion?: string;
  mensaje?: string;
}

// ==================== ESTADOS DE AUTENTICACIÓN ====================
export interface AuthState {
  user: User | null;
  empresas: Empresa[];
  contextoActual: WorkspaceContext | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ==================== ERRORES ====================
export interface AuthError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

// ==================== PERMISOS ====================
export interface Permission {
  recurso: string;
  acciones: PermissionAction[];
}

// ==================== SESSION MANAGEMENT ====================
export interface SessionInfo {
  userId: string;
  empresaId: string;
  establecimientoId: string;
  loginTime: string;
  lastActivity: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

// ==================== PASSWORD POLICY ====================
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  specialChars: string;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  feedback: string[];
  isValid: boolean;
}
