export const normalizePaymentMethodLabel = (text: string): string => {
  const fallback = text
    .replace(/Crédito/g, 'Crédito')
    .replace(/días/g, 'días');
  try {
    return decodeURIComponent(escape(fallback));
  } catch {
    return fallback;
  }
};
