// src/features/configuration/components/business/PaymentMethodsSection.tsx
import { useState } from 'react';
import { CreditCard, Plus, Edit3, Trash2, Star, Eye, EyeOff } from 'lucide-react';
import type { PaymentMethod } from '../../models/PaymentMethod';
import { DefaultSelector } from '../common/DefaultSelector';
import { ConfigurationCard } from '../common/ConfigurationCard';
import CreditScheduleEditor from './CreditScheduleEditor';
import type { CreditInstallmentDefinition } from '../../../../shared/payments/paymentTerms';
import { buildCreditPaymentMethodName, validateCreditScheduleTemplate } from '../../../../shared/payments/paymentTerms';

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
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ code: string; name: string; creditSchedule: CreditInstallmentDefinition[] }>({ code: '', name: '', creditSchedule: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const isCredit = formData.code === 'CREDITO';

  // Agrupar métodos por código normativo (CONTADO vs CREDITO)
  const contadoMethods = paymentMethods.filter(pm => pm.code === 'CONTADO');
  const creditoMethods = paymentMethods.filter(pm => pm.code === 'CREDITO');

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-40 animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <button
          onClick={() => setShowForm(true)}
          disabled={isSubmitting}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Método</span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <ConfigurationCard
          title={editingId ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Informational help removed per request */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código Normativo *
                </label>
                <select
                  value={formData.code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Personalizado *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={handleNameInputChange}
                  readOnly={isCredit}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isCredit ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''
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

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.code.trim() || !formData.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
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
              <div key={method.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-green-300 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{method.name}</span>
                      <span className="text-xs text-gray-500 font-mono bg-green-50 px-2 py-1 rounded">
                        {method.code}
                      </span>
                      {method.display.displayOrder <= 5 && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                      {!method.display.isVisible && <EyeOff className="w-4 h-4 text-gray-400" />}
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
                    className={`p-2 rounded-lg transition-colors ${
                      method.display.displayOrder <= 5
                        ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                        : 'text-gray-400 hover:bg-gray-100 hover:text-yellow-500'
                    }`}
                    title={method.display.displayOrder <= 5 ? 'Quitar de favoritos' : 'Marcar como favorito'}
                  >
                    <Star className={`w-4 h-4 ${method.display.displayOrder <= 5 ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={() => toggleVisibility(method.id)}
                    disabled={method.isDefault}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={method.display.isVisible ? 'Ocultar' : 'Mostrar'}
                  >
                    {method.display.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => handleEdit(method)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title={method.id === 'pm-efectivo' ? 'No editable' : 'Editar'}
                    disabled={method.id === 'pm-efectivo'}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => deleteMethod(method.id)}
                    disabled={method.isDefault}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
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
          <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span>Métodos de Pago a CRÉDITO</span>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {creditoMethods.length} método{creditoMethods.length !== 1 ? 's' : ''}
            </span>
          </h4>
          <div className="space-y-2">
            {creditoMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{method.name}</span>
                      <span className="text-xs text-gray-500 font-mono bg-blue-50 px-2 py-1 rounded">
                        {method.code}
                      </span>
                      {method.display.displayOrder <= 5 && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                      {!method.display.isVisible && <EyeOff className="w-4 h-4 text-gray-400" />}
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
                    className={`p-2 rounded-lg transition-colors ${
                      method.display.displayOrder <= 5
                        ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                        : 'text-gray-400 hover:bg-gray-100 hover:text-yellow-500'
                    }`}
                    title={method.display.displayOrder <= 5 ? 'Quitar de favoritos' : 'Marcar como favorito'}
                  >
                    <Star className={`w-4 h-4 ${method.display.displayOrder <= 5 ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={() => toggleVisibility(method.id)}
                    disabled={method.isDefault}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={method.display.isVisible ? 'Ocultar' : 'Mostrar'}
                  >
                    {method.display.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => handleEdit(method)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => deleteMethod(method.id)}
                    disabled={method.isDefault}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {paymentMethods.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="mx-auto w-12 h-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No hay métodos de pago</h3>
          <p className="mt-2 text-gray-500">Agrega tu primer método de pago personalizado</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Agregar Método de Pago
          </button>
        </div>
      )}

      {/* Help text removed per requirements */}
    </div>
  );
}







