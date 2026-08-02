// shared/status/estadoPago.ts
//
// Estado de pago transversal — fuente ÚNICA para Compras y Gastos (y
// cualquier dominio futuro con CxP/Pagos). `compras/modelos/CuentaPorPagar.ts`
// reexporta este mismo tipo por compatibilidad con el código existente;
// `compras/constantes/estadosCompras.ts` reexporta el mismo badge. Nunca una
// segunda unión ni un segundo mapa de colores paralelo.

export type EstadoPago = 'pendiente' | 'parcial' | 'pagado';

export const ESTADO_PAGO_LABELS: Record<EstadoPago, string> = {
  pendiente: 'Pendiente',
  parcial: 'Pago parcial',
  pagado: 'Pagado',
};

export const BADGE_ESTADO_PAGO: Record<EstadoPago, string> = {
  pendiente: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  parcial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  pagado: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};
