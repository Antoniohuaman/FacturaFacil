export interface ColumnaCsv<T> {
  encabezado: string
  valor: (fila: T) => string | number | boolean | null | undefined
}

function escaparValorCsv(valor: string) {
  const valorEscapado = valor.replace(/"/g, '""')
  return /[",\n;]/.test(valorEscapado) ? `"${valorEscapado}"` : valorEscapado
}

function serializarValorCsv(valor: string | number | boolean | null | undefined) {
  if (valor === null || valor === undefined) {
    return ''
  }

  if (typeof valor === 'boolean') {
    return valor ? 'Sí' : 'No'
  }

  return escaparValorCsv(String(valor))
}

export function exportarCsv<T>(nombreArchivo: string, columnas: ColumnaCsv<T>[], filas: T[]) {
  const lineas = [
    columnas.map((columna) => escaparValorCsv(columna.encabezado)).join(','),
    ...filas.map((fila) => columnas.map((columna) => serializarValorCsv(columna.valor(fila))).join(','))
  ]

  const contenido = `\ufeff${lineas.join('\n')}`
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')

  enlace.href = url
  enlace.download = nombreArchivo
  enlace.click()

  URL.revokeObjectURL(url)
}