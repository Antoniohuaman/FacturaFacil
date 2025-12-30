import { lsKey } from '../../../shared/tenant';
import type { AccountingAccount, AccountingAccountInput } from '../models/AccountingAccount';

const STORAGE_BASE_KEY = 'config_accounting_accounts_v1';

const getStorageKey = (empresaId: string, establecimientoId?: string) => {
  const scoped = lsKey(STORAGE_BASE_KEY, empresaId);
  const normalizedEstId = establecimientoId && establecimientoId.trim() !== ''
    ? establecimientoId.trim()
    : 'default';
  return `${scoped}:${normalizedEstId}`;
};

const reviveAccount = (raw: AccountingAccount): AccountingAccount => ({
  ...raw,
  createdAt: new Date(raw.createdAt),
  updatedAt: new Date(raw.updatedAt)
});

const loadAccounts = (empresaId: string, establecimientoId?: string): AccountingAccount[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = window.localStorage.getItem(getStorageKey(empresaId, establecimientoId));
    if (!data) return [];
    const parsed = JSON.parse(data) as AccountingAccount[];
    return parsed.map(reviveAccount);
  } catch (error) {
    console.warn('[accountingAccounts] no se pudieron leer cuentas contables', error);
    return [];
  }
};

const persistAccounts = (
  empresaId: string,
  establecimientoId: string | undefined,
  accounts: AccountingAccount[]
) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getStorageKey(empresaId, establecimientoId), JSON.stringify(accounts));
  } catch (error) {
    console.warn('[accountingAccounts] no se pudieron guardar cuentas contables', error);
  }
};

const normalizeCode = (code: string) => code.trim();
const isValidCode = (code: string) => /^\d{1,12}$/.test(code);

export interface AccountingAccountsDataSource {
  list: (empresaId: string, establecimientoId?: string) => Promise<AccountingAccount[]>;
  create: (
    empresaId: string,
    establecimientoId: string | undefined,
    input: AccountingAccountInput
  ) => Promise<AccountingAccount>;
  update: (
    empresaId: string,
    establecimientoId: string | undefined,
    id: string,
    input: AccountingAccountInput
  ) => Promise<AccountingAccount>;
  delete: (empresaId: string, establecimientoId: string | undefined, id: string) => Promise<void>;
}

const generateId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `aa-${Date.now()}`);

export const accountingAccountsDataSource: AccountingAccountsDataSource = {
  async list(empresaId, establecimientoId) {
    await new Promise((resolve) => setTimeout(resolve, 40));
    return loadAccounts(empresaId, establecimientoId);
  },
  async create(empresaId, establecimientoId, input) {
    await new Promise((resolve) => setTimeout(resolve, 60));
    const accounts = loadAccounts(empresaId, establecimientoId);
    const code = normalizeCode(input.code);
    if (!isValidCode(code)) {
      throw new Error('El código debe tener entre 1 y 12 dígitos');
    }
    if (accounts.some((item) => item.code === code)) {
      throw new Error('Ya existe una cuenta contable con ese código');
    }
    const now = new Date();
    const account: AccountingAccount = {
      id: generateId(),
      code,
      createdAt: now,
      updatedAt: now
    };
    const next = [...accounts, account];
    persistAccounts(empresaId, establecimientoId, next);
    return account;
  },
  async update(empresaId, establecimientoId, id, input) {
    await new Promise((resolve) => setTimeout(resolve, 60));
    const accounts = loadAccounts(empresaId, establecimientoId);
    const idx = accounts.findIndex((item) => item.id === id);
    if (idx === -1) throw new Error('Cuenta contable no encontrada');

    const code = normalizeCode(input.code);
    if (!isValidCode(code)) {
      throw new Error('El código debe tener entre 1 y 12 dígitos');
    }
    if (accounts.some((item) => item.id !== id && item.code === code)) {
      throw new Error('Ya existe una cuenta contable con ese código');
    }

    const updated: AccountingAccount = {
      ...accounts[idx],
      code,
      updatedAt: new Date()
    };
    const next = [...accounts];
    next[idx] = updated;
    persistAccounts(empresaId, establecimientoId, next);
    return updated;
  },
  async delete(empresaId, establecimientoId, id) {
    await new Promise((resolve) => setTimeout(resolve, 40));
    const accounts = loadAccounts(empresaId, establecimientoId);
    const next = accounts.filter((item) => item.id !== id);
    persistAccounts(empresaId, establecimientoId, next);
  }
};
