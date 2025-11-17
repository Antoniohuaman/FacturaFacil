import type { DocumentType } from '../models';

export type DocumentCode =
  | '0'
  | '1'
  | '4'
  | '6'
  | '7'
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H';

export interface DocumentDefinition {
  code: DocumentCode;
  nuevo: DocumentCode;
  legacy: DocumentType;
  /** Alias para compatibilidad con código antiguo */
  legacyType?: DocumentType;
  requiredDigits?: number;
  tokens: string[];
}

const RAW_DOCUMENT_DEFINITIONS: Array<{
  code: DocumentCode;
  legacy: DocumentType;
  requiredDigits?: number;
  tokens: string[];
}> = [
  { code: '6', legacy: 'RUC', requiredDigits: 11, tokens: ['6', 'ruc'] },
  { code: '1', legacy: 'DNI', requiredDigits: 8, tokens: ['1', 'dni'] },
  { code: '7', legacy: 'PASAPORTE', tokens: ['7', 'pasaporte', 'pas', 'passport'] },
  { code: '4', legacy: 'CARNET_EXTRANJERIA', tokens: ['4', 'ce', 'carnetextranjeria'] },
  { code: '0', legacy: 'DOC_IDENTIF_PERS_NAT_NO_DOM', tokens: ['0', 'nodomiciliado', 'sd', 'sindocumento'] },
  { code: 'A', legacy: 'CARNET_IDENTIDAD', tokens: ['a', 'cedula', 'carnetidentidad'] },
  { code: 'B', legacy: 'DOC_IDENTIF_PERS_NAT_NO_DOM', tokens: ['b'] },
  { code: 'C', legacy: 'DOC_IDENTIF_PERS_NAT_NO_DOM', tokens: ['c'] },
  { code: 'D', legacy: 'DOC_IDENTIF_PERS_NAT_NO_DOM', tokens: ['d'] },
  { code: 'E', legacy: 'TAM_TARJETA_ANDINA', tokens: ['e', 'tam'] },
  { code: 'F', legacy: 'CARNET_PERMISO_TEMP_PERMANENCIA', tokens: ['f', 'ptp'] },
  { code: 'G', legacy: 'CARNET_IDENTIDAD', tokens: ['g'] },
  { code: 'H', legacy: 'CARNET_PERMISO_TEMP_PERMANENCIA', tokens: ['h', 'cpp'] },
];

export const DOCUMENT_DEFINITIONS: DocumentDefinition[] = RAW_DOCUMENT_DEFINITIONS.map((definition) => ({
  ...definition,
  nuevo: definition.code,
  legacyType: definition.legacy,
}));

export const DOCUMENT_CODE_TO_TYPE: Record<DocumentCode, DocumentType> = DOCUMENT_DEFINITIONS.reduce(
  (acc, def) => ({ ...acc, [def.code]: def.legacy }),
  {} as Record<DocumentCode, DocumentType>
);

export const DOCUMENT_TYPE_TO_CODE = DOCUMENT_DEFINITIONS.reduce(
  (acc, def) => {
    acc[def.legacy] = def.code;
    return acc;
  },
  {} as Record<DocumentType, DocumentCode>
);

const DIGIT_ONLY_CODES: Partial<Record<DocumentCode, number>> = DOCUMENT_DEFINITIONS.reduce(
  (acc, def) => {
    if (def.requiredDigits) {
      acc[def.code] = def.requiredDigits;
    }
    return acc;
  },
  {} as Partial<Record<DocumentCode, number>>
);

export const normalizeKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

export const findDocumentDefinition = (value: string): DocumentDefinition | undefined => {
  const token = normalizeKey(value);
  return DOCUMENT_DEFINITIONS.find((definition) => definition.tokens.some((candidate) => candidate === token));
};

export const documentTypeFromCode = (code?: string | null): DocumentType | undefined => {
  if (!code) return undefined;
  const normalized = code.toUpperCase() as DocumentCode;
  return DOCUMENT_CODE_TO_TYPE[normalized];
};

export const documentCodeFromType = (type?: DocumentType | null): DocumentCode | undefined => {
  if (!type) return undefined;
  return DOCUMENT_TYPE_TO_CODE[type];
};

export const onlyDigits = (value: string): string => value.replace(/\D+/g, '');

export const normalizeDocumentNumber = (
  code: DocumentCode | undefined,
  rawValue: string,
  errors?: string[]
): string => {
  if (!rawValue) return '';
  const trimmed = rawValue.trim();
  if (!code) return trimmed;

  const requiredDigits = DIGIT_ONLY_CODES[code];
  if (!requiredDigits) {
    return trimmed;
  }

  const digits = onlyDigits(trimmed);
  if (!digits) {
    errors?.push(`El número de documento para el código ${code} solo puede contener dígitos.`);
    return '';
  }

  if (digits.length > requiredDigits) {
    errors?.push(`El número de documento excede los ${requiredDigits} dígitos permitidos (${digits.length}).`);
    return digits.slice(0, requiredDigits);
  }

  return digits.padStart(requiredDigits, '0');
};

export const parseLegacyDocumentString = (
  document?: string | null
): { code?: DocumentCode; type?: DocumentType; number?: string } => {
  if (!document || document === 'Sin documento') {
    return {};
  }

  const trimmed = document.trim();
  if (!trimmed) {
    return {};
  }

  const [firstToken, ...rest] = trimmed.split(/\s+/);
  const normalizedToken = firstToken?.toUpperCase() ?? '';
  const definition =
    DOCUMENT_DEFINITIONS.find((def) => def.code === (normalizedToken as DocumentCode)) ??
    findDocumentDefinition(normalizedToken);

  if (definition) {
    return {
      code: definition.code,
      type: definition.legacy,
      number: rest.join(' ').trim(),
    };
  }

  return { number: trimmed };
};

export const buildDocumentReference = (code?: string, number?: string): string => {
  if (!code && !number) return '-';
  const cleanCode = code?.trim().toUpperCase();
  const cleanNumber = number?.trim();
  if (!cleanCode) {
    return cleanNumber || '-';
  }
  return `${cleanCode} ${cleanNumber || '-'}`.trim();
};
