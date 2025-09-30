import { useState, useRef, useEffect } from 'react';

export default function Header() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCashMenu, setShowCashMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cashMenuRef = useRef<HTMLDivElement>(null);

  // Información de caja
  const cashInfo = {
    cashier: "Juan Gómez",
    openTime: "09:15 AM",
    initialAmount: "S/ 500.00"
  };

  // Información de sesión del usuario logueado
  const userInfo = {
    name: "Pedro Pérez",
    email: "gerencia@empresa.com",
    initials: "PP"
  };

  // Cerrar menus al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (cashMenuRef.current && !cashMenuRef.current.contains(event.target as Node)) {
        setShowCashMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileAction = (action: string) => {
    setShowProfileMenu(false);
    
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
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 shadow-sm">
      {/* Logo */}
      <div className="text-2xl font-bold flex items-center">
        <span className="text-blue-600">Factura</span>
        <span className="text-red-600 ml-1">Fácil</span>
      </div>
      
      
      {/* Información de sesión activa */}
      <div className="ml-auto flex items-center space-x-8 text-sm">
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
        <div className="relative" ref={menuRef}>
          <button 
            className="flex items-center space-x-2 hover:bg-slate-50 px-2 py-1 rounded-md transition-colors"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-medium text-sm">{userInfo.initials}</span>
            </div>
            <svg 
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
              {/* Información del usuario */}
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">{userInfo.initials}</span>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 text-sm">{userInfo.name}</div>
                    <div className="text-slate-500 text-xs">{userInfo.email}</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleProfileAction('profile')}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Mi perfil</span>
              </button>

              <button
                onClick={() => handleProfileAction('settings')}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Configuración</span>
              </button>

              <hr className="my-1 border-slate-100" />

              <button
                onClick={() => handleProfileAction('logout')}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
