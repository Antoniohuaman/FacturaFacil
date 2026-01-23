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
  ContextoSugerido,
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
  contextoSugerido?: BackendContextoSugeridoDto;
  requiereSeleccionContexto?: boolean;
}

interface BackendContextoSugeridoDto {
  empresaId: string;
  establecimientoId: string;
  empresa: BackendEmpresaDetalleDto;
  establecimiento: BackendEstablecimientoDetalleDto;
}

interface BackendEmpresaDetalleDto {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccionFiscal?: string;
  monedaBase?: string;
  ambienteSunat?: string;
  actividadEconomica?: string;
  regimenTributario?: string;
  telefonos?: string[];
  correosElectronicos?: string[];
  esActivo: boolean;
}

interface BackendEstablecimientoDetalleDto {
  id: string;
  codigo: string;
  nombre: string;
  direccion?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  telefono?: string;
  correo?: string;
  esPrincipal: boolean;
  esActivo: boolean;
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
  esPrincipal?: boolean;
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
    esPrincipal: backendEst.esPrincipal ?? (backendEst.codigo === '0001'), // Usar campo o fallback
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
  _backendData: BackendLoginResponseDto,
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

  // Adaptar contexto sugerido del backend si existe
  let contextoSugerido: ContextoSugerido | undefined;
  if (backendData.contextoSugerido) {
    contextoSugerido = {
      empresaId: backendData.contextoSugerido.empresaId,
      establecimientoId: backendData.contextoSugerido.establecimientoId,
      empresa: {
        id: backendData.contextoSugerido.empresa.id,
        ruc: backendData.contextoSugerido.empresa.ruc,
        razonSocial: backendData.contextoSugerido.empresa.razonSocial,
        nombreComercial: backendData.contextoSugerido.empresa.nombreComercial,
        direccionFiscal: backendData.contextoSugerido.empresa.direccionFiscal,
        monedaBase: backendData.contextoSugerido.empresa.monedaBase,
        ambienteSunat: backendData.contextoSugerido.empresa.ambienteSunat,
        actividadEconomica: backendData.contextoSugerido.empresa.actividadEconomica,
        regimenTributario: backendData.contextoSugerido.empresa.regimenTributario,
        telefonos: backendData.contextoSugerido.empresa.telefonos,
        correosElectronicos: backendData.contextoSugerido.empresa.correosElectronicos,
        esActivo: backendData.contextoSugerido.empresa.esActivo,
      },
      establecimiento: {
        id: backendData.contextoSugerido.establecimiento.id,
        codigo: backendData.contextoSugerido.establecimiento.codigo,
        nombre: backendData.contextoSugerido.establecimiento.nombre,
        direccion: backendData.contextoSugerido.establecimiento.direccion,
        distrito: backendData.contextoSugerido.establecimiento.distrito,
        provincia: backendData.contextoSugerido.establecimiento.provincia,
        departamento: backendData.contextoSugerido.establecimiento.departamento,
        telefono: backendData.contextoSugerido.establecimiento.telefono,
        correo: backendData.contextoSugerido.establecimiento.correo,
        esPrincipal: backendData.contextoSugerido.establecimiento.esPrincipal,
        esActivo: backendData.contextoSugerido.establecimiento.esActivo,
      },
    };
  }

  // Determinar contexto inicial (fallback si no hay contexto sugerido)
  const contextoActual = determineInitialContext(backendData, empresas);

  // Determinar si requiere selección de contexto
  const requiereSeleccionContexto =
    backendData.requiereSeleccionContexto !== undefined
      ? backendData.requiereSeleccionContexto
      : !contextoActual && !contextoSugerido && empresas.length > 0;

  return {
    user,
    tokens,
    empresas,
    requiereSeleccionContexto,
    contextoActual,
    contextoSugerido,
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
