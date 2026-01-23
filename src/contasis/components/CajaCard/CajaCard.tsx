import React, { useState } from 'react';
import {
  Edit2,
  Trash2,
  Clock,
  MoreVertical,
  Banknote,
  CreditCard,
  TrendingDown,
  Users,
  Computer,
} from 'lucide-react';
import { Switch } from '../Switch';
import type { CajaCardProps } from './CajaCard.types';



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
            return React.cloneElement(child as React.ReactElement<{ onClick?: () => void }>, {
              onClick: () => setIsOpen(!isOpen),
            });
          }
          if (child.type === DropdownMenuContent && isOpen) {
            return (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                {React.cloneElement(child as React.ReactElement<{ onClose?: () => void }>, {
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
  <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
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
    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-100 flex items-center ${className}`}
  >
    {children}
  </button>
);

const DropdownMenuSeparator: React.FC = () => (
  <div className="my-1 h-px bg-slate-200" />
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
  const handleToggleEnabled = () => {
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
          ? 'bg-white border-slate-200'
          : 'opacity-60 bg-slate-50 border-slate-200'
      } ${className}`}
    >
      {/* Card Header */}
      <div className="pb-4 pt-5 px-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-lg ${
                caja.habilitadaCaja
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              <Computer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{caja.nombreCaja}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    caja.habilitadaCaja
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {caja.habilitadaCaja ? 'Habilitada' : 'Inhabilitada'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors">
              <Switch
                checked={caja.habilitadaCaja}
                onChange={handleToggleEnabled}
                size="md"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger>
                <button className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="pb-4 pt-4 px-6 space-y-4">
        {/* Métricas principales en grid 3 columnas */}
        <div className="flex items-center justify-between py-2 border-y border-slate-200">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Moneda</p>
              <p className="font-semibold text-slate-900">{currency?.code || caja.monedaIdCaja}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Límite Máximo</p>
              <p className="font-semibold text-slate-900">
                {currency?.symbol || 'S/'} {caja.limiteMaximoCaja.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Margen Desc.</p>
              <p className="font-semibold text-slate-900">{caja.margenDescuadreCaja}%</p>
            </div>
          </div>
        </div>

        {/* Usuarios autorizados - Más sutil */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Users className="w-3.5 h-3.5" />
          <span>
            {caja.usuariosAutorizadosCaja.length} usuario{caja.usuariosAutorizadosCaja.length !== 1 ? 's' : ''} autorizado{caja.usuariosAutorizadosCaja.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Medios de pago */}
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">MEDIOS DE PAGO</p>
          <div className="flex flex-wrap gap-2">
            {caja.mediosPagoPermitidos.map((medio) => (
              <span
                key={medio}
                className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-700 border border-slate-300 hover:bg-slate-100"
              >
                {medio}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-3 pb-4 px-6 border-t flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          <span>Actualizado: {formatDate(caja.actualizadoElCaja)}</span>
        </div>

        {onVerTurnos && (
          <button
            onClick={handleVerTurnos}
            className="text-blue-600 hover:text-blue-700 h-auto p-0 font-medium text-sm hover:underline"
          >
            Ver Turnos →
          </button>
        )}
      </div>
    </div>
  );
};
