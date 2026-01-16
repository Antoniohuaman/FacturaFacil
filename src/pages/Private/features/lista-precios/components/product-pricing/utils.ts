import { getBusinessDefaultValidityRange } from '@/shared/time/businessTime';

export const FALLBACK_UNIT_CODE = 'NIU';

export const cellKey = (sku: string, columnId: string, unitCode: string) => `${sku}::${columnId}::${unitCode}`;

export const getDefaultValidityRange = () => getBusinessDefaultValidityRange();

