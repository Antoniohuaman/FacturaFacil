import type { CuentaPorPagar } from '../../modelos/CuentaPorPagar';
import type { CreditInstallment } from '@/shared/payments/paymentTerms';
import { CreditInstallmentsTable, type CreditInstallmentAllocationInput } from '@/shared/payments/CreditInstallmentsTable';
import { TIPOS_DOCUMENTO_PROVEEDOR_POR_CODIGO } from '../../constantes/tiposDocumentoProveedor';
import { formatearFechaCompra } from '../../utilidades/formatearCompras';

interface TablaAplicacionPagoCompraProps {
  cxp: CuentaPorPagar;
  formaPagoNombre: string;
  installments: CreditInstallment[];
  allocations: CreditInstallmentAllocationInput[];
  onChangeAllocations: (allocations: CreditInstallmentAllocationInput[]) => void;
  disabled?: boolean;
}

/**
 * "Documento a pagar": identifica el comprobante origen y permite seleccionar
 * exactamente qué cuota(s) o qué parte del saldo se paga — una cuota, varias,
 * completas o parciales, o desmarcarlas — reutilizando CreditInstallmentsTable
 * en modo `allocation` (mismo componente que ya usa Cobranzas para el mismo
 * problema de aplicar un cobro/pago sobre un cronograma real). Si la CxP no
 * trae cuotas (contado / dato heredado), `installments` ya llega con una
 * única fila sintética equivalente al saldo de la propia CxP.
 */
export default function TablaAplicacionPagoCompra({
  cxp,
  formaPagoNombre,
  installments,
  allocations,
  onChangeAllocations,
  disabled = false,
}: TablaAplicacionPagoCompraProps) {
  const tipoComprobanteLabel = TIPOS_DOCUMENTO_PROVEEDOR_POR_CODIGO[cxp.tipoComprobanteOrigen]?.nombre;

  return (
    <div className="space-y-2">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600 sm:grid-cols-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Tipo</dt>
          <dd className="font-medium text-gray-800">{tipoComprobanteLabel ?? cxp.tipoComprobanteOrigen}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Comprobante</dt>
          <dd className="font-medium text-gray-800 font-mono">{cxp.comprobanteCompraNumero}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">F. emisión</dt>
          <dd className="font-medium text-gray-800">{formatearFechaCompra(cxp.fechaEmision)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Forma de pago</dt>
          <dd className="font-medium text-gray-800">{formaPagoNombre}</dd>
        </div>
      </dl>

      <CreditInstallmentsTable
        installments={installments}
        currency={cxp.moneda}
        mode="allocation"
        allocations={allocations}
        onChangeAllocations={onChangeAllocations}
        disabled={disabled}
        showDaysOverdue
        showRemainingResult
        showStatusColumn
        compact
      />
    </div>
  );
}
