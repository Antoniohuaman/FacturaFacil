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
import { PageHeader, Button } from '@/contasis';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import { UnitsSection } from '../components/negocio/SeccionUnidades';
import { TaxesSection } from '../components/negocio/SeccionImpuestos';
import { PaymentMethodsSection } from '../components/negocio/SeccionMediosPago';
import { SalesPreferencesSection } from '../components/negocio/SeccionPreferenciasVenta';
import { CategoriesSection } from '../components/negocio/SeccionCategorias';
import { BankAccountsSection } from '../components/negocio/SeccionCuentasBancarias';
import { AccountingDashboard } from '../components/negocio/TableroContable';
import { AccountingAccountsSection } from '../components/negocio/SeccionCuentasContables';

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
    <div className="flex flex-col h-full">
      {/* Header */}
      <PageHeader
        title="Configuración de Negocio"
        actions={
          <Button
            variant="secondary"
            icon={<ArrowLeft />}
            onClick={() => navigate('/configuracion')}
          >
            Volver
          </Button>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-8">
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
      </div>
    </div>
  );
}