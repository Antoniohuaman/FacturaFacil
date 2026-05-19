import React from 'react';
import { Layers, Plus, Info, X, MinusCircle, HelpCircle, AlertTriangle } from 'lucide-react';
import type { Unit } from '../../../configuracion-sistema/modelos';
import type { ProductFormData } from '../../models/types';
import type { AdditionalUnitError } from '../../hooks/useProductForm';
import { resolveUnitLabelText } from './ProductUnitsSection';
import { Tooltip } from '@/shared/ui';

interface ProductAdditionalUnitsTableProps {
  unidadesMedidaAdicionales: ProductFormData['unidadesMedidaAdicionales'];
  baseUnitCode: ProductFormData['unidad'];
  additionalUnitErrors: AdditionalUnitError[];
  addAdditionalUnit: () => void;
  removeAdditionalUnit: (index: number) => void;
  updateAdditionalUnit: (
    index: number,
    field: 'nombre' | 'unidadCodigo' | 'factorConversion',
    value: string
  ) => void;
  getAdditionalUnitOptions: () => Unit[];
  findUnitByCode: (code?: string) => Unit | undefined;
  formatFactorValue: (value?: number) => string;
  unitInfoMessage: string | null;
  setUnitInfoMessage: (message: string | null) => void;
  showCheck?: boolean;
  renderCheck?: (className?: string) => React.ReactNode;
}

export const ProductAdditionalUnitsTable: React.FC<ProductAdditionalUnitsTableProps> = ({
  unidadesMedidaAdicionales,
  baseUnitCode,
  additionalUnitErrors,
  addAdditionalUnit,
  removeAdditionalUnit,
  updateAdditionalUnit,
  getAdditionalUnitOptions,
  findUnitByCode,
  formatFactorValue,
  unitInfoMessage,
  setUnitInfoMessage,
  showCheck,
  renderCheck
}) => {
  const baseUnit = findUnitByCode(baseUnitCode);
  const baseUnitLabel = baseUnit ? resolveUnitLabelText(baseUnit) : baseUnitCode || '—';
  const baseUnitNameLabel = baseUnit ? (baseUnit.name || baseUnitCode || '—') : (baseUnitCode || '—');

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-800">
          <Layers className="w-3.5 h-3.5 text-violet-600" />
          <span>Presentaciones de venta</span>
          <Tooltip
            contenido="Define cómo vendes este producto. Cada presentación se convertirá a la unidad base para controlar stock y futuro Kardex."
            ubicacion="derecha"
          >
            <button
              type="button"
              aria-label="Ayuda: Presentaciones de venta"
              className="inline-flex items-center justify-center rounded-sm text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </Tooltip>
          {showCheck && renderCheck?.('ml-2')}
        </div>
        <button
          type="button"
          onClick={addAdditionalUnit}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 rounded-sm"
          aria-label="Agregar presentación de venta"
        >
          <Plus className="w-3 h-3" /> Agregar presentación
        </button>
      </div>

      {unitInfoMessage && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span className="flex-1">{unitInfoMessage}</span>
          <button
            type="button"
            onClick={() => setUnitInfoMessage(null)}
            className="text-amber-700 hover:text-amber-900"
            aria-label="Ocultar mensaje"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {unidadesMedidaAdicionales.length > 0 && (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-md">
          {unidadesMedidaAdicionales.map((unit, index) => {
            const options = getAdditionalUnitOptions();
            const selectedUnit = findUnitByCode(unit.unidadCodigo);
            const selectedUnitLabel = selectedUnit
              ? resolveUnitLabelText(selectedUnit)
              : unit.unidadCodigo || '—';
            const presentationLabel = unit.nombre?.trim() || selectedUnitLabel;
            const conversionText =
              unit.nombre?.trim() && unit.unidadCodigo && unit.factorConversion > 0
                ? `1 ${presentationLabel} = ${formatFactorValue(unit.factorConversion)} ${baseUnitLabel}`
                : 'Completa nombre, unidad y contenido para ver la fórmula.';

            const err = additionalUnitErrors[index] || {};

            return (
              <div key={unit.id || `pres-${index}`} className="p-2 text-xs space-y-2">
                <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.75fr)_auto] gap-2 items-start">
                  {/* Nombre de presentación */}
                  <div>
                    <label className="text-[11px] font-medium text-gray-600 mb-1 block">
                      Nombre de presentación
                    </label>
                    <input
                      type="text"
                      value={unit.nombre}
                      onChange={(e) => updateAdditionalUnit(index, 'nombre', e.target.value)}
                      placeholder="Ej: Caja x 12"
                      className={`w-full h-8 rounded-md border text-xs px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 ${
                        err.nombre ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {err.nombre && (
                      <p className="text-red-600 text-[11px] mt-1">{err.nombre}</p>
                    )}
                  </div>

                  {/* Unidad comercial SUNAT */}
                  <div>
                    <label className="text-[11px] font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <span>Unidad SUNAT</span>
                      <Tooltip
                        contenido="Unidad comercial de la presentación para venta y emisión."
                        ubicacion="derecha"
                      >
                        <button
                          type="button"
                          aria-label="Ayuda: Unidad SUNAT"
                          className="inline-flex items-center justify-center rounded-sm text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    </label>
                    <select
                      value={unit.unidadCodigo}
                      onChange={(e) => updateAdditionalUnit(index, 'unidadCodigo', e.target.value)}
                      className={`w-full h-8 rounded-md border text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 ${
                        err.unidad ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Seleccionar</option>
                      {options.map((option) => (
                        <option key={option.id} value={option.code}>
                          {resolveUnitLabelText(option)}
                        </option>
                      ))}
                    </select>
                    {err.unidad && (
                      <p className="text-red-600 text-[11px] mt-1">{err.unidad}</p>
                    )}
                  </div>

                  {/* Contiene */}
                  <div>
                    <label className="text-[11px] font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <span>Contiene en {baseUnitNameLabel}</span>
                      <Tooltip
                        contenido={`Indica cuántos ${baseUnitNameLabel} contiene esta presentación.`}
                        ubicacion="izquierda"
                      >
                        <button
                          type="button"
                          aria-label="Ayuda: Contiene"
                          className="inline-flex items-center justify-center rounded-sm text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    </label>
                    <input
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      value={unit.factorConversion || ''}
                      onChange={(e) =>
                        updateAdditionalUnit(index, 'factorConversion', e.target.value)
                      }
                      className={`w-full h-8 rounded-md border text-xs px-2 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 ${
                        err.factor ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="0"
                    />
                    {err.factor && (
                      <p className="text-red-600 text-[11px] mt-1">{err.factor}</p>
                    )}
                  </div>

                  {/* Eliminar */}
                  <button
                    type="button"
                    onClick={() => removeAdditionalUnit(index)}
                    className="mt-6 inline-flex items-center text-gray-400 hover:text-red-500"
                    aria-label="Eliminar presentación"
                  >
                    <MinusCircle className="w-4 h-4" />
                  </button>
                </div>

                {/* Advertencia no bloqueante de factor */}
                {err.factorWarning && (
                  <div className="flex items-start gap-1.5 text-[11px] text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>{err.factorWarning}</span>
                  </div>
                )}

                {/* Fórmula de conversión */}
                <div className="text-[10px] text-gray-500">{conversionText}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
