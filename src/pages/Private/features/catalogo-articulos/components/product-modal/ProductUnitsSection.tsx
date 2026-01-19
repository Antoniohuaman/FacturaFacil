import React from 'react';
import { Layers, Ruler, Droplet, Clock3, Boxes, Weight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Unit } from '../../../configuracion-sistema/modelos/Unit';
import type { ProductFormData, UnitMeasureType } from '../../models/types';
import type { FormError } from '../../hooks/useProductForm';
import { UNIT_MEASURE_TYPE_OPTIONS } from '../../utils/unitMeasureHelpers';

const UNIT_TYPE_META: Record<
  UnitMeasureType,
  { label: string; Icon: LucideIcon }
> = {
  UNIDADES: { label: 'Unidades', Icon: Boxes },
  PESO: { label: 'Peso', Icon: Weight },
  VOLUMEN: { label: 'Volumen', Icon: Droplet },
  LONGITUD_AREA: { label: 'Longitud / área', Icon: Ruler },
  TIEMPO_SERVICIO: { label: 'Tiempo / servicio', Icon: Clock3 }
};

interface ProductUnitsSectionProps {
  formData: ProductFormData;
  errors: FormError;
  baseUnitOptions: Unit[];
  isUsingFallbackUnits: boolean;
  handleMeasureTypeChange: (nextType: UnitMeasureType) => void;
  handleBaseUnitChange: (nextUnit: ProductFormData['unidad']) => void;
}

type ProductUnitFamilyFieldProps = Pick<
  ProductUnitsSectionProps,
  'formData' | 'errors' | 'isUsingFallbackUnits' | 'handleMeasureTypeChange'
>;

type ProductMinimumUnitFieldProps = Pick<
  ProductUnitsSectionProps,
  'formData' | 'baseUnitOptions' | 'handleBaseUnitChange'
>;

export const ProductUnitFamilyField: React.FC<ProductUnitFamilyFieldProps> = ({
  formData,
  errors,
  isUsingFallbackUnits,
  handleMeasureTypeChange
}) => {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
        <span>Familia de unidades</span>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1" role="group" aria-label="Familia de unidades">
        {UNIT_MEASURE_TYPE_OPTIONS.map(option => {
          const isActive = formData.tipoUnidadMedida === option.value;
          const meta = UNIT_TYPE_META[option.value as UnitMeasureType] ?? { label: option.label, Icon: Layers };
          const Icon = meta.Icon;
          return (
            <button
              type="button"
              key={option.value}
              onClick={() => handleMeasureTypeChange(option.value as UnitMeasureType)}
              aria-pressed={isActive}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 ${
                isActive
                  ? 'border-violet-500 bg-violet-50 text-violet-900 shadow-sm'
                  : 'border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-500">La familia define qué unidades son compatibles para este producto.</p>
      {isUsingFallbackUnits && (
        <p className="text-[11px] text-amber-600 mt-1">
          No hay unidades activas para esta familia. Mostramos todas las disponibles hasta que configures más.
        </p>
      )}
      {errors.tipoUnidadMedida && <p className="text-red-600 text-xs mt-1">{errors.tipoUnidadMedida}</p>}
    </div>
  );
};

export const ProductMinimumUnitField: React.FC<ProductMinimumUnitFieldProps> = ({
  formData,
  baseUnitOptions,
  handleBaseUnitChange
}) => {
  return (
    <div>
      <label htmlFor="unidad" className="block text-xs font-medium text-gray-700 mb-1">
        Unidad mínima <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <select
          id="unidad"
          value={formData.unidad}
          onChange={(e) => handleBaseUnitChange(e.target.value as ProductFormData['unidad'])}
          className="w-full h-9 pl-9 pr-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
        >
          {baseUnitOptions.length > 0 ? (
            baseUnitOptions.map(unit => (
              <option key={unit.id} value={unit.code}>
                ({unit.code}) {unit.name}
              </option>
            ))
          ) : (
            <>
              <option value="NIU">(NIU) Unidad</option>
              <option value="ZZ">(ZZ) Servicios</option>
            </>
          )}
        </select>
      </div>
    </div>
  );
};

export const ProductUnitsSection: React.FC<ProductUnitsSectionProps> = ({
  formData,
  errors,
  baseUnitOptions,
  isUsingFallbackUnits,
  handleMeasureTypeChange,
  handleBaseUnitChange
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      <div className="md:col-span-8">
        <ProductUnitFamilyField
          formData={formData}
          errors={errors}
          isUsingFallbackUnits={isUsingFallbackUnits}
          handleMeasureTypeChange={handleMeasureTypeChange}
        />
      </div>

      <div className="md:col-span-4">
        <ProductMinimumUnitField
          formData={formData}
          baseUnitOptions={baseUnitOptions}
          handleBaseUnitChange={handleBaseUnitChange}
        />
      </div>
    </div>
  );
};
