import { lsKey } from '../tenant';

export type PaymentMeanDefinition = {
  code: string;
  sunatName: string;
  defaultLabel: string;
};

export const PAYMENT_MEANS_CATALOG: PaymentMeanDefinition[] = [
  { code: '001', sunatName: 'Depósito en cuenta', defaultLabel: 'Depósito' },
  { code: '002', sunatName: 'Giro', defaultLabel: 'Giro' },
  { code: '003', sunatName: 'Transferencia de fondos', defaultLabel: 'Transferencia' },
  { code: '004', sunatName: 'Orden de pago', defaultLabel: 'Orden pago' },
  { code: '005', sunatName: 'Tarjeta de débito', defaultLabel: 'Tarjeta débito' },
  { code: '006', sunatName: 'Tarjeta de crédito (sistema financiero)', defaultLabel: 'Tarjeta crédito' },
  { code: '007', sunatName: 'Cheques no negociables / …', defaultLabel: 'Cheque' },
  { code: '008', sunatName: 'Efectivo (sin obligación de medio)', defaultLabel: 'Efectivo' },
  { code: '009', sunatName: 'Efectivo (demás casos)', defaultLabel: 'Efectivo' },
  { code: '010', sunatName: 'Medios de pago usados en comercio exterior', defaultLabel: 'Com. exterior' },
  { code: '011', sunatName: 'Documentos EDPYMES / cooperativas…', defaultLabel: 'EDPYMES' },
  { code: '012', sunatName: 'Tarjeta crédito (no sist. financiero)', defaultLabel: 'Tarj. crédito' },
  { code: '013', sunatName: 'Tarjetas crédito exterior (no domiciliadas)', defaultLabel: 'Tarj. exterior' },
  { code: '101', sunatName: 'Transferencias – Comercio exterior', defaultLabel: 'Transf. ext' },
  { code: '102', sunatName: 'Cheques bancarios – Comercio exterior', defaultLabel: 'Cheque ext' },
  { code: '103', sunatName: 'Orden de pago simple – Comercio exterior', defaultLabel: 'Orden simple' },
  { code: '104', sunatName: 'Orden de pago documentario – Comercio exterior', defaultLabel: 'Orden doc' },
  { code: '105', sunatName: 'Remesa simple – Comercio exterior', defaultLabel: 'Remesa simple' },
  { code: '106', sunatName: 'Remesa documentaria – Comercio exterior', defaultLabel: 'Remesa doc' },
  { code: '107', sunatName: 'Carta de crédito simple – Comercio exterior', defaultLabel: 'Carta simple' },
  { code: '108', sunatName: 'Carta de crédito documentario – Comercio exterior', defaultLabel: 'Carta doc' },
  { code: '999', sunatName: 'Otros medios de pago', defaultLabel: 'Otros' },
];

export interface PaymentMeansPreferences {
  labelByCode: Record<string, string>;
  visibleByCode: Record<string, boolean>;
  favoriteByCode: Record<string, boolean>;
  defaultCode: string | null;
}

const STORAGE_BASE_KEY = 'payment_means_prefs_v1';

const buildDefaultPreferences = (): PaymentMeansPreferences => {
  const labelByCode: Record<string, string> = {};
  const visibleByCode: Record<string, boolean> = {};
  const favoriteByCode: Record<string, boolean> = {};

  for (const mean of PAYMENT_MEANS_CATALOG) {
    labelByCode[mean.code] = mean.defaultLabel;
    visibleByCode[mean.code] = true;
    favoriteByCode[mean.code] = false;
  }

  return {
    labelByCode,
    visibleByCode,
    favoriteByCode,
    defaultCode: '008',
  };
};

export const loadPaymentMeansPreferences = (): PaymentMeansPreferences => {
  if (typeof window === 'undefined') {
    return buildDefaultPreferences();
  }

  try {
    const key = lsKey(STORAGE_BASE_KEY);
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return buildDefaultPreferences();
    }

    const parsed = JSON.parse(raw) as Partial<PaymentMeansPreferences>;
    const base = buildDefaultPreferences();

    return {
      labelByCode: { ...base.labelByCode, ...(parsed.labelByCode ?? {}) },
      visibleByCode: { ...base.visibleByCode, ...(parsed.visibleByCode ?? {}) },
      favoriteByCode: { ...base.favoriteByCode, ...(parsed.favoriteByCode ?? {}) },
      defaultCode: parsed.defaultCode ?? base.defaultCode,
    };
  } catch {
    return buildDefaultPreferences();
  }
};

export const savePaymentMeansPreferences = (prefs: PaymentMeansPreferences): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const key = lsKey(STORAGE_BASE_KEY);
    window.localStorage.setItem(key, JSON.stringify(prefs));
  } catch (error) {
    console.warn('[PaymentMeans] No se pudo guardar la configuración de medios de pago:', error);
  }
};

export interface PaymentMeanOption {
  code: string;
  sunatName: string;
  label: string;
  isVisible: boolean;
  isFavorite: boolean;
  isDefault: boolean;
  order: number;
}

export const getConfiguredPaymentMeans = (): PaymentMeanOption[] => {
  const prefs = loadPaymentMeansPreferences();

  return PAYMENT_MEANS_CATALOG.map((mean, index) => {
    const label = prefs.labelByCode[mean.code] ?? mean.defaultLabel;
    const isVisible = prefs.visibleByCode[mean.code] ?? true;
    const isFavorite = prefs.favoriteByCode[mean.code] ?? false;
    const isDefault = prefs.defaultCode === mean.code;

    return {
      code: mean.code,
      sunatName: mean.sunatName,
      label,
      isVisible,
      isFavorite,
      isDefault,
      order: index,
    };
  }).sort((a, b) => a.order - b.order);
};
