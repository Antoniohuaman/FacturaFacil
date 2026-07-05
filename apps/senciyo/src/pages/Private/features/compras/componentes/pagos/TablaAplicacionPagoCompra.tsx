import type { CuentaPorPagar, CuotaCuentaPorPagar } from '../../modelos/CuentaPorPagar';
import { calcularDiasVencidos, calcularDiasCredito } from '../../servicios/servicioCuentaPorPagar';
import { TIPOS_DOCUMENTO_PROVEEDOR_POR_CODIGO } from '../../constantes/tiposDocumentoProveedor';

interface TablaAplicacionPagoCompraProps {
  cxp: CuentaPorPagar;
  seleccionada: boolean;
  onCambiarSeleccion: (seleccionada: boolean) => void;
  importeAplicado: number;
  onCambiarImporte: (valor: number) => void;
}

/**
 * "Documento a pagar": Fase 1 solo soporta una Cuenta por Pagar y su cuota
 * real (generarCuotasDesdeCC produce siempre 1 cuota). Si la CxP no trae
 * cuotas (dato heredado), se arma una única fila con los campos reales de la
 * propia CxP — nunca se inventan cuotas ni se soporta pago múltiple aquí.
 */
export default function TablaAplicacionPagoCompra({
  cxp,
  seleccionada,
  onCambiarSeleccion,
  importeAplicado,
  onCambiarImporte,
}: TablaAplicacionPagoCompraProps) {
  const filas: CuotaCuentaPorPagar[] =
    cxp.cuotas && cxp.cuotas.length > 0
      ? cxp.cuotas
      : [
          {
            id: cxp.id,
            numeroCuota: 1,
            fechaVencimiento: cxp.fechaVencimiento ?? cxp.fechaEmision,
            montoCuota: cxp.total,
            montoPagado: cxp.totalPagado,
            saldoPendiente: cxp.saldoPendiente,
            estadoPago: cxp.estadoPago === 'pagada' ? 'pagada' : cxp.estadoPago === 'parcial' ? 'parcial' : 'pendiente',
            estadoVencimiento: cxp.estadoVencimiento,
          },
        ];
  const esFilaUnica = filas.length === 1;
  const tipoComprobanteLabel = TIPOS_DOCUMENTO_PROVEEDOR_POR_CODIGO[cxp.tipoComprobanteOrigen]?.nombre;

  return (
    <div className="rounded-lg border border-gray-200 overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="w-8 px-2 py-2" />
            <th className="text-left px-3 py-2 font-medium text-gray-600">Tipo</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Comprobante</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">F. emisión</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Condición</th>
            <th className="text-center px-3 py-2 font-medium text-gray-600">N° cuota</th>
            <th className="text-center px-3 py-2 font-medium text-gray-600">Días crédito</th>
            <th className="text-center px-3 py-2 font-medium text-gray-600">Días vencidos</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">F. vencimiento</th>
            <th className="text-right px-3 py-2 font-medium text-gray-600">Saldo pendiente</th>
            <th className="text-right px-3 py-2 font-medium text-gray-600">Importe a pagar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filas.map((cuota) => {
            const diasVencidos = calcularDiasVencidos(cuota.fechaVencimiento);
            const diasCredito = calcularDiasCredito(cxp.fechaEmision, cuota.fechaVencimiento);
            return (
              <tr key={cuota.id} className={seleccionada ? '' : 'opacity-50'}>
                <td className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={seleccionada}
                    onChange={(e) => onCambiarSeleccion(e.target.checked)}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </td>
                <td className="px-3 py-2 text-gray-700">{tipoComprobanteLabel ?? cxp.tipoComprobanteOrigen}</td>
                <td className="px-3 py-2 font-mono text-gray-800">{cxp.comprobanteCompraNumero}</td>
                <td className="px-3 py-2 text-gray-600">{cxp.fechaEmision.slice(0, 10)}</td>
                <td className="px-3 py-2 text-gray-600">{cxp.formaPago === 'contado' ? 'Contado' : 'Crédito'}</td>
                <td className="px-3 py-2 text-center text-gray-600">{cuota.numeroCuota}</td>
                <td className="px-3 py-2 text-center text-gray-500">{diasCredito ?? '-'}</td>
                <td className="px-3 py-2 text-center">
                  {diasVencidos > 0 ? (
                    <span className="text-red-600 font-medium">{diasVencidos}</span>
                  ) : (
                    <span className="text-gray-600">0</span>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-600">{cuota.fechaVencimiento.slice(0, 10)}</td>
                <td className="px-3 py-2 text-right font-mono text-gray-700">
                  {cuota.saldoPendiente.toFixed(2)} {cxp.moneda}
                </td>
                <td className="px-3 py-2 text-right">
                  {esFilaUnica ? (
                    <input
                      type="number"
                      min="0.01"
                      max={cuota.saldoPendiente}
                      step="0.01"
                      value={importeAplicado || ''}
                      disabled={!seleccionada}
                      onChange={(e) => onCambiarImporte(parseFloat(e.target.value) || 0)}
                      className="w-28 text-right border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  ) : (
                    <span className="font-mono text-gray-500">{cuota.saldoPendiente.toFixed(2)}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
