import type { CurrencyCode } from '@/shared/currency';

export type BankAccountType = 'CHECKING' | 'SAVINGS';

export interface BankAccount {
  id: string;
  bankId: string;
  bankName: string;
  accountType: BankAccountType;
  currencyCode: CurrencyCode;
  description: string;
  accountNumber: string;
  cci: string;
  accountingAccount?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankAccountInput {
  bankId: string;
  bankName: string;
  accountType: BankAccountType;
  currencyCode: CurrencyCode;
  description: string;
  accountNumber: string;
  cci: string;
  accountingAccount?: string;
}

export const BANK_ACCOUNT_TYPES: Array<{ value: BankAccountType; label: string }> = [
  { value: 'CHECKING', label: 'Cuenta Corriente' },
  { value: 'SAVINGS', label: 'Cuenta de Ahorros' }
];

export const BANK_CATALOG: Array<{ id: string; name: string }> = [
  { id: 'bcp', name: 'Banco de Crédito (BCP)' },
  { id: 'bbva', name: 'BBVA' },
  { id: 'interbank', name: 'Interbank' },
  { id: 'scotiabank', name: 'Scotiabank' },
  { id: 'banbif', name: 'BanBif' },
  { id: 'citibank', name: 'Citibank' }
];
