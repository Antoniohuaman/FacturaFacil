import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  catalogoModuloPmSchema,
  catalogoSeveridadPmSchema,
  configuracionRiceSchema,
  integracionPmSchema,
  kpiConfigPmSchema,
  type CatalogoModuloPmEntrada,
  type CatalogoSeveridadPmEntrada,
  type ConfiguracionRiceEntrada,
  type IntegracionPmEntrada,
  type KpiConfigPmEntrada
} from '@/compartido/validacion/esquemas'
import {
  alcancesPeriodoRice,
  formatearEsfuerzoUnidadRice,
  unidadesEsfuerzoRice,
  type CatalogoModuloPm,
  type CatalogoSeveridadPm,
  type ConfiguracionRice,
  type IntegracionPm,
  type KpiConfigPm
} from '@/dominio/modelos'
import {
  actualizarConfiguracionRice,
  cargarConfiguracionRice,
  crearIntegracionPm,
  crearKpiPm,
  crearModuloPm,
  crearSeveridadPm,
  editarIntegracionPm,
  editarKpiPm,
  editarModuloPm,
  editarSeveridadPm,
  eliminarIntegracionPm,
  eliminarKpiPm,
  eliminarModuloPm,
  eliminarSeveridadPm,
  listarIntegracionesPm,
  listarKpisPm,
  listarModulosPm,
  listarSeveridadesPm
} from '@/aplicacion/casos-uso/ajustes'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeAdministrar } from '@/compartido/utilidades/permisosRol'

type ModoModal = 'crear' | 'editar'

const integracionFormularioSchema = integracionPmSchema
  .omit({ configuracion_publica: true })
  .extend({ configuracion_texto: z.string() })

type FormularioIntegracion = z.infer<typeof integracionFormularioSchema>

function convertirTextoAJson(valor: string): Record<string, unknown> | null {
  const texto = valor.trim()
  if (!texto) {
    return null
  }

  try {
    const json = JSON.parse(texto) as unknown
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      return null
    }

    return json as Record<string, unknown>
  } catch {
    return null
  }
}

function convertirJsonATexto(valor: Record<string, unknown> | null) {
  if (!valor) {
    return ''
  }

  return JSON.stringify(valor, null, 2)
}

export function PaginaAjustes() {
  const { rol } = useSesionPortalPM()
  const [modulos, setModulos] = useState<CatalogoModuloPm[]>([])
  const [severidades, setSeveridades] = useState<CatalogoSeveridadPm[]>([])
  const [kpis, setKpis] = useState<KpiConfigPm[]>([])
  const [integraciones, setIntegraciones] = useState<IntegracionPm[]>([])
  const [configuracionRice, setConfiguracionRice] = useState<ConfiguracionRice | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mensajeRice, setMensajeRice] = useState<string | null>(null)

  const [modalModuloAbierto, setModalModuloAbierto] = useState(false)
  const [modoModulo, setModoModulo] = useState<ModoModal>('crear')
  const [moduloActivo, setModuloActivo] = useState<CatalogoModuloPm | null>(null)

  const [modalSeveridadAbierto, setModalSeveridadAbierto] = useState(false)
  const [modoSeveridad, setModoSeveridad] = useState<ModoModal>('crear')
  const [severidadActiva, setSeveridadActiva] = useState<CatalogoSeveridadPm | null>(null)

  const [modalKpiAbierto, setModalKpiAbierto] = useState(false)
  const [modoKpi, setModoKpi] = useState<ModoModal>('crear')
  const [kpiActiva, setKpiActiva] = useState<KpiConfigPm | null>(null)

  const [modalIntegracionAbierto, setModalIntegracionAbierto] = useState(false)
  const [modoIntegracion, setModoIntegracion] = useState<ModoModal>('crear')
  const [integracionActiva, setIntegracionActiva] = useState<IntegracionPm | null>(null)

  const esAdmin = puedeAdministrar(rol)

  const formularioModulo = useForm<CatalogoModuloPmEntrada>({
    resolver: zodResolver(catalogoModuloPmSchema),
    defaultValues: {
      codigo: '',
      nombre: '',
      descripcion: null,
      orden: 1,
      activo: true
    }
  })

  const formularioSeveridad = useForm<CatalogoSeveridadPmEntrada>({
    resolver: zodResolver(catalogoSeveridadPmSchema),
    defaultValues: {
      codigo: '',
      nombre: '',
      nivel: 0,
      descripcion: null,
      activo: true
    }
  })

  const formularioKpi = useForm<KpiConfigPmEntrada>({
    resolver: zodResolver(kpiConfigPmSchema),
    defaultValues: {
      clave_kpi: '',
      nombre: '',
      unidad: 'conteo',
      meta_7: null,
      meta_30: null,
      meta_90: null,
      umbral_ok: null,
      umbral_atencion: null,
      activo: true
    }
  })

  const formularioIntegracion = useForm<FormularioIntegracion>({
    resolver: zodResolver(integracionFormularioSchema),
    defaultValues: {
      clave: '',
      nombre: '',
      descripcion: null,
      habilitado: false,
      configuracion_texto: ''
    }
  })

  const formularioRice = useForm<ConfiguracionRiceEntrada>({
    resolver: zodResolver(configuracionRiceSchema),
    defaultValues: {
      alcance_periodo: 'mes',
      esfuerzo_unidad: 'persona_semana'
    }
  })

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const [modulosData, severidadesData, kpisData, integracionesData] = await Promise.all([
        listarModulosPm(),
        listarSeveridadesPm(),
        listarKpisPm(),
        listarIntegracionesPm()
      ])

      const configuracionRiceData = await cargarConfiguracionRice()

      setModulos(modulosData)
      setSeveridades(severidadesData)
      setKpis(kpisData)
      setIntegraciones(integracionesData)
      setConfiguracionRice(configuracionRiceData)
      formularioRice.reset({
        alcance_periodo: configuracionRiceData.alcance_periodo,
        esfuerzo_unidad: configuracionRiceData.esfuerzo_unidad
      })
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar ajustes')
    } finally {
      setCargando(false)
    }
  }, [formularioRice])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const abrirModalModulo = (modo: ModoModal, modulo?: CatalogoModuloPm) => {
    setModoModulo(modo)
    setModuloActivo(modulo ?? null)
    setModalModuloAbierto(true)
    formularioModulo.reset({
      codigo: modulo?.codigo ?? '',
      nombre: modulo?.nombre ?? '',
      descripcion: modulo?.descripcion ?? null,
      orden: modulo?.orden ?? 1,
      activo: modulo?.activo ?? true
    })
  }

  const abrirModalSeveridad = (modo: ModoModal, severidad?: CatalogoSeveridadPm) => {
    setModoSeveridad(modo)
    setSeveridadActiva(severidad ?? null)
    setModalSeveridadAbierto(true)
    formularioSeveridad.reset({
      codigo: severidad?.codigo ?? '',
      nombre: severidad?.nombre ?? '',
      nivel: severidad?.nivel ?? 0,
      descripcion: severidad?.descripcion ?? null,
      activo: severidad?.activo ?? true
    })
  }

  const abrirModalKpi = (modo: ModoModal, kpi?: KpiConfigPm) => {
    setModoKpi(modo)
    setKpiActiva(kpi ?? null)
    setModalKpiAbierto(true)
    formularioKpi.reset({
      clave_kpi: kpi?.clave_kpi ?? '',
      nombre: kpi?.nombre ?? '',
      unidad: kpi?.unidad ?? 'conteo',
      meta_7: kpi?.meta_7 ?? null,
      meta_30: kpi?.meta_30 ?? null,
      meta_90: kpi?.meta_90 ?? null,
      umbral_ok: kpi?.umbral_ok ?? null,
      umbral_atencion: kpi?.umbral_atencion ?? null,
      activo: kpi?.activo ?? true
    })
  }

  const abrirModalIntegracion = (modo: ModoModal, integracion?: IntegracionPm) => {
    setModoIntegracion(modo)
    setIntegracionActiva(integracion ?? null)
    setModalIntegracionAbierto(true)
    formularioIntegracion.reset({
      clave: integracion?.clave ?? '',
      nombre: integracion?.nombre ?? '',
      descripcion: integracion?.descripcion ?? null,
      habilitado: integracion?.habilitado ?? false,
      configuracion_texto: convertirJsonATexto(integracion?.configuracion_publica ?? null)
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Ajustes</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Catálogos y configuraciones operativas del portal PM (módulos, severidades, KPIs e integraciones).
        </p>
      </header>

      <EstadoVista cargando={cargando} error={error} vacio={false} mensajeVacio="Sin datos de ajustes.">
        <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Estándar RICE</h2>
            {mensajeRice ? <p className="text-xs text-emerald-600 dark:text-emerald-400">{mensajeRice}</p> : null}
          </div>

          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={formularioRice.handleSubmit(async (valores) => {
              try {
                const actualizada = await actualizarConfiguracionRice(valores)
                setConfiguracionRice(actualizada)
                formularioRice.reset({
                  alcance_periodo: actualizada.alcance_periodo,
                  esfuerzo_unidad: actualizada.esfuerzo_unidad
                })
                setMensajeRice('Configuración guardada.')
              } catch (errorInterno) {
                setError(
                  errorInterno instanceof Error
                    ? errorInterno.message
                    : 'No se pudo guardar la configuración RICE'
                )
              }
            })}
          >
            <div>
              <label className="text-sm font-medium">Alcance (periodo)</label>
              <select
                {...formularioRice.register('alcance_periodo')}
                disabled={!esAdmin || formularioRice.formState.isSubmitting}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {alcancesPeriodoRice.map((periodo) => (
                  <option key={periodo} value={periodo}>
                    {periodo === 'semana' ? 'Semana' : periodo === 'trimestre' ? 'Trimestre' : 'Mes'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Esfuerzo (unidad)</label>
              <select
                {...formularioRice.register('esfuerzo_unidad')}
                disabled={!esAdmin || formularioRice.formState.isSubmitting}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {unidadesEsfuerzoRice.map((unidad) => (
                  <option key={unidad} value={unidad}>
                    {formatearEsfuerzoUnidadRice(unidad)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Esta configuración ajusta etiquetas y estándar visual RICE en iniciativas.
              </p>
              <button
                type="submit"
                disabled={!esAdmin || formularioRice.formState.isSubmitting || !formularioRice.formState.isDirty}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
              >
                {formularioRice.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
              </button>
            </div>

            {configuracionRice ? (
              <p className="md:col-span-2 text-xs text-slate-500 dark:text-slate-400">
                Actual: alcance por {configuracionRice.alcance_periodo} · esfuerzo en{' '}
                {formatearEsfuerzoUnidadRice(configuracionRice.esfuerzo_unidad)}.
              </p>
            ) : null}
          </form>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Catálogo de módulos</h2>
            <button
              type="button"
              disabled={!esAdmin}
              onClick={() => abrirModalModulo('crear')}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
            >
              Crear módulo
            </button>
          </div>
          <ul className="grid gap-2 md:grid-cols-2">
            {modulos.map((modulo) => (
              <li key={modulo.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                <p className="font-medium">{modulo.nombre}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{modulo.codigo} · Orden {modulo.orden}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={!esAdmin}
                    onClick={() => abrirModalModulo('editar', modulo)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={!esAdmin}
                    onClick={() => {
                      if (window.confirm('¿Eliminar este módulo?')) {
                        void eliminarModuloPm(modulo.id).then(cargar).catch((errorInterno) => {
                          setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el módulo')
                        })
                      }
                    }}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Catálogo de severidades</h2>
            <button
              type="button"
              disabled={!esAdmin}
              onClick={() => abrirModalSeveridad('crear')}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
            >
              Crear severidad
            </button>
          </div>
          <ul className="grid gap-2 md:grid-cols-3">
            {severidades.map((severidad) => (
              <li key={severidad.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                <p className="font-medium">{severidad.nombre}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{severidad.codigo} · Nivel {severidad.nivel}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={!esAdmin}
                    onClick={() => abrirModalSeveridad('editar', severidad)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={!esAdmin}
                    onClick={() => {
                      if (window.confirm('¿Eliminar esta severidad?')) {
                        void eliminarSeveridadPm(severidad.id).then(cargar).catch((errorInterno) => {
                          setError(
                            errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar la severidad'
                          )
                        })
                      }
                    }}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Configuración de KPIs</h2>
            <button
              type="button"
              disabled={!esAdmin}
              onClick={() => abrirModalKpi('crear')}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
            >
              Crear KPI
            </button>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2">KPI</th>
                  <th className="px-3 py-2">Unidad</th>
                  <th className="px-3 py-2">Meta 7/30/90</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {kpis.map((kpi) => (
                  <tr key={kpi.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-3 py-2">
                      <p className="font-medium">{kpi.nombre}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{kpi.clave_kpi}</p>
                    </td>
                    <td className="px-3 py-2">{kpi.unidad}</td>
                    <td className="px-3 py-2">{kpi.meta_7 ?? '-'} / {kpi.meta_30 ?? '-'} / {kpi.meta_90 ?? '-'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={!esAdmin}
                          onClick={() => abrirModalKpi('editar', kpi)}
                          className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={!esAdmin}
                          onClick={() => {
                            if (window.confirm('¿Eliminar este KPI?')) {
                              void eliminarKpiPm(kpi.id).then(cargar).catch((errorInterno) => {
                                setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el KPI')
                              })
                            }
                          }}
                          className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Integraciones</h2>
            <button
              type="button"
              disabled={!esAdmin}
              onClick={() => abrirModalIntegracion('crear')}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
            >
              Crear integración
            </button>
          </div>
          <ul className="grid gap-2 md:grid-cols-2">
            {integraciones.map((integracion) => (
              <li key={integracion.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                <p className="font-medium">{integracion.nombre}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {integracion.clave} · {integracion.habilitado ? 'Habilitada' : 'Deshabilitada'}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={!esAdmin}
                    onClick={() => abrirModalIntegracion('editar', integracion)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={!esAdmin}
                    onClick={() => {
                      if (window.confirm('¿Eliminar esta integración?')) {
                        void eliminarIntegracionPm(integracion.id).then(cargar).catch((errorInterno) => {
                          setError(
                            errorInterno instanceof Error
                              ? errorInterno.message
                              : 'No se pudo eliminar la integración'
                          )
                        })
                      }
                    }}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </EstadoVista>

      <ModalPortal
        abierto={modalModuloAbierto}
        titulo={`${modoModulo === 'crear' ? 'Crear' : 'Editar'} módulo`}
        alCerrar={() => setModalModuloAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={formularioModulo.handleSubmit(async (valores) => {
            try {
              if (modoModulo === 'crear') {
                await crearModuloPm(valores)
              } else if (moduloActivo) {
                await editarModuloPm(moduloActivo.id, valores)
              }
              setModalModuloAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el módulo')
            }
          })}
        >
          <input {...formularioModulo.register('codigo')} placeholder="Código" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <input {...formularioModulo.register('nombre')} placeholder="Nombre" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <input {...formularioModulo.register('descripcion')} placeholder="Descripción" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <input type="number" {...formularioModulo.register('orden', { valueAsNumber: true })} placeholder="Orden" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...formularioModulo.register('activo')} /> Activo</label>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900">Guardar</button>
        </form>
      </ModalPortal>

      <ModalPortal
        abierto={modalSeveridadAbierto}
        titulo={`${modoSeveridad === 'crear' ? 'Crear' : 'Editar'} severidad`}
        alCerrar={() => setModalSeveridadAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={formularioSeveridad.handleSubmit(async (valores) => {
            try {
              if (modoSeveridad === 'crear') {
                await crearSeveridadPm(valores)
              } else if (severidadActiva) {
                await editarSeveridadPm(severidadActiva.id, valores)
              }
              setModalSeveridadAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la severidad')
            }
          })}
        >
          <input {...formularioSeveridad.register('codigo')} placeholder="Código" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <input {...formularioSeveridad.register('nombre')} placeholder="Nombre" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <input type="number" {...formularioSeveridad.register('nivel', { valueAsNumber: true })} placeholder="Nivel" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <input {...formularioSeveridad.register('descripcion')} placeholder="Descripción" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...formularioSeveridad.register('activo')} /> Activo</label>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900">Guardar</button>
        </form>
      </ModalPortal>

      <ModalPortal
        abierto={modalKpiAbierto}
        titulo={`${modoKpi === 'crear' ? 'Crear' : 'Editar'} KPI`}
        alCerrar={() => setModalKpiAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={formularioKpi.handleSubmit(async (valores) => {
            try {
              if (modoKpi === 'crear') {
                await crearKpiPm(valores)
              } else if (kpiActiva) {
                await editarKpiPm(kpiActiva.id, valores)
              }
              setModalKpiAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el KPI')
            }
          })}
        >
          <input {...formularioKpi.register('clave_kpi')} placeholder="Clave KPI" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <input {...formularioKpi.register('nombre')} placeholder="Nombre" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <select {...formularioKpi.register('unidad')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            <option value="conteo">conteo</option>
            <option value="porcentaje">porcentaje</option>
          </select>
          <div className="grid gap-3 md:grid-cols-3">
            <input type="number" step="any" {...formularioKpi.register('meta_7', { valueAsNumber: true })} placeholder="Meta 7" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input type="number" step="any" {...formularioKpi.register('meta_30', { valueAsNumber: true })} placeholder="Meta 30" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input type="number" step="any" {...formularioKpi.register('meta_90', { valueAsNumber: true })} placeholder="Meta 90" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input type="number" step="any" {...formularioKpi.register('umbral_ok', { valueAsNumber: true })} placeholder="Umbral OK" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input type="number" step="any" {...formularioKpi.register('umbral_atencion', { valueAsNumber: true })} placeholder="Umbral atención" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...formularioKpi.register('activo')} /> Activo</label>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900">Guardar</button>
        </form>
      </ModalPortal>

      <ModalPortal
        abierto={modalIntegracionAbierto}
        titulo={`${modoIntegracion === 'crear' ? 'Crear' : 'Editar'} integración`}
        alCerrar={() => setModalIntegracionAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={formularioIntegracion.handleSubmit(async (valores) => {
            const configuracion_publica = convertirTextoAJson(valores.configuracion_texto)
            if (valores.configuracion_texto.trim().length > 0 && !configuracion_publica) {
              setError('La configuración JSON no es válida.')
              return
            }

            const entrada: IntegracionPmEntrada = {
              clave: valores.clave,
              nombre: valores.nombre,
              descripcion: valores.descripcion || null,
              habilitado: valores.habilitado,
              configuracion_publica
            }

            try {
              if (modoIntegracion === 'crear') {
                await crearIntegracionPm(entrada)
              } else if (integracionActiva) {
                await editarIntegracionPm(integracionActiva.id, entrada)
              }
              setModalIntegracionAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la integración')
            }
          })}
        >
          <input {...formularioIntegracion.register('clave')} placeholder="Clave" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <input {...formularioIntegracion.register('nombre')} placeholder="Nombre" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <input {...formularioIntegracion.register('descripcion')} placeholder="Descripción" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...formularioIntegracion.register('habilitado')} /> Habilitada</label>
          <textarea {...formularioIntegracion.register('configuracion_texto')} placeholder='Configuración pública JSON (ej: {"modo":"server"})' className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900">Guardar</button>
        </form>
      </ModalPortal>
    </section>
  )
}
