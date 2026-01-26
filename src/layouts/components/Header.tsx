import { useState, useRef, useEffect } from 'react';
import { Bell, Settings, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import UserDropdown from './UserDropdown';
import { useUserSession } from '../../contexts/UserSessionContext';
import { useCaja } from '../../pages/Private/features/control-caja/context/CajaContext';
import { useHeaderNotifications } from '@/shared/notifications/useHeaderNotifications';

interface HeaderProps {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function Header({ sidebarCollapsed, onToggleSidebar }: HeaderProps) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showCashMenu, setShowCashMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const cashMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const LAST_NON_CONFIG_ROUTE_KEY = 'lastNonConfigRoute';
  const isInConfiguration = location.pathname === '/configuracion' || location.pathname.startsWith('/configuracion/');
  const configButtonLabel = isInConfiguration ? 'Salir de Configuración' : 'Configuración del Sistema';

  // ✅ Contexts para datos reales
  const { session } = useUserSession();
  const { status, aperturaActual, getResumen } = useCaja();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useHeaderNotifications();

  // Calcular resumen de caja (saldo actual = apertura + ingresos - egresos)
  const resumenCaja = getResumen();
  const montoActual = resumenCaja.saldo;
  const cajaAbierta = status === 'abierta';

  // Información de caja actualizada
  const cashInfo = {
    cashier: aperturaActual?.usuarioNombre || session?.userName || "Usuario",
    openTime: aperturaActual?.fechaHoraApertura ? new Date(aperturaActual.fechaHoraApertura).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : "N/A",
    initialAmount: `S/ ${(aperturaActual?.montoInicialTotal || 0).toFixed(2)}`,
    currentAmount: `S/ ${montoActual.toFixed(2)}`,
    turno: "Mañana" // TODO: Obtener turno real si existe en el modelo
  };

  // Información del usuario
  const userInfo = {
    userName: session?.userName || "Usuario",
    userRole: session?.role || "Usuario",
    userEmail: session?.userEmail || "",
    userInitials: session?.userName?.split(' ').map(n => n[0]).join('').toUpperCase() || "U"
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
    // Navegar a la página de control de caja con tab de cierre
    navigate('/control-caja?tab=cierre');
  };

  const handleOpenCash = () => {
    setShowCashMenu(false);
    // Navegar a la página de control de caja con tab de apertura
    navigate('/control-caja?tab=apertura');
  };

  // Persistir la última ruta fuera de configuración para permitir regresar
  useEffect(() => {
    if (!isInConfiguration) {
      const currentUrl = `${location.pathname}${location.search}${location.hash}`;
      sessionStorage.setItem(LAST_NON_CONFIG_ROUTE_KEY, currentUrl);
    }
  }, [isInConfiguration, location.pathname, location.search, location.hash]);

  const handleConfigurationClick = () => {
    const currentUrl = `${location.pathname}${location.search}${location.hash}`;

    if (!isInConfiguration) {
      sessionStorage.setItem(LAST_NON_CONFIG_ROUTE_KEY, currentUrl);
      navigate('/configuracion');
      return;
    }

    const lastRoute = sessionStorage.getItem(LAST_NON_CONFIG_ROUTE_KEY);
    if (lastRoute && !lastRoute.startsWith('/configuracion')) {
      navigate(lastRoute);
      return;
    }

    navigate('/');
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 flex items-center px-6 shadow-sm">
      {/* Botón de colapsar/expandir sidebar */}
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors mr-4"
          aria-label={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          <Menu className="w-5 h-5 text-slate-600 dark:text-gray-300" />
        </button>
      )}

      {/* Logo */}
      <button
        onClick={() => navigate('/indicadores')}
        className="flex items-center ml-1 hover:opacity-80 transition-opacity"
      >
        <img
          src="/Senciyo_Logo.png"
          alt="SenciYO"
          className="h-8 w-auto object-contain dark:filter dark:invert dark:brightness-0 dark:contrast-100"
        />
      </button>

      {/* SearchBar */}
      <div className="flex-1 flex justify-center px-8">
        <div className="w-full max-w-3xl">
          <div className="flex items-center w-full">
            <div className={sidebarCollapsed ? 'w-[88px] flex-shrink-0' : 'w-[260px] flex-shrink-0'} />
            <div className="flex-1 flex justify-center">
              <div className="w-full max-w-[450px]">
                <SearchBar />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Información de sesión activa */}
      <div className="flex items-center space-x-4 text-sm">
        {/* Estado de caja con dropdown */}
        <div className="relative" ref={cashMenuRef}>
          <button
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${cajaAbierta
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
              }`}
            onClick={() => setShowCashMenu(!showCashMenu)}
          >
            <span className="text-slate-700 dark:text-gray-200 font-medium">Caja</span>
            <span className={`flex items-center space-x-1 font-medium ${cajaAbierta ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
              }`}>
              <span className={`w-2 h-2 rounded-full ${cajaAbierta ? 'bg-green-500 dark:bg-green-400 animate-pulse' : 'bg-red-500 dark:bg-red-400'
                }`}></span>
              <span>{cajaAbierta ? 'Activa' : 'Cerrada'}</span>
            </span>
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${cajaAbierta ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                } ${showCashMenu ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown información de caja */}
          {showCashMenu && (
            <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-lg shadow-lg py-3 z-50">
              {cajaAbierta ? (
                <>
                  <div className="px-4 pb-3 border-b border-slate-100 dark:border-gray-700">
                    <h3 className="font-medium text-slate-900 dark:text-white text-sm mb-3">Información de Caja</h3>

                    {/* Encargado */}
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-slate-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-sm text-slate-600 dark:text-gray-400">Encargado:</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{cashInfo.cashier}</span>
                    </div>

                    {/* Turno */}
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-slate-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-slate-600 dark:text-gray-400">Turno:</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{cashInfo.turno}</span>
                    </div>

                    {/* Apertura */}
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-slate-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-slate-600 dark:text-gray-400">Apertura:</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{cashInfo.openTime}</span>
                    </div>

                    {/* Monto actual (saldo acumulado) */}
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-slate-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <span className="text-sm text-slate-600 dark:text-gray-400">Saldo actual:</span>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">{cashInfo.currentAmount}</span>
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
                </>
              ) : (
                <>
                  <div className="px-4 pb-3">
                    <h3 className="font-medium text-slate-900 dark:text-white text-sm mb-2">Caja Cerrada</h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mb-3">
                      La caja está cerrada. Ábrela para comenzar a operar.
                    </p>
                  </div>

                  {/* Botón abrir caja */}
                  <div className="px-4">
                    <button
                      onClick={handleOpenCash}
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                      <span>Abrir Caja</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Botón de notificaciones */}
        <div className="relative" ref={notificationsRef}>
          <button
            className="relative w-10 h-10 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center group"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Ver notificaciones"
          >
            <Bell className="w-5 h-5 text-slate-600 dark:text-gray-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
            {/* Indicador de notificaciones nuevas */}
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[0.75rem] h-3 px-[2px] bg-red-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                <span className="sr-only">Tienes {unreadCount} notificaciones sin leer</span>
              </span>
            )}
          </button>

          {/* Dropdown de notificaciones */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-[480px] bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-xl py-3 z-50 max-h-96 overflow-y-auto">
              <div className="px-4 pb-3 border-b border-slate-100 dark:border-gray-700">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-base">Notificaciones</h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400">
                      {unreadCount > 0
                        ? `${unreadCount} sin leer`
                        : 'Al día, sin pendientes'}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      onClick={() => markAllAsRead()}
                    >
                      Marcar todas como leídas
                    </button>
                  )}
                </div>
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-gray-400">
                  <p className="font-medium text-slate-700 dark:text-gray-200 mb-1">
                    Sin notificaciones recientes
                  </p>
                  <p className="text-xs">
                    Te avisaremos cuando haya algo importante.
                  </p>
                </div>
              ) : (
                <div className="py-2 space-y-1">
                  {notifications.map((notification) => {
                    const isUnread = !notification.read;
                    const borderColor =
                      notification.severity === 'error'
                        ? 'border-red-500'
                        : notification.severity === 'warning'
                          ? 'border-yellow-500'
                          : notification.severity === 'success'
                            ? 'border-emerald-500'
                            : 'border-slate-300';

                    return (
                      <button
                        key={notification.id}
                        type="button"
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors border-l-4 ${borderColor} ${isUnread ? 'bg-slate-50/80 dark:bg-gray-800/60' : ''
                          }`}
                        onClick={() => {
                          if (notification.link) {
                            navigate(notification.link);
                          }
                          markAsRead(notification.id);
                          setShowNotifications(false);
                        }}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {notification.title}
                            </p>
                            {notification.message && (
                              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                                {notification.message}
                              </p>
                            )}
                          </div>
                          <span className="ml-2 mt-0.5 inline-flex h-2 w-2 rounded-full bg-slate-300 dark:bg-gray-500" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="border-t border-slate-100 dark:border-gray-700 pt-2">
                <button
                  type="button"
                  className="w-full px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  onClick={() => {
                    navigate('/notificaciones');
                    setShowNotifications(false);
                  }}
                >
                  Ver todas las notificaciones
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Botón de configuración */}
        <div className="relative ml-4">
          <button
            onClick={handleConfigurationClick}
            className="relative w-10 h-10 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center group"
            title={configButtonLabel}
            aria-label={configButtonLabel}
          >
            <Settings className="w-5 h-5 text-slate-600 dark:text-gray-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
          </button>
          {/* Indicador de configuración incompleta */}
          <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
        </div>

        {/* Perfil/Menu con dropdown */}
        <div className="relative ml-4" ref={menuRef}>
          <button
            className="relative w-10 h-10 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center group"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden">
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
