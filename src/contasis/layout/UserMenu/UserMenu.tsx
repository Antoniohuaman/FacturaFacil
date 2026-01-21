import { useState } from 'react';
import { ChevronDown, User, Settings, LogOut, Moon, Sun } from 'lucide-react';

export interface UserData {
  nombre: string;
  email: string;
  rol: string;
  avatar?: string;
  iniciales: string;
}

export interface UserMenuProps {
  user: UserData;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
}

export const UserMenu = ({ 
  user, 
  theme = 'light', 
  onToggleTheme, 
  onProfile, 
  onSettings, 
  onLogout 
}: UserMenuProps) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const menuItems = [
    { id: 'profile', label: 'Mi Perfil', icon: User, action: onProfile },
    { id: 'settings', label: 'Configuración', icon: Settings, action: onSettings },
    { id: 'theme', label: `Tema ${theme === 'light' ? 'Oscuro' : 'Claro'}`, icon: theme === 'light' ? Moon : Sun, action: onToggleTheme },
    { id: 'logout', label: 'Cerrar Sesión', icon: LogOut, action: onLogout },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-2 py-2 text-sm text-primary hover:bg-surface-hover rounded-lg transition-colors"
      >
        <div className="w-8 h-8 bg-brand text-inverse rounded-full flex items-center justify-center font-medium text-sm">
          {user.avatar ? (
            <img src={user.avatar} alt={user.nombre} className="w-full h-full rounded-full object-cover" />
          ) : (
            user.iniciales
          )}
        </div>
        <div className="hidden md:flex flex-col text-left">
          <span className="font-medium text-primary">{user.nombre}</span>
          <span className="text-xs text-secondary">{user.rol}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-secondary" />
      </button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 bg-surface-0 border border-[color:var(--border-default)] rounded-lg shadow-lg z-20 py-2">
            <div className="px-3 py-2 border-b border-[color:var(--border-default)] mb-2">
              <div className="font-medium text-primary">{user.nombre}</div>
              <div className="text-xs text-secondary">{user.email}</div>
              <div className="text-xs text-secondary">{user.rol}</div>
            </div>
            
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  item.action?.();
                  setShowDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-hover flex items-center gap-2 transition-colors ${
                  item.id === 'logout' ? 'text-error' : 'text-primary'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};