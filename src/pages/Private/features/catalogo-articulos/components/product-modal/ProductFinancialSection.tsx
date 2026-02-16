import React from 'react';
import { Wallet, TrendingUp, TicketPercent, HelpCircle } from 'lucide-react';
import type { ProductFormData } from '../../models/types';
import type { FormError } from '../../hooks/useProductForm';
import { Tooltip } from '@/shared/ui';

interface ProductFinancialSectionProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  errors: FormError;
  isFieldVisible: (fieldId: string) => boolean;
  isFieldRequired: (fieldId: string) => boolean;
  onBlur?: () => void;
  showCheck?: boolean;
  renderCheck?: (className?: string) => React.ReactNode;
}

export const ProductPurchasePriceField: React.FC<ProductFinancialSectionProps> = ({
  formData,
  setFormData,
  errors,
  isFieldVisible,
  isFieldRequired,
  onBlur,
  showCheck,
  renderCheck
}) => {
  if (!isFieldVisible('precioCompra')) return null;

  return (
    <div>
      <label htmlFor="precioCompra" className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-1">
        <span>
          Precio inicial de compra
          {isFieldRequired('precioCompra') && <span className="text-red-500 ml-1">*</span>}
        </span>
        <Tooltip contenido="Costo referencial para márgenes. No afecta stock por sí solo." ubicacion="derecha">
          <button
            type="button"
            aria-label="Ayuda: Precio inicial de compra"
            className="inline-flex items-center justify-center rounded-sm text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </Tooltip>
      </label>
      <div className="relative">
        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <div className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">S/</div>
        <input
          type="number"
          id="precioCompra"
          step="0.01"
          min="0"
          value={formData.precioCompra}
          onChange={(e) => setFormData(prev => ({ ...prev, precioCompra: parseFloat(e.target.value) || 0 }))}
          onBlur={onBlur}
          className="w-full h-9 pl-16 pr-10 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
          placeholder="0.00"
        />
        {showCheck && renderCheck?.('absolute right-3 top-1/2 -translate-y-1/2')}
      </div>
      {errors.precioCompra && <p className="text-red-600 text-xs mt-1">{errors.precioCompra}</p>}
    </div>
  );
};

export const ProductProfitPercentField: React.FC<ProductFinancialSectionProps> = ({
  formData,
  setFormData,
  errors,
  isFieldVisible,
  isFieldRequired,
  onBlur,
  showCheck,
  renderCheck
}) => {
  if (!isFieldVisible('porcentajeGanancia')) return null;

  return (
    <div>
      <label htmlFor="porcentajeGanancia" className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-1">
        <span>
          Porcentaje de ganancia
          {isFieldRequired('porcentajeGanancia') && <span className="text-red-500 ml-1">*</span>}
        </span>
        <Tooltip contenido="Se usa para sugerir precio de venta desde el costo." ubicacion="derecha">
          <button
            type="button"
            aria-label="Ayuda: Porcentaje de ganancia"
            className="inline-flex items-center justify-center rounded-sm text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </Tooltip>
      </label>
      <div className="relative">
        <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="number"
          id="porcentajeGanancia"
          step="0.01"
          min="0"
          max="100"
          value={formData.porcentajeGanancia}
          onChange={(e) =>
            setFormData(prev => ({ ...prev, porcentajeGanancia: parseFloat(e.target.value) || 0 }))
          }
          onBlur={onBlur}
          className="w-full h-9 pl-9 pr-12 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
          placeholder="0.00"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">%</div>
        {showCheck && renderCheck?.('absolute right-8 top-1/2 -translate-y-1/2')}
      </div>
      {errors.porcentajeGanancia && <p className="text-red-600 text-xs mt-1">{errors.porcentajeGanancia}</p>}
    </div>
  );
};

export const ProductDiscountField: React.FC<ProductFinancialSectionProps> = ({
  formData,
  setFormData,
  errors,
  isFieldVisible,
  isFieldRequired,
  onBlur,
  showCheck,
  renderCheck
}) => {
  if (!isFieldVisible('descuentoProducto')) return null;

  return (
    <div>
      <label htmlFor="descuentoProducto" className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-1">
        <span>
          Descuento del producto
          {isFieldRequired('descuentoProducto') && <span className="text-red-500 ml-1">*</span>}
        </span>
        <Tooltip contenido="Descuento sugerido por defecto (puede cambiarse en la venta)." ubicacion="derecha">
          <button
            type="button"
            aria-label="Ayuda: Descuento del producto"
            className="inline-flex items-center justify-center rounded-sm text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </Tooltip>
      </label>
      <div className="relative">
        <TicketPercent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="number"
          id="descuentoProducto"
          step="0.01"
          min="0"
          max="100"
          value={formData.descuentoProducto}
          onChange={(e) =>
            setFormData(prev => ({ ...prev, descuentoProducto: parseFloat(e.target.value) || 0 }))
          }
          onBlur={onBlur}
          className="w-full h-9 pl-9 pr-12 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
          placeholder="0.00"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">%</div>
        {showCheck && renderCheck?.('absolute right-8 top-1/2 -translate-y-1/2')}
      </div>
      {errors.descuentoProducto && <p className="text-red-600 text-xs mt-1">{errors.descuentoProducto}</p>}
    </div>
  );
};
