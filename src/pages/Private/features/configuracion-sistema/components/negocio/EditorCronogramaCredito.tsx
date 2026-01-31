import React from 'react';
import type {
  CreditInstallmentDefinition,
  CuotaCalendarioCredito,
  ModoCronogramaCredito,
} from '../../../../../../shared/payments/paymentTerms';

interface CreditScheduleEditorProps {
  value: CreditInstallmentDefinition[];
  onChange: (value: CreditInstallmentDefinition[]) => void;
  compact?: boolean;
  mode?: ModoCronogramaCredito;
  onModeChange?: (mode: ModoCronogramaCredito) => void;
  calendarValue?: CuotaCalendarioCredito[];
  onCalendarChange?: (value: CuotaCalendarioCredito[]) => void;
  showModeSelector?: boolean;
}

const createDefaultInstallment = (): CreditInstallmentDefinition => ({ diasCredito: 0, porcentaje: 0 });
const createDefaultCalendarInstallment = (): CuotaCalendarioCredito => ({ fechaVencimientoISO: '', monto: 0 });

export const CreditScheduleEditor: React.FC<CreditScheduleEditorProps> = ({
  value,
  onChange,
  compact = false,
  mode = 'plantilla',
  onModeChange,
  calendarValue = [],
  onCalendarChange,
  showModeSelector = false,
}) => {
  const handleFieldChange = (index: number, field: keyof CreditInstallmentDefinition, raw: number) => {
    const sanitized = Number.isFinite(raw) ? raw : 0;
    const next = value.map((item, idx) => (idx === index ? { ...item, [field]: sanitized } : item));
    onChange(next);
  };

  const handleCalendarFieldChange = (index: number, field: keyof CuotaCalendarioCredito, raw: string | number) => {
    const sanitized = field === 'monto' ? (Number.isFinite(Number(raw)) ? Number(raw) : 0) : String(raw ?? '');
    const next = calendarValue.map((item, idx) => (idx === index ? { ...item, [field]: sanitized } : item));
    onCalendarChange?.(next);
  };

  const handleAddRow = () => {
    onChange([
      ...value,
      createDefaultInstallment(),
    ]);
  };

  const handleAddCalendarRow = () => {
    onCalendarChange?.([
      ...calendarValue,
      createDefaultCalendarInstallment(),
    ]);
  };

  const handleRemoveRow = (index: number) => {
    const next = value.filter((_, idx) => idx !== index);
    onChange(next);
  };

  const handleRemoveCalendarRow = (index: number) => {
    const next = calendarValue.filter((_, idx) => idx !== index);
    onCalendarChange?.(next);
  };

  const totalPercent = value.reduce((sum, item) => sum + (Number(item.porcentaje) || 0), 0);
  const totalAmount = calendarValue.reduce((sum, item) => sum + (Number(item.monto) || 0), 0);

  const modeSelector = showModeSelector ? (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs">
      <button
        type="button"
        onClick={() => onModeChange?.('plantilla')}
        className={`rounded-md px-3 py-1 font-semibold transition ${mode === 'plantilla' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
      >
        Plantilla
      </button>
      <button
        type="button"
        onClick={() => onModeChange?.('calendario')}
        className={`rounded-md px-3 py-1 font-semibold transition ${mode === 'calendario' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
      >
        Calendario
      </button>
    </div>
  ) : null;

  if (mode === 'plantilla' && value.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
        <p className="mb-2">Este metodo de pago no tiene cronograma definido. Puedes agregar cuotas personalizadas si deseas distribuir el credito.</p>
        {modeSelector}
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

  if (mode === 'calendario' && calendarValue.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
        <p className="mb-2">Este metodo de pago no tiene cronograma definido. Puedes agregar cuotas personalizadas si deseas distribuir el credito.</p>
        {modeSelector}
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-white"
          onClick={handleAddCalendarRow}
        >
          + Agregar cuota
        </button>
      </div>
    );
  }

  if (mode === 'calendario') {
    if (compact) {
      return (
        <div className="space-y-3">
          {modeSelector}
          <div className="space-y-2">
            {calendarValue.map((installment, index) => (
              <div key={`calendar-installment-${index}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="text-xs font-medium text-slate-500">#{index + 1}</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] text-slate-500">Fecha</label>
                    <input
                      type="date"
                      className="w-36 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      value={installment.fechaVencimientoISO || ''}
                      onChange={(event) => handleCalendarFieldChange(index, 'fechaVencimientoISO', event.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] text-slate-500">Monto</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      value={Number.isFinite(installment.monto) && installment.monto !== 0 ? installment.monto : ''}
                      onChange={(event) => handleCalendarFieldChange(index, 'monto', Number(event.target.value))}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="ml-auto rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600"
                  onClick={() => handleRemoveCalendarRow(index)}
                  aria-label="Eliminar cuota"
                >
                  X
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span>Total monto: {totalAmount.toFixed(2)}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-white"
                onClick={handleAddCalendarRow}
              >
                + Agregar cuota
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-50"
                onClick={() => onCalendarChange?.([])}
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
        {modeSelector}
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Fecha vencimiento</th>
                <th className="px-3 py-2">Monto</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {calendarValue.map((installment, index) => (
                <tr key={`calendar-installment-${index}`} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      value={installment.fechaVencimientoISO || ''}
                      onChange={(event) => handleCalendarFieldChange(index, 'fechaVencimientoISO', event.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      value={Number.isFinite(installment.monto) && installment.monto !== 0 ? installment.monto : ''}
                      onChange={(event) => handleCalendarFieldChange(index, 'monto', Number(event.target.value))}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => handleRemoveCalendarRow(index)}
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
          <span>Total monto: {totalAmount.toFixed(2)}</span>
          <div className="space-x-2">
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-white"
              onClick={handleAddCalendarRow}
            >
              + Agregar cuota
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-50"
              onClick={() => onCalendarChange?.([])}
            >
              Limpiar cronograma
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {modeSelector}
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
      {modeSelector}
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
