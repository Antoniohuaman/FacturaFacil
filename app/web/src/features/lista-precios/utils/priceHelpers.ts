import type { Column, Product, Price, VolumePrice, VolumeRange, PriceCalculation } from '../models/PriceTypes';

export const generateColumnId = (columns: Column[]): string => {
  return `P${columns.length + 1}`;
};

export const getNextOrder = (columns: Column[]): number => {
  if (columns.length === 0) return 1;
  return Math.max(...columns.map(c => c.order)) + 1;
};

export const filterVisibleColumns = (columns: Column[]): Column[] => {
  return columns.filter(col => col.visible).sort((a, b) => a.order - b.order);
};

export const findBaseColumn = (columns: Column[]): Column | undefined => {
  return columns.find(col => col.isBase);
};

export const filterProducts = (products: Product[], searchTerm: string): Product[] => {
  if (!searchTerm.trim()) return products;
  
  const term = searchTerm.toLowerCase();
  return products.filter(product => 
    product.sku.toLowerCase().includes(term) ||
    product.name.toLowerCase().includes(term)
  );
};

export const countColumnsByMode = (columns: Column[], mode: 'fixed' | 'volume'): number => {
  return columns.filter(c => c.mode === mode).length;
};

export const validateColumnConfiguration = (columns: Column[]): {
  hasBase: boolean;
  hasVisible: boolean;
  isValid: boolean;
} => {
  const hasBase = columns.some(c => c.isBase);
  const hasVisible = columns.some(c => c.visible);
  const isValid = hasBase && hasVisible;
  
  return { hasBase, hasVisible, isValid };
};

export const formatPrice = (value: number): string => {
  return `S/ ${value.toFixed(2)}`;
};

export const formatVolumeRanges = (ranges: VolumeRange[]): string => {
  if (ranges.length === 0) return 'Sin rangos';
  
  const sortedRanges = [...ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  
  return sortedRanges.map(range => {
    const maxQty = range.maxQuantity === null ? '+' : `-${range.maxQuantity}`;
    const formattedPrice = formatPrice(range.price);
    return `${range.minQuantity}${maxQty}: ${formattedPrice}`;
  }).join(' • ');
};

export const getVolumePreview = (ranges: VolumeRange[], maxItems: number = 2): string => {
  if (ranges.length === 0) return 'Sin rangos configurados';
  
  const sortedRanges = [...ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  const previewRanges = sortedRanges.slice(0, maxItems);
  
  const preview = previewRanges.map(range => {
    let rangeText = '';
    if (range.maxQuantity === null) {
      rangeText = `${range.minQuantity}+ und.`;
    } else if (range.minQuantity === range.maxQuantity) {
      rangeText = `${range.minQuantity} und.`;
    } else {
      rangeText = `${range.minQuantity}-${range.maxQuantity} und.`;
    }
    return `${rangeText} → ${formatPrice(range.price)}`;
  }).join(' | ');
  
  if (sortedRanges.length > maxItems) {
    return `${preview} | +${sortedRanges.length - maxItems} rango${sortedRanges.length - maxItems > 1 ? 's' : ''} más`;
  }
  
  return preview;
};

// Función para mostrar todos los rangos en el tooltip
export const getVolumeTooltip = (ranges: VolumeRange[]): string => {
  if (ranges.length === 0) return 'Sin rangos configurados';
  
  const sortedRanges = [...ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  
  return sortedRanges.map((range, index) => {
    let rangeText = '';
    if (range.maxQuantity === null) {
      rangeText = `Desde ${range.minQuantity} unidades en adelante`;
    } else if (range.minQuantity === range.maxQuantity) {
      rangeText = `Exactamente ${range.minQuantity} unidad${range.minQuantity > 1 ? 'es' : ''}`;
    } else {
      rangeText = `De ${range.minQuantity} a ${range.maxQuantity} unidades`;
    }
    return `${index + 1}. ${rangeText}: ${formatPrice(range.price)} c/u`;
  }).join('\n');
};

// Función para obtener el rango de precios (min-max) de un precio por volumen
export const getPriceRange = (ranges: VolumeRange[]): string => {
  if (ranges.length === 0) return 'Sin precios';
  
  const prices = ranges.map(r => r.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  if (minPrice === maxPrice) {
    return formatPrice(minPrice);
  }
  
  return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

export const calculatePriceForQuantity = (ranges: VolumeRange[], quantity: number): number | null => {
  if (ranges.length === 0) return null;
  
  const sortedRanges = [...ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  
  for (const range of sortedRanges) {
    if (quantity >= range.minQuantity && 
        (range.maxQuantity === null || quantity <= range.maxQuantity)) {
      return range.price;
    }
  }
  
  return null;
};

export const getOptimalQuantityBreakdown = (ranges: VolumeRange[]): Array<{
  range: string;
  price: number;
  savings?: string;
}> => {
  if (ranges.length === 0) return [];
  
  const sortedRanges = [...ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  const breakdown = [];
  
  for (let i = 0; i < sortedRanges.length; i++) {
    const range = sortedRanges[i];
    const rangeStr = range.maxQuantity === null 
      ? `${range.minQuantity}+` 
      : `${range.minQuantity}-${range.maxQuantity}`;
    
    let savings = '';
    if (i > 0) {
      const previousPrice = sortedRanges[0].price;
      const currentPrice = range.price;
      const savingsAmount = previousPrice - currentPrice;
      const savingsPercent = ((savingsAmount / previousPrice) * 100).toFixed(1);
      savings = `Ahorra ${formatPrice(savingsAmount)} (${savingsPercent}%)`;
    }
    
    breakdown.push({
      range: rangeStr,
      price: range.price,
      savings: savings || undefined
    });
  }
  
  return breakdown;
};

export const removeProductPricesForColumn = (products: Product[], columnId: string): Product[] => {
  return products.map(product => ({
    ...product,
    prices: Object.fromEntries(
      Object.entries(product.prices).filter(([key]) => key !== columnId)
    )
  }));
};

// ====== FUNCIONES PARA MATRIZ POR VOLUMEN ======

/**
 * Calcula el precio unitario basado en la cantidad para una matriz por volumen
 */
export const calculateVolumePrice = (volumePrice: VolumePrice, quantity: number): PriceCalculation => {
  // Ordenar rangos por cantidad mínima
  const sortedRanges = [...volumePrice.ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  
  // Encontrar el rango aplicable
  const applicableRange = sortedRanges.find(range => {
    const meetsMin = quantity >= range.minQuantity;
    const meetsMax = range.maxQuantity === null || quantity <= range.maxQuantity;
    return meetsMin && meetsMax;
  });

  if (!applicableRange) {
    // Si no encuentra rango, usar el primer rango como fallback
    const fallbackRange = sortedRanges[0];
    return {
      unitPrice: fallbackRange.price,
      totalPrice: fallbackRange.price * quantity,
      appliedRange: fallbackRange
    };
  }

  return {
    unitPrice: applicableRange.price,
    totalPrice: applicableRange.price * quantity,
    appliedRange: applicableRange
  };
};

/**
 * Obtiene el precio para cualquier tipo (fijo o volumen)
 */
export const calculatePrice = (price: Price, quantity: number = 1): PriceCalculation => {
  if (price.type === 'fixed') {
    return {
      unitPrice: price.value,
      totalPrice: price.value * quantity
    };
  } else {
    return calculateVolumePrice(price, quantity);
  }
};

/**
 * Valida si los rangos de volumen están bien configurados
 */
export const validateVolumeRanges = (ranges: VolumeRange[]): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (ranges.length === 0) {
    errors.push('Debe tener al menos un rango de cantidad');
    return { isValid: false, errors };
  }

  // Ordenar por cantidad mínima
  const sortedRanges = [...ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  
  for (let i = 0; i < sortedRanges.length; i++) {
    const current = sortedRanges[i];
    
    // Validar que minQuantity sea positivo
    if (current.minQuantity <= 0) {
      errors.push(`El rango ${i + 1} debe tener cantidad mínima mayor a 0`);
    }
    
    // Validar que maxQuantity sea mayor que minQuantity (si no es null)
    if (current.maxQuantity !== null && current.maxQuantity <= current.minQuantity) {
      errors.push(`El rango ${i + 1}: cantidad máxima debe ser mayor a la mínima`);
    }
    
    // Validar precio positivo
    if (current.price <= 0) {
      errors.push(`El rango ${i + 1} debe tener precio mayor a 0`);
    }
    
    // Validar continuidad entre rangos
    if (i > 0) {
      const previous = sortedRanges[i - 1];
      if (previous.maxQuantity !== null && current.minQuantity !== previous.maxQuantity + 1) {
        errors.push(`Hay un vacío entre los rangos ${i} y ${i + 1}`);
      }
    }
  }
  
  // Validar que el último rango sea abierto (maxQuantity = null) o que cubra un rango específico
  const lastRange = sortedRanges[sortedRanges.length - 1];
  if (lastRange.maxQuantity === null && sortedRanges.length > 1) {
    // Está bien, el último rango es abierto
  } else if (lastRange.maxQuantity !== null) {
    // Todos los rangos son cerrados, también está bien
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Genera rangos de ejemplo para una nueva matriz por volumen
 */
export const generateDefaultVolumeRanges = (): VolumeRange[] => {
  return [
    {
      id: '1',
      minQuantity: 1,
      maxQuantity: 10,
      price: 0
    },
    {
      id: '2', 
      minQuantity: 11,
      maxQuantity: 50,
      price: 0
    },
    {
      id: '3',
      minQuantity: 51,
      maxQuantity: null, // "en adelante"
      price: 0
    }
  ];
};

/**
 * Formatea un rango de volumen para mostrar
 */
export const formatVolumeRange = (range: VolumeRange): string => {
  if (range.maxQuantity === null) {
    return `${range.minQuantity}+ unidades`;
  }
  return `${range.minQuantity} - ${range.maxQuantity} unidades`;
};

/**
 * Obtiene el precio más bajo de una matriz por volumen
 */
export const getLowestVolumePrice = (volumePrice: VolumePrice): number => {
  return Math.min(...volumePrice.ranges.map(r => r.price));
};

/**
 * Obtiene el precio más alto de una matriz por volumen  
 */
export const getHighestVolumePrice = (volumePrice: VolumePrice): number => {
  return Math.max(...volumePrice.ranges.map(r => r.price));
};