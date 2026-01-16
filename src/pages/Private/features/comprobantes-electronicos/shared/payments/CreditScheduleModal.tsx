import { X, RefreshCcw } from 'lucide-react';
import React from 'react';
import { CreditScheduleEditor } from '../../../configuracion-sistema/components/business/CreditScheduleEditor';
import type { CreditInstallmentDefinition } from '../../../../../../shared/payments/paymentTerms';

interface CreditScheduleModalProps {
  isOpen: boolean;
  templates: CreditInstallmentDefinition[];
  onChange: (value: CreditInstallmentDefinition[]) => void;
  onSave: () => void;
  onCancel: () => void;
  onRestoreDefaults?: () => void;
  errors?: string[];
  paymentMethodName?: string;
}

export const CreditScheduleModal: React.FC<CreditScheduleModalProps> = ({
  isOpen,
  templates,
  onChange,
  onSave,
  onCancel,
  onRestoreDefaults,
  errors = [],
  paymentMethodName,
}) => {
  if (!isOpen) {
    return null;
  }

  const hasErrors = errors.length > 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onCancel} />
      <div className="relative z-[71] w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Cronograma de crédito</p>
            <h3 className="text-lg font-semibold text-slate-900">{paymentMethodName || 'Pago a crédito'}</h3>
            <p className="text-sm text-slate-500">Ajusta las cuotas específicas que aplicarán solo a este comprobante.</p>
          </div>
          <div className="flex items-center gap-2">
            {onRestoreDefaults && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
                onClick={onRestoreDefaults}
              >
                <RefreshCcw className="h-4 w-4" />
                Restaurar predeterminado
              </button>
            )}
            <button
              type="button"
              className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              onClick={onCancel}
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          <CreditScheduleEditor value={templates} onChange={onChange} />

          {hasErrors && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-semibold mb-1">Corrige los siguientes puntos:</p>
              <ul className="list-disc space-y-1 pl-4">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            onClick={onSave}
            disabled={hasErrors}
          >
            Guardar cronograma
          </button>
        </div>
      </div>
    </div>
  );
};
