import type {
  CatalogoEtapaPmEntrada,
  CatalogoModuloPmEntrada,
  CatalogoSeveridadPmEntrada,
  CatalogoVentanaPmEntrada,
  ConfiguracionRiceEntrada,
  IntegracionPmEntrada,
  KpiConfigPmEntrada
} from '@/compartido/validacion/esquemas'
import { repositorioAjustes } from '@/infraestructura/repositorios/repositorioAjustes'
import { obtenerRegistroTablaPorId, registrarCambioEntidadBestEffort } from '@/aplicacion/casos-uso/historialCambios'

async function registrarCambioAjuste(
  tabla: string,
  entidad: string,
  accion: 'crear' | 'editar' | 'eliminar',
  entidadId: string,
  antes?: unknown | null,
  despues?: unknown | null
) {
  await registrarCambioEntidadBestEffort({
    tabla,
    moduloCodigo: 'ajustes',
    entidad,
    entidadId,
    accion,
    antes,
    despues
  })
}

export function listarModulosPm() {
  return repositorioAjustes.listarModulos()
}

export function crearModuloPm(entrada: CatalogoModuloPmEntrada) {
  return repositorioAjustes.crearModulo(entrada).then(async (creado) => {
    await registrarCambioAjuste('pm_catalogo_modulos', 'catalogo_modulo', 'crear', creado.id, null, creado)
    return creado
  })
}

export async function editarModuloPm(id: string, entrada: CatalogoModuloPmEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_catalogo_modulos', id)
  const actualizado = await repositorioAjustes.editarModulo(id, entrada)
  await registrarCambioAjuste('pm_catalogo_modulos', 'catalogo_modulo', 'editar', actualizado.id, antes, actualizado)
  return actualizado
}

export async function eliminarModuloPm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_catalogo_modulos', id)
  await repositorioAjustes.eliminarModulo(id)
  await registrarCambioAjuste('pm_catalogo_modulos', 'catalogo_modulo', 'eliminar', id, antes)
}

export function listarSeveridadesPm() {
  return repositorioAjustes.listarSeveridades()
}

export function listarVentanasPm() {
  return repositorioAjustes.listarVentanas()
}

export function crearVentanaPm(entrada: CatalogoVentanaPmEntrada) {
  return repositorioAjustes.crearVentana(entrada).then(async (creada) => {
    await registrarCambioAjuste('pm_catalogo_ventanas', 'catalogo_ventana', 'crear', creada.id, null, creada)
    return creada
  })
}

export async function editarVentanaPm(id: string, entrada: CatalogoVentanaPmEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_catalogo_ventanas', id)
  const actualizada = await repositorioAjustes.editarVentana(id, entrada)
  await registrarCambioAjuste('pm_catalogo_ventanas', 'catalogo_ventana', 'editar', actualizada.id, antes, actualizada)
  return actualizada
}

export async function eliminarVentanaPm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_catalogo_ventanas', id)
  await repositorioAjustes.eliminarVentana(id)
  await registrarCambioAjuste('pm_catalogo_ventanas', 'catalogo_ventana', 'eliminar', id, antes)
}

export function listarEtapasPm() {
  return repositorioAjustes.listarEtapas()
}

export function crearEtapaPm(entrada: CatalogoEtapaPmEntrada) {
  return repositorioAjustes.crearEtapa(entrada).then(async (creada) => {
    await registrarCambioAjuste('pm_catalogo_etapas', 'catalogo_etapa', 'crear', creada.id, null, creada)
    return creada
  })
}

export async function editarEtapaPm(id: string, entrada: CatalogoEtapaPmEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_catalogo_etapas', id)
  const actualizada = await repositorioAjustes.editarEtapa(id, entrada)
  await registrarCambioAjuste('pm_catalogo_etapas', 'catalogo_etapa', 'editar', actualizada.id, antes, actualizada)
  return actualizada
}

export async function eliminarEtapaPm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_catalogo_etapas', id)
  await repositorioAjustes.eliminarEtapa(id)
  await registrarCambioAjuste('pm_catalogo_etapas', 'catalogo_etapa', 'eliminar', id, antes)
}

export function crearSeveridadPm(entrada: CatalogoSeveridadPmEntrada) {
  return repositorioAjustes.crearSeveridad(entrada).then(async (creada) => {
    await registrarCambioAjuste('pm_catalogo_severidades', 'catalogo_severidad', 'crear', creada.id, null, creada)
    return creada
  })
}

export async function editarSeveridadPm(id: string, entrada: CatalogoSeveridadPmEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_catalogo_severidades', id)
  const actualizada = await repositorioAjustes.editarSeveridad(id, entrada)
  await registrarCambioAjuste('pm_catalogo_severidades', 'catalogo_severidad', 'editar', actualizada.id, antes, actualizada)
  return actualizada
}

export async function eliminarSeveridadPm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_catalogo_severidades', id)
  await repositorioAjustes.eliminarSeveridad(id)
  await registrarCambioAjuste('pm_catalogo_severidades', 'catalogo_severidad', 'eliminar', id, antes)
}

export function listarEstadosPm(ambito: string) {
  return repositorioAjustes.listarEstadosPorAmbito(ambito)
}

export function listarKpisPm() {
  return repositorioAjustes.listarKpis()
}

export function crearKpiPm(entrada: KpiConfigPmEntrada) {
  return repositorioAjustes.crearKpi(entrada).then(async (creado) => {
    await registrarCambioAjuste('kpis_config', 'kpi_config', 'crear', creado.id, null, creado)
    return creado
  })
}

export async function editarKpiPm(id: string, entrada: KpiConfigPmEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('kpis_config', id)
  const actualizado = await repositorioAjustes.editarKpi(id, entrada)
  await registrarCambioAjuste('kpis_config', 'kpi_config', 'editar', actualizado.id, antes, actualizado)
  return actualizado
}

export async function eliminarKpiPm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('kpis_config', id)
  await repositorioAjustes.eliminarKpi(id)
  await registrarCambioAjuste('kpis_config', 'kpi_config', 'eliminar', id, antes)
}

export function listarIntegracionesPm() {
  return repositorioAjustes.listarIntegraciones()
}

export function crearIntegracionPm(entrada: IntegracionPmEntrada) {
  return repositorioAjustes.crearIntegracion(entrada).then(async (creada) => {
    await registrarCambioAjuste('pm_integraciones_config', 'integracion', 'crear', creada.id, null, creada)
    return creada
  })
}

export async function editarIntegracionPm(id: string, entrada: IntegracionPmEntrada) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_integraciones_config', id)
  const actualizada = await repositorioAjustes.editarIntegracion(id, entrada)
  await registrarCambioAjuste('pm_integraciones_config', 'integracion', 'editar', actualizada.id, antes, actualizada)
  return actualizada
}

export async function eliminarIntegracionPm(id: string) {
  const antes = await obtenerRegistroTablaPorId<Record<string, unknown>>('pm_integraciones_config', id)
  await repositorioAjustes.eliminarIntegracion(id)
  await registrarCambioAjuste('pm_integraciones_config', 'integracion', 'eliminar', id, antes)
}

export function cargarConfiguracionRice() {
  return repositorioAjustes.obtenerConfiguracionRice()
}

export async function actualizarConfiguracionRice(entrada: ConfiguracionRiceEntrada) {
  const antes = await repositorioAjustes.obtenerConfiguracionRiceActual()
  const actualizada = await repositorioAjustes.guardarConfiguracionRice(entrada)
  await registrarCambioAjuste(
    'configuracion_rice',
    'configuracion_rice',
    antes?.id ? 'editar' : 'crear',
    actualizada.id,
    antes,
    actualizada
  )
  return actualizada
}
