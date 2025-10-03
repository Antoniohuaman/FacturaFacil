import CategoryModal from './CategoryModal';
import { useProductStore } from '../hooks/useProductStore';
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
  // Usar el store global para agregar categoría y validar códigos
  const { addCategory, categories: globalCategories, allProducts } = useProductStore();
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
    impuesto: 'IGV (18.00%)',
    descripcion: '',
    // Campos avanzados
    alias: '',
    precioCompra: 0,
    porcentajeGanancia: 0,
    codigoBarras: '',
    codigoFabrica: '',
    codigoSunat: '',
    descuentoProducto: 0,
    marca: '',
    modelo: '',
    peso: 0,
    tipoExistencia: 'MERCADERIAS'
  });
  
  const [errors, setErrors] = useState<FormError>({});
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [trabajaConStock, setTrabajaConStock] = useState(true); // Nuevo estado para control de stock
  // Estado para el input de precio (permite borrar y escribir libremente)
  const [precioInput, setPrecioInput] = useState<string>('0.00');
  // Estado para mostrar el modal de categoría
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        nombre: product.nombre,
        codigo: product.codigo,
        precio: product.precio,
        unidad: product.unidad,
        categoria: product.categoria,
        cantidad: product.cantidad,
        impuesto: product.impuesto || 'IGV (18.00%)',
        descripcion: product.descripcion || '',
        // Campos avanzados
        alias: product.alias || '',
        precioCompra: product.precioCompra || 0,
        porcentajeGanancia: product.porcentajeGanancia || 0,
        codigoBarras: product.codigoBarras || '',
        codigoFabrica: product.codigoFabrica || '',
        codigoSunat: product.codigoSunat || '',
        descuentoProducto: product.descuentoProducto || 0,
        marca: product.marca || '',
        modelo: product.modelo || '',
        peso: product.peso || 0,
        tipoExistencia: product.tipoExistencia || 'MERCADERIAS'
      });
      setPrecioInput(product.precio.toFixed(2));
      setImagePreview(product.imagen || '');
    } else {
      setFormData({
        nombre: '',
        codigo: '',
        precio: 0,
        unidad: 'UNIDAD',
        categoria: categories[0]?.nombre || '',
        cantidad: 0,
        impuesto: 'IGV (18.00%)',
        descripcion: '',
        // Campos avanzados
        alias: '',
        precioCompra: 0,
        porcentajeGanancia: 0,
        codigoBarras: '',
        codigoFabrica: '',
        codigoSunat: '',
        descuentoProducto: 0,
        marca: '',
        modelo: '',
        peso: 0,
        tipoExistencia: 'MERCADERIAS'
      });
      setPrecioInput('0.00');
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
    } else {
      // Validar código duplicado
      const codigoDuplicado = allProducts.find(
        p => p.codigo.toLowerCase() === formData.codigo.trim().toLowerCase() &&
        p.id !== product?.id // Excluir el producto actual si está editando
      );
      if (codigoDuplicado) {
        newErrors.codigo = `El código "${formData.codigo}" ya existe en el producto "${codigoDuplicado.nombre}"`;
      }
    }

    // Validar precio no negativo
    if (formData.precio < 0) {
      newErrors.precio = 'El precio no puede ser negativo';
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

          {/* Toggle: Trabaja con Stock */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 cursor-pointer
                  ${trabajaConStock ? 'bg-green-500' : 'bg-gray-300'}
                `}
                onClick={() => {
                  setTrabajaConStock(!trabajaConStock);
                  // Si desactiva stock, resetear cantidad a 0
                  if (trabajaConStock) {
                    setFormData(prev => ({ ...prev, cantidad: 0 }));
                  }
                }}
                >
                  <span className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${trabajaConStock ? 'translate-x-6' : 'translate-x-1'}
                  `}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {trabajaConStock ? 'Trabaja con stock' : 'No trabaja con stock'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {trabajaConStock 
                      ? 'Se controlará el inventario de este producto'
                      : 'Este producto no requiere control de inventario'
                    }
                  </p>
                </div>
              </div>
              <div className={`
                flex items-center space-x-1 text-sm font-medium
                ${trabajaConStock ? 'text-green-600' : 'text-gray-500'}
              `}>
                {trabajaConStock ? (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Activado</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>Desactivado</span>
                  </>
                )}
              </div>
            </div>
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
              <div className="flex gap-2">
                <input
                  type="text"
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                  className={`
                    flex-1 rounded-md border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors
                    ${errors.codigo ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                  `}
                  placeholder="Código único del producto"
                />
                <button
                  type="button"
                  className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                  title="Generar código automático"
                  onClick={() => {
                    const randomSku = `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                    setFormData(prev => ({ ...prev, codigo: randomSku }));
                  }}
                >
                  Generar
                </button>
              </div>
              {errors.codigo && <p className="text-red-600 text-xs mt-1">{errors.codigo}</p>}
            </div>

            {/* Precio */}
            <div>
              <label htmlFor="precio" className="block text-sm font-medium text-gray-700 mb-1">
                Precio de venta
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">S/</span>
                </div>
                <input
                  type="number"
                  id="precio"
                  step="1"
                  min="0"
                  value={precioInput}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    setPrecioInput(inputValue);
                    const numericValue = parseFloat(inputValue) || 0;
                    setFormData(prev => ({ ...prev, precio: numericValue }));
                  }}
                  className={`
                    w-full pl-10 pr-3 py-2 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors
                    ${errors.precio ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                  `}
                  placeholder="0.00"
                />
              </div>
              {/* El precio de venta es opcional, no se muestra error */}
            </div>

            {/* Impuesto */}
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
                <option value="IGV (10.00%)">IGV (10.00%)</option>
                <option value="Exonerado (0.00%)">Exonerado (0.00%)</option>
                <option value="Inafecto (0.00%)">Inafecto (0.00%)</option>
              </select>
            </div>

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
                <option value="UNIDAD">(NIU)UNIDAD</option>
                <option value="DOCENA">(DZN) DOCENA</option>
                <option value="CENTIMOS">(CMT) CENTIMOS</option>
                <option value="KILOGRAMO">(KGM) KILOGRAMO</option>
              </select>
              <button
                type="button"
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
              >
              Nueva unidad de medida
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
                  {globalCategories.map(cat => (
                    <option key={cat.id} value={cat.nombre}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
                  onClick={() => setShowCategoryModal(true)}
                >
                  Crear categoría
                </button>
              </div>
              {errors.categoria && <p className="text-red-600 text-xs mt-1">{errors.categoria}</p>}
            </div>

            {/* Cantidad inicial - Solo si trabaja con stock */}
            {trabajaConStock && (
              <div className="border-l-4 border-green-500 bg-green-50 pl-4 pr-4 py-3 rounded-r-md">
                <label htmlFor="cantidad" className="flex items-center text-sm font-medium text-gray-900 mb-2">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  Cantidad inicial en inventario
                </label>
                <input
                  type="number"
                  id="cantidad"
                  value={formData.cantidad}
                  onChange={(e) => setFormData(prev => ({ ...prev, cantidad: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded-md border border-green-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ingrese la cantidad inicial en stock"
                  min="0"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Esta será la cantidad inicial del producto en tu inventario
                </p>
              </div>
            )}

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
                className="flex items-center text-sm text-blue-600 hover:text-blue-700 transition-colors"
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
                <div className="mt-4 p-6 bg-gray-50 rounded-lg space-y-4 border border-gray-200">
                  {/* Descripción */}
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
                      placeholder="Descripción detallada del producto..."
                    />
                  </div>

                  {/* Alias del producto */}
                  <div>
                    <label htmlFor="alias" className="block text-sm font-medium text-gray-700 mb-1">
                      Alias del producto
                    </label>
                    <input
                      type="text"
                      id="alias"
                      value={formData.alias}
                      onChange={(e) => setFormData(prev => ({ ...prev, alias: e.target.value }))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Nombre alternativo del producto"
                    />
                  </div>

                  {/* Grid para Precio de Compra y Porcentaje de Ganancia */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="precioCompra" className="block text-sm font-medium text-gray-700 mb-1">
                        Precio inicial de compra
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-sm">S/</span>
                        </div>
                        <input
                          type="number"
                          id="precioCompra"
                          step="0.01"
                          min="0"
                          value={formData.precioCompra}
                          onChange={(e) => setFormData(prev => ({ ...prev, precioCompra: parseFloat(e.target.value) || 0 }))}
                          className="w-full pl-10 pr-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="porcentajeGanancia" className="block text-sm font-medium text-gray-700 mb-1">
                        Porcentaje de ganancia
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          id="porcentajeGanancia"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.porcentajeGanancia}
                          onChange={(e) => setFormData(prev => ({ ...prev, porcentajeGanancia: parseFloat(e.target.value) || 0 }))}
                          className="w-full pr-10 pl-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="0.00"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-sm">%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Descuento del producto */}
                  <div>
                    <label htmlFor="descuentoProducto" className="block text-sm font-medium text-gray-700 mb-1">
                      Descuento del producto
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="descuentoProducto"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.descuentoProducto}
                        onChange={(e) => setFormData(prev => ({ ...prev, descuentoProducto: parseFloat(e.target.value) || 0 }))}
                        className="w-full pr-10 pl-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="0.00"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Códigos */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-sm font-semibold text-gray-900 border-b pb-2">Códigos de identificación</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="codigoBarras" className="block text-sm font-medium text-gray-700 mb-1">
                          Código de barras
                        </label>
                        <input
                          type="text"
                          id="codigoBarras"
                          value={formData.codigoBarras}
                          onChange={(e) => setFormData(prev => ({ ...prev, codigoBarras: e.target.value }))}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="EAN-13, UPC, etc."
                        />
                      </div>

                      <div>
                        <label htmlFor="codigoFabrica" className="block text-sm font-medium text-gray-700 mb-1">
                          Código de fábrica
                        </label>
                        <input
                          type="text"
                          id="codigoFabrica"
                          value={formData.codigoFabrica}
                          onChange={(e) => setFormData(prev => ({ ...prev, codigoFabrica: e.target.value }))}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="Código del fabricante"
                        />
                      </div>

                      <div>
                        <label htmlFor="codigoSunat" className="block text-sm font-medium text-gray-700 mb-1">
                          Código SUNAT
                        </label>
                        <input
                          type="text"
                          id="codigoSunat"
                          value={formData.codigoSunat}
                          onChange={(e) => setFormData(prev => ({ ...prev, codigoSunat: e.target.value }))}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="Código tributario"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Marca y Modelo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label htmlFor="marca" className="block text-sm font-medium text-gray-700 mb-1">
                        Marca
                      </label>
                      <input
                        type="text"
                        id="marca"
                        value={formData.marca}
                        onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Marca del producto"
                      />
                    </div>

                    <div>
                      <label htmlFor="modelo" className="block text-sm font-medium text-gray-700 mb-1">
                        Modelo
                      </label>
                      <input
                        type="text"
                        id="modelo"
                        value={formData.modelo}
                        onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Modelo del producto"
                      />
                    </div>
                  </div>

                  {/* Peso */}
                  <div>
                    <label htmlFor="peso" className="block text-sm font-medium text-gray-700 mb-1">
                      Peso (KGM)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="peso"
                        step="0.001"
                        min="0"
                        value={formData.peso}
                        onChange={(e) => setFormData(prev => ({ ...prev, peso: parseFloat(e.target.value) || 0 }))}
                        className="w-full pr-10 pl-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="0.000"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">KG</span>
                      </div>
                    </div>
                  </div>

                  {/* Tipo de Existencia */}
                  <div>
                    <label htmlFor="tipoExistencia" className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de existencia
                    </label>
                    <select
                      id="tipoExistencia"
                      value={formData.tipoExistencia}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipoExistencia: e.target.value as Product['tipoExistencia'] }))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="MERCADERIAS">Mercaderías</option>
                      <option value="PRODUCTOS_TERMINADOS">Productos Terminados</option>
                      <option value="SERVICIOS">Servicios</option>
                      <option value="MATERIAS_PRIMAS">Materias Primas</option>
                      <option value="ENVASES">Envases</option>
                      <option value="MATERIALES_AUXILIARES">Materiales Auxiliares</option>
                      <option value="SUMINISTROS">Suministros</option>
                      <option value="REPUESTOS">Repuestos</option>
                      <option value="EMBALAJES">Embalajes</option>
                      <option value="OTROS">Otros</option>
                    </select>
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
              className="px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: '#1478D4' }}
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
      {/* Modal de categoría */}
      {showCategoryModal && (
        <CategoryModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          colors={[{ name: 'Rojo', value: '#ef4444' }, { name: 'Azul', value: '#3b82f6' }, { name: 'Verde', value: '#10b981' }, { name: 'Amarillo', value: '#f59e0b' }, { name: 'Purple', value: '#8b5cf6' }, { name: 'Rosa', value: '#ec4899' }, { name: 'Gris', value: '#6b7280' }, { name: 'Naranja', value: '#f97316' }]}
          onSave={(data) => {
            addCategory(data.nombre, data.descripcion, data.color);
            setFormData(prev => ({ ...prev, categoria: data.nombre }));
            setShowCategoryModal(false);
          }}
        />
      )}
    </div>
  );
};

export default ProductModal;