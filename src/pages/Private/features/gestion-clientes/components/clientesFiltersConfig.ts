import type { ClientType, EstadoCliente } from '../models';

export type ClientesFilterValues = {
  search: string;
  tipoCuenta: ClientType | '';
  estadoCliente: EstadoCliente | '';
};

export const CLIENTES_FILTERS_INITIAL_STATE: ClientesFilterValues = {
  search: '',
  tipoCuenta: '',
  estadoCliente: '',
};
