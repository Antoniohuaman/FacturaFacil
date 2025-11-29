import { Calendar, Clock, Edit3 } from 'lucide-react';
import type { ComprobanteCreditTerms, Currency } from '../../models/comprobante.types';
import { useCurrency } from '../form-core/hooks/useCurrency';

interface CreditScheduleSummaryCardProps {
  creditTerms?: ComprobanteCreditTerms;
  currency?: string;
  total: number;
  onConfigure?: () => void;
  errors?: string[];
  paymentMethodName?: string;
}

export const CreditScheduleSummaryCard = ({
  creditTerms,
  currency,
  total,
  onConfigure,
  errors,
  paymentMethodName,
}: CreditScheduleSummaryCardProps) => {
  const { formatPrice } = useCurrency();
  const cuotas = creditTerms?.schedule ?? [];
  const totalCuotas = cuotas.length;
  const resumenLabel = paymentMethodName || 'Pago a crédito';
  const resolvedCurrency = (currency as Currency | undefined);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{resumenLabel}</p>
          <h4 className="text-base font-semibold text-slate-900">
            {totalCuotas > 0 ? `${totalCuotas} cuota${totalCuotas === 1 ? '' : 's'}` : 'Sin cronograma definido'}
          </h4>
        </div>
        <button
          type="button"
          onClick={onConfigure}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
        >
          <Edit3 className="h-4 w-4" />
          Gestionar cuotas
        </button>
      </div>

      {totalCuotas > 0 ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>Vence: <strong className="text-slate-900">{creditTerms?.fechaVencimientoGlobal}</strong></span>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/80">
            <ul className="divide-y divide-slate-100 text-sm text-slate-700">
              {cuotas.slice(0, 3).map((cuota) => (
                <li key={cuota.numeroCuota} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="font-semibold text-slate-900">Cuota {cuota.numeroCuota}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {cuota.diasCredito} días • {cuota.fechaVencimiento}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatPrice(cuota.importe, resolvedCurrency)}</p>
                    <p className="text-xs text-slate-500">{cuota.porcentaje}%</p>
                  </div>
                </li>
              ))}
            </ul>
            {totalCuotas > 3 && (
              <p className="px-3 py-2 text-xs text-slate-500">+{totalCuotas - 3} cuota{totalCuotas - 3 === 1 ? '' : 's'} adicionales</p>
            )}
          </div>
          <div className="text-xs text-slate-500">
            Total financiado: <span className="font-semibold text-slate-900">{formatPrice(total, resolvedCurrency)}</span>
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-600">
          Aún no defines un cronograma para esta venta. Usa el botón para crear cuotas personalizadas.
        </p>
      )}

      {errors && errors.length > 0 && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <p className="font-semibold mb-1">Revisa el cronograma</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
