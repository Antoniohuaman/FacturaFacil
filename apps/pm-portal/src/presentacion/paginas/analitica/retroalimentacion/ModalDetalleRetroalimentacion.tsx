import { formatearEstadoLegible, formatearFechaHoraCorta } from '@/compartido/utilidades/formatoPortal'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import type {
  RegistroRetroalimentacionPm,
  RespuestaDetalleRetroalimentacionPm
} from '@/dominio/modelos'
import {
  formatearTipoRetroalimentacion,
  obtenerClaseTipoRetroalimentacion,
  obtenerMetaSecundariaRetroalimentacion
} from '@/presentacion/paginas/analitica/retroalimentacion/retroalimentacionPresentacion'

interface PropiedadesModalDetalleRetroalimentacion {
  abierto: boolean
  registroBase: RegistroRetroalimentacionPm | null
  detalle: RespuestaDetalleRetroalimentacionPm | null
  cargando: boolean
  error: string | null
  alCerrar: () => void
  alReintentar: () => void
}

function FilaDetalle({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{etiqueta}</p>
      <p className="break-words text-sm text-slate-800 dark:text-slate-100">{valor}</p>
    </div>
  )
}

export function ModalDetalleRetroalimentacion({
  abierto,
  registroBase,
  detalle,
  cargando,
  error,
  alCerrar,
  alReintentar
}: PropiedadesModalDetalleRetroalimentacion) {
  const registro = detalle?.item ?? registroBase
  const metaSecundaria = registro ? obtenerMetaSecundariaRetroalimentacion(registro) : null
  const estadoAnimo = registro?.estado_animo ? formatearEstadoLegible(registro.estado_animo) : null
  const puntaje = typeof registro?.puntaje === 'number' ? `Puntaje ${registro.puntaje.toLocaleString('es-PE')}` : null

  return (
    <ModalPortal abierto={abierto} titulo="Detalle de retroalimentación" alCerrar={alCerrar}>
      {cargando ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Cargando detalle…
        </div>
      ) : error ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            No se pudo cargar el detalle. Intenta nuevamente.
          </div>
          <button
            type="button"
            onClick={alReintentar}
            className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Reintentar
          </button>
        </div>
      ) : !registro ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          No se pudo abrir el registro seleccionado.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${obtenerClaseTipoRetroalimentacion(registro.tipo)}`}>
                {formatearTipoRetroalimentacion(registro.tipo)}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {formatearFechaHoraCorta(registro.created_at)}
              </span>
              {puntaje ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {puntaje}
                </span>
              ) : null}
              {estadoAnimo ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {estadoAnimo}
                </span>
              ) : null}
            </div>

            <div className="space-y-0.5">
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{registro.valor_principal}</p>
              {metaSecundaria ? (
                <p className="text-[13px] text-slate-500 dark:text-slate-400">{metaSecundaria}</p>
              ) : null}
            </div>
          </div>

          {registro.detalle ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{registro.detalle}</p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-x-6 gap-y-3.5 md:grid-cols-2">
              <FilaDetalle etiqueta="Usuario" valor={registro.usuario_nombre} />
              <FilaDetalle etiqueta="Empresa" valor={registro.empresa_nombre} />
              <FilaDetalle etiqueta="Módulo" valor={registro.modulo} />
              <FilaDetalle etiqueta="Ruta" valor={registro.ruta} />
              {registro.establecimiento_nombre ? (
                <FilaDetalle etiqueta="Establecimiento" valor={registro.establecimiento_nombre} />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </ModalPortal>
  )
}