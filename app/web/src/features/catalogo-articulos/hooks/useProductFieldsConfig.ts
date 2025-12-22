// Hook para gestionar la configuración de campos del formulario de productos
import { useState, useEffect } from 'react';
import { ensureEmpresaId, lsKey } from '../../../shared/tenant';

export interface ProductFieldConfig {
  id: string;
  label: string;
  icon: string;
  visible: boolean;
  required: boolean;
  isSystemRequired: boolean; // No se puede deshabilitar
  category: 'basic' | 'pricing' | 'inventory' | 'codes' | 'advanced';
}

const DEFAULT_FIELDS_CONFIG: ProductFieldConfig[] = [
  // CAMPOS OBLIGATORIOS DEL SISTEMA (no se pueden deshabilitar)
  { id: 'tipoProducto', label: 'Tipo de producto', icon: '📦', visible: true, required: true, isSystemRequired: true, category: 'basic' },
  { id: 'nombre', label: 'Nombre', icon: '📝', visible: true, required: true, isSystemRequired: true, category: 'basic' },
  { id: 'codigo', label: 'Código/SKU', icon: '🔢', visible: true, required: true, isSystemRequired: true, category: 'basic' },
  { id: 'unidad', label: 'Unidad de medida', icon: '📏', visible: true, required: true, isSystemRequired: true, category: 'basic' },
  { id: 'impuesto', label: 'Impuesto', icon: '💰', visible: true, required: true, isSystemRequired: true, category: 'basic' },
  { id: 'establecimiento', label: 'Establecimiento', icon: '🏪', visible: true, required: true, isSystemRequired: true, category: 'basic' },
  
  // CAMPOS PERSONALIZABLES (el usuario decide si mostrar y si son obligatorios)
  { id: 'categoria', label: 'Categoría', icon: '🏷️', visible: true, required: false, isSystemRequired: false, category: 'basic' },
  { id: 'descripcion', label: 'Descripción', icon: '📝', visible: true, required: false, isSystemRequired: false, category: 'basic' },
  { id: 'codigoBarras', label: 'Código de barras', icon: '🏷️', visible: true, required: false, isSystemRequired: false, category: 'codes' },
  { id: 'marca', label: 'Marca', icon: '🏭', visible: false, required: false, isSystemRequired: false, category: 'advanced' },
  { id: 'modelo', label: 'Modelo', icon: '📋', visible: false, required: false, isSystemRequired: false, category: 'advanced' },
  { id: 'imagen', label: 'Imagen', icon: '🎨', visible: false, required: false, isSystemRequired: false, category: 'advanced' },
  { id: 'peso', label: 'Peso', icon: '⚖️', visible: false, required: false, isSystemRequired: false, category: 'advanced' },
  { id: 'precioCompra', label: 'Precio de compra', icon: '💸', visible: false, required: false, isSystemRequired: false, category: 'pricing' },
  { id: 'porcentajeGanancia', label: '% Ganancia', icon: '📈', visible: false, required: false, isSystemRequired: false, category: 'pricing' },
  { id: 'codigoSunat', label: 'Código SUNAT', icon: '🏛️', visible: false, required: false, isSystemRequired: false, category: 'codes' },
  { id: 'codigoFabrica', label: 'Código de fábrica', icon: '🏭', visible: false, required: false, isSystemRequired: false, category: 'codes' },
  { id: 'descuentoProducto', label: 'Descuento', icon: '💸', visible: false, required: false, isSystemRequired: false, category: 'pricing' },
  { id: 'alias', label: 'Nombre alternativo', icon: '📛', visible: false, required: false, isSystemRequired: false, category: 'advanced' },
  { id: 'tipoExistencia', label: 'Tipo de existencia', icon: '📦', visible: false, required: false, isSystemRequired: false, category: 'inventory' },
];

const STORAGE_KEY = 'productFieldsConfig';

export const useProductFieldsConfig = () => {
  function migrateLegacyToNamespaced() {
    try {
      const empresaId = ensureEmpresaId();
      const markerKey = `${empresaId}:catalog_migrated`;
      const migrated = localStorage.getItem(markerKey);
      if (migrated === 'v1') return;

      const legacyKeys = [
        'catalog_products',
        'catalog_categories',
        'catalog_packages',
        // 'catalog_movimientos' removido: este módulo no gestiona stock
        'productTableColumns',
        'productTableColumnsVersion',
        'productFieldsConfig'
      ];

      for (const key of legacyKeys) {
        const namespaced = `${empresaId}:${key}`;
        const hasNamespaced = localStorage.getItem(namespaced) !== null;
        const legacyValue = localStorage.getItem(key);
        if (!hasNamespaced && legacyValue !== null) {
          localStorage.setItem(namespaced, legacyValue);
          localStorage.removeItem(key);
        }
      }

      localStorage.setItem(markerKey, 'v1');
    } catch (err) {
      console.warn('Migración legacy->namespaced (FieldsConfig) omitida por empresaId inválido o error:', err);
    }
  }

  const [fieldsConfig, setFieldsConfig] = useState<ProductFieldConfig[]>(DEFAULT_FIELDS_CONFIG);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Cargar configuración guardada del localStorage
  useEffect(() => {
    try {
      migrateLegacyToNamespaced();
      const savedConfig = localStorage.getItem(lsKey(STORAGE_KEY));
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          // Filtrar campos obsoletos para evitar inconsistencias en configuraciones guardadas
          const filteredConfig = parsed.filter((field: ProductFieldConfig) =>
            field.id !== 'cantidad' && field.id !== 'tipoExistencia' && field.id !== 'precio'
          );
          setFieldsConfig(filteredConfig);
        } catch (error) {
          console.error('Error al cargar configuración de campos:', error);
        }
      }
    } catch (e) {
      console.warn('No se pudo leer configuración de campos (empresaId inválido?):', e);
    }
  }, []);

  // Guardar configuración en localStorage
  const saveConfig = (config: ProductFieldConfig[]) => {
    setFieldsConfig(config);
    try {
      localStorage.setItem(lsKey(STORAGE_KEY), JSON.stringify(config));
    } catch (e) {
      console.warn('No se pudo persistir configuración de campos (empresaId inválido?):', e);
    }
  };

  // Toggle visibilidad de un campo
  const toggleFieldVisibility = (fieldId: string) => {
    const newConfig = fieldsConfig.map(field => {
      if (field.id === fieldId && !field.isSystemRequired) {
        return { ...field, visible: !field.visible };
      }
      return field;
    });
    saveConfig(newConfig);
  };

  // Toggle obligatoriedad de un campo
  const toggleFieldRequired = (fieldId: string) => {
    const newConfig = fieldsConfig.map(field => {
      if (field.id === fieldId && !field.isSystemRequired && field.visible) {
        return { ...field, required: !field.required };
      }
      return field;
    });
    saveConfig(newConfig);
  };

  // Restablecer a configuración por defecto
  const resetToDefault = () => {
    saveConfig(DEFAULT_FIELDS_CONFIG);
  };

  // Obtener solo campos visibles
  const getVisibleFields = () => {
    return fieldsConfig.filter(field => field.visible);
  };

  // Obtener solo campos obligatorios
  const getRequiredFields = () => {
    return fieldsConfig.filter(field => field.required && field.visible);
  };

  // Verificar si un campo es visible
  const isFieldVisible = (fieldId: string) => {
    const field = fieldsConfig.find(f => f.id === fieldId);
    return field?.visible ?? false;
  };

  // Verificar si un campo es obligatorio
  const isFieldRequired = (fieldId: string) => {
    const field = fieldsConfig.find(f => f.id === fieldId);
    return field?.required ?? false;
  };

  return {
    fieldsConfig,
    isPanelOpen,
    setIsPanelOpen,
    toggleFieldVisibility,
    toggleFieldRequired,
    resetToDefault,
    getVisibleFields,
    getRequiredFields,
    isFieldVisible,
    isFieldRequired,
  };
};
