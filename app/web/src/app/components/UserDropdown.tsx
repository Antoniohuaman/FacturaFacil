import React, { useState } from 'react';

interface UserDropdownProps {
  userName: string;
  userRole: string;
  userEmail: string;
  onClose: () => void;
}

const UserDropdown: React.FC<UserDropdownProps> = ({
  userName,
  userRole,
  userEmail,
  onClose
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    console.log(isDarkMode ? 'Tema claro activado' : 'Tema oscuro activado');
  };

  const handleMenuClick = (action: string) => {
    onClose();
    
    switch (action) {
      case 'perfil':
        alert('Redirigiendo a Mi Perfil...\n(Aquí se implementaría la navegación al perfil del usuario)');
        break;
      case 'ayuda':
        alert('Redirigiendo a Centro de Ayuda...\n(Aquí se implementaría la navegación al centro de ayuda)');
        break;
      case 'suscripcion':
        alert('Redirigiendo a Mi Suscripción...\n(Aquí se implementaría la navegación a la suscripción)');
        break;
      case 'logout':
        const confirmLogout = window.confirm('¿Está seguro que desea cerrar la sesión?');
        if (confirmLogout) {
          alert('Cerrando sesión...\n(Aquí se implementaría el logout real)');
        }
        break;
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl py-3 z-50 overflow-hidden">
      {/* User Info Section */}
      <div className="px-3 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <img 
            src="/perfil.jpg?v=2" 
            alt="User" 
            className="w-11 h-11 rounded-full object-cover" 
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm truncate">{userName}</h3>
            <div className="text-xs text-blue-600 font-medium">{userRole}</div>
            <div className="text-xs text-slate-500 truncate">{userEmail}</div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        <button 
          className="w-full flex items-center px-3 py-2 hover:bg-slate-50 transition-colors text-left"
          onClick={() => handleMenuClick('perfil')}
        >
          <svg
            className="w-4 h-4 text-slate-400 mr-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span className="text-slate-700 font-medium text-sm">Mi perfil</span>
        </button>

        <button 
          className="w-full flex items-center px-3 py-2 hover:bg-slate-50 transition-colors text-left"
          onClick={() => handleMenuClick('ayuda')}
        >
          <svg
            className="w-4 h-4 text-slate-400 mr-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <path d="M12 17h.01"></path>
          </svg>
          <span className="text-slate-700 font-medium text-sm">Centro de ayuda</span>
        </button>

        <div className="border-t border-slate-100 my-1"></div>

        {/* Theme Toggle */}
        <button 
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors text-left"
          onClick={toggleTheme}
        >
          <div className="flex items-center">
            <svg
              className="w-4 h-4 text-slate-400 mr-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
            <div>
              <div className="text-slate-700 font-medium text-sm">Tema oscuro</div>
              <div className="text-xs text-slate-500">
                {isDarkMode ? 'Activado' : 'Desactivado'}
              </div>
            </div>
          </div>
          <div className={`relative inline-block w-10 h-5 transition-colors duration-200 ease-in-out rounded-full ${
            isDarkMode ? 'bg-blue-600' : 'bg-slate-200'
          }`}>
            <span className={`inline-block w-3 h-3 transition-transform duration-200 ease-in-out transform bg-white rounded-full shadow-sm ${
              isDarkMode ? 'translate-x-6' : 'translate-x-1'
            } mt-1`}></span>
          </div>
        </button>

        <div className="border-t border-slate-100 my-1"></div>

        <button 
          className="w-full flex items-center px-3 py-2 hover:bg-slate-50 transition-colors text-left"
          onClick={() => handleMenuClick('suscripcion')}
        >
          <svg
            className="w-4 h-4 text-slate-400 mr-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
          </svg>
          <span className="text-slate-700 font-medium text-sm">Mi suscripción</span>
        </button>

        <div className="border-t border-slate-100 my-1"></div>

        <button 
          className="w-full flex items-center px-3 py-2 hover:bg-red-50 transition-colors text-left group"
          onClick={() => handleMenuClick('logout')}
        >
          <svg
            className="w-4 h-4 text-red-400 mr-3 group-hover:text-red-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span className="text-red-600 font-medium text-sm group-hover:text-red-700">Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
};

export default UserDropdown;