// src/features/configuration/pages/BusinessConfiguration.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Scale,
  Receipt,
  Settings,
  Tag,
  NotebookPen
} from 'lucide-react';
import { useConfigurationContext } from '../context/ConfigurationContext';
import { UnitsSection } from '../components/business/UnitsSection';
import { TaxesSection } from '../components/business/TaxesSection';
import { PaymentMethodsSection } from '../components/business/PaymentMethodsSection';
import { SalesPreferencesSection } from '../components/business/SalesPreferencesSection';
import { CategoriesSection } from '../components/business/CategoriesSection';
import { BankAccountsSection } from '../components/business/BankAccountsSection';
import { AccountingDashboard } from '../components/business/AccountingDashboard';
import { AccountingAccountsSection } from '../components/business/AccountingAccountsSection';

type BusinessSection = 'payments' | 'bankAccounts' | 'units' | 'taxes' | 'categories' | 'accounting' | 'preferences';

export function BusinessConfiguration() {
  const navigate = useNavigate();
  const { state, dispatch } = useConfigurationContext();
  const { paymentMethods, units, taxes, categories, salesPreferences } = state;

  const [activeSection, setActiveSection] = useState<BusinessSection>('payments');
  const [accountingView, setAccountingView] = useState<'dashboard' | 'accounts'>('dashboard');

  const sections = [
    { id: 'payments' as BusinessSection, label: 'Pagos', icon: CreditCard },
    { id: 'bankAccounts' as BusinessSection, label: 'Información bancaria', icon: Banknote },
    { id: 'units' as BusinessSection, label: 'Unidades', icon: Scale },
    { id: 'taxes' as BusinessSection, label: 'Impuestos', icon: Receipt },
    { id: 'categories' as BusinessSection, label: 'Categorías', icon: Tag },
    { id: 'accounting' as BusinessSection, label: 'Datos contables', icon: NotebookPen },
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
            Configuración de Negocioss
          </h1>
          <p className="text-gray-600">
            Configura pagos, datos bancarios, unidades, impuestos, categorías, datos contables y preferencias. La moneda base se gestiona desde Datos de Empresa.
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
                  onClick={() => {
                    setActiveSection(section.id);
                    if (section.id !== 'accounting') {
                      setAccountingView('dashboard');
                    }
                  }}
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

          {activeSection === 'bankAccounts' && (
            <BankAccountsSection />
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
              taxes={taxes}
              pricesIncludeTax={salesPreferences.pricesIncludeTax}
              onUpdate={async ({ taxes: nextTaxes, pricesIncludeTax }) => {
                // Sincronizar includeInPrice en todos los impuestos con la preferencia global
                const syncedTaxes = nextTaxes.map((tax) => ({
                  ...tax,
                  includeInPrice: pricesIncludeTax,
                }));
                dispatch({ type: 'SET_TAXES', payload: syncedTaxes });

                if (pricesIncludeTax !== salesPreferences.pricesIncludeTax) {
                  dispatch({
                    type: 'SET_SALES_PREFERENCES',
                    payload: {
                      ...salesPreferences,
                      pricesIncludeTax,
                    },
                  });
                }
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

          {activeSection === 'accounting' && (
            accountingView === 'dashboard' ? (
              <AccountingDashboard onOpenAccounts={() => setAccountingView('accounts')} />
            ) : (
              <AccountingAccountsSection onBack={() => setAccountingView('dashboard')} />
            )
          )}

          {/* Preferences Section */}
          {activeSection === 'preferences' && (
            <SalesPreferencesSection
              preferences={salesPreferences}
              onUpdate={async (preferences) => {
                dispatch({
                  type: 'SET_SALES_PREFERENCES',
                  payload: {
                    ...salesPreferences,
                    ...preferences,
                  },
                });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}