import type { Cliente } from '../models';
import { onlyDigits, parseLegacyDocumentString } from './documents';
import type { DocumentCode } from './documents';

export type SaleDocumentType = 'RUC' | 'DNI' | 'SIN_DOCUMENTO' | 'OTROS';

const parseClienteDocument = (document?: string | null): { type: SaleDocumentType; number: string; code?: DocumentCode } => {
  if (!document || document === 'Sin documento') {
    return { type: 'SIN_DOCUMENTO', number: '' };
  }

  const parsed = parseLegacyDocumentString(document);
  const rawNumber = (parsed.number ?? '').trim();
  const code = parsed.code;

  if (!parsed.type && !code && !rawNumber) {
    return { type: 'SIN_DOCUMENTO', number: '' };
  }

  if (parsed.type === 'RUC') {
    return { type: 'RUC', number: onlyDigits(rawNumber), code };
  }

  if (parsed.type === 'DNI') {
    return { type: 'DNI', number: onlyDigits(rawNumber), code };
  }

  if (!rawNumber) {
    return { type: 'SIN_DOCUMENTO', number: '', code };
  }

  return { type: 'OTROS', number: rawNumber, code };
};

export const formatSaleDocumentLabel = (type: SaleDocumentType, number: string): string => {
  if (type === 'SIN_DOCUMENTO') return 'Sin documento';
  if (type === 'OTROS') return number.trim() ? `Documento ${number.trim()}` : 'Documento';
  const digits = onlyDigits(number);
  return digits ? `${type} ${digits}` : type;
};

export const clienteToSaleSnapshot = (cliente: Cliente): {
  clienteId: Cliente['id'];
  nombre: string;
  dni: string;
  direccion: string;
  tipoDocumento: SaleDocumentType;
  email?: string;
  priceProfileId?: string;
  sunatCode?: DocumentCode;
} => {
  const parsed = parseClienteDocument(cliente.document);

  return {
    clienteId: cliente.id,
    nombre: cliente.name,
    dni: parsed.number,
    direccion: cliente.address || 'Sin dirección',
    tipoDocumento: parsed.type,
    email: cliente.email,
    priceProfileId: cliente.listaPrecio,
    sunatCode: parsed.code,
  };
};
