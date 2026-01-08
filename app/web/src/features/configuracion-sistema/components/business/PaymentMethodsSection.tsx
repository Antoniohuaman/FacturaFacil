// src/features/configuration/components/business/PaymentMethodsSection.tsx
import { useEffect, useState } from 'react';
import { CreditCard, Plus, Edit3, Trash2, Star, Eye, EyeOff, X } from 'lucide-react';
import type { PaymentMethod } from '../../models/PaymentMethod';
import { DefaultSelector } from '../common/DefaultSelector';
import CreditScheduleEditor from './CreditScheduleEditor';
import type { CreditInstallmentDefinition } from '../../../../shared/payments/paymentTerms';
import { buildCreditPaymentMethodName, validateCreditScheduleTemplate } from '../../../../shared/payments/paymentTerms';
import {
  PAYMENT_MEANS_CATALOG,
  loadPaymentMeansPreferences,
  savePaymentMeansPreferences,
} from '../../../../shared/payments/paymentMeans';

const normalizeLabel = (text: string) => {
  const fallback = text
    .replace(/Cr�dito/g, 'Crédito')
    .replace(/d�as/g, 'días');
  try {
    // Attempt to recover UTF-8 strings that arrived mojibake-encoded
    return decodeURIComponent(escape(fallback));
  } catch {
    return fallback;
  }
};

// Catálogo SUNAT de medios de pago se mueve a shared/payments/paymentMeans

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
  const initialPrefs = loadPaymentMeansPreferences();

  const [activeTab, setActiveTab] = useState<'forms' | 'means'>('forms');
  const [labelByCode, setLabelByCode] = useState<Record<string, string>>(() =>
    ({ ...initialPrefs.labelByCode })
  );
  const [visibleByCode, setVisibleByCode] = useState<Record<string, boolean>>(() =>
    ({ ...initialPrefs.visibleByCode })
  );
  const [favoriteByCode, setFavoriteByCode] = useState<Record<string, boolean>>(() =>
    ({ ...initialPrefs.favoriteByCode })
  );
  const [defaultCode, setDefaultCode] = useState<string | null>(initialPrefs.defaultCode);
  const [editingMeanCode, setEditingMeanCode] = useState<string | null>(null);
  const [meanDraft, setMeanDraft] = useState<{ label: string; visible: boolean; favorite: boolean; isDefault: boolean }>({
    label: '',
    visible: true,
    favorite: false,
    isDefault: false,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ code: string; name: string; creditSchedule: CreditInstallmentDefinition[] }>({ code: 'CREDITO', name: '', creditSchedule: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    savePaymentMeansPreferences({
      labelByCode,
      visibleByCode,
      favoriteByCode,
      defaultCode,
    });
  }, [labelByCode, visibleByCode, favoriteByCode, defaultCode]);

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
    setFormData({ code: 'CREDITO', name: '', creditSchedule: [] });
    setEditingId(null);
    setShowForm(false);
    setFormErrors([]);
  };

  const openNewCreditForm = () => {
    setFormData({ code: 'CREDITO', name: '', creditSchedule: [] });
    setEditingId(null);
    setFormErrors([]);
    setShowForm(true);
  };

  const handleEdit = (method: PaymentMethod) => {
    const schedule = method.creditSchedule ? [...method.creditSchedule] : [];
    setFormData({ code: method.code, name: method.name, creditSchedule: schedule });
    setEditingId(method.id);
    setShowForm(true);
    setFormErrors([]);
  };

  const handleCreditScheduleChange = (schedule: CreditInstallmentDefinition[]) => {
    const hasMeaningfulInstallment = schedule.some((item) =>
      ((item.diasCredito ?? 0) !== 0) || ((item.porcentaje ?? 0) !== 0)
    );

    setFormData(prev => ({
      ...prev,
      creditSchedule: schedule,
      name: hasMeaningfulInstallment
        ? buildCreditPaymentMethodName(schedule)
        : (editingId ? prev.name : ''),
    }));
    if (formErrors.length) {
      setFormErrors([]);
    }
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
        ? formData.name.trim()
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
      alert('No se puede eliminar el pago por defecto');
      return;
    }

    if (confirm('¿Estás seguro de que deseas eliminar este pago?')) {
      const updatedMethods = paymentMethods.filter(pm => pm.id !== methodId);
      await onUpdate(updatedMethods);
    }
  };

  const renderFormsTab = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          <div className="h-8 w-full animate-pulse rounded bg-gray-200"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-gray-200"></div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Métodos de CONTADO */}
        {contadoMethods.length > 0 && (
          <div>
            <h4 className="mb-3 flex items-center space-x-2 text-sm font-semibold text-gray-700">
              <CreditCard className="h-4 w-4 text-green-600" />
              <span>Pagos al contado</span>
            </h4>
            <div className="space-y-2">
              {contadoMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-green-300">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                      <CreditCard className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{normalizeLabel(method.name)}</span>
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
              <span>Créditos</span>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                {creditoMethods.length} crédito{creditoMethods.length !== 1 ? 's' : ''}
              </span>
            </h4>
            <div className="space-y-2">
              {creditoMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-blue-300">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{normalizeLabel(method.name)}</span>
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">No hay créditos</h3>
            <p className="mt-2 text-gray-500">Agrega tu primer crédito</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Nuevo crédito
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
            onClick={openNewCreditForm}
            disabled={isSubmitting}
            className="flex items-center space-x-2 rounded-md bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo crédito</span>
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div
            className="w-full overflow-hidden rounded-2xl bg-white shadow-2xl"
            style={{ width: 'min(92vw, 520px)' }}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{editingId ? 'Editar crédito' : 'Nuevo crédito'}</h3>
                <p className="text-[11px] text-slate-500">Se genera automáticamente según tus cuotas.</p>
              </div>
              <button
                type="button"
                onClick={resetForm}
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
                  value={formData.name}
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
                  onClick={resetForm}
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
                  <span>{editingId ? 'Actualizar' : 'Crear'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}







