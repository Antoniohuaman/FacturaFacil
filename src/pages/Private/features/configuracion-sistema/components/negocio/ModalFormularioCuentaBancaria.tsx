import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button, Select, Input } from '@/contasis';
import type { CurrencyDescriptor } from '@/shared/currency';
import type { BankAccount, BankAccountInput, BankAccountType } from '../../modelos/BankAccount';
import { BANK_ACCOUNT_TYPES } from '../../modelos/BankAccount';
import { useAccountingAccounts } from '../../hooks/useCuentasContables';
import { AccountingAccountModal } from './ModalCuentaContable';
import type { AccountingAccountInput } from '../../modelos/AccountingAccount';

interface BankAccountFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: BankAccount;
  bankOptions: Array<{ id: string; name: string }>;
  currencyOptions: CurrencyDescriptor[];
  onClose: () => void;
  onSubmit: (values: BankAccountInput) => Promise<void>;
}

interface FormState {
  bankId: string;
  accountType: BankAccountType;
  currencyCode: string;
  description: string;
  accountNumber: string;
  cci: string;
  accountingAccountId?: string | null;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const emptyForm: FormState = {
  bankId: '',
  accountType: 'CHECKING',
  currencyCode: '',
  description: '',
  accountNumber: '',
  cci: '',
  accountingAccountId: null
};

export function BankAccountFormModal({
  isOpen,
  mode,
  initialData,
  bankOptions,
  currencyOptions,
  onClose,
  onSubmit
}: BankAccountFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const { accounts: accountingAccounts, createAccount: createAccountingAccount, refresh: refreshAccountingAccounts } = useAccountingAccounts();
  const [showAccountingModal, setShowAccountingModal] = useState(false);

  const handleAccountingModalClose = () => {
    setShowAccountingModal(false);
  };

  const handleAccountingModalSubmit = async (input: AccountingAccountInput) => {
    const created = await createAccountingAccount(input);
    await refreshAccountingAccounts();
    setForm((prev) => ({ ...prev, accountingAccountId: created.id }));
    setShowAccountingModal(false);
  };

  useEffect(() => {
    if (isOpen && initialData) {
      setForm({
        bankId: initialData.bankId,
        accountType: initialData.accountType,
        currencyCode: initialData.currencyCode,
        description: initialData.description,
        accountNumber: initialData.accountNumber,
        cci: initialData.cci,
        accountingAccountId: initialData.accountingAccountId ?? null
      });
      setErrors({});
    } else if (isOpen) {
      setForm(emptyForm);
      setErrors({});
    }
  }, [initialData, isOpen]);

  const bankNameById = useMemo(() => {
    return bankOptions.reduce<Record<string, string>>((acc, bank) => {
      acc[bank.id] = bank.name;
      return acc;
    }, {});
  }, [bankOptions]);

  const sanitizeDigits = (value: string) => value.replace(/\D+/g, '');

  const validate = (draft: FormState): FormErrors => {
    const next: FormErrors = {};
    if (!draft.bankId) next.bankId = 'Selecciona un banco';
    if (!draft.accountType) next.accountType = 'Selecciona el tipo de cuenta';
    if (!draft.currencyCode) next.currencyCode = 'Selecciona la moneda';
    if (!draft.description.trim()) next.description = 'Ingresa una descripción';
    if (!draft.accountNumber.trim()) next.accountNumber = 'Ingresa el número de cuenta';
    if (!draft.cci.trim()) next.cci = 'Ingresa el CCI';
    if (draft.accountNumber && /\D/.test(draft.accountNumber)) {
      next.accountNumber = 'Solo dígitos';
    }
    if (draft.cci && /\D/.test(draft.cci)) {
      next.cci = 'Solo dígitos';
    }
    return next;
  };

  const handleClose = () => {
    if (submitting) return;
    setShowAccountingModal(false);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const draft = {
      ...form,
      accountNumber: sanitizeDigits(form.accountNumber),
      cci: sanitizeDigits(form.cci),
      accountingAccountId: form.accountingAccountId || null
    };

    const validation = validate(draft);
    if (Object.keys(validation).length) {
      setErrors(validation);
      setForm((prev) => ({ ...prev, ...draft }));
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await onSubmit({
        bankId: draft.bankId,
        bankName: bankNameById[draft.bankId] || draft.bankId,
        accountType: draft.accountType,
        currencyCode: draft.currencyCode,
        description: draft.description.trim(),
        accountNumber: draft.accountNumber,
        cci: draft.cci,
        accountingAccountId: draft.accountingAccountId ?? null
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black bg-opacity-40" onClick={handleClose} />
        <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Información bancaria</p>
              <h2 className="text-lg font-semibold text-gray-900">
                {mode === 'create' ? 'Agregar información bancaria' : 'Editar información bancaria'}
              </h2>
            </div>
            <Button
              variant="tertiary"
              size="sm"
              icon={<X />}
              iconOnly
              onClick={handleClose}
            />
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Select
                  label="Banco"
                  value={form.bankId}
                  onChange={(e) => setForm((prev) => ({ ...prev, bankId: e.target.value }))}
                  options={[
                    { value: '', label: 'Selecciona un banco' },
                    ...bankOptions.map((bank) => ({ value: bank.id, label: bank.name }))
                  ]}
                  error={errors.bankId}
                  helperText={errors.bankId}
                  required
                  size="small"
                />
              </div>

              <div className="space-y-1.5">
                <Select
                  label="Tipo de cuenta"
                  value={form.accountType}
                  onChange={(e) => setForm((prev) => ({ ...prev, accountType: e.target.value as BankAccountType }))}
                  options={BANK_ACCOUNT_TYPES.map((item) => ({ value: item.value, label: item.label }))}
                  error={errors.accountType}
                  helperText={errors.accountType}
                  required
                  size="small"
                />
              </div>

              <div className="space-y-1.5">
                <Select
                  label="Moneda"
                  value={form.currencyCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, currencyCode: e.target.value }))}
                  options={[
                    { value: '', label: 'Selecciona la moneda' },
                    ...currencyOptions.map((currency) => ({
                      value: currency.code,
                      label: `${currency.code} · ${currency.name}`
                    }))
                  ]}
                  error={errors.currencyCode}
                  helperText={errors.currencyCode}
                  required
                  size="small"
                />
              </div>

              <Input
                label="Descripción *"
                type="text"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                maxLength={60}
                placeholder="Alias o etiqueta"
                error={errors.description}
              />

              <Input
                label="Número de cuenta *"
                type="text"
                inputMode="numeric"
                value={form.accountNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, accountNumber: sanitizeDigits(e.target.value) }))}
                maxLength={30}
                placeholder="Solo dígitos"
                error={errors.accountNumber}
              />

              <Input
                label="CCI *"
                type="text"
                inputMode="numeric"
                value={form.cci}
                onChange={(e) => setForm((prev) => ({ ...prev, cci: sanitizeDigits(e.target.value) }))}
                maxLength={30}
                placeholder="Código de cuenta interbancario"
                error={errors.cci}
              />

              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-gray-700">Cuenta contable (opcional)</label>
                  <Button
                    onClick={() => setShowAccountingModal(true)}
                    variant="tertiary"
                    size="sm"
                  >
                    Crear cuenta contable
                  </Button>
                </div>

                {accountingAccounts.length ? (
                  <div className="flex items-center gap-2">
                    <Select
                      value={form.accountingAccountId ?? ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, accountingAccountId: e.target.value || null }))}
                      options={[
                        { value: '', label: 'Sin cuenta contable' },
                        ...accountingAccounts.map((account) => ({ value: account.id, label: account.code }))
                      ]}
                      size="small"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600">
                    <span>Aún no tienes cuentas contables.</span>
                    <Button
                      onClick={() => setShowAccountingModal(true)}
                      variant="tertiary"
                      size="sm"
                    >
                      Crear
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
              <Button
                variant="secondary"
                size="md"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={submitting}
              >
                Guardar
              </Button>
            </div>
          </form>
        </div>
      </div>

      <AccountingAccountModal
        isOpen={showAccountingModal}
        mode="create"
        onClose={handleAccountingModalClose}
        onSubmit={handleAccountingModalSubmit}
      />
    </>
  );
}
