import React, { useState } from 'react';
import { X, Save, Package } from 'lucide-react';
import type { QuickProductModalProps, Product } from '../../models/comprobante.types';
import { PRODUCT_CATEGORIES, FORM_VALIDATION } from '../../models/constants';
import { useCurrency } from '../../shared/form-core/hooks/useCurrency';

export const QuickProductModal: React.FC<QuickProductModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
  currency = 'PEN'
}) => {
  const { formatPrice } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    price: '',
    category: '',
    description: '',
    stock: '0'
  });
  
  // Estado de validación
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpiar error del campo al escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar nombre
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    } else if (formData.name.length < FORM_VALIDATION.PRODUCT_NAME_MIN_LENGTH) {
      newErrors.name = `Mínimo ${FORM_VALIDATION.PRODUCT_NAME_MIN_LENGTH} caracteres`;
    } else if (formData.name.length > FORM_VALIDATION.PRODUCT_NAME_MAX_LENGTH) {
      newErrors.name = `Máximo ${FORM_VALIDATION.PRODUCT_NAME_MAX_LENGTH} caracteres`;
    }

    // Validar código
    if (!formData.code.trim()) {
      newErrors.code = 'El código es obligatorio';
    } else if (formData.code.length < FORM_VALIDATION.PRODUCT_CODE_MIN_LENGTH) {
      newErrors.code = `Mínimo ${FORM_VALIDATION.PRODUCT_CODE_MIN_LENGTH} caracteres`;
    }

    // Validar precio
    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price)) {
      newErrors.price = 'El precio es obligatorio';
    } else if (price < FORM_VALIDATION.PRICE_MIN) {
      newErrors.price = `Precio mínimo: ${formatPrice(FORM_VALIDATION.PRICE_MIN, currency)}`;
    } else if (price > FORM_VALIDATION.PRICE_MAX) {
      newErrors.price = `Precio máximo: ${formatPrice(FORM_VALIDATION.PRICE_MAX, currency)}`;
    }

    // Validar categoría
    if (!formData.category) {
      newErrors.category = 'Selecciona una categoría';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      // Simular creación del producto
      await new Promise(resolve => setTimeout(resolve, 800));

      const newProduct: Product = {
        id: Date.now().toString(),
        code: formData.code.trim(),
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
        description: formData.description.trim(),
        stock: parseInt(formData.stock) || 0
      };

      onProductCreated(newProduct);
      handleClose();
    } catch (error) {
      console.error('Error creando producto:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      code: '',
      price: '',
      category: '',
      description: '',
      stock: '0'
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Nuevo Producto</h2>
                <p className="text-sm text-gray-600">Crear producto rápidamente</p>
              </div>
            </div>
            
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Nombre del producto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del producto *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ej: Lapicero BIC azul"
                disabled={isSubmitting}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            {/* Código del producto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código del producto *
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.code ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ej: 00123456"
                disabled={isSubmitting}
              />
              {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code}</p>}
            </div>

            {/* Precio y Categoría */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio *
                </label>
                <input
                  type="number"
                  name="price"
                  value={Number(formData.price).toFixed(2)}
                  onChange={handleInputChange}
                  step="0.10"
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    errors.price ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                  disabled={isSubmitting}
                />
                {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    errors.category ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                >
                  <option value="">Seleccionar</option>
                  {PRODUCT_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
                {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
              </div>
            </div>

            {/* Stock inicial */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock inicial
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={isSubmitting}
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción (opcional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                placeholder="Descripción detallada del producto"
                disabled={isSubmitting}
              />
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Crear Producto
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};