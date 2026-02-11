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

/*
Document normalization comparison cases (expected outputs match current behavior)
- code: 6, raw: "20123456789" -> normalizeDocumentNumber: "20123456789"
- code: 6, raw: "2012345678" -> normalizeDocumentNumber: "02012345678"
- code: 6, raw: "20-123-456-789" -> normalizeDocumentNumber: "20123456789"
- code: 1, raw: "12345678" -> normalizeDocumentNumber: "12345678"
- code: 1, raw: "12-345-678" -> normalizeDocumentNumber: "12345678"
- code: 1, raw: "00000000" -> normalizeDocumentNumber: "00000000"
- code: 1, raw: "ABC" -> normalizeDocumentNumber: "" (error: solo digitos)
- code: 0, raw: "ABC-123" -> normalizeDocumentNumber: "ABC-123" (sin restriccion)
- legacy: "RUC 20123456789" -> resolveDocumentDisplayType: "RUC", resolveDocumentDisplayNumber: "20123456789"
- legacy: "DNI 12345678" -> resolveDocumentDisplayType: "DNI", resolveDocumentDisplayNumber: "12345678"
- legacy: "Sin documento" -> resolveDocumentDisplayType: "Sin documento", resolveDocumentDisplayNumber: "-"
*/

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

/** Verifica si un valor es un código SUNAT válido (Catálogo 06). */
export const isSunatDocCode = (code?: string | null): boolean => {
  if (!code) return false;
  const normalized = code.trim().toUpperCase();
  return DOCUMENT_DEFINITIONS.some((def) => def.code === (normalized as DocumentCode));
};

/** Devuelve una etiqueta corta para el código SUNAT dado. */
export const getDocLabelFromCode = (code?: string | null): string => {
  if (!code) return 'Sin documento';
  const normalized = code.trim().toUpperCase() as DocumentCode;
  switch (normalized) {
    case '6':
      return 'RUC';
    case '1':
      return 'DNI';
    case '0':
      return 'Sin documento';
    case '4':
      return 'Carnet de extranjería';
    case '7':
      return 'Pasaporte';
    case 'A':
      return 'Cédula Diplomática';
    case 'B':
      return 'Doc. país residencia';
    case 'C':
      return 'TIN - PP.NN';
    case 'D':
      return 'IN - PP.JJ';
    case 'E':
      return 'Tarjeta Andina (TAM)';
    case 'F':
      return 'Permiso Temp. Permanencia';
    case 'G':
      return 'Salvoconducto';
    case 'H':
      return 'Carné Permiso Temporal';
    default:
      return 'Documento';
  }
};

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

export const getDocumentDefinitionFromCode = (code?: string | null): DocumentDefinition | undefined => {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  return DOCUMENT_DEFINITIONS.find((definition) => definition.code === (normalized as DocumentCode));
};

export const resolveDocumentDefinition = (value: string): DocumentDefinition | undefined =>
  getDocumentDefinitionFromCode(value) ?? findDocumentDefinition(value);

export const onlyDigits = (value: string): string => value.replace(/\D+/g, '');

export const normalizeDocumentCodeValue = (value?: string | null): DocumentCode | '' => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const normalized = trimmed.toUpperCase();
  if (documentTypeFromCode(normalized as DocumentCode)) {
    return normalized as DocumentCode;
  }
  const fromType = documentCodeFromType(trimmed as DocumentType);
  return fromType ?? '';
};

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

export const resolveDocumentCodeFromInputs = (params: {
  tipoDocumento?: string | null;
  legacyDocument?: string | null;
}): DocumentCode | '' => {
  const fromTipo = normalizeDocumentCodeValue(params.tipoDocumento);
  if (fromTipo) return fromTipo;

  const parsed = parseLegacyDocumentString(params.legacyDocument);
  if (parsed.code) return parsed.code;
  if (parsed.type) {
    const fromParsedType = documentCodeFromType(parsed.type);
    if (fromParsedType) return fromParsedType;
  }

  return '';
};

export const resolveDocumentNumberFromInputs = (params: {
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  legacyDocument?: string | null;
  documentCode?: DocumentCode | '';
}): string => {
  const parsed = parseLegacyDocumentString(params.legacyDocument);
  const baseNumber = (params.numeroDocumento ?? parsed.number ?? '').toString().trim();
  const rawCode = params.documentCode ?? normalizeDocumentCodeValue(params.tipoDocumento);
  const normalizedCode = rawCode ? (rawCode.trim().toUpperCase() as DocumentCode) : undefined;

  if (!normalizedCode || !documentTypeFromCode(normalizedCode)) {
    return baseNumber;
  }

  return normalizeDocumentNumber(normalizedCode, baseNumber);
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

export const resolveDocumentDisplayType = (params: {
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  legacyDocument?: string | null;
}): string => {
  const code = normalizeDocumentCodeValue(params.tipoDocumento);
  const number = (params.numeroDocumento ?? '').trim();

  if (code) {
    if (code === '0' || !number) return 'Sin documento';
    return getDocLabelFromCode(code);
  }

  const legacy = (params.legacyDocument ?? '').trim();
  if (!legacy || legacy === 'Sin documento') return 'Sin documento';

  const parsed = parseLegacyDocumentString(legacy);
  if (parsed.type === 'RUC') return 'RUC';
  if (parsed.type === 'DNI') return 'DNI';
  if (parsed.code) return getDocLabelFromCode(parsed.code);
  if (parsed.type) {
    const fromType = documentCodeFromType(parsed.type);
    return fromType ? getDocLabelFromCode(fromType) : 'Documento';
  }

  return 'Documento';
};

export const resolveDocumentDisplayNumber = (params: {
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  legacyDocument?: string | null;
}): string => {
  const code = normalizeDocumentCodeValue(params.tipoDocumento);
  const number = (params.numeroDocumento ?? '').trim();
  if (code) {
    return number || '-';
  }

  const legacy = (params.legacyDocument ?? '').trim();
  if (!legacy || legacy === 'Sin documento') return '-';

  const parsed = parseLegacyDocumentString(legacy);
  if (parsed.number !== undefined) {
    return parsed.number || '-';
  }

  return legacy;
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
