import { useState } from 'react';
import { Search } from '../Search';
import { CajaStatus } from '../CajaStatus';
import { CrearMenu } from '../CrearMenu';
import { UserMenu } from '../UserMenu';
import { EmpresaSelector } from '../EmpresaSelector';
import type { CajaData } from '../CajaStatus';
import type { DocumentoTipo } from '../CrearMenu';
import type { UserData } from '../UserMenu';
import type { Empresa, Sede } from '../EmpresaSelector';

export interface TopBarProps {
  onToggleSidebar: () => void;
  onToggleTheme?: () => void;
  theme?: 'light' | 'dark';
  showCaja?: boolean;
  empresas: Empresa[];
  sedes: Sede[];
  initialEmpresaId?: string;
  initialSedeId?: string;
  cajaData?: CajaData;
  user: UserData;
  onChangeEmpresa?: (empresaId: string) => void;
  onChangeSede?: (sedeId: string) => void;
  onCrearDocumento?: (tipo: DocumentoTipo) => void;
  onCrearCliente?: () => void;
  onCrearProducto?: () => void;
  onVerMovimientosCaja?: () => void;
  onCerrarCaja?: () => void;
}

export const TopBar = ({ 
  onToggleSidebar, 
  onToggleTheme, 
  theme = 'light', 
  showCaja = false,
  empresas,
  sedes,
  initialEmpresaId = '1',
  initialSedeId = '1',
  cajaData,
  user,
  onChangeEmpresa,
  onChangeSede,
  onCrearDocumento,
  onCrearCliente,
  onCrearProducto,
  onVerMovimientosCaja,
  onCerrarCaja
}: TopBarProps) => {
  const [empresaActualId, setEmpresaActualId] = useState(initialEmpresaId);
  const [sedeActualId, setSedeActualId] = useState(initialSedeId);
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

  const handleChangeEmpresa = (empresaId: string) => {
    setEmpresaActualId(empresaId);
    // Cambiar a la primera sede de la nueva empresa
    const primeraSedeEmpresa = sedes.find(s => s.empresaId === empresaId);
    if (primeraSedeEmpresa) {
      setSedeActualId(primeraSedeEmpresa.id);
    }
    onChangeEmpresa?.(empresaId);
  };

  const handleChangeSede = (sedeId: string) => {
    setSedeActualId(sedeId);
    onChangeSede?.(sedeId);
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
            src={theme === 'dark' ? '/images/Sensiyo-logo-b.svg' : '/images/Sensiyo-logo.svg'} 
            alt="Sensiyo" 
            className="h-8" 
          />
        </div>
      </div>

      {/* Center Section - Search */}
      <div className="flex items-center gap-3 flex-1 ml-14">
        <div className="w-full max-w-[496px]">
          <Search 
            placeholder="Buscar productos..." 
            value={(window as any).__puntoVentaSearchQuery || ''}
            onChange={(value) => {
              if ((window as any).__puntoVentaSetSearchQuery) {
                (window as any).__puntoVentaSetSearchQuery(value);
              }
            }}
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
        {showCaja && cajaData && (
          <>
            <CajaStatus
              data={cajaData}
              onVerMovimientos={handleVerMovimientos}
              onCerrarCaja={handleCerrarCaja}
            />
            <div className="w-8"></div>
          </>
        )}

        {/* Selector de Empresa */}
        <EmpresaSelector
          actual={{
            empresa: empresas.find(e => e.id === empresaActualId)!,
            sede: sedes.find(s => s.id === sedeActualId)!
          }}
          empresas={empresas}
          sedes={sedes}
          onChangeEmpresa={handleChangeEmpresa}
          onChangeSede={handleChangeSede}
        />

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
          user={user}
          theme={theme}
          onToggleTheme={onToggleTheme}
        />
      </div>
    </header>
  );
};
