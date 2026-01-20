// src/features/configuration/components/negocio/PaymentMethodFormModal.tsx
import { useState } from 'react';
import { X } from 'lucide-react';
import { Button, Select, Input } from '@/contasis';
import type { PaymentMethod } from '../../modelos/PaymentMethod';

interface PaymentMethodFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethods: PaymentMethod[];
  onUpdate: (methods: PaymentMethod[]) => Promise<void>;
}

export function PaymentMethodFormModal({
  isOpen,
  onClose,
  paymentMethods,
  onUpdate
}: PaymentMethodFormModalProps) {
  const [formData, setFormData] = useState({ code: '', name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({ code: '', name: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim() || !formData.name.trim()) return;

    // Validar que el código sea CONTADO o CREDITO
    if (!['CONTADO', 'CREDITO'].includes(formData.code)) {
      alert('El código debe ser CONTADO o CREDITO');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create new
      const newMethod: PaymentMethod = {
        id: Date.now().toString(),
        code: formData.code, // CONTADO o CREDITO
        name: formData.name,
        type: formData.code === 'CONTADO' ? 'CASH' : 'CREDIT',
        sunatCode: formData.code === 'CONTADO' ? '001' : '002', // Código SUNAT
        sunatDescription: formData.name,
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
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedMethods = [...paymentMethods, newMethod];

      // Guardar el ID de la nueva forma de pago en sessionStorage
      // para que se autoseleccione al regresar al formulario de emisión
      sessionStorage.setItem('lastCreatedPaymentMethod', newMethod.id);

      await onUpdate(updatedMethods);

      // Cerrar modal y resetear form
      resetForm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Nueva Forma de Pago</h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Informational help removed per request */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Código Normativo"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  required
                  options={[
                    { value: '', label: 'Selecciona un código' },
                    { value: 'CONTADO', label: 'CONTADO - Pago inmediato' },
                    { value: 'CREDITO', label: 'CREDITO - Pago diferido' }
                  ]}
                />

                <Input
                  label="Nombre Personalizado"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Efectivo, Yape, Tarjeta Visa, Crédito 30 días..."
                  required
                  maxLength={50}
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isSubmitting || !formData.code.trim() || !formData.name.trim()}
                >
                  {isSubmitting ? 'Creando...' : 'Crear Forma de Pago'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
