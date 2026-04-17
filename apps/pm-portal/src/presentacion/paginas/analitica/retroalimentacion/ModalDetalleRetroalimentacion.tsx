import { formatearEstadoLegible, formatearFechaHoraCorta } from '@/compartido/utilidades/formatoPortal'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import type {
  RegistroRetroalimentacionPm,
  RespuestaDetalleRetroalimentacionPm
} from '@/dominio/modelos'
import {
  formatearTipoRetroalimentacion,
  obtenerClaseTipoRetroalimentacion,
  obtenerMetaSecundariaRetroalimentacion,
  resumirTexto
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
    <div className="space-y-1 rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{etiqueta}</p>
      <p className="text-sm text-slate-800 dark:text-slate-100">{valor}</p>
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

  return (
    <ModalPortal abierto={abierto} titulo="Detalle de retroalimentación" alCerrar={alCerrar}>
      <EstadoVista
        cargando={cargando}
        error={error}
        vacio={!registro}
        mensajeVacio="No se pudo determinar el registro seleccionado."
      >
        {registro ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${obtenerClaseTipoRetroalimentacion(registro.tipo)}`}>
                    {formatearTipoRetroalimentacion(registro.tipo)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatearFechaHoraCorta(registro.created_at)}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{registro.valor_principal}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {metaSecundaria ?? 'Lectura directa registrada en la experiencia del producto.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={alReintentar}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Recargar detalle
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <FilaDetalle etiqueta="Usuario" valor={registro.usuario_nombre} />
              <FilaDetalle etiqueta="Empresa" valor={registro.empresa_nombre} />
              <FilaDetalle etiqueta="Establecimiento" valor={registro.establecimiento_nombre ?? 'No informado'} />
              <FilaDetalle etiqueta="Módulo" valor={registro.modulo} />
              <FilaDetalle etiqueta="Ruta" valor={registro.ruta} />
              <FilaDetalle etiqueta="Registro" valor={registro.registro_uid} />
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Detalle</p>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                  {registro.detalle ? resumirTexto(registro.detalle, 240) : 'Sin detalle adicional.'}
                </p>
              </div>

              {(typeof registro.puntaje === 'number' || registro.estado_animo) ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <FilaDetalle
                    etiqueta="Puntaje"
                    valor={typeof registro.puntaje === 'number' ? registro.puntaje.toLocaleString('es-PE') : 'No aplica'}
                  />
                  <FilaDetalle
                    etiqueta="Estado de ánimo"
                    valor={registro.estado_animo ? formatearEstadoLegible(registro.estado_animo) : 'No aplica'}
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </EstadoVista>
    </ModalPortal>
  )
}