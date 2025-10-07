// src/features/configuration/components/business/PaymentMethodFormModal.tsx
import { useState } from 'react';
import { X } from 'lucide-react';
import type { PaymentMethod } from '../../models/PaymentMethod';

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
              {/* Información importante */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h5 className="font-medium text-amber-900 mb-2">📋 Forma de Pago Normativa</h5>
                <p className="text-sm text-amber-800">
                  A nivel normativo (SUNAT) solo existen 2 códigos: <strong>CONTADO</strong> y <strong>CRÉDITO</strong>.
                  El nombre es libre y puedes crear múltiples métodos con el mismo código pero diferentes nombres.
                </p>
                <div className="mt-2 text-xs text-amber-700">
                  <strong>Ejemplos:</strong> CONTADO - Efectivo | CONTADO - Yape | CONTADO - Tarjeta | CREDITO - 30 días
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código Normativo *
                  </label>
                  <select
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    required
                  >
                    <option value="">Selecciona un código</option>
                    <option value="CONTADO">CONTADO - Pago inmediato</option>
                    <option value="CREDITO">CREDITO - Pago diferido</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Elige CONTADO o CREDITO según el tipo de pago
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Personalizado *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Efectivo, Yape, Tarjeta Visa, Crédito 30 días..."
                    required
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-500 mt-1">Escribe el nombre que desees (máx. 50 caracteres)</p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleClose}
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
                  {isSubmitting && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>Crear Forma de Pago</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
