import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { AccountingAccount, AccountingAccountInput } from '../../models/AccountingAccount';

interface AccountingAccountModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: AccountingAccount;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (input: AccountingAccountInput) => Promise<void>;
}

export function AccountingAccountModal({
  isOpen,
  mode,
  initialData,
  errorMessage,
  onClose,
  onSubmit
}: AccountingAccountModalProps) {
  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCode(initialData?.code ?? '');
      setFieldError(null);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const sanitizeDigits = (value: string) => value.replace(/\D+/g, '').slice(0, 12);

  const validate = (value: string): string | null => {
    if (!value) return 'Ingresa el código contable';
    if (!/^\d+$/.test(value)) return 'Solo dígitos';
    if (value.length > 12) return 'Máximo 12 dígitos';
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = code.trim();
    const validation = validate(normalized);
    if (validation) {
      setFieldError(validation);
      return;
    }

    setSubmitting(true);
    setFieldError(null);
    try {
      await onSubmit({ code: normalized });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar la cuenta contable';
      setFieldError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === 'create' ? 'Agregar cuenta contable' : 'Editar cuenta contable';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-40" onClick={submitting ? undefined : onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Catálogo contable</p>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md p-2 text-gray-400 transition hover:text-gray-600 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700" htmlFor="accounting-code">
              Código de cuenta contable
            </label>
            <input
              id="accounting-code"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={code}
              onChange={(event) => setCode(sanitizeDigits(event.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej. 1041"
              maxLength={12}
            />
            <p className="text-xs text-gray-500">Solo dígitos, máximo 12. Se conserva el formato exacto (sin perder ceros).</p>
            {(fieldError || errorMessage) && (
              <p className="text-xs text-red-600">{fieldError || errorMessage}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
