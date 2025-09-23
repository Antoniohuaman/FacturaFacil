import React from 'react';

interface Empresa {
  logoUrl: string;
  razonSocial: string;
  ruc: string;
  multiEmpresa?: boolean;
}

interface Usuario {
  nombre: string;
  rol: string;
}

interface SidebarHeaderProps {
  empresa: Empresa;
  usuario: Usuario;
  onEmpresaChange?: () => void;
  collapsed?: boolean;
}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({ empresa, usuario, onEmpresaChange, collapsed }) => (
  <div className={`flex flex-col items-center py-6 bg-white border-b ${collapsed ? 'justify-center' : ''}`}>
    <div className={`rounded-full bg-gray-100 flex items-center justify-center overflow-hidden ${collapsed ? 'w-12 h-12 mb-0' : 'w-24 h-24 mb-3'}`}>
      <img
        src="/perfil.jpeg"
        alt="Logo"
        className={collapsed ? 'w-full h-full object-cover' : 'w-full h-full object-cover'}
        style={{ display: 'block' }}
      />
    </div>
    {!collapsed && (
      <>
        <div className="text-sm font-bold text-gray-800 text-center">{empresa.razonSocial}</div>
        <div className="text-xs text-gray-500 mb-2 text-center">RUC: {empresa.ruc}</div>
        {empresa.multiEmpresa && (
          <button
            className="text-blue-600 text-xs flex items-center gap-1 hover:underline mb-2"
            onClick={onEmpresaChange}
          >
            Cambiar empresa
            <span>
              {/* Flecha hacia abajo moderna */}
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 8l4 4 4-4" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
        )}
        <div className="mt-2 text-xs text-gray-700 text-center">{usuario.nombre}</div>
        <div className="text-xs text-gray-400 text-center">{usuario.rol}</div>
      </>
    )}
  </div>
);

export default SidebarHeader;
