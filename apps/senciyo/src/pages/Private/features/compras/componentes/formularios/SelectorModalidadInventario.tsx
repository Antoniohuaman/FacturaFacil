import { HelpCircle } from 'lucide-react';
import { Tooltip } from '@/shared/ui';
import type { ModalidadInventarioCC } from '../../modelos/ComprobanteCompra';
import type { Almacen } from '../../../configuracion-sistema/modelos/Almacen';

interface SelectorModalidadInventarioProps {
  modalidad: ModalidadInventarioCC;
  onCambiarModalidad: (modalidad: ModalidadInventarioCC) => void;
  almacenesActivos: Almacen[];
  almacenId: string;
  onCambiarAlmacen: (almacenId: string) => void;
}

/**
 * Control compacto de afectación de inventario del comprobante de compra:
 * modalidad (con/sin Nota de Ingreso) + almacén destino cuando aplica. No
 * mueve stock ni conecta con Inventario: solo prepara el dato para la Nota
 * de Ingreso que el usuario genere después, manualmente, en ese módulo.
 */
export default function SelectorModalidadInventario({
  modalidad,
  onCambiarModalidad,
  almacenesActivos,
  almacenId,
  onCambiarAlmacen,
}: SelectorModalidadInventarioProps) {
  const conNotaIngreso = modalidad === 'con_nota_ingreso';

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">Inventario</label>
      <select
        value={modalidad}
        onChange={(e) => onCambiarModalidad(e.target.value as ModalidadInventarioCC)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <option value="con_nota_ingreso">Con Nota de Ingreso</option>
        <option value="no_afecta_inventario">No afecta inventario</option>
      </select>

      {conNotaIngreso && almacenesActivos.length > 0 && (
        <div className="flex items-center gap-1.5">
          <select
            value={almacenId}
            onChange={(e) => onCambiarAlmacen(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {almacenesActivos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombreAlmacen}
              </option>
            ))}
          </select>
          <Tooltip contenido="Se usará para preparar la Nota de Ingreso. No mueve stock automáticamente.">
            <HelpCircle size={15} className="text-gray-400 shrink-0" />
          </Tooltip>
        </div>
      )}

      {conNotaIngreso && almacenesActivos.length === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          No hay almacenes activos. Ve a Configuración → Almacenes.
        </p>
      )}
    </div>
  );
}
