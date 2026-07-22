import { Fragment, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { CuentaPorPagar } from '../../modelos/CuentaPorPagar';
import type { CreditInstallment } from '@/shared/payments/paymentTerms';
import { CreditInstallmentsTable, type CreditInstallmentAllocationInput } from '@/shared/payments/CreditInstallmentsTable';
import { formatMoney } from '@/shared/currency';
import { resolverNombreFormaPago } from '../../logica/reglasCompras';
import { getNombreTipoDocumentoProveedor } from '../../constantes/tiposDocumentoProveedor';
import { formatearFechaCompra } from '../../utilidades/formatearCompras';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';

interface TablaDocumentosPagoCompraProps {
  /** Documentos ya elegidos en el paso previo de selección (mismo proveedor y moneda). */
  documentos: CuentaPorPagar[];
  moneda: string;
  disabled?: boolean;
  /** Documentos SIN cronograma real: importe simple editable a nivel documento. */
  aplicacionesSimples: Record<string, number>;
  onCambiarAplicacionSimple: (cuentaPorPagarId: string, importe: number) => void;
  /** Documentos CON cronograma real (solo tiene entrada para esos) — sus cuotas reales. */
  cuotasPorDocumento: Record<string, CreditInstallment[]>;
  asignacionesCuotasPorDocumento: Record<string, CreditInstallmentAllocationInput[]>;
  onCambiarAsignacionesCuotas: (cuentaPorPagarId: string, asignaciones: CreditInstallmentAllocationInput[]) => void;
  obtenerImporteDocumento: (cxp: CuentaPorPagar) => number;
}

/**
 * "Documentos a pagar": uno o varios documentos del mismo proveedor y
 * moneda. Un documento SIN cronograma real (contado, o CxP heredada sin
 * cuotas) se paga con un importe simple a nivel documento — por defecto, su
 * saldo pendiente completo, editable para pago parcial. Un documento CON
 * cronograma real de crédito muestra su cuadro de cuotas reales debajo,
 * reutilizando CreditInstallmentsTable en modo `allocation` (mismo
 * componente compartido con Cobranzas, sin modificar) para que el usuario
 * elija explícitamente qué cuota(s) paga y cuánto — nunca se reduce un
 * documento con cuotas a una sola bolsa de saldo (§1/§5 del alcance).
 */
export default function TablaDocumentosPagoCompra({
  documentos,
  moneda,
  disabled = false,
  aplicacionesSimples,
  onCambiarAplicacionSimple,
  cuotasPorDocumento,
  asignacionesCuotasPorDocumento,
  onCambiarAsignacionesCuotas,
  obtenerImporteDocumento,
}: TablaDocumentosPagoCompraProps) {
  const { state: config } = useConfigurationContext();
  // Un documento con cronograma real siempre inicia expandido (el usuario
  // debe poder ver sus cuotas de inmediato, sin un clic adicional — §23 del
  // alcance); puede colapsarse por prolijidad cuando hay varios documentos.
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());

  function alternarColapso(cuentaPorPagarId: string) {
    setColapsados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(cuentaPorPagarId)) siguiente.delete(cuentaPorPagarId);
      else siguiente.add(cuentaPorPagarId);
      return siguiente;
    });
  }

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
            const cuotas = cuotasPorDocumento[cxp.id];
            const tieneCronograma = Boolean(cuotas);
            const importe = obtenerImporteDocumento(cxp);
            const saldoResultante = Math.max(0, Math.round((cxp.saldoPendiente - importe) * 100) / 100);
            const expandido = tieneCronograma && !colapsados.has(cxp.id);

            return (
              <Fragment key={cxp.id}>
                <tr>
                  <td className="px-4 py-3 font-mono text-gray-700 align-top">
                    {cxp.comprobanteCompraNumero}
                    <div className="text-xs text-gray-400 font-sans">
                      {getNombreTipoDocumentoProveedor(cxp.tipoComprobanteOrigen)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 align-top">
                    {resolverNombreFormaPago(cxp, config.paymentMethods)}
                    {tieneCronograma && (
                      <button
                        type="button"
                        onClick={() => alternarColapso(cxp.id)}
                        className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        {expandido ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {expandido ? 'Ocultar cuotas' : `Ver cuotas (${cuotas!.length})`}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 align-top">
                    {cxp.fechaVencimiento ? formatearFechaCompra(cxp.fechaVencimiento) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono align-top">{formatMoney(cxp.saldoPendiente, moneda)}</td>
                  <td className="px-4 py-3 text-right align-top">
                    {tieneCronograma ? (
                      <span className="font-mono font-medium text-gray-900">{formatMoney(importe, moneda)}</span>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        max={cxp.saldoPendiente}
                        step="0.01"
                        disabled={disabled}
                        value={aplicacionesSimples[cxp.id] ?? 0}
                        onChange={(e) => onCambiarAplicacionSimple(cxp.id, parseFloat(e.target.value))}
                        className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50"
                      />
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold align-top ${saldoResultante <= 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {formatMoney(saldoResultante, moneda)}
                  </td>
                </tr>
                {tieneCronograma && expandido && (
                  <tr>
                    <td colSpan={6} className="bg-gray-50/60 px-4 py-3">
                      <CreditInstallmentsTable
                        installments={cuotas!}
                        currency={cxp.moneda}
                        mode="allocation"
                        selectionColumnLabel="Pagar"
                        allocations={asignacionesCuotasPorDocumento[cxp.id] ?? []}
                        onChangeAllocations={(nuevas) => onCambiarAsignacionesCuotas(cxp.id, nuevas)}
                        disabled={disabled}
                        showDaysOverdue
                        showRemainingResult
                        showStatusColumn
                        compact
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
