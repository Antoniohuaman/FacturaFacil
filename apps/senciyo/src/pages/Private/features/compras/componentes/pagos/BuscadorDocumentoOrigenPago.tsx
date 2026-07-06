import { useState } from 'react';
import { Search, CreditCard } from 'lucide-react';
import type { CuentaPorPagar } from '../../modelos/CuentaPorPagar';
import { filtrarCuentasPorPagar } from '../../logica/filtrosCompras';
import { puedeRegistrarPago } from '../../logica/reglasCompras';

interface BuscadorDocumentoOrigenPagoProps {
  cuentasPorPagar: CuentaPorPagar[];
  onSeleccionar: (cxp: CuentaPorPagar) => void;
}

/**
 * Buscador real de documento origen para un Pago sin cuentaPorPagarId previo.
 * Solo lista CxP con saldo pendiente > 0 y estado pendiente/parcial (nunca
 * pagadas, anuladas o sin saldo) — no permite crear ni escribir una CxP
 * inexistente, solo seleccionar una real.
 */
export default function BuscadorDocumentoOrigenPago({
  cuentasPorPagar,
  onSeleccionar,
}: BuscadorDocumentoOrigenPagoProps) {
  const [busqueda, setBusqueda] = useState('');

  const candidatas = cuentasPorPagar.filter(
    (cxp) => puedeRegistrarPago(cxp) && cxp.saldoPendiente > 0,
  );
  const filtradas = filtrarCuentasPorPagar(candidatas, { busqueda });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          autoFocus
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por número de comprobante, proveedor o RUC/DNI..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {filtradas.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {candidatas.length === 0
              ? 'No hay cuentas por pagar con saldo pendiente'
              : 'Sin resultados para la búsqueda'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Documento origen</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Condición</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimiento</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Saldo pendiente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.map((cxp) => (
                <tr
                  key={cxp.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onSeleccionar(cxp)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-[200px]">
                      {cxp.proveedorNombre}
                    </div>
                    <div className="text-xs text-gray-500">{cxp.proveedorNumeroDocumento}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-700">
                    {cxp.comprobanteCompraNumero}
                    <div className="text-xs text-gray-400 font-sans">{cxp.tipoComprobanteOrigen}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {cxp.formaPago === 'contado' ? 'Contado' : 'Crédito'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {cxp.fechaVencimiento ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">
                    {cxp.saldoPendiente.toLocaleString('es-PE', { minimumFractionDigits: 2 })}{' '}
                    <span className="text-xs text-gray-500">{cxp.moneda}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
