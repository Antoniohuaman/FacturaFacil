export type ClaveMetricaKpi =
  | 'activacion_porcentaje'
  | 'ventas_completadas'
  | 'productos_creados'
  | 'clientes_creados'
  | 'importacion_realizada'
  | 'usuarios_activos'

export interface ConfiguracionMetaKpi {
  metaPorPeriodo: {
    7: number
    30: number
    90: number
  }
  umbralesCumplimiento: {
    ok: number
    atencion: number
  }
}

export const configuracionMetasKpi: Record<ClaveMetricaKpi, ConfiguracionMetaKpi> = {
  activacion_porcentaje: {
    metaPorPeriodo: { 7: 25, 30: 30, 90: 35 },
    umbralesCumplimiento: { ok: 1, atencion: 0.7 }
  },
  ventas_completadas: {
    metaPorPeriodo: { 7: 120, 30: 450, 90: 1200 },
    umbralesCumplimiento: { ok: 1, atencion: 0.7 }
  },
  productos_creados: {
    metaPorPeriodo: { 7: 60, 30: 180, 90: 450 },
    umbralesCumplimiento: { ok: 1, atencion: 0.7 }
  },
  clientes_creados: {
    metaPorPeriodo: { 7: 40, 30: 140, 90: 360 },
    umbralesCumplimiento: { ok: 1, atencion: 0.7 }
  },
  importacion_realizada: {
    metaPorPeriodo: { 7: 10, 30: 40, 90: 120 },
    umbralesCumplimiento: { ok: 1, atencion: 0.7 }
  },
  usuarios_activos: {
    metaPorPeriodo: { 7: 80, 30: 250, 90: 600 },
    umbralesCumplimiento: { ok: 1, atencion: 0.7 }
  }
}
