import React from 'react';
import { Factory, FileBadge2, Boxes, HelpCircle } from 'lucide-react';
import type { ProductFormData } from '../../models/types';
import type { FormError } from '../../hooks/useProductForm';
import { Tooltip } from '@/shared/ui';


interface ProductCodesFieldProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  errors: FormError;
  isFieldVisible: (fieldId: string) => boolean;
  isFieldRequired: (fieldId: string) => boolean;
  onBlur?: () => void;
  showCheck?: boolean;
  renderCheck?: (className?: string) => React.ReactNode;
}

export const ProductFactoryCodeField: React.FC<ProductCodesFieldProps> = ({
  formData,
  setFormData,
  errors,
  isFieldVisible,
  isFieldRequired,
  onBlur,
  showCheck,
  renderCheck
}) => {
  if (!isFieldVisible('codigoFabrica')) return null;

  return (
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
          onBlur={onBlur}
          className="w-full h-9 pl-9 pr-7 rounded-md border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
          placeholder="Código del fabricante"
        />
        {showCheck && renderCheck?.('absolute right-2 top-1/2 -translate-y-1/2')}
      </div>
      {errors.codigoFabrica && <p className="text-red-600 text-xs mt-1">{errors.codigoFabrica}</p>}
    </div>
  );
};

export const ProductSunatCodeField: React.FC<ProductCodesFieldProps> = ({
  formData,
  setFormData,
  errors,
  isFieldVisible,
  isFieldRequired,
  onBlur,
  showCheck,
  renderCheck
}) => {
  if (!isFieldVisible('codigoSunat')) return null;

  return (
    <div>
      <label htmlFor="codigoSunat" className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-1">
        <span>
          Código SUNAT
          {isFieldRequired('codigoSunat') && <span className="text-red-500 ml-1">*</span>}
        </span>
        <Tooltip contenido="Opcional. Úsalo si necesitas clasificación SUNAT para reportes/integraciones." ubicacion="derecha">
          <button
            type="button"
            aria-label="Ayuda: Código SUNAT"
            className="inline-flex items-center justify-center rounded-sm text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </Tooltip>
      </label>
      <div className="relative">
        <FileBadge2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          id="codigoSunat"
          value={formData.codigoSunat}
          onChange={(e) => setFormData(prev => ({ ...prev, codigoSunat: e.target.value }))}
          onBlur={onBlur}
          className="w-full h-9 pl-9 pr-7 rounded-md border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
          placeholder="Código tributario"
        />
        {showCheck && renderCheck?.('absolute right-2 top-1/2 -translate-y-1/2')}
      </div>
      {errors.codigoSunat && <p className="text-red-600 text-xs mt-1">{errors.codigoSunat}</p>}
    </div>
  );
};

export const ProductExistenceTypeField: React.FC<ProductCodesFieldProps> = ({
  formData,
  setFormData,
  errors,
  isFieldVisible,
  isFieldRequired,
  onBlur,
  showCheck,
  renderCheck
}) => {
  if (!isFieldVisible('tipoExistencia')) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="tipoExistencia" className="flex items-center gap-2 text-xs font-medium text-gray-700">
          <span>
            Tipo de existencia
            {isFieldRequired('tipoExistencia') && <span className="text-red-500 ml-1">*</span>}
          </span>
          <Tooltip contenido="Clasificación del bien para control y reportes." ubicacion="derecha">
            <button
              type="button"
              aria-label="Ayuda: Tipo de existencia"
              className="inline-flex items-center justify-center rounded-sm text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </Tooltip>
        </label>
        {showCheck && renderCheck?.()}
      </div>
      <div className="relative">
        <Boxes className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <select
          id="tipoExistencia"
          value={formData.tipoExistencia}
          onChange={(e) =>
            setFormData(prev => ({ ...prev, tipoExistencia: e.target.value as ProductFormData['tipoExistencia'] }))
          }
          onBlur={onBlur}
          className={`
            w-full h-9 pl-9 pr-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors
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
  );
};
