export type RolUsuario = 'lector' | 'editor' | 'admin'

export type EstadoRegistro = 'pendiente' | 'en_progreso' | 'completado'
export type PrioridadRegistro = 'baja' | 'media' | 'alta'

export interface Objetivo {
  id: string
  nombre: string
  descripcion: string
  estado: EstadoRegistro
  prioridad: PrioridadRegistro
  created_at: string
  updated_at: string
}

export interface Iniciativa {
  id: string
  objetivo_id: string | null
  nombre: string
  descripcion: string
  alcance: number
  impacto: number
  confianza: number
  esfuerzo: number
  rice: number
  estado: EstadoRegistro
  prioridad: PrioridadRegistro
  created_at: string
  updated_at: string
}

export interface Entrega {
  id: string
  iniciativa_id: string | null
  nombre: string
  descripcion: string
  fecha_objetivo: string | null
  estado: EstadoRegistro
  prioridad: PrioridadRegistro
  created_at: string
  updated_at: string
}

export interface MatrizValor {
  id: string
  iniciativa_id: string
  titulo: string
  valor_negocio: number
  esfuerzo: number
  riesgo: number
  puntaje_valor: number
  estado: EstadoRegistro
  prioridad: PrioridadRegistro
  created_at: string
  updated_at: string
}

export interface PerfilUsuario {
  id: string
  correo: string
  rol: RolUsuario
}

export const estadosRegistro: EstadoRegistro[] = ['pendiente', 'en_progreso', 'completado']
export const prioridadesRegistro: PrioridadRegistro[] = ['baja', 'media', 'alta']
