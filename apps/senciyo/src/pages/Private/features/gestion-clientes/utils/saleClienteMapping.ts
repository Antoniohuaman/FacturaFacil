import type { Cliente } from '../models';
import type { CreateClienteDTO } from '../models';
import { onlyDigits, parseLegacyDocumentString } from './documents';
import type { DocumentCode } from './documents';
import { normalizarNombres } from './names';

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

export type LookupClienteData = {
  nombre: string;
  documento: string;
  tipoDocumento: string;
  direccion?: string;
  email?: string;
};

const DNI_REGEX = /^\d{8}$/;
const RUC_REGEX = /^[12]\d{10}$/;

export const isExactDocumentoMatch = (
  cliente: Cliente,
  expectedType: 'RUC' | 'DNI',
  documentNumber: string,
): boolean => {
  const snap = clienteToSaleSnapshot(cliente);
  return snap.tipoDocumento === expectedType && snap.dni === documentNumber;
};

export const buildCreateClientePayloadFromLookup = (
  data: LookupClienteData,
): { documentType: 'RUC' | 'DNI'; documentNumber: string; payload: CreateClienteDTO } | null => {
  const documentNumber = onlyDigits(data.documento || '');
  const tipoDocumentoRaw = (data.tipoDocumento || '').toString().trim().toUpperCase();
  const documentType: 'RUC' | 'DNI' = tipoDocumentoRaw === 'RUC' ? 'RUC' : 'DNI';
  const isValidDocument = documentType === 'RUC'
    ? RUC_REGEX.test(documentNumber)
    : DNI_REGEX.test(documentNumber);

  if (!isValidDocument) {
    return null;
  }

  const nombre = data.nombre?.trim() || 'Cliente sin nombre';
  const direccion = data.direccion?.trim();

  const payload: CreateClienteDTO = {
    documentType,
    documentNumber,
    name: nombre,
    type: 'Cliente',
    address: direccion,
    direccion,
    email: data.email,
    tipoDocumento: documentType,
    numeroDocumento: documentNumber,
    tipoCuenta: 'Cliente',
  };

  if (documentType === 'RUC') {
    payload.razonSocial = nombre;
  } else {
    const normalizedNames = normalizarNombres({ nombreCompleto: nombre });
    payload.nombres = normalizedNames.nombres;
    payload.primerNombre = normalizedNames.primerNombre;
    payload.segundoNombre = normalizedNames.segundoNombre;
    payload.apellidoPaterno = normalizedNames.apellidoPaterno;
    payload.apellidoMaterno = normalizedNames.apellidoMaterno;
    payload.nombreCompleto = normalizedNames.nombreCompleto || nombre;
  }

  return { documentType, documentNumber, payload };
};
