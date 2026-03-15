export type AjustesSeccionId = 'rice' | 'planificacion' | 'modulos' | 'severidades' | 'kpis' | 'integraciones'

export type AjustesPlanificacionTabId = 'ventanas' | 'etapas'

type AjustesSeccion = {
  id: AjustesSeccionId
  etiqueta: string
  descripcion: string
}

export const seccionesAjustes: AjustesSeccion[] = [
  {
    id: 'rice',
    etiqueta: 'Estándar RICE',
    descripcion: 'Configura el estándar base de alcance y esfuerzo usado en iniciativas.'
  },
  {
    id: 'planificacion',
    etiqueta: 'Planificación',
    descripcion: 'Administra ventanas y etapas del calendario operativo del portal.'
  },
  {
    id: 'modulos',
    etiqueta: 'Catálogo de módulos',
    descripcion: 'Gestiona módulos reutilizados por otras capacidades del portal PM.'
  },
  {
    id: 'severidades',
    etiqueta: 'Catálogo de severidades',
    descripcion: 'Mantiene niveles de severidad usados en hallazgos y seguimiento.'
  },
  {
    id: 'kpis',
    etiqueta: 'Configuración de KPIs',
    descripcion: 'Define metas y umbrales operativos para medición interna.'
  },
  {
    id: 'integraciones',
    etiqueta: 'Integraciones',
    descripcion: 'Configura integraciones técnicas y su configuración pública.'
  }
]

export function normalizarSeccionAjustes(valor: string | null): AjustesSeccionId {
  if (valor && seccionesAjustes.some((seccion) => seccion.id === valor)) {
    return valor as AjustesSeccionId
  }

  return 'rice'
}

export function normalizarPestanaPlanificacion(valor: string | null): AjustesPlanificacionTabId {
  return valor === 'etapas' ? 'etapas' : 'ventanas'
}