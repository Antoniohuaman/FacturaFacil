export interface Currency {
  id: string;
  code: string; // ISO 4217 code (PEN, USD, EUR, etc.)
  name: string;
  symbol: string;
  symbolPosition: 'BEFORE' | 'AFTER';
  decimalPlaces: number;
  exchangeRate: number; // Rate relative to base currency (usually PEN)
  isBaseCurrency: boolean;
  isActive: boolean;
  lastUpdated: Date;
  autoUpdate: boolean; // If exchange rate should be updated automatically
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCurrencyRequest {
  code: string;
  name: string;
  symbol: string;
  symbolPosition: 'BEFORE' | 'AFTER';
  decimalPlaces: number;
  exchangeRate: number;
  autoUpdate?: boolean;
}

export interface UpdateCurrencyRequest extends Partial<CreateCurrencyRequest> {
  id: string;
}

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  date: Date;
  source: 'MANUAL' | 'BCR' | 'SUNAT' | 'API'; // Banco Central de Reserva, SUNAT, External API
  createdAt: Date;
}

export interface CurrencyExchange {
  amount: number;
  fromCurrency: Currency;
  toCurrency: Currency;
  exchangeRate: number;
  convertedAmount: number;
  date: Date;
}

// Predefined currencies commonly used in Peru
export const COMMON_CURRENCIES = [
  {
    code: 'PEN',
    name: 'Sol Peruano',
    symbol: 'S/',
    symbolPosition: 'BEFORE' as const,
    decimalPlaces: 2,
    exchangeRate: 1.0,
    isBaseCurrency: true,
  },
  {
    code: 'USD',
    name: 'Dólar Estadounidense',
    symbol: '$',
    symbolPosition: 'BEFORE' as const,
    decimalPlaces: 2,
    exchangeRate: 3.75, // Example rate
    isBaseCurrency: false,
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    symbolPosition: 'BEFORE' as const,
    decimalPlaces: 2,
    exchangeRate: 4.10, // Example rate
    isBaseCurrency: false,
  },
] as const;

export const SYMBOL_POSITIONS = [
  { value: 'BEFORE', label: 'Antes del monto ($ 100.00)' },
  { value: 'AFTER', label: 'Después del monto (100.00 $)' },
] as const;

export const EXCHANGE_RATE_SOURCES = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'BCR', label: 'Banco Central de Reserva' },
  { value: 'SUNAT', label: 'SUNAT' },
  { value: 'API', label: 'API Externa' },
] as const;