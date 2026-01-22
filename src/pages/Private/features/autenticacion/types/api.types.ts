// src/features/autenticacion/types/api.types.ts

/**
 * ============================================
 * TIPOS DE API - DTOs del Backend
 * ============================================
 * Estructura REAL del backend según especificación
 */

// ==================== RESPONSE WRAPPER ====================
export interface ApiResponse<T> {
  exito: boolean;
  mensaje: string;
  codigoError?: string;
  data: T;
  timestamp: string;
}

// ==================== LOGIN DTOs ====================

/**
 * Resumen de la relación Usuario-Empresa-Establecimiento
 * Estructura REAL que devuelve el backend en el login
 */
export interface UsuarioEmpresaResumen {
  // IDs
  id: string;
  empresaId: string;
  usuarioId: string;
  establecimientoId: string;

  // Datos de empresa
  empresaRuc: string;
  empresaRazonSocial: string;

  // Datos de establecimiento
  establecimientoCodigo: string;
  establecimientoNombre: string;

  // Documentos y estado
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  esActivo: boolean;

  // Usuario asociado
  usuarioNombre: string | null;
  usuarioEmail: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO de Establecimiento (array separado en login)
 * Estructura REAL del backend
 */
export interface EstablecimientoDTO {
  // IDs
  id: string;
  empresaId: string;

  // Datos básicos
  codigo: string;
  nombre: string;
  direccion: string;

  // Ubicación geográfica (ubigeo)
  codigoDistrito: string;
  distrito: string;
  codigoProvincia: string;
  provincia: string;
  codigoDepartamento: string;
  departamento: string;
  codigoPostal: string;

  // Contacto
  telefono: string | null;
  correo: string | null;

  // Estado
  esActivo: boolean;

  // Usuario responsable
  usuarioId: string;
  usuarioNombre: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Data que devuelve POST /api/v1/usuarios/login
 */
export interface LoginResponseData {
  token: string;
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  requiereCambioPassword: boolean;
  empresas: UsuarioEmpresaResumen[];
  establecimientos: EstablecimientoDTO[];
}

/**
 * Respuesta completa del login
 */
export type LoginResponse = ApiResponse<LoginResponseData>;

// ==================== EMPRESA COMPLETA DTO ====================

/**
 * DTO completo de empresa para GET /api/v1/empresas/{id}
 * Incluye toda la configuración y datos necesarios para el formulario
 */
export interface EmpresaCompletaDTO {
  empresaId: string;
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccionFiscal: string;

  // Ubigeo
  codigoDistrito?: string;
  distrito?: string;
  codigoProvincia?: string;
  provincia?: string;
  codigoDepartamento?: string;
  departamento?: string;
  codigoPostal?: string;

  // Contacto
  telefono?: string;
  telefonoSecundario?: string;
  email?: string;
  emailSecundario?: string;
  sitioWeb?: string;
  rutaLogo?: string;
  textoPiePagina?: string;

  // Configuración tributaria
  monedaBase?: string;
  regimenTributario?: string;
  actividadEconomica?: string;

  // Representante legal
  representanteLegal?: string;
  nombreRepresentanteLegal?: string;
  tipoDocumentoRepresentante?: string;
  numeroDocumentoRepresentante?: string;

  // Configuración SUNAT
  entornoSunat?: 'PRUEBA' | 'PRODUCCION';
  usuarioSolSunat?: string;
  claveSolSunat?: string;
  ambienteSunat?: string;
  facturarEn?: string;

  // Certificado digital
  certificadoDigital?: string;
  passwordCertificado?: string;

  // Logo y firma
  logo?: string;
  firmaDigital?: string;

  // Metadata
  esActivo?: boolean;
  estado?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

/**
 * Respuesta de GET /api/v1/empresas/{id}
 */
export type EmpresaCompletaResponse = ApiResponse<EmpresaCompletaDTO>;

// ==================== CONTEXTO DE TRABAJO ====================

/**
 * Contexto activo del usuario (empresa + establecimiento seleccionados)
 * Se calcula en el frontend usando la regla: empresas[0]
 */
export interface ContextoTrabajo {
  empresaId: string;
  establecimientoId: string;
  empresaRuc: string;
  empresaRazonSocial: string;
  establecimientoNombre: string;
}

// ==================== HELPERS ====================

/**
 * Función que aplica la regla del "primer array"
 * Selecciona empresas[0] como empresa activa
 */
export function pickEmpresaActiva(
  empresas: UsuarioEmpresaResumen[]
): UsuarioEmpresaResumen | null {
  if (!empresas || empresas.length === 0) {
    return null;
  }
  return empresas[0];
}

/**
 * Función que encuentra el establecimiento activo usando match por ID
 */
export function pickEstablecimientoActivo(
  empresaActiva: UsuarioEmpresaResumen | null,
  establecimientos: EstablecimientoDTO[]
): EstablecimientoDTO | null {
  if (!empresaActiva || !establecimientos || establecimientos.length === 0) {
    return null;
  }

  // Buscar por match de establecimientoId de la empresa activa
  const establecimiento = establecimientos.find(
    e => e.id === empresaActiva.establecimientoId
  );

  // Fallback: si no se encuentra, tomar el primero
  return establecimiento || establecimientos[0];
}

// ==================== CREAR/ACTUALIZAR EMPRESA ====================

export interface CreateEmpresaRequest {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccionFiscal: string;
  codigoDistrito: string;
  distrito: string;
  codigoProvincia: string;
  provincia: string;
  codigoDepartamento: string;
  departamento: string;
  codigoPostal: string;
  telefonos: string[];
  correosElectronicos: string[];
  sitioWeb?: string;
  rutaLogo?: string;
  textoPiePagina?: string;
  actividadEconomica?: string;
  regimenTributario?: string;
  monedaBase?: string;
  representanteLegal?: string;
  nombreRepresentanteLegal?: string;
  tipoDocumentoRepresentante?: string;
  numeroDocumentoRepresentante?: string;
  ambienteSunat: 'PRUEBA' | 'PRODUCCION';
  facturarEn?: string;
  esActivo: boolean;
}

export interface UpdateEmpresaRequest {
  ruc?: string;
  razonSocial?: string;
  nombreComercial?: string;
  direccionFiscal?: string;
  codigoDistrito?: string;
  distrito?: string;
  codigoProvincia?: string;
  provincia?: string;
  codigoDepartamento?: string;
  departamento?: string;
  codigoPostal?: string;
  telefonos?: string[];
  correosElectronicos?: string[];
  sitioWeb?: string;
  rutaLogo?: string;
  textoPiePagina?: string;
  actividadEconomica?: string;
  regimenTributario?: string;
  monedaBase?: string;
  representanteLegal?: string;
  nombreRepresentanteLegal?: string;
  tipoDocumentoRepresentante?: string;
  numeroDocumentoRepresentante?: string;
  ambienteSunat?: 'PRUEBA' | 'PRODUCCION';
  facturarEn?: string;
  esActivo?: boolean;
}

export interface CreateEmpresaResponse {
  exito: boolean;
  mensaje: string;
  data: EmpresaCompletaDTO;
  timestamp: string;
}

export interface UpdateEmpresaResponse {
  exito: boolean;
  mensaje: string;
  data: EmpresaCompletaDTO;
  timestamp: string;
}

/**
 * Crea el contexto de trabajo a partir de empresa y establecimiento activos
 * ACTUALIZADO para estructura real del backend
 */
export function crearContextoTrabajo(
  empresaActiva: UsuarioEmpresaResumen | null,
  establecimientoActivo: EstablecimientoDTO | null
): ContextoTrabajo | null {
  if (!empresaActiva || !establecimientoActivo) {
    return null;
  }

  return {
    empresaId: empresaActiva.empresaId,
    establecimientoId: establecimientoActivo.id,
    empresaRuc: empresaActiva.empresaRuc,
    empresaRazonSocial: empresaActiva.empresaRazonSocial,
    establecimientoNombre: establecimientoActivo.nombre, // Correcto según backend real
  };
}
