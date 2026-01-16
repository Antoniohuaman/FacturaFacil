import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import CreditScheduleEditor from '../../pages/Private/features/configuracion-sistema/components/business/CreditScheduleEditor';
import type { PaymentMethod } from '../../pages/Private/features/configuracion-sistema/models/PaymentMethod';
import type { CreditInstallmentDefinition } from './paymentTerms';
import { buildCreditPaymentMethodName, validateCreditScheduleTemplate } from './paymentTerms';
import { normalizePaymentMethodLabel } from './normalizePaymentMethodLabel';

interface CreditPaymentMethodModalProps {
  open: boolean;
  onClose: () => void;
  paymentMethods: PaymentMethod[];
  onUpdatePaymentMethods: (methods: PaymentMethod[]) => Promise<void> | void;
  editingMethod?: PaymentMethod | null;
  onCreated?: (method: PaymentMethod) => void;
}

const emptyForm: { code: string; name: string; creditSchedule: CreditInstallmentDefinition[] } = {
  code: 'CREDITO',
  name: '',
  creditSchedule: [],
};

export const CreditPaymentMethodModal: React.FC<CreditPaymentMethodModalProps> = ({
  open,
  onClose,
  paymentMethods,
  onUpdatePaymentMethods,
  editingMethod,
  onCreated,
}) => {
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editingMethod) {
      const schedule = editingMethod.creditSchedule ? [...editingMethod.creditSchedule] : [];
      setFormData({ code: editingMethod.code, name: editingMethod.name, creditSchedule: schedule });
    } else {
      setFormData(emptyForm);
    }
    setFormErrors([]);
  }, [editingMethod, open]);

  const handleCreditScheduleChange = (schedule: CreditInstallmentDefinition[]) => {
    const hasMeaningfulInstallment = schedule.some((item) =>
      ((item.diasCredito ?? 0) !== 0) || ((item.porcentaje ?? 0) !== 0)
    );

    setFormData(prev => ({
      ...prev,
      creditSchedule: schedule,
      name: hasMeaningfulInstallment
        ? buildCreditPaymentMethodName(schedule)
        : (editingMethod ? prev.name : ''),
    }));
    if (formErrors.length) {
      setFormErrors([]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedName = normalizePaymentMethodLabel(formData.name).trim();
    if (!formData.code.trim() || !normalizedName.trim()) return;
    if (!['CONTADO', 'CREDITO'].includes(formData.code)) {
      return;
    }

    if (formData.code === 'CREDITO' && formData.creditSchedule.length > 0) {
      const scheduleErrors = validateCreditScheduleTemplate(formData.creditSchedule);
      if (scheduleErrors.length > 0) {
        setFormErrors(scheduleErrors);
        return;
      }
    }

    setFormErrors([]);
    setIsSubmitting(true);

    try {
      const normalizedSchedule =
        formData.code === 'CREDITO' && formData.creditSchedule.length > 0
          ? formData.creditSchedule
          : undefined;

      let updatedMethods: PaymentMethod[];
      let createdMethod: PaymentMethod | undefined;

      if (editingMethod) {
        updatedMethods = paymentMethods.map(pm =>
          pm.id === editingMethod.id
            ? {
                ...pm,
                name: normalizedName,
                creditSchedule: pm.code === 'CREDITO' ? normalizedSchedule : undefined
              }
            : pm
        );
      } else {
        createdMethod = {
          id: Date.now().toString(),
          code: formData.code,
          name: normalizedName,
          type: formData.code === 'CONTADO' ? 'CASH' : 'CREDIT',
          sunatCode: formData.code === 'CONTADO' ? '001' : '002',
          sunatDescription: normalizedName,
          configuration: {
            requiresReference: false,
            allowsPartialPayments: true,
            requiresValidation: false,
            hasCommission: false,
            requiresCustomerData: false,
            allowsCashBack: false,
            requiresSignature: false
          },
          financial: {
            affectsCashFlow: true,
            settlementPeriod: 'IMMEDIATE'
          },
          display: {
            icon: 'MoreHorizontal',
            color: '#6b7280',
            displayOrder: paymentMethods.length + 1,
            isVisible: true,
            showInPos: true,
            showInInvoicing: true
          },
          validation: {
            documentTypes: [],
            customerTypes: ['INDIVIDUAL', 'BUSINESS'],
            allowedCurrencies: ['PEN']
          },
          creditSchedule: normalizedSchedule,
          isDefault: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        updatedMethods = [...paymentMethods, createdMethod];
        sessionStorage.setItem('lastCreatedPaymentMethod', createdMethod.id);
      }

      await onUpdatePaymentMethods(updatedMethods);
      if (createdMethod && onCreated) {
        onCreated(createdMethod);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  const title = editingMethod ? 'Editar crédito' : 'Nuevo crédito';
  const helper = editingMethod ? 'Puedes ajustar las cuotas configuradas.' : 'Se genera automáticamente según tus cuotas.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div
        className="w-full overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ width: 'min(92vw, 520px)' }}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-[11px] text-slate-500">{helper}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto px-4 py-3 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Nombre</label>
            <input
              type="text"
              value={normalizePaymentMethodLabel(formData.name)}
              readOnly
              className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
              placeholder=""
              required
              maxLength={50}
            />
            <p className="text-[11px] text-slate-500">Se autogenera según las cuotas.</p>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-white/60 p-3">
            <div className="flex items-start justify-between">
              <div>
                <h5 className="text-sm font-semibold text-slate-800">Cronograma por defecto</h5>
                <p className="text-[11px] text-slate-500">Define cuotas sugeridas (editable durante emisión).</p>
              </div>
              <span className="text-[11px] text-slate-500">Opcional</span>
            </div>
            <CreditScheduleEditor value={formData.creditSchedule} onChange={handleCreditScheduleChange} compact />
            {formErrors.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <ul className="list-disc pl-4 space-y-1">
                  {formErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.code.trim() || !formData.name.trim()}
              className="flex items-center space-x-2 rounded-md bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              <span>{editingMethod ? 'Actualizar' : 'Crear'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreditPaymentMethodModal;
