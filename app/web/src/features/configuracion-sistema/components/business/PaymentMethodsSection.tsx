// src/features/configuration/components/business/PaymentMethodsSection.tsx
import { useEffect, useState } from 'react';
import { CreditCard, Plus, Edit3, Trash2, Star, Eye, EyeOff, X } from 'lucide-react';
import type { PaymentMethod } from '../../models/PaymentMethod';
import { DefaultSelector } from '../common/DefaultSelector';
import { ConfigurationCard } from '../common/ConfigurationCard';
import CreditScheduleEditor from './CreditScheduleEditor';
import type { CreditInstallmentDefinition } from '../../../../shared/payments/paymentTerms';
import { buildCreditPaymentMethodName, validateCreditScheduleTemplate } from '../../../../shared/payments/paymentTerms';

type PaymentMeanDefinition = {
  code: string;
  sunatName: string;
  defaultLabel: string;
};

const PAYMENT_MEANS_CATALOG: PaymentMeanDefinition[] = [
  { code: '001', sunatName: 'Depósito en cuenta', defaultLabel: 'Depósito' },
  { code: '002', sunatName: 'Giro', defaultLabel: 'Giro' },
  { code: '003', sunatName: 'Transferencia de fondos', defaultLabel: 'Transferencia' },
  { code: '004', sunatName: 'Orden de pago', defaultLabel: 'Orden pago' },
  { code: '005', sunatName: 'Tarjeta de débito', defaultLabel: 'Tarjeta débito' },
  { code: '006', sunatName: 'Tarjeta de crédito (sistema financiero)', defaultLabel: 'Tarjeta crédito' },
  { code: '007', sunatName: 'Cheques no negociables / …', defaultLabel: 'Cheque' },
  { code: '008', sunatName: 'Efectivo (sin obligación de medio)', defaultLabel: 'Efectivo' },
  { code: '009', sunatName: 'Efectivo (demás casos)', defaultLabel: 'Efectivo' },
  { code: '010', sunatName: 'Medios de pago usados en comercio exterior', defaultLabel: 'Com. exterior' },
  { code: '011', sunatName: 'Documentos EDPYMES / cooperativas…', defaultLabel: 'EDPYMES' },
  { code: '012', sunatName: 'Tarjeta crédito (no sist. financiero)', defaultLabel: 'Tarj. crédito' },
  { code: '013', sunatName: 'Tarjetas crédito exterior (no domiciliadas)', defaultLabel: 'Tarj. exterior' },
  { code: '101', sunatName: 'Transferencias – Comercio exterior', defaultLabel: 'Transf. ext' },
  { code: '102', sunatName: 'Cheques bancarios – Comercio exterior', defaultLabel: 'Cheque ext' },
  { code: '103', sunatName: 'Orden de pago simple – Comercio exterior', defaultLabel: 'Orden simple' },
  { code: '104', sunatName: 'Orden de pago documentario – Comercio exterior', defaultLabel: 'Orden doc' },
  { code: '105', sunatName: 'Remesa simple – Comercio exterior', defaultLabel: 'Remesa simple' },
  { code: '106', sunatName: 'Remesa documentaria – Comercio exterior', defaultLabel: 'Remesa doc' },
  { code: '107', sunatName: 'Carta de crédito simple – Comercio exterior', defaultLabel: 'Carta simple' },
  { code: '108', sunatName: 'Carta de crédito documentario – Comercio exterior', defaultLabel: 'Carta doc' },
  { code: '999', sunatName: 'Otros medios de pago', defaultLabel: 'Otros' }
];

interface PaymentMethodsSectionProps {
  paymentMethods: PaymentMethod[];
  onUpdate: (methods: PaymentMethod[]) => Promise<void>;
  isLoading?: boolean;
}

export function PaymentMethodsSection({ 
  paymentMethods, 
  onUpdate, 
  isLoading = false 
}: PaymentMethodsSectionProps) {
  const [activeTab, setActiveTab] = useState<'forms' | 'means'>('forms');
  const [labelByCode, setLabelByCode] = useState<Record<string, string>>(() =>
    PAYMENT_MEANS_CATALOG.reduce((acc, mean) => {
      acc[mean.code] = mean.defaultLabel;
      return acc;
    }, {} as Record<string, string>)
  );
  const [visibleByCode, setVisibleByCode] = useState<Record<string, boolean>>(() =>
    PAYMENT_MEANS_CATALOG.reduce((acc, mean) => {
      acc[mean.code] = true;
      return acc;
    }, {} as Record<string, boolean>)
  );
  const [favoriteByCode, setFavoriteByCode] = useState<Record<string, boolean>>(() =>
    PAYMENT_MEANS_CATALOG.reduce((acc, mean) => {
      acc[mean.code] = false;
      return acc;
    }, {} as Record<string, boolean>)
  );
  const [defaultCode, setDefaultCode] = useState<string | null>('008');
  const [editingMeanCode, setEditingMeanCode] = useState<string | null>(null);
  const [meanDraft, setMeanDraft] = useState<{ label: string; visible: boolean; favorite: boolean; isDefault: boolean }>({
    label: '',
    visible: true,
    favorite: false,
    isDefault: false,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ code: string; name: string; creditSchedule: CreditInstallmentDefinition[] }>({ code: '', name: '', creditSchedule: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const isCredit = formData.code === 'CREDITO';

  // Agrupar métodos por código normativo (CONTADO vs CREDITO)
  const contadoMethods = paymentMethods.filter(pm => pm.code === 'CONTADO');
  const creditoMethods = paymentMethods.filter(pm => pm.code === 'CREDITO');
  const editingMean = editingMeanCode
    ? PAYMENT_MEANS_CATALOG.find(item => item.code === editingMeanCode)
    : undefined;

  useEffect(() => {
    if (!editingMeanCode) return;
    const mean = PAYMENT_MEANS_CATALOG.find(item => item.code === editingMeanCode);
    if (!mean) return;

    setMeanDraft({
      label: labelByCode[mean.code] ?? mean.defaultLabel,
      visible: visibleByCode[mean.code] ?? true,
      favorite: favoriteByCode[mean.code] ?? false,
      isDefault: defaultCode === mean.code,
    });
  }, [editingMeanCode, labelByCode, visibleByCode, favoriteByCode, defaultCode]);

  const resetForm = () => {
    setFormData({ code: '', name: '', creditSchedule: [] });
    setEditingId(null);
    setShowForm(false);
    setFormErrors([]);
  };

  const handleEdit = (method: PaymentMethod) => {
    const schedule = method.creditSchedule ? [...method.creditSchedule] : [];
    const normalizedName = method.code === 'CREDITO'
      ? buildCreditPaymentMethodName(schedule)
      : method.name;
    setFormData({ code: method.code, name: normalizedName, creditSchedule: schedule });
    setEditingId(method.id);
    setShowForm(true);
    setFormErrors([]);
  };

  const handleCodeChange = (code: string) => {
    setFormData(prev => {
      if (code === 'CREDITO') {
        return {
          ...prev,
          code,
          name: buildCreditPaymentMethodName(prev.creditSchedule),
        };
      }

      return {
        ...prev,
        code,
        creditSchedule: [],
        name: prev.code === 'CREDITO' ? '' : prev.name,
      };
    });
    if (formErrors.length) {
      setFormErrors([]);
    }
  };

  const handleCreditScheduleChange = (schedule: CreditInstallmentDefinition[]) => {
    setFormData(prev => ({
      ...prev,
      creditSchedule: schedule,
      name: prev.code === 'CREDITO' ? buildCreditPaymentMethodName(schedule) : prev.name,
    }));
    if (formErrors.length) {
      setFormErrors([]);
    }
  };

  const handleNameInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextName = event.target.value;
    setFormData(prev => (prev.code === 'CREDITO' ? prev : { ...prev, name: nextName }));
  };

  const toggleVisibleMean = (code: string) => {
    setVisibleByCode(prev => ({
      ...prev,
      [code]: !(prev[code] ?? true),
    }));
  };

  const toggleFavoriteMean = (code: string) => {
    setFavoriteByCode(prev => ({
      ...prev,
      [code]: !(prev[code] ?? false),
    }));
  };

  const handleDefaultMean = (code: string) => {
    setDefaultCode(prev => (prev === code ? null : code));
  };

  const openMeanEditor = (code: string) => setEditingMeanCode(code);

  const closeMeanEditor = () => setEditingMeanCode(null);

  const handleMeanSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingMeanCode) return;
    const mean = PAYMENT_MEANS_CATALOG.find(item => item.code === editingMeanCode);
    if (!mean) return;

    const normalizedLabel = meanDraft.label.trim() || mean.defaultLabel;

    setLabelByCode(prev => ({
      ...prev,
      [mean.code]: normalizedLabel,
    }));

    setVisibleByCode(prev => ({
      ...prev,
      [mean.code]: meanDraft.visible,
    }));

    setFavoriteByCode(prev => ({
      ...prev,
      [mean.code]: meanDraft.favorite,
    }));

    if (meanDraft.isDefault) {
      setDefaultCode(mean.code);
    } else if (defaultCode === mean.code) {
      setDefaultCode(null);
    }

    closeMeanEditor();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedName =
      formData.code === 'CREDITO'
        ? buildCreditPaymentMethodName(formData.creditSchedule)
        : formData.name.trim();

    if (!formData.code.trim() || !normalizedName.trim()) return;

    if (!['CONTADO', 'CREDITO'].includes(formData.code)) {
      alert('El codigo debe ser CONTADO o CREDITO');
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

      if (editingId) {
        updatedMethods = paymentMethods.map(pm =>
          pm.id === editingId
            ? {
                ...pm,
                name: normalizedName,
                creditSchedule: pm.code === 'CREDITO' ? normalizedSchedule : undefined
              }
            : pm
        );
      } else {
        const newMethod: PaymentMethod = {
          id: Date.now().toString(),
          code: formData.code, // CONTADO o CREDITO
          name: normalizedName,
          type: formData.code === 'CONTADO' ? 'CASH' : 'CREDIT',
          sunatCode: formData.code === 'CONTADO' ? '001' : '002', // C�digo SUNAT
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
        updatedMethods = [...paymentMethods, newMethod];

        sessionStorage.setItem('lastCreatedPaymentMethod', newMethod.id);
      }

      await onUpdate(updatedMethods);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDefault = async (methodId: string) => {
    const updatedMethods = paymentMethods.map(pm => ({
      ...pm,
      isDefault: pm.id === methodId
    }));
    await onUpdate(updatedMethods);
  };

  const toggleFavorite = async (methodId: string) => {
    // Since isFavorite doesn't exist in the interface, we'll use displayOrder as a workaround
    // Methods with lower displayOrder (1-5) could be considered "favorites"
    const updatedMethods = paymentMethods.map(pm => {
      if (pm.id === methodId) {
        const currentOrder = pm.display.displayOrder;
        // Toggle between favorite (low number) and normal (high number)
        const newOrder = currentOrder <= 5 ? currentOrder + 100 : currentOrder - 100;
        return { 
          ...pm, 
          display: { ...pm.display, displayOrder: Math.max(1, newOrder) }
        };
      }
      return pm;
    });
    await onUpdate(updatedMethods);
  };

  const toggleVisibility = async (methodId: string) => {
    const method = paymentMethods.find(pm => pm.id === methodId);
    if (method?.isDefault) return; // Can't hide default method

    const updatedMethods = paymentMethods.map(pm =>
      pm.id === methodId ? { 
        ...pm, 
        display: { ...pm.display, isVisible: !pm.display.isVisible }
      } : pm
    );
    await onUpdate(updatedMethods);
  };

  const deleteMethod = async (methodId: string) => {
    const method = paymentMethods.find(pm => pm.id === methodId);
    if (method?.isDefault) {
      alert('No se puede eliminar el método de pago por defecto');
      return;
    }

    if (confirm('¿Estás seguro de que deseas eliminar este método de pago?')) {
      const updatedMethods = paymentMethods.filter(pm => pm.id !== methodId);
      await onUpdate(updatedMethods);
    }
  };

  const renderFormsTab = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          <div className="h-10 w-full animate-pulse rounded bg-gray-200"></div>
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-gray-200"></div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Form */}
        {showForm && (
          <ConfigurationCard
            title={editingId ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Informational help removed per request */}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Código Normativo *
                  </label>
                  <select
                    value={formData.code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={!!editingId}
                  >
                    <option value="">Selecciona un código</option>
                    <option value="CONTADO">CONTADO - Pago inmediato</option>
                    <option value="CREDITO">CREDITO - Pago diferido</option>
                  </select>
                  {/* helper text removed */}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Nombre Personalizado *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={handleNameInputChange}
                    readOnly={isCredit}
                    className={`w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 ${
                      isCredit ? 'cursor-not-allowed bg-gray-50 text-gray-600' : ''
                    }`}
                    placeholder={isCredit ? 'Crédito - define días de crédito' : 'Ej: Efectivo, Yape, Tarjeta Visa, Crédito 30 días...'}
                    required
                    maxLength={50}
                  />
                  {/* helper text removed */}
                </div>
              </div>

              {formData.code === 'CREDITO' && (
                <div className="space-y-2 rounded-lg border border-slate-200 bg-white/50 p-4">
                  <div>
                    <h5 className="text-sm font-semibold text-slate-700">Cronograma por defecto (opcional)</h5>
                    <p className="text-xs text-slate-500">Define cuotas sugeridas para este método de pago. Podrás ajustarlas durante la emisión.</p>
                  </div>
                  <CreditScheduleEditor value={formData.creditSchedule} onChange={handleCreditScheduleChange} />
                  {formErrors.length > 0 && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                      <ul className="list-disc pl-4">
                        {formErrors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSubmitting}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.code.trim() || !formData.name.trim()}
                  className="flex items-center space-x-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>}
                  <span>{editingId ? 'Actualizar' : 'Crear'}</span>
                </button>
              </div>
            </form>
          </ConfigurationCard>
        )}

        {/* Métodos de CONTADO */}
        {contadoMethods.length > 0 && (
          <div>
            {/* Header removed to reduce visual clutter (icon and count badge) */}
            <div className="space-y-2">
              {contadoMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-green-300">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                      <CreditCard className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{method.name}</span>
                        <span className="rounded bg-green-50 px-2 py-1 font-mono text-xs text-gray-500">
                          {method.code}
                        </span>
                        {method.display.displayOrder <= 5 && <Star className="h-4 w-4 fill-current text-yellow-500" />}
                        {!method.display.isVisible && <EyeOff className="h-4 w-4 text-gray-400" />}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <DefaultSelector
                      isDefault={method.isDefault}
                      onSetDefault={() => toggleDefault(method.id)}
                      size="sm"
                    />

                    <button
                      onClick={() => toggleFavorite(method.id)}
                      className={`rounded-lg p-2 transition-colors ${
                        method.display.displayOrder <= 5
                          ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                          : 'text-gray-400 hover:bg-gray-100 hover:text-yellow-500'
                      }`}
                      title={method.display.displayOrder <= 5 ? 'Quitar de favoritos' : 'Marcar como favorito'}
                    >
                      <Star className={`h-4 w-4 ${method.display.displayOrder <= 5 ? 'fill-current' : ''}`} />
                    </button>

                    <button
                      onClick={() => toggleVisibility(method.id)}
                      disabled={method.isDefault}
                      className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                      title={method.display.isVisible ? 'Ocultar' : 'Mostrar'}
                    >
                      {method.display.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>

                    <button
                      onClick={() => handleEdit(method)}
                      className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
                      title={method.id === 'pm-efectivo' ? 'No editable' : 'Editar'}
                      disabled={method.id === 'pm-efectivo'}
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => deleteMethod(method.id)}
                      disabled={method.isDefault}
                      className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Métodos de CREDITO */}
        {creditoMethods.length > 0 && (
          <div>
            <h4 className="mb-3 flex items-center space-x-2 text-md font-medium text-gray-700">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <span>Métodos de Pago a CRÉDITO</span>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                {creditoMethods.length} método{creditoMethods.length !== 1 ? 's' : ''}
              </span>
            </h4>
            <div className="space-y-2">
              {creditoMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-blue-300">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{method.name}</span>
                        <span className="rounded bg-blue-50 px-2 py-1 font-mono text-xs text-gray-500">
                          {method.code}
                        </span>
                        {method.display.displayOrder <= 5 && <Star className="h-4 w-4 fill-current text-yellow-500" />}
                        {!method.display.isVisible && <EyeOff className="h-4 w-4 text-gray-400" />}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <DefaultSelector
                      isDefault={method.isDefault}
                      onSetDefault={() => toggleDefault(method.id)}
                      size="sm"
                    />

                    <button
                      onClick={() => toggleFavorite(method.id)}
                      className={`rounded-lg p-2 transition-colors ${
                        method.display.displayOrder <= 5
                          ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                          : 'text-gray-400 hover:bg-gray-100 hover:text-yellow-500'
                      }`}
                      title={method.display.displayOrder <= 5 ? 'Quitar de favoritos' : 'Marcar como favorito'}
                    >
                      <Star className={`h-4 w-4 ${method.display.displayOrder <= 5 ? 'fill-current' : ''}`} />
                    </button>

                    <button
                      onClick={() => toggleVisibility(method.id)}
                      disabled={method.isDefault}
                      className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                      title={method.display.isVisible ? 'Ocultar' : 'Mostrar'}
                    >
                      {method.display.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>

                    <button
                      onClick={() => handleEdit(method)}
                      className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
                      title="Editar"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => deleteMethod(method.id)}
                      disabled={method.isDefault}
                      className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {paymentMethods.length === 0 && (
          <div className="py-12 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No hay métodos de pago</h3>
            <p className="mt-2 text-gray-500">Agrega tu primer método de pago personalizado</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Agregar Método de Pago
            </button>
          </div>
        )}
      </>
    );
  };

  const renderPaymentMeansTab = () => (
    <div className="space-y-4">
      <div className="max-h-[520px] overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">Código</th>
              <th className="px-3 py-2 text-left">Nombre SUNAT</th>
              <th className="px-3 py-2 text-left">Descripción</th>
              <th className="px-3 py-2 text-center">Visible</th>
              <th className="px-3 py-2 text-center">Favorito</th>
              <th className="px-3 py-2 text-center">Por defecto</th>
              <th className="px-3 py-2 text-center">Editar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {PAYMENT_MEANS_CATALOG.map((mean) => {
              const label = labelByCode[mean.code] ?? mean.defaultLabel;
              const isVisible = visibleByCode[mean.code] ?? true;
              const isFavorite = favoriteByCode[mean.code] ?? false;
              const isDefault = defaultCode === mean.code;

              return (
                <tr key={mean.code} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-700">{mean.code}</td>
                  <td className="px-3 py-2 text-xs text-slate-700">{mean.sunatName}</td>
                  <td className="px-3 py-2">
                    <span className="text-sm font-semibold text-slate-900 leading-tight">{label}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => toggleVisibleMean(mean.code)}
                      className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs transition-colors ${
                        isVisible
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                      title={isVisible ? 'Ocultar de la vista' : 'Mostrar en la vista'}
                    >
                      {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => toggleFavoriteMean(mean.code)}
                      className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs transition-colors ${
                        isFavorite
                          ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                      title={isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
                    >
                      <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                    </button>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <DefaultSelector isDefault={isDefault} onSetDefault={() => handleDefaultMean(mean.code)} size="sm" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => openMeanEditor(mean.code)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>Editar</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm font-medium text-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('forms')}
            className={`rounded-md px-3 py-2 transition-colors ${
              activeTab === 'forms' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Formas de pago
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('means')}
            className={`rounded-md px-3 py-2 transition-colors ${
              activeTab === 'means' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Medios de pago
          </button>
        </div>

        {activeTab === 'forms' && (
          <button
            onClick={() => setShowForm(true)}
            disabled={isSubmitting}
            className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar Método</span>
          </button>
        )}
      </div>

      {activeTab === 'forms' ? (
        <div className="space-y-6">{renderFormsTab()}</div>
      ) : (
        <div className="space-y-4">{renderPaymentMeansTab()}</div>
      )}

      {editingMean && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Editar medio de pago</h3>
              <button
                type="button"
                onClick={closeMeanEditor}
                className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleMeanSubmit} className="space-y-4 px-4 py-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Código</label>
                  <input
                    value={editingMean.code}
                    readOnly
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Nombre SUNAT</label>
                  <input
                    value={editingMean.sunatName}
                    readOnly
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Descripción (visible para usuario)</label>
                <input
                  value={meanDraft.label}
                  onChange={(e) => setMeanDraft(prev => ({ ...prev, label: e.target.value }))}
                  placeholder={editingMean.defaultLabel}
                  maxLength={40}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500">Usa 1–2 palabras. Catálogo fijo SUNAT.</p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs font-medium text-slate-700">
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={meanDraft.visible}
                    onChange={(e) => setMeanDraft(prev => ({ ...prev, visible: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Visible</span>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={meanDraft.favorite}
                    onChange={(e) => setMeanDraft(prev => ({ ...prev, favorite: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Favorito</span>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={meanDraft.isDefault}
                    onChange={(e) => setMeanDraft(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Por defecto</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeMeanEditor}
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}







