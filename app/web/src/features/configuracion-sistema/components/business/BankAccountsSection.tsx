import { useMemo, useState } from 'react';
import { Banknote, Pencil, Plus, Trash2 } from 'lucide-react';
import { currencyManager, type CurrencyDescriptor } from '@/shared/currency';
import { useConfigurationContext } from '../../context/ConfigurationContext';
import { useBankAccounts } from '../../hooks/useBankAccounts';
import type { BankAccount } from '../../models/BankAccount';
import { BANK_ACCOUNT_TYPES, BANK_CATALOG } from '../../models/BankAccount';
import { BankAccountFormModal } from './BankAccountFormModal';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { useToast } from '../../../comprobantes-electronicos/shared/ui/Toast/useToast';
import { ToastContainer } from '../../../comprobantes-electronicos/shared/ui/Toast/ToastContainer';

const typeLabel = BANK_ACCOUNT_TYPES.reduce<Record<string, string>>((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

export function BankAccountsSection() {
  const { state } = useConfigurationContext();
  const { accounts, loading, error, createAccount, updateAccount, deleteAccount } = useBankAccounts();
  const { toasts, success, error: showError, removeToast } = useToast();

  const currencyOptions: CurrencyDescriptor[] = useMemo(() => {
    if (state.currencies && state.currencies.length) return state.currencies;
    return currencyManager.getSnapshot().currencies;
  }, [state.currencies]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [deleting, setDeleting] = useState<BankAccount | null>(null);

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (account: BankAccount) => {
    setEditing(account);
    setShowModal(true);
  };

  const handleSubmit = async (values: Parameters<typeof createAccount>[0]) => {
    try {
      if (editing) {
        await updateAccount(editing.id, values);
        success('Cuenta actualizada', 'Los datos se guardaron correctamente.');
      } else {
        await createAccount(values);
        success('Cuenta agregada', 'La cuenta bancaria se creó en esta sesión.');
      }
      setEditing(null);
      setShowModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar la cuenta';
      showError('Error', message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteAccount(deleting.id);
      success('Cuenta eliminada', 'La cuenta bancaria se eliminó correctamente.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar la cuenta';
      showError('Error', message);
    } finally {
      setDeleting(null);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-2">
          <div className="h-9 w-full animate-pulse rounded-md bg-gray-100" />
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="h-12 w-full animate-pulse rounded-md bg-gray-50" />
          ))}
        </div>
      );
    }

    if (!accounts.length) {
      return (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Banknote className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-gray-900">Aún no tienes cuentas bancarias</h3>
          <p className="mt-1 text-sm text-gray-600">
            Registra las cuentas que usarás para pagos y conciliaciones.
          </p>
          <div className="mt-4">
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Agregar cuenta bancaria
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">Banco</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">Tipo de cuenta</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">Descripción</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">Moneda</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">N° Cuenta</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">CCI</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">Cuenta contable</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {accounts.map((account) => {
              const currencyLabel = currencyOptions.find((c) => c.code === account.currencyCode)?.name ?? account.currencyCode;
              return (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-900">{account.bankName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{typeLabel[account.accountType] ?? account.accountType}</td>
                  <td className="px-4 py-3 text-gray-700">{account.description}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{account.currencyCode} · {currencyLabel}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 tracking-tight">{account.accountNumber}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{account.cci}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{account.accountingAccount}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
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
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Banknote className="h-4 w-4" />
            Información bancaria
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Cuentas bancarias</h2>
            <p className="text-sm text-gray-600">Administra las cuentas asociadas a tu empresa y establecimiento.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{accounts.length} cuentas</div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Agregar cuenta bancaria
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {renderContent()}

      <BankAccountFormModal
        isOpen={showModal}
        mode={editing ? 'edit' : 'create'}
        initialData={editing ?? undefined}
        bankOptions={BANK_CATALOG}
        currencyOptions={currencyOptions}
        onClose={() => {
          setShowModal(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmationModal
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar cuenta bancaria"
        message={`¿Seguro que deseas eliminar la cuenta "${deleting?.description ?? ''}"? Esta acción no se puede deshacer.`}
        type="danger"
        confirmText="Eliminar"
        cancelText="Cancelar"
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
