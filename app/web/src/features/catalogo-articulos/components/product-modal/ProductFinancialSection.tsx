import React from 'react';
import { Wallet, TrendingUp, TicketPercent } from 'lucide-react';
import type { ProductFormData } from '../../models/types';
import type { FormError } from '../../hooks/useProductForm';

interface ProductFinancialSectionProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  errors: FormError;
  isFieldVisible: (fieldId: string) => boolean;
  isFieldRequired: (fieldId: string) => boolean;
}

export const ProductPurchasePriceField: React.FC<ProductFinancialSectionProps> = ({
  formData,
  setFormData,
  errors,
  isFieldVisible,
  isFieldRequired
}) => {
  if (!isFieldVisible('precioCompra')) return null;

  return (
    <div>
      <label htmlFor="precioCompra" className="block text-xs font-medium text-gray-700 mb-1">
        Precio inicial de compra
        {isFieldRequired('precioCompra') && <span className="text-red-500 ml-1">*</span>}
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
          className="w-full h-10 pl-16 pr-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
          placeholder="0.00"
        />
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
  isFieldRequired
}) => {
  if (!isFieldVisible('porcentajeGanancia')) return null;

  return (
    <div>
      <label htmlFor="porcentajeGanancia" className="block text-xs font-medium text-gray-700 mb-1">
        Porcentaje de ganancia
        {isFieldRequired('porcentajeGanancia') && <span className="text-red-500 ml-1">*</span>}
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
          className="w-full h-10 pl-9 pr-12 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
          placeholder="0.00"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">%</div>
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
  isFieldRequired
}) => {
  if (!isFieldVisible('descuentoProducto')) return null;

  return (
    <div>
      <label htmlFor="descuentoProducto" className="block text-xs font-medium text-gray-700 mb-1">
        Descuento del producto
        {isFieldRequired('descuentoProducto') && <span className="text-red-500 ml-1">*</span>}
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
          className="w-full h-10 pl-9 pr-12 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
          placeholder="0.00"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">%</div>
      </div>
      {errors.descuentoProducto && <p className="text-red-600 text-xs mt-1">{errors.descuentoProducto}</p>}
    </div>
  );
};
