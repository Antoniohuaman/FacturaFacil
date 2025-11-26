import React from 'react';
import { Layers, Plus, Info, X, MinusCircle } from 'lucide-react';
import type { Unit } from '../../../configuracion-sistema/models/Unit';
import type { ProductFormData } from '../../models/types';
import type { AdditionalUnitError } from '../../hooks/useProductForm';

interface ProductAdditionalUnitsTableProps {
  unidadesMedidaAdicionales: ProductFormData['unidadesMedidaAdicionales'];
  baseUnitCode: ProductFormData['unidad'];
  additionalUnitErrors: AdditionalUnitError[];
  addAdditionalUnit: () => void;
  removeAdditionalUnit: (index: number) => void;
  updateAdditionalUnit: (index: number, field: 'unidadCodigo' | 'factorConversion', value: string) => void;
  getAdditionalUnitOptions: (rowIndex: number) => Unit[];
  remainingUnitsForAdditional: Unit[];
  findUnitByCode: (code?: string) => Unit | undefined;
  formatFactorValue: (value?: number) => string;
  unitInfoMessage: string | null;
  setUnitInfoMessage: (message: string | null) => void;
}

export const ProductAdditionalUnitsTable: React.FC<ProductAdditionalUnitsTableProps> = ({
  unidadesMedidaAdicionales,
  baseUnitCode,
  additionalUnitErrors,
  addAdditionalUnit,
  removeAdditionalUnit,
  updateAdditionalUnit,
  getAdditionalUnitOptions,
  remainingUnitsForAdditional,
  findUnitByCode,
  formatFactorValue,
  unitInfoMessage,
  setUnitInfoMessage
}) => {
  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-800">
          <Layers className="w-3.5 h-3.5 text-violet-600" />
          <span>Presentaciones comerciales (opcional)</span>
        </div>
        <button
          type="button"
          onClick={addAdditionalUnit}
          disabled={remainingUnitsForAdditional.length === 0}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:text-violet-700 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <Plus className="w-3 h-3" /> Agregar presentación
        </button>
      </div>
      <p className="text-[11px] text-gray-500">
        Define cómo también vendes este producto: cajas, bolsas, kilos, sacos, etc. El stock se calcula a partir de la unidad mínima.
      </p>

      {unitInfoMessage && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span className="flex-1">{unitInfoMessage}</span>
          <button
            type="button"
            onClick={() => setUnitInfoMessage(null)}
            className="text-amber-700 hover:text-amber-900"
            title="Ocultar mensaje"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {unidadesMedidaAdicionales.length === 0 ? (
        <p className="text-[11px] text-gray-500">Aún no registras presentaciones comerciales.</p>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-md">
          {unidadesMedidaAdicionales.map((unit, index) => {
            const options = getAdditionalUnitOptions(index);
            const baseUnitLabel = findUnitByCode(baseUnitCode)?.code || baseUnitCode || '—';
            const conversionText =
              unit.unidadCodigo && unit.factorConversion
                ? `1 ${unit.unidadCodigo} = ${formatFactorValue(unit.factorConversion)} ${baseUnitLabel}`
                : 'Selecciona unidad y completa "Contiene" para ver la conversión.';

            return (
              <div key={`extra-unit-${index}`} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-2 items-start p-2 text-xs">
                <div>
                  <label className="text-[11px] font-medium text-gray-600 mb-1 block">Unidad</label>
                  <select
                    value={unit.unidadCodigo}
                    onChange={(e) => updateAdditionalUnit(index, 'unidadCodigo', e.target.value)}
                    className={`w-full h-8 rounded-md border text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 ${
                      additionalUnitErrors[index]?.unidad ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Seleccionar</option>
                    {options.map(option => (
                      <option key={option.id} value={option.code}>
                        ({option.code}) {option.name}
                      </option>
                    ))}
                  </select>
                  {additionalUnitErrors[index]?.unidad && (
                    <p className="text-red-600 text-[11px] mt-1">{additionalUnitErrors[index]?.unidad}</p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-600 mb-1 block">Contiene</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      value={unit.factorConversion ?? ''}
                      onChange={(e) => updateAdditionalUnit(index, 'factorConversion', e.target.value)}
                      className={`w-full h-8 rounded-md border text-xs pl-3 pr-5 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 ${
                        additionalUnitErrors[index]?.factor ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="0"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-gray-500">
                      {baseUnitLabel}
                    </span>
                  </div>
                  {additionalUnitErrors[index]?.factor && (
                    <p className="text-red-600 text-[11px] mt-1">{additionalUnitErrors[index]?.factor}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeAdditionalUnit(index)}
                  className="mt-6 inline-flex items-center text-gray-400 hover:text-red-500"
                  title="Eliminar presentación"
                >
                  <MinusCircle className="w-4 h-4" />
                </button>
                <div className="col-span-3 text-[10px] text-gray-500 pt-1">{conversionText}</div>
              </div>
            );
          })}
        </div>
      )}

      {remainingUnitsForAdditional.length === 0 && unidadesMedidaAdicionales.length > 0 && (
        <p className="text-[11px] text-gray-500">Ya agregaste todas las unidades disponibles para esta familia.</p>
      )}
    </div>
  );
};
