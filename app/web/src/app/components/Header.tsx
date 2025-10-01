import { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut } from 'lucide-react';
import SearchBar from './SearchBar';

export default function Header() {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showCashMenu, setShowCashMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cashMenuRef = useRef<HTMLDivElement>(null);

  // Información de caja
  const cashInfo = {
    cashier: "Juan Gómez",
    openTime: "09:15 AM",
    initialAmount: "S/ 500.00"
  };

  // Cerrar menus al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (cashMenuRef.current && !cashMenuRef.current.contains(event.target as Node)) {
        setShowCashMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileAction = (action: string) => {
    setShowUserDropdown(false);
    
    switch (action) {
      case 'profile':
        alert('Redirigiendo a Mi Perfil...\n(Aquí se implementaría la navegación al perfil del usuario)');
        break;
      case 'settings':
        alert('Redirigiendo a Configuración...\n(Aquí se implementaría la navegación a configuración del sistema)');
        break;
      case 'logout':
        const confirmLogout = window.confirm('¿Está seguro que desea cerrar la sesión?');
        if (confirmLogout) {
          alert('Cerrando sesión...\n(Aquí se implementaría el logout real: limpiar tokens, redirect a login, etc.)');
        }
        break;
    }
  };

  const handleCloseCash = () => {
    setShowCashMenu(false);
    const confirmClose = window.confirm('¿Está seguro que desea cerrar la caja?\n\nEsto generará un reporte de cierre y no podrá realizar más operaciones hasta abrir una nueva caja.');
    if (confirmClose) {
      alert('Cerrando caja...\n(Aquí se implementaría el proceso de cierre de caja: conteo final, reporte, etc.)');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 shadow-sm">
      {/* Logo */}
      <div className="flex items-center">
        <img 
          src="/SensiYO.png?v=1" 
          alt="SensiYO"
          className="h-12"
        />
      </div>
      
      {/* SearchBar - ligeramente a la izquierda del centro */}
      <div className="flex-1 flex justify-center">
        <div className="mr-20"> {/* Margen derecho para mover ligeramente a la izquierda */}
          <SearchBar />
        </div>
      </div>
      
      {/* Información de sesión activa */}
      <div className="flex items-center space-x-8 text-sm">
        {/* Estado de caja con dropdown */}
        <div className="relative" ref={cashMenuRef}>
          <button 
            className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 hover:bg-green-100 transition-colors cursor-pointer"
            onClick={() => setShowCashMenu(!showCashMenu)}
          >
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-700 font-medium">Caja Abierta</span>
            <span className="text-green-600">Principal</span>
            <svg 
              className={`w-3 h-3 text-green-600 transition-transform duration-200 ${showCashMenu ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown información de caja */}
          {showCashMenu && (
            <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg py-3 z-50">
              <div className="px-4 pb-3 border-b border-slate-100">
                <h3 className="font-medium text-slate-900 text-sm mb-3">Información de Caja</h3>
                
                {/* Encargado */}
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm text-slate-600">Encargado:</span>
                  <span className="text-sm font-medium text-slate-900">{cashInfo.cashier}</span>
                </div>

                {/* Apertura */}
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-slate-600">Apertura:</span>
                  <span className="text-sm font-medium text-slate-900">{cashInfo.openTime}</span>
                </div>

                {/* Monto inicial */}
                <div className="flex items-center space-x-2 mb-3">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span className="text-sm text-slate-600">Monto inicial:</span>
                  <span className="text-sm font-medium text-slate-900">{cashInfo.initialAmount}</span>
                </div>
              </div>

              {/* Botón cerrar caja */}
              <div className="px-4 pt-3">
                <button
                  onClick={handleCloseCash}
                  className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Cerrar Caja</span>
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Separador */}
        <div className="h-6 w-px bg-slate-300"></div>
        
        {/* Perfil/Menu con dropdown */}
        <div className="relative ml-4" ref={menuRef}>
          <button 
            className="hover:bg-slate-50 p-1 rounded-md transition-colors"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <img 
                src="/perfil.jpg?v=2" 
                alt="Foto de perfil"
                className="w-full h-full object-cover"
              />
            </div>
          </button>

          {/* Dropdown Menu */}
          {showUserDropdown && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              
              {/* Header con info del usuario */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <img 
                    src="/perfil.jpg?v=2" 
                    alt="User" 
                    className="w-12 h-12 rounded-full object-cover" 
                  />
                  <div>
                    <div className="font-bold text-gray-900">Pedro Pérez</div>
                    <div className="text-sm font-semibold text-blue-600">Administrador</div>
                    <div className="text-xs text-gray-500">gerencia@empresa.com</div>
                  </div>
                </div>
              </div>

              {/* Opciones del menú */}
              <div className="p-2">
                <button 
                  onClick={() => handleProfileAction('profile')}
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-sm flex items-center gap-3"
                >
                  <User size={16} />
                  Mi perfil
                </button>
                
                <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-sm flex items-center gap-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Centro de ayuda
                </button>
                
                <button 
                  onClick={() => handleProfileAction('settings')}
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-sm flex items-center gap-3"
                >
                  <Settings size={16} />
                  Configuración
                </button>
              </div>

              {/* Cerrar sesión */}
              <div className="p-2 border-t border-gray-100">
                <button 
                  onClick={() => handleProfileAction('logout')}
                  className="w-full text-left px-3 py-2 rounded hover:bg-red-50 text-sm text-red-600 flex items-center gap-3 font-semibold"
                >
                  <LogOut size={16} />
                  Cerrar sesión
                </button>
              </div>
              
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
