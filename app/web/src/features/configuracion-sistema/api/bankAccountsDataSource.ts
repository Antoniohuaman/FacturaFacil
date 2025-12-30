import { lsKey } from '../../../shared/tenant';
import type { BankAccount, BankAccountInput } from '../models/BankAccount';
import { accountingAccountsDataSource } from './accountingAccountsDataSource';
import type { AccountingAccount } from '../models/AccountingAccount';

const STORAGE_BASE_KEY = 'config_bank_accounts_v1';

const getStorageKey = (empresaId: string, establecimientoId?: string) => {
  const scoped = lsKey(STORAGE_BASE_KEY, empresaId);
  const normalizedEstId = establecimientoId && establecimientoId.trim() !== ''
    ? establecimientoId.trim()
    : 'default';
  return `${scoped}:${normalizedEstId}`;
};

type RawBankAccount = BankAccount & {
  accountingAccount?: string;
  accountingAccountId?: string | null;
};

const reviveBankAccount = (raw: RawBankAccount, catalog: AccountingAccount[]): BankAccount => {
  const byCode = catalog.reduce<Record<string, string>>((acc, item) => {
    acc[item.code] = item.id;
    return acc;
  }, {});

  let accountingAccountId: string | null | undefined = raw.accountingAccountId ?? null;

  if (!accountingAccountId && raw.accountingAccount) {
    const matchedId = byCode[raw.accountingAccount];
    accountingAccountId = matchedId ?? null;
  }

  return {
    id: raw.id,
    bankId: raw.bankId,
    bankName: raw.bankName,
    accountType: raw.accountType,
    currencyCode: raw.currencyCode,
    description: raw.description,
    accountNumber: raw.accountNumber,
    cci: raw.cci,
    accountingAccountId,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt)
  };
};

const loadAccounts = async (empresaId: string, establecimientoId?: string): Promise<BankAccount[]> => {
  if (typeof window === 'undefined') return [];
  try {
    const data = window.localStorage.getItem(getStorageKey(empresaId, establecimientoId));
    if (!data) return [];
    const parsed = JSON.parse(data) as RawBankAccount[];
    const catalog = await accountingAccountsDataSource.list(empresaId, establecimientoId);
    const revived = parsed.map((item) => reviveBankAccount(item, catalog));

    // Persist migrated shape without legacy accountingAccount field
    persistAccounts(empresaId, establecimientoId ?? undefined, revived);
    return revived;
  } catch (error) {
    console.warn('[bankAccounts] no se pudieron leer cuentas', error);
    return [];
  }
};

const persistAccounts = (empresaId: string, establecimientoId: string | undefined, accounts: BankAccount[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getStorageKey(empresaId, establecimientoId), JSON.stringify(accounts));
  } catch (error) {
    console.warn('[bankAccounts] no se pudieron guardar cuentas', error);
  }
};

export interface BankAccountsDataSource {
  list: (empresaId: string, establecimientoId?: string) => Promise<BankAccount[]>;
  create: (empresaId: string, establecimientoId: string | undefined, input: BankAccountInput) => Promise<BankAccount>;
  update: (empresaId: string, establecimientoId: string | undefined, id: string, input: BankAccountInput) => Promise<BankAccount>;
  delete: (empresaId: string, establecimientoId: string | undefined, id: string) => Promise<void>;
}

const generateId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ba-${Date.now()}`);

export const bankAccountsDataSource: BankAccountsDataSource = {
  async list(empresaId, establecimientoId) {
    await new Promise((resolve) => setTimeout(resolve, 40));
    return loadAccounts(empresaId, establecimientoId);
  },
  async create(empresaId, establecimientoId, input) {
    await new Promise((resolve) => setTimeout(resolve, 60));
    const accounts = await loadAccounts(empresaId, establecimientoId);
    const now = new Date();
    const account: BankAccount = {
      id: generateId(),
      ...input,
      createdAt: now,
      updatedAt: now
    };
    const next = [...accounts, account];
    persistAccounts(empresaId, establecimientoId, next);
    return account;
  },
  async update(empresaId, establecimientoId, id, input) {
    await new Promise((resolve) => setTimeout(resolve, 60));
    const accounts = await loadAccounts(empresaId, establecimientoId);
    const idx = accounts.findIndex((item) => item.id === id);
    if (idx === -1) {
      throw new Error('Cuenta bancaria no encontrada');
    }
    const updated: BankAccount = {
      ...accounts[idx],
      ...input,
      updatedAt: new Date()
    };
    const next = [...accounts];
    next[idx] = updated;
    persistAccounts(empresaId, establecimientoId, next);
    return updated;
  },
  async delete(empresaId, establecimientoId, id) {
    await new Promise((resolve) => setTimeout(resolve, 40));
    const accounts = await loadAccounts(empresaId, establecimientoId);
    const next = accounts.filter((item) => item.id !== id);
    persistAccounts(empresaId, establecimientoId, next);
  }
};
