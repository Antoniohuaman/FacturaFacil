import { useState } from 'react';
import { Eye, Ban, Search, Plus, Receipt } from 'lucide-react';
import type { ComprobanteCompra } from '../../modelos/ComprobanteCompra';
import {
  ESTADO_DOCUMENTO_CC_LABELS,
  ESTADO_PAGO_CC_LABELS,
} from '../../modelos/ComprobanteCompra';
import {
  BADGE_ESTADO_DOCUMENTO_CC,
  BADGE_ESTADO_PAGO_CC,
} from '../../constantes/estadosCompras';
import { filtrarComprobantesCompra, type FiltrosCC } from '../../logica/filtrosCompras';
import { puedeAnularCC } from '../../logica/reglasCompras';

interface TablaComprobantesCompraProps {
  comprobantes: ComprobanteCompra[];
  onVer: (cc: ComprobanteCompra) => void;
  onAnular: (cc: ComprobanteCompra) => void;
  onNuevo: () => void;
}

function Badge({
  estado,
  labels,
  clases,
}: {
  estado: string;
  labels: Record<string, string>;
  clases: Record<string, string>;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${clases[estado] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {labels[estado] ?? estado}
    </span>
  );
}

export default function TablaComprobantesCompra({
  comprobantes,
  onVer,
  onAnular,
  onNuevo,
}: TablaComprobantesCompraProps) {
  const [filtros, setFiltros] = useState<FiltrosCC>({ busqueda: '' });
  const filtrados = filtrarComprobantesCompra(comprobantes, filtros);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filtros.busqueda ?? ''}
            onChange={(e) => setFiltros((f) => ({ ...f, busqueda: e.target.value }))}
            placeholder="Buscar por número, proveedor o RUC..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select
          value={filtros.estadoPago ?? ''}
          onChange={(e) => setFiltros((f) => ({ ...f, estadoPago: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="parcial">Pago parcial</option>
          <option value="pagado">Pagado</option>
        </select>
        <button
          onClick={onNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Registrar CC
        </button>
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Receipt size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {comprobantes.length === 0
              ? 'No hay comprobantes de compra'
              : 'Sin resultados para la búsqueda'}
          </p>
          {comprobantes.length === 0 && (
            <p className="text-sm mt-1">Registra el primer comprobante de compra.</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Comprobante</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">F. Emisión</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">F. Registro</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pago</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map((cc) => (
                <tr key={cc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">
                    {cc.serieProveedor}-{cc.numeroProveedor}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-[180px]">
                      {cc.proveedorNombre}
                    </div>
                    <div className="text-xs text-gray-500">{cc.proveedorNumeroDocumento}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{cc.fechaEmisionProveedor}</td>
                  <td className="px-4 py-3 text-gray-600">{cc.fechaRegistro.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {cc.totales.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}{' '}
                    <span className="text-gray-500 text-xs">{cc.moneda}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      estado={cc.estadoPago}
                      labels={ESTADO_PAGO_CC_LABELS}
                      clases={BADGE_ESTADO_PAGO_CC}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      estado={cc.estadoDocumento}
                      labels={ESTADO_DOCUMENTO_CC_LABELS}
                      clases={BADGE_ESTADO_DOCUMENTO_CC}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => onVer(cc)}
                        title="Ver detalle"
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                      {puedeAnularCC(cc) && (
                        <button
                          onClick={() => onAnular(cc)}
                          title="Anular"
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Ban size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Mostrando {filtrados.length} de {comprobantes.length} comprobantes
      </p>
    </div>
  );
}
