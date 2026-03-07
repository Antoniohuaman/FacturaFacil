import { Calendar, Edit3 } from 'lucide-react';
import type { ComprobanteCreditTerms, Currency } from '../../models/comprobante.types';
import { useCurrency } from '../form-core/hooks/useCurrency';
import { CreditInstallmentsTable } from './CreditInstallmentsTable';
import type { CreditInstallment } from '../../../../../../shared/payments/paymentTerms';

interface CreditoManualConfig {
  cuotas: CreditInstallment[];
  estaEditando: boolean;
  falta: number;
  puedeConfirmar: boolean;
  fechaEmision: string;
  onAgregar: () => void;
  onConfirmar: () => void;
  onEditar: () => void;
  onCambiar: (installments: CreditInstallment[]) => void;
  onEliminar: (installmentNumber: number) => void;
}

interface CreditScheduleSummaryCardProps {
  creditTerms?: ComprobanteCreditTerms;
  currency?: string;
  total: number;
  onConfigure?: () => void;
  errors?: string[];
  paymentMethodName?: string;
  context?: 'emision' | 'cxc';
  creditoManual?: CreditoManualConfig;
}

export const CreditScheduleSummaryCard = ({
  creditTerms,
  currency,
  total,
  onConfigure,
  errors,
  paymentMethodName,
  context = 'cxc',
  creditoManual,
}: CreditScheduleSummaryCardProps) => {
  const { formatPrice } = useCurrency();
  const esManual = Boolean(creditoManual);
  const cuotas = creditoManual?.cuotas ?? creditTerms?.schedule ?? [];
  const totalCuotas = cuotas.length;
  const resumenLabel = esManual ? 'Crédito' : (paymentMethodName || 'Pago a crédito');
  const resolvedCurrency = (currency as Currency | undefined) ?? 'PEN';
  const orderedDays = cuotas.map((cuota) => cuota.diasCredito).filter((day) => typeof day === 'number');
  const daysLabel = orderedDays.length ? `Crédito ${orderedDays.join('-')} días` : resumenLabel;
  const headline = esManual
    ? (totalCuotas > 0
      ? `Crédito · ${totalCuotas} cuota${totalCuotas === 1 ? '' : 's'}`
      : 'Crédito')
    : (totalCuotas > 0
      ? `${daysLabel.toUpperCase()} · ${totalCuotas} cuota${totalCuotas === 1 ? '' : 's'}`
      : resumenLabel);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-slate-900">{headline}</h4>
          {creditTerms?.fechaVencimientoGlobal && (
            <p className="mt-0.5 flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="h-4 w-4 text-slate-400" />
              Vence: <span className="font-semibold text-slate-900">{creditTerms.fechaVencimientoGlobal}</span>
            </p>
          )}
        </div>
        {esManual ? (
          creditoManual?.estaEditando ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={creditoManual.onAgregar}
                className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
              >
                Agregar cuota
              </button>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                Falta: {formatPrice(creditoManual.falta, resolvedCurrency)}
              </span>
              <button
                type="button"
                onClick={creditoManual.onConfirmar}
                disabled={!creditoManual.puedeConfirmar}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition ${
                  creditoManual.puedeConfirmar
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                Confirmar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={creditoManual?.onEditar}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
              aria-label="Editar cuotas"
              title="Editar cuotas"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={onConfigure}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
            aria-label="Editar cuotas"
            title="Editar cuotas"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        )}
      </div>

      {totalCuotas > 0 || esManual ? (
        <div className="mt-3 space-y-3">
          <CreditInstallmentsTable
            installments={cuotas}
            currency={resolvedCurrency as Currency}
            mode={esManual ? 'manual' : 'readonly'}
            context={context}
            manualReadOnly={Boolean(creditoManual && !creditoManual.estaEditando)}
            onManualChange={creditoManual?.onCambiar}
            onManualRemove={creditoManual?.onEliminar}
            manualTotal={total}
            manualFechaEmision={creditoManual?.fechaEmision}
            className="border-none"
            scrollMaxHeight={undefined}
            showDaysOverdue
            compact
          />
          <div className="flex flex-wrap gap-4 text-xs text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800">
              Total financiado: {formatPrice(total, resolvedCurrency)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800">
              Moneda: {resolvedCurrency}
            </span>
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
