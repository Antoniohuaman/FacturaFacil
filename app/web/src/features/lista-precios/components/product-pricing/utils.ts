export const FALLBACK_UNIT_CODE = 'NIU';

export const cellKey = (sku: string, columnId: string, unitCode: string) => `${sku}::${columnId}::${unitCode}`;

export const getDefaultValidityRange = () => {
  const today = new Date();
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  return {
    validFrom: today.toISOString().split('T')[0],
    validUntil: nextYear.toISOString().split('T')[0]
  };
};
