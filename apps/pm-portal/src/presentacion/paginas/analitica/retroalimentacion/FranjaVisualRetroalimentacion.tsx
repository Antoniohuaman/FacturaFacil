import type { ReactNode } from 'react'
import { formatearEstadoLegible } from '@/compartido/utilidades/formatoPortal'
import type {
  RespuestaDistribucionesRetroalimentacionPm,
  TipoRetroalimentacionPm
} from '@/dominio/modelos'
import { formatearTipoRetroalimentacion } from '@/presentacion/paginas/analitica/retroalimentacion/retroalimentacionPresentacion'

const ORDEN_TIPOS: TipoRetroalimentacionPm[] = ['estado_animo', 'idea', 'calificacion']

const formateadorFechaVisual = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short'
})

interface PropiedadesTarjetaVisual {
  titulo: string
  detalle?: string | null
  className?: string
  children: ReactNode
}

function TarjetaVisual({ titulo, detalle, className, children }: PropiedadesTarjetaVisual) {
  return (
    <article
      className={`rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-white to-slate-50/80 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/90 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950/70 dark:shadow-none ${className ?? ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{titulo}</h2>
          {detalle ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detalle}</p> : null}
        </div>
      </div>
      <div className="mt-3.5">{children}</div>
    </article>
  )
}

function EstadoVacioVisual({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex min-h-24 items-center rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
      {mensaje}
    </div>
  )
}

function porcentaje(valor: number, total: number) {
  if (total <= 0) {
    return 0
  }

  return Math.round((valor / total) * 100)
}

function formatearNumero(valor: number) {
  return valor.toLocaleString('es-PE')
}

function obtenerAcentoTipo(tipo: TipoRetroalimentacionPm) {
  if (tipo === 'estado_animo') {
    return {
      barraClase: 'bg-sky-500 dark:bg-sky-400',
      superficieClase: 'bg-sky-50 dark:bg-sky-950/30',
      acentoClase: 'text-sky-700 dark:text-sky-300'
    }
  }

  if (tipo === 'calificacion') {
    return {
      barraClase: 'bg-amber-500 dark:bg-amber-400',
      superficieClase: 'bg-amber-50 dark:bg-amber-950/30',
      acentoClase: 'text-amber-700 dark:text-amber-300'
    }
  }

  return {
    barraClase: 'bg-emerald-500 dark:bg-emerald-400',
    superficieClase: 'bg-emerald-50 dark:bg-emerald-950/30',
    acentoClase: 'text-emerald-700 dark:text-emerald-300'
  }
}

function obtenerAcentoEstadoAnimo(estado: string) {
  const normalizado = estado.toLowerCase()

  if (/(bien|feliz|alegr|content|satis|positivo|motivad|excelente)/.test(normalizado)) {
    return {
      barraClase: 'bg-emerald-500 dark:bg-emerald-400',
      superficieClase: 'bg-emerald-50 dark:bg-emerald-950/30',
      acentoClase: 'text-emerald-600 dark:text-emerald-300'
    }
  }

  if (/(neutral|estable|normal|regular|indiferente)/.test(normalizado)) {
    return {
      barraClase: 'bg-slate-500 dark:bg-slate-300',
      superficieClase: 'bg-slate-100 dark:bg-slate-800/80',
      acentoClase: 'text-slate-600 dark:text-slate-300'
    }
  }

  if (/(mal|triste|frustr|molest|enoj|agot|cansad|negativ)/.test(normalizado)) {
    return {
      barraClase: 'bg-rose-500 dark:bg-rose-400',
      superficieClase: 'bg-rose-50 dark:bg-rose-950/30',
      acentoClase: 'text-rose-600 dark:text-rose-300'
    }
  }

  return {
    barraClase: 'bg-violet-500 dark:bg-violet-400',
    superficieClase: 'bg-violet-50 dark:bg-violet-950/30',
    acentoClase: 'text-violet-600 dark:text-violet-300'
  }
}

function DistribucionTiposCompacta({ distribuciones }: { distribuciones: RespuestaDistribucionesRetroalimentacionPm }) {
  const items = ORDEN_TIPOS.map((tipo) => {
    const total = distribuciones.por_tipo.find((item) => item.tipo === tipo)?.total ?? 0

    return {
      id: tipo,
      etiqueta: formatearTipoRetroalimentacion(tipo),
      total,
      ...obtenerAcentoTipo(tipo)
    }
  })

  const total = items.reduce((acumulado, item) => acumulado + item.total, 0)

  if (total === 0) {
    return <EstadoVacioVisual mensaje="Todavía no hay registros suficientes para mostrar distribución por tipo." />
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span>Distribución por tipo</span>
        <span>{formatearNumero(total)} registros</span>
      </div>

      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {items.map((item) => {
          if (item.total === 0) {
            return null
          }

          return (
            <div
              key={item.id}
              className={item.barraClase}
              style={{ width: `${Math.max((item.total / total) * 100, 6)}%` }}
            />
          )
        })}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {items.map((item) => {
          const proporcion = porcentaje(item.total, total)

          return (
            <div key={item.id} className={`rounded-xl px-3 py-2 ${item.superficieClase}`}>
              <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <span>{item.etiqueta}</span>
                <span className={`font-semibold ${item.acentoClase}`}>{proporcion}%</span>
              </div>
              <p className="mt-1.5 text-lg font-semibold text-slate-900 dark:text-slate-100">{formatearNumero(item.total)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PanelActividadPrincipal({ distribuciones }: { distribuciones: RespuestaDistribucionesRetroalimentacionPm }) {
  const serie = distribuciones.serie_diaria.slice(-14)

  if (serie.length === 0) {
    return (
      <div className="space-y-4">
        <EstadoVacioVisual mensaje="Todavía no hay actividad diaria suficiente para mostrar tendencia." />
        <DistribucionTiposCompacta distribuciones={distribuciones} />
      </div>
    )
  }

  const ancho = 480
  const alto = 108
  const baseY = alto - 8
  const maximo = Math.max(...serie.map((item) => item.total), 1)
  const minimo = Math.min(...serie.map((item) => item.total), 0)
  const rango = Math.max(maximo - minimo, 1)

  const puntos = serie.map((item, indice) => {
    const x = serie.length === 1 ? ancho / 2 : (indice / (serie.length - 1)) * ancho
    const y = baseY - ((item.total - minimo) / rango) * (alto - 22)

    return {
      ...item,
      x,
      y
    }
  })

  const linea = puntos
    .map((punto, indice) => `${indice === 0 ? 'M' : 'L'} ${punto.x.toFixed(2)} ${punto.y.toFixed(2)}`)
    .join(' ')

  const area = `${linea} L ${puntos[puntos.length - 1]?.x.toFixed(2) ?? '0'} ${baseY} L ${puntos[0]?.x.toFixed(2) ?? '0'} ${baseY} Z`
  const ultimo = serie[serie.length - 1]
  const pico = serie.reduce((mayor, actual) => (actual.total > mayor.total ? actual : mayor), serie[0])
  const inicio = serie[0]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {formatearNumero(ultimo.total)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Actividad del último día</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Pico {formatearNumero(pico.total)}
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {serie.length} días
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3 dark:border-slate-800 dark:bg-slate-950/40">
        <svg viewBox={`0 0 ${ancho} ${alto}`} className="h-28 w-full" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="retroalimentacionActividad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" y1={baseY} x2={ancho} y2={baseY} className="stroke-slate-200 dark:stroke-slate-800" />
          <path d={area} fill="url(#retroalimentacionActividad)" className="text-slate-500 dark:text-slate-300" />
          <path d={linea} className="fill-none stroke-slate-700 dark:stroke-slate-200" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
          <circle
            cx={puntos[puntos.length - 1]?.x ?? 0}
            cy={puntos[puntos.length - 1]?.y ?? 0}
            r="3.5"
            className="fill-slate-900 dark:fill-slate-100"
          />
        </svg>

        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>{formateadorFechaVisual.format(new Date(`${inicio.fecha}T00:00:00`))}</span>
          <span>{formateadorFechaVisual.format(new Date(`${ultimo.fecha}T00:00:00`))}</span>
        </div>
      </div>

      <DistribucionTiposCompacta distribuciones={distribuciones} />
    </div>
  )
}

function DonutEstadosAnimo({ distribuciones }: { distribuciones: RespuestaDistribucionesRetroalimentacionPm }) {
  const baseEstados = [...distribuciones.estados_animo].sort((a, b) => b.total - a.total)

  if (baseEstados.length === 0) {
    return <EstadoVacioVisual mensaje="Aún no hay estados de ánimo registrados para esta vista." />
  }

  const estados =
    baseEstados.length <= 4
      ? baseEstados
      : [
          ...baseEstados.slice(0, 3),
          {
            estado_animo: 'otros',
            total: baseEstados.slice(3).reduce((acumulado, item) => acumulado + item.total, 0)
          }
        ]

  const total = estados.reduce((acumulado, item) => acumulado + item.total, 0)
  const tamano = 108
  const grosor = 12
  const radio = (tamano - grosor) / 2
  const circunferencia = 2 * Math.PI * radio
  let desplazamiento = 0

  const segmentos = estados.map((item) => {
    const longitud = (item.total / total) * circunferencia
    const segmento = {
      ...item,
      longitud,
      desplazamiento,
      porcentaje: porcentaje(item.total, total),
      ...obtenerAcentoEstadoAnimo(item.estado_animo)
    }

    desplazamiento += longitud
    return segmento
  })

  const principal = segmentos[0]

  return (
    <div className="grid gap-4 sm:grid-cols-[108px_minmax(0,1fr)] sm:items-center">
      <div className="relative mx-auto h-28 w-28">
        <svg viewBox={`0 0 ${tamano} ${tamano}`} className="h-28 w-28" aria-hidden="true">
          <circle
            cx={tamano / 2}
            cy={tamano / 2}
            r={radio}
            className="fill-none stroke-slate-200 dark:stroke-slate-800"
            strokeWidth={grosor}
          />
          {segmentos.map((segmento) => (
            <circle
              key={segmento.estado_animo}
              cx={tamano / 2}
              cy={tamano / 2}
              r={radio}
              className={`fill-none stroke-current ${segmento.acentoClase}`}
              strokeWidth={grosor}
              strokeDasharray={`${segmento.longitud} ${circunferencia - segmento.longitud}`}
              strokeDashoffset={-segmento.desplazamiento}
              strokeLinecap="round"
              transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {formatearNumero(total)}
          </span>
          <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            estados
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {principal ? `Predomina ${formatearEstadoLegible(principal.estado_animo)}.` : 'Sin dominante claro.'}
        </p>
        {segmentos.map((segmento) => (
          <div key={segmento.estado_animo} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${segmento.barraClase}`} />
            <span className="truncate text-slate-700 dark:text-slate-200">{formatearEstadoLegible(segmento.estado_animo)}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatearNumero(segmento.total)} · {segmento.porcentaje}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HistogramaCalificaciones({ distribuciones }: { distribuciones: RespuestaDistribucionesRetroalimentacionPm }) {
  const puntajes = [...distribuciones.puntajes].sort((a, b) => a.puntaje - b.puntaje)

  if (puntajes.length === 0) {
    return <EstadoVacioVisual mensaje="Aún no hay calificaciones con puntaje para mostrar distribución." />
  }

  const maximo = Math.max(...puntajes.map((item) => item.total), 1)

  return (
    <div className="space-y-3">
      <div className="flex h-28 items-end gap-2.5">
        {puntajes.map((item) => {
          const altura = Math.max(Math.round((item.total / maximo) * 100), item.total > 0 ? 18 : 0)

          return (
            <div key={item.puntaje} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatearNumero(item.total)}</span>
              <div className="flex h-20 w-full items-end rounded-xl bg-slate-100/90 px-1.5 dark:bg-slate-950/50">
                <div
                  className="w-full rounded-lg bg-gradient-to-t from-amber-500 to-amber-400 dark:from-amber-400 dark:to-amber-300"
                  style={{ height: `${altura}%` }}
                />
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                {item.puntaje.toLocaleString('es-PE')}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Concentración por puntaje</span>
        <span>{puntajes.length} valores visibles</span>
      </div>
    </div>
  )
}

export function FranjaVisualRetroalimentacion({
  distribuciones
}: {
  distribuciones: RespuestaDistribucionesRetroalimentacionPm
}) {
  return (
    <section className="grid gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
      <TarjetaVisual
        titulo="Actividad reciente"
        detalle="Serie diaria y mezcla de señales"
      >
        <PanelActividadPrincipal distribuciones={distribuciones} />
      </TarjetaVisual>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <TarjetaVisual titulo="Estados de ánimo" detalle="Lectura compacta del tono reportado">
          <DonutEstadosAnimo distribuciones={distribuciones} />
        </TarjetaVisual>

        <TarjetaVisual titulo="Calificaciones" detalle="Reparto de puntajes">
          <HistogramaCalificaciones distribuciones={distribuciones} />
        </TarjetaVisual>
      </div>
    </section>
  )
}