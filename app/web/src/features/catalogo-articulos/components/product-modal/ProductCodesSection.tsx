import React from 'react';
import { Factory, FileBadge2, Boxes } from 'lucide-react';
import type { ProductFormData } from '../../models/types';
import type { FormError } from '../../hooks/useProductForm';

interface ProductCodesSectionProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  errors: FormError;
  isFieldVisible: (fieldId: string) => boolean;
  isFieldRequired: (fieldId: string) => boolean;
}

export const ProductCodesSection: React.FC<ProductCodesSectionProps> = ({
  formData,
  setFormData,
  errors,
  isFieldVisible,
  isFieldRequired
}) => {
  return (
    <div className="space-y-4">
      {isFieldVisible('codigoFabrica') && (
        <div>
          <label htmlFor="codigoFabrica" className="block text-xs font-medium text-gray-700 mb-1">
            Código de fábrica
            {isFieldRequired('codigoFabrica') && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="relative">
            <Factory className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              id="codigoFabrica"
              value={formData.codigoFabrica}
              onChange={(e) => setFormData(prev => ({ ...prev, codigoFabrica: e.target.value }))}
              className="w-full h-10 pl-9 pr-3 rounded-md border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
              placeholder="Código del fabricante"
            />
          </div>
          {errors.codigoFabrica && <p className="text-red-600 text-xs mt-1">{errors.codigoFabrica}</p>}
        </div>
      )}

      {isFieldVisible('codigoSunat') && (
        <div>
          <label htmlFor="codigoSunat" className="block text-xs font-medium text-gray-700 mb-1">
            Código SUNAT
            {isFieldRequired('codigoSunat') && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="relative">
            <FileBadge2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              id="codigoSunat"
              value={formData.codigoSunat}
              onChange={(e) => setFormData(prev => ({ ...prev, codigoSunat: e.target.value }))}
              className="w-full h-10 pl-9 pr-3 rounded-md border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
              placeholder="Código tributario"
            />
          </div>
          {errors.codigoSunat && <p className="text-red-600 text-xs mt-1">{errors.codigoSunat}</p>}
        </div>
      )}

      {isFieldVisible('tipoExistencia') && (
        <div>
          <label htmlFor="tipoExistencia" className="block text-xs font-medium text-gray-700 mb-1">
            Tipo de existencia
            {isFieldRequired('tipoExistencia') && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="relative">
            <Boxes className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <select
              id="tipoExistencia"
              value={formData.tipoExistencia}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, tipoExistencia: e.target.value as ProductFormData['tipoExistencia'] }))
              }
              className={`
                w-full h-10 pl-9 pr-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors
                ${errors.tipoExistencia ? 'border-red-300 bg-red-50' : 'border-gray-300'}
              `}
            >
              <option value="MERCADERIAS">Mercaderías</option>
              <option value="PRODUCTOS_TERMINADOS">Productos Terminados</option>
              <option value="MATERIAS_PRIMAS">Materias Primas</option>
              <option value="ENVASES">Envases</option>
              <option value="MATERIALES_AUXILIARES">Materiales Auxiliares</option>
              <option value="SUMINISTROS">Suministros</option>
              <option value="REPUESTOS">Repuestos</option>
              <option value="EMBALAJES">Embalajes</option>
              <option value="OTROS">Otros</option>
            </select>
          </div>
          {errors.tipoExistencia && <p className="text-red-600 text-xs mt-1">{errors.tipoExistencia}</p>}
        </div>
      )}
    </div>
  );
};
