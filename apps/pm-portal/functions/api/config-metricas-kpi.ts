export type ClaveMetricaKpi =
  | 'activacion_porcentaje'
  | 'ventas_completadas'
  | 'productos_creados'
  | 'clientes_creados'
  | 'importacion_realizada'
  | 'usuarios_activos'

export interface ConfiguracionMetaKpi {
  metaPorPeriodo: {
    7: number | null
    30: number | null
    90: number | null
  }
  umbralesCumplimiento: {
    ok: number | null
    atencion: number | null
  }
}

function construirConfiguracionSinMeta(): ConfiguracionMetaKpi {
  return {
    metaPorPeriodo: {
      7: null,
      30: null,
      90: null
    },
    umbralesCumplimiento: {
      ok: null,
      atencion: null
    }
  }
}

export const configuracionMetasKpi: Record<ClaveMetricaKpi, ConfiguracionMetaKpi> = {
  activacion_porcentaje: construirConfiguracionSinMeta(),
  ventas_completadas: construirConfiguracionSinMeta(),
  productos_creados: construirConfiguracionSinMeta(),
  clientes_creados: construirConfiguracionSinMeta(),
  importacion_realizada: construirConfiguracionSinMeta(),
  usuarios_activos: construirConfiguracionSinMeta()
}
