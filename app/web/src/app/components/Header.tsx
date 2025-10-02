import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import SearchBar from './SearchBar';
import UserDropdown from './UserDropdown';

export default function Header() {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showCashMenu, setShowCashMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cashMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Información de caja
  const cashInfo = {
    cashier: "Juan Gómez",
    openTime: "09:15 AM",
    initialAmount: "S/ 500.00"
  };

  // Información del usuario
  const userInfo = {
    userName: "Antonio Huamán",
    userRole: "Administrador",
    userEmail: "antonio@sensiyo.com",
    userInitials: "AH"
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
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      <div className="flex items-center ml-8">
        <img 
          src="/SenciYO.svg" 
          alt="SenciYO"
          className="h-11"
        />
      </div>
      
      {/* SearchBar - más a la izquierda y más notable */}
      <div className="flex-1 flex justify-center">
        <div className="mr-40 transform scale-105"> {/* Escala ligeramente más grande */}
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
            <span className="text-slate-700 font-medium">Caja Principal</span>
            <span className="flex items-center space-x-1 text-green-700 font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Activa</span>
            </span>
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
        
        {/* Botón de notificaciones */}
        <div className="relative ml-4" ref={notificationsRef}>
          <button 
            className="relative w-10 h-10 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center group"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="w-5 h-5 text-slate-600 group-hover:text-slate-900 transition-colors" />
            {/* Indicador de notificaciones nuevas */}
            <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          {/* Dropdown de notificaciones */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-3 z-50 max-h-96 overflow-y-auto">
              <div className="px-4 pb-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 text-base">Notificaciones</h3>
              </div>
              <div className="py-2">
                {/* Ejemplo de notificaciones */}
                <div className="px-4 py-3 hover:bg-slate-50 transition-colors border-l-4 border-blue-500">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">Nueva factura generada</p>
                      <p className="text-xs text-slate-500 mt-1">Factura F001-00123 por S/ 250.00</p>
                    </div>
                    <span className="text-xs text-slate-400">2 min</span>
                  </div>
                </div>
                <div className="px-4 py-3 hover:bg-slate-50 transition-colors border-l-4 border-green-500">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">Cliente registrado</p>
                      <p className="text-xs text-slate-500 mt-1">Nuevo cliente: María García</p>
                    </div>
                    <span className="text-xs text-slate-400">5 min</span>
                  </div>
                </div>
                <div className="px-4 py-3 hover:bg-slate-50 transition-colors border-l-4 border-orange-500">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">Stock bajo</p>
                      <p className="text-xs text-slate-500 mt-1">Producto XYZ tiene solo 5 unidades</p>
                    </div>
                    <span className="text-xs text-slate-400">1 hora</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-2">
                <button className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors">
                  Ver todas las notificaciones
                </button>
              </div>
            </div>
          )}
        </div>
        
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
            <UserDropdown 
              userName={userInfo.userName}
              userRole={userInfo.userRole}
              userEmail={userInfo.userEmail}
              onClose={() => setShowUserDropdown(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
}
