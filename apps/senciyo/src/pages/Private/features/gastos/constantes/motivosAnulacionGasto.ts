// Motivos de anulación de Gasto — mismo patrón que
// `compras/constantes/motivosAnulacionCompras.ts` (un array por dominio,
// nunca un motivo genérico "Otro" sin estructura). El motivo de anulación de
// un Pago de gasto reutiliza directamente `MOTIVOS_ANULACION_PAGO` de
// Compras (los motivos de anular un pago son genéricos al medio de pago, no
// específicos de Compras — nunca una segunda lista idéntica).
export const MOTIVOS_ANULACION_GASTO = [
  'Gasto duplicado',
  'Error en importes',
  'Categoría incorrecta',
  'Proveedor o beneficiario incorrecto',
  'Otro',
] as const;

export type MotivoAnulacionGasto = (typeof MOTIVOS_ANULACION_GASTO)[number];
