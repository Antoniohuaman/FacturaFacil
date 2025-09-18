import type { Product, ProductFormData, Category } from '../models/types';
// src/features/catalogo-articulos/components/ProductModal.tsx

import React, { useState, useEffect } from 'react';

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
  type FormError = {
    [K in keyof ProductFormData]?: string;
  };

  const [formData, setFormData] = useState<Omit<ProductFormData, 'unidad'> & { unidad: Product['unidad'] }>({
    nombre: '',
    codigo: '',
    precio: 0,
    unidad: 'UNIDAD',
    categoria: '',
    cantidad: 0,
    conImpuestos: true,
    impuesto: 'IGV (18.00%)',
    descripcion: ''
  });
  
  const [errors, setErrors] = useState<FormError>({});
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    if (product) {
      setFormData({
        nombre: product.nombre,
        codigo: product.codigo,
        precio: product.precio,
        unidad: product.unidad,
        categoria: product.categoria,
        cantidad: product.cantidad,
        conImpuestos: product.conImpuestos,
        impuesto: product.impuesto || 'IGV (18.00%)',
        descripcion: product.descripcion || ''
      });
      setImagePreview(product.imagen || '');
    } else {
      setFormData({
        nombre: '',
        codigo: '',
        precio: 0,
        unidad: 'UNIDAD',
        categoria: categories[0]?.nombre || '',
        cantidad: 0,
        conImpuestos: true,
        impuesto: 'IGV (18.00%)',
        descripcion: ''
      });
      setImagePreview('');
    }
    setErrors({});
    setShowAdvanced(false);
  }, [product, isOpen, categories]);

  const validateForm = (): boolean => {
  const newErrors: FormError = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }

    if (!formData.codigo.trim()) {
      newErrors.codigo = 'El código es requerido';
    }

    if (formData.precio <= 0) {
      newErrors.precio = 'El precio debe ser mayor a 0';
    }

    if (!formData.categoria) {
      newErrors.categoria = 'La categoría es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simular API call
      
      onSave({
        ...formData,
        imagen: imagePreview
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative inline-block w-full max-w-2xl my-8 overflow-hidden rounded-lg bg-white text-left align-middle shadow-xl transition-all transform">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {product ? 'Editar producto' : 'Nuevo producto / servicio'}
            </h3>
            <button
              onClick={onClose}
              className="rounded-md text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Nombre */}
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                className={`
                  w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors
                  ${errors.nombre ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                `}
                placeholder="Ingresa el nombre del producto"
              />
              {errors.nombre && <p className="text-red-600 text-xs mt-1">{errors.nombre}</p>}
            </div>

            {/* Código */}
            <div>
              <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 mb-1">
                Código <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                className={`
                  w-full rounded-md border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors
                  ${errors.codigo ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                `}
                placeholder="Código único del producto"
              />
              {errors.codigo && <p className="text-red-600 text-xs mt-1">{errors.codigo}</p>}
            </div>

            {/* Precio y Con Impuestos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="precio" className="block text-sm font-medium text-gray-700 mb-1">
                  Precio de venta <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">S/</span>
                  </div>
                  <input
                    type="number"
                    id="precio"
                    step="0.01"
                    min="0"
                    value={formData.precio}
                    onChange={(e) => setFormData(prev => ({ ...prev, precio: parseFloat(e.target.value) || 0 }))}
                    className={`
                      w-full pl-10 pr-3 py-2 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors
                      ${errors.precio ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                    `}
                    placeholder="0.00"
                  />
                </div>
                {errors.precio && <p className="text-red-600 text-xs mt-1">{errors.precio}</p>}
              </div>
              
              <div className="flex items-end">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.conImpuestos}
                    onChange={(e) => setFormData(prev => ({ ...prev, conImpuestos: e.target.checked }))}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Con impuestos</span>
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </label>
              </div>
            </div>

            {/* Impuesto */}
            {formData.conImpuestos && (
              <div>
                <label htmlFor="impuesto" className="block text-sm font-medium text-gray-700 mb-1">
                  Impuesto <span className="text-red-500">*</span>
                </label>
                <select
                  id="impuesto"
                  value={formData.impuesto}
                  onChange={(e) => setFormData(prev => ({ ...prev, impuesto: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="IGV (18.00%)">IGV (18.00%)</option>
                  <option value="ISC (10.00%)">ISC (10.00%)</option>
                  <option value="IVAP (2.00%)">IVAP (2.00%)</option>
                </select>
              </div>
            )}

            {/* Unidad */}
            <div>
              <label htmlFor="unidad" className="block text-sm font-medium text-gray-700 mb-1">
                Unidad <span className="text-red-500">*</span>
              </label>
              <select
                id="unidad"
                value={formData.unidad}
                onChange={(e) => setFormData(prev => ({ ...prev, unidad: e.target.value as 'DOCENA' | 'UNIDAD' }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="UNIDAD">UNIDAD</option>
                <option value="DOCENA">(DZN) DOCENA</option>
              </select>
              <button
                type="button"
                className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
              >
                Buscar unidad
              </button>
            </div>

            {/* Categoría */}
            <div>
              <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <div className="flex space-x-2">
                <select
                  id="categoria"
                  value={formData.categoria}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                  className={`
                    flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors
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
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                >
                  Crear categoría
                </button>
              </div>
              {errors.categoria && <p className="text-red-600 text-xs mt-1">{errors.categoria}</p>}
            </div>

            {/* Cantidad */}
            <div>
              <label htmlFor="cantidad" className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad inicial
              </label>
              <input
                type="number"
                id="cantidad"
                value={formData.cantidad}
                onChange={(e) => setFormData(prev => ({ ...prev, cantidad: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="0"
              />
            </div>

            {/* Imagen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Imagen
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-16 w-16 object-cover rounded-lg border-2 border-gray-200"
                    />
                  ) : (
                    <div className="h-16 w-16 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Subir imagen
                  </label>
                </div>
              </div>
            </div>

            {/* Opciones avanzadas */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-sm text-red-600 hover:text-red-700 transition-colors"
              >
                <svg 
                  className={`mr-1 h-4 w-4 transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Opciones avanzadas
              </button>
              
              {showAdvanced && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      id="descripcion"
                      rows={3}
                      value={formData.descripcion}
                      onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Descripción opcional del producto..."
                    />
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </div>
              ) : (
                'Guardar'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;