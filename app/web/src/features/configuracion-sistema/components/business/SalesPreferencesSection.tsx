// src/features/configuration/components/business/SalesPreferencesSection.tsx
import { useState } from 'react';
import { ShoppingCart, Package, User, AlertTriangle, CheckCircle, Settings, Search, X } from 'lucide-react';
import type { Configuration } from '../../models/Configuration';
import { SettingsToggle } from '../common/SettingsToggle';
import { ConfigurationCard } from '../common/ConfigurationCard';

interface Client {
  id: string;
  name: string;
  documentNumber: string;
  documentType: 'DNI' | 'RUC' | 'CE' | 'PASSPORT';
  email?: string;
  isActive: boolean;
}

interface SalesPreferencesSectionProps {
  preferences: Configuration['sales'];
  onUpdate: (preferences: Configuration['sales']) => Promise<void>;
  clients?: Client[]; // In real implementation, this would come from clients API
  isLoading?: boolean;
}

// Mock clients data - in real implementation this would come from API
const mockClients: Client[] = [
  {
    id: '1',
    name: 'Cliente Genérico',
    documentNumber: '00000000',
    documentType: 'DNI',
    isActive: true
  },
  {
    id: '2',
    name: 'Consumidor Final',
    documentNumber: '11111111',
    documentType: 'DNI',
    isActive: true
  },
  {
    id: '3',
    name: 'Empresa ABC S.A.C.',
    documentNumber: '20123456789',
    documentType: 'RUC',
    email: 'ventas@empresaabc.com',
    isActive: true
  },
  {
    id: '4',
    name: 'Distribuidora XYZ E.I.R.L.',
    documentNumber: '20987654321',
    documentType: 'RUC',
    email: 'compras@distribuidoraxyz.com',
    isActive: true
  }
];

export function SalesPreferencesSection({ 
  preferences, 
  onUpdate, 
  clients = mockClients,
  isLoading = false 
}: SalesPreferencesSectionProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  const handleStrictStockToggle = async (enabled: boolean) => {
    setIsUpdating(true);
    try {
      const updatedPreferences = {
        ...preferences,
        allowNegativeStock: !enabled // strictStock es lo contrario de allowNegativeStock
      };
      await onUpdate(updatedPreferences);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDefaultClientChange = async (clientId: string | null) => {
    setIsUpdating(true);
    try {
      // Actualiza el estado temporal para mantener la UX
      setTempDefaultClientId(clientId);
      
      // Nota: defaultClientId no existe en la interface actual de Configuration['sales']
      // Esta funcionalidad se mantiene para la UX pero se implementará en el futuro
      // Por ahora solo actualizamos requireCustomerSelection basado en si hay cliente por defecto
      const updatedPreferences = {
        ...preferences,
        requireCustomerSelection: clientId === null
      };
      await onUpdate(updatedPreferences);
      setShowClientModal(false);
      setClientSearchTerm('');
    } finally {
      setIsUpdating(false);
    }
  };

  // Simulación temporal de defaultClientId hasta que se agregue a la interface
  const [tempDefaultClientId, setTempDefaultClientId] = useState<string | null>(null);
  
  const getDefaultClient = () => {
    return tempDefaultClientId ? clients.find(client => client.id === tempDefaultClientId) : null;
  };

  const filteredClients = clients.filter(client =>
    client.isActive && (
      client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
      client.documentNumber.includes(clientSearchTerm)
    )
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <ShoppingCart className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Preferencias de Ventas e Inventario</h3>
      </div>

      {/* Stock Control */}
      <ConfigurationCard
        title="Control de Inventario"
        description="Configuración del comportamiento del stock en las ventas"
        icon={Package}
      >
        <div className="space-y-6">
          <SettingsToggle
            enabled={!preferences.allowNegativeStock}
            onToggle={handleStrictStockToggle}
            label="Control de Stock Estricto"
            description="Bloquea las ventas cuando un producto no tiene stock suficiente"
            disabled={isUpdating}
          />
          
          {/* Stock Control Details */}
          <div className={`p-4 border rounded-lg transition-all ${
            !preferences.allowNegativeStock 
              ? 'border-blue-200 bg-blue-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-start space-x-3">
              {!preferences.allowNegativeStock ? (
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className={`font-medium ${
                  !preferences.allowNegativeStock ? 'text-blue-900' : 'text-gray-700'
                }`}>
                  {!preferences.allowNegativeStock ? 'Stock Estricto Activado' : 'Stock Flexible'}
                </h4>
                <p className={`text-sm mt-1 ${
                  !preferences.allowNegativeStock ? 'text-blue-800' : 'text-gray-600'
                }`}>
                  {!preferences.allowNegativeStock 
                    ? 'No se podrá vender productos sin stock disponible. Aparecerá un mensaje de error al intentar vender productos agotados.'
                    : 'Se permite vender productos sin stock. El inventario puede mostrar valores negativos.'
                  }
                </p>
                
                <div className="mt-3 p-3 bg-white rounded border text-sm">
                  <p className="font-medium text-gray-900 mb-1">Ejemplo:</p>
                  <p className="text-gray-600">
                    Producto: "Camisa Azul" - Stock actual: 2 unidades
                  </p>
                  <p className="text-gray-600">
                    Cliente quiere comprar: 5 unidades
                  </p>
                  <p className={`mt-2 font-medium ${
                    !preferences.allowNegativeStock ? 'text-red-600' : 'text-green-600'
                  }`}>
                    Resultado: {!preferences.allowNegativeStock 
                      ? '❌ Venta bloqueada - Stock insuficiente'
                      : '✅ Venta permitida - Stock resultante: -3 unidades'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ConfigurationCard>

      {/* Default Client */}
      <ConfigurationCard
        title="Cliente por Defecto"
        description="Cliente que se selecciona automáticamente en nuevas ventas"
        icon={User}
      >
        <div className="space-y-6">
          {/* Current Default Client */}
          {tempDefaultClientId ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-green-900">
                      {getDefaultClient()?.name || 'Cliente no encontrado'}
                    </h4>
                    <p className="text-sm text-green-700">
                      {getDefaultClient()?.documentType}: {getDefaultClient()?.documentNumber}
                      {getDefaultClient()?.email && (
                        <span className="ml-2">• {getDefaultClient()?.email}</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDefaultClientChange(null)}
                  disabled={isUpdating}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  <span>Quitar</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">Sin cliente por defecto</h4>
                  <p className="text-sm text-gray-600">
                    Se deberá seleccionar un cliente en cada venta
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Select Client Button */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowClientModal(true)}
              disabled={isUpdating}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>
                {tempDefaultClientId ? 'Cambiar Cliente' : 'Seleccionar Cliente'}
              </span>
            </button>
          </div>

          {/* Benefits */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Settings className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Beneficios del Cliente por Defecto</h4>
                <ul className="text-sm text-blue-800 mt-2 space-y-1">
                  <li>• Acelera el proceso de venta al no tener que buscar cliente cada vez</li>
                  <li>• Ideal para negocios con muchos clientes casuales o consumo directo</li>
                  <li>• Puedes cambiarlo fácilmente durante la venta si es necesario</li>
                  <li>• Recomendado usar "Cliente Genérico" o "Consumidor Final"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </ConfigurationCard>

      {/* Additional Settings */}
      <ConfigurationCard
        title="Configuraciones Adicionales"
        description="Otras preferencias del sistema de ventas"
        icon={Settings}
      >
        <div className="space-y-4">
          <SettingsToggle
            enabled={true}
            onToggle={() => {}}
            label="Mostrar alertas de stock bajo"
            description="Notifica cuando el stock de un producto esté por debajo del mínimo"
            disabled={true}
          />
          
          <SettingsToggle
            enabled={false}
            onToggle={() => {}}
            label="Permitir precios negativos"
            description="Permite ingresar precios con descuentos que resulten negativos"
            disabled={true}
          />
          
          <SettingsToggle
            enabled={true}
            onToggle={() => {}}
            label="Validar datos de cliente"
            description="Valida RUC/DNI al crear o editar clientes"
            disabled={true}
          />
          
          <SettingsToggle
            enabled={false}
            onToggle={() => {}}
            label="Aplicar redondeo automático"
            description="Redondea automáticamente los totales al céntimo más cercano"
            disabled={true}
          />
        </div>
        
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900">Próximamente</h4>
              <p className="text-sm text-amber-800 mt-1">
                Las configuraciones marcadas como deshabilitadas estarán disponibles en futuras versiones del sistema.
              </p>
            </div>
          </div>
        </div>
      </ConfigurationCard>

      {/* Client Selection Modal */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Seleccionar Cliente por Defecto
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Elige el cliente que se seleccionará automáticamente en nuevas ventas
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowClientModal(false);
                    setClientSearchTerm('');
                  }}
                  disabled={isUpdating}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={clientSearchTerm}
                  onChange={(e) => setClientSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre o documento..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            {/* Client List */}
            <div className="max-h-96 overflow-y-auto">
              {/* No Default Option */}
              <button
                onClick={() => handleDefaultClientChange(null)}
                disabled={isUpdating}
                className="w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <X className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Sin cliente por defecto</h4>
                    <p className="text-sm text-gray-500">Seleccionar cliente manualmente en cada venta</p>
                  </div>
                  {!tempDefaultClientId && (
                    <div className="ml-auto">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  )}
                </div>
              </button>

              {/* Client Options */}
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleDefaultClientChange(client.id)}
                  disabled={isUpdating}
                  className="w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{client.name}</h4>
                      <p className="text-sm text-gray-500">
                        {client.documentType}: {client.documentNumber}
                        {client.email && <span className="ml-2">• {client.email}</span>}
                      </p>
                    </div>
                    {tempDefaultClientId === client.id && (
                      <div className="flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                    )}
                  </div>
                </button>
              ))}

              {/* Empty State */}
              {filteredClients.length === 0 && clientSearchTerm && (
                <div className="p-8 text-center">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No se encontraron clientes
                  </h3>
                  <p className="text-gray-500">
                    Intenta con otros términos de búsqueda o crea un nuevo cliente
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''} disponible{filteredClients.length !== 1 ? 's' : ''}
                </p>
                <button
                  onClick={() => {
                    setShowClientModal(false);
                    setClientSearchTerm('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}