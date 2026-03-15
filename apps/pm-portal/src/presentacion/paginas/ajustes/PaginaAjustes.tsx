import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import {
  catalogoEtapaPmSchema,
  catalogoModuloPmSchema,
  catalogoSeveridadPmSchema,
  catalogoVentanaPmSchema,
  configuracionRiceSchema,
  integracionPmSchema,
  kpiConfigPmSchema,
  type CatalogoEtapaPmEntrada,
  type CatalogoModuloPmEntrada,
  type CatalogoSeveridadPmEntrada,
  type CatalogoVentanaPmEntrada,
  type ConfiguracionRiceEntrada,
  type IntegracionPmEntrada,
  type KpiConfigPmEntrada
} from '@/compartido/validacion/esquemas'
import {
  type CatalogoEtapaPm,
  type CatalogoModuloPm,
  type CatalogoSeveridadPm,
  type CatalogoVentanaPm,
  type ConfiguracionRice,
  type IntegracionPm,
  type KpiConfigPm
} from '@/dominio/modelos'
import {
  actualizarConfiguracionRice,
  cargarConfiguracionRice,
  crearIntegracionPm,
  crearEtapaPm,
  crearKpiPm,
  crearModuloPm,
  crearSeveridadPm,
  crearVentanaPm,
  editarIntegracionPm,
  editarEtapaPm,
  editarKpiPm,
  editarModuloPm,
  editarSeveridadPm,
  editarVentanaPm,
  eliminarIntegracionPm,
  eliminarEtapaPm,
  eliminarKpiPm,
  eliminarModuloPm,
  eliminarSeveridadPm,
  eliminarVentanaPm,
  listarEtapasPm,
  listarIntegracionesPm,
  listarVentanasPm,
  listarKpisPm,
  listarModulosPm,
  listarSeveridadesPm
} from '@/aplicacion/casos-uso/ajustes'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeAdministrar } from '@/compartido/utilidades/permisosRol'
import { NavegacionAjustes } from '@/presentacion/paginas/ajustes/componentes/NavegacionAjustes'
import { PanelRiceAjustes } from '@/presentacion/paginas/ajustes/componentes/PanelRiceAjustes'
import { PanelPlanificacionAjustes } from '@/presentacion/paginas/ajustes/componentes/PanelPlanificacionAjustes'
import { PanelModulosAjustes } from '@/presentacion/paginas/ajustes/componentes/PanelModulosAjustes'
import { PanelSeveridadesAjustes } from '@/presentacion/paginas/ajustes/componentes/PanelSeveridadesAjustes'
import { PanelKpisAjustes } from '@/presentacion/paginas/ajustes/componentes/PanelKpisAjustes'
import { PanelIntegracionesAjustes } from '@/presentacion/paginas/ajustes/componentes/PanelIntegracionesAjustes'
import {
  normalizarPestanaPlanificacion,
  normalizarSeccionAjustes,
  type AjustesSeccionId,
  type AjustesPlanificacionTabId
} from '@/presentacion/paginas/ajustes/modeloAjustes'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const { rol } = useSesionPortalPM()
  const [ventanas, setVentanas] = useState<CatalogoVentanaPm[]>([])
  const [etapas, setEtapas] = useState<CatalogoEtapaPm[]>([])
  const [modulos, setModulos] = useState<CatalogoModuloPm[]>([])
  const [severidades, setSeveridades] = useState<CatalogoSeveridadPm[]>([])
  const [kpis, setKpis] = useState<KpiConfigPm[]>([])
  const [integraciones, setIntegraciones] = useState<IntegracionPm[]>([])
  const [configuracionRice, setConfiguracionRice] = useState<ConfiguracionRice | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mensajeRice, setMensajeRice] = useState<string | null>(null)

  const [modalVentanaAbierto, setModalVentanaAbierto] = useState(false)
  const [modoVentana, setModoVentana] = useState<ModoModal>('crear')
  const [ventanaActiva, setVentanaActiva] = useState<CatalogoVentanaPm | null>(null)

  const [modalEtapaAbierto, setModalEtapaAbierto] = useState(false)
  const [modoEtapa, setModoEtapa] = useState<ModoModal>('crear')
  const [etapaActiva, setEtapaActiva] = useState<CatalogoEtapaPm | null>(null)

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
  const seccionActiva = normalizarSeccionAjustes(searchParams.get('vista'))
  const pestanaPlanificacion = normalizarPestanaPlanificacion(searchParams.get('planificacion'))

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

  const formularioVentana = useForm<CatalogoVentanaPmEntrada>({
    resolver: zodResolver(catalogoVentanaPmSchema),
    defaultValues: {
      etiqueta_visible: '',
      tipo: 'custom',
      anio: null,
      orden: 100,
      fecha_inicio: null,
      fecha_fin: null,
      activo: true
    }
  })

  const formularioEtapa = useForm<CatalogoEtapaPmEntrada>({
    resolver: zodResolver(catalogoEtapaPmSchema),
    defaultValues: {
      etiqueta_visible: '',
      orden: 100,
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
      const [ventanasData, etapasData, modulosData, severidadesData, kpisData, integracionesData] = await Promise.all([
        listarVentanasPm(),
        listarEtapasPm(),
        listarModulosPm(),
        listarSeveridadesPm(),
        listarKpisPm(),
        listarIntegracionesPm()
      ])

      const configuracionRiceData = await cargarConfiguracionRice()

      setVentanas(ventanasData)
      setEtapas(etapasData)
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

  const actualizarNavegacion = useCallback(
    (actualizar: (params: URLSearchParams) => void) => {
      const siguientes = new URLSearchParams(searchParams)
      actualizar(siguientes)
      setSearchParams(siguientes)
    },
    [searchParams, setSearchParams]
  )

  const seleccionarSeccion = useCallback(
    (seccion: AjustesSeccionId) => {
      actualizarNavegacion((params) => {
        params.set('vista', seccion)
        if (seccion === 'planificacion') {
          if (!params.get('planificacion')) {
            params.set('planificacion', 'ventanas')
          }
        } else {
          params.delete('planificacion')
        }
      })
    },
    [actualizarNavegacion]
  )

  const seleccionarPestanaPlanificacion = useCallback(
    (pestana: AjustesPlanificacionTabId) => {
      actualizarNavegacion((params) => {
        params.set('vista', 'planificacion')
        params.set('planificacion', pestana)
      })
    },
    [actualizarNavegacion]
  )

  const eliminarVentana = useCallback(
    (ventana: CatalogoVentanaPm) => {
      if (window.confirm('¿Eliminar esta ventana?')) {
        void eliminarVentanaPm(ventana.id).then(cargar).catch((errorInterno) => {
          setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar la ventana')
        })
      }
    },
    [cargar]
  )

  const eliminarEtapa = useCallback(
    (etapa: CatalogoEtapaPm) => {
      if (window.confirm('¿Eliminar esta etapa?')) {
        void eliminarEtapaPm(etapa.id).then(cargar).catch((errorInterno) => {
          setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar la etapa')
        })
      }
    },
    [cargar]
  )

  const eliminarModulo = useCallback(
    (modulo: CatalogoModuloPm) => {
      if (window.confirm('¿Eliminar este módulo?')) {
        void eliminarModuloPm(modulo.id).then(cargar).catch((errorInterno) => {
          setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el módulo')
        })
      }
    },
    [cargar]
  )

  const eliminarSeveridad = useCallback(
    (severidad: CatalogoSeveridadPm) => {
      if (window.confirm('¿Eliminar esta severidad?')) {
        void eliminarSeveridadPm(severidad.id).then(cargar).catch((errorInterno) => {
          setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar la severidad')
        })
      }
    },
    [cargar]
  )

  const eliminarKpi = useCallback(
    (kpi: KpiConfigPm) => {
      if (window.confirm('¿Eliminar este KPI?')) {
        void eliminarKpiPm(kpi.id).then(cargar).catch((errorInterno) => {
          setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el KPI')
        })
      }
    },
    [cargar]
  )

  const eliminarIntegracion = useCallback(
    (integracion: IntegracionPm) => {
      if (window.confirm('¿Eliminar esta integración?')) {
        void eliminarIntegracionPm(integracion.id).then(cargar).catch((errorInterno) => {
          setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar la integración')
        })
      }
    },
    [cargar]
  )

  const guardarConfiguracionRice = useCallback(
    async (valores: ConfiguracionRiceEntrada) => {
      try {
        const actualizada = await actualizarConfiguracionRice(valores)
        setConfiguracionRice(actualizada)
        formularioRice.reset({
          alcance_periodo: actualizada.alcance_periodo,
          esfuerzo_unidad: actualizada.esfuerzo_unidad
        })
        setMensajeRice('Configuración guardada.')
      } catch (errorInterno) {
        setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la configuración RICE')
      }
    },
    [formularioRice]
  )

  const renderSeccionActiva = () => {
    switch (seccionActiva) {
      case 'planificacion':
        return (
          <PanelPlanificacionAjustes
            esAdmin={esAdmin}
            etapas={etapas}
            ventanas={ventanas}
            pestanaActiva={pestanaPlanificacion}
            onCambiarPestana={seleccionarPestanaPlanificacion}
            onCrearVentana={() => abrirModalVentana('crear')}
            onEditarVentana={(ventana) => abrirModalVentana('editar', ventana)}
            onEliminarVentana={eliminarVentana}
            onCrearEtapa={() => abrirModalEtapa('crear')}
            onEditarEtapa={(etapa) => abrirModalEtapa('editar', etapa)}
            onEliminarEtapa={eliminarEtapa}
          />
        )
      case 'modulos':
        return (
          <PanelModulosAjustes
            esAdmin={esAdmin}
            modulos={modulos}
            onCrear={() => abrirModalModulo('crear')}
            onEditar={(modulo) => abrirModalModulo('editar', modulo)}
            onEliminar={eliminarModulo}
          />
        )
      case 'severidades':
        return (
          <PanelSeveridadesAjustes
            esAdmin={esAdmin}
            severidades={severidades}
            onCrear={() => abrirModalSeveridad('crear')}
            onEditar={(severidad) => abrirModalSeveridad('editar', severidad)}
            onEliminar={eliminarSeveridad}
          />
        )
      case 'kpis':
        return (
          <PanelKpisAjustes
            esAdmin={esAdmin}
            kpis={kpis}
            onCrear={() => abrirModalKpi('crear')}
            onEditar={(kpi) => abrirModalKpi('editar', kpi)}
            onEliminar={eliminarKpi}
          />
        )
      case 'integraciones':
        return (
          <PanelIntegracionesAjustes
            esAdmin={esAdmin}
            integraciones={integraciones}
            onCrear={() => abrirModalIntegracion('crear')}
            onEditar={(integracion) => abrirModalIntegracion('editar', integracion)}
            onEliminar={eliminarIntegracion}
          />
        )
      case 'rice':
      default:
        return (
          <PanelRiceAjustes
            configuracionRice={configuracionRice}
            esAdmin={esAdmin}
            formularioRice={formularioRice}
            mensajeRice={mensajeRice}
            onGuardar={guardarConfiguracionRice}
          />
        )
    }
  }

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

  const abrirModalVentana = (modo: ModoModal, ventana?: CatalogoVentanaPm) => {
    setModoVentana(modo)
    setVentanaActiva(ventana ?? null)
    setModalVentanaAbierto(true)
    formularioVentana.reset({
      etiqueta_visible: ventana?.etiqueta_visible ?? '',
      tipo: ventana?.tipo ?? 'custom',
      anio: ventana?.anio ?? null,
      orden: ventana?.orden ?? 100,
      fecha_inicio: ventana?.fecha_inicio ?? null,
      fecha_fin: ventana?.fecha_fin ?? null,
      activo: ventana?.activo ?? true
    })
  }

  const abrirModalEtapa = (modo: ModoModal, etapa?: CatalogoEtapaPm) => {
    setModoEtapa(modo)
    setEtapaActiva(etapa ?? null)
    setModalEtapaAbierto(true)
    formularioEtapa.reset({
      etiqueta_visible: etapa?.etiqueta_visible ?? '',
      orden: etapa?.orden ?? 100,
      activo: etapa?.activo ?? true
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
          Reestructura interna del módulo para administrar catálogos y configuraciones operativas sin salir de
          la ruta raíz.
        </p>
      </header>

      <NavegacionAjustes seccionActiva={seccionActiva} onSeleccionar={seleccionarSeccion} />

      <EstadoVista cargando={cargando} error={error} vacio={false} mensajeVacio="Sin datos de ajustes.">
        {renderSeccionActiva()}
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

      <ModalPortal
        abierto={modalVentanaAbierto}
        titulo={`${modoVentana === 'crear' ? 'Crear' : 'Editar'} ventana`}
        alCerrar={() => setModalVentanaAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={formularioVentana.handleSubmit(async (valores) => {
            try {
              const entrada: CatalogoVentanaPmEntrada = {
                ...valores,
                tipo: valores.tipo.trim(),
                anio: valores.anio ?? null,
                fecha_inicio: valores.fecha_inicio || null,
                fecha_fin: valores.fecha_fin || null
              }

              if (modoVentana === 'crear') {
                await crearVentanaPm(entrada)
              } else if (ventanaActiva) {
                await editarVentanaPm(ventanaActiva.id, entrada)
              }

              setModalVentanaAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la ventana')
            }
          })}
        >
          <div>
            <input
              {...formularioVentana.register('etiqueta_visible')}
              placeholder="Etiqueta visible"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            {formularioVentana.formState.errors.etiqueta_visible ? (
              <p className="text-xs text-red-500">{formularioVentana.formState.errors.etiqueta_visible.message}</p>
            ) : null}
          </div>
          <input
            {...formularioVentana.register('tipo')}
            placeholder="Tipo (ej. custom)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="number"
              {...formularioVentana.register('anio', { valueAsNumber: true })}
              placeholder="Año (opcional)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <input
              type="number"
              {...formularioVentana.register('orden', { valueAsNumber: true })}
              placeholder="Orden"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Fecha inicio</label>
              <input
                type="date"
                {...formularioVentana.register('fecha_inicio')}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Fecha fin</label>
              <input
                type="date"
                {...formularioVentana.register('fecha_fin')}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              {formularioVentana.formState.errors.fecha_fin ? (
                <p className="text-xs text-red-500">{formularioVentana.formState.errors.fecha_fin.message}</p>
              ) : null}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...formularioVentana.register('activo')} /> Activo
          </label>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900"
          >
            Guardar
          </button>
        </form>
      </ModalPortal>

      <ModalPortal
        abierto={modalEtapaAbierto}
        titulo={`${modoEtapa === 'crear' ? 'Crear' : 'Editar'} etapa`}
        alCerrar={() => setModalEtapaAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={formularioEtapa.handleSubmit(async (valores) => {
            try {
              if (modoEtapa === 'crear') {
                await crearEtapaPm(valores)
              } else if (etapaActiva) {
                await editarEtapaPm(etapaActiva.id, valores)
              }

              setModalEtapaAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la etapa')
            }
          })}
        >
          <div>
            <input
              {...formularioEtapa.register('etiqueta_visible')}
              placeholder="Etiqueta visible"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            {formularioEtapa.formState.errors.etiqueta_visible ? (
              <p className="text-xs text-red-500">{formularioEtapa.formState.errors.etiqueta_visible.message}</p>
            ) : null}
          </div>
          <input
            type="number"
            {...formularioEtapa.register('orden', { valueAsNumber: true })}
            placeholder="Orden"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...formularioEtapa.register('activo')} /> Activo
          </label>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900"
          >
            Guardar
          </button>
        </form>
      </ModalPortal>
    </section>
  )
}
