import type {
  CasoUsoEntrada,
  CriterioAceptacionEntrada,
  HistoriaUsuarioEntrada,
  ReglaNegocioEntrada,
  RequerimientoNoFuncionalEntrada
} from '@/compartido/validacion/esquemas'
import type { CriterioAceptacionPm } from '@/dominio/modelos'
import { repositorioRequerimientos } from '@/infraestructura/repositorios/repositorioRequerimientos'
import { obtenerRegistroTablaPorId, registrarCambioEntidadBestEffort } from '@/aplicacion/casos-uso/historialCambios'

const MODULO_REQUERIMIENTOS = 'requerimientos'
const TABLA_HISTORIAS = 'pm_historias_usuario'
const TABLA_CRITERIOS = 'pm_criterios_aceptacion'
const TABLA_CASOS_USO = 'pm_casos_uso'
const TABLA_REGLAS = 'pm_reglas_negocio'
const TABLA_RNF = 'pm_requerimientos_no_funcionales'

function registrarCambioRequerimientos(
  tabla: string,
  entidad: string,
  accion: 'crear' | 'editar' | 'eliminar',
  entidadId: string,
  antes?: unknown | null,
  despues?: unknown | null,
  metadata?: Record<string, unknown> | null
) {
  return registrarCambioEntidadBestEffort({
    tabla,
    moduloCodigo: MODULO_REQUERIMIENTOS,
    entidad,
    entidadId,
    accion,
    antes,
    despues,
    metadata
  })
}

async function registrarCambiosCriterios(
  previas: CriterioAceptacionPm[],
  actuales: CriterioAceptacionPm[]
) {
  const previasPorId = new Map(previas.map((criterio) => [criterio.id, criterio]))
  const actualesPorId = new Map(actuales.map((criterio) => [criterio.id, criterio]))
  const tareas: Promise<unknown>[] = []

  for (const criterio of actuales) {
    const previa = previasPorId.get(criterio.id)

    if (!previa) {
      tareas.push(registrarCambioRequerimientos(TABLA_CRITERIOS, 'criterio_aceptacion', 'crear', criterio.id, null, criterio))
      continue
    }

    if (JSON.stringify(previa) !== JSON.stringify(criterio)) {
      tareas.push(registrarCambioRequerimientos(TABLA_CRITERIOS, 'criterio_aceptacion', 'editar', criterio.id, previa, criterio))
    }
  }

  for (const criterio of previas) {
    if (!actualesPorId.has(criterio.id)) {
      tareas.push(registrarCambioRequerimientos(TABLA_CRITERIOS, 'criterio_aceptacion', 'eliminar', criterio.id, criterio, null))
    }
  }

  await Promise.all(tareas)
}

export function listarHistoriasUsuario() {
  return repositorioRequerimientos.listarHistoriasUsuario()
}

export function listarCriteriosAceptacion(historiaUsuarioId?: string) {
  return repositorioRequerimientos.listarCriteriosAceptacion(historiaUsuarioId)
}

export async function crearHistoriaUsuario(entrada: HistoriaUsuarioEntrada, criterios: CriterioAceptacionEntrada[] = []) {
  const creada = await repositorioRequerimientos.crearHistoriaUsuario(entrada)
  const criteriosSincronizados = await repositorioRequerimientos.sincronizarCriteriosAceptacion(creada.id, criterios)

  await Promise.all([
    registrarCambioRequerimientos(TABLA_HISTORIAS, 'historia_usuario', 'crear', creada.id, null, creada, {
      criterios_aceptacion: criteriosSincronizados.actuales.length
    }),
    registrarCambiosCriterios(criteriosSincronizados.previas, criteriosSincronizados.actuales)
  ])

  return creada
}

export async function editarHistoriaUsuario(id: string, entrada: HistoriaUsuarioEntrada, criterios: CriterioAceptacionEntrada[] = []) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_HISTORIAS, id)
  const actualizada = await repositorioRequerimientos.editarHistoriaUsuario(id, entrada)
  const criteriosSincronizados = await repositorioRequerimientos.sincronizarCriteriosAceptacion(id, criterios)

  await Promise.all([
    registrarCambioRequerimientos(TABLA_HISTORIAS, 'historia_usuario', 'editar', actualizada.id, antes, actualizada, {
      criterios_aceptacion: criteriosSincronizados.actuales.length
    }),
    registrarCambiosCriterios(criteriosSincronizados.previas, criteriosSincronizados.actuales)
  ])

  return actualizada
}

export async function eliminarHistoriaUsuario(id: string) {
  const [antes, criterios] = await Promise.all([
    obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_HISTORIAS, id),
    repositorioRequerimientos.listarCriteriosAceptacion(id)
  ])

  await repositorioRequerimientos.eliminarHistoriaUsuario(id)
  await Promise.all([
    registrarCambioRequerimientos(TABLA_HISTORIAS, 'historia_usuario', 'eliminar', id, antes, null),
    ...criterios.map((criterio) =>
      registrarCambioRequerimientos(TABLA_CRITERIOS, 'criterio_aceptacion', 'eliminar', criterio.id, criterio, null)
    )
  ])
}

export async function crearCriterioAceptacion(historiaUsuarioId: string, entrada: CriterioAceptacionEntrada) {
  const creado = await repositorioRequerimientos.crearCriterioAceptacion(historiaUsuarioId, entrada)
  await registrarCambioRequerimientos(TABLA_CRITERIOS, 'criterio_aceptacion', 'crear', creado.id, null, creado)
  return creado
}

export async function editarCriterioAceptacion(id: string, entrada: CriterioAceptacionEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_CRITERIOS, id)
  const actualizado = await repositorioRequerimientos.editarCriterioAceptacion(id, entrada)
  await registrarCambioRequerimientos(TABLA_CRITERIOS, 'criterio_aceptacion', 'editar', actualizado.id, antes, actualizado)
  return actualizado
}

export async function eliminarCriterioAceptacion(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_CRITERIOS, id)
  await repositorioRequerimientos.eliminarCriterioAceptacion(id)
  await registrarCambioRequerimientos(TABLA_CRITERIOS, 'criterio_aceptacion', 'eliminar', id, antes, null)
}

export async function reordenarCriteriosAceptacion(historiaUsuarioId: string, criterios: CriterioAceptacionEntrada[]) {
  const resultado = await repositorioRequerimientos.sincronizarCriteriosAceptacion(historiaUsuarioId, criterios)
  await registrarCambiosCriterios(resultado.previas, resultado.actuales)
  return resultado.actuales
}

export function listarCasosUso() {
  return repositorioRequerimientos.listarCasosUso()
}

export async function crearCasoUso(entrada: CasoUsoEntrada) {
  const creado = await repositorioRequerimientos.crearCasoUso(entrada)
  await registrarCambioRequerimientos(TABLA_CASOS_USO, 'caso_uso', 'crear', creado.id, null, creado)
  return creado
}

export async function editarCasoUso(id: string, entrada: CasoUsoEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_CASOS_USO, id)
  const actualizado = await repositorioRequerimientos.editarCasoUso(id, entrada)
  await registrarCambioRequerimientos(TABLA_CASOS_USO, 'caso_uso', 'editar', actualizado.id, antes, actualizado)
  return actualizado
}

export async function eliminarCasoUso(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_CASOS_USO, id)
  await repositorioRequerimientos.eliminarCasoUso(id)
  await registrarCambioRequerimientos(TABLA_CASOS_USO, 'caso_uso', 'eliminar', id, antes, null)
}

export function listarReglasNegocio() {
  return repositorioRequerimientos.listarReglasNegocio()
}

export async function crearReglaNegocio(entrada: ReglaNegocioEntrada) {
  const creada = await repositorioRequerimientos.crearReglaNegocio(entrada)
  await registrarCambioRequerimientos(TABLA_REGLAS, 'regla_negocio', 'crear', creada.id, null, creada)
  return creada
}

export async function editarReglaNegocio(id: string, entrada: ReglaNegocioEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_REGLAS, id)
  const actualizada = await repositorioRequerimientos.editarReglaNegocio(id, entrada)
  await registrarCambioRequerimientos(TABLA_REGLAS, 'regla_negocio', 'editar', actualizada.id, antes, actualizada)
  return actualizada
}

export async function eliminarReglaNegocio(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_REGLAS, id)
  await repositorioRequerimientos.eliminarReglaNegocio(id)
  await registrarCambioRequerimientos(TABLA_REGLAS, 'regla_negocio', 'eliminar', id, antes, null)
}

export function listarRequerimientosNoFuncionales() {
  return repositorioRequerimientos.listarRequerimientosNoFuncionales()
}

export async function crearRequerimientoNoFuncional(entrada: RequerimientoNoFuncionalEntrada) {
  const creado = await repositorioRequerimientos.crearRequerimientoNoFuncional(entrada)
  await registrarCambioRequerimientos(TABLA_RNF, 'requerimiento_no_funcional', 'crear', creado.id, null, creado)
  return creado
}

export async function editarRequerimientoNoFuncional(id: string, entrada: RequerimientoNoFuncionalEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_RNF, id)
  const actualizado = await repositorioRequerimientos.editarRequerimientoNoFuncional(id, entrada)
  await registrarCambioRequerimientos(TABLA_RNF, 'requerimiento_no_funcional', 'editar', actualizado.id, antes, actualizado)
  return actualizado
}

export async function eliminarRequerimientoNoFuncional(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>(TABLA_RNF, id)
  await repositorioRequerimientos.eliminarRequerimientoNoFuncional(id)
  await registrarCambioRequerimientos(TABLA_RNF, 'requerimiento_no_funcional', 'eliminar', id, antes, null)
}