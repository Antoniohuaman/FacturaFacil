// src/features/autenticacion/adapters/BackendAdapter.ts
import type {
  AuthResponse,
  User,
  Empresa,
  Establecimiento,
  WorkspaceContext,
  AuthTokens,
  UserRole,
  UserStatus,
  EmpresaStatus,
  RegimenTributario,
  EmpresaConfig,
} from '../types/auth.types';

/**
 * ============================================
 * BACKEND ADAPTER - Transformación de Respuestas
 * ============================================
 * Adapta las respuestas del backend .NET al formato
 * que espera el frontend React.
 */

// ==================== TIPOS DEL BACKEND ====================

interface BackendApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errorCode?: string;
}

interface BackendLoginResponseDto {
  token: string;
  refreshToken: string;
  expiresIn: number;
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  requiereCambioPassword: boolean;
  empresas?: BackendEmpresaUsuarioDto[];
  establecimientos?: BackendEstablecimientoDto[];
}

interface BackendEmpresaUsuarioDto {
  id: string;
  empresaId: string;
  usuarioId: string;
  establecimientoId: string;
  empresaRuc: string;
  empresaRazonSocial: string;
  establecimientoCodigo: string;
  establecimientoNombre: string;
  esActivo: boolean;
}

interface BackendEstablecimientoDto {
  id: string;
  empresaId: string;
  codigo: string;
  nombre: string;
  direccion: string;
  codigoDistrito?: string;
  distrito?: string;
  codigoProvincia?: string;
  provincia?: string;
  codigoDepartamento?: string;
  departamento?: string;
  codigoPostal?: string;
  telefono?: string;
  correo?: string;
  esActivo: boolean;
  usuarioId?: string;
  usuarioNombre?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== FUNCIONES DE ADAPTACIÓN ====================

/**
 * Decodifica el JWT token para extraer información
 */
function decodeJwt(token: string): { exp: number } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decodificando JWT:', error);
    return null;
  }
}

/**
 * Adapta un usuario del backend al formato del frontend
 */
function adaptUser(backendUser: BackendLoginResponseDto): User {
  return {
    id: backendUser.id,
    email: backendUser.email,
    nombre: backendUser.nombre,
    apellido: backendUser.apellido,
    avatar: undefined,
    rol: 'admin' as UserRole, // TODO: Backend debe enviar rol
    estado: 'activo' as UserStatus,
    emailVerificado: true, // TODO: Backend debe implementar verificación
    require2FA: false, // TODO: Backend debe implementar 2FA
    ultimoAcceso: new Date().toISOString(),
    fechaCreacion: new Date().toISOString(),
  };
}

/**
 * Adapta tokens del backend al formato del frontend
 */
function adaptTokens(backendToken: string, backendRefreshToken: string, backendExpiresIn?: number): AuthTokens {
  // Si el backend no envía expiresIn, calcularlo desde el JWT
  let expiresIn = backendExpiresIn || 3600;

  if (!backendExpiresIn) {
    const decoded = decodeJwt(backendToken);
    expiresIn = decoded?.exp
      ? decoded.exp - Math.floor(Date.now() / 1000)
      : 3600;
  }

  return {
    accessToken: backendToken,
    refreshToken: backendRefreshToken,
    expiresIn,
    tokenType: 'Bearer',
  };
}

/**
 * Agrupa establecimientos por empresa
 */
function groupEstablecimientosByEmpresa(
  empresasUsuario: BackendEmpresaUsuarioDto[],
  establecimientos: BackendEstablecimientoDto[]
): Map<string, BackendEstablecimientoDto[]> {
  const empresasMap = new Map<string, BackendEstablecimientoDto[]>();

  empresasUsuario.forEach((eu) => {
    const establecimientosEmpresa = establecimientos.filter(
      (est) => est.empresaId === eu.empresaId
    );
    empresasMap.set(eu.empresaId, establecimientosEmpresa);
  });

  return empresasMap;
}

/**
 * Adapta un establecimiento del backend al formato del frontend
 */
function adaptEstablecimiento(
  backendEst: BackendEstablecimientoDto
): Establecimiento {
  return {
    id: backendEst.id,
    codigo: backendEst.codigo,
    nombre: backendEst.nombre,
    direccion: backendEst.direccion,
    esPrincipal: backendEst.codigo === '0001', // Convenio: 0001 es principal
    activo: backendEst.esActivo,
  };
}

/**
 * Adapta empresas del backend al formato del frontend
 */
function adaptEmpresas(
  empresasUsuario: BackendEmpresaUsuarioDto[],
  establecimientos: BackendEstablecimientoDto[]
): Empresa[] {
  const empresasMap = groupEstablecimientosByEmpresa(empresasUsuario, establecimientos);
  const empresasUnicas = new Map<string, BackendEmpresaUsuarioDto>();

  // Obtener empresas únicas
  empresasUsuario.forEach((eu) => {
    if (!empresasUnicas.has(eu.empresaId)) {
      empresasUnicas.set(eu.empresaId, eu);
    }
  });

  return Array.from(empresasUnicas.values()).map((eu) => {
    const establecimientosEmpresa = empresasMap.get(eu.empresaId) || [];

    return {
      id: eu.empresaId,
      ruc: eu.empresaRuc,
      razonSocial: eu.empresaRazonSocial,
      nombreComercial: eu.empresaRazonSocial,
      logo: undefined,
      direccion: '', // TODO: Backend debe enviar dirección de empresa
      telefono: undefined,
      email: undefined,
      actividadEconomica: undefined,
      regimen: 'general' as RegimenTributario, // TODO: Backend debe enviar régimen
      estado: 'activa' as EmpresaStatus,
      establecimientos: establecimientosEmpresa.map(adaptEstablecimiento),
      configuracion: {
        emisionElectronica: false,
        certificadoDigital: undefined,
        seriesPorDefecto: undefined,
      } as EmpresaConfig,
    };
  });
}

/**
 * Determina el contexto inicial basado en las empresas del usuario
 */
function determineInitialContext(
  backendData: BackendLoginResponseDto,
  empresas: Empresa[]
): WorkspaceContext | undefined {
  // Si solo tiene una empresa y un establecimiento, seleccionarlo automáticamente
  if (empresas.length === 1 && empresas[0].establecimientos.length === 1) {
    const empresa = empresas[0];
    const establecimiento = empresa.establecimientos[0];

    return {
      empresaId: empresa.id,
      establecimientoId: establecimiento.id,
      empresa,
      establecimiento,
      permisos: [], // TODO: Backend debe enviar permisos
      configuracion: {},
    };
  }

  return undefined;
}

/**
 * Adapta la respuesta de login del backend al formato del frontend
 */
export function adaptLoginResponse(
  backendResponse: BackendApiResponse<BackendLoginResponseDto>
): AuthResponse {
  const backendData = backendResponse.data;

  // Adaptar datos básicos
  const user = adaptUser(backendData);
  const tokens = adaptTokens(backendData.token, backendData.refreshToken, backendData.expiresIn);

  // Adaptar empresas y establecimientos
  const empresas = adaptEmpresas(
    backendData.empresas || [],
    backendData.establecimientos || []
  );

  // Determinar contexto inicial
  const contextoActual = determineInitialContext(backendData, empresas);

  // Determinar si requiere selección de contexto
  const requiereSeleccionContexto =
    !contextoActual && empresas.length > 0;

  return {
    user,
    tokens,
    empresas,
    requiereSeleccionContexto,
    contextoActual,
  };
}

/**
 * Adapta errores del backend al formato del frontend
 */
export function adaptBackendError(error: unknown): {
  code: string;
  message: string;
} {
  if (typeof error === 'object' && error !== null) {
    const err = error as { errorCode?: string; message?: string; success?: boolean };

    return {
      code: err.errorCode || 'UNKNOWN_ERROR',
      message: err.message || 'Error desconocido',
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'Error desconocido',
  };
}

/**
 * Mapea códigos de error del backend a códigos del frontend
 */
export function mapBackendErrorCode(backendCode: string): string {
  const errorMap: Record<string, string> = {
    '401': 'INVALID_CREDENTIALS',
    '429': 'RATE_LIMIT_EXCEEDED',
    '404': 'USER_NOT_FOUND',
    '500': 'NETWORK_ERROR',
  };

  return errorMap[backendCode] || 'UNKNOWN_ERROR';
}
