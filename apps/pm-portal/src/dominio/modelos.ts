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
  ventana_planificada_id: string | null
  etapa_id: string | null
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
  ventana_planificada_id: string | null
  ventana_real_id: string | null
  nombre: string
  descripcion: string
  fecha_objetivo: string | null
  fecha_completado: string | null
  estado: EstadoRegistro
  prioridad: PrioridadRegistro
  created_at: string
  updated_at: string
}

export interface CatalogoVentanaPm {
  id: string
  etiqueta_visible: string
  tipo: string
  anio: number | null
  orden: number
  fecha_inicio: string | null
  fecha_fin: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface CatalogoEtapaPm {
  id: string
  etiqueta_visible: string
  orden: number
  activo: boolean
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

export type AccionHistorialCambio = 'crear' | 'editar' | 'eliminar'

export interface HistorialCambioPm {
  id: string
  modulo_codigo: string
  entidad: string
  entidad_id: string
  accion: AccionHistorialCambio
  resumen: string
  actor_user_id: string | null
  actor_email: string | null
  antes_json: unknown | null
  despues_json: unknown | null
  metadata_json: unknown | null
  created_at: string
}

export interface PeriodoEstrategicoPm {
  id: string
  nombre: string
  descripcion: string | null
  fecha_inicio: string
  fecha_fin: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface ObjetivoEstrategicoPm {
  id: string
  periodo_id: string
  codigo: string
  titulo: string
  descripcion: string
  prioridad: PrioridadRegistro
  estado: EstadoRegistro
  owner: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export type FrecuenciaEstrategica = 'semanal' | 'mensual' | 'trimestral'

export interface KeyResultPm {
  id: string
  objetivo_estrategico_id: string
  nombre: string
  metrica: string
  unidad: string
  baseline: number | null
  meta: number | null
  valor_actual: number | null
  frecuencia: FrecuenciaEstrategica
  estado: EstadoRegistro
  owner: string | null
  created_at: string
  updated_at: string
}

export type TendenciaKpiEstrategico = 'sube' | 'estable' | 'baja'

export interface KpiEstrategicoPm {
  id: string
  periodo_id: string
  nombre: string
  definicion: string
  formula: string
  fuente: string
  unidad: string
  meta: number | null
  umbral_bajo: number | null
  umbral_alto: number | null
  valor_actual: number | null
  tendencia: TendenciaKpiEstrategico
  estado: EstadoRegistro
  owner: string | null
  created_at: string
  updated_at: string
}

export interface HipotesisPm {
  id: string
  periodo_id: string
  titulo: string
  problema: string
  hipotesis: string
  impacto_esperado: string
  criterio_exito: string
  estado: EstadoRegistro
  prioridad: PrioridadRegistro
  owner: string | null
  evidencia_url: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface RelObjetivoRoadmapKrPm {
  id: string
  objetivo_roadmap_id: string
  objetivo_estrategico_id: string
  key_result_id: string
  created_at: string
}

export interface RelIniciativaKrPm {
  id: string
  iniciativa_id: string
  key_result_id: string
  created_at: string
}

export interface RelIniciativaHipotesisPm {
  id: string
  iniciativa_id: string
  hipotesis_id: string
  created_at: string
}

export type TipoProblemaOportunidadDiscovery = 'problema' | 'oportunidad'

export interface SegmentoDiscoveryPm {
  id: string
  nombre: string
  descripcion: string | null
  necesidades: string | null
  dolores: string | null
  contexto: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface InsightDiscoveryPm {
  id: string
  titulo: string
  descripcion: string
  fuente: string
  tipo: string
  relevancia: PrioridadRegistro
  modulo_codigo: string | null
  segmento_id: string | null
  evidencia_url: string | null
  estado: EstadoRegistro
  owner: string | null
  fecha_hallazgo: string
  notas: string | null
  created_at: string
  updated_at: string
}

export interface ProblemaOportunidadDiscoveryPm {
  id: string
  tipo: TipoProblemaOportunidadDiscovery
  titulo: string
  descripcion: string
  impacto: string
  prioridad: PrioridadRegistro
  segmento_id: string | null
  modulo_codigo: string | null
  estado: EstadoRegistro
  owner: string | null
  created_at: string
  updated_at: string
}

export interface InvestigacionDiscoveryPm {
  id: string
  titulo: string
  tipo_investigacion: string
  fecha_investigacion: string
  segmento_id: string | null
  participantes_resumen: string
  resumen: string
  hallazgos: string
  conclusion: string
  evidencia_url: string | null
  estado: EstadoRegistro
  owner: string | null
  created_at: string
  updated_at: string
}

export interface HipotesisDiscoveryPm {
  id: string
  titulo: string
  problema_id: string | null
  hipotesis: string
  cambio_propuesto: string
  resultado_esperado: string
  criterio_exito: string
  prioridad: PrioridadRegistro
  estado: EstadoRegistro
  owner: string | null
  evidencia_url: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface RelInsightProblemaPm {
  id: string
  insight_id: string
  problema_oportunidad_id: string
  created_at: string
}

export interface RelInvestigacionInsightPm {
  id: string
  investigacion_id: string
  insight_id: string
  created_at: string
}

export interface RelHipotesisDiscoveryIniciativaPm {
  id: string
  hipotesis_discovery_id: string
  iniciativa_id: string
  created_at: string
}

export interface RelProblemaObjetivoEstrategicoPm {
  id: string
  problema_oportunidad_id: string
  objetivo_estrategico_id: string
  created_at: string
}

export interface RelInsightDecisionPm {
  id: string
  insight_id: string
  decision_id: string
  created_at: string
}

export const alcancesPeriodoRice: AlcancePeriodoRice[] = ['semana', 'mes', 'trimestre']
export const unidadesEsfuerzoRice: EsfuerzoUnidadRice[] = ['persona_dia', 'persona_semana']
export const frecuenciasEstrategicas: FrecuenciaEstrategica[] = ['semanal', 'mensual', 'trimestral']
export const tendenciasKpiEstrategico: TendenciaKpiEstrategico[] = ['sube', 'estable', 'baja']
export const tiposProblemaOportunidadDiscovery: TipoProblemaOportunidadDiscovery[] = ['problema', 'oportunidad']

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

export function formatearEstadoRegistro(estado: string) {
  return estado
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letra) => letra.toUpperCase())
}

export function formatearPrioridadRegistro(prioridad: string) {
  return prioridad.charAt(0).toUpperCase() + prioridad.slice(1)
}
