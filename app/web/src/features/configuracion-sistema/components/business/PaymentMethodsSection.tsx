// src/features/configuration/components/business/PaymentMethodsSection.tsx
import { useState } from 'react';
import { CreditCard, Plus, Edit3, Trash2, Star, Eye, EyeOff } from 'lucide-react';
import type { PaymentMethod } from '../../models/PaymentMethod';
import { DefaultSelector } from '../common/DefaultSelector';
import { ConfigurationCard } from '../common/ConfigurationCard';

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
  const [formData, setFormData] = useState({ code: '', name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // For now, we'll assume all methods are custom since isSystem is not in the interface
  // This should be determined by business logic or added to the interface if needed
  const systemMethods = paymentMethods.filter(pm => ['CASH', 'CARD'].includes(pm.type)); // Basic system methods
  const customMethods = paymentMethods.filter(pm => !['CASH', 'CARD'].includes(pm.type));

  const resetForm = () => {
    setFormData({ code: '', name: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (method: PaymentMethod) => {
    setFormData({ code: method.code, name: method.name });
    setEditingId(method.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim() || !formData.name.trim()) return;

    // Check for duplicate codes
    const isDuplicate = paymentMethods.some(pm => 
      pm.code === formData.code.toUpperCase() && pm.id !== editingId
    );
    
    if (isDuplicate) {
      alert('Ya existe un método de pago con este código');
      return;
    }

    setIsSubmitting(true);

    try {
      let updatedMethods: PaymentMethod[];
      
      if (editingId) {
        // Update existing
        updatedMethods = paymentMethods.map(pm =>
          pm.id === editingId 
            ? { ...pm, name: formData.name, code: formData.code.toUpperCase() }
            : pm
        );
      } else {
        // Create new
        const newMethod: PaymentMethod = {
          id: Date.now().toString(),
          code: formData.code.toUpperCase(),
          name: formData.name,
          type: 'OTHER',
          sunatCode: formData.code.toUpperCase(),
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
        updatedMethods = [...paymentMethods, newMethod];
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
        <h3 className="text-lg font-semibold text-gray-900">Formas de Pago</h3>
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
          description="Configura un método de pago personalizado"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 10)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="TRANSFER"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Máximo 10 caracteres, solo letras y números</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Transferencia Bancaria"
                  required
                />
              </div>
            </div>

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

      {/* System Methods */}
      <div>
        <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center space-x-2">
          <CreditCard className="w-4 h-4" />
          <span>Métodos del Sistema</span>
        </h4>
        <div className="space-y-2">
          {systemMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{method.name}</span>
                    <span className="text-sm text-gray-500 font-mono">({method.code})</span>
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
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Methods */}
      {customMethods.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Métodos Personalizados</span>
          </h4>
          <div className="space-y-2">
            {customMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{method.name}</span>
                      <span className="text-sm text-gray-500 font-mono">({method.code})</span>
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

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 Consejos</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Los métodos del sistema no se pueden eliminar, solo ocultar</li>
          <li>• Marca como favoritos los métodos más usados para acceso rápido</li>
          <li>• Solo puede haber un método por defecto a la vez</li>
          <li>• El método por defecto no se puede ocultar ni eliminar</li>
        </ul>
      </div>
    </div>
  );
}