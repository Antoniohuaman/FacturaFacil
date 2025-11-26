import React, { useMemo } from 'react';
import { Sliders, X } from 'lucide-react';
import CategoryModal from './CategoryModal';
import { FieldsConfigPanel } from './FieldsConfigPanel';
import { ProductTypeSelector } from './product-modal/ProductTypeSelector';
import { ProductBasicsSection } from './product-modal/ProductBasicsSection';
import { ProductPricingSection } from './product-modal/ProductPricingSection';
import { ProductUnitsSection } from './product-modal/ProductUnitsSection';
import { ProductAdditionalUnitsTable } from './product-modal/ProductAdditionalUnitsTable';
import { ProductAvailabilitySection } from './product-modal/ProductAvailabilitySection';
import { ProductDescriptionSection } from './product-modal/ProductDescriptionSection';
import { ProductImageUpload } from './product-modal/ProductImageUpload';
import { ProductFinancialSection } from './product-modal/ProductFinancialSection';
import { ProductCodesSection } from './product-modal/ProductCodesSection';
import { ProductActions } from './product-modal/ProductActions';
import { useProductStore } from '../hooks/useProductStore';
import { useProductFieldsConfig } from '../hooks/useProductFieldsConfig';
import { useProductForm } from '../hooks/useProductForm';
import type { Product } from '../models/types';
import { useConfigurationContext, type Category } from '../../configuracion-sistema/context/ConfigurationContext';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Omit<Product, 'id' | 'fechaCreacion' | 'fechaActualizacion'>) => void;
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

  const establishments = useMemo(
    () => configState.establishments.filter(est => est.isActive),
    [configState.establishments]
  );

  const availableUnits = useMemo(
    () => configState.units.filter(unit => unit.isActive && unit.isVisible !== false),
    [configState.units]
  );

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
    precioInput,
    setPrecioInput,
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
    onClose
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-[1120px] max-h-[80vh] flex flex-col bg-white rounded-lg shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white rounded-t-lg">
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
          <ProductTypeSelector productType={productType} onChange={setProductType} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 space-y-4">
              <ProductBasicsSection
                formData={formData}
                setFormData={setFormData}
                errors={errors}
                isFieldVisible={isFieldVisible}
                isFieldRequired={isFieldRequired}
                categories={globalCategories}
                onOpenCategoryModal={() => setShowCategoryModal(true)}
              />

              <ProductPricingSection
                formData={formData}
                setFormData={setFormData}
                errors={errors}
                precioInput={precioInput}
                setPrecioInput={setPrecioInput}
                isFieldVisible={isFieldVisible}
                isFieldRequired={isFieldRequired}
              />

              <ProductUnitsSection
                formData={formData}
                errors={errors}
                baseUnitOptions={baseUnitOptions}
                availableUnits={availableUnits}
                isUsingFallbackUnits={isUsingFallbackUnits}
                handleMeasureTypeChange={handleMeasureTypeChange}
                handleBaseUnitChange={handleBaseUnitChange}
              />

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
              />

              <ProductAvailabilitySection
                formData={formData}
                setFormData={setFormData}
                establishments={establishments}
                errors={errors}
              />

              <ProductDescriptionSection
                formData={formData}
                setFormData={setFormData}
                errors={errors}
                isFieldVisible={isFieldVisible}
                isFieldRequired={isFieldRequired}
                isDescriptionExpanded={isDescriptionExpanded}
                onToggleDescription={() => setIsDescriptionExpanded(prev => !prev)}
              />
            </div>

            <div className="lg:col-span-6 space-y-4">
              <ProductImageUpload
                imagePreview={imagePreview}
                onUpload={handleImageUpload}
                isFieldVisible={isFieldVisible}
                isFieldRequired={isFieldRequired}
              />

              <ProductFinancialSection
                formData={formData}
                setFormData={setFormData}
                errors={errors}
                isFieldVisible={isFieldVisible}
                isFieldRequired={isFieldRequired}
              />

              <ProductCodesSection
                formData={formData}
                setFormData={setFormData}
                errors={errors}
                isFieldVisible={isFieldVisible}
                isFieldRequired={isFieldRequired}
              />
            </div>
          </div>
        </form>

        <ProductActions loading={loading} onCancel={onClose} onSubmit={handleSubmit} />

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
