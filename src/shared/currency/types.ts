export type CurrencyCode = string;

export type CurrencySymbolPosition = 'BEFORE' | 'AFTER';

export interface CurrencyDescriptor {
  id: string;
  code: CurrencyCode;
  name: string;
  symbol: string;
  symbolPosition: CurrencySymbolPosition;
  decimalPlaces: number;
  exchangeRate: number;
  isBaseCurrency: boolean;
  isActive: boolean;
  lastUpdated: Date;
  autoUpdate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CurrencySnapshot = CurrencyDescriptor;

export type ManagedCurrency = CurrencyDescriptor;

export type PersistedCurrency = Omit<CurrencyDescriptor, 'lastUpdated' | 'createdAt' | 'updatedAt'> & {
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
};

export interface CurrencyPersistenceShape {
  version: number;
  baseCurrencyCode: CurrencyCode;
  documentCurrencyCode?: CurrencyCode;
  currencies: PersistedCurrency[];
  updatedAt: string;
}

export interface CurrencyManagerSnapshot {
  baseCurrency: ManagedCurrency;
  documentCurrency: ManagedCurrency;
  currencies: ManagedCurrency[];
}

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

export interface ExchangeRateQuote {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  date?: string | Date;
  source?: string;
}

export type CurrencyUpdate = Partial<Omit<CurrencyDescriptor, 'code'>> & {
  code: CurrencyCode;
};