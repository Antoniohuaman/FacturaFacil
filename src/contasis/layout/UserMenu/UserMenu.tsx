import { useState, useRef, useEffect } from 'react';
import { User, Settings, Moon, Sun, Monitor, ChevronRight } from 'lucide-react';
import { RadioButton } from '../../components/RadioButton';
import { useTheme } from '../../../contexts/ThemeContext';
import type { UserMenuProps } from './types';

export const UserMenu = ({
  user,
  onProfileClick,
  onSettingsClick,
  onHelpClick,
  onPersonalSettingsClick,
  onSwitchAccountClick,
  onLogoutClick
}: UserMenuProps) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { theme: contextTheme, setTheme } = useTheme();

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
        setIsThemeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const defaultAvatar = '/images/user-cliente.png';

  return (
    <div className="relative flex items-center" ref={userMenuRef}>
      <button 
        className={`w-9 h-9 flex items-center justify-center rounded-full overflow-hidden transition-all duration-200 ${
          isUserMenuOpen 
            ? 'ring-2 ring-primary ring-offset-2' 
            : 'hover:ring-2 hover:ring-default hover:ring-offset-2'
        }`}
        aria-label="Menú de usuario"
        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
      >
        <img 
          src={user.avatar || defaultAvatar} 
          alt={user.name} 
          className="w-full h-full object-cover"
        />
      </button>

      {/* Dropdown Menu */}
      {isUserMenuOpen && (
        <div 
          className="absolute top-full right-0 mt-2 w-[328px] bg-surface-0 border border-secondary rounded-xl z-50"
          style={{
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'visible'
          }}
        >
          {/* User Info Header */}
          <div className="px-4 py-4 bg-surface-1 rounded-t-xl overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full border-2 border-primary overflow-hidden shrink-0">
                <img 
                  src={user.avatar || defaultAvatar} 
                  alt={user.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 ml-1">
                <div className="text-base font-semibold text-primary truncate">{user.name}</div>
                <div className="text-sm text-tertiary truncate">{user.email}</div>
                <div className="text-xs text-tertiary bg-surface-hover px-2 py-0.5 rounded mt-1 inline-block">{user.role}</div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1" style={{ overflow: 'visible' }}>
            <button 
              className="w-full px-4 py-2.5 text-left text-sm text-primary hover:bg-surface-hover transition-colors flex items-center gap-3"
              onClick={() => {
                onProfileClick?.();
                setIsUserMenuOpen(false);
              }}
            >
              <User size={18} className="shrink-0" />
              <span>Perfil</span>
            </button>
            
            <button 
              className="w-full px-4 py-2.5 text-left text-sm text-primary hover:bg-surface-hover transition-colors flex items-center gap-3"
              onClick={() => {
                onSettingsClick?.();
                setIsUserMenuOpen(false);
              }}
            >
              <Settings size={18} className="shrink-0" />
              <span>Configuración de la cuenta</span>
            </button>

            {/* Theme Submenu */}
            <div className="relative" style={{ overflow: 'visible' }}>
              <button 
                className="w-full px-4 py-2.5 text-left text-sm text-primary hover:bg-surface-hover transition-colors flex items-center gap-3"
                onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              >
                <Moon size={18} className="shrink-0" />
                <span className="flex-1">Tema</span>
                <ChevronRight size={16} className="shrink-0" />
              </button>

              {isThemeMenuOpen && (
                <div 
                  className="absolute right-full top-0 mr-1 w-56 bg-surface-1 border border-secondary rounded-lg py-2"
                  style={{
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    zIndex: 60
                  }}
                >
                  {/* Opción Claro */}
                  <button 
                    className="w-full px-4 py-2.5 text-left text-sm text-primary hover:bg-surface-hover transition-colors flex items-center gap-3"
                    onClick={() => {
                      setTheme('light');
                      setIsThemeMenuOpen(false);
                    }}
                  >
                    <RadioButton
                      name="theme"
                      value="light"
                      checked={contextTheme === 'light'}
                      onChange={() => {}}
                    />
                    <div className="flex items-center justify-center w-8 h-8 rounded-md border-2 border-secondary bg-surface-0">
                      <Sun size={20} className="text-primary" />
                    </div>
                    <span className="flex-1">Claro</span>
                  </button>

                  {/* Opción Oscuro */}
                  <button 
                    className="w-full px-4 py-2.5 text-left text-sm text-primary hover:bg-surface-hover transition-colors flex items-center gap-3"
                    onClick={() => {
                      setTheme('dark');
                      setIsThemeMenuOpen(false);
                    }}
                  >
                    <RadioButton
                      name="theme"
                      value="dark"
                      checked={contextTheme === 'dark'}
                      onChange={() => {}}
                    />
                    <div className="flex items-center justify-center w-8 h-8 rounded-md border-2 border-secondary bg-surface-0">
                      <Moon size={20} className="text-primary" />
                    </div>
                    <span className="flex-1">Oscuro</span>
                  </button>

                  {/* Opción Sistema */}
                  <button 
                    className="w-full px-4 py-2.5 text-left text-sm text-primary hover:bg-surface-hover transition-colors flex items-center gap-3"
                    onClick={() => {
                      setTheme('system');
                      setIsThemeMenuOpen(false);
                    }}
                  >
                    <RadioButton
                      name="theme"
                      value="system"
                      checked={contextTheme === 'system'}
                      onChange={() => {}}
                    />
                    <div className="flex items-center justify-center w-8 h-8 rounded-md border-2 border-secondary bg-surface-0 overflow-hidden">
                      <Monitor size={20} className="text-primary" />
                    </div>
                    <span className="flex-1">Sistema</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-muted"></div>

          {/* Additional Menu Items */}
          <div className="py-1 overflow-hidden">
            <button 
              className="w-full px-4 py-2.5 text-left text-sm text-primary hover:bg-surface-hover transition-colors flex items-center gap-3"
              onClick={() => {
                onHelpClick?.();
                setIsUserMenuOpen(false);
              }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Centro de ayuda</span>
            </button>

            <button 
              className="w-full px-4 py-2.5 text-left text-sm text-primary hover:bg-surface-hover transition-colors flex items-center gap-3"
              onClick={() => {
                onPersonalSettingsClick?.();
                setIsUserMenuOpen(false);
              }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>Configuración personal</span>
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-muted"></div>

          {/* Cambiar cuenta */}
          <div className="py-1 overflow-hidden">
            <button 
              className="w-full px-4 py-2.5 text-left text-sm text-primary hover:bg-surface-hover transition-colors flex items-center gap-3"
              onClick={() => {
                onSwitchAccountClick?.();
                setIsUserMenuOpen(false);
              }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span>Cambiar cuenta</span>
            </button>
          </div>

          {/* Logout */}
          <div className="py-1 overflow-hidden rounded-b-xl">
            <button 
              className="w-full px-4 py-2.5 text-left text-sm text-primary hover:bg-surface-hover transition-colors flex items-center gap-3"
              onClick={() => {
                onLogoutClick?.();
                setIsUserMenuOpen(false);
              }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
