// src/features/catalogo-articulos/components/ProductModal.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import { 
  Sliders, Tag, Quote, Barcode, ScanLine, Folder, Badge as BadgeIcon, Package2, 
  Banknote, Percent, Ruler, Building2, FileText, Weight, Image as ImageIcon, 
  Wallet, TrendingUp, TicketPercent, Factory, FileBadge2, Boxes, X, Layers, Plus, MinusCircle, Droplet, Clock3, Info 
} from 'lucide-react';
import CategoryModal from './CategoryModal';
import { FieldsConfigPanel } from './FieldsConfigPanel';
import { useProductStore } from '../hooks/useProductStore';
import { useProductFieldsConfig } from '../hooks/useProductFieldsConfig';
import type { Product, ProductFormData, UnitMeasureType } from '../models/types';
import { UNIT_MEASURE_TYPE_OPTIONS, filterUnitsByMeasureType, inferUnitMeasureType, isUnitAllowedForMeasureType } from '../utils/unitMeasureHelpers';
import { useConfigurationContext, type Category } from '../../configuracion-sistema/context/ConfigurationContext';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Omit<Product, 'id' | 'fechaCreacion' | 'fechaActualizacion'>) => void;
  product?: Product;
  categories: Category[];
}

type ProductType = 'BIEN' | 'SERVICIO';

const UNIT_TYPE_META: Record<UnitMeasureType, { label: string; Icon: LucideIcon }> = {
  UNIDADES: { label: 'Unidades', Icon: Boxes },
  PESO: { label: 'Peso', Icon: Weight },
  VOLUMEN: { label: 'Volumen', Icon: Droplet },
  LONGITUD_AREA: { label: 'Longitud / área', Icon: Ruler },
  TIEMPO_SERVICIO: { label: 'Tiempo / servicio', Icon: Clock3 }
};

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

  const sortedUnits = useMemo(() => {
    return [...availableUnits].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [availableUnits]);

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

  // ✅ Estado para tipo de producto (Bien/Servicio)
  const [productType, setProductType] = useState<ProductType>('BIEN');

  // ✅ Determinar unidad por defecto según tipo de producto
  const getDefaultUnitForType = useCallback((type: ProductType): string => {
    if (availableUnits.length === 0) return type === 'BIEN' ? 'NIU' : 'ZZ';

    if (type === 'BIEN') {
      const niuUnit = availableUnits.find(u => u.code === 'NIU');
      if (niuUnit) return 'NIU';
      const favoriteUnit = availableUnits.find(u => u.isFavorite);
      if (favoriteUnit) return favoriteUnit.code;
      return availableUnits[0].code;
    } else {
      // Servicio
      const zzUnit = availableUnits.find(u => u.code === 'ZZ');
      if (zzUnit) return 'ZZ';
      return availableUnits[0].code;
    }
  }, [availableUnits]);

  const inferMeasureTypeFromUnit = useCallback((unitCode: string): UnitMeasureType => {
    return inferUnitMeasureType(unitCode, availableUnits);
  }, [availableUnits]);

  const [formData, setFormData] = useState<ProductFormData>(() => ({
    nombre: '',
    codigo: '',
    precio: 0,
    unidad: getDefaultUnitForType('BIEN') as Product['unidad'],
    tipoUnidadMedida: inferMeasureTypeFromUnit(getDefaultUnitForType('BIEN')),
    categoria: categories[0]?.nombre || '',
    impuesto: 'IGV (18.00%)',
    descripcion: '',
    establecimientoIds: [],
    disponibleEnTodos: false,
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
    tipoExistencia: 'MERCADERIAS',
    unidadesMedidaAdicionales: [],
  }));

  const filteredUnitsForType = useMemo(() => {
    if (!formData.tipoUnidadMedida) return [];
    return filterUnitsByMeasureType(sortedUnits, formData.tipoUnidadMedida);
  }, [sortedUnits, formData.tipoUnidadMedida]);

  const baseUnitOptions = filteredUnitsForType.length > 0 ? filteredUnitsForType : sortedUnits;
  const isUsingFallbackUnits = filteredUnitsForType.length === 0 && !!formData.tipoUnidadMedida;

  const remainingUnitsForAdditional = useMemo(() => {
    const used = new Set<string>([
      formData.unidad,
      ...formData.unidadesMedidaAdicionales.map(unit => unit.unidadCodigo)
    ]);
    return baseUnitOptions.filter(unit => !used.has(unit.code));
  }, [formData.unidad, formData.unidadesMedidaAdicionales, baseUnitOptions]);

  const [errors, setErrors] = useState<FormError>({});
  const [additionalUnitErrors, setAdditionalUnitErrors] = useState<Array<{ unidad?: string; factor?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [precioInput, setPrecioInput] = useState<string>('0.00');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [unitInfoMessage, setUnitInfoMessage] = useState<string | null>(null);
  const [hasInitializedForm, setHasInitializedForm] = useState(false);

  const findUnitByCode = useCallback((code?: string) => {
    if (!code) return undefined;
    return sortedUnits.find(unit => unit.code === code);
  }, [sortedUnits]);

  const formatFactorValue = useCallback((value?: number) => {
    if (!value) return '0';
    const formatter = new Intl.NumberFormat('es-PE', {
      maximumFractionDigits: 4,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2
    });
    return formatter.format(value);
  }, []);

  const handleMeasureTypeChange = (nextType: UnitMeasureType) => {
    if (formData.tipoUnidadMedida === nextType) return;
    const previousAdditionalCount = formData.unidadesMedidaAdicionales.length;
    let sanitizedUnits: ProductFormData['unidadesMedidaAdicionales'] = [];
    setFormData(prev => {
      const filtered = filterUnitsByMeasureType(sortedUnits, nextType);
      const availableForType = filtered.length > 0 ? filtered : sortedUnits;
      const currentUnitStillValid = availableForType.some(unit => unit.code === prev.unidad);
      const nextUnit = (currentUnitStillValid ? prev.unidad : availableForType[0]?.code || prev.unidad) as Product['unidad'];
      sanitizedUnits = prev.unidadesMedidaAdicionales.filter(unit =>
        unit.unidadCodigo !== nextUnit && isUnitAllowedForMeasureType(unit.unidadCodigo, sortedUnits, nextType)
      );
      return {
        ...prev,
        tipoUnidadMedida: nextType,
        unidad: nextUnit,
        unidadesMedidaAdicionales: sanitizedUnits
      };
    });
    setAdditionalUnitErrors(sanitizedUnits.map(() => ({}))); // reset row errors
    setErrors(prev => ({
      ...prev,
      unidad: undefined,
      tipoUnidadMedida: undefined
    }));
    setUnitInfoMessage(prev => {
      if (sanitizedUnits.length < previousAdditionalCount) {
        const friendlyLabel = UNIT_TYPE_META[nextType]?.label || 'familia';
        return `Se limpiaron presentaciones que no son compatibles con la familia ${friendlyLabel}.`;
      }
      return prev;
    });
  };

  const addAdditionalUnit = () => {
    if (remainingUnitsForAdditional.length === 0) return;
    const nextUnit = remainingUnitsForAdditional[0];
    setFormData(prev => ({
      ...prev,
      unidadesMedidaAdicionales: [
        ...prev.unidadesMedidaAdicionales,
        { unidadCodigo: nextUnit.code, factorConversion: 1 }
      ]
    }));
    setAdditionalUnitErrors(prev => [...prev, {}]);
  };

  const removeAdditionalUnit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      unidadesMedidaAdicionales: prev.unidadesMedidaAdicionales.filter((_, i) => i !== index)
    }));
    setAdditionalUnitErrors(prev => prev.filter((_, i) => i !== index));
  };

  const updateAdditionalUnit = (index: number, field: 'unidadCodigo' | 'factorConversion', value: string) => {
    setFormData(prev => ({
      ...prev,
      unidadesMedidaAdicionales: prev.unidadesMedidaAdicionales.map((unit, i) =>
        i === index
          ? {
              ...unit,
              [field]: field === 'factorConversion' ? Number(value) : value
            }
          : unit
      )
    }));
    setAdditionalUnitErrors(prev => {
      const next = [...prev];
      const target = { ...(next[index] || {}) };
      if (field === 'factorConversion') {
        delete target.factor;
      } else {
        delete target.unidad;
      }
      next[index] = target;
      return next;
    });
  };

  const getAdditionalUnitOptions = useCallback((rowIndex: number) => {
    return baseUnitOptions.filter(unit => {
      if (unit.code === formData.unidad) return false;
      return (
        unit.code === formData.unidadesMedidaAdicionales[rowIndex]?.unidadCodigo ||
        !formData.unidadesMedidaAdicionales.some((other, idx) => idx !== rowIndex && other.unidadCodigo === unit.code)
      );
    });
  }, [baseUnitOptions, formData.unidad, formData.unidadesMedidaAdicionales]);

  useEffect(() => {
    setAdditionalUnitErrors(prev => {
      if (prev.length === formData.unidadesMedidaAdicionales.length) {
        return prev;
      }
      return formData.unidadesMedidaAdicionales.map((_, index) => prev[index] || {});
    });
  }, [formData.unidadesMedidaAdicionales]);

  // ✅ Efecto para cambiar unidad según tipo de producto (sin dependencias circulares)
  useEffect(() => {
    const defaultUnit = getDefaultUnitForType(productType);
    setFormData(prev => ({
      ...prev,
      unidad: defaultUnit as Product['unidad'],
      tipoUnidadMedida: inferMeasureTypeFromUnit(defaultUnit),
      unidadesMedidaAdicionales: []
    }));
    setAdditionalUnitErrors([]);
  }, [productType, getDefaultUnitForType, inferMeasureTypeFromUnit]);

  const defaultCategoryName = useMemo(() => categories[0]?.nombre || '', [categories]);

  const initializeFormForNewProduct = useCallback(() => {
    const defaultUnit = getDefaultUnitForType('BIEN');
    const inferredType = inferMeasureTypeFromUnit(defaultUnit);

    setFormData({
      nombre: '',
      codigo: '',
      precio: 0,
      unidad: defaultUnit as Product['unidad'],
      tipoUnidadMedida: inferredType,
      unidadesMedidaAdicionales: [],
      categoria: defaultCategoryName,
      impuesto: 'IGV (18.00%)',
      descripcion: '',
      establecimientoIds: [],
      disponibleEnTodos: false,
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
    setProductType('BIEN');
    setAdditionalUnitErrors([]);
    setErrors({});
    setUnitInfoMessage(null);
    setIsDescriptionExpanded(false);
  }, [defaultCategoryName, getDefaultUnitForType, inferMeasureTypeFromUnit]);

  const initializeFormFromProduct = useCallback((productData: Product) => {
    const additionalUnits = productData.unidadesMedidaAdicionales?.map(unit => ({
      unidadCodigo: unit.unidadCodigo,
      factorConversion: unit.factorConversion
    })) || [];
    const inferredType = productData.tipoUnidadMedida || inferMeasureTypeFromUnit(productData.unidad);
    const sanitizedUnits = additionalUnits.filter(unit =>
      isUnitAllowedForMeasureType(unit.unidadCodigo, sortedUnits, inferredType)
    );

    setFormData({
      nombre: productData.nombre,
      codigo: productData.codigo,
      precio: productData.precio,
      unidad: productData.unidad,
      tipoUnidadMedida: inferredType,
      unidadesMedidaAdicionales: sanitizedUnits,
      categoria: productData.categoria,
      impuesto: productData.impuesto || 'IGV (18.00%)',
      descripcion: productData.descripcion || '',
      establecimientoIds: productData.establecimientoIds || [],
      disponibleEnTodos: productData.disponibleEnTodos || false,
      alias: productData.alias || '',
      precioCompra: productData.precioCompra || 0,
      porcentajeGanancia: productData.porcentajeGanancia || 0,
      codigoBarras: productData.codigoBarras || '',
      codigoFabrica: productData.codigoFabrica || '',
      codigoSunat: productData.codigoSunat || '',
      descuentoProducto: productData.descuentoProducto || 0,
      marca: productData.marca || '',
      modelo: productData.modelo || '',
      peso: productData.peso || 0,
      tipoExistencia: productData.tipoExistencia || 'MERCADERIAS'
    });

    setPrecioInput(productData.precio.toFixed(2));
    setImagePreview(productData.imagen || '');
    setAdditionalUnitErrors(sanitizedUnits.map(() => ({})));
    setProductType(productData.unidad === 'ZZ' ? 'SERVICIO' : 'BIEN');
    setErrors({});
    setUnitInfoMessage(null);
    setIsDescriptionExpanded(false);
  }, [inferMeasureTypeFromUnit, sortedUnits]);

  useEffect(() => {
    if (!isOpen) {
      setHasInitializedForm(false);
      return;
    }

    if (product) {
      initializeFormFromProduct(product);
      setHasInitializedForm(true);
      return;
    }

    if (!hasInitializedForm) {
      initializeFormForNewProduct();
      setHasInitializedForm(true);
    }
  }, [isOpen, product, hasInitializedForm, initializeFormForNewProduct, initializeFormFromProduct]);

  const validateForm = (): boolean => {
    const newErrors: FormError = {};
    const newAdditionalUnitErrors: Array<{ unidad?: string; factor?: string }> = [];

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

    if (!formData.tipoUnidadMedida) {
      newErrors.tipoUnidadMedida = 'Selecciona una familia de unidades';
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

    // Alias (si está marcado como obligatorio)
    if (isFieldVisible('alias') && isFieldRequired('alias') && !formData.alias?.trim()) {
      newErrors.alias = 'El alias es requerido';
    }

    // Tipo de existencia (si está marcado como obligatorio)
    if (isFieldVisible('tipoExistencia') && isFieldRequired('tipoExistencia') && !formData.tipoExistencia) {
      newErrors.tipoExistencia = 'El tipo de existencia es requerido';
    }

    // Validaciones para unidades adicionales
    const seenUnits = new Set<string>();
    formData.unidadesMedidaAdicionales.forEach((unit, index) => {
      const rowErrors: { unidad?: string; factor?: string } = {};

      if (!unit.unidadCodigo) {
        rowErrors.unidad = 'Selecciona una unidad';
      } else {
        if (unit.unidadCodigo === formData.unidad) {
          rowErrors.unidad = 'No puede coincidir con la unidad base';
        } else if (seenUnits.has(unit.unidadCodigo)) {
          rowErrors.unidad = 'Unidad repetida';
        } else if (!isUnitAllowedForMeasureType(unit.unidadCodigo, sortedUnits, formData.tipoUnidadMedida)) {
          rowErrors.unidad = 'No coincide con la familia seleccionada';
        }
        seenUnits.add(unit.unidadCodigo);
      }

      if (!unit.factorConversion || unit.factorConversion <= 0) {
        rowErrors.factor = 'El campo "Contiene" debe ser mayor a 0';
      }

      newAdditionalUnitErrors[index] = rowErrors;
    });

    setErrors(newErrors);
    setAdditionalUnitErrors(newAdditionalUnitErrors);

    const hasAdditionalErrors = newAdditionalUnitErrors.some(row => row.unidad || row.factor);

    return Object.keys(newErrors).length === 0 && !hasAdditionalErrors;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-[1120px] max-h-[80vh] flex flex-col bg-white rounded-lg shadow-2xl">
        {/* Header - Sticky */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white rounded-t-lg">
          <h3 className="text-base font-semibold text-gray-900">
            {product ? 'Editar producto' : 'Nuevo producto / servicio'}
          </h3>
          <div className="flex items-center gap-2">
            {/* Botón Personalizar - Solo ícono */}
            <button
              type="button"
              onClick={() => setIsPanelOpen(true)}
              className="p-1.5 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-md transition-colors"
              title="Personalizar"
              aria-label="Personalizar campos del formulario"
            >
              <Sliders className="w-4 h-4" />
            </button>
            
            {/* Botón Cerrar */}
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

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
          
          {/* Tipo de producto (Pills) */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Boxes className="w-3.5 h-3.5 text-gray-500" />
              <label className="text-xs font-medium text-gray-700">
                Tipo de producto
              </label>
            </div>
            <div className="inline-flex rounded-md border border-gray-300 p-0.5 bg-gray-50">
              <button
                type="button"
                onClick={() => setProductType('BIEN')}
                className={`px-4 py-1.5 text-xs font-medium rounded transition-all ${
                  productType === 'BIEN'
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Bien
              </button>
              <button
                type="button"
                onClick={() => setProductType('SERVICIO')}
                className={`px-4 py-1.5 text-xs font-medium rounded transition-all ${
                  productType === 'SERVICIO'
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Servicio
              </button>
            </div>
          </div>

          {/* Grid de dos columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* ========== COLUMNA IZQUIERDA ========== */}
            <div className="lg:col-span-6 space-y-4">

            
              {/* 1. Nombre */}
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
                    className={`
                      w-full h-10 pl-9 pr-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors
                      ${errors.nombre ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                    `}
                    placeholder="Ingresa el nombre del producto"
                  />
                </div>
                {errors.nombre && <p className="text-red-600 text-xs mt-1">{errors.nombre}</p>}
              </div>

              {/* 2. Alias del producto */}
              {isFieldVisible('alias') && (
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
                      className={`
                        w-full h-10 pl-9 pr-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors
                        ${errors.alias ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                      `}
                      placeholder="Nombre alternativo"
                    />
                  </div>
                  {errors.alias && <p className="text-red-600 text-xs mt-1">{errors.alias}</p>}
                </div>
              )}

              {/* 3. Código */}
              <div>
                <label htmlFor="codigo" className="block text-xs font-medium text-gray-700 mb-1">
                  Código <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      id="codigo"
                      value={formData.codigo}
                      onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                      className={`
                        w-full h-10 pl-9 pr-3 rounded-md border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors
                        ${errors.codigo ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                      `}
                      placeholder="Código único"
                    />
                  </div>
                  <button
                    type="button"
                    className="px-3 h-8 bg-gray-100 border border-gray-300 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors self-end"
                    onClick={() => {
                      const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
                      setFormData(prev => ({ ...prev, codigo: randomCode }));
                    }}
                  >
                    Generar
                  </button>
                </div>
                {errors.codigo && <p className="text-red-600 text-xs mt-1">{errors.codigo}</p>}
              </div>

              {/* 4. Código de barras */}
              {isFieldVisible('codigoBarras') && (
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
                      value={formData.codigoBarras}
                      onChange={(e) => setFormData(prev => ({ ...prev, codigoBarras: e.target.value }))}
                      className="w-full h-10 pl-9 pr-3 rounded-md border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                      placeholder="EAN-13, UPC, etc."
                    />
                  </div>
                  {errors.codigoBarras && <p className="text-red-600 text-xs mt-1">{errors.codigoBarras}</p>}
                </div>
              )}

              {/* 5. Categoría */}
              {isFieldVisible('categoria') && (
                <div>
                  <label htmlFor="categoria" className="block text-xs font-medium text-gray-700 mb-1">
                    Categoría
                    {isFieldRequired('categoria') && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <select
                        id="categoria"
                        value={formData.categoria}
                        onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                        className={`
                          w-full h-10 pl-9 pr-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors
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
                    </div>
                    <button
                      type="button"
                      className="px-3 h-10 text-xs text-violet-600 border border-violet-300 rounded-md hover:bg-violet-50 transition-colors whitespace-nowrap"
                      onClick={() => setShowCategoryModal(true)}
                    >
                      Crear categoría
                    </button>
                  </div>
                  {errors.categoria && <p className="text-red-600 text-xs mt-1">{errors.categoria}</p>}
                </div>
              )}

              {/* 6. Marca */}
              {isFieldVisible('marca') && (
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
                      className="w-full h-10 pl-9 pr-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                      placeholder="Marca del producto"
                    />
                  </div>
                  {errors.marca && <p className="text-red-600 text-xs mt-1">{errors.marca}</p>}
                </div>
              )}

              {/* 7. Modelo */}
              {isFieldVisible('modelo') && (
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
                      className="w-full h-10 pl-9 pr-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                      placeholder="Modelo del producto"
                    />
                  </div>
                  {errors.modelo && <p className="text-red-600 text-xs mt-1">{errors.modelo}</p>}
                </div>
              )}

              {/* 8. Precio de venta */}
              {isFieldVisible('precio') && (
                <div>
                  <label htmlFor="precio" className="block text-xs font-medium text-gray-700 mb-1">
                    Precio de venta
                    {isFieldRequired('precio') && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <div className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                      S/
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
                        w-full h-10 pl-16 pr-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors
                        ${errors.precio ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                      `}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.precio && <p className="text-red-600 text-xs mt-1">{errors.precio}</p>}
                </div>
              )}

              {/* 9. Impuesto */}
              <div>
                <label htmlFor="impuesto" className="block text-xs font-medium text-gray-700 mb-1">
                  Impuesto <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <select
                    id="impuesto"
                    value={formData.impuesto}
                    onChange={(e) => setFormData(prev => ({ ...prev, impuesto: e.target.value }))}
                    className="w-full h-10 pl-9 pr-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                  >
                    <option value="IGV (18.00%)">IGV (18.00%)</option>
                    <option value="IGV (10.00%)">IGV (10.00%)</option>
                    <option value="Exonerado (0.00%)">Exonerado (0.00%)</option>
                    <option value="Inafecto (0.00%)">Inafecto (0.00%)</option>
                  </select>
                </div>
              </div>

              {/* Tipo de unidad */}
              <div>
                <div className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                  <span>Familia de unidades</span>
                </div>
                <div className="flex gap-1 overflow-x-auto pb-1" role="group" aria-label="Familia de unidades">
                  {UNIT_MEASURE_TYPE_OPTIONS.map(option => {
                    const isActive = formData.tipoUnidadMedida === option.value;
                    const meta = UNIT_TYPE_META[option.value];
                    const Icon = meta?.Icon || Layers;
                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => handleMeasureTypeChange(option.value)}
                        aria-pressed={isActive}
                        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 ${
                          isActive
                            ? 'border-violet-500 bg-violet-50 text-violet-900 shadow-sm'
                            : 'border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{meta?.label || option.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gray-500">
                  La familia define qué unidades son compatibles para este producto.
                </p>
                {isUsingFallbackUnits && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No hay unidades activas para esta familia. Mostramos todas las disponibles hasta que configures más.
                  </p>
                )}
                {errors.tipoUnidadMedida && (
                  <p className="text-red-600 text-xs mt-1">{errors.tipoUnidadMedida}</p>
                )}
              </div>

              {/* 10. Unidad - Siempre visible */}
              <div>
                <label htmlFor="unidad" className="block text-xs font-medium text-gray-700 mb-1">
                  Unidad mínima <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <select
                    id="unidad"
                    value={formData.unidad}
                    onChange={(e) => {
                      const nextUnit = e.target.value as Product['unidad'];
                      let removedByBaseChange = false;
                      setFormData(prev => {
                        const filteredAdditional = prev.unidadesMedidaAdicionales.filter(unit => unit.unidadCodigo !== nextUnit);
                        if (filteredAdditional.length !== prev.unidadesMedidaAdicionales.length) {
                          removedByBaseChange = true;
                          setAdditionalUnitErrors(prevErrors => {
                            const filteredErrors: Array<{ unidad?: string; factor?: string }> = [];
                            prev.unidadesMedidaAdicionales.forEach((unit, idx) => {
                              if (unit.unidadCodigo !== nextUnit) {
                                filteredErrors.push(prevErrors[idx] || {});
                              }
                            });
                            return filteredErrors;
                          });
                        }
                        return {
                          ...prev,
                          unidad: nextUnit,
                          unidadesMedidaAdicionales: filteredAdditional
                        };
                      });
                      if (removedByBaseChange) {
                        setUnitInfoMessage('Se limpiaron presentaciones que coincidían con la nueva unidad mínima.');
                      }
                    }}
                    className="w-full h-10 pl-9 pr-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                  >
                    {baseUnitOptions.length > 0 ? (
                      baseUnitOptions.map(unit => (
                        <option key={unit.id} value={unit.code}>
                          ({unit.code}) {unit.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="NIU">(NIU) Unidad</option>
                        <option value="ZZ">(ZZ) Servicios</option>
                      </>
                    )}
                  </select>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Es la unidad con la que se controla el stock interno (1, 2, 3…). Las demás presentaciones se convierten a partir de esta unidad.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {availableUnits.length > 0
                    ? `${availableUnits.length} unidad${availableUnits.length !== 1 ? 'es' : ''} disponible${availableUnits.length !== 1 ? 's' : ''}`
                    : 'Ve a Configuración → Negocio para gestionar unidades'
                  }
                </p>
              </div>

              {/* Presentaciones comerciales */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-800">
                    <Layers className="w-3.5 h-3.5 text-violet-600" />
                    <span>Presentaciones comerciales (opcional)</span>
                  </div>
                  <button
                    type="button"
                    onClick={addAdditionalUnit}
                    disabled={remainingUnitsForAdditional.length === 0}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:text-violet-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3 h-3" /> Agregar presentación
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">
                  Define cómo también vendes este producto: cajas, bolsas, kilos, sacos, etc. El stock se calcula a partir de la unidad mínima.
                </p>

                {unitInfoMessage && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800">
                    <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span className="flex-1">{unitInfoMessage}</span>
                    <button
                      type="button"
                      onClick={() => setUnitInfoMessage(null)}
                      className="text-amber-700 hover:text-amber-900"
                      title="Ocultar mensaje"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {formData.unidadesMedidaAdicionales.length === 0 ? (
                  <p className="text-[11px] text-gray-500">Aún no registras presentaciones comerciales.</p>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-md">
                    {formData.unidadesMedidaAdicionales.map((unit, index) => {
                      const options = getAdditionalUnitOptions(index);
                      const baseUnitLabel = findUnitByCode(formData.unidad)?.code || formData.unidad || '—';
                      const conversionText = unit.unidadCodigo && unit.factorConversion
                        ? `1 ${unit.unidadCodigo} = ${formatFactorValue(unit.factorConversion)} ${baseUnitLabel}`
                        : 'Selecciona unidad y completa "Contiene" para ver la conversión.';
                      return (
                        <div key={`extra-unit-${index}`} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-2 items-start p-2 text-xs">
                          <div>
                            <label className="text-[11px] font-medium text-gray-600 mb-1 block">Unidad</label>
                            <select
                              value={unit.unidadCodigo}
                              onChange={(e) => updateAdditionalUnit(index, 'unidadCodigo', e.target.value)}
                              className={`w-full h-8 rounded-md border text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 ${additionalUnitErrors[index]?.unidad ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                            >
                              <option value="">Seleccionar</option>
                              {options.map(option => (
                                <option key={option.id} value={option.code}>
                                  ({option.code}) {option.name}
                                </option>
                              ))}
                            </select>
                            {additionalUnitErrors[index]?.unidad && (
                              <p className="text-red-600 text-[11px] mt-1">{additionalUnitErrors[index]?.unidad}</p>
                            )}
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-gray-600 mb-1 block">Contiene</label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0.0001"
                                step="0.0001"
                                value={unit.factorConversion ?? ''}
                                onChange={(e) => updateAdditionalUnit(index, 'factorConversion', e.target.value)}
                                className={`w-full h-8 rounded-md border text-xs pl-3 pr-5 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 ${additionalUnitErrors[index]?.factor ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                placeholder="0"
                              />
                              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-gray-500">{baseUnitLabel}</span>
                            </div>
                            {additionalUnitErrors[index]?.factor && (
                              <p className="text-red-600 text-[11px] mt-1">{additionalUnitErrors[index]?.factor}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAdditionalUnit(index)}
                            className="mt-6 inline-flex items-center text-gray-400 hover:text-red-500"
                            title="Eliminar presentación"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                          <div className="col-span-3 text-[10px] text-gray-500 pt-1">
                            {conversionText}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {remainingUnitsForAdditional.length === 0 && formData.unidadesMedidaAdicionales.length > 0 && (
                  <p className="text-[11px] text-gray-500">Ya agregaste todas las unidades disponibles para esta familia.</p>
                )}
              </div>

              {/* 11. Establecimientos */}
              <div className="border border-purple-300 rounded-md bg-purple-50/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-purple-600" />
                    Establecimientos <span className="text-red-500">*</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = formData.establecimientoIds.length === establishments.length;
                      setFormData(prev => ({
                        ...prev,
                        establecimientoIds: allSelected ? [] : establishments.map(e => e.id)
                      }));
                    }}
                    className={`
                      relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-purple-500
                      ${formData.establecimientoIds.length === establishments.length ? 'bg-purple-600' : 'bg-gray-300'}
                    `}
                    title={formData.establecimientoIds.length === establishments.length ? "Desmarcar todos" : "Marcar todos"}
                  >
                    <span className={`
                      inline-block h-3 w-3 transform rounded-full bg-white transition-transform
                      ${formData.establecimientoIds.length === establishments.length ? 'translate-x-4.5' : 'translate-x-0.5'}
                    `} />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {establishments.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <Building2 className="w-8 h-8 mx-auto mb-1 text-gray-300" />
                      <p className="text-xs font-medium">No hay establecimientos activos</p>
                    </div>
                  ) : (
                    establishments.map((est) => {
                      const isSelected = formData.establecimientoIds.includes(est.id);
                      return (
                        <label
                          key={est.id}
                          className={`
                            flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer transition-all
                            ${isSelected
                              ? 'bg-purple-100 border-purple-300'
                              : 'bg-white border-gray-200 hover:border-purple-200 hover:bg-purple-50/50'
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
                            className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-200 text-purple-800 rounded">
                                {est.code}
                              </span>
                              <p className="text-xs font-medium text-gray-900 truncate">
                                {est.name}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <svg className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>

                {establishments.length > 0 && (
                  <div className="flex items-center justify-between pt-1.5 border-t border-purple-200">
                    <p className="text-[10px] text-gray-600">
                      {formData.establecimientoIds.length} de {establishments.length} seleccionado(s)
                    </p>
                  </div>
                )}

                {errors.establecimientoIds && (
                  <div className="flex items-center gap-1.5 p-2 bg-red-50 border border-red-300 rounded">
                    <svg className="w-3.5 h-3.5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-[10px] text-red-700 font-medium">
                      {errors.establecimientoIds}
                    </p>
                  </div>
                )}
              </div>

              {/* 12. Descripción */}
              {isFieldVisible('descripcion') && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="descripcion" className="text-xs font-medium text-gray-700">
                      Descripción
                      {isFieldRequired('descripcion') && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                    >
                      {isDescriptionExpanded ? 'Contraer' : 'Expandir'}
                    </button>
                  </div>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-3.5 h-3.5 text-gray-400" />
                    <textarea
                      id="descripcion"
                      rows={isDescriptionExpanded ? 6 : 3}
                      value={formData.descripcion}
                      onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 resize-none"
                      placeholder="Descripción detallada..."
                    />
                  </div>
                  {errors.descripcion && <p className="text-red-600 text-xs mt-1">{errors.descripcion}</p>}
                </div>
              )}

              {/* 13. Peso (KGM) */}
              {isFieldVisible('peso') && (
                <div>
                  <label htmlFor="peso" className="block text-xs font-medium text-gray-700 mb-1">
                    Peso (KGM)
                    {isFieldRequired('peso') && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <div className="relative">
                    <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="number"
                      id="peso"
                      step="0.001"
                      min="0"
                      value={formData.peso}
                      onChange={(e) => setFormData(prev => ({ ...prev, peso: parseFloat(e.target.value) || 0 }))}
                      className="w-full h-10 pl-9 pr-12 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                      placeholder="0.000"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                      KG
                    </div>
                  </div>
                  {errors.peso && <p className="text-red-600 text-xs mt-1">{errors.peso}</p>}
                </div>
              )}

            </div>

            {/* ========== COLUMNA DERECHA ========== */}
            <div className="lg:col-span-6 space-y-4">
              
              {/* 1. Imagen */}
              {isFieldVisible('imagen') && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Imagen
                    {isFieldRequired('imagen') && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
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
                        className="cursor-pointer inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Subir imagen
                      </label>
                      <p className="text-xs text-gray-500 mt-1.5">
                        PNG, JPG, GIF hasta 5MB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Precio inicial de compra */}
              {isFieldVisible('precioCompra') && (
                <div>
                  <label htmlFor="precioCompra" className="block text-xs font-medium text-gray-700 mb-1">
                    Precio inicial de compra
                    {isFieldRequired('precioCompra') && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <div className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                      S/
                    </div>
                    <input
                      type="number"
                      id="precioCompra"
                      step="0.01"
                      min="0"
                      value={formData.precioCompra}
                      onChange={(e) => setFormData(prev => ({ ...prev, precioCompra: parseFloat(e.target.value) || 0 }))}
                      className="w-full h-10 pl-16 pr-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                      placeholder="0.00"
                    />
                  </div>
                  {errors.precioCompra && <p className="text-red-600 text-xs mt-1">{errors.precioCompra}</p>}
                </div>
              )}

              {/* 3. Porcentaje de ganancia */}
              {isFieldVisible('porcentajeGanancia') && (
                <div>
                  <label htmlFor="porcentajeGanancia" className="block text-xs font-medium text-gray-700 mb-1">
                    Porcentaje de ganancia
                    {isFieldRequired('porcentajeGanancia') && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <div className="relative">
                    <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="number"
                      id="porcentajeGanancia"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.porcentajeGanancia}
                      onChange={(e) => setFormData(prev => ({ ...prev, porcentajeGanancia: parseFloat(e.target.value) || 0 }))}
                      className="w-full h-10 pl-9 pr-12 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                      placeholder="0.00"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                      %
                    </div>
                  </div>
                  {errors.porcentajeGanancia && <p className="text-red-600 text-xs mt-1">{errors.porcentajeGanancia}</p>}
                </div>
              )}

              {/* 4. Descuento del producto */}
              {isFieldVisible('descuentoProducto') && (
                <div>
                  <label htmlFor="descuentoProducto" className="block text-xs font-medium text-gray-700 mb-1">
                    Descuento del producto
                    {isFieldRequired('descuentoProducto') && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <div className="relative">
                    <TicketPercent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="number"
                      id="descuentoProducto"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.descuentoProducto}
                      onChange={(e) => setFormData(prev => ({ ...prev, descuentoProducto: parseFloat(e.target.value) || 0 }))}
                      className="w-full h-10 pl-9 pr-12 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                      placeholder="0.00"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                      %
                    </div>
                  </div>
                  {errors.descuentoProducto && <p className="text-red-600 text-xs mt-1">{errors.descuentoProducto}</p>}
                </div>
              )}

              {/* 5. Código de fábrica */}
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

              {/* 6. Código SUNAT */}
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

              {/* 7. Tipo de existencia */}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, tipoExistencia: e.target.value as ProductFormData['tipoExistencia'] }))}
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
          </div>
        </form>

        {/* Footer - Sticky */}
        <div className="sticky bottom-0 flex justify-end gap-3 px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-10 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 h-10 text-sm font-medium text-white border border-transparent rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-violet-600"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
