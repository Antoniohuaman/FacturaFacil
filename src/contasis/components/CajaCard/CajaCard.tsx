import React, { useState } from 'react';
import { Edit2, Trash2, Clock, MoreVertical } from 'lucide-react';
import type { CajaCardProps } from './CajaCard.types';

// Componentes auxiliares - Switch
interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const Switch: React.FC<SwitchProps> = ({ checked, onCheckedChange }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
      checked ? 'bg-emerald-500' : 'bg-slate-200'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

// Componentes auxiliares - Dropdown Menu
interface DropdownMenuProps {
  children: React.ReactNode;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === DropdownMenuTrigger) {
            return React.cloneElement(child as React.ReactElement<any>, {
              onClick: () => setIsOpen(!isOpen),
            });
          }
          if (child.type === DropdownMenuContent && isOpen) {
            return (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                {React.cloneElement(child as React.ReactElement<any>, {
                  onClose: () => setIsOpen(false),
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
  <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-700 shadow-lg ring-1 ring-black ring-opacity-5">
    <div className="py-1" onClick={onClose}>
      {children}
    </div>
  </div>
);

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({ children, onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-gray-600 flex items-center ${className}`}
  >
    {children}
  </button>
);

const DropdownMenuSeparator: React.FC = () => (
  <div className="my-1 h-px bg-slate-200 dark:bg-gray-600" />
);

/**
 * CajaCard - Componente reutilizable para mostrar información de una caja
 * Diseño limpio y moderno con soporte para dark mode
 */
export const CajaCard: React.FC<CajaCardProps> = ({
  caja,
  currency,
  onEdit,
  onToggleEnabled,
  onDelete,
  onVerTurnos,
  className = '',
}) => {
  const handleToggleEnabled = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleEnabled(caja.id);
  };

  const handleEdit = () => {
    onEdit(caja.id);
  };

  const handleDelete = () => {
    onDelete(caja.id);
  };

  const handleVerTurnos = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onVerTurnos) {
      onVerTurnos(caja.id);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div
      className={`transition-all duration-200 hover:shadow-lg rounded-lg border ${
        caja.habilitadaCaja
          ? 'bg-white dark:bg-gray-800 border-emerald-200 dark:border-emerald-800'
          : 'opacity-60 bg-slate-50 dark:bg-gray-800/50 border-slate-200 dark:border-gray-700'
      } ${className}`}
    >
      {/* Card Header */}
      <div className="pb-4 pt-5 px-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div
              className={`p-2.5 rounded-lg ${
                caja.habilitadaCaja
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-200 dark:bg-gray-700 text-slate-500 dark:text-gray-400'
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                {caja.nombreCaja}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    caja.habilitadaCaja
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-200 dark:bg-gray-700 text-slate-600 dark:text-gray-400'
                  }`}
                >
                  {caja.habilitadaCaja ? 'Habilitada' : 'Inhabilitada'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
              <Switch
                checked={caja.habilitadaCaja}
                onCheckedChange={() => handleToggleEnabled(new MouseEvent('click') as any)}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger>
                <button className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
                  <MoreVertical className="h-4 w-4 text-slate-600 dark:text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-red-600 dark:text-red-400">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="pb-4 pt-1 px-6 space-y-4">
        <div className="flex items-center justify-between py-2 border-y border-slate-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div>
              <p className="text-xs text-slate-500 dark:text-gray-400">Moneda</p>
              <p className="font-semibold text-slate-900 dark:text-gray-100">
                {currency?.code || caja.monedaIdCaja}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <div>
              <p className="text-xs text-slate-500 dark:text-gray-400">Límite Máximo</p>
              <p className="font-semibold text-slate-900 dark:text-gray-100">
                {currency?.symbol || 'S/'} {caja.limiteMaximoCaja.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
            <div>
              <p className="text-xs text-slate-500 dark:text-gray-400">Margen Desc.</p>
              <p className="font-semibold text-slate-900 dark:text-gray-100">
                {caja.margenDescuadreCaja}%
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
            Medios de Pago
          </p>
          <div className="flex flex-wrap gap-2">
            {caja.mediosPagoPermitidos.length > 0 ? (
              caja.mediosPagoPermitidos.map((medio) => (
                <span
                  key={medio}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-50 dark:bg-gray-700 text-slate-700 dark:text-gray-300 border border-slate-300 dark:border-gray-600 hover:bg-slate-100 dark:hover:bg-gray-600"
                >
                  {medio}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-400 dark:text-gray-500 italic">
                Sin medios de pago
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-3 pb-4 px-6 border-t border-slate-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          <span>Actualizado: {formatDate(caja.actualizadoElCaja)}</span>
        </div>

        {caja.usuariosAutorizadosCaja.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-gray-400">
            {caja.usuariosAutorizadosCaja.length} usuario(s) autorizado(s)
          </span>
        )}
      </div>

      {caja.observacionesCaja && (
        <div className="px-6 py-3 border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50">
          <p className="text-sm text-slate-600 dark:text-gray-400 italic">
            {caja.observacionesCaja}
          </p>
        </div>
      )}

      {onVerTurnos && (
        <div className="px-6 py-3 border-t border-slate-200 dark:border-gray-700">
          <button
            onClick={handleVerTurnos}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Clock className="w-4 h-4" />
            Ver Turnos →
          </button>
        </div>
      )}
    </div>
  );
};
