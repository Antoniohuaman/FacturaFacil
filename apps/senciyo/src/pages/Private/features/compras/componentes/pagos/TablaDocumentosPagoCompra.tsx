import type { CuentaPorPagar } from '../../modelos/CuentaPorPagar';
import { formatMoney } from '@/shared/currency';
import { resolverNombreFormaPago } from '../../logica/reglasCompras';
import { getNombreTipoDocumentoProveedor } from '../../constantes/tiposDocumentoProveedor';
import { formatearFechaCompra } from '../../utilidades/formatearCompras';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';

interface TablaDocumentosPagoCompraProps {
  /** Documentos ya elegidos en el paso previo de selección (mismo proveedor y moneda). */
  documentos: CuentaPorPagar[];
  /** Importe a aplicar por CxP (cuentaPorPagarId -> monto). */
  aplicaciones: Record<string, number>;
  onCambiarAplicacion: (cuentaPorPagarId: string, importe: number) => void;
  moneda: string;
  disabled?: boolean;
}

/**
 * "Documentos a pagar": uno o varios documentos del mismo proveedor y
 * moneda, cada uno con su propio importe a aplicar (por defecto, su saldo
 * pendiente completo) — soporta pago total, parcial, o mixto sobre varios
 * documentos en un solo Pago (§8-§10 del alcance). Mismo patrón visual que
 * el resto de tablas de Compras (BuscadorDocumentoOrigenPago, TablaOrdenesCompra).
 */
export default function TablaDocumentosPagoCompra({
  documentos,
  aplicaciones,
  onCambiarAplicacion,
  moneda,
  disabled = false,
}: TablaDocumentosPagoCompraProps) {
  const { state: config } = useConfigurationContext();

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Documento</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Condición</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimiento</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Saldo pendiente</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Importe a aplicar</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Saldo resultante</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {documentos.map((cxp) => {
            const importe = aplicaciones[cxp.id] ?? 0;
            const saldoResultante = Math.max(0, Math.round((cxp.saldoPendiente - importe) * 100) / 100);
            return (
              <tr key={cxp.id}>
                <td className="px-4 py-3 font-mono text-gray-700">
                  {cxp.comprobanteCompraNumero}
                  <div className="text-xs text-gray-400 font-sans">
                    {getNombreTipoDocumentoProveedor(cxp.tipoComprobanteOrigen)}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{resolverNombreFormaPago(cxp, config.paymentMethods)}</td>
                <td className="px-4 py-3 text-gray-600">
                  {cxp.fechaVencimiento ? formatearFechaCompra(cxp.fechaVencimiento) : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-right font-mono">{formatMoney(cxp.saldoPendiente, moneda)}</td>
                <td className="px-4 py-3 text-right">
                  <input
                    type="number"
                    min={0}
                    max={cxp.saldoPendiente}
                    step="0.01"
                    disabled={disabled}
                    value={importe}
                    onChange={(e) => onCambiarAplicacion(cxp.id, parseFloat(e.target.value))}
                    className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50"
                  />
                </td>
                <td className={`px-4 py-3 text-right font-semibold ${saldoResultante <= 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                  {formatMoney(saldoResultante, moneda)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
