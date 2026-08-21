import { formatMoney } from '@/shared/currency';

interface ResumenPagoCompraProps {
  moneda: string;
  saldoInicial: number;
  totalMedios: number;
  /** Cantidad de líneas de medio de pago — decide si "Total en medios" aporta algo (remediación UX del pago compartido §11/§13): con un solo medio, siempre coincide con "Pago" y sería puro ruido. */
  cantidadMedios: number;
  saldoResultante: number;
  diferencia: number;
}

/**
 * Resumen de conciliación entre el importe aplicado a la CxP y la suma de
 * medios de pago — jerarquizado (remediación UX del pago compartido §13-16):
 * "Pago" ya se muestra prominente en el cuerpo del formulario (junto al
 * medio de pago, ver `FormularioPagoCompra.tsx`), así que este resumen nunca
 * lo repite — su única fila principal es "Saldo después del pago". El resto
 * ("Saldo inicial", "Total en medios", "Diferencia") es contexto secundario
 * que solo se muestra cuando aporta algo distinto de lo principal;
 * "Diferencia" (que ya bloquea el registro en el dominio si no es 0, ver
 * `useFormularioPagoCompra`) solo se muestra aquí cuando de verdad requiere
 * atención — un "Diferencia S/ 0.00" no informa nada.
 */
export default function ResumenPagoCompra({
  moneda,
  saldoInicial,
  totalMedios,
  cantidadMedios,
  saldoResultante,
  diferencia,
}: ResumenPagoCompraProps) {
  const cuadra = Math.abs(diferencia) < 0.01;

  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
      <div className="flex justify-between text-gray-900">
        <span className="font-medium">Saldo después del pago</span>
        <span className="font-mono font-semibold">{formatMoney(saldoResultante, moneda)}</span>
      </div>
      <div className="pt-1.5 border-t border-gray-200 space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Saldo inicial</span>
          <span className="font-mono">{formatMoney(saldoInicial, moneda)}</span>
        </div>
        {cantidadMedios > 1 && (
          <div className="flex justify-between text-xs text-gray-400">
            <span>Total en medios</span>
            <span className="font-mono">{formatMoney(totalMedios, moneda)}</span>
          </div>
        )}
        {!cuadra && (
          <div className="flex justify-between font-semibold text-red-600">
            <span>Diferencia</span>
            <span className="font-mono">{formatMoney(diferencia, moneda)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
