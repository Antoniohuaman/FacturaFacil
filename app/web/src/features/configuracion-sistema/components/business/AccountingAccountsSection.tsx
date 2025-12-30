import { useState } from 'react';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAccountingAccounts } from '../../hooks/useAccountingAccounts';
import { useBankAccounts } from '../../hooks/useBankAccounts';
import type { AccountingAccount } from '../../models/AccountingAccount';
import { AccountingAccountModal } from './AccountingAccountModal';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface AccountingAccountsSectionProps {
  onBack?: () => void;
}

export function AccountingAccountsSection({ onBack }: AccountingAccountsSectionProps) {
  const { accounts, loading, error, createAccount, updateAccount, deleteAccount } = useAccountingAccounts();
  const { accounts: bankAccounts } = useBankAccounts();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AccountingAccount | null>(null);
  const [deleting, setDeleting] = useState<AccountingAccount | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (account: AccountingAccount) => {
    setEditing(account);
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setFormError(null);
  };

  const handleSubmit = async (input: { code: string }) => {
    setFormError(null);
    if (editing) {
      await updateAccount(editing.id, input);
    } else {
      await createAccount(input);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    try {
      const linkedCount = bankAccounts.filter(
        (bankAccount) => bankAccount.accountingAccountId === deleting.id
      ).length;

      if (linkedCount > 0) {
        setFormError(
          `No se puede eliminar porque está asociada a ${linkedCount} cuenta${linkedCount > 1 ? 's' : ''} bancaria. Desvincúlala primero.`
        );
        return;
      }

      await deleteAccount(deleting.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar la cuenta contable';
      setFormError(message);
    } finally {
      setDeleting(null);
    }
  };

  const renderSkeleton = () => (
    <div className="space-y-2">
      <div className="h-9 w-48 animate-pulse rounded-md bg-gray-100" />
      {[...Array(3)].map((_, idx) => (
        <div key={idx} className="h-10 w-full animate-pulse rounded-md bg-gray-50" />
      ))}
    </div>
  );

  const renderEmpty = () => (
    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        <Plus className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-base font-semibold text-gray-900">Sin cuentas contables</h3>
      <p className="mt-1 text-sm text-gray-600">Agrega los códigos de tu plan contable.</p>
      <div className="mt-4">
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Agregar cuenta contable
        </button>
      </div>
    </div>
  );

  const renderTable = () => (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full table-fixed divide-y divide-gray-200 text-sm">
        <colgroup>
          <col />
          <col className="w-28" />
        </colgroup>
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-semibold">Código</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white text-[13px]">
          {accounts.map((account) => (
            <tr key={account.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-semibold text-gray-900 tabular-nums">{account.code}</td>
              <td className="px-3 py-2 text-right">
                <div className="inline-flex items-center gap-1.5">
                  <button
                    onClick={() => openEdit(account)}
                    className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleting(account)}
                    className="rounded-md p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Datos contables</p>
          <h2 className="text-xl font-semibold text-gray-900">Cuentas contables</h2>
          <p className="text-sm text-gray-600">Administra los códigos de tu plan contable.</p>
        </div>
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
          )}
          {accounts.length > 0 && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Agregar cuenta contable
            </button>
          )}
        </div>
      </div>

      {(error || formError) && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError || error}
        </div>
      )}

      {loading ? renderSkeleton() : accounts.length === 0 ? renderEmpty() : renderTable()}

      <AccountingAccountModal
        isOpen={showModal}
        mode={editing ? 'edit' : 'create'}
        initialData={editing ?? undefined}
        errorMessage={formError}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <ConfirmationModal
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar cuenta contable"
        message={`¿Seguro que deseas eliminar la cuenta "${deleting?.code ?? ''}"? Esta acción no se puede deshacer.`}
        type="danger"
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
}
