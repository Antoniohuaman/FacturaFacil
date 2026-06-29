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
import { CATALOGO_54_DETRACCIONES, validarCoherenciaCompleta } from '@/shared/catalogos-sunat';
type UnitFamily = Unit['category'];

export type ProductType = 'BIEN' | 'SERVICIO';

export type FormError = {
  [K in keyof ProductFormData]?: string;
} & {
  establecimientoIds?: string;
  defaultTaxLabel?: string;
};

export type AdditionalUnitError = {
  nombre?: string;
  unidad?: string;
  factor?: string;
  factorWarning?: string;
};

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
  prefillName?: string;
}

const generatePresentationId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `pres-${crypto.randomUUID()}`;
  }
  return `pres-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

const generateDefaultNombre = (
  unitName: string | undefined,
  unitCode: string,
  factor: number
): string => {
  const label = unitName || unitCode;
  const factorStr = Number.isInteger(factor)
    ? String(factor)
    : parseFloat(factor.toFixed(4)).toString();
  return `${label} x ${factorStr}`;
};

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
  tipoExistencia: 'MERCADERIAS',
  sujetoDetraccion: false,
  codigoDetraccion: null,
  aplicaBienNormalizadoGRE: false,
  subpartidaNacionalGRE: '',
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
  onClose,
  prefillName
}: UseProductFormParams) => {
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
        const preferredZZ = pool.find(unit => unit.code === 'ZZ') ?? serviceUnits.find(unit => unit.code === 'ZZ');
        if (preferredZZ) return preferredZZ.code as Product['unidad'];
        const defaultService = pool.find(unit => unit.isDefault) ?? pool[0];
        if (defaultService) return defaultService.code as Product['unidad'];
      }

      const nonServiceUnits = availableUnits.filter(unit => unit.category !== 'SERVICIOS');
      const nonServiceVisible = nonServiceUnits.filter(unit => unit.isActive !== false && unit.isVisible !== false);
      const pool = nonServiceVisible.length ? nonServiceVisible : nonServiceUnits;

      const preferredNIU = pool.find(unit => unit.code === 'NIU') ?? nonServiceUnits.find(unit => unit.code === 'NIU');
      if (preferredNIU) return preferredNIU.code as Product['unidad'];

      const favoriteUnit = pool.find(unit => unit.isFavorite) ?? nonServiceUnits.find(unit => unit.isFavorite);
      if (favoriteUnit) return favoriteUnit.code as Product['unidad'];

      const defaultUnit = pool.find(unit => unit.isDefault) ?? pool[0];
      if (defaultUnit) return defaultUnit.code as Product['unidad'];

      return '' as Product['unidad'];
    },
    [availableUnits]
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

        const snapshot = resolveUnitSnapshot(nextUnit);
        return {
          ...prev,
          unidad: nextUnit,
          unidadSymbol: snapshot.symbol,
          unidadName: snapshot.name
        };
      });

      setErrors(prev => ({
        ...prev,
        unidad: undefined
      }));
    },
    [selectedUnitFamily, sortedVisibleUnits, availableUnits, resolveUnitSnapshot]
  );

  const handleBaseUnitChange = useCallback(
    (nextUnit: Product['unidad']) => {
      const snapshot = resolveUnitSnapshot(nextUnit);
      setFormData(prev => ({
        ...prev,
        unidad: nextUnit,
        unidadSymbol: snapshot.symbol,
        unidadName: snapshot.name
      }));
    },
    [resolveUnitSnapshot]
  );

  const addAdditionalUnit = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      unidadesMedidaAdicionales: [
        ...prev.unidadesMedidaAdicionales,
        {
          id: generatePresentationId(),
          nombre: '',
          unidadCodigo: '',
          factorConversion: 0
        }
      ]
    }));
    setAdditionalUnitErrors(prev => [...prev, {}]);
  }, []);

  const removeAdditionalUnit = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      unidadesMedidaAdicionales: prev.unidadesMedidaAdicionales.filter((_, i) => i !== index)
    }));
    setAdditionalUnitErrors(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateAdditionalUnit = useCallback(
    (index: number, field: 'nombre' | 'unidadCodigo' | 'factorConversion', value: string) => {
      setFormData(prev => ({
        ...prev,
        unidadesMedidaAdicionales: prev.unidadesMedidaAdicionales.map((unit, i) =>
          i === index
            ? (() => {
                if (field === 'factorConversion') {
                  return { ...unit, factorConversion: Number(value) };
                }
                if (field === 'unidadCodigo') {
                  const snapshot = resolveUnitSnapshot(value);
                  return {
                    ...unit,
                    unidadCodigo: value,
                    unidadSymbol: snapshot.symbol,
                    unidadName: snapshot.name
                  };
                }
                return { ...unit, nombre: value };
              })()
            : unit
        )
      }));

      setAdditionalUnitErrors(prev => {
        const next = [...prev];
        const target = { ...(next[index] || {}) };
        if (field === 'factorConversion') {
          delete target.factor;
          delete target.factorWarning;
        } else if (field === 'unidadCodigo') {
          delete target.unidad;
        } else {
          delete target.nombre;
        }
        next[index] = target;
        return next;
      });
    },
    [resolveUnitSnapshot]
  );

  const getAdditionalUnitOptions = useCallback(
    (): Unit[] => sortedVisibleUnits,
    [sortedVisibleUnits]
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
    const nextFormData = buildDefaultFormData(
      defaultUnit,
      snapshot.symbol,
      snapshot.name,
      defaultCategoryName,
      resolveDefaultEnabledEstablecimientos(),
      defaultTaxLabel
    );
    const trimmedPrefill = prefillName?.trim() ?? '';
    if (trimmedPrefill) {
      nextFormData.nombre = trimmedPrefill;
    }
    setFormData(nextFormData);
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
    prefillName,
    resolveDefaultEnabledEstablecimientos,
    resolveFamilyFromCode,
    resolveUnitSnapshot
  ]);

  const initializeFormFromProduct = useCallback(
    (productData: Product) => {
      const additionalUnits =
        productData.unidadesMedidaAdicionales?.map(unit => ({
          id: unit.id || generatePresentationId(),
          nombre:
            unit.nombre ||
            generateDefaultNombre(unit.unidadName, unit.unidadCodigo, unit.factorConversion),
          unidadCodigo: unit.unidadCodigo,
          factorConversion: unit.factorConversion,
          unidadSymbol: unit.unidadSymbol,
          unidadName: unit.unidadName
        })) || [];
      const inferredFamily = resolveFamilyFromCode(productData.unidad);
      const sanitizedUnits = additionalUnits.filter(unit => !!unit.unidadCodigo);

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
        tipoExistencia: productData.tipoExistencia || 'MERCADERIAS',
        sujetoDetraccion: productData.sujetoDetraccion ?? false,
        codigoDetraccion: productData.codigoDetraccion ?? null,
        aplicaBienNormalizadoGRE: productData.aplicaBienNormalizadoGRE ?? false,
        subpartidaNacionalGRE: productData.subpartidaNacionalGRE || '',
      });

      setImagePreview(productData.imagen || '');
      setAdditionalUnitErrors(sanitizedUnits.map(() => ({})));
      const productUnit = availableUnits.find(u => u.code === productData.unidad);
      setProductType(productUnit?.category === 'SERVICIOS' ? 'SERVICIO' : 'BIEN');
      setSelectedUnitFamily(inferredFamily);
      setErrors({});
      setUnitInfoMessage(null);
      setIsDescriptionExpanded(false);
    }, [activeEstablecimientoIds, defaultTaxLabel, uniqueIds, availableUnits, resolveFamilyFromCode, resolveUnitSnapshot]
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

    if (formData.aplicaBienNormalizadoGRE && !formData.subpartidaNacionalGRE) {
      newErrors.subpartidaNacionalGRE = 'Selecciona una subpartida para el bien normalizado GRE';
    }

    if (formData.sujetoDetraccion) {
      if (!formData.codigoDetraccion) {
        newErrors.codigoDetraccion = 'El código de detracción es requerido';
      } else {
        const codigoExiste = CATALOGO_54_DETRACCIONES.some(
          (i) => i.codigo === formData.codigoDetraccion && i.activo
        );
        if (!codigoExiste) {
          newErrors.codigoDetraccion = 'El código de detracción no existe en el Catálogo 54';
        } else {
          // Validar coherencia: tipo de producto + impuesto vs código de detracción
          const coherencia = validarCoherenciaCompleta({
            codigoCat54: formData.codigoDetraccion,
            tipoProducto: productType,
            impuesto: formData.impuesto ?? '',
          });
          if (!coherencia.valido && coherencia.esBloqueo) {
            newErrors.codigoDetraccion = coherencia.mensaje ?? 'Código de detracción incoherente con el tipo de producto o impuesto.';
          }
        }
      }
    }

    const seenComposites = new Set<string>();
    formData.unidadesMedidaAdicionales.forEach((unit, index) => {
      const rowErrors: AdditionalUnitError = {};

      if (!unit.nombre || !unit.nombre.trim()) {
        rowErrors.nombre = 'El nombre de presentación es requerido';
      }

      if (!unit.unidadCodigo) {
        rowErrors.unidad = 'Selecciona una unidad comercial SUNAT';
      }

      const factor = unit.factorConversion;
      if (!factor || !Number.isFinite(factor) || factor <= 0) {
        rowErrors.factor = 'El campo "Contiene" debe ser mayor a 0';
      } else if (factor === 1) {
        rowErrors.factorWarning = 'Verifica si esta presentación realmente equivale a 1 unidad base.';
      } else if (factor < 1) {
        rowErrors.factorWarning =
          'Esta presentación representa una fracción de la unidad base. Úsala solo si realmente vendes o mueves el producto fraccionado.';
      }

      // Detectar duplicado exacto: mismo nombre + unidadCodigo + factor
      if (unit.nombre?.trim() && unit.unidadCodigo && factor > 0 && Number.isFinite(factor)) {
        const composite = `${unit.nombre.trim().toLowerCase()}|${unit.unidadCodigo.toUpperCase()}|${factor}`;
        if (seenComposites.has(composite)) {
          rowErrors.nombre = 'Presentación duplicada (mismo nombre, unidad y contenido)';
        }
        seenComposites.add(composite);
      }

      newAdditionalUnitErrors[index] = rowErrors;
    });

    setErrors(newErrors);
    setAdditionalUnitErrors(newAdditionalUnitErrors);

    const hasAdditionalErrors = newAdditionalUnitErrors.some(
      row => row.nombre || row.unidad || row.factor
    );
    return Object.keys(newErrors).length === 0 && !hasAdditionalErrors;
  }, [
    allProducts,
    formData,
    isFieldRequired,
    isFieldVisible,
    product,
    productType,
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
