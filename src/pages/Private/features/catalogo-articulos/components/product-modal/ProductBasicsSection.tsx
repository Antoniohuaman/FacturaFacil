import React from 'react';
import { Tag, Quote, Barcode, ScanLine, Folder, Badge as BadgeIcon, Package2, Wand2, Plus } from 'lucide-react';
import { Input, Button, Select } from '@/contasis';
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
  renderCheck?: (className?: string) => React.ReactNode;
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
  showBlueHint,
  renderCheck
}) => {
  return (
    <Input
      label="Nombre"
      required
      type="text"
      id="nombre"
      value={formData.nombre}
      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
      placeholder="Ingresa el nombre del producto"
      error={errors.nombre}
      leftIcon={<Tag size={18} />}
    />
  );
};

export const ProductCodeField: React.FC<SharedFieldProps & FieldUiProps> = ({
  formData,
  setFormData,
  errors,
  onBlur,
  showCheck,
  showBlueHint,
  renderCheck
}) => {
  return (
    <div className="flex gap-2 w-full">
      <div className="flex-1">
        <Input
          label="Código"
          required
          type="text"
          id="codigo"
          value={formData.codigo}
          onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
          placeholder="Código único"
          error={errors.codigo}
          leftIcon={<Barcode size={18} />}
        />
      </div>
      <div className="flex items-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          iconOnly
          icon={<Wand2 size={18} />}
          onClick={() => {
            const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
            setFormData(prev => ({ ...prev, codigo: randomCode }));
            onBlur?.();
          }}
          title="Generar código"
          aria-label="Generar código"
        />
      </div>
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
  showCheck,
  renderCheck
}) => {
  if (!isFieldVisible('codigoBarras')) return null;

  const handleBarcodeChange = (value: string) => {
    const normalized = normalizeBarcodeValue(value);
    setFormData(prev => ({ ...prev, codigoBarras: normalized }));
  };

  return (
    <Input
      label="Código de barras"
      required={isFieldRequired('codigoBarras')}
      type="text"
      id="codigoBarras"
      value={formData.codigoBarras ?? ''}
      onChange={(e) => handleBarcodeChange(e.target.value)}
      placeholder="8-14 dígitos"
      error={errors.codigoBarras}
      leftIcon={<ScanLine size={18} />}
      inputMode="numeric"
      maxLength={BARCODE_MAX_LENGTH}
      autoComplete="off"
    />
  );
};

export const ProductAliasField: React.FC<SharedFieldProps & VisibilityProps & FieldUiProps> = ({
  formData,
  setFormData,
  errors,
  isFieldVisible,
  isFieldRequired,
  onBlur,
  showCheck,
  renderCheck
}) => {
  if (!isFieldVisible('alias')) return null;

  return (
    <Input
      label="Alias del producto"
      required={isFieldRequired('alias')}
      type="text"
      id="alias"
      value={formData.alias}
      onChange={(e) => setFormData(prev => ({ ...prev, alias: e.target.value }))}
      placeholder="Nombre alternativo"
      error={errors.alias}
      leftIcon={<Quote size={18} />}
    />
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
  showCheck,
  renderCheck
}) => {
  if (!isFieldVisible('categoria')) return null;

  return (
    <div className="flex gap-2 w-full">
      <div className="flex-1">
        <Select
          label="Categoría"
          required={isFieldRequired('categoria')}
          value={formData.categoria}
          onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
          error={errors.categoria}
          options={[
            { value: '', label: 'Seleccionar categoría' },
            ...categories.map(cat => ({
              value: cat.nombre,
              label: cat.nombre
            }))
          ]}
        />
      </div>
      <div className="flex items-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          iconOnly
          icon={<Plus size={18} />}
          onClick={onOpenCategoryModal}
          title="Crear categoría"
          aria-label="Crear categoría"
        />
      </div>
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
  showCheck,
  renderCheck
}) => {
  if (!isFieldVisible('marca')) return null;

  return (
    <Input
      label="Marca"
      required={isFieldRequired('marca')}
      type="text"
      id="marca"
      value={formData.marca}
      onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
      placeholder="Marca del producto"
      error={errors.marca}
      leftIcon={<BadgeIcon size={18} />}
    />
  );
};

export const ProductModelField: React.FC<SharedFieldProps & VisibilityProps & FieldUiProps> = ({
  formData,
  setFormData,
  errors,
  isFieldVisible,
  isFieldRequired,
  onBlur,
  showCheck,
  renderCheck
}) => {
  if (!isFieldVisible('modelo')) return null;

  return (
    <Input
      label="Modelo"
      required={isFieldRequired('modelo')}
      type="text"
      id="modelo"
      value={formData.modelo}
      onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
      placeholder="Modelo del producto"
      error={errors.modelo}
      leftIcon={<Package2 size={18} />}
    />
  );
};
