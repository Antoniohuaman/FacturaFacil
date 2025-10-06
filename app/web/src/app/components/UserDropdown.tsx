import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { theme, setTheme } = useTheme();
  const [showThemeOptions, setShowThemeOptions] = useState(false);

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

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Claro';
      case 'dark': return 'Oscuro';
      case 'system': return 'Tema del sistema';
      default: return 'Tema del sistema';
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-xl shadow-xl py-3 z-50 overflow-hidden">
      {/* User Info Section */}
      <div className="px-3 pb-3 border-b border-slate-100 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <img 
            src="/perfil.jpg?v=2" 
            alt="User" 
            className="w-11 h-11 rounded-full object-cover" 
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-gray-100 text-sm truncate">{userName}</h3>
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">{userRole}</div>
            <div className="text-xs text-slate-500 dark:text-gray-400 truncate">{userEmail}</div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        <button 
          className="w-full flex items-center px-3 py-2 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors text-left"
          onClick={() => handleMenuClick('perfil')}
        >
          <svg
            className="w-4 h-4 text-slate-400 dark:text-gray-500 mr-3"
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
          <span className="text-slate-700 dark:text-gray-300 font-medium text-sm">Mi perfil</span>
        </button>

        <button 
          className="w-full flex items-center px-3 py-2 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors text-left"
          onClick={() => handleMenuClick('ayuda')}
        >
          <svg
            className="w-4 h-4 text-slate-400 dark:text-gray-500 mr-3"
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
          <span className="text-slate-700 dark:text-gray-300 font-medium text-sm">Centro de ayuda</span>
        </button>

        <div className="border-t border-slate-100 my-1"></div>

        {/* Theme Selector */}
        <div className="relative">
          <button 
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors text-left"
            onClick={() => setShowThemeOptions(!showThemeOptions)}
          >
            <div className="flex items-center">
              <svg
                className="w-4 h-4 text-slate-400 dark:text-gray-500 mr-3"
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
                <div className="text-slate-700 dark:text-gray-300 font-medium text-sm">Tema</div>
                <div className="text-xs text-slate-500 dark:text-gray-400">
                  {getThemeLabel()}
                </div>
              </div>
            </div>
            <svg
              className={`w-4 h-4 text-slate-400 dark:text-gray-500 transition-transform ${showThemeOptions ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6,9 12,15 18,9"></polyline>
            </svg>
          </button>

          {/* Theme Options Dropdown */}
          {showThemeOptions && (
            <div className="mx-3 mt-1 bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg p-2">
              {/* Claro */}
              <button
                className={`w-full flex items-center px-3 py-3 text-left hover:bg-white dark:hover:bg-gray-600 transition-colors rounded-lg ${
                  theme === 'light' ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' : ''
                }`}
                onClick={() => {
                  setTheme('light');
                  setShowThemeOptions(false);
                }}
              >
                <div className="flex items-center justify-center w-12 h-8 bg-white border-2 border-gray-200 rounded-md mr-3 overflow-hidden shadow-sm">
                  <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                    <div className="w-6 h-4 bg-white rounded-sm shadow-sm border border-gray-200"></div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-gray-100 text-sm">Claro</div>
                </div>
                {theme === 'light' && (
                  <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </button>

              {/* Oscuro */}
              <button
                className={`w-full flex items-center px-3 py-3 text-left hover:bg-white dark:hover:bg-gray-600 transition-colors rounded-lg ${
                  theme === 'dark' ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' : ''
                }`}
                onClick={() => {
                  setTheme('dark');
                  setShowThemeOptions(false);
                }}
              >
                <div className="flex items-center justify-center w-12 h-8 bg-gray-800 border-2 border-gray-600 rounded-md mr-3 overflow-hidden shadow-sm">
                  <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <div className="w-6 h-4 bg-gray-700 rounded-sm shadow-sm border border-gray-600"></div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-gray-100 text-sm">Oscuro</div>
                </div>
                {theme === 'dark' && (
                  <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </button>

              {/* Igual que el navegador */}
              <button
                className={`w-full flex items-center px-3 py-3 text-left hover:bg-white dark:hover:bg-gray-600 transition-colors rounded-lg ${
                  theme === 'system' ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' : ''
                }`}
                onClick={() => {
                  setTheme('system');
                  setShowThemeOptions(false);
                }}
              >
                <div className="flex items-center justify-center w-12 h-8 border-2 border-gray-200 rounded-md mr-3 overflow-hidden shadow-sm">
                  <div className="w-1/2 h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                    <div className="w-3 h-2 bg-white rounded-l-sm shadow-sm border-r border-gray-200"></div>
                  </div>
                  <div className="w-1/2 h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <div className="w-3 h-2 bg-gray-700 rounded-r-sm shadow-sm border-l border-gray-600"></div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-gray-100 text-sm">Igual que el navegador</div>
                </div>
                {theme === 'system' && (
                  <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 my-1"></div>

        <button 
          className="w-full flex items-center px-3 py-2 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors text-left"
          onClick={() => handleMenuClick('suscripcion')}
        >
          <svg
            className="w-4 h-4 text-slate-400 dark:text-gray-500 mr-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
          </svg>
          <span className="text-slate-700 dark:text-gray-300 font-medium text-sm">Mi suscripción</span>
        </button>

        <div className="border-t border-slate-100 my-1"></div>

        <button 
          className="w-full flex items-center px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left group"
          onClick={() => handleMenuClick('logout')}
        >
          <svg
            className="w-4 h-4 text-red-400 dark:text-red-500 mr-3 group-hover:text-red-500 dark:group-hover:text-red-400"
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
          <span className="text-red-600 dark:text-red-400 font-medium text-sm group-hover:text-red-700 dark:group-hover:text-red-300">Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
};

export default UserDropdown;