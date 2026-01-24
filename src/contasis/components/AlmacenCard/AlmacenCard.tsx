import React, { useState } from 'react';
import { Switch } from '../Switch';

export interface Almacen {
  id: string;
  codigo: string;
  nombre: string;
  establecimientoId: string;
  establecimientoNombre?: string;
  establecimientoCodigo?: string;
  descripcion?: string;
  ubicacion?: string;
  esActivo: boolean;
  principal: boolean;
  tieneMovimientosInventario?: boolean;
  dataFocus?: string;
}

interface AlmacenCardProps {
  almacen: Almacen;
  onToggleActivo: (id: string) => void;
  onEditar: (almacen: Almacen) => void;
  onEliminar: (id: string) => void;
  dataFocus?: string;
}

const PackageIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const PencilIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const Trash2Icon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const MoreVerticalIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
  </svg>
);

const BuildingIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const MapPinIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

interface DropdownMenuProps {
  children: React.ReactNode;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative inline-block text-left">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          if (child.type === DropdownMenuTrigger) {
            return React.cloneElement(child as React.ReactElement<any>, { 
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }
            });
          }
          if (child.type === DropdownMenuContent && isOpen) {
            return (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                {React.cloneElement(child as React.ReactElement<any>, { 
                  onClose: () => setIsOpen(false) 
                })}
              </>
            );
          }
        }
        return null;
      })}
    </div>
  );
};

interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({ children, onClick }) => (
  <div onClick={onClick}>{children}</div>
);

interface DropdownMenuContentProps {
  children: React.ReactNode;
  onClose?: () => void;
}

const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({ children, onClose }) => (
  <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10">
    <div className="py-1" onClick={onClose}>
      {children}
    </div>
  </div>
);

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  onClose?: () => void;
}

const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({ children, onClick, className = '', onClose }) => (
  <button
    onClick={() => {
      onClick?.();
      onClose?.();
    }}
    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center dark:text-slate-200 ${className}`}
  >
    {children}
  </button>
);

const DropdownMenuSeparator: React.FC = () => (
  <div className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
);

export const AlmacenCard: React.FC<AlmacenCardProps> = ({ 
  almacen, 
  onToggleActivo, 
  onEditar, 
  onEliminar,
  dataFocus
}) => {
  return (
    <div 
      className={`transition-all duration-200 hover:shadow-lg rounded-lg border ${
        !almacen.esActivo 
          ? 'opacity-80 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' 
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      }`}
      data-focus={dataFocus}
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          {/* Icono - alineado al top */}
          <div className={`p-2.5 rounded-lg flex-shrink-0 ${
            almacen.esActivo 
              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' 
              : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
          }`}>
            <PackageIcon className="w-5 h-5" />
          </div>
          
          {/* Contenido principal */}
          <div className="flex-1 min-w-0">
            {/* Fila 1: Nombre + Código + Badge Principal (si aplica) + Badge de Estado */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 truncate">
                  {almacen.nombre}
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex-shrink-0">
                  {almacen.codigo}
                </span>
                {almacen.principal && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex-shrink-0">
                    Principal
                  </span>
                )}
                {almacen.tieneMovimientosInventario && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 flex-shrink-0">
                    <PackageIcon className="w-3 h-3 mr-1" />
                    Con movimientos
                  </span>
                )}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                  almacen.esActivo 
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {almacen.esActivo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
            
            {/* Fila 2: Establecimiento (siempre presente) */}
            <div className="space-y-1.5">
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-1 leading-relaxed flex items-center gap-2">
                <BuildingIcon className="w-4 h-4" />
                Establecimiento: 
                <span className="font-medium">
                  [{almacen.establecimientoCodigo || 'N/D'}] {almacen.establecimientoNombre || 'Sin nombre'}
                </span>
              </p>
              
              {/* Fila 3: Ubicación (opcional) */}
              {almacen.ubicacion && (
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4" />
                  {almacen.ubicacion}
                </p>
              )}
              
              {/* Fila 4: Descripción (opcional) */}
              {almacen.descripcion && (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  {almacen.descripcion}
                </p>
              )}
            </div>
          </div>

          {/* Controles - alineados al top */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center px-2 py-1 rounded-md transition-colors">
              <Switch 
                checked={almacen.esActivo}
                onChange={() => onToggleActivo(almacen.id)}
                label=""
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger>
                <button className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <MoreVerticalIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onEditar(almacen)}>
                  <PencilIcon className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onEliminar(almacen.id)}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2Icon className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlmacenCard;