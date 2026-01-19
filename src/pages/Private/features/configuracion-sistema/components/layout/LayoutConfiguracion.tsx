// src/features/configuration/components/layout/ConfigurationLayout.tsx
import { Outlet } from 'react-router-dom';
import { Shield, AlertTriangle } from 'lucide-react';
import { TabNavigation } from './NavegacionPestanias';
import { ConfigurationProvider, useConfigurationContext } from '../../contexto/ContextoConfiguracion';

function ConfigurationLayoutContent() {
  const { state } = useConfigurationContext();
  const { company, isLoading } = state;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Configuración
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Gestiona la configuración de tu empresa y sistema de facturación
              </p>
            </div>
            
            {/* Status indicator */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  company?.sunatConfiguration.environment === 'PRODUCTION' ? 'bg-green-400' : 'bg-yellow-400'
                }`}></div>
                <span className="text-gray-600">
                  {company?.sunatConfiguration.environment === 'PRODUCTION' ? 'Producción' : 'Ambiente de prueba'}
                </span>
              </div>

              {company?.sunatConfiguration.environment === 'TESTING' && (
                <div className="flex items-center space-x-1 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-full text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="hidden sm:inline">Modo de prueba</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <TabNavigation />
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>

      {/* Environment Banner (if test mode) */}
      {company?.sunatConfiguration.environment === 'TESTING' && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 p-1">
          <div className="bg-yellow-50 mx-1 rounded-lg">
            <div className="max-w-7xl mx-auto px-4 py-2">
              <div className="flex items-center justify-center space-x-2 text-sm">
                <Shield className="w-4 h-4 text-yellow-600" />
                <span className="font-medium text-yellow-800">
                  Ambiente de Prueba - Los documentos emitidos no tienen validez legal
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ConfigurationLayout() {
  return (
    <ConfigurationProvider>
      <ConfigurationLayoutContent />
    </ConfigurationProvider>
  );
}