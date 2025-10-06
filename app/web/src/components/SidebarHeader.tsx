import React, { useState, useRef, useEffect } from 'react';

interface Empresa {
  logoUrl: string;
  razonSocial: string;
  ruc: string;
  multiEmpresa?: boolean;
}

interface SidebarHeaderProps {
  empresa: Empresa;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({ empresa, collapsed, onToggleCollapse }) => {
  const [showEmpresaDropdown, setShowEmpresaDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Lista de empresas disponibles
  const empresasDisponibles = [
    { id: 1, razonSocial: "Mi Empresa SAC", ruc: "20123456789", activa: true },
    { id: 2, razonSocial: "Distribuidora Lima S.A.", ruc: "20987654321", activa: false },
    { id: 3, razonSocial: "Comercial Norte EIRL", ruc: "20555666777", activa: false },
    { id: 4, razonSocial: "Servicios Generales SRL", ruc: "20111222333", activa: false }
  ];

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowEmpresaDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEmpresaSelect = (empresaSeleccionada: typeof empresasDisponibles[0]) => {
    setShowEmpresaDropdown(false);
    alert(`Cambiando a: ${empresaSeleccionada.razonSocial}\n\n(Aquí se implementaría el cambio real de empresa)`);
  };

  return (
    <div className={`flex flex-col items-center py-6 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 ${collapsed ? 'px-2' : 'px-6'}`}>
      
      {/* Botón para expandir cuando está colapsado */}
      {collapsed && (
        <button 
          className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-2 rounded-md transition-all duration-200"
          onClick={onToggleCollapse}
          title="Expandir menú"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
      
      {!collapsed && (
        <>
          {/* Información de la empresa con dropdown */}
          <div className="text-center mb-4 relative w-full" ref={dropdownRef}>
            <button
              className="w-full hover:bg-slate-50 p-2 rounded-lg transition-all duration-200"
              onClick={() => setShowEmpresaDropdown(!showEmpresaDropdown)}
            >
              <div className="flex items-center justify-center space-x-2">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-md">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-bold text-slate-800">{empresa.razonSocial}</div>
                  <div className="text-xs text-slate-500 font-medium">RUC: {empresa.ruc}</div>
                </div>
                <svg 
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showEmpresaDropdown ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Dropdown de empresas */}
            {showEmpresaDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-lg shadow-lg py-1 z-50 max-h-64 overflow-y-auto">
                {empresasDisponibles.map((empresaItem) => (
                  <button
                    key={empresaItem.id}
                    onClick={() => handleEmpresaSelect(empresaItem)}
                    className={`w-full text-left px-3 py-2 transition-colors hover:bg-slate-50 ${
                      empresaItem.activa ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-md flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${empresaItem.activa ? 'text-blue-700' : 'text-slate-800'}`}>
                          {empresaItem.razonSocial}
                        </div>
                        <div className="text-xs text-slate-500">RUC: {empresaItem.ruc}</div>
                      </div>
                      {empresaItem.activa && (
                        <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Botón colapsar */}
          <button 
            className="mt-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-2 rounded-md transition-all duration-200"
            onClick={onToggleCollapse}
            title="Colapsar menú"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
};

export default SidebarHeader;
