import { useState, useMemo, useCallback, useEffect } from 'react';
import type React from 'react';
import type { Category } from '../../configuracion-sistema/context/ConfigurationContext';
import type { Unit } from '../../configuracion-sistema/models/Unit';
import type { Product, ProductFormData, UnitMeasureType } from '../models/types';
import {
  UNIT_MEASURE_TYPE_OPTIONS,
  filterUnitsByMeasureType,
  inferUnitMeasureType,
  isUnitAllowedForMeasureType
} from '../utils/unitMeasureHelpers';

export type ProductType = 'BIEN' | 'SERVICIO';

export type FormError = {
  [K in keyof ProductFormData]?: string;
} & {
  establecimientoIds?: string;
  tipoUnidadMedida?: string;
};

export type AdditionalUnitError = { unidad?: string; factor?: string };

interface UseProductFormParams {
  isOpen: boolean;
  product?: Product;
  categories: Category[];
  availableUnits: Unit[];
  allProducts: Product[];
  isFieldVisible: (fieldId: string) => boolean;
  isFieldRequired: (fieldId: string) => boolean;
  onSave: (productData: Omit<Product, 'id' | 'fechaCreacion' | 'fechaActualizacion'>) => void;
  onClose: () => void;
}

const buildDefaultFormData = (
  defaultUnit: Product['unidad'],
  inferredType: UnitMeasureType,
  defaultCategoryName: string
): ProductFormData => ({
  nombre: '',
  codigo: '',
  precio: 0,
  unidad: defaultUnit,
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

export const useProductForm = ({
  isOpen,
  product,
  categories,
  availableUnits,
  allProducts,
  isFieldVisible,
  isFieldRequired,
  onSave,
  onClose
}: UseProductFormParams) => {
  const sortedUnits = useMemo(() => {
    return [...availableUnits].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [availableUnits]);

  const defaultCategoryName = useMemo(() => categories[0]?.nombre || '', [categories]);

  const getDefaultUnitForType = useCallback(
    (type: ProductType): Product['unidad'] => {
      if (availableUnits.length === 0) {
        return (type === 'BIEN' ? 'NIU' : 'ZZ') as Product['unidad'];
      }

      if (type === 'BIEN') {
        const niuUnit = availableUnits.find(u => u.code === 'NIU');
        if (niuUnit) return niuUnit.code as Product['unidad'];
        const favoriteUnit = availableUnits.find(u => u.isFavorite);
        if (favoriteUnit) return favoriteUnit.code as Product['unidad'];
        return availableUnits[0].code as Product['unidad'];
      }

      const zzUnit = availableUnits.find(u => u.code === 'ZZ');
      if (zzUnit) return zzUnit.code as Product['unidad'];
      return availableUnits[0].code as Product['unidad'];
    },
    [availableUnits]
  );

  const inferMeasureTypeFromUnitCode = useCallback(
    (unitCode: string): UnitMeasureType => {
      return inferUnitMeasureType(unitCode, availableUnits);
    },
    [availableUnits]
  );

  const initialUnit = getDefaultUnitForType('BIEN');
  const initialMeasureType = inferMeasureTypeFromUnitCode(initialUnit);

  const [formData, setFormData] = useState<ProductFormData>(
    () => buildDefaultFormData(initialUnit, initialMeasureType, defaultCategoryName)
  );
  const [productType, setProductType] = useState<ProductType>('BIEN');
  const [errors, setErrors] = useState<FormError>({});
  const [additionalUnitErrors, setAdditionalUnitErrors] = useState<AdditionalUnitError[]>([]);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [precioInput, setPrecioInput] = useState('0.00');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [unitInfoMessage, setUnitInfoMessage] = useState<string | null>(null);
  const [hasInitializedForm, setHasInitializedForm] = useState(false);

  const filteredUnitsForType = useMemo(() => {
    if (!formData.tipoUnidadMedida) return [];
    return filterUnitsByMeasureType(sortedUnits, formData.tipoUnidadMedida);
  }, [sortedUnits, formData.tipoUnidadMedida]);

  const baseUnitOptions = filteredUnitsForType.length > 0 ? filteredUnitsForType : sortedUnits;
  const isUsingFallbackUnits = filteredUnitsForType.length === 0 && !!formData.tipoUnidadMedida;

  const remainingUnitsForAdditional = useMemo(() => {
    const usedCodes = new Set<string>([
      formData.unidad,
      ...formData.unidadesMedidaAdicionales.map(unit => unit.unidadCodigo)
    ]);
    return baseUnitOptions.filter(unit => !usedCodes.has(unit.code));
  }, [formData.unidad, formData.unidadesMedidaAdicionales, baseUnitOptions]);

  const findUnitByCode = useCallback(
    (code?: string) => {
      if (!code) return undefined;
      return sortedUnits.find(unit => unit.code === code);
    },
    [sortedUnits]
  );

  const formatFactorValue = useCallback((value?: number) => {
    if (!value) return '0';
    const formatter = new Intl.NumberFormat('es-PE', {
      maximumFractionDigits: 4,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2
    });
    return formatter.format(value);
  }, []);

  const handleMeasureTypeChange = useCallback(
    (nextType: UnitMeasureType) => {
      if (formData.tipoUnidadMedida === nextType) return;
      const previousAdditionalCount = formData.unidadesMedidaAdicionales.length;
      let sanitizedUnits: ProductFormData['unidadesMedidaAdicionales'] = [];

      setFormData(prev => {
        const filtered = filterUnitsByMeasureType(sortedUnits, nextType);
        const availableForType = filtered.length > 0 ? filtered : sortedUnits;
        const currentUnitValid = availableForType.some(unit => unit.code === prev.unidad);
        const nextUnit = (currentUnitValid ? prev.unidad : availableForType[0]?.code || prev.unidad) as Product['unidad'];
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

      setAdditionalUnitErrors(sanitizedUnits.map(() => ({})));
      setErrors(prev => ({
        ...prev,
        unidad: undefined,
        tipoUnidadMedida: undefined
      }));

      if (sanitizedUnits.length < previousAdditionalCount) {
        const friendlyLabel =
          UNIT_MEASURE_TYPE_OPTIONS.find(option => option.value === nextType)?.label || 'familia';
        setUnitInfoMessage(`Se limpiaron presentaciones que no son compatibles con la familia ${friendlyLabel}.`);
      }
    },
    [formData.tipoUnidadMedida, formData.unidadesMedidaAdicionales, sortedUnits]
  );

  const handleBaseUnitChange = useCallback(
    (nextUnit: Product['unidad']) => {
      let removedByBaseChange = false;
      setFormData(prev => {
        const filteredAdditional = prev.unidadesMedidaAdicionales.filter(unit => unit.unidadCodigo !== nextUnit);
        if (filteredAdditional.length !== prev.unidadesMedidaAdicionales.length) {
          removedByBaseChange = true;
          setAdditionalUnitErrors(previousErrors => {
            const filteredErrors: AdditionalUnitError[] = [];
            prev.unidadesMedidaAdicionales.forEach((unit, idx) => {
              if (unit.unidadCodigo !== nextUnit) {
                filteredErrors.push(previousErrors[idx] || {});
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
    },
    []
  );

  const addAdditionalUnit = useCallback(() => {
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
  }, [remainingUnitsForAdditional]);

  const removeAdditionalUnit = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      unidadesMedidaAdicionales: prev.unidadesMedidaAdicionales.filter((_, i) => i !== index)
    }));
    setAdditionalUnitErrors(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateAdditionalUnit = useCallback(
    (index: number, field: 'unidadCodigo' | 'factorConversion', value: string) => {
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
    },
    []
  );

  const getAdditionalUnitOptions = useCallback(
    (rowIndex: number) => {
      return baseUnitOptions.filter(unit => {
        if (unit.code === formData.unidad) return false;
        return (
          unit.code === formData.unidadesMedidaAdicionales[rowIndex]?.unidadCodigo ||
          !formData.unidadesMedidaAdicionales.some((other, idx) => idx !== rowIndex && other.unidadCodigo === unit.code)
        );
      });
    },
    [baseUnitOptions, formData.unidad, formData.unidadesMedidaAdicionales]
  );

  useEffect(() => {
    setAdditionalUnitErrors(prev => {
      if (prev.length === formData.unidadesMedidaAdicionales.length) {
        return prev;
      }
      return formData.unidadesMedidaAdicionales.map((_, index) => prev[index] || {});
    });
  }, [formData.unidadesMedidaAdicionales]);

  useEffect(() => {
    const defaultUnit = getDefaultUnitForType(productType);
    setFormData(prev => ({
      ...prev,
      unidad: defaultUnit,
      tipoUnidadMedida: inferMeasureTypeFromUnitCode(defaultUnit),
      unidadesMedidaAdicionales: []
    }));
    setAdditionalUnitErrors([]);
  }, [productType, getDefaultUnitForType, inferMeasureTypeFromUnitCode]);

  const initializeFormForNewProduct = useCallback(() => {
    const defaultUnit = getDefaultUnitForType('BIEN');
    const inferredType = inferMeasureTypeFromUnitCode(defaultUnit);
    setFormData(buildDefaultFormData(defaultUnit, inferredType, defaultCategoryName));
    setPrecioInput('0.00');
    setImagePreview('');
    setProductType('BIEN');
    setAdditionalUnitErrors([]);
    setErrors({});
    setUnitInfoMessage(null);
    setIsDescriptionExpanded(false);
  }, [defaultCategoryName, getDefaultUnitForType, inferMeasureTypeFromUnitCode]);

  const initializeFormFromProduct = useCallback(
    (productData: Product) => {
      const additionalUnits =
        productData.unidadesMedidaAdicionales?.map(unit => ({
          unidadCodigo: unit.unidadCodigo,
          factorConversion: unit.factorConversion
        })) || [];
      const inferredType = productData.tipoUnidadMedida || inferMeasureTypeFromUnitCode(productData.unidad);
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
    },
    [inferMeasureTypeFromUnitCode, sortedUnits]
  );

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
  }, [
    isOpen,
    product,
    hasInitializedForm,
    initializeFormForNewProduct,
    initializeFormFromProduct
  ]);

  const validateForm = useCallback(() => {
    const newErrors: FormError = {};
    const newAdditionalUnitErrors: AdditionalUnitError[] = [];

    if (isFieldVisible('nombre') && !formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }

    if (isFieldVisible('codigo')) {
      if (!formData.codigo.trim()) {
        newErrors.codigo = 'El código es requerido';
      } else {
        const codigoDuplicado = allProducts.find(
          p =>
            p.codigo.toLowerCase() === formData.codigo.trim().toLowerCase() &&
            p.id !== product?.id
        );
        if (codigoDuplicado) {
          newErrors.codigo = `El código "${formData.codigo}" ya existe en el producto "${codigoDuplicado.nombre}"`;
        }
      }
    }

    if (isFieldVisible('impuesto') && (!formData.impuesto || formData.impuesto.trim() === '')) {
      newErrors.impuesto = 'El impuesto es requerido';
    }

    if (isFieldVisible('unidad') && (!formData.unidad || formData.unidad.trim() === '')) {
      newErrors.unidad = 'La unidad de medida es requerida';
    }

    if (!formData.tipoUnidadMedida) {
      newErrors.tipoUnidadMedida = 'Selecciona una familia de unidades';
    }

    if (
      isFieldVisible('establecimiento') &&
      !formData.disponibleEnTodos &&
      formData.establecimientoIds.length === 0
    ) {
      newErrors.establecimientoIds = 'Debes asignar al menos un establecimiento o marcar "Disponible en todos"';
    }

    if (isFieldVisible('categoria') && isFieldRequired('categoria') && !formData.categoria) {
      newErrors.categoria = 'La categoría es requerida';
    }

    if (isFieldVisible('precio')) {
      if (formData.precio < 0) {
        newErrors.precio = 'El precio no puede ser negativo';
      }
      if (isFieldRequired('precio') && formData.precio === 0) {
        newErrors.precio = 'El precio es requerido';
      }
    }

    if (isFieldVisible('descripcion') && isFieldRequired('descripcion') && !formData.descripcion?.trim()) {
      newErrors.descripcion = 'La descripción es requerida';
    }

    if (isFieldVisible('codigoBarras') && isFieldRequired('codigoBarras') && !formData.codigoBarras?.trim()) {
      newErrors.codigoBarras = 'El código de barras es requerido';
    }

    if (isFieldVisible('marca') && isFieldRequired('marca') && !formData.marca?.trim()) {
      newErrors.marca = 'La marca es requerida';
    }

    if (isFieldVisible('modelo') && isFieldRequired('modelo') && !formData.modelo?.trim()) {
      newErrors.modelo = 'El modelo es requerido';
    }

    if (isFieldVisible('peso') && isFieldRequired('peso') && formData.peso === 0) {
      newErrors.peso = 'El peso es requerido';
    }

    if (isFieldVisible('precioCompra') && isFieldRequired('precioCompra') && formData.precioCompra === 0) {
      newErrors.precioCompra = 'El precio de compra es requerido';
    }

    if (isFieldVisible('alias') && isFieldRequired('alias') && !formData.alias?.trim()) {
      newErrors.alias = 'El alias es requerido';
    }

    if (
      isFieldVisible('tipoExistencia') &&
      isFieldRequired('tipoExistencia') &&
      !formData.tipoExistencia
    ) {
      newErrors.tipoExistencia = 'El tipo de existencia es requerido';
    }

    const seenUnits = new Set<string>();
    formData.unidadesMedidaAdicionales.forEach((unit, index) => {
      const rowErrors: AdditionalUnitError = {};

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
  }, [
    allProducts,
    formData,
    isFieldRequired,
    isFieldVisible,
    product,
    sortedUnits
  ]);

  const handleSubmit = useCallback(
    async (event?: React.FormEvent | React.MouseEvent) => {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }

      if (!validateForm()) return;

      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
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
    },
    [formData, imagePreview, onClose, onSave, validateForm]
  );

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  return {
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
    filteredUnitsForType,
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
  };
};
