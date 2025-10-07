// Hook para gestionar la configuración de campos del formulario de productos
import { useState, useEffect } from 'react';

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
  { id: 'precio', label: 'Precio de venta', icon: '💵', visible: true, required: false, isSystemRequired: false, category: 'pricing' },
  { id: 'cantidad', label: 'Cantidad/Stock', icon: '📊', visible: true, required: false, isSystemRequired: false, category: 'inventory' },
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
  { id: 'tipoExistencia', label: 'Tipo de existencia', icon: '📦', visible: false, required: false, isSystemRequired: false, category: 'advanced' },
];

const STORAGE_KEY = 'productFieldsConfig';

export const useProductFieldsConfig = () => {
  const [fieldsConfig, setFieldsConfig] = useState<ProductFieldConfig[]>(DEFAULT_FIELDS_CONFIG);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Cargar configuración guardada del localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem(STORAGE_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setFieldsConfig(parsed);
      } catch (error) {
        console.error('Error al cargar configuración de campos:', error);
      }
    }
  }, []);

  // Guardar configuración en localStorage
  const saveConfig = (config: ProductFieldConfig[]) => {
    setFieldsConfig(config);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
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
