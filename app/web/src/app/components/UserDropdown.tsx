import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../features/autenticacion/hooks/useAuth';
import ConfirmationModal from '../../../../shared/src/components/ConfirmationModal';

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
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const [showThemeOptions, setShowThemeOptions] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleMenuClick = (action: string) => {
    switch (action) {
      case 'perfil':
        onClose();
        alert('Redirigiendo a Mi Perfil...\n(Aquí se implementaría la navegación al perfil del usuario)');
        break;
      case 'ayuda':
        onClose();
        alert('Redirigiendo a Centro de Ayuda...\n(Aquí se implementaría la navegación al centro de ayuda)');
        break;
      case 'suscripcion':
        onClose();
        alert('Redirigiendo a Mi Suscripción...\n(Aquí se implementaría la navegación a la suscripción)');
        break;
      case 'logout':
        // NO cerrar el dropdown aquí, solo mostrar el modal
        setShowLogoutModal(true);
        break;
    }
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    onClose();
    
    // Ejecutar logout real
    await logout();
    
    // Redirigir al login
    navigate('/auth/login');
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
    <>
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

          {/* Tema button */}
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
                <circle cx="12" cy="12" r="5"></circle>
                <path d="M12 1v2"></path>
                <path d="M12 21v2"></path>
                <path d="M4.22 4.22l1.42 1.42"></path>
                <path d="M18.36 18.36l1.42 1.42"></path>
                <path d="M1 12h2"></path>
                <path d="M21 12h2"></path>
                <path d="M4.22 19.78l1.42-1.42"></path>
                <path d="M18.36 5.64l1.42-1.42"></path>
              </svg>
              <div>
                <span className="text-slate-700 dark:text-gray-300 font-medium text-sm">Tema</span>
                <div className="text-xs text-slate-500 dark:text-gray-400">{getThemeLabel()}</div>
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

          {/* Theme Options - Expandidas debajo del botón tema */}
          {showThemeOptions && (
            <div className="bg-slate-50 dark:bg-gray-700/50 border-l-2 border-blue-500 ml-3 mr-3 rounded-r-md">
              
              {/* Claro */}
              <div
                className={`w-full flex items-center px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-gray-600 transition-colors cursor-pointer ${
                  theme === 'light' ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
                onClick={() => {
                  setTheme('light');
                  setShowThemeOptions(false);
                }}
              >
                {theme === 'light' ? (
                  <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                ) : (
                  <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-500 rounded-full mr-3"></div>
                )}
                <div className="flex items-center justify-center w-8 h-5 bg-white border border-gray-200 rounded mr-3 shadow-sm">
                  <div className="w-6 h-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-sm border border-gray-100"></div>
                </div>
                <span className="font-medium text-slate-900 dark:text-gray-100 text-sm">Claro</span>
              </div>

              {/* Oscuro */}
              <div
                className={`w-full flex items-center px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-gray-600 transition-colors cursor-pointer ${
                  theme === 'dark' ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
                onClick={() => {
                  setTheme('dark');
                  setShowThemeOptions(false);
                }}
              >
                {theme === 'dark' ? (
                  <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                ) : (
                  <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-500 rounded-full mr-3"></div>
                )}
                <div className="flex items-center justify-center w-8 h-5 bg-gray-800 border border-gray-600 rounded mr-3 shadow-sm">
                  <div className="w-6 h-3 bg-gradient-to-br from-gray-700 to-gray-800 rounded-sm border border-gray-600"></div>
                </div>
                <span className="font-medium text-slate-900 dark:text-gray-100 text-sm">Oscuro</span>
              </div>

              {/* System */}
              <div
                className={`w-full flex items-center px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-gray-600 transition-colors cursor-pointer ${
                  theme === 'system' ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
                onClick={() => {
                  setTheme('system');
                  setShowThemeOptions(false);
                }}
              >
                {theme === 'system' ? (
                  <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                ) : (
                  <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-500 rounded-full mr-3"></div>
                )}
                <div className="flex items-center justify-center w-8 h-5 border border-gray-200 rounded mr-3 shadow-sm">
                  <div className="w-4 h-3 bg-gradient-to-r from-blue-100 via-gray-200 to-gray-700 rounded-sm"></div>
                </div>
                <span className="font-medium text-slate-900 dark:text-gray-100 text-sm">Igual que el navegador</span>
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 dark:border-gray-700 my-1"></div>

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
              className="w-4 h-4 text-slate-400 dark:text-gray-500 mr-3 group-hover:text-red-500"
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

      {/* Modal de Confirmación de Logout */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        title="Cerrar sesión"
        message="¿Estás seguro que deseas cerrar tu sesión?"
        confirmText="Cerrar sesión"
        cancelText="Cancelar"
        confirmButtonStyle="danger"
        onConfirm={handleConfirmLogout}
        onCancel={() => {
          setShowLogoutModal(false);
          // Mantener el dropdown abierto al cancelar
        }}
      />
    </>
  );
};

export default UserDropdown;