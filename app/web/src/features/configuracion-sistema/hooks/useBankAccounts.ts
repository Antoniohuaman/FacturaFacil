import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserSession } from '../../../contexts/UserSessionContext';
import { bankAccountsDataSource } from '../api/bankAccountsDataSource';
import type { BankAccount, BankAccountInput } from '../models/BankAccount';

interface UseBankAccountsReturn {
  accounts: BankAccount[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createAccount: (input: BankAccountInput) => Promise<BankAccount>;
  updateAccount: (id: string, input: BankAccountInput) => Promise<BankAccount>;
  deleteAccount: (id: string) => Promise<void>;
  setFavoriteAccount: (id: string | null) => Promise<void>;
}

export function useBankAccounts(): UseBankAccountsReturn {
  const { session } = useUserSession();
  const empresaId = session?.currentCompanyId || '';
  const establecimientoId = session?.currentEstablishmentId || '';

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
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
      const list = await bankAccountsDataSource.list(empresaId, establecimientoId);
      setAccounts(list);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar las cuentas bancarias';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [empresaId, establecimientoId, scopeReady]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createAccount = useCallback(async (input: BankAccountInput) => {
    if (!scopeReady) throw new Error('Selecciona una empresa para registrar cuentas bancarias');
    setError(null);
    try {
      const created = await bankAccountsDataSource.create(empresaId, establecimientoId, input);
      setAccounts((prev) => [...prev, created]);
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear la cuenta bancaria';
      setError(message);
      throw err;
    }
  }, [empresaId, establecimientoId, scopeReady]);

  const updateAccount = useCallback(async (id: string, input: BankAccountInput) => {
    if (!scopeReady) throw new Error('Selecciona una empresa para actualizar cuentas bancarias');
    setError(null);
    try {
      // Optimistic update: reflect changes immediately in local state
      setAccounts((prev) => {
        const idx = prev.findIndex((item) => item.id === id);
        if (idx === -1) return prev;
        const updated: BankAccount = {
          ...prev[idx],
          ...input,
          updatedAt: new Date()
        };
        const next = [...prev];
        next[idx] = updated;
        return next;
      });

      const updated = await bankAccountsDataSource.update(empresaId, establecimientoId, id, input);
      setAccounts((prev) => prev.map((item) => (item.id === id ? updated : item)));
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar la cuenta bancaria';
      setError(message);
      // Revert by reloading the list on error
      try {
        const list = await bankAccountsDataSource.list(empresaId, establecimientoId);
        setAccounts(list);
      } catch {
        // ignore secondary error
      }
      throw err;
    }
  }, [empresaId, establecimientoId, scopeReady]);

  const deleteAccount = useCallback(async (id: string) => {
    if (!scopeReady) throw new Error('Selecciona una empresa para eliminar cuentas bancarias');
    setLoading(true);
    setError(null);
    try {
      await bankAccountsDataSource.delete(empresaId, establecimientoId, id);
      setAccounts((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar la cuenta bancaria';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [empresaId, establecimientoId, scopeReady]);

  const setFavoriteAccount = useCallback(async (id: string | null) => {
    if (!scopeReady) throw new Error('Selecciona una empresa para actualizar cuentas bancarias');
    setError(null);
    try {
      // Optimistic favorite update: ensure only one favorite locally
      setAccounts((prev) => {
        const now = new Date();
        return prev.map((account) => {
          const shouldBeFavorite = id !== null && account.id === id;
          if ((account.isFavorite ?? false) === shouldBeFavorite) {
            return account;
          }
          return {
            ...account,
            isFavorite: shouldBeFavorite,
            updatedAt: now
          };
        });
      });

      const updatedList = await bankAccountsDataSource.setFavorite(empresaId, establecimientoId, id);
      setAccounts(updatedList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar la cuenta favorita';
      setError(message);
      // Revert by reloading on error
      try {
        const list = await bankAccountsDataSource.list(empresaId, establecimientoId);
        setAccounts(list);
      } catch {
        // ignore secondary error
      }
      throw err;
    }
  }, [empresaId, establecimientoId, scopeReady]);

  return {
    accounts,
    loading,
    error,
    refresh,
    createAccount,
    updateAccount,
    deleteAccount,
    setFavoriteAccount
  };
}
