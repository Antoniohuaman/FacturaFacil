import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  auditoriaPmSchema,
  hallazgoAuditoriaSchema,
  type AuditoriaPmEntrada,
  type HallazgoAuditoriaEntrada
} from '@/compartido/validacion/esquemas'
import type {
  AuditoriaPm,
  CatalogoEstadoPm,
  CatalogoModuloPm,
  CatalogoSeveridadPm,
  CatalogoTipoAuditoriaPm,
  DecisionPm,
  EjecucionValidacion,
  HallazgoAuditoriaPm
} from '@/dominio/modelos'
import {
  crearAuditoriaPm,
  crearHallazgoAuditoriaPm,
  editarAuditoriaPm,
  editarHallazgoAuditoriaPm,
  eliminarAuditoriaPm,
  eliminarHallazgoAuditoriaPm,
  listarAuditoriasPm,
  listarHallazgosAuditoriaPm,
  listarTiposAuditoriaPm
} from '@/aplicacion/casos-uso/auditorias'
import { listarDecisionesPm } from '@/aplicacion/casos-uso/decisiones'
import { listarEjecucionesValidacion } from '@/aplicacion/casos-uso/ejecucionesValidacion'
import { listarModulosPm, listarSeveridadesPm, listarEstadosPm } from '@/aplicacion/casos-uso/ajustes'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'

type ModoModal = 'crear' | 'ver' | 'editar'

export function PaginaAuditorias() {
  const { rol } = useSesionPortalPM()
  const [tiposAuditoria, setTiposAuditoria] = useState<CatalogoTipoAuditoriaPm[]>([])
  const [estadosAuditoria, setEstadosAuditoria] = useState<CatalogoEstadoPm[]>([])
  const [estadosHallazgo, setEstadosHallazgo] = useState<CatalogoEstadoPm[]>([])
  const [severidades, setSeveridades] = useState<CatalogoSeveridadPm[]>([])
  const [modulos, setModulos] = useState<CatalogoModuloPm[]>([])
  const [decisiones, setDecisiones] = useState<DecisionPm[]>([])
  const [ejecuciones, setEjecuciones] = useState<EjecucionValidacion[]>([])
  const [auditorias, setAuditorias] = useState<AuditoriaPm[]>([])
  const [hallazgos, setHallazgos] = useState<HallazgoAuditoriaPm[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalAuditoriaAbierto, setModalAuditoriaAbierto] = useState(false)
  const [modoAuditoria, setModoAuditoria] = useState<ModoModal>('crear')
  const [auditoriaActiva, setAuditoriaActiva] = useState<AuditoriaPm | null>(null)

  const [modalHallazgoAbierto, setModalHallazgoAbierto] = useState(false)
  const [modoHallazgo, setModoHallazgo] = useState<ModoModal>('crear')
  const [hallazgoActivo, setHallazgoActivo] = useState<HallazgoAuditoriaPm | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formularioAuditoria = useForm<AuditoriaPmEntrada>({
    resolver: zodResolver(auditoriaPmSchema),
    defaultValues: {
      tipo_auditoria_codigo: '',
      alcance: '',
      checklist: '',
      evidencias: '',
      responsable: null,
      estado_codigo: '',
      fecha_auditoria: new Date().toISOString().slice(0, 10)
    }
  })

  const formularioHallazgo = useForm<HallazgoAuditoriaEntrada>({
    resolver: zodResolver(hallazgoAuditoriaSchema),
    defaultValues: {
      auditoria_id: '',
      titulo: '',
      descripcion: '',
      severidad_codigo: '',
      estado_codigo: '',
      modulo_id: null,
      decision_id: null,
      ejecucion_validacion_id: null,
      evidencia_url: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const [
        tiposAuditoriaData,
        estadosAuditoriaData,
        estadosHallazgoData,
        severidadesData,
        modulosData,
        decisionesData,
        ejecucionesData,
        auditoriasData,
        hallazgosData
      ] = await Promise.all([
        listarTiposAuditoriaPm(),
        listarEstadosPm('auditoria'),
        listarEstadosPm('hallazgo'),
        listarSeveridadesPm(),
        listarModulosPm(),
        listarDecisionesPm(),
        listarEjecucionesValidacion(),
        listarAuditoriasPm(),
        listarHallazgosAuditoriaPm()
      ])

      setTiposAuditoria(tiposAuditoriaData)
      setEstadosAuditoria(estadosAuditoriaData)
      setEstadosHallazgo(estadosHallazgoData)
      setSeveridades(severidadesData)
      setModulos(modulosData)
      setDecisiones(decisionesData)
      setEjecuciones(ejecucionesData)
      setAuditorias(auditoriasData)
      setHallazgos(hallazgosData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar auditorías')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const auditoriaPorId = useMemo(
    () => new Map(auditorias.map((auditoria) => [auditoria.id, auditoria.fecha_auditoria])),
    [auditorias]
  )

  const moduloPorId = useMemo(() => new Map(modulos.map((modulo) => [modulo.id, modulo.nombre])), [modulos])

  const abrirModalAuditoria = (modo: ModoModal, auditoria?: AuditoriaPm) => {
    setModoAuditoria(modo)
    setAuditoriaActiva(auditoria ?? null)
    setModalAuditoriaAbierto(true)
    formularioAuditoria.reset({
      tipo_auditoria_codigo: auditoria?.tipo_auditoria_codigo ?? tiposAuditoria[0]?.codigo ?? '',
      alcance: auditoria?.alcance ?? '',
      checklist: auditoria?.checklist ?? '',
      evidencias: auditoria?.evidencias ?? '',
      responsable: auditoria?.responsable ?? null,
      estado_codigo: auditoria?.estado_codigo ?? estadosAuditoria[0]?.codigo ?? '',
      fecha_auditoria: auditoria?.fecha_auditoria ?? new Date().toISOString().slice(0, 10)
    })
  }

  const abrirModalHallazgo = (modo: ModoModal, hallazgo?: HallazgoAuditoriaPm) => {
    setModoHallazgo(modo)
    setHallazgoActivo(hallazgo ?? null)
    setModalHallazgoAbierto(true)
    formularioHallazgo.reset({
      auditoria_id: hallazgo?.auditoria_id ?? auditorias[0]?.id ?? '',
      titulo: hallazgo?.titulo ?? '',
      descripcion: hallazgo?.descripcion ?? '',
      severidad_codigo: hallazgo?.severidad_codigo ?? severidades[0]?.codigo ?? '',
      estado_codigo: hallazgo?.estado_codigo ?? estadosHallazgo[0]?.codigo ?? '',
      modulo_id: hallazgo?.modulo_id ?? null,
      decision_id: hallazgo?.decision_id ?? null,
      ejecucion_validacion_id: hallazgo?.ejecucion_validacion_id ?? null,
      evidencia_url: hallazgo?.evidencia_url ?? null
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Auditorías</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Registro de auditorías y hallazgos con severidad configurable y relaciones cruzadas.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          disabled={!esEdicionPermitida}
          onClick={() => abrirModalAuditoria('crear')}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
        >
          Crear auditoría
        </button>
        <button
          type="button"
          disabled={!esEdicionPermitida}
          onClick={() => abrirModalHallazgo('crear')}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-slate-700"
        >
          Crear hallazgo
        </button>
      </div>

      <EstadoVista
        cargando={cargando}
        error={error}
        vacio={auditorias.length === 0 && hallazgos.length === 0}
        mensajeVacio="No hay auditorías ni hallazgos registrados."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <header className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h2 className="text-sm font-semibold">Auditorías</h2>
            </header>
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {auditorias.map((auditoria) => (
                <li key={auditoria.id} className="space-y-2 px-4 py-3 text-sm">
                  <p className="font-medium">{auditoria.fecha_auditoria} · {auditoria.tipo_auditoria_codigo}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Estado: {auditoria.estado_codigo}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => abrirModalAuditoria('ver', auditoria)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                    >
                      Ver
                    </button>
                    <button
                      type="button"
                      disabled={!esEdicionPermitida}
                      onClick={() => abrirModalAuditoria('editar', auditoria)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={!esEdicionPermitida}
                      onClick={() => {
                        if (window.confirm('¿Eliminar esta auditoría?')) {
                          void eliminarAuditoriaPm(auditoria.id).then(cargar).catch((errorInterno) => {
                            setError(
                              errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar la auditoría'
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

          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <header className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h2 className="text-sm font-semibold">Hallazgos</h2>
            </header>
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {hallazgos.map((hallazgo) => (
                <li key={hallazgo.id} className="space-y-2 px-4 py-3 text-sm">
                  <p className="font-medium">{hallazgo.titulo}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {hallazgo.severidad_codigo.toUpperCase()} · {hallazgo.estado_codigo} · {moduloPorId.get(hallazgo.modulo_id ?? '') ?? 'Sin módulo'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Auditoría: {auditoriaPorId.get(hallazgo.auditoria_id) ?? 'No disponible'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => abrirModalHallazgo('ver', hallazgo)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                    >
                      Ver
                    </button>
                    <button
                      type="button"
                      disabled={!esEdicionPermitida}
                      onClick={() => abrirModalHallazgo('editar', hallazgo)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={!esEdicionPermitida}
                      onClick={() => {
                        if (window.confirm('¿Eliminar este hallazgo?')) {
                          void eliminarHallazgoAuditoriaPm(hallazgo.id).then(cargar).catch((errorInterno) => {
                            setError(
                              errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el hallazgo'
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
        </div>
      </EstadoVista>

      <ModalPortal
        abierto={modalAuditoriaAbierto}
        titulo={`${modoAuditoria === 'crear' ? 'Crear' : modoAuditoria === 'editar' ? 'Editar' : 'Ver'} auditoría`}
        alCerrar={() => setModalAuditoriaAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={formularioAuditoria.handleSubmit(async (valores) => {
            if (modoAuditoria === 'ver') {
              return
            }

            try {
              if (modoAuditoria === 'crear') {
                await crearAuditoriaPm(valores)
              }

              if (modoAuditoria === 'editar' && auditoriaActiva) {
                await editarAuditoriaPm(auditoriaActiva.id, valores)
              }

              setModalAuditoriaAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la auditoría')
            }
          })}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <select
                {...formularioAuditoria.register('tipo_auditoria_codigo')}
                disabled={modoAuditoria === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {tiposAuditoria.map((tipo) => (
                  <option key={tipo.id} value={tipo.codigo}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Estado</label>
              <select
                {...formularioAuditoria.register('estado_codigo')}
                disabled={modoAuditoria === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {estadosAuditoria.map((estado) => (
                  <option key={estado.id} value={estado.codigo}>
                    {estado.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Fecha</label>
              <input
                type="date"
                {...formularioAuditoria.register('fecha_auditoria')}
                readOnly={modoAuditoria === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Alcance</label>
            <textarea
              {...formularioAuditoria.register('alcance')}
              readOnly={modoAuditoria === 'ver'}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Checklist</label>
            <textarea
              {...formularioAuditoria.register('checklist')}
              readOnly={modoAuditoria === 'ver'}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Evidencias</label>
            <textarea
              {...formularioAuditoria.register('evidencias')}
              readOnly={modoAuditoria === 'ver'}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Responsable</label>
            <input
              {...formularioAuditoria.register('responsable')}
              readOnly={modoAuditoria === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          {modoAuditoria !== 'ver' ? (
            <button
              type="submit"
              disabled={formularioAuditoria.formState.isSubmitting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-70 dark:bg-slate-200 dark:text-slate-900"
            >
              {formularioAuditoria.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          ) : null}
        </form>
      </ModalPortal>

      <ModalPortal
        abierto={modalHallazgoAbierto}
        titulo={`${modoHallazgo === 'crear' ? 'Crear' : modoHallazgo === 'editar' ? 'Editar' : 'Ver'} hallazgo`}
        alCerrar={() => setModalHallazgoAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={formularioHallazgo.handleSubmit(async (valores) => {
            if (modoHallazgo === 'ver') {
              return
            }

            try {
              if (modoHallazgo === 'crear') {
                await crearHallazgoAuditoriaPm(valores)
              }

              if (modoHallazgo === 'editar' && hallazgoActivo) {
                await editarHallazgoAuditoriaPm(hallazgoActivo.id, valores)
              }

              setModalHallazgoAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el hallazgo')
            }
          })}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Auditoría</label>
              <select
                {...formularioHallazgo.register('auditoria_id')}
                disabled={modoHallazgo === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {auditorias.map((auditoria) => (
                  <option key={auditoria.id} value={auditoria.id}>
                    {auditoria.fecha_auditoria} · {auditoria.tipo_auditoria_codigo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Severidad</label>
              <select
                {...formularioHallazgo.register('severidad_codigo')}
                disabled={modoHallazgo === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {severidades.map((severidad) => (
                  <option key={severidad.id} value={severidad.codigo}>
                    {severidad.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Estado</label>
              <select
                {...formularioHallazgo.register('estado_codigo')}
                disabled={modoHallazgo === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {estadosHallazgo.map((estado) => (
                  <option key={estado.id} value={estado.codigo}>
                    {estado.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Título</label>
            <input
              {...formularioHallazgo.register('titulo')}
              readOnly={modoHallazgo === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              {...formularioHallazgo.register('descripcion')}
              readOnly={modoHallazgo === 'ver'}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Módulo</label>
              <select
                {...formularioHallazgo.register('modulo_id')}
                disabled={modoHallazgo === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Sin relación</option>
                {modulos.map((modulo) => (
                  <option key={modulo.id} value={modulo.id}>
                    {modulo.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Decisión</label>
              <select
                {...formularioHallazgo.register('decision_id')}
                disabled={modoHallazgo === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Sin relación</option>
                {decisiones.map((decision) => (
                  <option key={decision.id} value={decision.id}>
                    {decision.titulo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Ejecución</label>
              <select
                {...formularioHallazgo.register('ejecucion_validacion_id')}
                disabled={modoHallazgo === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Sin relación</option>
                {ejecuciones.map((ejecucion) => (
                  <option key={ejecucion.id} value={ejecucion.id}>
                    {ejecucion.fecha_ejecucion} · {ejecucion.estado_codigo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Evidencia URL</label>
            <input
              {...formularioHallazgo.register('evidencia_url')}
              readOnly={modoHallazgo === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          {modoHallazgo !== 'ver' ? (
            <button
              type="submit"
              disabled={formularioHallazgo.formState.isSubmitting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-70 dark:bg-slate-200 dark:text-slate-900"
            >
              {formularioHallazgo.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          ) : null}
        </form>
      </ModalPortal>
    </section>
  )
}
