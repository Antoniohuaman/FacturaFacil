import type { Cliente, ClientType, CreateClienteDTO, DocumentType, UpdateClienteDTO } from '../models';
import { onlyDigits, parseLegacyDocumentString } from './documents';

export type SaleDocumentType = 'RUC' | 'DNI' | 'SIN_DOCUMENTO' | 'OTROS';

const resolveDocumentTypeForDto = (raw: string): DocumentType => {
  const token = (raw ?? '').trim().toUpperCase();
  if (token === '6' || token === 'RUC') return 'RUC';
  if (token === '1' || token === 'DNI') return 'DNI';
  if (token === '0' || token === 'SIN_DOCUMENTO' || token === 'SIN DOCUMENTO') return 'SIN_DOCUMENTO';
  if (token === '7' || token === 'PASAPORTE' || token === 'PAS') return 'PASAPORTE';
  if (token === '4' || token === 'CE' || token === 'CARNET_EXTRANJERIA') return 'CARNET_EXTRANJERIA';
  return 'DOC_IDENTIF_PERS_NAT_NO_DOM';
};

const parseClienteDocument = (document?: string | null): { type: SaleDocumentType; number: string } => {
  if (!document || document === 'Sin documento') {
    return { type: 'SIN_DOCUMENTO', number: '' };
  }

  const parsed = parseLegacyDocumentString(document);
  const rawNumber = (parsed.number ?? '').trim();

  if (parsed.type === 'RUC') {
    return { type: 'RUC', number: onlyDigits(rawNumber) };
  }

  if (parsed.type === 'DNI') {
    return { type: 'DNI', number: onlyDigits(rawNumber) };
  }

  if (parsed.type === 'SIN_DOCUMENTO') {
    return { type: 'SIN_DOCUMENTO', number: '' };
  }

  if (!rawNumber) {
    return { type: 'SIN_DOCUMENTO', number: '' };
  }

  return { type: 'OTROS', number: rawNumber };
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
  };
};

const buildClienteDtoFromLegacyForm = (input: {
  documentTypeToken: string;
  documentNumber: string;
  legalName: string;
  address?: string;
  phone?: string;
  email?: string;
  additionalData?: string;
  clientType?: string;
}): CreateClienteDTO => {
  const documentType = resolveDocumentTypeForDto(input.documentTypeToken);
  const rawNumber = (input.documentNumber ?? '').trim();
  const normalizedNumber = documentType === 'RUC' || documentType === 'DNI' ? onlyDigits(rawNumber) : rawNumber;

  const name = (input.legalName ?? '').trim() || 'Cliente';
  const type: ClientType = (input.clientType as ClientType) || 'Cliente';

  return {
    documentType,
    documentNumber: normalizedNumber,
    name,
    type,
    address: input.address?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    additionalData: input.additionalData?.trim() || undefined,
    tipoDocumento: documentType,
    numeroDocumento: normalizedNumber,
    direccion: input.address?.trim() || undefined,
  };
};

export const buildUpdateClienteDtoFromLegacyForm = (input: Parameters<typeof buildClienteDtoFromLegacyForm>[0]): UpdateClienteDTO => {
  return buildClienteDtoFromLegacyForm(input);
};

// Mapeo mínimo para abrir el formulario con códigos SUNAT
// Convierte tokens comunes ('RUC'|'DNI'|'SIN_DOCUMENTO') o códigos ya numéricos a códigos SUNAT aceptados por ClienteFormNew
export const toSunatDocCode = (token?: string | null): string => {
  const t = (token ?? '').trim().toUpperCase();
  if (!t) return '';
  if (t === 'RUC' || t === '6') return '6';
  if (t === 'DNI' || t === '1') return '1';
  if (t === 'SIN_DOCUMENTO' || t === 'SIN DOCUMENTO' || t === '0') return '0';
  // Si ya viene un código válido distinto, se respeta tal cual (ej. '4', '7', 'A', ...)
  // En ausencia de un mapeo específico, devolver el token original para no adivinar
  return t;
};
