import React from 'react';
import { Tag, Quote, Barcode, ScanLine, Folder, Badge as BadgeIcon, Package2, Wand2, Plus, Check } from 'lucide-react';
import type { Category } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import type { ProductFormData } from '../../models/types';
import type { FormError } from '../../hooks/useProductForm';
import { normalizeBarcodeValue, BARCODE_MAX_LENGTH } from '../../utils/formatters';

interface SharedFieldProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  errors: FormError;
}

interface FieldUiProps {
  onBlur?: () => void;
  showCheck?: boolean;
  showBlueHint?: boolean;
}

interface VisibilityProps {
  isFieldVisible: (fieldId: string) => boolean;
  isFieldRequired: (fieldId: string) => boolean;
}

export const ProductNameField: React.FC<SharedFieldProps & FieldUiProps> = ({
  formData,
  setFormData,
  errors,
  onBlur,
  showCheck,
  showBlueHint
}) => {
  return (
    <div>
      <label htmlFor="nombre" className="block text-xs font-medium text-gray-700 mb-1">
        Nombre <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          id="nombre"
          value={formData.nombre}
          onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
          onBlur={onBlur}
          className={`
            w-full h-9 pl-9 pr-7 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors
            ${errors.nombre ? 'border-red-300 bg-red-50' : 'border-gray-300'}
            ${showBlueHint && !errors.nombre ? 'bg-blue-50/40 ring-1 ring-blue-200/60 focus:ring-blue-300/70 focus:border-blue-300' : ''}
          `}
          placeholder="Ingresa el nombre del producto"
        />
        {showCheck && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-500/70" />
        )}
      </div>
      {errors.nombre && <p className="text-red-600 text-xs mt-1">{errors.nombre}</p>}
    </div>
  );
};

export const ProductCodeField: React.FC<SharedFieldProps & FieldUiProps> = ({
  formData,
  setFormData,
  errors,
  onBlur,
  showCheck,
  showBlueHint
}) => {
  return (
    <div>
      <label htmlFor="codigo" className="block text-xs font-medium text-gray-700 mb-1">
        Código <span className="text-red-500">*</span>
      </label>
      <div className="flex gap-2 w-full">
        <div className="relative flex-1 min-w-0">
          <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            id="codigo"
            value={formData.codigo}
            onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
            onBlur={onBlur}
            className={`
              w-full h-9 pl-9 pr-7 rounded-md border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors
              ${errors.codigo ? 'border-red-300 bg-red-50' : 'border-gray-300'}
              ${showBlueHint && !errors.codigo ? 'bg-blue-50/40 ring-1 ring-blue-200/60 focus:ring-blue-300/70 focus:border-blue-300' : ''}
            `}
            placeholder="Código único"
          />
          {showCheck && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-500/70" />
          )}
        </div>
        <button
          type="button"
          className="shrink-0 h-9 w-9 inline-flex items-center justify-center bg-gray-100 border border-gray-300 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors"
          aria-label="Generar código"
          title="Generar código"
          onClick={() => {
            const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
            setFormData(prev => ({ ...prev, codigo: randomCode }));
            onBlur?.();
          }}
        >
          <Wand2 className="w-4 h-4 text-gray-700" />
        </button>
      </div>
      {errors.codigo && <p className="text-red-600 text-xs mt-1">{errors.codigo}</p>}
    </div>
  );
};

export const ProductBarcodeField: React.FC<SharedFieldProps & VisibilityProps & FieldUiProps> = ({
  formData,
  setFormData,
  errors,
  isFieldVisible,
  isFieldRequired,
  onBlur,
  showCheck
}) => {
  if (!isFieldVisible('codigoBarras')) return null;

  const handleBarcodeChange = (value: string) => {
    const normalized = normalizeBarcodeValue(value);
    setFormData(prev => ({ ...prev, codigoBarras: normalized }));
  };

  return (
    <div>
      <label htmlFor="codigoBarras" className="block text-xs font-medium text-gray-700 mb-1">
        Código de barras
        {isFieldRequired('codigoBarras') && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          id="codigoBarras"
          value={formData.codigoBarras ?? ''}
          onChange={(e) => handleBarcodeChange(e.target.value)}
          onBlur={onBlur}
          className={`
            w-full h-9 pl-9 pr-7 rounded-md border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500
            ${errors.codigoBarras ? 'border-red-300 bg-red-50' : 'border-gray-300'}
          `}
          placeholder="8-14 dígitos"
          inputMode="numeric"
          maxLength={BARCODE_MAX_LENGTH}
          autoComplete="off"
          aria-invalid={errors.codigoBarras ? 'true' : 'false'}
        />
        {showCheck && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-500/70" />
        )}
      </div>
      {errors.codigoBarras && <p className="text-red-600 text-xs mt-1">{errors.codigoBarras}</p>}
    </div>
  );
};

export const ProductAliasField: React.FC<SharedFieldProps & VisibilityProps & FieldUiProps> = ({
  formData,
  setFormData,
  errors,
  isFieldVisible,
  isFieldRequired,
  onBlur,
  showCheck
}) => {
  if (!isFieldVisible('alias')) return null;

  return (
    <div>
      <label htmlFor="alias" className="block text-xs font-medium text-gray-700 mb-1">
        Alias del producto
        {isFieldRequired('alias') && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <Quote className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          id="alias"
          value={formData.alias}
          onChange={(e) => setFormData(prev => ({ ...prev, alias: e.target.value }))}
          onBlur={onBlur}
          className={`
            w-full h-9 pl-9 pr-7 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors
            ${errors.alias ? 'border-red-300 bg-red-50' : 'border-gray-300'}
          `}
          placeholder="Nombre alternativo"
        />
        {showCheck && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-500/70" />
        )}
      </div>
      {errors.alias && <p className="text-red-600 text-xs mt-1">{errors.alias}</p>}
    </div>
  );
};

interface CategoryFieldProps extends SharedFieldProps, VisibilityProps, FieldUiProps {
  categories: Category[];
  onOpenCategoryModal: () => void;
}

export const ProductCategoryField: React.FC<CategoryFieldProps> = ({
  formData,
  setFormData,
  errors,
  isFieldVisible,
  isFieldRequired,
  categories,
  onOpenCategoryModal,
  onBlur,
  showCheck
}) => {
  if (!isFieldVisible('categoria')) return null;

  return (
    <div>
      <label htmlFor="categoria" className="block text-xs font-medium text-gray-700 mb-1">
        Categoría
        {isFieldRequired('categoria') && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex gap-2 w-full">
        <div className="relative flex-1 min-w-0">
          <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <select
            id="categoria"
            value={formData.categoria}
            onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
            onBlur={onBlur}
            className={`
              w-full h-9 pl-9 pr-7 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors
              ${errors.categoria ? 'border-red-300 bg-red-50' : 'border-gray-300'}
            `}
          >
            <option value="">Seleccionar categoría</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.nombre}>
                {cat.nombre}
              </option>
            ))}
          </select>
          {showCheck && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-500/70" />
          )}
        </div>
        <button
          type="button"
          className="shrink-0 h-9 w-9 inline-flex items-center justify-center text-violet-700 border border-violet-300 rounded-md hover:bg-violet-50 transition-colors"
          aria-label="Crear categoría"
          title="Crear categoría"
          onClick={onOpenCategoryModal}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {errors.categoria && <p className="text-red-600 text-xs mt-1">{errors.categoria}</p>}
    </div>
  );
};

export const ProductBrandField: React.FC<SharedFieldProps & VisibilityProps & FieldUiProps> = ({
  formData,
  setFormData,
  errors,
  isFieldVisible,
  isFieldRequired,
  onBlur,
  showCheck
}) => {
  if (!isFieldVisible('marca')) return null;

  return (
    <div>
      <label htmlFor="marca" className="block text-xs font-medium text-gray-700 mb-1">
        Marca
        {isFieldRequired('marca') && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <BadgeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          id="marca"
          value={formData.marca}
          onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
          onBlur={onBlur}
          className="w-full h-9 pl-9 pr-7 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
          placeholder="Marca del producto"
        />
        {showCheck && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-500/70" />
        )}
      </div>
      {errors.marca && <p className="text-red-600 text-xs mt-1">{errors.marca}</p>}
    </div>
  );
};

export const ProductModelField: React.FC<SharedFieldProps & VisibilityProps & FieldUiProps> = ({
  formData,
  setFormData,
  errors,
  isFieldVisible,
  isFieldRequired,
  onBlur,
  showCheck
}) => {
  if (!isFieldVisible('modelo')) return null;

  return (
    <div>
      <label htmlFor="modelo" className="block text-xs font-medium text-gray-700 mb-1">
        Modelo
        {isFieldRequired('modelo') && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <Package2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          id="modelo"
          value={formData.modelo}
          onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
          onBlur={onBlur}
          className="w-full h-9 pl-9 pr-7 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
          placeholder="Modelo del producto"
        />
        {showCheck && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-500/70" />
        )}
      </div>
      {errors.modelo && <p className="text-red-600 text-xs mt-1">{errors.modelo}</p>}
    </div>
  );
};
