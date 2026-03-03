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

export interface CatalogoModuloPm {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  activo: boolean
  orden: number
  created_at: string
  updated_at: string
}

export interface CatalogoSeveridadPm {
  id: string
  codigo: string
  nombre: string
  nivel: number
  descripcion: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface CatalogoEstadoPm {
  id: string
  ambito: string
  codigo: string
  nombre: string
  orden: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface CatalogoTipoAuditoriaPm {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface PlantillaValidacion {
  id: string
  modulo_id: string
  nombre: string
  criterios: string
  evidencias_esperadas: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface PlanValidacion {
  id: string
  modulo_id: string
  plantilla_id: string | null
  nombre: string
  criterios: string
  evidencias_esperadas: string
  owner: string | null
  estado_codigo: string
  fecha_inicio: string | null
  fecha_fin: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface EjecucionValidacion {
  id: string
  plan_validacion_id: string
  modulo_id: string
  fecha_ejecucion: string
  rango_desde: string | null
  rango_hasta: string | null
  resultado: string
  hallazgos: string
  evidencia_url: string | null
  aprobador: string | null
  estado_codigo: string
  created_at: string
  updated_at: string
}

export interface DecisionPm {
  id: string
  titulo: string
  contexto: string
  decision: string
  alternativas: string
  impacto: string
  estado_codigo: string
  owner: string | null
  fecha_decision: string
  links: string[]
  tags: string[]
  iniciativa_id: string | null
  entrega_id: string | null
  ejecucion_validacion_id: string | null
  created_at: string
  updated_at: string
}

export interface AuditoriaPm {
  id: string
  tipo_auditoria_codigo: string
  alcance: string
  checklist: string
  evidencias: string
  responsable: string | null
  estado_codigo: string
  fecha_auditoria: string
  created_at: string
  updated_at: string
}

export interface HallazgoAuditoriaPm {
  id: string
  auditoria_id: string
  titulo: string
  descripcion: string
  severidad_codigo: string
  estado_codigo: string
  modulo_id: string | null
  decision_id: string | null
  ejecucion_validacion_id: string | null
  evidencia_url: string | null
  created_at: string
  updated_at: string
}

export interface IntegracionPm {
  id: string
  clave: string
  nombre: string
  descripcion: string | null
  habilitado: boolean
  configuracion_publica: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface KpiConfigPm {
  id: string
  clave_kpi: string
  nombre: string
  unidad: 'conteo' | 'porcentaje'
  meta_7: number | null
  meta_30: number | null
  meta_90: number | null
  umbral_ok: number | null
  umbral_atencion: number | null
  activo: boolean
  created_at: string
  updated_at: string
}

export type AlcancePeriodoRice = 'semana' | 'mes' | 'trimestre'
export type EsfuerzoUnidadRice = 'persona_dia' | 'persona_semana'

export interface ConfiguracionRice {
  id: string
  alcance_periodo: AlcancePeriodoRice
  esfuerzo_unidad: EsfuerzoUnidadRice
  updated_at: string
}

export const alcancesPeriodoRice: AlcancePeriodoRice[] = ['semana', 'mes', 'trimestre']
export const unidadesEsfuerzoRice: EsfuerzoUnidadRice[] = ['persona_dia', 'persona_semana']

export function formatearAlcancePeriodoRice(periodo: AlcancePeriodoRice) {
  if (periodo === 'semana') {
    return 'semana'
  }

  if (periodo === 'trimestre') {
    return 'trimestre'
  }

  return 'mes'
}

export function formatearEsfuerzoUnidadRice(unidad: EsfuerzoUnidadRice) {
  if (unidad === 'persona_dia') {
    return 'Persona-días'
  }

  return 'Persona-semanas'
}

export const estadosRegistro: EstadoRegistro[] = ['pendiente', 'en_progreso', 'completado']
export const prioridadesRegistro: PrioridadRegistro[] = ['baja', 'media', 'alta']
