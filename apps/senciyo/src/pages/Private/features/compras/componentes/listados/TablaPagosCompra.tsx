import { useState } from 'react';
import { Eye, Ban, Search, Wallet } from 'lucide-react';
import type { PagoCompra } from '../../modelos/PagoCompra';
import { ESTADO_DOCUMENTO_PAGO_LABELS } from '../../modelos/PagoCompra';
import { BADGE_ESTADO_DOCUMENTO_PAGO } from '../../constantes/estadosCompras';
import { filtrarPagosCompra, type FiltrosPagos } from '../../logica/filtrosCompras';
import { puedeAnularPago } from '../../logica/reglasCompras';

interface TablaPagosCompraProps {
  pagos: PagoCompra[];
  onVer: (pago: PagoCompra) => void;
  onAnular: (pago: PagoCompra) => void;
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

export default function TablaPagosCompra({ pagos, onVer, onAnular }: TablaPagosCompraProps) {
  const [filtros, setFiltros] = useState<FiltrosPagos>({ busqueda: '' });
  const filtrados = filtrarPagosCompra(pagos, filtros);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filtros.busqueda ?? ''}
            onChange={(e) => setFiltros((f) => ({ ...f, busqueda: e.target.value }))}
            placeholder="Buscar por número de pago o proveedor..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select
          value={filtros.estadoDocumento ?? ''}
          onChange={(e) => setFiltros((f) => ({ ...f, estadoDocumento: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Todos los estados</option>
          <option value="registrado">Registrado</option>
          <option value="anulado">Anulado</option>
        </select>
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Wallet size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {pagos.length === 0 ? 'No hay pagos registrados' : 'Sin resultados para la búsqueda'}
          </p>
          {pagos.length === 0 && (
            <p className="text-sm mt-1">
              Los pagos se registran desde las cuentas por pagar.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Número</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Medios</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map((pago) => (
                <tr key={pago.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">
                    {pago.numeroPago}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-[180px]">
                      {pago.proveedorNombre}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{pago.fechaPago}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {pago.mediosPago.map((mp) => (
                        <span
                          key={mp.id}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
                        >
                          {mp.medioPagoNombre}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">
                    {pago.montoTotalPagado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}{' '}
                    <span className="text-xs text-gray-500">{pago.moneda}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      estado={pago.estadoDocumento}
                      labels={ESTADO_DOCUMENTO_PAGO_LABELS}
                      clases={BADGE_ESTADO_DOCUMENTO_PAGO}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => onVer(pago)}
                        title="Ver detalle"
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                      {puedeAnularPago(pago) && (
                        <button
                          onClick={() => onAnular(pago)}
                          title="Anular pago"
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
        Mostrando {filtrados.length} de {pagos.length} pagos
      </p>
    </div>
  );
}
