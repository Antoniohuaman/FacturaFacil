import React from 'react';
import type { CreditInstallmentDefinition } from '../../../../shared/payments/paymentTerms';

interface CreditScheduleEditorProps {
  value: CreditInstallmentDefinition[];
  onChange: (value: CreditInstallmentDefinition[]) => void;
}

const createDefaultInstallment = (): CreditInstallmentDefinition => ({ diasCredito: 30, porcentaje: 100 });

export const CreditScheduleEditor: React.FC<CreditScheduleEditorProps> = ({ value, onChange }) => {
  const handleFieldChange = (index: number, field: keyof CreditInstallmentDefinition, raw: number) => {
    const sanitized = Number.isFinite(raw) ? raw : 0;
    const next = value.map((item, idx) => (idx === index ? { ...item, [field]: sanitized } : item));
    onChange(next);
  };

  const handleAddRow = () => {
    if (!value.length) {
      onChange([createDefaultInstallment()]);
      return;
    }
    const last = value[value.length - 1];
    onChange([
      ...value,
      {
        diasCredito: last.diasCredito,
        porcentaje: last.porcentaje,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    const next = value.filter((_, idx) => idx !== index);
    onChange(next);
  };

  const totalPercent = value.reduce((sum, item) => sum + (Number(item.porcentaje) || 0), 0);

  if (value.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="mb-3">Este metodo de pago no tiene cronograma definido. Puedes agregar cuotas personalizadas si deseas distribuir el credito.</p>
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
                    step="0.01"
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
