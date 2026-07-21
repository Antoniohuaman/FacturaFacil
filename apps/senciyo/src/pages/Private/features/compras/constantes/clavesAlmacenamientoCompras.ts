export const CLAVES_COMPRAS = {
  REQUERIMIENTOS_COMPRA: 'compras_requerimientos_compra_v1',
  ORDENES_COMPRA: 'compras_ordenes_compra_v1',
  COMPROBANTES_COMPRA: 'compras_comprobantes_compra_v1',
  CUENTAS_POR_PAGAR: 'compras_cuentas_por_pagar_v1',
  PAGOS: 'compras_pagos_v1',
  COLUMNAS_REQUERIMIENTOS: 'compras_requerimientos_columnas_v1',
  COLUMNAS_OC: 'compras_oc_columnas_v1',
  COLUMNAS_CC: 'compras_cc_columnas_v1',
  COLUMNAS_CXP: 'compras_cxp_columnas_v1',
  COLUMNAS_PAGOS: 'compras_pagos_columnas_v1',
} as const;

export type ClaveAlmacenamientoCompras = (typeof CLAVES_COMPRAS)[keyof typeof CLAVES_COMPRAS];
