import type { PriceCalculation, VolumePrice, VolumeRange } from '../../models/PriceTypes';
import { formatPrice } from './formatting';

export const formatVolumeRanges = (ranges: VolumeRange[]): string => {
  if (ranges.length === 0) return 'Sin rangos';
  const sortedRanges = [...ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  return sortedRanges.map(range => {
    const maxQty = range.maxQuantity === null ? '+' : `-${range.maxQuantity}`;
    return `${range.minQuantity}${maxQty}: ${formatPrice(range.price)}`;
  }).join(' • ');
};

export const getVolumePreview = (ranges: VolumeRange[], maxItems = 2): string => {
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

export const calculateVolumePrice = (volumePrice: VolumePrice, quantity: number): PriceCalculation => {
  const sortedRanges = [...volumePrice.ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  const applicableRange = sortedRanges.find(range => {
    const meetsMin = quantity >= range.minQuantity;
    const meetsMax = range.maxQuantity === null || quantity <= range.maxQuantity;
    return meetsMin && meetsMax;
  });
  if (!applicableRange) {
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

export const calculatePriceForQuantity = (ranges: VolumeRange[], quantity: number): number | null => {
  if (ranges.length === 0) return null;
  const sortedRanges = [...ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  for (const range of sortedRanges) {
    if (quantity >= range.minQuantity && (range.maxQuantity === null || quantity <= range.maxQuantity)) {
      return range.price;
    }
  }
  return null;
};

export const getOptimalQuantityBreakdown = (ranges: VolumeRange[]): Array<{ range: string; price: number; savings?: string; }> => {
  if (ranges.length === 0) return [];
  const sortedRanges = [...ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  const breakdown = [] as Array<{ range: string; price: number; savings?: string; }>;
  for (let i = 0; i < sortedRanges.length; i += 1) {
    const range = sortedRanges[i];
    const rangeStr = range.maxQuantity === null ? `${range.minQuantity}+` : `${range.minQuantity}-${range.maxQuantity}`;
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

export const validateVolumeRanges = (ranges: VolumeRange[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (ranges.length === 0) {
    errors.push('Debe tener al menos un rango de cantidad');
    return { isValid: false, errors };
  }
  const sortedRanges = [...ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  for (let i = 0; i < sortedRanges.length; i += 1) {
    const current = sortedRanges[i];
    if (current.minQuantity <= 0) {
      errors.push(`El rango ${i + 1} debe tener cantidad mínima mayor a 0`);
    }
    if (current.maxQuantity !== null && current.maxQuantity <= current.minQuantity) {
      errors.push(`El rango ${i + 1}: cantidad máxima debe ser mayor a la mínima`);
    }
    if (current.price <= 0) {
      errors.push(`El rango ${i + 1} debe tener precio mayor a 0`);
    }
    if (i > 0) {
      const previous = sortedRanges[i - 1];
      if (previous.maxQuantity !== null && current.minQuantity !== previous.maxQuantity + 1) {
        errors.push(`Hay un vacío entre los rangos ${i} y ${i + 1}`);
      }
    }
  }
  return { isValid: errors.length === 0, errors };
};

export const generateDefaultVolumeRanges = (): VolumeRange[] => ([
  { id: '1', minQuantity: 1, maxQuantity: 10, price: 0 },
  { id: '2', minQuantity: 11, maxQuantity: 50, price: 0 },
  { id: '3', minQuantity: 51, maxQuantity: null, price: 0 }
]);

export const formatVolumeRange = (range: VolumeRange): string => (
  range.maxQuantity === null ? `${range.minQuantity}+ unidades` : `${range.minQuantity} - ${range.maxQuantity} unidades`
);

export const getLowestVolumePrice = (volumePrice: VolumePrice): number => Math.min(...volumePrice.ranges.map(r => r.price));
export const getHighestVolumePrice = (volumePrice: VolumePrice): number => Math.max(...volumePrice.ranges.map(r => r.price));
