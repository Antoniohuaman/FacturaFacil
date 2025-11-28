import { getTodayISO } from '../../comprobantes-electronicos/utils/dateUtils';
import type { CobranzaFilters } from '../models/cobranzas.types';

const today = getTodayISO();
const from = new Date();
from.setDate(from.getDate() - 30);
const defaultFrom = from.toISOString().split('T')[0];

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
