import { useState } from 'react';
import { Building2, ChevronDown, MapPin } from 'lucide-react';

const CompanySelector = () => {
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const selectedCompanyId = 1; // TODO: Implementar selección dinámica de empresa
  const [selectedSucursal, setSelectedSucursal] = useState('Tienda Sur');

  const companies = [
    { 
      id: 1, 
      name: 'Mi Empresa SAC', 
      ruc: '20123456789',
      sucursales: ['Tienda Sur', 'Tienda Norte', 'Almacén Central']
    },
    { 
      id: 2, 
      name: 'Comercial XYZ', 
      ruc: '20987654321',
      sucursales: ['Principal', 'Sucursal Lima', 'Sucursal Callao']
    },
    { 
      id: 3, 
      name: 'Distribuidora ABC', 
      ruc: '20555444333',
      sucursales: ['Sede Central', 'Almacén 1', 'Almacén 2']
    }
  ];

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  return (
    <div className="p-4 border-b border-gray-100/50 dark:border-gray-700/50">
      <div className="relative">
        <button
          onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
          className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200/50 dark:border-gray-600/50
                   hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50
                   transition-all duration-150 flex items-center justify-between group backdrop-blur-sm
                   hover:shadow-md bg-white dark:bg-gray-800/70"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 
                          flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30
                          group-hover:scale-105 transition-transform">
              <Building2 size={20} className="text-white" />
            </div>
            <div className="text-left min-w-0">
              <div className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">
                {selectedCompany?.name}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <MapPin size={11} />
                {selectedSucursal}
              </div>
            </div>
          </div>
          <ChevronDown 
            size={18} 
            className={`text-gray-400 dark:text-gray-500 transition-transform flex-shrink-0 ${
              showCompanyDropdown ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showCompanyDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 border border-gray-200 dark:border-gray-600">
            <div className="p-2">
              <div className="text-xs font-medium px-2 py-1.5 text-gray-500 dark:text-gray-400">
                Sucursales de {selectedCompany?.name}
              </div>
              
              <div className="space-y-1">
                {selectedCompany?.sucursales.map((sucursal) => (
                  <button
                    key={sucursal}
                    onClick={() => {
                      setSelectedSucursal(sucursal);
                      setShowCompanyDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors duration-150 ${
                      sucursal === selectedSucursal 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-l-3 border-blue-600 dark:border-blue-400' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/70 text-gray-700 dark:text-gray-300 border-l-3 border-transparent'
                    }`}
                  >
                    <div className="flex items-center">
                      <MapPin size={14} className="mr-2 text-gray-400 dark:text-gray-500" />
                      <div>
                        <div className="font-medium">{sucursal}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {sucursal === 'Tienda Sur' ? 'Av. Principal 123' : 
                           sucursal === 'Tienda Norte' ? 'Jr. Los Olivos 456' : 
                           'Av. Industrial 789'}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <button className="w-full flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors text-sm text-blue-600 dark:text-blue-400 font-medium">
                  <Building2 size={16} />
                  <span>Cambiar empresa</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanySelector;