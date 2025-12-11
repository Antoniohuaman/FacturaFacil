import type { CobranzaFilters } from '../models/cobranzas.types';
import { getBusinessTodayISODate, shiftBusinessDate } from '@/shared/time/businessTime';

const today = getBusinessTodayISODate();
const defaultFrom = shiftBusinessDate(today, -30);

export const DEFAULT_COBRANZA_FILTERS: CobranzaFilters = {
  rangoFechas: {
    from: defaultFrom,
    to: today,
  },
  cliente: '',
  estado: 'todos',
  formaPago: 'todos',
  medioPago: 'todos',
  sucursal: 'todos',
  cajero: 'todos',
};
