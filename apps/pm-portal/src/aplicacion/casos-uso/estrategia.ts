import type {
  HipotesisEntrada,
  KeyResultEntrada,
  KpiEstrategicoEntrada,
  ObjetivoEstrategicoEntrada,
  PeriodoEstrategicoEntrada
} from '@/compartido/validacion/esquemas'
import { repositorioEstrategia } from '@/infraestructura/repositorios/repositorioEstrategia'
import { obtenerRegistroTablaPorId, registrarCambioEntidadBestEffort } from '@/aplicacion/casos-uso/historialCambios'

const MODULO_ESTRATEGIA = 'estrategia'

export function listarPeriodosEstrategicos() {
  return repositorioEstrategia.listarPeriodos()
}

export async function crearPeriodoEstrategico(entrada: PeriodoEstrategicoEntrada) {
  const creado = await repositorioEstrategia.crearPeriodo(entrada)
  await registrarCambioEntidadBestEffort({
    tabla: 'pm_periodos_estrategicos',
    moduloCodigo: MODULO_ESTRATEGIA,
    entidad: 'periodo_estrategico',
    entidadId: creado.id,
    accion: 'crear',
    despues: creado
  })
  return creado
}

export async function editarPeriodoEstrategico(id: string, entrada: PeriodoEstrategicoEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_periodos_estrategicos', id)
  const actualizado = await repositorioEstrategia.editarPeriodo(id, entrada)
  await registrarCambioEntidadBestEffort({
    tabla: 'pm_periodos_estrategicos',
    moduloCodigo: MODULO_ESTRATEGIA,
    entidad: 'periodo_estrategico',
    entidadId: actualizado.id,
    accion: 'editar',
    antes,
    despues: actualizado
  })
  return actualizado
}

export async function eliminarPeriodoEstrategico(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_periodos_estrategicos', id)
  await repositorioEstrategia.eliminarPeriodo(id)
  await registrarCambioEntidadBestEffort({
    tabla: 'pm_periodos_estrategicos',
    moduloCodigo: MODULO_ESTRATEGIA,
    entidad: 'periodo_estrategico',
    entidadId: id,
    accion: 'eliminar',
    antes
  })
}

export function listarObjetivosEstrategicos() {
  return repositorioEstrategia.listarObjetivos()
}

export async function crearObjetivoEstrategico(entrada: ObjetivoEstrategicoEntrada) {
  const creado = await repositorioEstrategia.crearObjetivo(entrada)
  await registrarCambioEntidadBestEffort({
    tabla: 'pm_objetivos_estrategicos',
    moduloCodigo: MODULO_ESTRATEGIA,
    entidad: 'objetivo_estrategico',
    entidadId: creado.id,
    accion: 'crear',
    despues: creado
  })
  return creado
}

export async function editarObjetivoEstrategico(id: string, entrada: ObjetivoEstrategicoEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_objetivos_estrategicos', id)
  const actualizado = await repositorioEstrategia.editarObjetivo(id, entrada)
  await registrarCambioEntidadBestEffort({
    tabla: 'pm_objetivos_estrategicos',
    moduloCodigo: MODULO_ESTRATEGIA,
    entidad: 'objetivo_estrategico',
    entidadId: actualizado.id,
    accion: 'editar',
    antes,
    despues: actualizado
  })
  return actualizado
}

export async function eliminarObjetivoEstrategico(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_objetivos_estrategicos', id)
  await repositorioEstrategia.eliminarObjetivo(id)
  await registrarCambioEntidadBestEffort({
    tabla: 'pm_objetivos_estrategicos',
    moduloCodigo: MODULO_ESTRATEGIA,
    entidad: 'objetivo_estrategico',
    entidadId: id,
    accion: 'eliminar',
    antes
  })
}

export function listarKeyResults() {
  return repositorioEstrategia.listarKeyResults()
}

export async function crearKeyResult(entrada: KeyResultEntrada, objetivosRoadmapIds: string[] = [], iniciativaIds: string[] = []) {
  const creado = await repositorioEstrategia.crearKeyResult(entrada)
  await Promise.all([
    repositorioEstrategia.sincronizarObjetivosRoadmapKr(creado.id, creado.objetivo_estrategico_id, objetivosRoadmapIds),
    repositorioEstrategia.sincronizarIniciativasKr(creado.id, iniciativaIds)
  ])

  await registrarCambioEntidadBestEffort({
    tabla: 'pm_key_results',
    moduloCodigo: MODULO_ESTRATEGIA,
    entidad: 'key_result',
    entidadId: creado.id,
    accion: 'crear',
    despues: creado,
    metadata: {
      objetivos_roadmap_ids: objetivosRoadmapIds,
      iniciativa_ids: iniciativaIds
    }
  })

  return creado
}

export async function editarKeyResult(id: string, entrada: KeyResultEntrada, objetivosRoadmapIds: string[] = [], iniciativaIds: string[] = []) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_key_results', id)
  const actualizado = await repositorioEstrategia.editarKeyResult(id, entrada)

  await Promise.all([
    repositorioEstrategia.sincronizarObjetivosRoadmapKr(actualizado.id, actualizado.objetivo_estrategico_id, objetivosRoadmapIds),
    repositorioEstrategia.sincronizarIniciativasKr(actualizado.id, iniciativaIds)
  ])

  await registrarCambioEntidadBestEffort({
    tabla: 'pm_key_results',
    moduloCodigo: MODULO_ESTRATEGIA,
    entidad: 'key_result',
    entidadId: actualizado.id,
    accion: 'editar',
    antes,
    despues: actualizado,
    metadata: {
      objetivos_roadmap_ids: objetivosRoadmapIds,
      iniciativa_ids: iniciativaIds
    }
  })

  return actualizado
}

export async function eliminarKeyResult(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_key_results', id)
  await repositorioEstrategia.eliminarKeyResult(id)
  await registrarCambioEntidadBestEffort({
    tabla: 'pm_key_results',
    moduloCodigo: MODULO_ESTRATEGIA,
    entidad: 'key_result',
    entidadId: id,
    accion: 'eliminar',
    antes
  })
}

export function listarKpisEstrategicos() {
  return repositorioEstrategia.listarKpis()
}

export async function crearKpiEstrategico(entrada: KpiEstrategicoEntrada) {
  const creado = await repositorioEstrategia.crearKpi(entrada)
  await registrarCambioEntidadBestEffort({
    tabla: 'pm_kpis_estrategicos',
    moduloCodigo: MODULO_ESTRATEGIA,
    entidad: 'kpi_estrategico',
    entidadId: creado.id,
    accion: 'crear',
    despues: creado
  })
  return creado
}

export async function editarKpiEstrategico(id: string, entrada: KpiEstrategicoEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_kpis_estrategicos', id)
  const actualizado = await repositorioEstrategia.editarKpi(id, entrada)
  await registrarCambioEntidadBestEffort({
    tabla: 'pm_kpis_estrategicos',
    moduloCodigo: MODULO_ESTRATEGIA,
    entidad: 'kpi_estrategico',
    entidadId: actualizado.id,
    accion: 'editar',
    antes,
    despues: actualizado
  })
  return actualizado
}

export async function eliminarKpiEstrategico(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_kpis_estrategicos', id)
  await repositorioEstrategia.eliminarKpi(id)
  await registrarCambioEntidadBestEffort({
    tabla: 'pm_kpis_estrategicos',
    moduloCodigo: MODULO_ESTRATEGIA,
    entidad: 'kpi_estrategico',
    entidadId: id,
    accion: 'eliminar',
    antes
  })
}

export function listarHipotesisPm() {
  return repositorioEstrategia.listarHipotesis()
}

export async function crearHipotesisPm(entrada: HipotesisEntrada, iniciativaIds: string[] = []) {
  const creada = await repositorioEstrategia.crearHipotesis(entrada)
  await repositorioEstrategia.sincronizarIniciativasHipotesis(creada.id, iniciativaIds)
  await registrarCambioEntidadBestEffort({
    tabla: 'pm_hipotesis',
    moduloCodigo: MODULO_ESTRATEGIA,
    entidad: 'hipotesis',
    entidadId: creada.id,
    accion: 'crear',
    despues: creada,
    metadata: {
      iniciativa_ids: iniciativaIds
    }
  })
  return creada
}

export async function editarHipotesisPm(id: string, entrada: HipotesisEntrada, iniciativaIds: string[] = []) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_hipotesis', id)
  const actualizada = await repositorioEstrategia.editarHipotesis(id, entrada)
  await repositorioEstrategia.sincronizarIniciativasHipotesis(actualizada.id, iniciativaIds)
  await registrarCambioEntidadBestEffort({
    tabla: 'pm_hipotesis',
    moduloCodigo: MODULO_ESTRATEGIA,
    entidad: 'hipotesis',
    entidadId: actualizada.id,
    accion: 'editar',
    antes,
    despues: actualizada,
    metadata: {
      iniciativa_ids: iniciativaIds
    }
  })
  return actualizada
}

export async function eliminarHipotesisPm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_hipotesis', id)
  await repositorioEstrategia.eliminarHipotesis(id)
  await registrarCambioEntidadBestEffort({
    tabla: 'pm_hipotesis',
    moduloCodigo: MODULO_ESTRATEGIA,
    entidad: 'hipotesis',
    entidadId: id,
    accion: 'eliminar',
    antes
  })
}

export function listarRelObjetivoRoadmapKr() {
  return repositorioEstrategia.listarRelObjetivoRoadmapKr()
}

export function listarRelIniciativaKr() {
  return repositorioEstrategia.listarRelIniciativaKr()
}

export function listarRelIniciativaHipotesis() {
  return repositorioEstrategia.listarRelIniciativaHipotesis()
}