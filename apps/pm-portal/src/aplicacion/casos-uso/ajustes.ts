import type {
  CatalogoModuloPmEntrada,
  CatalogoSeveridadPmEntrada,
  IntegracionPmEntrada,
  KpiConfigPmEntrada
} from '@/compartido/validacion/esquemas'
import { repositorioAjustes } from '@/infraestructura/repositorios/repositorioAjustes'

export function listarModulosPm() {
  return repositorioAjustes.listarModulos()
}

export function crearModuloPm(entrada: CatalogoModuloPmEntrada) {
  return repositorioAjustes.crearModulo(entrada)
}

export function editarModuloPm(id: string, entrada: CatalogoModuloPmEntrada) {
  return repositorioAjustes.editarModulo(id, entrada)
}

export function eliminarModuloPm(id: string) {
  return repositorioAjustes.eliminarModulo(id)
}

export function listarSeveridadesPm() {
  return repositorioAjustes.listarSeveridades()
}

export function crearSeveridadPm(entrada: CatalogoSeveridadPmEntrada) {
  return repositorioAjustes.crearSeveridad(entrada)
}

export function editarSeveridadPm(id: string, entrada: CatalogoSeveridadPmEntrada) {
  return repositorioAjustes.editarSeveridad(id, entrada)
}

export function eliminarSeveridadPm(id: string) {
  return repositorioAjustes.eliminarSeveridad(id)
}

export function listarEstadosPm(ambito: string) {
  return repositorioAjustes.listarEstadosPorAmbito(ambito)
}

export function listarKpisPm() {
  return repositorioAjustes.listarKpis()
}

export function crearKpiPm(entrada: KpiConfigPmEntrada) {
  return repositorioAjustes.crearKpi(entrada)
}

export function editarKpiPm(id: string, entrada: KpiConfigPmEntrada) {
  return repositorioAjustes.editarKpi(id, entrada)
}

export function eliminarKpiPm(id: string) {
  return repositorioAjustes.eliminarKpi(id)
}

export function listarIntegracionesPm() {
  return repositorioAjustes.listarIntegraciones()
}

export function crearIntegracionPm(entrada: IntegracionPmEntrada) {
  return repositorioAjustes.crearIntegracion(entrada)
}

export function editarIntegracionPm(id: string, entrada: IntegracionPmEntrada) {
  return repositorioAjustes.editarIntegracion(id, entrada)
}

export function eliminarIntegracionPm(id: string) {
  return repositorioAjustes.eliminarIntegracion(id)
}
