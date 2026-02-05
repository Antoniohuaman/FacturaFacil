import { useState, useMemo, useCallback, useEffect } from 'react';
import type React from 'react';
import type { Category } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import type { Unit } from '../../configuracion-sistema/modelos';
import type { Establecimiento } from '../../configuracion-sistema/modelos/Establecimiento';
import type { Product, ProductFormData } from '../models/types';
import type { ProductInput } from './useProductStore';
import {
  BARCODE_MIN_LENGTH,
  BARCODE_MAX_LENGTH,
  isBarcodeValueValid,
  normalizeBarcodeValue
} from '../utils/formatters';
type UnitFamily = Unit['category'];

export type ProductType = 'BIEN' | 'SERVICIO';

export type FormError = {
  [K in keyof ProductFormData]?: string;
} & {
  establecimientoIds?: string;
  defaultTaxLabel?: string;
};

export type AdditionalUnitError = { unidad?: string; factor?: string };

interface UseProductFormParams {
  isOpen: boolean;
  product?: Product;
  categories: Category[];
  availableUnits: Unit[];
  allProducts: Product[];
  activeEstablecimientos: Establecimiento[];
  defaultEstablecimientoId?: string;
  isFieldVisible: (fieldId: string) => boolean;
  isFieldRequired: (fieldId: string) => boolean;
  onSave: (productData: ProductInput) => void;
  onClose: () => void;
  defaultTaxLabel?: string;
}

const buildDefaultFormData = (
  defaultUnit: Product['unidad'],
  defaultUnitSymbol: string | undefined,
  defaultUnitName: string | undefined,
  defaultCategoryName: string,
  defaultEstablecimientoIds: string[],
  defaultTaxLabel?: string
): ProductFormData => ({
  nombre: '',
  codigo: '',
  unidad: defaultUnit,
  unidadSymbol: defaultUnitSymbol,
  unidadName: defaultUnitName,
  unidadesMedidaAdicionales: [],
  categoria: defaultCategoryName,
  impuesto: defaultTaxLabel ?? 'IGV (18.00%)',
  descripcion: '',
  establecimientoIds: defaultEstablecimientoIds,
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
  defaultTaxLabel,
  product,
  categories,
  availableUnits,
  allProducts,
  activeEstablecimientos,
  defaultEstablecimientoId,
  isFieldVisible,
  isFieldRequired,
  onSave,
  onClose
}: UseProductFormParams) => {
  const resolveFamilyLabel = useCallback((family: UnitFamily): string => {
    switch (family) {
      case 'SERVICIOS':
        return 'Servicios';
      case 'TIME':
        return 'Tiempos';
      case 'WEIGHT':
        return 'Pesos';
      case 'VOLUME':
        return 'Volúmenes';
      case 'LENGTH':
        return 'Longitudes';
      case 'AREA':
        return 'Áreas';
      case 'ENERGY':
        return 'Energías';
      case 'QUANTITY':
        return 'Cantidades';
      case 'PACKAGING':
        return 'Empaques';
      default:
        return family;
    }
  }, []);

  const resolveUnitSnapshot = useCallback(
    (code?: string) => {
      const normalized = (code ?? '').trim();
      if (!normalized) {
        return { symbol: undefined, name: undefined };
      }
      const unit = availableUnits.find(u => u.code === normalized);
      return {
        symbol: unit?.symbol,
        name: unit?.name
      };
    },
    [availableUnits]
  );
  const activeEstablecimientoIds = useMemo(
    () => activeEstablecimientos.filter(est => est.estaActivoEstablecimiento !== false).map(est => est.id),
    [activeEstablecimientos]
  );

  const resolvedDefaultEstablecimientoId = useMemo(() => {
    if (defaultEstablecimientoId && activeEstablecimientoIds.includes(defaultEstablecimientoId)) {
      return defaultEstablecimientoId;
    }
    const main = activeEstablecimientos.find(
      est => est.estaActivoEstablecimiento !== false && est.isMainEstablecimiento
    );
    return main?.id ?? activeEstablecimientoIds[0] ?? '';
  }, [activeEstablecimientos, activeEstablecimientoIds, defaultEstablecimientoId]);

  const uniqueIds = useCallback((ids: string[]) => {
    const set = new Set<string>();
    ids.forEach(id => {
      const trimmed = String(id || '').trim();
      if (trimmed) {
        set.add(trimmed);
      }
    });
    return Array.from(set);
  }, []);

  const resolveDefaultEnabledEstablecimientos = useCallback((): string[] => {
    if (activeEstablecimientoIds.length === 1) {
      return [activeEstablecimientoIds[0]];
    }
    if (resolvedDefaultEstablecimientoId) {
      return [resolvedDefaultEstablecimientoId];
    }
    return [];
  }, [activeEstablecimientoIds, resolvedDefaultEstablecimientoId]);

  const sortedUnits = useMemo(() => {
    return [...availableUnits].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [availableUnits]);

  const visibleUnits = useMemo(() => {
    return availableUnits.filter(unit => unit.isActive !== false && unit.isVisible !== false);
  }, [availableUnits]);

  const sortedVisibleUnits = useMemo(() => {
    return [...visibleUnits].sort((a, b) => {
      const displayDelta = (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
      if (displayDelta !== 0) return displayDelta;
      return a.name.localeCompare(b.name);
    });
  }, [visibleUnits]);

  const defaultCategoryName = useMemo(() => categories[0]?.nombre || '', [categories]);

  const getDefaultUnitForType = useCallback(
    (type: ProductType): Product['unidad'] => {
      if (availableUnits.length === 0) {
        return '' as Product['unidad'];
      }

      if (type === 'SERVICIO') {
        const serviceUnits = availableUnits.filter(unit => unit.category === 'SERVICIOS');
        const serviceVisible = serviceUnits.filter(unit => unit.isActive !== false && unit.isVisible !== false);
        const pool = serviceVisible.length ? serviceVisible : serviceUnits;
        const defaultService = pool.find(unit => unit.isDefault) ?? pool[0];
        if (defaultService) return defaultService.code as Product['unidad'];
      }

      const favoriteUnit = sortedVisibleUnits.find(unit => unit.isFavorite) ?? sortedUnits.find(unit => unit.isFavorite);
      if (favoriteUnit) return favoriteUnit.code as Product['unidad'];

      const defaultUnit = sortedVisibleUnits.find(unit => unit.isDefault) ?? sortedVisibleUnits[0];
      if (defaultUnit) return defaultUnit.code as Product['unidad'];

      return (sortedUnits[0]?.code ?? '') as Product['unidad'];
    },
    [availableUnits, sortedUnits, sortedVisibleUnits]
  );

  const resolveFamilyFromCode = useCallback(
    (code?: string): UnitFamily => {
      const normalized = (code ?? '').trim();
      if (!normalized) {
        return availableUnits[0]?.category ?? 'QUANTITY';
      }
      const unit = availableUnits.find(u => u.code === normalized);
      return unit?.category ?? availableUnits[0]?.category ?? 'QUANTITY';
    },
    [availableUnits]
  );

  const initialUnit = getDefaultUnitForType('BIEN');
  const initialUnitFamily = resolveFamilyFromCode(initialUnit);
  const initialUnitSnapshot = resolveUnitSnapshot(initialUnit);

  const [formData, setFormData] = useState<ProductFormData>(
    () =>
      buildDefaultFormData(
        initialUnit,
        initialUnitSnapshot.symbol,
        initialUnitSnapshot.name,
        defaultCategoryName,
        resolveDefaultEnabledEstablecimientos(),
        defaultTaxLabel
      )
  );
  const [productType, setProductType] = useState<ProductType>('BIEN');
  const [selectedUnitFamily, setSelectedUnitFamily] = useState<UnitFamily>(initialUnitFamily);
  const unitFamilies = useMemo(() => {
    const seen = new Set<UnitFamily>();
    const ordered = [...sortedUnits].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    const families = ordered.map(unit => unit.category).filter(category => {
      if (seen.has(category)) return false;
      const hasVisible = visibleUnits.some(u => u.category === category);
      const isSelected = category === selectedUnitFamily;
      if (!hasVisible && !isSelected) return false;
      seen.add(category);
      return true;
    });

    if (!families.length && visibleUnits.length) {
      return Array.from(new Set(visibleUnits.map(unit => unit.category)));
    }
    return families;
  }, [selectedUnitFamily, sortedUnits, visibleUnits]);
  const [errors, setErrors] = useState<FormError>({});
  const [additionalUnitErrors, setAdditionalUnitErrors] = useState<AdditionalUnitError[]>([]);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [unitInfoMessage, setUnitInfoMessage] = useState<string | null>(null);
  const [hasInitializedForm, setHasInitializedForm] = useState(false);

  const filteredUnitsForFamily = useMemo(() => {
    return sortedVisibleUnits.filter(unit => unit.category === selectedUnitFamily);
  }, [sortedVisibleUnits, selectedUnitFamily]);

  const baseUnitOptions = useMemo(() => {
    const primaryOptions = filteredUnitsForFamily.length > 0 ? filteredUnitsForFamily : sortedVisibleUnits;
    const selected = availableUnits.find(unit => unit.code === formData.unidad);
    if (!selected || selected.isVisible !== false) {
      return primaryOptions;
    }
    if (primaryOptions.some(unit => unit.code === selected.code)) {
      return primaryOptions;
    }
    return [selected, ...primaryOptions];
  }, [filteredUnitsForFamily, sortedVisibleUnits, availableUnits, formData.unidad]);

  const isUsingFallbackUnits = filteredUnitsForFamily.length === 0 && sortedVisibleUnits.length > 0;

  const remainingUnitsForAdditional = useMemo(() => {
    const usedCodes = new Set<string>([
      formData.unidad,
      ...formData.unidadesMedidaAdicionales.map(unit => unit.unidadCodigo)
    ]);
    const allowedOptions = filteredUnitsForFamily.length > 0 ? filteredUnitsForFamily : sortedVisibleUnits;
    return allowedOptions.filter(unit => !usedCodes.has(unit.code));
  }, [formData.unidad, formData.unidadesMedidaAdicionales, filteredUnitsForFamily, sortedVisibleUnits]);

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

  const handleUnitFamilyChange = useCallback(
    (nextFamily: UnitFamily) => {
      if (selectedUnitFamily === nextFamily) return;

      const previousAdditionalCount = formData.unidadesMedidaAdicionales.length;
      let sanitizedUnits: ProductFormData['unidadesMedidaAdicionales'] = [];

      // Primero cambia la selección de chip.
      setSelectedUnitFamily(nextFamily);

      setFormData(prev => {
        const visibleForFamily = sortedVisibleUnits.filter(unit => unit.category === nextFamily);
        const hasUnitsForFamily = visibleForFamily.length > 0;
        const availableForFamily = hasUnitsForFamily ? visibleForFamily : sortedVisibleUnits;

        const currentUnit = availableUnits.find(unit => unit.code === prev.unidad);
        const currentUnitValid = currentUnit ? currentUnit.category === nextFamily : false;

        let nextUnit = prev.unidad as Product['unidad'];

        if (!currentUnitValid) {
          const prioritized =
            availableForFamily.find(unit => unit.isDefault) ??
            availableForFamily.find(unit => unit.isFavorite) ??
            availableForFamily[0];
          nextUnit = (prioritized?.code || '') as Product['unidad'];
        }

        // Limpiamos presentaciones que coinciden con la nueva unidad mínima o que no están dentro de la familia.
        sanitizedUnits = prev.unidadesMedidaAdicionales.filter(unit => {
          if (unit.unidadCodigo === nextUnit) return false;
          if (!unit.unidadCodigo) return false;
          if (!hasUnitsForFamily) return false;
          const resolved = availableUnits.find(item => item.code === unit.unidadCodigo);
          if (!resolved) return true;
          return resolved.category === nextFamily;
        });

        const snapshot = resolveUnitSnapshot(nextUnit);
        return {
          ...prev,
          unidad: nextUnit,
          unidadSymbol: snapshot.symbol,
          unidadName: snapshot.name,
          unidadesMedidaAdicionales: sanitizedUnits
        };
      });

      setAdditionalUnitErrors(sanitizedUnits.map(() => ({})));
      setErrors(prev => ({
        ...prev,
        unidad: undefined
      }));

      if (sanitizedUnits.length < previousAdditionalCount) {
        setUnitInfoMessage(
          `Se limpiaron presentaciones que no son compatibles con la familia ${resolveFamilyLabel(nextFamily)}.`
        );
      }
    },
    [formData.unidadesMedidaAdicionales, selectedUnitFamily, sortedVisibleUnits, availableUnits, resolveUnitSnapshot, resolveFamilyLabel]
  );

  const handleBaseUnitChange = useCallback(
    (nextUnit: Product['unidad']) => {
      let removedByBaseChange = false;
      const snapshot = resolveUnitSnapshot(nextUnit);
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
          unidadSymbol: snapshot.symbol,
          unidadName: snapshot.name,
          unidadesMedidaAdicionales: filteredAdditional
        };
      });

      if (removedByBaseChange) {
        setUnitInfoMessage('Se limpiaron presentaciones que coincidían con la nueva unidad mínima.');
      }
    },
    [resolveUnitSnapshot]
  );

  const addAdditionalUnit = useCallback(() => {
    if (remainingUnitsForAdditional.length === 0) return;
    const nextUnit = remainingUnitsForAdditional[0];
    const snapshot = resolveUnitSnapshot(nextUnit.code);
    setFormData(prev => ({
      ...prev,
      unidadesMedidaAdicionales: [
        ...prev.unidadesMedidaAdicionales,
        {
          unidadCodigo: nextUnit.code,
          factorConversion: 1,
          unidadSymbol: snapshot.symbol,
          unidadName: snapshot.name
        }
      ]
    }));
    setAdditionalUnitErrors(prev => [...prev, {}]);
  }, [remainingUnitsForAdditional, resolveUnitSnapshot]);

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
            ? (() => {
                if (field === 'factorConversion') {
                  return {
                    ...unit,
                    factorConversion: Number(value)
                  };
                }
                const snapshot = resolveUnitSnapshot(value);
                return {
                  ...unit,
                  unidadCodigo: value,
                  unidadSymbol: snapshot.symbol,
                  unidadName: snapshot.name
                };
              })()
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
    [resolveUnitSnapshot]
  );

  const getAdditionalUnitOptions = useCallback(
    (rowIndex: number) => {
      const allowedOptions = filteredUnitsForFamily.length > 0 ? filteredUnitsForFamily : sortedVisibleUnits;
      return allowedOptions.filter(unit => {
        if (unit.code === formData.unidad) return false;
        return (
          unit.code === formData.unidadesMedidaAdicionales[rowIndex]?.unidadCodigo ||
          !formData.unidadesMedidaAdicionales.some((other, idx) => idx !== rowIndex && other.unidadCodigo === unit.code)
        );
      });
    },
    [filteredUnitsForFamily, sortedVisibleUnits, formData.unidad, formData.unidadesMedidaAdicionales]
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
    setSelectedUnitFamily(resolveFamilyFromCode(defaultUnit));
    const snapshot = resolveUnitSnapshot(defaultUnit);
    setFormData(prev => ({
      ...prev,
      unidad: defaultUnit,
      unidadSymbol: snapshot.symbol,
      unidadName: snapshot.name,
      unidadesMedidaAdicionales: []
    }));
    setAdditionalUnitErrors([]);
  }, [productType, getDefaultUnitForType, resolveFamilyFromCode, resolveUnitSnapshot]);

  const initializeFormForNewProduct = useCallback(() => {
    const defaultUnit = getDefaultUnitForType('BIEN');
    setSelectedUnitFamily(resolveFamilyFromCode(defaultUnit));
    const snapshot = resolveUnitSnapshot(defaultUnit);
    setFormData(
      buildDefaultFormData(
        defaultUnit,
        snapshot.symbol,
        snapshot.name,
        defaultCategoryName,
        resolveDefaultEnabledEstablecimientos(),
        defaultTaxLabel
      )
    );
    setImagePreview('');
    setProductType('BIEN');
    setAdditionalUnitErrors([]);
    setErrors({});
    setUnitInfoMessage(null);
    setIsDescriptionExpanded(false);
  }, [
    defaultCategoryName,
    defaultTaxLabel,
    getDefaultUnitForType,
    resolveDefaultEnabledEstablecimientos,
    resolveFamilyFromCode,
    resolveUnitSnapshot
  ]);

  const initializeFormFromProduct = useCallback(
    (productData: Product) => {
      const additionalUnits =
        productData.unidadesMedidaAdicionales?.map(unit => ({
          unidadCodigo: unit.unidadCodigo,
          factorConversion: unit.factorConversion,
          unidadSymbol: unit.unidadSymbol,
          unidadName: unit.unidadName
        })) || [];
      const inferredFamily = resolveFamilyFromCode(productData.unidad);
      const familyUnits = sortedVisibleUnits.filter(unit => unit.category === inferredFamily);
      const hasUnitsForFamily = familyUnits.length > 0;
      const sanitizedUnits = additionalUnits.filter(unit => {
        if (!unit.unidadCodigo) return false;
        if (unit.unidadCodigo === productData.unidad) return false;
        if (!hasUnitsForFamily) return true;
        const resolved = availableUnits.find(item => item.code === unit.unidadCodigo);
        if (!resolved) return true;
        return resolved.category === inferredFamily;
      });

      const enabledIdsFromProduct = productData.disponibleEnTodos
        ? activeEstablecimientoIds
        : uniqueIds(productData.establecimientoIds || []);

      const unitSnapshot = resolveUnitSnapshot(productData.unidad);

      setFormData({
        nombre: productData.nombre,
        codigo: productData.codigo,
        unidad: productData.unidad,
        unidadSymbol: productData.unitSymbol ?? unitSnapshot.symbol,
        unidadName: productData.unitName ?? unitSnapshot.name,
        unidadesMedidaAdicionales: sanitizedUnits,
        categoria: productData.categoria,
        impuesto: productData.impuesto || defaultTaxLabel || 'IGV (18.00%)',
        descripcion: productData.descripcion || '',
        establecimientoIds: enabledIdsFromProduct,
        disponibleEnTodos: false,
        alias: productData.alias || '',
        precioCompra: productData.precioCompra || 0,
        porcentajeGanancia: productData.porcentajeGanancia || 0,
        codigoBarras: normalizeBarcodeValue(productData.codigoBarras),
        codigoFabrica: productData.codigoFabrica || '',
        codigoSunat: productData.codigoSunat || '',
        descuentoProducto: productData.descuentoProducto || 0,
        marca: productData.marca || '',
        modelo: productData.modelo || '',
        peso: productData.peso || 0,
        tipoExistencia: productData.tipoExistencia || 'MERCADERIAS'
      });

      setImagePreview(productData.imagen || '');
      setAdditionalUnitErrors(sanitizedUnits.map(() => ({})));
      const productUnit = availableUnits.find(u => u.code === productData.unidad);
      setProductType(productUnit?.category === 'SERVICIOS' ? 'SERVICIO' : 'BIEN');
      setSelectedUnitFamily(inferredFamily);
      setErrors({});
      setUnitInfoMessage(null);
      setIsDescriptionExpanded(false);
    }, [activeEstablecimientoIds, defaultTaxLabel, sortedVisibleUnits, uniqueIds, availableUnits, resolveFamilyFromCode, resolveUnitSnapshot]
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

    // Disponibilidad por establecimiento: no es requerida para guardar.

    if (isFieldVisible('categoria') && isFieldRequired('categoria') && !formData.categoria) {
      newErrors.categoria = 'La categoría es requerida';
    }

    if (isFieldVisible('descripcion') && isFieldRequired('descripcion') && !formData.descripcion?.trim()) {
      newErrors.descripcion = 'La descripción es requerida';
    }

    if (isFieldVisible('codigoBarras')) {
      const normalizedBarcode = normalizeBarcodeValue(formData.codigoBarras);
      const hasBarcodeValue = normalizedBarcode.length > 0;

      if (isFieldRequired('codigoBarras') && !hasBarcodeValue) {
        newErrors.codigoBarras = 'El código de barras es requerido';
      } else if (hasBarcodeValue && !isBarcodeValueValid(normalizedBarcode)) {
        newErrors.codigoBarras = `Ingresa ${BARCODE_MIN_LENGTH} a ${BARCODE_MAX_LENGTH} dígitos numéricos`;
      }
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
        } else if (!isUsingFallbackUnits) {
          const resolved = availableUnits.find(item => item.code === unit.unidadCodigo);
          if (resolved && resolved.category !== selectedUnitFamily) {
            rowErrors.unidad = 'No coincide con la familia seleccionada';
          }
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
    availableUnits,
    isUsingFallbackUnits,
    selectedUnitFamily
  ]);

  const handleSubmit = useCallback(
    async (event?: React.FormEvent | React.MouseEvent) => {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }

      if (!validateForm()) return;

      const EstablecimientoIdsFromForm = formData.disponibleEnTodos
        ? activeEstablecimientoIds
        : uniqueIds(formData.establecimientoIds);

      const normalizedEstablecimientoIds =
        activeEstablecimientoIds.length === 1
          ? [activeEstablecimientoIds[0]]
          : EstablecimientoIdsFromForm.length > 0
            ? EstablecimientoIdsFromForm
            : product
              ? []
              : resolveDefaultEnabledEstablecimientos();

      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        onSave({
          ...formData,
          establecimientoIds: normalizedEstablecimientoIds,
          disponibleEnTodos: false,
          imagen: imagePreview
        });
        onClose();
      } catch (error) {
        console.error('Error saving product:', error);
      } finally {
        setLoading(false);
      }
    },
    [
      activeEstablecimientoIds,
      formData,
      imagePreview,
      onClose,
      onSave,
      product,
      resolveDefaultEnabledEstablecimientos,
      uniqueIds,
      validateForm
    ]
  );

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImagePreview('');
      return;
    }

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
    productType,
    setProductType,
    selectedUnitFamily,
    isDescriptionExpanded,
    setIsDescriptionExpanded,
    unitInfoMessage,
    setUnitInfoMessage,
    showCategoryModal,
    setShowCategoryModal,
    filteredUnitsForFamily,
    unitFamilies,
    baseUnitOptions,
    isUsingFallbackUnits,
    remainingUnitsForAdditional,
    findUnitByCode,
    formatFactorValue,
    handleUnitFamilyChange,
    handleBaseUnitChange,
    addAdditionalUnit,
    removeAdditionalUnit,
    updateAdditionalUnit,
    getAdditionalUnitOptions,
    handleSubmit,
    handleImageUpload
  };
};
