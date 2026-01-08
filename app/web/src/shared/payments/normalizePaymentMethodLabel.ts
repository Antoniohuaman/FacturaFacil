export const normalizePaymentMethodLabel = (text: string): string => {
  const fallback = text
    .replace(/Cr�dito/g, 'Crédito')
    .replace(/d�as/g, 'días');
  try {
    return decodeURIComponent(escape(fallback));
  } catch {
    return fallback;
  }
};
