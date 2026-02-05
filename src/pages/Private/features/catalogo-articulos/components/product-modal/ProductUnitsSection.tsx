import React from 'react';
import { Layers, Ruler, Droplet, Clock3, Boxes, Weight, Package, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Unit } from '../../../configuracion-sistema/modelos';
import type { ProductFormData } from '../../models/types';
import { getUnitDisplayForUI } from '@/shared/units/unitDisplay';

type UnitFamily = Unit['category'];

const UNIT_FAMILY_META: Record<UnitFamily, { label: string; Icon: LucideIcon }> = {
  SERVICIOS: { label: 'Servicios', Icon: Layers },
  TIME: { label: 'Tiempos', Icon: Clock3 },
  WEIGHT: { label: 'Pesos', Icon: Weight },
  VOLUME: { label: 'Volúmenes', Icon: Droplet },
  LENGTH: { label: 'Longitudes', Icon: Ruler },
  AREA: { label: 'Áreas', Icon: Ruler },
  ENERGY: { label: 'Energías', Icon: Zap },
  QUANTITY: { label: 'Cantidades', Icon: Boxes },
  PACKAGING: { label: 'Empaques', Icon: Package },
};

interface ProductUnitsSectionProps {
  formData: ProductFormData;
  selectedUnitFamily: UnitFamily;
  unitFamilies: UnitFamily[];
  baseUnitOptions: Unit[];
  isUsingFallbackUnits: boolean;
  handleUnitFamilyChange: (nextFamily: UnitFamily) => void;
  handleBaseUnitChange: (nextUnit: ProductFormData['unidad']) => void;
}

type ProductUnitFamilyFieldProps = Pick<
  ProductUnitsSectionProps,
  'isUsingFallbackUnits' | 'handleUnitFamilyChange' | 'selectedUnitFamily' | 'unitFamilies'
> & {
  showCheck?: boolean;
  renderCheck?: (className?: string) => React.ReactNode;
};

type ProductMinimumUnitFieldProps = Pick<
  ProductUnitsSectionProps,
  'formData' | 'baseUnitOptions' | 'handleBaseUnitChange'
> & {
  onBlur?: () => void;
  showCheck?: boolean;
  renderCheck?: (className?: string) => React.ReactNode;
};

export const ProductUnitFamilyField: React.FC<ProductUnitFamilyFieldProps> = ({
  selectedUnitFamily,
  isUsingFallbackUnits,
  handleUnitFamilyChange,
  unitFamilies,
  showCheck,
  renderCheck
}) => {
  return (
    <div>
      <div className="flex items-center justify-between gap-1 text-xs font-medium text-gray-700 mb-1">
        <span>Familia de unidades</span>
        {showCheck && renderCheck?.()}
      </div>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Familia de unidades">
        {unitFamilies.map(family => {
          const isActive = selectedUnitFamily === family;
          const meta = UNIT_FAMILY_META[family] ?? { label: family, Icon: Layers };
          const Icon = meta.Icon;
          return (
            <button
              type="button"
              key={family}
              onClick={() => handleUnitFamilyChange(family)}
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
      {isUsingFallbackUnits && (
        <p className="text-[11px] text-amber-600 mt-1">
          No hay unidades activas para esta familia. Mostramos todas las disponibles hasta que configures más.
        </p>
      )}
    </div>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const resolveUnitLabelText = (unit: Unit): string => {
  return (
    getUnitDisplayForUI({
      code: unit.code,
      fallbackSymbol: unit.symbol,
      fallbackName: unit.name,
    }) || `(${unit.code}) ${unit.name}`
  );
};

export const ProductMinimumUnitField: React.FC<ProductMinimumUnitFieldProps> = ({
  formData,
  baseUnitOptions,
  handleBaseUnitChange,
  onBlur,
  showCheck,
  renderCheck
}) => {
  const hasUnits = baseUnitOptions.length > 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="unidad" className="text-xs font-medium text-gray-700">
          Unidad mínima <span className="text-red-500">*</span>
        </label>
        {showCheck && renderCheck?.()}
      </div>
      <div className="relative">
        <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <select
          id="unidad"
          value={formData.unidad}
          onChange={(e) => handleBaseUnitChange(e.target.value as ProductFormData['unidad'])}
          onBlur={onBlur}
          disabled={!hasUnits}
          className="w-full h-9 pl-9 pr-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
        >
          {hasUnits ? (
            baseUnitOptions.map(unit => (
              <option key={unit.id} value={unit.code}>
                {resolveUnitLabelText(unit)}
              </option>
            ))
          ) : (
            <option value="">Sin unidades configuradas</option>
          )}
        </select>
      </div>
    </div>
  );
};

export const ProductUnitsSection: React.FC<ProductUnitsSectionProps> = ({
  formData,
  selectedUnitFamily,
  unitFamilies,
  baseUnitOptions,
  isUsingFallbackUnits,
  handleUnitFamilyChange,
  handleBaseUnitChange
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      <div className="md:col-span-8">
        <ProductUnitFamilyField
          selectedUnitFamily={selectedUnitFamily}
          isUsingFallbackUnits={isUsingFallbackUnits}
          handleUnitFamilyChange={handleUnitFamilyChange}
          unitFamilies={unitFamilies}
        />
      </div>

      <div className="md:col-span-4">
        <ProductMinimumUnitField
          formData={formData}
          baseUnitOptions={baseUnitOptions}
          handleBaseUnitChange={handleBaseUnitChange}
        />
        {baseUnitOptions.length === 0 && (
          <p className="text-[11px] text-amber-600 mt-2">
            Configura tus unidades de medida en Configuración de Negocio.
          </p>
        )}
      </div>
    </div>
  );
};
