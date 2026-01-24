import { useMemo, useEffect } from 'react';
import { SearchBar } from '../../SearchBar';
import { CajaStatus } from '../CajaStatus/index.ts';
import { CrearMenu } from '../CrearMenu/index.ts';
import { UserMenu } from '../UserMenu/index.ts';
import { EmpresaSelector } from '../EmpresaSelector/index.ts';
import type { CajaData } from '../CajaStatus/index.ts';
import type { DocumentoTipo } from '../CrearMenu/index.ts';
import type { UserData } from '../UserMenu/index.ts';
import type { Empresa, Sede } from '../EmpresaSelector/index.ts';
import type { SearchDataset } from '../../SearchBar';
import { useTenantStore } from '../../../pages/Private/features/autenticacion/store/TenantStore';
import { useTenantSync } from '../../../pages/Private/features/autenticacion/hooks/useTenantSync';
import { useUserSession } from '../../../contexts/UserSessionContext';
import { useCaja } from '../../../pages/Private/features/control-caja/context/CajaContext';
import { useTheme } from '../../../contexts/ThemeContext';

export interface TopBarProps {
  onToggleSidebar: () => void;
  showCaja?: boolean;
  empresas?: Empresa[];
  sedes?: Sede[];
  initialEmpresaId?: string;
  initialSedeId?: string;
  cajaData?: CajaData;
  user?: UserData;
  onChangeEmpresa?: (empresaId: string) => void;
  onChangeSede?: (sedeId: string) => void;
  onCrearDocumento?: (tipo: DocumentoTipo) => void;
  onCrearCliente?: () => void;
  onCrearProducto?: () => void;
  onVerMovimientosCaja?: () => void;
  onCerrarCaja?: () => void;
  searchDatasets?: SearchDataset[];
  onSearchSelect?: (type: string, item: unknown) => void;
}

export const TopBar = ({ 
  onToggleSidebar, 
  showCaja = false,
  empresas: empresasProps = [],
  initialEmpresaId,
  initialSedeId,
  cajaData: cajaDataProps,
  user: userProps,
  onChangeEmpresa,
  onChangeSede,
  onCrearDocumento,
  onCrearCliente,
  onCrearProducto,
  onVerMovimientosCaja,
  onCerrarCaja,
  searchDatasets = [],
  onSearchSelect,
}: TopBarProps) => {
  // ✅ Obtener datos reales de contextos
  const { empresas: empresasReales, contextoActual, setContextoActual } = useTenantStore();
  const { session } = useUserSession();
  const { status: cajaStatus } = useCaja();
  const { theme } = useTheme();

  // ✅ Mapear empresas y sedes reales del store
  const empresasMapeadas = useMemo(() => {
    const data = empresasReales && empresasReales.length > 0 ? empresasReales : empresasProps;
    return (data as any[]).map((e: any) => ({
      id: e.id,
      nombre: e.nombreComercial || e.razonSocial || e.nombre,
      ruc: e.ruc,
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      establecimientos: e.establecimientos || []
    }));
  }, [empresasReales, empresasProps]);

  const sedesMapeadas = useMemo(() => {
    const data = empresasReales && empresasReales.length > 0 ? empresasReales : empresasProps;
    return (data as any[]).flatMap((e: any) => 
      (e.establecimientos || []).map((s: any) => ({
        id: s.id,
        nombre: s.nombre,
        direccion: s.direccion,
        empresaId: e.id
      }))
    );
  }, [empresasReales, empresasProps]);

  // ✅ Usar contexto actual del store si está disponible
  const empresaActualId = contextoActual?.empresaId || initialEmpresaId || '1';
  const sedeActualId = contextoActual?.establecimientoId || initialSedeId || '1';

  const handleVerMovimientos = () => {
    onVerMovimientosCaja?.();
  };

  const handleCerrarCaja = () => {
    onCerrarCaja?.();
  };

  const handleCrearDocumento = (tipo: DocumentoTipo) => {
    onCrearDocumento?.(tipo);
  };

  const handleCrearCliente = () => {
    onCrearCliente?.();
  };

  const handleCrearProducto = () => {
    onCrearProducto?.();
  };

  // 🔄 Sincronizar cambios de establecimientos desde Configuración
  const { recargarEmpresasEnTenantStore } = useTenantSync();

  useEffect(() => {
    const handleTenantSync = () => {
      recargarEmpresasEnTenantStore();
    };

    window.addEventListener('tenant-sync-request', handleTenantSync);
    return () => window.removeEventListener('tenant-sync-request', handleTenantSync);
  }, [recargarEmpresasEnTenantStore]);

  const handleChangeEmpresa = (empresaId: string) => {
    const empresaReal = empresasReales.find((e: any) => e.id === empresaId);
    if (empresaReal && empresaReal.establecimientos && empresaReal.establecimientos.length > 0) {
      setContextoActual({
        empresaId: empresaReal.id,
        establecimientoId: empresaReal.establecimientos[0].id,
        empresa: empresaReal,
        establecimiento: empresaReal.establecimientos[0],
        permisos: [],
        configuracion: {}
      });
    }
    onChangeEmpresa?.(empresaId);
  };

  const handleChangeSede = (sedeId: string) => {
    const sede = sedesMapeadas.find((s: any) => s.id === sedeId);
    if (sede) {
      const empresaReal = empresasReales.find((e: any) => e.id === sede.empresaId);
      const establecimientoObj = (empresaReal?.establecimientos || []).find((es: any) => es.id === sedeId);
      if (empresaReal && establecimientoObj) {
        setContextoActual({
          empresaId: empresaReal.id,
          establecimientoId: sedeId,
          empresa: empresaReal,
          establecimiento: establecimientoObj,
          permisos: [],
          configuracion: {}
        });
      }
    }
    onChangeSede?.(sedeId);
  };

  // Datos actuales para mostrar
  const empresaActual = empresasMapeadas.find((e: any) => e.id === empresaActualId);
  const sedeActual = sedesMapeadas.find((s: any) => s.id === sedeActualId);

  const actual = (empresaActual && sedeActual) ? {
    empresa: empresaActual,
    sede: sedeActual
  } : null;

  // User data - construir un UserData válido
  const userDisplay: UserData = userProps || {
    id: session?.userId || '',
    nombre: session?.userName || 'Usuario',
    apellido: '',
    email: session?.userEmail || '',
    rol: (session?.role as any) || 'usuario',
    estado: 'activo',
    emailVerificado: false,
    require2FA: false,
    fechaCreacion: new Date().toISOString()
  };

  return (
    <header className="h-14 border-b border-[color:var(--border-default)] flex items-center px-4 gap-4 z-[100] shrink-0">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button 
          className="w-10 h-10 flex items-center justify-center bg-transparent rounded-lg cursor-pointer text-secondary hover:bg-surface-hover hover:text-primary transition-all duration-200"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <div className="flex items-center gap-2">
          <img 
            src={theme === 'dark' ? '/Sensiyo-logo-b.svg' : '/Sensiyo-logo.svg'} 
            alt="Sensiyo" 
            className="h-8" 
          />
        </div>
      </div>

      {/* Center Section - Search */}
      <div className="flex items-center gap-3 flex-1 ml-14">
        <div className="w-full max-w-[496px]">
          <SearchBar 
            placeholder="Buscar productos, clientes..." 
            datasets={searchDatasets}
            onSelect={onSearchSelect}
            className="w-full"
          />
        </div>
        
        {/* Crear nuevo - solo ícono */}
        <CrearMenu
          onCrearDocumento={handleCrearDocumento}
          onCrearCliente={handleCrearCliente}
          onCrearProducto={handleCrearProducto}
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center">
        {/* Caja Status - solo visible cuando showCaja es true y cajaData existe */}
        {showCaja && cajaDataProps && (
          <>
            <CajaStatus
              data={cajaDataProps}
              onVerMovimientos={handleVerMovimientos}
              onCerrarCaja={handleCerrarCaja}
            />
            <div className="w-8"></div>
          </>
        )}

        {/* Selector de Empresa */}
        {empresasMapeadas.length > 0 && (
          <EmpresaSelector
            actual={actual}
            empresas={empresasMapeadas}
            sedes={sedesMapeadas}
            onChangeEmpresa={handleChangeEmpresa}
            onChangeSede={handleChangeSede}
          />
        )}

        {/* Spacer 32px */}
        <div className="w-8"></div>

        {/* Actions Group */}
        <div className="flex items-center gap-2">
          {/* Settings */}
          <button 
          className="w-10 h-10 flex items-center justify-center bg-transparent rounded-lg cursor-pointer text-secondary hover:bg-surface-hover transition-all duration-200"
          aria-label="Configuración"
        >
          <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Notificaciones */}
        <button 
          className="w-10 h-10 flex items-center justify-center bg-transparent rounded-lg cursor-pointer text-secondary hover:bg-surface-hover transition-all duration-200 relative" 
          aria-label="Notificaciones"
        >
          <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
        </button>
        </div>

        {/* Spacer 8px */}
        <div className="w-2"></div>

        {/* Separador vertical */}
        <div className="h-8 w-px bg-secondary"></div>

        {/* Spacer 8px */}
        <div className="w-2"></div>

        {/* User Menu */}
        <UserMenu
          user={userDisplay}
          theme={theme === 'dark' ? 'dark' : 'light'}
        />
      </div>
    </header>
  );
};
