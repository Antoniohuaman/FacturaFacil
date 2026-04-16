import { obtenerClienteSupabase } from '../../supabase/clienteSupabase';
import type { EstadoAnimoId } from '../tipos';

export interface ContextoRegistroRetroalimentacion {
  usuarioId: string;
  usuarioNombre: string;
  empresaId: string;
  empresaNombre: string;
  establecimientoId: string | null;
  establecimientoNombre: string | null;
  modulo: string;
  ruta: string;
}

interface RegistroBaseSupabase {
  usuario_id: string;
  usuario_nombre: string;
  empresa_id: string;
  empresa_nombre: string;
  establecimiento_id: string | null;
  establecimiento_nombre: string | null;
  modulo: string;
  ruta: string;
}

function construirRegistroBase(contexto: ContextoRegistroRetroalimentacion): RegistroBaseSupabase {
  return {
    usuario_id: contexto.usuarioId,
    usuario_nombre: contexto.usuarioNombre,
    empresa_id: contexto.empresaId,
    empresa_nombre: contexto.empresaNombre,
    establecimiento_id: contexto.establecimientoId,
    establecimiento_nombre: contexto.establecimientoNombre,
    modulo: contexto.modulo,
    ruta: contexto.ruta,
  };
}

export async function guardarEstadoAnimoEnSupabase(
  contexto: ContextoRegistroRetroalimentacion,
  entrada: { estado: EstadoAnimoId; comentario: string | null },
): Promise<void> {
  const supabase = obtenerClienteSupabase();
  const { error } = await supabase
    .from('retroalimentacion_estado_animo')
    .insert({
      ...construirRegistroBase(contexto),
      opcion_estado_animo: entrada.estado,
      comentario_opcional: entrada.comentario,
    });

  if (error) {
    throw error;
  }
}

export async function guardarIdeaEnSupabase(
  contexto: ContextoRegistroRetroalimentacion,
  entrada: { contenido: string },
): Promise<void> {
  const supabase = obtenerClienteSupabase();
  const { error } = await supabase
    .from('retroalimentacion_ideas')
    .insert({
      ...construirRegistroBase(contexto),
      contenido_idea: entrada.contenido,
    });

  if (error) {
    throw error;
  }
}

export async function guardarCalificacionEnSupabase(
  contexto: ContextoRegistroRetroalimentacion,
  entrada: { puntaje: number; comentario: string | null },
): Promise<void> {
  const supabase = obtenerClienteSupabase();
  const { error } = await supabase
    .from('retroalimentacion_calificaciones')
    .insert({
      ...construirRegistroBase(contexto),
      puntaje: entrada.puntaje,
      comentario_opcional: entrada.comentario,
    });

  if (error) {
    throw error;
  }
}