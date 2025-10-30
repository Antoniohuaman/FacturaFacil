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
  Tag
} from 'lucide-react';
import { useConfigurationContext } from '../context/ConfigurationContext';
import { UnitsSection } from '../components/business/UnitsSection';
import { TaxesSection } from '../components/business/TaxesSection';
import { PaymentMethodsSection } from '../components/business/PaymentMethodsSection';
import { CurrenciesSection } from '../components/business/CurrenciesSection';
import { SalesPreferencesSection } from '../components/business/SalesPreferencesSection';
import { CategoriesSection } from '../components/business/CategoriesSection';

type BusinessSection = 'payments' | 'currencies' | 'units' | 'taxes' | 'categories' | 'preferences';

export function BusinessConfiguration() {
  const navigate = useNavigate();
  const { state, dispatch } = useConfigurationContext();
  const { paymentMethods, currencies, units, taxes, taxAffectations, categories } = state;

  const [activeSection, setActiveSection] = useState<BusinessSection>('payments');

  const sections = [
    { id: 'payments' as BusinessSection, label: 'Formas de Pago', icon: CreditCard },
    { id: 'currencies' as BusinessSection, label: 'Monedas', icon: DollarSign },
    { id: 'units' as BusinessSection, label: 'Unidades', icon: Scale },
    { id: 'taxes' as BusinessSection, label: 'Impuestos', icon: Receipt },
    { id: 'categories' as BusinessSection, label: 'Categorías', icon: Tag },
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
            Configura formas de pago, monedas, unidades, impuestos, categorías y preferencias
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
              onUpdateCurrencies={async (currencies) => {
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

          {/* Categories Section */}
          {activeSection === 'categories' && (
            <CategoriesSection
              categories={categories}
              onUpdate={async (categories) => {
                dispatch({ type: 'SET_CATEGORIES', payload: categories });
              }}
            />
          )}

          {/* Preferences Section */}
          {activeSection === 'preferences' && (
            <SalesPreferencesSection
              preferences={{
                allowNegativeStock: false,
                autoCalculateTax: true,
                defaultTaxId: '1',
                requireCustomerSelection: true,
                allowPartialPayments: true,
                autoGenerateCorrelativeNumber: true,
                showProductImages: true,
                enableDiscounts: true,
                maxDiscountPercentage: 100,
                requireDiscountReason: false,
                enablePromotions: false,
                printReceiptAfterSale: true,
                openCashDrawerAfterPrint: false
              }}
              onUpdate={async (preferences) => {
                console.log('Update preferences:', preferences);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}