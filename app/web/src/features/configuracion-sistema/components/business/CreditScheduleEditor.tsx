import React from 'react';
import type { CreditInstallmentDefinition } from '../../../../shared/payments/paymentTerms';

interface CreditScheduleEditorProps {
  value: CreditInstallmentDefinition[];
  onChange: (value: CreditInstallmentDefinition[]) => void;
  compact?: boolean;
}

const createDefaultInstallment = (): CreditInstallmentDefinition => ({ diasCredito: 0, porcentaje: 0 });

export const CreditScheduleEditor: React.FC<CreditScheduleEditorProps> = ({ value, onChange, compact = false }) => {
  const handleFieldChange = (index: number, field: keyof CreditInstallmentDefinition, raw: number) => {
    const sanitized = Number.isFinite(raw) ? raw : 0;
    const next = value.map((item, idx) => (idx === index ? { ...item, [field]: sanitized } : item));
    onChange(next);
  };

  const handleAddRow = () => {
    onChange([
      ...value,
      createDefaultInstallment(),
    ]);
  };

  const handleRemoveRow = (index: number) => {
    const next = value.filter((_, idx) => idx !== index);
    onChange(next);
  };

  const totalPercent = value.reduce((sum, item) => sum + (Number(item.porcentaje) || 0), 0);

  if (value.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
        <p className="mb-2">Este metodo de pago no tiene cronograma definido. Puedes agregar cuotas personalizadas si deseas distribuir el credito.</p>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-white"
          onClick={handleAddRow}
        >
          + Agregar cuota
        </button>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          {value.map((installment, index) => (
            <div key={`installment-${index}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <span className="text-xs font-medium text-slate-500">#{index + 1}</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <label className="text-[11px] text-slate-500">Días</label>
                  <input
                    type="number"
                    min={0}
                    className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                    value={installment.diasCredito || ''}
                    onChange={(event) => handleFieldChange(index, 'diasCredito', Number(event.target.value))}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-[11px] text-slate-500">%</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
                    value={installment.porcentaje || ''}
                    onChange={(event) => handleFieldChange(index, 'porcentaje', Number(event.target.value))}
                  />
                </div>
              </div>
              <button
                type="button"
                className="ml-auto rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600"
                onClick={() => handleRemoveRow(index)}
                aria-label="Eliminar cuota"
              >
                X
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-600">
          <span>Total porcentaje: {totalPercent.toFixed(2)}%</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-white"
              onClick={handleAddRow}
            >
              + Agregar cuota
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-50"
              onClick={() => onChange([])}
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Dias credito</th>
              <th className="px-3 py-2">Porcentaje (%)</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {value.map((installment, index) => (
              <tr key={`installment-${index}`} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    value={installment.diasCredito}
                    onChange={(event) => handleFieldChange(index, 'diasCredito', Number(event.target.value))}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    value={installment.porcentaje}
                    onChange={(event) => handleFieldChange(index, 'porcentaje', Number(event.target.value))}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => handleRemoveRow(index)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>Total porcentaje: {totalPercent.toFixed(2)}%</span>
        <div className="space-x-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-white"
            onClick={handleAddRow}
          >
            + Agregar cuota
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-50"
            onClick={() => onChange([])}
          >
            Limpiar cronograma
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreditScheduleEditor;
