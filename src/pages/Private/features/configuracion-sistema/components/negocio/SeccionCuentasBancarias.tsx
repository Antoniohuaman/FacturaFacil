import { useMemo, useState } from 'react';
import { Banknote, Eye, EyeOff, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { currencyManager, type CurrencyDescriptor } from '@/shared/currency';
import { useBankAccounts } from '../../hooks/useCuentasBancarias';
import { useAccountingAccounts } from '../../hooks/useCuentasContables';
import type { BankAccount } from '../../modelos/BankAccount';
import { BANK_ACCOUNT_TYPES, BANK_CATALOG } from '../../modelos/BankAccount';
import { BankAccountFormModal } from './ModalFormularioCuentaBancaria';
import { ConfirmationModal } from '../comunes/ModalConfirmacion';
import { useToast } from '../../../comprobantes-electronicos/shared/ui/Toast/useToast';
import { ToastContainer } from '../../../comprobantes-electronicos/shared/ui/Toast/ToastContainer';

const typeLabel = BANK_ACCOUNT_TYPES.reduce<Record<string, string>>((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

export function BankAccountsSection() {
  const { accounts, loading, error, createAccount, updateAccount, deleteAccount, setFavoriteAccount } = useBankAccounts();
  const { accounts: accountingAccounts } = useAccountingAccounts();
  const { toasts, success, error: showError, removeToast } = useToast();

  const currencyOptions: CurrencyDescriptor[] = useMemo(() => {
    return currencyManager.getSnapshot().currencies;
  }, []);

  const getCurrencyLabel = (code?: string) => {
    if (!code) return '-';
    const upper = code.toUpperCase();
    if (['PEN', 'SOL', 'SOLES', 'S/'].includes(upper)) return 'Sol';
    if (upper === 'USD') return 'USD';
    return upper;
  };

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

  const handleToggleVisibility = async (account: BankAccount) => {
    try {
      const nextVisible = !account.isVisible;
      await updateAccount(account.id, {
        bankId: account.bankId,
        bankName: account.bankName,
        accountType: account.accountType,
        currencyCode: account.currencyCode,
        description: account.description,
        accountNumber: account.accountNumber,
        cci: account.cci,
        accountingAccountId: account.accountingAccountId,
        isVisible: nextVisible,
        isFavorite: account.isFavorite
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar la visibilidad';
      showError('Error', message);
    }
  };

  const handleToggleFavorite = async (target: BankAccount) => {
    try {
      const isCurrentlyFavorite = target.isFavorite ?? false;
      const nextId = isCurrentlyFavorite ? null : target.id;
      await setFavoriteAccount(nextId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar la cuenta favorita';
      showError('Error', message);
    }
  };

  const renderContent = () => {
    if (loading && !accounts.length) {
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

    const accountingById = accountingAccounts.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.code;
      return acc;
    }, {});

    return (
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full table-fixed divide-y divide-gray-200 text-sm">
          <colgroup>
            <col className="w-40" />
            <col className="w-32" />
            <col />
            <col className="w-20" />
            <col className="w-[200px]" />
            <col className="w-[220px]" />
            <col className="w-32" />
            <col className="w-[132px]" />
          </colgroup>
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Banco</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Tipo</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Descripción</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Moneda</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">N° Cuenta</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">CCI</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Cuenta contable</th>
              <th scope="col" className="sticky right-0 z-10 bg-gray-50 px-3 py-2 text-right font-semibold shadow-[inset_1px_0_0_0_rgba(229,231,235,1)]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white text-[13px]">
            {accounts.map((account) => (
              <tr key={account.id} className="hover:bg-gray-50">
                <td className="truncate px-3 py-2 text-gray-900" title={account.bankName}>{account.bankName}</td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-700">{typeLabel[account.accountType] ?? account.accountType}</td>
                <td className="truncate px-3 py-2 text-gray-700" title={account.description}>{account.description}</td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-700">{getCurrencyLabel(account.currencyCode)}</td>
                <td className="px-3 py-2">
                  <span
                    className="block max-w-[200px] truncate font-medium text-gray-900 tabular-nums"
                    title={account.accountNumber}
                  >
                    {account.accountNumber}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    className="block max-w-[220px] truncate text-gray-700 tabular-nums"
                    title={account.cci}
                  >
                    {account.cci}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-700 tabular-nums">
                  {account.accountingAccountId && accountingById[account.accountingAccountId]
                    ? accountingById[account.accountingAccountId]
                    : '—'}
                </td>
                <td className="sticky right-0 z-10 bg-white px-3 py-2 text-right shadow-[inset_1px_0_0_0_rgba(229,231,235,1)]">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleVisibility(account)}
                      className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                      title={account.isVisible ? 'Ocultar cuenta' : 'Mostrar cuenta'}
                    >
                      {account.isVisible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleToggleFavorite(account)}
                      className="rounded-md p-2 text-gray-500 transition hover:bg-yellow-50 hover:text-yellow-500"
                      title={account.isFavorite ? 'Quitar favorita' : 'Marcar como favorita'}
                    >
                      <Star className={`h-4 w-4 ${account.isFavorite ? 'text-yellow-400' : 'text-gray-300'}`} />
                    </button>
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
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Banknote className="h-4 w-4 text-blue-600" />
            <span>Cuentas bancarias</span>
          </div>
          <p className="text-sm text-gray-600">Gestiona cuentas bancarias del negocio.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{accounts.length} cuentas</div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
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
