// Tipo compartido de medios de pago de caja (nivel UI/operación)
// Mantiene compatibilidad con los valores usados actualmente en Configuración y Control de Caja.

export type MedioPago =
  | 'Efectivo'
  | 'Tarjeta'
  | 'Yape'
  | 'Plin'
  | 'Transferencia'
  | 'Deposito';
