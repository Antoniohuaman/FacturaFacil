import { tokenService } from '../../../pages/Private/features/autenticacion/services/TokenService';
import {
  obtenerClienteSupabase,
  sincronizarSesionClienteSupabase,
  supabaseEstaConfigurado,
} from '../../supabase/clienteSupabase';
import type { EstadoAnimoId } from '../tipos';

type CodigoErrorPersistenciaRetroalimentacion = 'configuracion' | 'contexto' | 'persistencia';

class ErrorPersistenciaRetroalimentacion extends Error {
  codigo: CodigoErrorPersistenciaRetroalimentacion;
  causa?: unknown;

  constructor(codigo: CodigoErrorPersistenciaRetroalimentacion, mensaje: string, causa?: unknown) {
    super(mensaje);
    this.name = 'ErrorPersistenciaRetroalimentacion';
    this.codigo = codigo;
    this.causa = causa;
  }
}

export interface ContextoRegistroRetroalimentacion {
  usuarioId: string;
  usuarioNombre: string;
  usuarioCorreo: string | null;
  empresaId: string;
  empresaRuc: string | null;
  empresaRazonSocial: string | null;
  empresaNombre: string;
  establecimientoId: string | null;
  establecimientoNombre: string | null;
  modulo: string;
  ruta: string;
}

interface RegistroBaseSupabase {
  usuario_id: string;
  usuario_nombre: string;
  usuario_correo: string | null;
  empresa_id: string;
  empresa_ruc: string | null;
  empresa_razon_social: string | null;
  empresa_nombre: string;
  establecimiento_id: string | null;
  establecimiento_nombre: string | null;
  modulo: string;
  ruta: string;
}

function normalizarTextoObligatorio(valor: string, campo: string): string {
  const texto = valor.trim();

  if (!texto) {
    throw new ErrorPersistenciaRetroalimentacion('contexto', `Falta ${campo} para registrar la retroalimentación.`);
  }

  return texto;
}

function normalizarTextoOpcional(valor: string | null): string | null {
  if (!valor) {
    return null;
  }

  const texto = valor.trim();
  return texto || null;
}

function asegurarSupabaseDisponible(): void {
  if (!supabaseEstaConfigurado()) {
    throw new ErrorPersistenciaRetroalimentacion(
      'configuracion',
      'La configuración de Supabase no está completa para guardar retroalimentación.',
    );
  }
}

function authSimuladaActiva(): boolean {
  return import.meta.env.VITE_DEV_MODE === 'true' || !import.meta.env.VITE_API_URL;
}

async function obtenerClienteSupabaseAutenticado() {
  const supabase = obtenerClienteSupabase();
  const sesionSincronizada = await sincronizarSesionClienteSupabase(
    tokenService.getAccessToken(),
    tokenService.getRefreshToken(),
  );

  if (!sesionSincronizada && !authSimuladaActiva()) {
    throw new ErrorPersistenciaRetroalimentacion(
      'contexto',
      'No se encontró una sesión autenticada de Supabase para guardar la retroalimentación.',
    );
  }

  return supabase;
}

function construirRegistroBase(contexto: ContextoRegistroRetroalimentacion): RegistroBaseSupabase {
  return {
    usuario_id: normalizarTextoObligatorio(contexto.usuarioId, 'usuario_id'),
    usuario_nombre: normalizarTextoObligatorio(contexto.usuarioNombre, 'usuario_nombre'),
    usuario_correo: normalizarTextoOpcional(contexto.usuarioCorreo),
    empresa_id: normalizarTextoObligatorio(contexto.empresaId, 'empresa_id'),
    empresa_ruc: normalizarTextoOpcional(contexto.empresaRuc),
    empresa_razon_social: normalizarTextoOpcional(contexto.empresaRazonSocial),
    empresa_nombre: normalizarTextoObligatorio(contexto.empresaNombre, 'empresa_nombre'),
    establecimiento_id: normalizarTextoOpcional(contexto.establecimientoId),
    establecimiento_nombre: normalizarTextoOpcional(contexto.establecimientoNombre),
    modulo: normalizarTextoObligatorio(contexto.modulo, 'modulo'),
    ruta: normalizarTextoObligatorio(contexto.ruta, 'ruta'),
  };
}

export async function guardarEstadoAnimoEnSupabase(
  contexto: ContextoRegistroRetroalimentacion,
  entrada: { estado: EstadoAnimoId; comentario: string | null },
): Promise<void> {
  asegurarSupabaseDisponible();
  const supabase = await obtenerClienteSupabaseAutenticado();
  const { error } = await supabase
    .from('retroalimentacion_estado_animo')
    .insert({
      ...construirRegistroBase(contexto),
      opcion_estado_animo: entrada.estado,
      comentario_opcional: normalizarTextoOpcional(entrada.comentario),
    });

  if (error) {
    throw new ErrorPersistenciaRetroalimentacion('persistencia', 'No se pudo guardar el estado de ánimo.', error);
  }
}

export async function guardarIdeaEnSupabase(
  contexto: ContextoRegistroRetroalimentacion,
  entrada: { contenido: string },
): Promise<void> {
  asegurarSupabaseDisponible();
  const supabase = await obtenerClienteSupabaseAutenticado();
  const { error } = await supabase
    .from('retroalimentacion_ideas')
    .insert({
      ...construirRegistroBase(contexto),
      contenido_idea: normalizarTextoObligatorio(entrada.contenido, 'contenido_idea'),
    });

  if (error) {
    throw new ErrorPersistenciaRetroalimentacion('persistencia', 'No se pudo guardar la idea.', error);
  }
}

export async function guardarCalificacionEnSupabase(
  contexto: ContextoRegistroRetroalimentacion,
  entrada: { puntaje: number; comentario: string | null },
): Promise<void> {
  asegurarSupabaseDisponible();
  const supabase = await obtenerClienteSupabaseAutenticado();
  const { error } = await supabase
    .from('retroalimentacion_calificaciones')
    .insert({
      ...construirRegistroBase(contexto),
      puntaje: entrada.puntaje,
      comentario_opcional: normalizarTextoOpcional(entrada.comentario),
    });

  if (error) {
    throw new ErrorPersistenciaRetroalimentacion('persistencia', 'No se pudo guardar la calificación.', error);
  }
}