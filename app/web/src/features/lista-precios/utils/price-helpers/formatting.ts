export const formatPrice = (value: number): string => `S/ ${value.toFixed(2)}`;

export const formatDate = (dateString: string): string => new Date(dateString).toLocaleDateString();
