import type { ClientData } from '../../models/comprobante.types';

export type ClienteLookupSource = 'RENIEC' | 'SUNAT';

export interface ClienteLookupResult extends ClientData {
  origen: ClienteLookupSource;
}

const normalizeDigits = (value: string): string => value.replace(/\D/g, '');

export const lookupPersonaPorDni = async (dni: string): Promise<ClienteLookupResult | null> => {
  const normalized = normalizeDigits(dni);
  if (normalized.length !== 8) {
    return null;
  }

  const nombre = `Cliente DNI ${normalized}`;

  return {
    nombre,
    tipoDocumento: 'dni',
    documento: normalized,
    direccion: undefined,
    email: undefined,
    telefono: undefined,
    origen: 'RENIEC'
  };
};

export const lookupEmpresaPorRuc = async (ruc: string): Promise<ClienteLookupResult | null> => {
  const normalized = normalizeDigits(ruc);
  if (normalized.length !== 11) {
    return null;
  }

  const suffix4 = normalized.slice(-4);
  const suffix2 = normalized.slice(-2);

  if (!normalized.startsWith('10') && !normalized.startsWith('20')) {
    return null;
  }

  const isJuridica = normalized.startsWith('20');
  const nombreBase = isJuridica
    ? `Empresa ${suffix4} SAC`
    : `Persona RUC ${normalized}`;

  const direccion = isJuridica
    ? `Av. Principal ${suffix2} Lima`
    : undefined;

  return {
    nombre: nombreBase,
    tipoDocumento: 'ruc',
    documento: normalized,
    direccion,
    email: undefined,
    telefono: undefined,
    origen: 'SUNAT'
  };
};
