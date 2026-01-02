import { documentCodeFromType, documentTypeFromCode, normalizeKey, parseLegacyDocumentString } from '@/features/gestion-clientes/utils/documents';

export type NormalizedDocumentType = 'RUC' | 'DNI' | 'SIN_DOCUMENTO' | 'OTROS';

const DOCUMENT_TYPE_ALIASES: Record<string, NormalizedDocumentType> = {
  ruc: 'RUC',
  '6': 'RUC',
  dni: 'DNI',
  '1': 'DNI',
  sindocumento: 'SIN_DOCUMENTO',
  sindoc: 'SIN_DOCUMENTO',
  sin: 'SIN_DOCUMENTO',
  '0': 'SIN_DOCUMENTO',
  nodocumento: 'SIN_DOCUMENTO',
  nodomiciliado: 'SIN_DOCUMENTO',
  otros: 'OTROS',
  pasaporte: 'OTROS',
  pas: 'OTROS',
  passport: 'OTROS',
  carnetextranjeria: 'OTROS',
  carnetidentidad: 'OTROS',
  ce: 'OTROS',
  ptp: 'OTROS',
  cpp: 'OTROS',
  tam: 'OTROS',
};

const toAliasKey = (value: string): string => normalizeKey(value ?? '').replace(/\s+/g, '');

export const normalizeDocumentType = (input?: string | null): NormalizedDocumentType => {
  if (!input) {
    return 'SIN_DOCUMENTO';
  }

  const alias = toAliasKey(input);
  if (!alias) {
    return 'SIN_DOCUMENTO';
  }

  return DOCUMENT_TYPE_ALIASES[alias] ?? 'OTROS';
};

export const normalizeDocumentNumber = (input: string): string => input.replace(/\D+/g, '');

export const formatDocumentLabel = (
  type: NormalizedDocumentType,
  number: string,
): string => {
  if (type === 'SIN_DOCUMENTO') {
    return 'Sin documento';
  }

  if (type === 'OTROS') {
    const trimmed = number.trim();
    return trimmed ? `Documento ${trimmed}` : 'Documento';
  }

  const digits = normalizeDocumentNumber(number);
  if (!digits) {
    return type;
  }

  return `${type} ${digits}`;
};

export const normalizeDocumentDigits = (value: string): string => value.replace(/\D+/g, '');

export const isValidDni = (digits: string): boolean => digits.length === 8;

export const isValidRuc = (digits: string): boolean =>
  digits.length === 11 && (digits.startsWith('10') || digits.startsWith('20'));

export const detectDocumentTypeFromDigits = (input: string): NormalizedDocumentType => {
  const digits = normalizeDocumentDigits(input);
  if (!digits) {
    return 'SIN_DOCUMENTO';
  }
  if (isValidRuc(digits)) {
    return 'RUC';
  }
  if (isValidDni(digits)) {
    return 'DNI';
  }
  return 'OTROS';
};

export const normalizedTypeToSunatCode = (type: NormalizedDocumentType): string => {
  switch (type) {
    case 'RUC':
      return documentCodeFromType('RUC') ?? '6';
    case 'DNI':
      return documentCodeFromType('DNI') ?? '1';
    case 'SIN_DOCUMENTO':
      return documentCodeFromType('SIN_DOCUMENTO') ?? '0';
    default:
      return documentCodeFromType('DOC_IDENTIF_PERS_NAT_NO_DOM') ?? '4';
  }
};

export const sunatCodeToNormalizedType = (code?: string | null): NormalizedDocumentType => {
  if (!code) {
    return 'SIN_DOCUMENTO';
  }
  const documentType = documentTypeFromCode(code);
  if (!documentType) {
    return 'OTROS';
  }
  if (documentType === 'RUC') {
    return 'RUC';
  }
  if (documentType === 'DNI') {
    return 'DNI';
  }
  if (documentType === 'SIN_DOCUMENTO') {
    return 'SIN_DOCUMENTO';
  }
  return 'OTROS';
};

export const buildClientDocKey = (
  type: NormalizedDocumentType,
  number: string,
): string => {
  if (type === 'SIN_DOCUMENTO') {
    return type;
  }

  const digits = normalizeDocumentNumber(number);
  if (digits) {
    return `${type}:${digits}`;
  }

  const fallback = normalizeKey(number);
  return fallback ? `${type}:${fallback}` : type;
};

export interface NormalizedClienteRecord {
  id: string;
  nombre: string;
  nombreLower: string;
  tipoDocumento: NormalizedDocumentType;
  numeroDocumento: string;
  documentLabel: string;
  direccion: string;
  telefono?: string;
  email?: string;
  docKey: string;
  sunatCode?: string;
  priceProfileIdHint?: string;
  raw: unknown;
}

export type LegacyClienteStorageRecord = Record<string, unknown>;

const extractString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const extractPriceProfileCandidate = (record: Record<string, unknown>): string | undefined => {
  const directKeys = [
    'listaPrecio',
    'listaPrecioId',
    'priceProfileId',
    'priceProfile',
    'perfilPrecio',
    'perfilPrecios',
  ];

  for (const key of directKeys) {
    const candidate = extractString(record[key]);
    if (candidate) {
      return candidate;
    }
  }

  const nestedKeys = ['configuracionVenta', 'configuracionComercial', 'ventas', 'datosComerciales'];
  for (const key of nestedKeys) {
    const nested = record[key];
    if (typeof nested === 'object' && nested !== null) {
      const candidate = extractString((nested as Record<string, unknown>).listaPrecio);
      if (candidate) {
        return candidate;
      }
    }
  }

  return undefined;
};

const pickNonEmptyString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return undefined;
};

const extractFirstTelefono = (value: unknown): string | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  for (const item of value) {
    if (typeof item === 'object' && item !== null) {
      const telefono = (item as Record<string, unknown>).numero;
      if (typeof telefono === 'string' && telefono.trim() !== '') {
        return telefono.trim();
      }
    }
  }
  return undefined;
};

const extractFirstEmail = (value: unknown): string | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  for (const item of value) {
    if (typeof item === 'string' && item.trim() !== '') {
      return item.trim();
    }
  }
  return undefined;
};

const buildNombre = (record: Record<string, unknown>): string => {
  const nombreDirecto = pickNonEmptyString(
    record.name,
    record.nombre,
    record.razonSocial,
    record.nombreCompleto,
  );
  if (nombreDirecto) {
    return nombreDirecto;
  }

  const nombres = (
    ['primerNombre', 'segundoNombre', 'apellidos', 'apellidoPaterno', 'apellidoMaterno'] as const
  )
    .map((key) => {
      const value = record[key];
      return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
    })
    .filter((value): value is string => Boolean(value));

  if (nombres.length > 0) {
    return nombres.join(' ').trim();
  }

  return 'Cliente sin nombre';
};

export const normalizeClienteRecord = (entry: unknown): NormalizedClienteRecord => {
  const record = typeof entry === 'object' && entry !== null ? (entry as Record<string, unknown>) : {};
  const legacyDocument = typeof record.document === 'string' ? record.document : undefined;
  const legacyParts = legacyDocument ? parseLegacyDocumentString(legacyDocument) : {};

  const rawType = record.tipoDocumento ?? record.documentType ?? legacyParts.type ?? legacyParts.code;

  const normalizedType = normalizeDocumentType(typeof rawType === 'string' ? rawType : undefined);

  const rawNumberCandidate = ((): string => {
    if (typeof record.numeroDocumento === 'string') {
      return record.numeroDocumento;
    }
    if (typeof record.documentNumber === 'string') {
      return record.documentNumber;
    }
    if (typeof record.dni === 'string') {
      return record.dni;
    }
    if (legacyParts.number) {
      return legacyParts.number;
    }
    if (typeof record.documento === 'string') {
      return record.documento;
    }
    return '';
  })();

  const numeroDocumento = (() => {
    if (normalizedType === 'RUC' || normalizedType === 'DNI') {
      return normalizeDocumentNumber(rawNumberCandidate);
    }
    return rawNumberCandidate.trim();
  })();

  const nombre = buildNombre(record);
  const direccion = pickNonEmptyString(record.direccion, record.address) ?? 'Dirección no definida';
  const telefono = pickNonEmptyString(record.phone, extractFirstTelefono(record.telefonos));
  const email = pickNonEmptyString(record.email, extractFirstEmail(record.emails));

  const explicitSunatCode = (() => {
    if (typeof record.tipoDocumentoCodigoSunat === 'string') {
      return record.tipoDocumentoCodigoSunat;
    }
    if (typeof record.documentCode === 'string') {
      return record.documentCode;
    }
    if (typeof legacyParts.code === 'string') {
      return legacyParts.code;
    }
    return undefined;
  })();

  let resolvedType = normalizedType;
  if (explicitSunatCode) {
    resolvedType = sunatCodeToNormalizedType(explicitSunatCode);
  }
  if ((resolvedType === 'OTROS' || resolvedType === 'SIN_DOCUMENTO') && numeroDocumento) {
    const detected = detectDocumentTypeFromDigits(numeroDocumento);
    if (detected !== 'OTROS') {
      resolvedType = detected;
    }
  }

  const sunatCode = explicitSunatCode ?? normalizedTypeToSunatCode(resolvedType);

  const rawId = record.id;
  const idString = typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId) : undefined;

  const documentLabel = formatDocumentLabel(resolvedType, numeroDocumento);
  const docKey = numeroDocumento
    ? buildClientDocKey(resolvedType, numeroDocumento)
    : `${resolvedType}:${normalizeKey(nombre) || idString || 'sin-id'}`;

  const priceProfileIdHint = extractPriceProfileCandidate(record);

  return {
    id: idString ?? docKey,
    nombre,
    nombreLower: nombre.toLowerCase(),
    tipoDocumento: resolvedType,
    numeroDocumento,
    documentLabel,
    direccion,
    telefono,
    email,
    docKey,
    sunatCode,
    priceProfileIdHint,
    raw: entry,
  };
};

export const mergeNormalizedClientes = (
  primary: NormalizedClienteRecord,
  candidate: NormalizedClienteRecord,
): NormalizedClienteRecord => {
  const mergedNombre = primary.nombre === 'Cliente sin nombre' && candidate.nombre !== 'Cliente sin nombre'
    ? candidate.nombre
    : primary.nombre;

  const mergedDireccion = primary.direccion === 'Dirección no definida' && candidate.direccion !== 'Dirección no definida'
    ? candidate.direccion
    : primary.direccion;

  return {
    ...primary,
    nombre: mergedNombre,
    nombreLower: mergedNombre.toLowerCase(),
    direccion: mergedDireccion,
    telefono: primary.telefono || candidate.telefono,
    email: primary.email || candidate.email,
    priceProfileIdHint: primary.priceProfileIdHint || candidate.priceProfileIdHint,
    raw: primary.raw ?? candidate.raw,
  };
};

export const CLIENTE_LEGACY_STORAGE_KEY = 'clientes';

export const resolveClienteStorageKeys = (): string[] => {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return [];
  }

  const prioritized: string[] = [];
  const legacy: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) {
      continue;
    }
    if (key.endsWith(':dev_clientes')) {
      prioritized.unshift(key);
    } else if (key === 'dev_clientes') {
      prioritized.push(key);
    } else if (key === CLIENTE_LEGACY_STORAGE_KEY || key.endsWith(':clientes')) {
      legacy.push(key);
    }
  }

  const ordered = [...prioritized, ...legacy, CLIENTE_LEGACY_STORAGE_KEY];
  const unique = Array.from(new Set(ordered));

  return unique.filter((key) => {
    try {
      return Boolean(window.localStorage.getItem(key));
    } catch {
      return false;
    }
  });
};

export const loadNormalizedClientesFromStorage = (): NormalizedClienteRecord[] => {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return [];
  }

  const keys = resolveClienteStorageKeys();
  const seen = new Map<string, NormalizedClienteRecord>();
  const aggregated: NormalizedClienteRecord[] = [];

  keys.forEach((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }

      parsed.forEach((record) => {
        const normalized = normalizeClienteRecord(record);
        const existing = seen.get(normalized.docKey);
        if (existing) {
          const merged = mergeNormalizedClientes(existing, normalized);
          seen.set(normalized.docKey, merged);
          const position = aggregated.findIndex((item) => item.docKey === normalized.docKey);
          if (position >= 0) {
            aggregated[position] = merged;
          }
        } else {
          seen.set(normalized.docKey, normalized);
          aggregated.push(normalized);
        }
      });
    } catch (error) {
      console.error('Error loading clientes from localStorage key', key, error);
    }
  });

  return aggregated;
};

export const readLegacyClientes = (): LegacyClienteStorageRecord[] => {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CLIENTE_LEGACY_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LegacyClienteStorageRecord[]) : [];
  } catch (error) {
    console.error('Error reading legacy clientes from localStorage', error);
    return [];
  }
};

export const persistLegacyClientes = (clientes: LegacyClienteStorageRecord[]): void => {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return;
  }

  try {
    window.localStorage.setItem(CLIENTE_LEGACY_STORAGE_KEY, JSON.stringify(clientes));
  } catch (error) {
    console.error('Error saving clientes to localStorage', error);
  }
};
