import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import { accountingAccountsDataSource } from '../api/accountingAccountsDataSource';
import type { AccountingAccount, AccountingAccountInput } from '../models/AccountingAccount';

interface UseAccountingAccountsReturn {
  accounts: AccountingAccount[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createAccount: (input: AccountingAccountInput) => Promise<AccountingAccount>;
  updateAccount: (id: string, input: AccountingAccountInput) => Promise<AccountingAccount>;
  deleteAccount: (id: string) => Promise<void>;
}

export function useAccountingAccounts(): UseAccountingAccountsReturn {
  const { session } = useUserSession();
  const empresaId = session?.currentCompanyId || '';
  const establecimientoId = session?.currentEstablishmentId || '';

  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scopeReady = useMemo(() => empresaId.trim() !== '', [empresaId]);

  const refresh = useCallback(async () => {
    if (!scopeReady) {
      setAccounts([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await accountingAccountsDataSource.list(empresaId, establecimientoId);
      setAccounts(list);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar las cuentas contables';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [empresaId, establecimientoId, scopeReady]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createAccount = useCallback(async (input: AccountingAccountInput) => {
    if (!scopeReady) throw new Error('Selecciona una empresa para registrar cuentas contables');
    setLoading(true);
    setError(null);
    try {
      const created = await accountingAccountsDataSource.create(empresaId, establecimientoId, input);
      setAccounts((prev) => [...prev, created]);
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear la cuenta contable';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [empresaId, establecimientoId, scopeReady]);

  const updateAccount = useCallback(async (id: string, input: AccountingAccountInput) => {
    if (!scopeReady) throw new Error('Selecciona una empresa para actualizar cuentas contables');
    setLoading(true);
    setError(null);
    try {
      const updated = await accountingAccountsDataSource.update(empresaId, establecimientoId, id, input);
      setAccounts((prev) => prev.map((item) => (item.id === id ? updated : item)));
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar la cuenta contable';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [empresaId, establecimientoId, scopeReady]);

  const deleteAccount = useCallback(async (id: string) => {
    if (!scopeReady) throw new Error('Selecciona una empresa para eliminar cuentas contables');
    setLoading(true);
    setError(null);
    try {
      await accountingAccountsDataSource.delete(empresaId, establecimientoId, id);
      setAccounts((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar la cuenta contable';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [empresaId, establecimientoId, scopeReady]);

  return {
    accounts,
    loading,
    error,
    refresh,
    createAccount,
    updateAccount,
    deleteAccount
  };
}
