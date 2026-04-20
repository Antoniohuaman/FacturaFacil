import { formatearEstadoLegible } from '@/compartido/utilidades/formatoPortal'
import type { RegistroRetroalimentacionPm } from '@/dominio/modelos'
import { formatearTipoRetroalimentacion } from '@/presentacion/paginas/analitica/retroalimentacion/retroalimentacionPresentacion'

export interface FiltroExportacionRetroalimentacion {
  etiqueta: string
  valor: string
}

interface PropiedadesExportacionRetroalimentacionExcel {
  registros: RegistroRetroalimentacionPm[]
  filtros: FiltroExportacionRetroalimentacion[]
  exportadoEn?: Date
}

interface ColumnaExportacionRetroalimentacion {
  encabezado: string
  ancho: number
  obtenerValor: (registro: RegistroRetroalimentacionPm) => string | number
}

const COLUMNAS_EXPORTACION: ColumnaExportacionRetroalimentacion[] = [
  {
    encabezado: 'Fecha',
    ancho: 22,
    obtenerValor: (registro) => formatearFechaExportacion(registro.created_at)
  },
  {
    encabezado: 'Tipo',
    ancho: 18,
    obtenerValor: (registro) => formatearTipoRetroalimentacion(registro.tipo)
  },
  {
    encabezado: 'Usuario',
    ancho: 28,
    obtenerValor: (registro) => registro.usuario_nombre
  },
  {
    encabezado: 'Usuario correo',
    ancho: 32,
    obtenerValor: (registro) => registro.usuario_correo ?? ''
  },
  {
    encabezado: 'Empresa',
    ancho: 28,
    obtenerValor: (registro) => registro.empresa_nombre
  },
  {
    encabezado: 'Empresa RUC',
    ancho: 18,
    obtenerValor: (registro) => registro.empresa_ruc ?? ''
  },
  {
    encabezado: 'Empresa razón social',
    ancho: 36,
    obtenerValor: (registro) => registro.empresa_razon_social ?? ''
  },
  {
    encabezado: 'Establecimiento',
    ancho: 28,
    obtenerValor: (registro) => registro.establecimiento_nombre ?? ''
  },
  {
    encabezado: 'Modulo',
    ancho: 22,
    obtenerValor: (registro) => registro.modulo
  },
  {
    encabezado: 'Senal',
    ancho: 42,
    obtenerValor: (registro) => registro.valor_principal
  },
  {
    encabezado: 'Detalle',
    ancho: 56,
    obtenerValor: (registro) => registro.detalle ?? ''
  },
  {
    encabezado: 'Ruta',
    ancho: 44,
    obtenerValor: (registro) => registro.ruta
  },
  {
    encabezado: 'Puntaje',
    ancho: 12,
    obtenerValor: (registro) => registro.puntaje ?? ''
  },
  {
    encabezado: 'Estado de animo',
    ancho: 20,
    obtenerValor: (registro) =>
      registro.estado_animo ? formatearEstadoLegible(registro.estado_animo) : ''
  }
]

const formateadorFechaExportacion = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

function formatearFechaExportacion(valor: string) {
  const fecha = new Date(valor)

  if (Number.isNaN(fecha.getTime())) {
    return valor
  }

  return formateadorFechaExportacion.format(fecha)
}

function construirNombreArchivo(exportadoEn: Date) {
  const yyyy = exportadoEn.getFullYear()
  const mm = String(exportadoEn.getMonth() + 1).padStart(2, '0')
  const dd = String(exportadoEn.getDate()).padStart(2, '0')
  const hh = String(exportadoEn.getHours()).padStart(2, '0')
  const min = String(exportadoEn.getMinutes()).padStart(2, '0')

  return `retroalimentacion_${yyyy}-${mm}-${dd}_${hh}${min}.xlsx`
}

function descargarArchivoExcel(buffer: ArrayBuffer, nombreArchivo: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = nombreArchivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function exportarRetroalimentacionExcel({
  registros,
  filtros,
  exportadoEn = new Date()
}: PropiedadesExportacionRetroalimentacionExcel) {
  if (registros.length === 0) {
    throw new Error('No hay registros para exportar con los filtros actuales.')
  }

  const XLSX = await import('xlsx')

  const hojaDatos = XLSX.utils.aoa_to_sheet([
    COLUMNAS_EXPORTACION.map((columna) => columna.encabezado),
    ...registros.map((registro) => COLUMNAS_EXPORTACION.map((columna) => columna.obtenerValor(registro)))
  ])

  hojaDatos['!cols'] = COLUMNAS_EXPORTACION.map((columna) => ({ wch: columna.ancho }))
  hojaDatos['!autofilter'] = {
    ref: `A1:${XLSX.utils.encode_cell({ r: 0, c: COLUMNAS_EXPORTACION.length - 1 })}`
  }

  const hojaContexto = XLSX.utils.aoa_to_sheet([
    ['Exportacion', 'Retroalimentacion'],
    ['Fecha de exportacion', formateadorFechaExportacion.format(exportadoEn)],
    ['Total de registros', registros.length.toLocaleString('es-PE')],
    [],
    ['Filtro', 'Valor'],
    ...(filtros.length > 0
      ? filtros.map((filtro) => [filtro.etiqueta, filtro.valor])
      : [['Vista', 'Sin filtros aplicados']])
  ])

  hojaContexto['!cols'] = [{ wch: 24 }, { wch: 52 }]

  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hojaDatos, 'Retroalimentacion')
  XLSX.utils.book_append_sheet(libro, hojaContexto, 'Contexto')

  const buffer = XLSX.write(libro, {
    bookType: 'xlsx',
    type: 'array',
    compression: true
  })

  descargarArchivoExcel(buffer, construirNombreArchivo(exportadoEn))
}