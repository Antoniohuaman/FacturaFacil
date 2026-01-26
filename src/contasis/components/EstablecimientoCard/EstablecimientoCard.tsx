import React, { useState } from 'react';
import { Building2, Edit3, Trash2, MoreVertical } from 'lucide-react';
import { Switch } from '../Switch';
import type { EstablecimientoCardProps } from './EstablecimientoCard.types';
 
// Componente Dropdown Menu
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
            return React.cloneElement(child as React.ReactElement<{ onClick?: () => void }>, {
              onClick: () => setIsOpen(!isOpen)
            });
          }
          if (child.type === DropdownMenuContent && isOpen) {
            return (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                {React.cloneElement(child as React.ReactElement<{ onClose?: () => void }>, {
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
  onClick?: () => void;
}
 
const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({ children, onClick }) => (
  <div onClick={onClick}>{children}</div>
);
 
interface DropdownMenuContentProps {
  children: React.ReactNode;
  onClose?: () => void;
}
 
const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({ children, onClose }) => (
  <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-gray-700">
    <div className="py-1">
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === DropdownMenuItem) {
          return React.cloneElement(child as React.ReactElement<{ onClose?: () => void }>, { onClose });
        }
        return child;
      })}
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
    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-gray-700 flex items-center ${className}`}
  >
    {children}
  </button>
);
 
const DropdownMenuSeparator: React.FC = () => (
  <div className="my-1 h-px bg-slate-200 dark:bg-gray-700" />
);
 
// Componente principal EstablecimientoCard
export const EstablecimientoCard: React.FC<EstablecimientoCardProps> = ({
  establecimiento,
  onToggleActivo,
  onEditar,
  onEliminar,
  dataFocus
}) => {
  return (
    <div
      className={`transition-all duration-200 hover:shadow-lg rounded-lg border ${
        !establecimiento.activo ? 'opacity-80 bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700' : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700'
      }`}
      data-focus={dataFocus}
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          {/* Icono - alineado al top */}
          <div className={`p-2.5 rounded-lg flex-shrink-0 ${
            establecimiento.activo
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'bg-slate-200 dark:bg-gray-700 text-slate-500 dark:text-gray-400'
          }`}>
            <Building2 className="w-5 h-5" />
          </div>
         
          {/* Contenido principal */}
          <div className="flex-1 min-w-0">
            {/* Fila 1: Nombre + Código + Badge de Estado */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white truncate">
                  {establecimiento.nombre}
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex-shrink-0">
                  {establecimiento.codigo}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                  establecimiento.activo
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-200 dark:bg-gray-700 text-slate-600 dark:text-gray-300'
                }`}>
                  {establecimiento.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
           
            {/* Fila 2: Dirección completa */}
            <p className="text-sm text-slate-700 dark:text-gray-300 mb-1 leading-relaxed">
              {establecimiento.direccion}
            </p>
           
            {/* Fila 3: Ubicación geográfica */}
            <p className="text-xs text-slate-500 dark:text-gray-400">
              {establecimiento.distrito}, {establecimiento.provincia}
              {establecimiento.departamento && ` • ${establecimiento.departamento}`}
            </p>
          </div>
 
          {/* Controles - alineados al top */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
              <Switch
                checked={establecimiento.activo}
                onChange={() => {
                  console.log('Switch clicked for establecimiento:', establecimiento.id);
                  onToggleActivo(establecimiento.id);
                }}
                size="md"
              />
            </div>
           
            <DropdownMenu>
              <DropdownMenuTrigger>
                <button
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => console.log('Dropdown trigger clicked for establecimiento:', establecimiento.id)}
                >
                  <MoreVertical className="h-4 w-4 text-slate-600 dark:text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => {
                  console.log('Edit dropdown clicked for establecimiento:', establecimiento.id);
                  onEditar(establecimiento.id);
                }}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    console.log('Delete dropdown clicked for establecimiento:', establecimiento.id);
                    onEliminar(establecimiento.id);
                  }}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
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