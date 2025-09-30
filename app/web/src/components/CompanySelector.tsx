import { useState } from 'react';
import { Building2, ChevronDown, MapPin } from 'lucide-react';

const CompanySelector = () => {
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(1);
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
    <div className="p-4 border-b border-gray-100/50">
      <div className="relative">
        <button
          onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
          className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200/50
                   hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50
                   transition-all flex items-center justify-between group backdrop-blur-sm
                   hover:shadow-lg hover:shadow-blue-500/10 bg-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 
                          flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30
                          group-hover:scale-105 transition-transform">
              <Building2 size={20} className="text-white" />
            </div>
            <div className="text-left min-w-0">
              <div className="font-bold text-gray-900 text-sm truncate">
                {selectedCompany?.name}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin size={11} />
                {selectedSucursal}
              </div>
            </div>
          </div>
          <ChevronDown 
            size={18} 
            className={`text-gray-400 transition-transform flex-shrink-0 ${
              showCompanyDropdown ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showCompanyDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl 
                        border border-gray-200/50 rounded-2xl shadow-2xl z-50 overflow-hidden">
            
            {/* Header con información de empresa actual */}
            <div className="p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border-b border-gray-200/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 
                              flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Building2 size={24} className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">
                    {selectedCompany?.name}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin size={12} />
                    {selectedSucursal}
                  </div>
                </div>
              </div>

              {/* Sección cambiar sucursal */}
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Cambiar Sucursal
              </div>

              <div className="space-y-2">
                {selectedCompany?.sucursales.map((sucursal) => (
                  <button
                    key={sucursal}
                    onClick={() => {
                      setSelectedSucursal(sucursal);
                      setShowCompanyDropdown(false);
                    }}
                    className={`
                      w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all
                      flex items-center gap-2 font-medium
                      ${sucursal === selectedSucursal 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' 
                        : 'hover:bg-white/80 text-gray-700 hover:shadow-sm bg-white/50'
                      }
                    `}
                  >
                    <MapPin size={14} />
                    {sucursal}
                  </button>
                ))}
              </div>

              {/* Enlace cambiar empresa */}
              <div className="mt-4 pt-3 border-t border-gray-200/50">
                <button 
                  onClick={() => {
                    // Aquí iría la lógica para mostrar otras empresas
                    console.log('Mostrar selector de empresas');
                  }}
                  className="text-blue-600 text-sm font-semibold hover:text-blue-700 transition-colors flex items-center gap-1"
                >
                  Cambiar empresa →
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