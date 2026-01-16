import type { CondicionDomicilio, SistemaEmision } from '../models';

const HABIDO_VARIANTS = ['habido', 'hábido', 'habida'];
const NO_HABIDO_VARIANTS = ['nohabido', 'nohabído', 'nohabida', 'nohabida'];

export const normalizeCondicionDomicilio = (value?: string | null): CondicionDomicilio | '' => {
  if (!value) return '';
  const normalized = value.trim().toLowerCase();
  if (HABIDO_VARIANTS.includes(normalized.replace(/\s+/g, ''))) {
    return 'Habido';
  }
  if (NO_HABIDO_VARIANTS.includes(normalized.replace(/\s+/g, ''))) {
    return 'NoHabido';
  }
  return '';
};

const SISTEMA_MAP: Record<string, SistemaEmision> = {
  manual: 'Manual',
  computarizado: 'Computarizado',
  mixto: 'Mixto',
  'manualcomputarizado': 'Mixto',
  'computarizadomanual': 'Mixto',
};

export const normalizeSistemaEmision = (value?: string | null): SistemaEmision | '' => {
  if (!value) return '';
  const key = value.replace(/[^a-zA-Z]/g, '').toLowerCase();
  return SISTEMA_MAP[key] ?? '';
};

export const normalizeBooleanFlag = (value?: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['si', 'sí', 'true', '1', 'habilitado', 'activo', 'x'].includes(normalized);
  }
  return false;
};
