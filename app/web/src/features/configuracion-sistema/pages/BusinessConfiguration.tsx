// src/features/configuration/pages/BusinessConfiguration.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  CreditCard,
  DollarSign,
  Scale,
  Receipt,
  Settings,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Check,
  Calculator
} from 'lucide-react';
import { useConfigurationContext } from '../context/ConfigurationContext';
import { SettingsToggle } from '../components/common/SettingsToggle';
import { DefaultSelector } from '../components/common/DefaultSelector';
import { UnitsSection } from '../components/business/UnitsSection';
import { TaxesSection } from '../components/business/TaxesSection';
import type { PaymentMethod, Currency } from '../models/index';

type BusinessSection = 'payments' | 'currencies' | 'units' | 'taxes' | 'preferences';

export function BusinessConfiguration() {
  const navigate = useNavigate();
  const { state, dispatch } = useConfigurationContext();
  const { paymentMethods, currencies, units, taxes, taxAffectations } = state;
  
  const [activeSection, setActiveSection] = useState<BusinessSection>('payments');

  const sections = [
    { id: 'payments' as BusinessSection, label: 'Formas de Pago', icon: CreditCard },
    { id: 'currencies' as BusinessSection, label: 'Monedas', icon: DollarSign },
    { id: 'units' as BusinessSection, label: 'Unidades', icon: Scale },
    { id: 'taxes' as BusinessSection, label: 'Impuestos', icon: Receipt },
    { id: 'preferences' as BusinessSection, label: 'Preferencias', icon: Settings }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/configuracion')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Configuración de Negocio
          </h1>
          <p className="text-gray-600">
            Configura formas de pago, monedas, unidades, impuestos y preferencias
          </p>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 py-0 overflow-x-auto">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`
                    flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                    transition-colors duration-200
                    ${isActive
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Payment Methods Section */}
          {activeSection === 'payments' && (
            <PaymentMethodsSection 
              paymentMethods={paymentMethods}
              onUpdate={async (methods) => {
                dispatch({ type: 'SET_PAYMENT_METHODS', payload: methods });
              }}
            />
          )}

          {/* Currencies Section */}
          {activeSection === 'currencies' && (
            <CurrenciesSection 
              currencies={currencies}
              onUpdate={async (currencies) => {
                dispatch({ type: 'SET_CURRENCIES', payload: currencies });
              }}
            />
          )}

          {/* Units Section */}
          {activeSection === 'units' && (
            <UnitsSection 
              units={units}
              onUpdate={async (units) => {
                dispatch({ type: 'SET_UNITS', payload: units });
              }}
            />
          )}

          {/* Taxes Section */}
          {activeSection === 'taxes' && (
            <TaxesSection
              taxConfiguration={{
                pricesIncludeTax: taxes[0]?.includeInPrice || false,
                affectations: taxAffectations
              }}
              onUpdate={async (config) => {
                // Update the main tax configuration
                if (taxes[0]) {
                  const updatedTax = {
                    ...taxes[0],
                    includeInPrice: config.pricesIncludeTax
                  };
                  dispatch({ type: 'SET_TAXES', payload: [updatedTax] });
                }
                // Update tax affectations
                dispatch({ type: 'SET_TAX_AFFECTATIONS', payload: config.affectations });
              }}
            />
          )}

          {/* Preferences Section */}
          {activeSection === 'preferences' && (
            <PreferencesSection 
              preferences={{ strictStock: false, defaultClientId: null }}
              onUpdate={async (preferences) => {
                // For now, just console log - would need to add preferences to state
                console.log('Update preferences:', preferences);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Payment Methods Section Component
interface PaymentMethodsSectionProps {
  paymentMethods: PaymentMethod[];
  onUpdate: (methods: PaymentMethod[]) => Promise<void>;
}

function PaymentMethodsSection({ paymentMethods, onUpdate }: PaymentMethodsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '' });

  // For now, treat all as custom methods since we don't have isSystem property
  const systemMethods: PaymentMethod[] = [];
  const customMethods = paymentMethods;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let updatedMethods: PaymentMethod[];
    
    if (editingId) {
      updatedMethods = paymentMethods.map(pm =>
        pm.id === editingId ? { ...pm, name: formData.name, code: formData.code } : pm
      );
    } else {
      // Create a basic payment method structure
      const newMethod: PaymentMethod = {
        id: Date.now().toString(),
        code: formData.code,
        name: formData.name,
        type: 'OTHER',
        sunatCode: '999',
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
          icon: 'CreditCard',
          color: '#3B82F6',
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
    setShowForm(false);
    setEditingId(null);
    setFormData({ code: '', name: '' });
  };

  const toggleDefault = async (methodId: string) => {
    const updatedMethods = paymentMethods.map(pm => ({
      ...pm,
      isDefault: pm.id === methodId
    }));
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
    if (method?.isDefault) return; // Can't delete default method

    const updatedMethods = paymentMethods.filter(pm => pm.id !== methodId);
    await onUpdate(updatedMethods);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Formas de Pago</h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Forma de Pago</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">
            {editingId ? 'Editar Forma de Pago' : 'Nueva Forma de Pago'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="TRANSFER"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre
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
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ code: '', name: '' });
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingId ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* System Methods - Currently empty as we don't have isSystem property */}
      {systemMethods.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-700 mb-3">Métodos del Sistema</h4>
          <div className="space-y-2">
            {systemMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                  <div>
                    <span className="font-medium text-gray-900">{method.name}</span>
                    <span className="ml-2 text-sm text-gray-500">({method.code})</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <DefaultSelector
                    isDefault={method.isDefault}
                    onSetDefault={() => toggleDefault(method.id)}
                  />
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
      )}

      {/* Payment Methods */}
      {customMethods.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-700 mb-3">Formas de Pago Configuradas</h4>
          <div className="space-y-2">
            {customMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="font-medium text-gray-900">{method.name}</span>
                    <span className="ml-2 text-sm text-gray-500">({method.code})</span>
                    <span className="ml-2 text-xs px-2 py-1 bg-gray-100 rounded-full">{method.type}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <DefaultSelector
                    isDefault={method.isDefault}
                    onSetDefault={() => toggleDefault(method.id)}
                  />
                  <button
                    onClick={() => toggleVisibility(method.id)}
                    disabled={method.isDefault}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={method.display.isVisible ? 'Ocultar' : 'Mostrar'}
                  >
                    {method.display.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setFormData({ code: method.code, name: method.name });
                      setEditingId(method.id);
                      setShowForm(true);
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMethod(method.id)}
                    disabled={method.isDefault}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Currencies Section Component
interface CurrenciesSectionProps {
  currencies: Currency[];
  onUpdate: (currencies: Currency[]) => Promise<void>;
}

function CurrenciesSection({ currencies, onUpdate }: CurrenciesSectionProps) {
  const [showExchangeRateModal, setShowExchangeRateModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [exchangeRate, setExchangeRate] = useState('');

  const setDefaultCurrency = async (currencyId: string) => {
    const updatedCurrencies = currencies.map(c => ({
      ...c,
      isBaseCurrency: c.id === currencyId
    }));
    await onUpdate(updatedCurrencies);
  };

  const handleAddExchangeRate = async () => {
    // This would typically save to exchange rates array
    // For now, just close the modal
    setShowExchangeRateModal(false);
    setSelectedCurrency(null);
    setExchangeRate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Monedas</h3>
      </div>

      <div className="space-y-4">
        {currencies.map((currency) => (
          <div key={currency.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{currency.name}</span>
                  <span className="text-sm text-gray-500">({currency.code})</span>
                  <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    {currency.symbol}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <DefaultSelector
                isDefault={currency.isBaseCurrency}
                onSetDefault={() => setDefaultCurrency(currency.id)}
              />
              {!currency.isBaseCurrency && (
                <button
                  onClick={() => {
                    setSelectedCurrency(currency);
                    setShowExchangeRateModal(true);
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <Calculator className="w-4 h-4" />
                  <span>Tipo de Cambio</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Exchange Rate Modal */}
      {showExchangeRateModal && selectedCurrency && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Nuevo Tipo de Cambio - {selectedCurrency.name}
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Cambio
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="3.7500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  1 {selectedCurrency.code} = ? PEN
                </p>
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowExchangeRateModal(false);
                    setSelectedCurrency(null);
                    setExchangeRate('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddExchangeRate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// Preferences Section Component
interface PreferencesSectionProps {
  preferences: any;
  onUpdate: (preferences: any) => Promise<void>;
}

function PreferencesSection({ preferences, onUpdate }: PreferencesSectionProps) {

  const handleStrictStockToggle = async (enabled: boolean) => {
    const updatedPreferences = {
      ...preferences,
      strictStock: enabled
    };
    await onUpdate(updatedPreferences);
  };

  const handleDefaultClientChange = async (clientId: string | null) => {
    const updatedPreferences = {
      ...preferences,
      defaultClientId: clientId
    };
    await onUpdate(updatedPreferences);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Preferencias de Ventas e Inventario</h3>

      <div className="space-y-6">
        {/* Stock Control */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <SettingsToggle
            enabled={preferences.strictStock}
            onToggle={handleStrictStockToggle}
            label="Control de Stock Estricto"
            description="Bloquea las ventas cuando un producto no tiene stock suficiente"
          />
          {preferences.strictStock && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <Receipt className="w-4 h-4 inline mr-1" />
                Con esta opción activada, no podrás vender productos sin stock disponible
              </p>
            </div>
          )}
        </div>

        {/* Default Client */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">
                Cliente por Defecto en Ventas
              </label>
              <p className="text-sm text-gray-500">
                Cliente que se selecciona automáticamente al crear una venta
              </p>
            </div>
          </div>
          
          <div className="mt-4 space-y-3">
            <select
              value={preferences.defaultClientId || ''}
              onChange={(e) => handleDefaultClientChange(e.target.value || null)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sin cliente por defecto</option>
              <option value="1">Cliente Genérico</option>
              <option value="2">Consumidor Final</option>
              {/* These would be loaded from clients API */}
            </select>
            
            {preferences.defaultClientId && (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    Cliente por defecto configurado
                  </span>
                </div>
                <button
                  onClick={() => handleDefaultClientChange(null)}
                  className="text-sm text-green-700 hover:text-green-800 font-medium"
                >
                  Limpiar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Additional Settings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Configuraciones Adicionales</h4>
          <div className="space-y-4">
            <SettingsToggle
              enabled={true}
              onToggle={() => {}}
              label="Mostrar alertas de stock bajo"
              description="Notifica cuando el stock de un producto esté por debajo del mínimo"
              disabled
            />
            
            <SettingsToggle
              enabled={false}
              onToggle={() => {}}
              label="Permitir precios negativos"
              description="Permite ingresar precios con descuentos que resulten negativos"
              disabled
            />
            
            <SettingsToggle
              enabled={true}
              onToggle={() => {}}
              label="Validar datos de cliente"
              description="Valida RUC/DNI al crear o editar clientes"
              disabled
            />
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600">
              💡 Las configuraciones marcadas como deshabilitadas estarán disponibles en futuras versiones
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}