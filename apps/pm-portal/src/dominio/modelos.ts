export type RolUsuario = 'lector' | 'editor' | 'admin'

export type EstadoRegistro = 'pendiente' | 'en_progreso' | 'completado'
export type PrioridadRegistro = 'baja' | 'media' | 'alta'

export interface Objetivo {
  id: string
  nombre: string
  descripcion: string
  estado: EstadoRegistro
  prioridad: PrioridadRegistro
  fecha_inicio?: string | null
  fecha_fin?: string | null
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
  fecha_inicio?: string | null
  fecha_fin?: string | null
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
  fecha_inicio?: string | null
  fecha_fin?: string | null
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

export type TipoRequerimientoNoFuncionalPm =
  | 'seguridad'
  | 'rendimiento'
  | 'disponibilidad'
  | 'auditoria'
  | 'accesibilidad'
  | 'mantenibilidad'

export interface HistoriaUsuarioPm {
  id: string
  codigo: string
  titulo: string
  como_usuario: string
  quiero: string
  para: string
  descripcion: string | null
  prioridad: PrioridadRegistro
  estado: EstadoRegistro
  owner: string | null
  iniciativa_id: string | null
  entrega_id: string | null
  hipotesis_discovery_id: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface CriterioAceptacionPm {
  id: string
  historia_usuario_id: string
  descripcion: string
  orden: number
  obligatorio: boolean
  estado_validacion: EstadoRegistro | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface CasoUsoPm {
  id: string
  codigo: string
  titulo: string
  actor_principal: string
  actores_secundarios: string | null
  precondiciones: string
  flujo_principal: string
  flujos_alternos: string | null
  postcondiciones: string
  prioridad: PrioridadRegistro
  estado: EstadoRegistro
  iniciativa_id: string | null
  entrega_id: string | null
  historia_usuario_id: string | null
  owner: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface ReglaNegocioPm {
  id: string
  codigo: string
  nombre: string
  descripcion: string
  categoria: string
  criticidad: PrioridadRegistro
  modulo_codigo: string | null
  estado: EstadoRegistro
  iniciativa_id: string | null
  historia_usuario_id: string | null
  decision_id: string | null
  owner: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface RequerimientoNoFuncionalPm {
  id: string
  codigo: string
  nombre: string
  tipo: TipoRequerimientoNoFuncionalPm
  descripcion: string
  criterio_medicion: string
  prioridad: PrioridadRegistro
  estado: EstadoRegistro
  iniciativa_id: string | null
  entrega_id: string | null
  owner: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export type TipoReleasePm = 'mvp' | 'mejora' | 'correccion' | 'interno'
export type EstadoReleasePm = 'borrador' | 'planificado' | 'listo_para_salida' | 'lanzado' | 'revertido' | 'cerrado'
export type TipoChecklistSalidaPm = 'funcional' | 'datos' | 'validacion' | 'comunicacion' | 'soporte' | 'rollback'
export type EstadoEstabilizacionReleasePm = 'estable' | 'observacion' | 'alerta'
export type EstadoBugPm = 'nuevo' | 'triage' | 'en_progreso' | 'resuelto' | 'cerrado'
export type EstadoMejoraPm = 'backlog' | 'priorizada' | 'en_progreso' | 'implementada' | 'cerrada'
export type EstadoDeudaTecnicaPm = 'identificada' | 'priorizada' | 'en_progreso' | 'resuelta' | 'descartada'
export type EstadoBloqueoPm = 'abierto' | 'en_seguimiento' | 'escalado' | 'resuelto'
export type EstadoLeccionAprendidaPm = 'capturada' | 'validada' | 'aplicada' | 'archivada'

export interface ReleasePm {
  id: string
  codigo: string
  nombre: string
  descripcion: string
  tipo_release: TipoReleasePm
  estado: EstadoReleasePm
  fecha_programada: string
  fecha_lanzamiento_real: string | null
  iniciativa_id: string | null
  entrega_id: string | null
  owner: string | null
  responsable_aprobacion: string | null
  decision_id: string | null
  rollback_preparado: boolean
  rollback_descripcion: string | null
  rollback_responsable: string | null
  comunicacion_requerida: boolean
  comunicacion_descripcion: string | null
  audiencia_objetivo: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface ReleaseChecklistItemPm {
  id: string
  release_id: string
  tipo_item: TipoChecklistSalidaPm
  descripcion: string
  obligatorio: boolean
  completado: boolean
  evidencia: string | null
  orden: number
  created_at: string
  updated_at: string
}

export interface ReleaseSeguimientoPm {
  id: string
  release_id: string
  fecha_registro: string
  estado_estabilizacion: EstadoEstabilizacionReleasePm
  observaciones: string
  incidencias_detectadas: string
  metrica_clave: string | null
  decision_requerida: boolean
  owner: string | null
  created_at: string
  updated_at: string
}

export interface BugPm {
  id: string
  codigo: string
  titulo: string
  descripcion: string
  estado: EstadoBugPm
  prioridad: PrioridadRegistro
  owner: string | null
  fecha_reporte: string
  fecha_resolucion: string | null
  modulo_codigo: string | null
  iniciativa_id: string | null
  entrega_id: string | null
  release_id: string | null
  auditoria_id: string | null
  hallazgo_id: string | null
  impacto_operativo: string | null
  causa_raiz: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface MejoraPm {
  id: string
  codigo: string
  titulo: string
  descripcion: string
  estado: EstadoMejoraPm
  prioridad: PrioridadRegistro
  owner: string | null
  fecha_solicitud: string
  fecha_cierre: string | null
  modulo_codigo: string | null
  iniciativa_id: string | null
  entrega_id: string | null
  insight_id: string | null
  hipotesis_discovery_id: string | null
  beneficio_esperado: string
  criterio_exito: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface DeudaTecnicaPm {
  id: string
  codigo: string
  titulo: string
  descripcion: string
  estado: EstadoDeudaTecnicaPm
  prioridad: PrioridadRegistro
  owner: string | null
  fecha_identificacion: string
  fecha_objetivo: string | null
  modulo_codigo: string | null
  iniciativa_id: string | null
  entrega_id: string | null
  release_id: string | null
  impacto_tecnico: string
  plan_remediacion: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface BloqueoPm {
  id: string
  codigo: string
  titulo: string
  descripcion: string
  estado: EstadoBloqueoPm
  prioridad: PrioridadRegistro
  owner: string | null
  responsable_desbloqueo: string | null
  fecha_reporte: string
  fecha_resolucion: string | null
  modulo_codigo: string | null
  iniciativa_id: string | null
  entrega_id: string | null
  release_id: string | null
  decision_id: string | null
  impacto_operativo: string
  proximo_paso: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface LeccionAprendidaPm {
  id: string
  codigo: string
  titulo: string
  contexto: string
  aprendizaje: string
  accion_recomendada: string
  estado: EstadoLeccionAprendidaPm
  owner: string | null
  fecha_leccion: string
  modulo_codigo: string | null
  iniciativa_id: string | null
  entrega_id: string | null
  release_id: string | null
  auditoria_id: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export type TipoStakeholderPm =
  | 'sponsor'
  | 'decisor'
  | 'usuario_clave'
  | 'cliente'
  | 'aliado'
  | 'proveedor'
  | 'interno'

export type InfluenciaStakeholderPm = 'baja' | 'media' | 'alta'
export type InteresStakeholderPm = 'bajo' | 'medio' | 'alto'
export type EstadoStakeholderPm = 'activo' | 'en_seguimiento' | 'inactivo'

export interface StakeholderPm {
  id: string
  codigo: string
  nombre: string
  tipo: TipoStakeholderPm
  area: string
  organizacion: string | null
  cargo: string | null
  influencia: InfluenciaStakeholderPm
  interes: InteresStakeholderPm
  estado: EstadoStakeholderPm
  owner: string | null
  correo: string | null
  contacto_referencia: string | null
  modulo_codigo: string | null
  iniciativa_id: string | null
  entrega_id: string | null
  decision_id: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export type CategoriaRiesgoPm = 'negocio' | 'tecnico' | 'operativo' | 'regulatorio' | 'adopcion' | 'dependencia'
export type ProbabilidadRiesgoPm = 'baja' | 'media' | 'alta'
export type ImpactoRiesgoPm = 'bajo' | 'medio' | 'alto'
export type CriticidadGobiernoPm = 'baja' | 'media' | 'alta' | 'critica'
export type EstadoRiesgoPm = 'identificado' | 'en_mitigacion' | 'monitoreo' | 'cerrado'

export interface RiesgoPm {
  id: string
  codigo: string
  titulo: string
  descripcion: string
  categoria: CategoriaRiesgoPm
  probabilidad: ProbabilidadRiesgoPm
  impacto: ImpactoRiesgoPm
  criticidad: CriticidadGobiernoPm
  estado: EstadoRiesgoPm
  owner: string | null
  fecha_identificacion: string
  fecha_objetivo: string | null
  trigger_riesgo: string | null
  plan_mitigacion: string | null
  modulo_codigo: string | null
  iniciativa_id: string | null
  entrega_id: string | null
  release_id: string | null
  decision_id: string | null
  auditoria_id: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export type TipoDependenciaPm = 'equipo' | 'sistema' | 'proveedor' | 'aprobacion' | 'datos' | 'infraestructura' | 'negocio'
export type EstadoDependenciaPm = 'abierta' | 'en_seguimiento' | 'resuelta' | 'bloqueante'

export interface DependenciaPm {
  id: string
  codigo: string
  titulo: string
  descripcion: string
  tipo_dependencia: TipoDependenciaPm
  estado: EstadoDependenciaPm
  criticidad: CriticidadGobiernoPm
  owner: string | null
  responsable_externo: string | null
  fecha_identificacion: string
  fecha_objetivo: string | null
  impacto_si_falla: string
  proximo_paso: string | null
  modulo_codigo: string | null
  iniciativa_id: string | null
  entrega_id: string | null
  release_id: string | null
  decision_id: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export type CategoriaKpiEjecutivoPm =
  | 'estrategia'
  | 'delivery'
  | 'validacion'
  | 'lanzamiento'
  | 'operacion'
  | 'calidad'

export type TendenciaAnaliticaPm = 'sube' | 'estable' | 'baja'
export type EstadoSaludAnaliticaPm = 'saludable' | 'atencion' | 'riesgo'
export type AmbitoHealthScorePm = 'portafolio' | 'roadmap' | 'validacion' | 'lanzamiento' | 'operacion'

export interface KpiEjecutivoPm {
  id: string
  codigo: string
  nombre: string
  descripcion: string
  categoria: CategoriaKpiEjecutivoPm
  modulo_codigo: string | null
  formula_texto: string
  unidad: string
  meta_valor: number | null
  valor_actual: number | null
  valor_anterior: number | null
  tendencia: TendenciaAnaliticaPm
  estado: EstadoSaludAnaliticaPm
  owner: string | null
  fecha_corte: string
  notas: string | null
  created_at: string
  updated_at: string
}

export interface HealthScorePm {
  id: string
  codigo: string
  nombre: string
  ambito: AmbitoHealthScorePm
  modulo_codigo: string | null
  descripcion: string
  peso: number
  valor_actual: number | null
  umbral_saludable: number | null
  umbral_atencion: number | null
  estado: EstadoSaludAnaliticaPm
  owner: string | null
  fecha_corte: string
  notas: string | null
  created_at: string
  updated_at: string
}

export const alcancesPeriodoRice: AlcancePeriodoRice[] = ['semana', 'mes', 'trimestre']
export const unidadesEsfuerzoRice: EsfuerzoUnidadRice[] = ['persona_dia', 'persona_semana']
export const frecuenciasEstrategicas: FrecuenciaEstrategica[] = ['semanal', 'mensual', 'trimestral']
export const tendenciasKpiEstrategico: TendenciaKpiEstrategico[] = ['sube', 'estable', 'baja']
export const categoriasKpiEjecutivoPm: CategoriaKpiEjecutivoPm[] = [
  'estrategia',
  'delivery',
  'validacion',
  'lanzamiento',
  'operacion',
  'calidad'
]
export const tendenciasAnaliticaPm: TendenciaAnaliticaPm[] = ['sube', 'estable', 'baja']
export const estadosSaludAnaliticaPm: EstadoSaludAnaliticaPm[] = ['saludable', 'atencion', 'riesgo']
export const ambitosHealthScorePm: AmbitoHealthScorePm[] = [
  'portafolio',
  'roadmap',
  'validacion',
  'lanzamiento',
  'operacion'
]
export const tiposProblemaOportunidadDiscovery: TipoProblemaOportunidadDiscovery[] = ['problema', 'oportunidad']
export const tiposRequerimientoNoFuncionalPm: TipoRequerimientoNoFuncionalPm[] = [
  'seguridad',
  'rendimiento',
  'disponibilidad',
  'auditoria',
  'accesibilidad',
  'mantenibilidad'
]
export const tiposReleasePm: TipoReleasePm[] = ['mvp', 'mejora', 'correccion', 'interno']
export const estadosReleasePm: EstadoReleasePm[] = [
  'borrador',
  'planificado',
  'listo_para_salida',
  'lanzado',
  'revertido',
  'cerrado'
]
export const tiposChecklistSalidaPm: TipoChecklistSalidaPm[] = [
  'funcional',
  'datos',
  'validacion',
  'comunicacion',
  'soporte',
  'rollback'
]
export const estadosEstabilizacionReleasePm: EstadoEstabilizacionReleasePm[] = [
  'estable',
  'observacion',
  'alerta'
]
export const estadosBugPm: EstadoBugPm[] = ['nuevo', 'triage', 'en_progreso', 'resuelto', 'cerrado']
export const estadosMejoraPm: EstadoMejoraPm[] = ['backlog', 'priorizada', 'en_progreso', 'implementada', 'cerrada']
export const estadosDeudaTecnicaPm: EstadoDeudaTecnicaPm[] = [
  'identificada',
  'priorizada',
  'en_progreso',
  'resuelta',
  'descartada'
]
export const estadosBloqueoPm: EstadoBloqueoPm[] = ['abierto', 'en_seguimiento', 'escalado', 'resuelto']
export const estadosLeccionAprendidaPm: EstadoLeccionAprendidaPm[] = ['capturada', 'validada', 'aplicada', 'archivada']
export const tiposStakeholderPm: TipoStakeholderPm[] = [
  'sponsor',
  'decisor',
  'usuario_clave',
  'cliente',
  'aliado',
  'proveedor',
  'interno'
]
export const influenciasStakeholderPm: InfluenciaStakeholderPm[] = ['baja', 'media', 'alta']
export const interesesStakeholderPm: InteresStakeholderPm[] = ['bajo', 'medio', 'alto']
export const estadosStakeholderPm: EstadoStakeholderPm[] = ['activo', 'en_seguimiento', 'inactivo']
export const categoriasRiesgoPm: CategoriaRiesgoPm[] = [
  'negocio',
  'tecnico',
  'operativo',
  'regulatorio',
  'adopcion',
  'dependencia'
]
export const probabilidadesRiesgoPm: ProbabilidadRiesgoPm[] = ['baja', 'media', 'alta']
export const impactosRiesgoPm: ImpactoRiesgoPm[] = ['bajo', 'medio', 'alto']
export const criticidadesGobiernoPm: CriticidadGobiernoPm[] = ['baja', 'media', 'alta', 'critica']
export const estadosRiesgoPm: EstadoRiesgoPm[] = ['identificado', 'en_mitigacion', 'monitoreo', 'cerrado']
export const tiposDependenciaPm: TipoDependenciaPm[] = [
  'equipo',
  'sistema',
  'proveedor',
  'aprobacion',
  'datos',
  'infraestructura',
  'negocio'
]
export const estadosDependenciaPm: EstadoDependenciaPm[] = ['abierta', 'en_seguimiento', 'resuelta', 'bloqueante']

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

export function formatearTipoRelease(tipo: TipoReleasePm) {
  return formatearEstadoRegistro(tipo)
}

export function formatearEstadoRelease(estado: EstadoReleasePm) {
  return formatearEstadoRegistro(estado)
}

export function formatearTipoChecklistSalida(tipo: TipoChecklistSalidaPm) {
  return formatearEstadoRegistro(tipo)
}

export function formatearEstadoEstabilizacionRelease(estado: EstadoEstabilizacionReleasePm) {
  return formatearEstadoRegistro(estado)
}

export function formatearEstadoBug(estado: EstadoBugPm) {
  return formatearEstadoRegistro(estado)
}

export function formatearEstadoMejora(estado: EstadoMejoraPm) {
  return formatearEstadoRegistro(estado)
}

export function formatearEstadoDeudaTecnica(estado: EstadoDeudaTecnicaPm) {
  return formatearEstadoRegistro(estado)
}

export function formatearEstadoBloqueo(estado: EstadoBloqueoPm) {
  return formatearEstadoRegistro(estado)
}

export function formatearEstadoLeccionAprendida(estado: EstadoLeccionAprendidaPm) {
  return formatearEstadoRegistro(estado)
}

export function formatearTipoStakeholder(tipo: TipoStakeholderPm) {
  return formatearEstadoRegistro(tipo)
}

export function formatearInfluenciaStakeholder(influencia: InfluenciaStakeholderPm) {
  return formatearEstadoRegistro(influencia)
}

export function formatearInteresStakeholder(interes: InteresStakeholderPm) {
  return formatearEstadoRegistro(interes)
}

export function formatearEstadoStakeholder(estado: EstadoStakeholderPm) {
  return formatearEstadoRegistro(estado)
}

export function formatearCategoriaRiesgo(categoria: CategoriaRiesgoPm) {
  return formatearEstadoRegistro(categoria)
}

export function formatearProbabilidadRiesgo(probabilidad: ProbabilidadRiesgoPm) {
  return formatearEstadoRegistro(probabilidad)
}

export function formatearImpactoRiesgo(impacto: ImpactoRiesgoPm) {
  return formatearEstadoRegistro(impacto)
}

export function formatearCriticidadGobierno(criticidad: CriticidadGobiernoPm) {
  return formatearEstadoRegistro(criticidad)
}

export function formatearEstadoRiesgo(estado: EstadoRiesgoPm) {
  return formatearEstadoRegistro(estado)
}

export function formatearTipoDependencia(tipo: TipoDependenciaPm) {
  return formatearEstadoRegistro(tipo)
}

export function formatearEstadoDependencia(estado: EstadoDependenciaPm) {
  return formatearEstadoRegistro(estado)
}

export function formatearCategoriaKpiEjecutivo(categoria: CategoriaKpiEjecutivoPm) {
  return formatearEstadoRegistro(categoria)
}

export function formatearTendenciaAnalitica(tendencia: TendenciaAnaliticaPm) {
  return formatearEstadoRegistro(tendencia)
}

export function formatearEstadoSaludAnalitica(estado: EstadoSaludAnaliticaPm) {
  return formatearEstadoRegistro(estado)
}

export function formatearAmbitoHealthScore(ambito: AmbitoHealthScorePm) {
  return formatearEstadoRegistro(ambito)
}
