import { lsKey } from '../../../shared/tenant';
import type { BankAccount, BankAccountInput } from '../models/BankAccount';

const STORAGE_BASE_KEY = 'config_bank_accounts_v1';

const getStorageKey = (empresaId: string, establecimientoId?: string) => {
  const scoped = lsKey(STORAGE_BASE_KEY, empresaId);
  const normalizedEstId = establecimientoId && establecimientoId.trim() !== ''
    ? establecimientoId.trim()
    : 'default';
  return `${scoped}:${normalizedEstId}`;
};

const reviveBankAccount = (raw: BankAccount): BankAccount => ({
  ...raw,
  createdAt: new Date(raw.createdAt),
  updatedAt: new Date(raw.updatedAt)
});

const loadAccounts = (empresaId: string, establecimientoId?: string): BankAccount[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = window.localStorage.getItem(getStorageKey(empresaId, establecimientoId));
    if (!data) return [];
    const parsed = JSON.parse(data) as BankAccount[];
    return parsed.map(reviveBankAccount);
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
    const accounts = loadAccounts(empresaId, establecimientoId);
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
    const accounts = loadAccounts(empresaId, establecimientoId);
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
    const accounts = loadAccounts(empresaId, establecimientoId);
    const next = accounts.filter((item) => item.id !== id);
    persistAccounts(empresaId, establecimientoId, next);
  }
};
