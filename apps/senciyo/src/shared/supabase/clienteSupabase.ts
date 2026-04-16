import { createClient } from '@supabase/supabase-js';

type Database = {
  public: {
    Tables: {
      retroalimentacion_estado_animo: {
        Row: {
          id: string;
          created_at: string;
          usuario_id: string;
          usuario_nombre: string;
          empresa_id: string;
          empresa_nombre: string;
          establecimiento_id: string | null;
          establecimiento_nombre: string | null;
          modulo: string;
          ruta: string;
          opcion_estado_animo: string;
          comentario_opcional: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          usuario_id: string;
          usuario_nombre: string;
          empresa_id: string;
          empresa_nombre: string;
          establecimiento_id?: string | null;
          establecimiento_nombre?: string | null;
          modulo: string;
          ruta: string;
          opcion_estado_animo: string;
          comentario_opcional?: string | null;
        };
        Update: Partial<Database['public']['Tables']['retroalimentacion_estado_animo']['Insert']>;
        Relationships: [];
      };
      retroalimentacion_ideas: {
        Row: {
          id: string;
          created_at: string;
          usuario_id: string;
          usuario_nombre: string;
          empresa_id: string;
          empresa_nombre: string;
          establecimiento_id: string | null;
          establecimiento_nombre: string | null;
          modulo: string;
          ruta: string;
          contenido_idea: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          usuario_id: string;
          usuario_nombre: string;
          empresa_id: string;
          empresa_nombre: string;
          establecimiento_id?: string | null;
          establecimiento_nombre?: string | null;
          modulo: string;
          ruta: string;
          contenido_idea: string;
        };
        Update: Partial<Database['public']['Tables']['retroalimentacion_ideas']['Insert']>;
        Relationships: [];
      };
      retroalimentacion_calificaciones: {
        Row: {
          id: string;
          created_at: string;
          usuario_id: string;
          usuario_nombre: string;
          empresa_id: string;
          empresa_nombre: string;
          establecimiento_id: string | null;
          establecimiento_nombre: string | null;
          modulo: string;
          ruta: string;
          puntaje: number;
          comentario_opcional: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          usuario_id: string;
          usuario_nombre: string;
          empresa_id: string;
          empresa_nombre: string;
          establecimiento_id?: string | null;
          establecimiento_nombre?: string | null;
          modulo: string;
          ruta: string;
          puntaje: number;
          comentario_opcional?: string | null;
        };
        Update: Partial<Database['public']['Tables']['retroalimentacion_calificaciones']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let clienteSupabase: ReturnType<typeof createClient<Database>> | null = null;

function obtenerUrlSupabase(): string {
  return import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
}

function obtenerAnonKeySupabase(): string {
  return import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
}

export function supabaseEstaConfigurado(): boolean {
  return Boolean(obtenerUrlSupabase() && obtenerAnonKeySupabase());
}

export function obtenerClienteSupabase() {
  if (clienteSupabase) {
    return clienteSupabase;
  }

  const url = obtenerUrlSupabase();
  const anonKey = obtenerAnonKeySupabase();

  if (!url || !anonKey) {
    throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY para inicializar Supabase en SenciYo.');
  }

  clienteSupabase = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return clienteSupabase;
}