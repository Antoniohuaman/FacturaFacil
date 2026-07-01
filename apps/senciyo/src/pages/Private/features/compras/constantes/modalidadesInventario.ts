import type { ModalidadInventarioCC } from '../modelos/ComprobanteCompra';

export const MODALIDAD_INVENTARIO_DESCRIPCION: Record<ModalidadInventarioCC, string> = {
  con_nota_ingreso: 'Genera o vincula una Nota de Ingreso en Inventario',
  ingreso_automatico: 'Actualiza el stock automáticamente al registrar el comprobante',
  no_afecta_inventario: 'No genera movimiento de stock (servicios, gastos, suministros sin control)',
};
