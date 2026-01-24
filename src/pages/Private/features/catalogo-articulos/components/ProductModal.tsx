import React, { useCallback, useMemo, useState } from 'react';
import { Sliders, X } from 'lucide-react';
import CategoryModal from './CategoryModal';
import { FieldsConfigPanel } from './FieldsConfigPanel';
import { ProductTypeSelector } from './product-modal/ProductTypeSelector';
import {
  ProductBarcodeField,
  ProductCategoryField,
  ProductAliasField,
  ProductBrandField,
  ProductCodeField,
  ProductModelField,
  ProductNameField
} from './product-modal/ProductBasicsSection';
import { ProductPricingSection } from './product-modal/ProductPricingSection';
import { ProductMinimumUnitField, ProductUnitFamilyField } from './product-modal/ProductUnitsSection';
import { ProductAdditionalUnitsTable } from './product-modal/ProductAdditionalUnitsTable';
import { ProductAvailabilitySection } from './product-modal/ProductAvailabilitySection';
import { ProductDescriptionField, ProductWeightField } from './product-modal/ProductDescriptionSection';
import { ProductImageUpload } from './product-modal/ProductImageUpload';
import {
  ProductDiscountField,
  ProductProfitPercentField,
  ProductPurchasePriceField
} from './product-modal/ProductFinancialSection';
import {
  ProductExistenceTypeField,
  ProductFactoryCodeField,
  ProductSunatCodeField
} from './product-modal/ProductCodesSection';
import { ProductActions } from './product-modal/ProductActions';
import { useProductStore, type ProductInput } from '../hooks/useProductStore';
import { useProductFieldsConfig } from '../hooks/useProductFieldsConfig';
import { useProductForm } from '../hooks/useProductForm';
import type { Product } from '../models/types';
import { useConfigurationContext, type Category } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useCurrentEstablecimientoId } from '@/contexts/UserSessionContext';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: ProductInput) => void;
  product?: Product;
  categories: Category[];
}

const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  product,
  categories
}) => {
  const { addCategory, categories: globalCategories, allProducts } = useProductStore();
  const { state: configState } = useConfigurationContext();
  const currentEstablecimientoId = useCurrentEstablecimientoId();

  const Establecimientos = useMemo(
    () => configState.Establecimientos.filter(est => est.estaActivoEstablecimiento !== false),
    [configState.Establecimientos]
  );

  const defaultEstablecimientoId = useMemo(() => {
    if (currentEstablecimientoId && Establecimientos.some(est => est.id === currentEstablecimientoId)) {
      return currentEstablecimientoId;
    }
    const main = Establecimientos.find(est => est.isMainEstablecimiento);
    return (main?.id ?? Establecimientos[0]?.id ?? '');
  }, [currentEstablecimientoId, Establecimientos]);

  const availableUnits = useMemo(
    () => configState.units.filter(unit => unit.isActive && unit.isVisible !== false),
    [configState.units]
  );

  const taxOptions = useMemo(() => {
    const taxes = configState.taxes ?? [];
    const visible = taxes.filter(tax => tax.isActive);
    const order = ['IGV18', 'IGV10', 'EXO', 'INA', 'IGV_EXP'];
    const sorted = [...visible].sort((a, b) => {
      const ai = order.indexOf(a.code);
      const bi = order.indexOf(b.code);
      const sa = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
      const sb = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
      if (sa !== sb) return sa - sb;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });

    const formatLabel = (rate: number, name: string): string => {
      const rateFixed = rate.toFixed(2);
      if (name.toLowerCase().startsWith('igv')) {
        return `IGV (${rateFixed}%)`;
      }
      return `${name} (${rateFixed}%)`;
    };

    return sorted.map(tax => ({
      id: tax.id,
      code: tax.code,
      value: formatLabel(tax.rate, tax.name),
      label: formatLabel(tax.rate, tax.name),
    }));
  }, [configState.taxes]);

  const defaultTaxLabel = useMemo(() => {
    if (!configState.taxes || configState.taxes.length === 0) {
      return undefined;
    }
    const order = ['IGV18', 'IGV10', 'EXO', 'INA', 'IGV_EXP'];
    const taxes = configState.taxes;
    const explicitDefault = taxes.find(tax => tax.isDefault);
    const byOrder = taxes.find(tax => order.includes(tax.code));
    const fallback = explicitDefault ?? byOrder ?? taxes[0];

    const rateFixed = fallback.rate.toFixed(2);
    if (fallback.name.toLowerCase().startsWith('igv')) {
      return `IGV (${rateFixed}%)`;
    }
    return `${fallback.name} (${rateFixed}%)`;
  }, [configState.taxes]);

  const {
    fieldsConfig,
    isPanelOpen,
    setIsPanelOpen,
    toggleFieldVisibility,
    toggleFieldRequired,
    resetToDefault,
    isFieldVisible,
    isFieldRequired
  } = useProductFieldsConfig();

  const {
    formData,
    setFormData,
    errors,
    additionalUnitErrors,
    loading,
    imagePreview,
    productType,
    setProductType,
    isDescriptionExpanded,
    setIsDescriptionExpanded,
    unitInfoMessage,
    setUnitInfoMessage,
    showCategoryModal,
    setShowCategoryModal,
    baseUnitOptions,
    isUsingFallbackUnits,
    remainingUnitsForAdditional,
    findUnitByCode,
    formatFactorValue,
    handleMeasureTypeChange,
    handleBaseUnitChange,
    addAdditionalUnit,
    removeAdditionalUnit,
    updateAdditionalUnit,
    getAdditionalUnitOptions,
    handleSubmit,
    handleImageUpload
  } = useProductForm({
    isOpen,
    product,
    categories,
    availableUnits,
    allProducts,
    isFieldVisible,
    isFieldRequired,
    onSave,
    onClose,
    defaultTaxLabel,
    activeEstablecimientos: Establecimientos,
    defaultEstablecimientoId
  });

  const showBarcode = isFieldVisible('codigoBarras');
  const showTax = isFieldVisible('impuesto');
  const showCategory = isFieldVisible('categoria');
  const showAlias = isFieldVisible('alias');
  const showSunat = isFieldVisible('codigoSunat');
  const showPresentacionesComerciales = isFieldVisible('presentacionesComerciales');
  const showAvailability = Establecimientos.length > 1;

  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [hasSubmitAttempt, setHasSubmitAttempt] = useState(false);

  const markTouched = useCallback((fieldId: string) => {
    setTouchedFields(prev => (prev[fieldId] ? prev : { ...prev, [fieldId]: true }));
  }, []);

  const isFilled = useCallback((fieldId: string): boolean => {
    switch (fieldId) {
      case 'nombre':
        return formData.nombre.trim().length > 0;
      case 'codigo':
        return formData.codigo.trim().length > 0;
      case 'categoria':
        return (formData.categoria ?? '').trim().length > 0;
      case 'codigoBarras':
        return (formData.codigoBarras ?? '').trim().length > 0;
      case 'alias':
        return (formData.alias ?? '').trim().length > 0;
      case 'marca':
        return (formData.marca ?? '').trim().length > 0;
      case 'modelo':
        return (formData.modelo ?? '').trim().length > 0;
      case 'descripcion':
        return (formData.descripcion ?? '').trim().length > 0;
      case 'codigoSunat':
        return (formData.codigoSunat ?? '').trim().length > 0;
      case 'codigoFabrica':
        return (formData.codigoFabrica ?? '').trim().length > 0;
      case 'tipoExistencia':
        return Boolean(formData.tipoExistencia);
      case 'impuesto':
        return (formData.impuesto ?? '').trim().length > 0;
      case 'unidad':
        return Boolean(formData.unidad);
      case 'tipoUnidadMedida':
        return Boolean(formData.tipoUnidadMedida);
      case 'establecimiento':
        return (formData.establecimientoIds ?? []).length > 0;
      case 'imagen':
        return Boolean(imagePreview);
      case 'precioCompra':
        return formData.precioCompra !== undefined && formData.precioCompra !== null;
      case 'porcentajeGanancia':
        return formData.porcentajeGanancia !== undefined && formData.porcentajeGanancia !== null;
      case 'descuentoProducto':
        return formData.descuentoProducto !== undefined && formData.descuentoProducto !== null;
      case 'peso':
        return formData.peso !== undefined && formData.peso !== null;
      case 'presentacionesComerciales':
        return (formData.unidadesMedidaAdicionales ?? []).length > 0;
      case 'tipoProducto':
        return Boolean(productType);
      default: {
        const rawValue = (formData as Record<string, unknown>)[fieldId];
        if (typeof rawValue === 'string') return rawValue.trim().length > 0;
        if (Array.isArray(rawValue)) return rawValue.length > 0;
        if (typeof rawValue === 'number') return !Number.isNaN(rawValue);
        if (typeof rawValue === 'boolean') return rawValue;
        return Boolean(rawValue);
      }
    }
  }, [formData, imagePreview, productType]);

  const hasFieldError = useCallback((fieldId: string) => {
    switch (fieldId) {
      case 'establecimiento':
        return Boolean(errors.establecimientoIds);
      case 'tipoUnidadMedida':
        return Boolean(errors.tipoUnidadMedida);
      default:
        return Boolean((errors as Record<string, unknown>)[fieldId]);
    }
  }, [errors]);

  const shouldShowCheck = useCallback((fieldId: string) => {
    if (hasFieldError(fieldId)) return false;
    const filled = isFilled(fieldId);
    if (!filled) return false;
    if (fieldId === 'nombre' || fieldId === 'codigo') {
      return Boolean(touchedFields[fieldId] || hasSubmitAttempt);
    }
    if (touchedFields[fieldId] !== undefined) {
      return Boolean(touchedFields[fieldId]);
    }
    return true;
  }, [hasFieldError, hasSubmitAttempt, isFilled, touchedFields]);

  const shouldBlueHint = useCallback(
    (fieldId: string) => (fieldId === 'nombre' || fieldId === 'codigo') && !isFilled(fieldId),
    [isFilled]
  );

  const handleSubmitWithTouch = useCallback(
    (event?: React.FormEvent | React.MouseEvent) => {
      setHasSubmitAttempt(true);
      handleSubmit(event);
    },
    [handleSubmit]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-[780px] max-h-[90vh] flex flex-col bg-white rounded-lg shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-3 border-b border-gray-200 bg-white rounded-t-lg">
          <h3 className="text-base font-semibold text-gray-900">
            {product ? 'Editar producto' : 'Nuevo producto / servicio'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPanelOpen(true)}
              className="p-1.5 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-md transition-colors"
              title="Personalizar"
              aria-label="Personalizar campos del formulario"
            >
              <Sliders className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmitWithTouch} className="flex-1 overflow-y-auto px-3 py-3">
          <ProductTypeSelector
            productType={productType}
            onChange={setProductType}
            showCheck={shouldShowCheck('tipoProducto')}
          />

          <div className="space-y-2.5">
            {/* A) DEFAULT / OBLIGATORIO */}
            <div className="flex flex-col lg:flex-row gap-2 items-start">
              <div className="w-full lg:flex-1 lg:max-w-[500px] space-y-2.5">
                {/* Nombre (obligatorio) */}
                <ProductNameField
                  formData={formData}
                  setFormData={setFormData}
                  errors={errors}
                  onBlur={() => markTouched('nombre')}
                  showCheck={shouldShowCheck('nombre')}
                  showBlueHint={shouldBlueHint('nombre')}
                />

                {/* Código + Código de barras (misma fila) */}
                <div className={`grid grid-cols-1 gap-2 ${showBarcode ? 'lg:grid-cols-2' : ''}`}>
                  <ProductCodeField
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    onBlur={() => markTouched('codigo')}
                    showCheck={shouldShowCheck('codigo')}
                    showBlueHint={shouldBlueHint('codigo')}
                  />
                  <ProductBarcodeField
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    isFieldVisible={isFieldVisible}
                    isFieldRequired={isFieldRequired}
                    onBlur={() => markTouched('codigoBarras')}
                    showCheck={shouldShowCheck('codigoBarras')}
                  />
                </div>

                {/* Impuesto + Disponibilidad (misma fila) */}
                <div
                  className={`grid grid-cols-1 gap-2 ${showTax && showAvailability ? 'lg:grid-cols-2' : ''}`}
                >
                  <ProductPricingSection
                    formData={formData}
                    setFormData={setFormData}
                    isFieldVisible={isFieldVisible}
                    isFieldRequired={isFieldRequired}
                    taxOptions={taxOptions}
                    onBlur={() => markTouched('impuesto')}
                    showCheck={shouldShowCheck('impuesto')}
                  />
                  {showAvailability && (
                    <ProductAvailabilitySection
                      formData={formData}
                      setFormData={setFormData}
                      Establecimientos={Establecimientos}
                      showCheck={shouldShowCheck('establecimiento')}
                      onFieldTouched={() => markTouched('establecimiento')}
                    />
                  )}
                </div>

                {/* Unidad mínima + Categoría (misma fila) */}
                <div className={`grid grid-cols-1 gap-2 ${showCategory ? 'lg:grid-cols-2' : ''}`}>
                  <ProductMinimumUnitField
                    formData={formData}
                    baseUnitOptions={baseUnitOptions}
                    handleBaseUnitChange={handleBaseUnitChange}
                    onBlur={() => markTouched('unidad')}
                    showCheck={shouldShowCheck('unidad')}
                  />
                  <ProductCategoryField
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    isFieldVisible={isFieldVisible}
                    isFieldRequired={isFieldRequired}
                    categories={globalCategories}
                    onOpenCategoryModal={() => setShowCategoryModal(true)}
                    onBlur={() => markTouched('categoria')}
                    showCheck={shouldShowCheck('categoria')}
                  />
                </div>

                {/* Familia de unidades (se mantiene igual) */}
                <ProductUnitFamilyField
                  formData={formData}
                  errors={errors}
                  isUsingFallbackUnits={isUsingFallbackUnits}
                  handleMeasureTypeChange={handleMeasureTypeChange}
                  showCheck={shouldShowCheck('tipoUnidadMedida')}
                />

                {/* Alias + Código SUNAT (misma fila) */}
                <div className={`grid grid-cols-1 gap-2 ${showAlias && showSunat ? 'lg:grid-cols-2' : ''}`}>
                  <ProductAliasField
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    isFieldVisible={isFieldVisible}
                    isFieldRequired={isFieldRequired}
                    onBlur={() => markTouched('alias')}
                    showCheck={shouldShowCheck('alias')}
                  />
                  <ProductSunatCodeField
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    isFieldVisible={isFieldVisible}
                    isFieldRequired={isFieldRequired}
                    onBlur={() => markTouched('codigoSunat')}
                    showCheck={shouldShowCheck('codigoSunat')}
                  />
                </div>
              </div>

              {/* Imagen a la derecha */}
              <div className="w-full lg:w-[240px] lg:flex-shrink-0">
                <ProductImageUpload
                  imagePreview={imagePreview}
                  onUpload={handleImageUpload}
                  isFieldVisible={isFieldVisible}
                  isFieldRequired={isFieldRequired}
                  showCheck={shouldShowCheck('imagen')}
                />
              </div>
            </div>

            {showPresentacionesComerciales && (
              <ProductAdditionalUnitsTable
                unidadesMedidaAdicionales={formData.unidadesMedidaAdicionales}
                baseUnitCode={formData.unidad}
                additionalUnitErrors={additionalUnitErrors}
                addAdditionalUnit={addAdditionalUnit}
                removeAdditionalUnit={removeAdditionalUnit}
                updateAdditionalUnit={updateAdditionalUnit}
                getAdditionalUnitOptions={getAdditionalUnitOptions}
                remainingUnitsForAdditional={remainingUnitsForAdditional}
                findUnitByCode={findUnitByCode}
                formatFactorValue={formatFactorValue}
                unitInfoMessage={unitInfoMessage}
                setUnitInfoMessage={setUnitInfoMessage}
                showCheck={shouldShowCheck('presentacionesComerciales')}
              />
            )}

            {/* B) CAMPOS COMPLEMENTARIOS */}
            <div className="space-y-2.5">
              {/* 9. Descripción (full) */}
              <ProductDescriptionField
                formData={formData}
                setFormData={setFormData}
                errors={errors}
                isFieldVisible={isFieldVisible}
                isFieldRequired={isFieldRequired}
                isDescriptionExpanded={isDescriptionExpanded}
                onToggleDescription={() => setIsDescriptionExpanded(prev => !prev)}
                onBlur={() => markTouched('descripcion')}
                showCheck={shouldShowCheck('descripcion')}
              />

              {/* 11. Fila compacta: Peso + Marca + Modelo + Código fábrica */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-3">
                  <ProductWeightField
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    isFieldVisible={isFieldVisible}
                    isFieldRequired={isFieldRequired}
                    onBlur={() => markTouched('peso')}
                    showCheck={shouldShowCheck('peso')}
                  />
                </div>
                <div className="md:col-span-3">
                  <ProductBrandField
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    isFieldVisible={isFieldVisible}
                    isFieldRequired={isFieldRequired}
                    onBlur={() => markTouched('marca')}
                    showCheck={shouldShowCheck('marca')}
                  />
                </div>
                <div className="md:col-span-3">
                  <ProductModelField
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    isFieldVisible={isFieldVisible}
                    isFieldRequired={isFieldRequired}
                    onBlur={() => markTouched('modelo')}
                    showCheck={shouldShowCheck('modelo')}
                  />
                </div>
                <div className="md:col-span-3">
                  <ProductFactoryCodeField
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    isFieldVisible={isFieldVisible}
                    isFieldRequired={isFieldRequired}
                    onBlur={() => markTouched('codigoFabrica')}
                    showCheck={shouldShowCheck('codigoFabrica')}
                  />
                </div>
              </div>

              {/* 12. Fila compacta 4: Tipo existencia + Descuento + % Ganancia + Precio compra */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-3">
                  <ProductExistenceTypeField
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    isFieldVisible={isFieldVisible}
                    isFieldRequired={isFieldRequired}
                    onBlur={() => markTouched('tipoExistencia')}
                    showCheck={shouldShowCheck('tipoExistencia')}
                  />
                </div>
                <div className="md:col-span-3">
                  <ProductDiscountField
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    isFieldVisible={isFieldVisible}
                    isFieldRequired={isFieldRequired}
                    onBlur={() => markTouched('descuentoProducto')}
                    showCheck={shouldShowCheck('descuentoProducto')}
                  />
                </div>
                <div className="md:col-span-3">
                  <ProductProfitPercentField
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    isFieldVisible={isFieldVisible}
                    isFieldRequired={isFieldRequired}
                    onBlur={() => markTouched('porcentajeGanancia')}
                    showCheck={shouldShowCheck('porcentajeGanancia')}
                  />
                </div>
                <div className="md:col-span-3">
                  <ProductPurchasePriceField
                    formData={formData}
                    setFormData={setFormData}
                    errors={errors}
                    isFieldVisible={isFieldVisible}
                    isFieldRequired={isFieldRequired}
                    onBlur={() => markTouched('precioCompra')}
                    showCheck={shouldShowCheck('precioCompra')}
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        <ProductActions loading={loading} onCancel={onClose} onSubmit={handleSubmitWithTouch} />

        <FieldsConfigPanel
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          fieldsConfig={fieldsConfig}
          onToggleVisibility={toggleFieldVisibility}
          onToggleRequired={toggleFieldRequired}
          onReset={resetToDefault}
        />

        {showCategoryModal && (
          <CategoryModal
            isOpen={showCategoryModal}
            onClose={() => setShowCategoryModal(false)}
            colors={[
              { name: 'Rojo', value: '#ef4444' },
              { name: 'Azul', value: '#3b82f6' },
              { name: 'Verde', value: '#10b981' },
              { name: 'Amarillo', value: '#f59e0b' },
              { name: 'Purple', value: '#8b5cf6' },
              { name: 'Rosa', value: '#ec4899' },
              { name: 'Gris', value: '#6b7280' },
              { name: 'Naranja', value: '#f97316' }
            ]}
            onSave={(data) => {
              addCategory(data.nombre, data.descripcion, data.color);
              setFormData(prev => ({ ...prev, categoria: data.nombre }));
              setShowCategoryModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ProductModal;
