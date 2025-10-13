import CategoryModal from './CategoryModal';
import { FieldsConfigPanel } from './FieldsConfigPanel';
import { useProductStore } from '../hooks/useProductStore';
import { useProductFieldsConfig } from '../hooks/useProductFieldsConfig';
import type { Product, ProductFormData, Category } from '../models/types';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
// src/features/catalogo-articulos/components/ProductModal.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Settings2 } from 'lucide-react';

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
  
  // Acceder a los establecimientos y unidades desde el contexto de configuración
  const { state: configState } = useConfigurationContext();
  const establishments = useMemo(
    () => configState.establishments.filter(e => e.isActive),
    [configState.establishments]
  );

  // ✅ Obtener unidades de medida desde configuración (activas y visibles) - Memoizado
  const availableUnits = useMemo(
    () => configState.units.filter(u => u.isActive && u.isVisible !== false),
    [configState.units]
  );

  // ✅ Hook para gestionar configuración de campos
  const {
    fieldsConfig,
    isPanelOpen,
    setIsPanelOpen,
    toggleFieldVisibility,
    toggleFieldRequired,
    resetToDefault,
    isFieldVisible,
    isFieldRequired,
  } = useProductFieldsConfig();

  type FormError = {
    [K in keyof ProductFormData]?: string;
  };

  // ✅ Determinar unidad por defecto: favorita, NIU, o la primera disponible - Memoizado
  const getDefaultUnit = useCallback(() => {
    if (availableUnits.length === 0) return 'NIU';
    const favoriteUnit = availableUnits.find(u => u.isFavorite);
    if (favoriteUnit) return favoriteUnit.code;
    const niuUnit = availableUnits.find(u => u.code === 'NIU');
    if (niuUnit) return niuUnit.code;
    return availableUnits[0].code;
  }, [availableUnits]);

  const [formData, setFormData] = useState<Omit<ProductFormData, 'unidad'> & { unidad: Product['unidad'] }>(() => ({
    nombre: '',
    codigo: '',
    precio: 0,
    unidad: getDefaultUnit() as Product['unidad'],
    categoria: '',
    cantidad: 0,
    impuesto: 'IGV (18.00%)',
    descripcion: '',
    // Asignación de establecimientos
    establecimientoIds: [],
    disponibleEnTodos: false,
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
  }));
  
  const [errors, setErrors] = useState<FormError>({});
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  // ✅ Estado para control de stock - POR DEFECTO: ACTIVO (true) porque inicia como BIEN/MERCADERIAS
  const [trabajaConStock, setTrabajaConStock] = useState(true);
  // Estado para el input de precio (permite borrar y escribir libremente)
  const [precioInput, setPrecioInput] = useState<string>('0.00');
  // Estado para mostrar el modal de categoría
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    if (product) {
      // ✅ Al editar: determinar si trabaja con stock según tipoExistencia
      const tieneStock = product.tipoExistencia !== 'SERVICIOS';
      setTrabajaConStock(tieneStock);
      
      setFormData({
        nombre: product.nombre,
        codigo: product.codigo,
        precio: product.precio,
        unidad: product.unidad,
        categoria: product.categoria,
        cantidad: product.cantidad,
        impuesto: product.impuesto || 'IGV (18.00%)',
        descripcion: product.descripcion || '',
        // Asignación de establecimientos
        establecimientoIds: product.establecimientoIds || [],
        disponibleEnTodos: product.disponibleEnTodos || false,
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
      // ✅ Al crear nuevo: BIEN por defecto (con stock)
      setTrabajaConStock(true);
      
      setFormData({
        nombre: '',
        codigo: '',
        precio: 0,
        unidad: getDefaultUnit() as Product['unidad'], // ✅ Usar unidad por defecto del sistema
        categoria: categories[0]?.nombre || '',
        cantidad: 0,
        impuesto: 'IGV (18.00%)',
        descripcion: '',
        // Asignación de establecimientos - Por defecto disponible en todos
        establecimientoIds: [],
        disponibleEnTodos: establishments.length > 0, // Si hay establecimientos, activar por defecto
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
        tipoExistencia: 'MERCADERIAS' // ✅ Por defecto BIEN/MERCADERIAS (con stock)
      });
      setPrecioInput('0.00');
      setImagePreview('');
    }
    setErrors({});
  }, [product, isOpen, categories, establishments, availableUnits, getDefaultUnit]);

  const validateForm = (): boolean => {
    const newErrors: FormError = {};

    // ========== VALIDACIONES DE CAMPOS OBLIGATORIOS DEL SISTEMA ==========
    
    // 1. Nombre (siempre obligatorio)
    if (isFieldVisible('nombre') && !formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }

    // 2. Código (siempre obligatorio + validar duplicados)
    if (isFieldVisible('codigo')) {
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
    }

    // 3. Impuesto (siempre obligatorio)
    if (isFieldVisible('impuesto') && (!formData.impuesto || formData.impuesto.trim() === '')) {
      newErrors.impuesto = 'El impuesto es requerido';
    }

    // 4. Unidad de medida (siempre obligatorio)
    if (isFieldVisible('unidad') && (!formData.unidad || formData.unidad.trim() === '')) {
      newErrors.unidad = 'La unidad de medida es requerida';
    }

    // 5. Establecimiento (siempre obligatorio - al menos uno o todos)
    if (isFieldVisible('establecimiento') && !formData.disponibleEnTodos && formData.establecimientoIds.length === 0) {
      newErrors.establecimientoIds = 'Debes asignar al menos un establecimiento o marcar "Disponible en todos"';
    }

    // ========== VALIDACIONES DE CAMPOS PERSONALIZABLES (según configuración) ==========

    // Categoría (si está visible Y marcada como obligatoria)
    if (isFieldVisible('categoria') && isFieldRequired('categoria') && !formData.categoria) {
      newErrors.categoria = 'La categoría es requerida';
    }

    // Precio (validar no negativo + obligatorio si está configurado)
    if (isFieldVisible('precio')) {
      if (formData.precio < 0) {
        newErrors.precio = 'El precio no puede ser negativo';
      }
      if (isFieldRequired('precio') && formData.precio === 0) {
        newErrors.precio = 'El precio es requerido';
      }
    }

    // Descripción (si está marcada como obligatoria)
    if (isFieldVisible('descripcion') && isFieldRequired('descripcion') && !formData.descripcion?.trim()) {
      newErrors.descripcion = 'La descripción es requerida';
    }

    // Código de barras (si está marcado como obligatorio)
    if (isFieldVisible('codigoBarras') && isFieldRequired('codigoBarras') && !formData.codigoBarras?.trim()) {
      newErrors.codigoBarras = 'El código de barras es requerido';
    }

    // Marca (si está marcada como obligatoria)
    if (isFieldVisible('marca') && isFieldRequired('marca') && !formData.marca?.trim()) {
      newErrors.marca = 'La marca es requerida';
    }

    // Modelo (si está marcado como obligatorio)
    if (isFieldVisible('modelo') && isFieldRequired('modelo') && !formData.modelo?.trim()) {
      newErrors.modelo = 'El modelo es requerido';
    }

    // Peso (si está marcado como obligatorio)
    if (isFieldVisible('peso') && isFieldRequired('peso') && formData.peso === 0) {
      newErrors.peso = 'El peso es requerido';
    }

    // Precio de compra (si está marcado como obligatorio)
    if (isFieldVisible('precioCompra') && isFieldRequired('precioCompra') && formData.precioCompra === 0) {
      newErrors.precioCompra = 'El precio de compra es requerido';
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
            <div className="flex items-center gap-2">
              {/* Botón Configurar Campos */}
              <button
                type="button"
                onClick={() => setIsPanelOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-400 transition-colors group"
                title="Configurar campos del formulario"
              >
                <Settings2 className="w-4 h-4 group-hover:text-blue-600 transition-colors" />
                <span className="hidden sm:inline">Campos</span>
              </button>
              
              {/* Botón Cerrar */}
              <button
                type="button"
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            
            {/* ✅ Selección BIEN o SERVICIO - Versión compacta */}
            <div className="border border-gray-200 rounded-lg bg-gray-50 p-3">
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Tipo de producto <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                {/* Opción: BIEN */}
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, tipoExistencia: 'MERCADERIAS' }));
                    setTrabajaConStock(true);
                  }}
                  className={`
                    relative flex items-center justify-center gap-2 px-3 py-2 rounded-md border transition-all
                    ${formData.tipoExistencia !== 'SERVICIOS'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                    }
                  `}
                >
                  <svg 
                    className={`w-4 h-4 ${formData.tipoExistencia !== 'SERVICIOS' ? 'text-white' : 'text-blue-600'}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className="text-sm font-semibold">BIEN</span>
                  
                  {formData.tipoExistencia !== 'SERVICIOS' && (
                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>

                {/* Opción: SERVICIO */}
                <button
                  type="button"
                  onClick={() => {
                    if (formData.cantidad > 0) {
                      if (!confirm('⚠️ Los servicios no requieren inventario.\nSe perderá la cantidad ingresada. ¿Continuar?')) {
                        return;
                      }
                    }
                    setFormData(prev => ({ 
                      ...prev, 
                      tipoExistencia: 'SERVICIOS',
                      cantidad: 0 
                    }));
                    setTrabajaConStock(false);
                  }}
                  className={`
                    relative flex items-center justify-center gap-2 px-3 py-2 rounded-md border transition-all
                    ${formData.tipoExistencia === 'SERVICIOS'
                      ? 'bg-purple-600 border-purple-600 text-white shadow-md'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-purple-400'
                    }
                  `}
                >
                  <svg 
                    className={`w-4 h-4 ${formData.tipoExistencia === 'SERVICIOS' ? 'text-white' : 'text-purple-600'}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-semibold">SERVICIO</span>
                  
                  {formData.tipoExistencia === 'SERVICIOS' && (
                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Mensaje informativo compacto */}
              <div className={`
                mt-2 px-2 py-1.5 rounded text-xs
                ${formData.tipoExistencia === 'SERVICIOS'
                  ? 'bg-purple-50 text-purple-700'
                  : 'bg-blue-50 text-blue-700'
                }
              `}>
                {formData.tipoExistencia === 'SERVICIOS' ? (
                  <span>No se requiere inventario. Ideal para: consultoría, mantenimiento, instalaciones.</span>
                ) : (
                  <span>Producto físico con control de inventario automático.</span>
                )}
              </div>
            </div>

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

            {/* Precio - Campo configurable */}
            {isFieldVisible('precio') && (
              <div>
                <label htmlFor="precio" className="block text-sm font-medium text-gray-700 mb-1">
                  Precio de venta
                  {isFieldRequired('precio') && <span className="text-red-500 ml-1">*</span>}
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
                {errors.precio && <p className="text-red-600 text-xs mt-1">{errors.precio}</p>}
              </div>
            )}

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
                onChange={(e) => setFormData(prev => ({ ...prev, unidad: e.target.value as Product['unidad'] }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {availableUnits.length > 0 ? (
                  availableUnits
                    .sort((a, b) => {
                      // Mostrar favoritas primero
                      if (a.isFavorite && !b.isFavorite) return -1;
                      if (!a.isFavorite && b.isFavorite) return 1;
                      return a.name.localeCompare(b.name);
                    })
                    .map(unit => (
                      <option key={unit.id} value={unit.code}>
                        ({unit.code}) {unit.name}
                      </option>
                    ))
                ) : (
                  <option value="UNIDAD">(NIU) UNIDAD</option>
                )}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {availableUnits.length > 0
                  ? `${availableUnits.length} unidad${availableUnits.length !== 1 ? 'es' : ''} disponible${availableUnits.length !== 1 ? 's' : ''}`
                  : 'Ve a Configuración → Negocio para gestionar unidades de medida'
                }
              </p>
            </div>

            {/* Categoría - Campo configurable */}
            {isFieldVisible('categoria') && (
              <div>
                <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                  {isFieldRequired('categoria') && <span className="text-red-500 ml-1">*</span>}
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
            )}

            {/* Asignación de Establecimientos */}
            <div className="border-2 border-purple-200 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <label className="text-sm font-semibold text-gray-900">
                    Asignar a Establecimientos <span className="text-red-500">*</span>
                  </label>
                </div>
                
                {/* Toggle: Disponible en todos */}
                <button
                  type="button"
                  onClick={() => {
                    const newValue = !formData.disponibleEnTodos;
                    setFormData(prev => ({
                      ...prev,
                      disponibleEnTodos: newValue,
                      establecimientoIds: newValue ? [] : prev.establecimientoIds
                    }));
                  }}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                    ${formData.disponibleEnTodos ? 'bg-purple-600' : 'bg-gray-300'}
                  `}
                >
                  <span className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${formData.disponibleEnTodos ? 'translate-x-6' : 'translate-x-1'}
                  `} />
                </button>
              </div>

              {/* Mensaje de estado */}
              <div className={`
                flex items-center space-x-2 p-3 rounded-lg border-2
                ${formData.disponibleEnTodos 
                  ? 'bg-purple-100 border-purple-300' 
                  : 'bg-white border-purple-200'
                }
              `}>
                {formData.disponibleEnTodos ? (
                  <>
                    <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-900">
                        Disponible en todos los establecimientos
                      </p>
                      <p className="text-xs text-purple-700">
                        Este producto estará visible en los {establishments.length} establecimiento(s) activo(s)
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Asignación personalizada
                      </p>
                      <p className="text-xs text-gray-600">
                        Selecciona establecimientos específicos
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Lista de establecimientos - Solo si NO está en "Todos" */}
              {/* ✅ FIX: Padre estable (no desmontar/remontar) - usar hidden en lugar de conditional render */}
              <div className={`space-y-2 max-h-48 overflow-y-auto ${formData.disponibleEnTodos ? 'hidden' : ''}`}>
                {establishments.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-sm font-medium">No hay establecimientos activos</p>
                    <p className="text-xs mt-1">Crea un establecimiento en Configuración</p>
                  </div>
                ) : (
                  establishments.map((est) => {
                    const isSelected = formData.establecimientoIds.includes(est.id);
                    return (
                      <label
                        key={est.id}
                        className={`
                          flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                          ${isSelected 
                            ? 'bg-purple-100 border-purple-400 shadow-sm' 
                            : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newIds = e.target.checked
                              ? [...formData.establecimientoIds, est.id]
                              : formData.establecimientoIds.filter(id => id !== est.id);
                            setFormData(prev => ({ ...prev, establecimientoIds: newIds }));
                          }}
                          className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {est.name}
                            </p>
                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-200 text-purple-800 rounded-full">
                              {est.code}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 truncate mt-0.5">
                            {est.address} - {est.district}
                          </p>
                        </div>
                        {isSelected && (
                          <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </label>
                    );
                  })
                )}
              </div>

              {/* Contador de selección - También usar hidden en vez de conditional */}
              <div className={`flex items-center justify-between pt-2 border-t border-purple-200 ${formData.disponibleEnTodos || establishments.length === 0 ? 'hidden' : ''}`}>
                <p className="text-xs text-gray-600">
                  {formData.establecimientoIds.length} de {establishments.length} establecimiento(s) seleccionado(s)
                </p>
                {formData.establecimientoIds.length > 0 && formData.establecimientoIds.length < establishments.length && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        establecimientoIds: establishments.map(e => e.id)
                      }));
                    }}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium underline"
                  >
                    Seleccionar todos
                  </button>
                )}
                {formData.establecimientoIds.length === establishments.length && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, establecimientoIds: [] }));
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-medium underline"
                  >
                    Quitar todos
                  </button>
                )}
              </div>

              {/* Error de validación */}
              {errors.establecimientoIds && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-300 rounded-lg">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-red-700 font-medium">
                    {errors.establecimientoIds}
                  </p>
                </div>
              )}
            </div>

            {/* Cantidad inicial - Solo si trabaja con stock */}
            {trabajaConStock && isFieldVisible('cantidad') && (
              <div className="border-l-4 border-green-500 bg-green-50 pl-4 pr-4 py-3 rounded-r-md">
                <label htmlFor="cantidad" className="flex items-center text-sm font-medium text-gray-900 mb-2">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  Cantidad inicial en inventario
                  {isFieldRequired('cantidad') && <span className="text-red-500 ml-1">*</span>}
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
                {errors.cantidad && <p className="text-red-600 text-xs mt-1">{errors.cantidad}</p>}
              </div>
            )}

            {/* Imagen */}
            {isFieldVisible('imagen') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imagen
                  {isFieldRequired('imagen') && <span className="text-red-500 ml-1">*</span>}
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
            )}

            {/* Campos avanzados configurables */}
            <div className="space-y-4">
              {/* Descripción */}
              {isFieldVisible('descripcion') && (
                    <div>
                      <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción
                        {isFieldRequired('descripcion') && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <textarea
                        id="descripcion"
                        rows={3}
                        value={formData.descripcion}
                        onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Descripción detallada del producto..."
                      />
                      {errors.descripcion && <p className="text-red-600 text-xs mt-1">{errors.descripcion}</p>}
                    </div>
                  )}

                  {/* Alias del producto */}
                  {isFieldVisible('alias') && (
                    <div>
                      <label htmlFor="alias" className="block text-sm font-medium text-gray-700 mb-1">
                        Alias del producto
                        {isFieldRequired('alias') && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type="text"
                        id="alias"
                        value={formData.alias}
                        onChange={(e) => setFormData(prev => ({ ...prev, alias: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Nombre alternativo del producto"
                      />
                      {errors.alias && <p className="text-red-600 text-xs mt-1">{errors.alias}</p>}
                    </div>
                  )}

                  {/* Grid para Precio de Compra y Porcentaje de Ganancia */}
                  {(isFieldVisible('precioCompra') || isFieldVisible('porcentajeGanancia')) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {isFieldVisible('precioCompra') && (
                        <div>
                          <label htmlFor="precioCompra" className="block text-sm font-medium text-gray-700 mb-1">
                            Precio inicial de compra
                            {isFieldRequired('precioCompra') && <span className="text-red-500 ml-1">*</span>}
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
                          {errors.precioCompra && <p className="text-red-600 text-xs mt-1">{errors.precioCompra}</p>}
                        </div>
                      )}

                      {isFieldVisible('porcentajeGanancia') && (
                        <div>
                          <label htmlFor="porcentajeGanancia" className="block text-sm font-medium text-gray-700 mb-1">
                            Porcentaje de ganancia
                            {isFieldRequired('porcentajeGanancia') && <span className="text-red-500 ml-1">*</span>}
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
                          {errors.porcentajeGanancia && <p className="text-red-600 text-xs mt-1">{errors.porcentajeGanancia}</p>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Descuento del producto */}
                  {isFieldVisible('descuentoProducto') && (
                    <div>
                      <label htmlFor="descuentoProducto" className="block text-sm font-medium text-gray-700 mb-1">
                        Descuento del producto
                        {isFieldRequired('descuentoProducto') && <span className="text-red-500 ml-1">*</span>}
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
                      {errors.descuentoProducto && <p className="text-red-600 text-xs mt-1">{errors.descuentoProducto}</p>}
                    </div>
                  )}

                  {/* Códigos */}
                  {(isFieldVisible('codigoBarras') || isFieldVisible('codigoFabrica') || isFieldVisible('codigoSunat')) && (
                    <div className="space-y-4 pt-2">
                      <h4 className="text-sm font-semibold text-gray-900 border-b pb-2">Códigos de identificación</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isFieldVisible('codigoBarras') && (
                          <div>
                            <label htmlFor="codigoBarras" className="block text-sm font-medium text-gray-700 mb-1">
                              Código de barras
                              {isFieldRequired('codigoBarras') && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <input
                              type="text"
                              id="codigoBarras"
                              value={formData.codigoBarras}
                              onChange={(e) => setFormData(prev => ({ ...prev, codigoBarras: e.target.value }))}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                              placeholder="EAN-13, UPC, etc."
                            />
                            {errors.codigoBarras && <p className="text-red-600 text-xs mt-1">{errors.codigoBarras}</p>}
                          </div>
                        )}

                        {isFieldVisible('codigoFabrica') && (
                          <div>
                            <label htmlFor="codigoFabrica" className="block text-sm font-medium text-gray-700 mb-1">
                              Código de fábrica
                              {isFieldRequired('codigoFabrica') && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <input
                              type="text"
                              id="codigoFabrica"
                              value={formData.codigoFabrica}
                              onChange={(e) => setFormData(prev => ({ ...prev, codigoFabrica: e.target.value }))}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                              placeholder="Código del fabricante"
                            />
                            {errors.codigoFabrica && <p className="text-red-600 text-xs mt-1">{errors.codigoFabrica}</p>}
                          </div>
                        )}

                        {isFieldVisible('codigoSunat') && (
                          <div>
                            <label htmlFor="codigoSunat" className="block text-sm font-medium text-gray-700 mb-1">
                              Código SUNAT
                              {isFieldRequired('codigoSunat') && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <input
                              type="text"
                              id="codigoSunat"
                              value={formData.codigoSunat}
                              onChange={(e) => setFormData(prev => ({ ...prev, codigoSunat: e.target.value }))}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                              placeholder="Código tributario"
                            />
                            {errors.codigoSunat && <p className="text-red-600 text-xs mt-1">{errors.codigoSunat}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Marca y Modelo */}
                  {(isFieldVisible('marca') || isFieldVisible('modelo')) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {isFieldVisible('marca') && (
                        <div>
                          <label htmlFor="marca" className="block text-sm font-medium text-gray-700 mb-1">
                            Marca
                            {isFieldRequired('marca') && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <input
                            type="text"
                            id="marca"
                            value={formData.marca}
                            onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="Marca del producto"
                          />
                          {errors.marca && <p className="text-red-600 text-xs mt-1">{errors.marca}</p>}
                        </div>
                      )}

                      {isFieldVisible('modelo') && (
                        <div>
                          <label htmlFor="modelo" className="block text-sm font-medium text-gray-700 mb-1">
                            Modelo
                            {isFieldRequired('modelo') && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <input
                            type="text"
                            id="modelo"
                            value={formData.modelo}
                            onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="Modelo del producto"
                          />
                          {errors.modelo && <p className="text-red-600 text-xs mt-1">{errors.modelo}</p>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Peso */}
                  {isFieldVisible('peso') && (
                    <div>
                      <label htmlFor="peso" className="block text-sm font-medium text-gray-700 mb-1">
                        Peso (KGM)
                        {isFieldRequired('peso') && <span className="text-red-500 ml-1">*</span>}
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
                      {errors.peso && <p className="text-red-600 text-xs mt-1">{errors.peso}</p>}
                    </div>
                  )}

                  {/* Tipo de Existencia */}
                  {isFieldVisible('tipoExistencia') && (
                    <div>
                      <label htmlFor="tipoExistencia" className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de existencia
                        {isFieldRequired('tipoExistencia') && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <select
                        id="tipoExistencia"
                        value={formData.tipoExistencia}
                        onChange={(e) => {
                          const nuevoTipo = e.target.value as Product['tipoExistencia'];
                          setFormData(prev => ({ ...prev, tipoExistencia: nuevoTipo }));
                          
                          // ✅ Sincronizar con el toggle trabajaConStock
                          if (nuevoTipo === 'SERVICIOS') {
                            setTrabajaConStock(false);
                            // Si hay stock, preguntar antes de resetear
                            if (formData.cantidad > 0) {
                              if (confirm('⚠️ Los servicios no requieren stock.\nSe perderá la cantidad ingresada. ¿Continuar?')) {
                                setFormData(prev => ({ ...prev, cantidad: 0 }));
                              } else {
                                // Revertir cambio
                                setFormData(prev => ({ ...prev, tipoExistencia: 'MERCADERIAS' }));
                                return;
                              }
                            }
                          } else {
                            setTrabajaConStock(true);
                          }
                        }}
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
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.tipoExistencia === 'SERVICIOS' 
                          ? '⚠️ Los servicios no requieren control de stock' 
                          : 'Este tipo de producto puede tener control de stock'
                        }
                      </p>
                      {errors.tipoExistencia && <p className="text-red-600 text-xs mt-1">{errors.tipoExistencia}</p>}
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
      
      {/* Panel de configuración de campos */}
      <FieldsConfigPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        fieldsConfig={fieldsConfig}
        onToggleVisibility={toggleFieldVisibility}
        onToggleRequired={toggleFieldRequired}
        onReset={resetToDefault}
      />
      
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