import type { Draft } from '../mockData/drafts.mock';
import type { DraftData, CartItem, PaymentTotals } from '../../models/comprobante.types';
import { formatDateShortSpanish, formatDateLongSpanish } from '../../utils/dateUtils';
import { calculateDraftStatus } from '../../utils/draftValidation';

const pickString = (...values: Array<string | undefined | null>): string => {
  const value = values.find(item => typeof item === 'string' && item.trim().length > 0);
  return value?.trim() ?? '';
};

const getNestedString = (source: unknown, key: string): string | undefined => {
  if (!source || typeof source !== 'object' || source === null) {
    return undefined;
  }

  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
};

interface LegacyDraftRecord {
  id?: string;
  type?: string;
  tipo?: string;
  documentType?: string;
  createdDate?: string;
  fechaCreacion?: string;
  fechaEmision?: string;
  createdAt?: string;
  expiryDate?: string;
  fechaVencimiento?: string;
  clientDoc?: string;
  clienteDoc?: string;
  clienteDocumento?: string;
  client?: unknown;
  cliente?: unknown;
  clienteNombre?: string;
  vendor?: string;
  vendedor?: string;
  vendedorNombre?: string;
  totals?: Partial<PaymentTotals>;
  total?: number;
  importeTotal?: number | string;
  montoTotal?: number | string;
  productos?: CartItem[];
}

type DraftStorageRecord = DraftData & LegacyDraftRecord;

const resolveTipo = (raw: DraftStorageRecord): string => {
  const tipo = pickString(raw?.type, raw?.tipo, raw?.documentType);
  if (!tipo) {
    return 'Boleta de venta';
  }

  const normalized = tipo.toLowerCase();
  if (normalized.includes('fact')) {
    return 'Factura';
  }
  if (normalized.includes('boleta')) {
    return 'Boleta de venta';
  }
  if (normalized.includes('nota')) {
    return 'Nota de venta';
  }
  return tipo;
};

const resolveDateField = (rawValue?: string): string => {
  if (!rawValue) {
    return '';
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return rawValue;
  }

  return formatDateLongSpanish(date);
};

const resolveExpiryDate = (rawValue?: string): string => {
  if (!rawValue) {
    return '';
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return rawValue;
  }

  return formatDateShortSpanish(date);
};

const computeTotalFromItems = (items?: CartItem[]): number => {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }

  return items.reduce((acc, item) => {
    const price = Number(item.total ?? item.price ?? 0);
    if (!item.quantity) {
      return acc + price;
    }
    if (item.total) {
      return acc + Number(item.total);
    }
    return acc + price * item.quantity;
  }, 0);
};

export interface DraftMapperOptions {
  fallbackVendor?: string;
}

export const mapDraftFromStorage = (raw: DraftStorageRecord, options: DraftMapperOptions = {}): Draft | null => {
  const id = pickString(raw?.id);
  if (!id) {
    return null;
  }

  const tipo = resolveTipo(raw);
  const createdDate = pickString(raw?.createdDate, raw?.fechaCreacion, raw?.fechaEmision, resolveDateField(raw?.createdAt));
  const expiryDate = pickString(raw?.expiryDate, raw?.fechaVencimiento, resolveExpiryDate(raw?.fechaVencimiento));

  const clientDoc = pickString(
    raw?.clientDoc,
    raw?.clienteDoc,
    raw?.clienteDocumento,
    getNestedString(raw?.cliente, 'documento'),
    getNestedString(raw?.cliente, 'numeroDocumento'),
    getNestedString(raw?.client, 'document'),
    getNestedString(raw?.cliente, 'doc')
  );

  const client = pickString(
    typeof raw?.client === 'string' ? raw.client : undefined,
    typeof raw?.cliente === 'string' ? raw.cliente : undefined,
    raw?.clienteNombre,
    getNestedString(raw?.cliente, 'razonSocial'),
    getNestedString(raw?.cliente, 'nombre'),
    getNestedString(raw?.cliente, 'nombres')
  );

  const vendor = pickString(
    raw?.vendor,
    raw?.vendedor,
    raw?.vendedorNombre,
    options.fallbackVendor
  );

  const totalsFromPayload = raw?.totals?.total;
  const total = typeof raw?.total === 'number'
    ? raw.total
    : typeof totalsFromPayload === 'number'
      ? totalsFromPayload
      : Number(raw?.importeTotal ?? raw?.montoTotal ?? 0) || computeTotalFromItems(raw?.productos);

  const statusInfo = calculateDraftStatus(createdDate, expiryDate, tipo);

  return {
    id,
    type: tipo,
    clientDoc,
    client,
    createdDate,
    expiryDate,
    vendor,
    total,
    status: statusInfo.status,
    daysLeft: statusInfo.daysLeft,
    statusColor: statusInfo.statusColor
  };
};

export const mapDraftCollection = (drafts: DraftStorageRecord[], options: DraftMapperOptions = {}): Draft[] => {
  return drafts
    .map(draft => mapDraftFromStorage(draft, options))
    .filter((draft): draft is Draft => Boolean(draft));
};
