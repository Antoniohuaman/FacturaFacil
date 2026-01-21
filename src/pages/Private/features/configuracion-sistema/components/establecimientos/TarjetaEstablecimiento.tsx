/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
// src/features/configuration/components/establecimientos/EstablecimientoCard.tsx
import { useState } from 'react';
import { 
  MapPin, 
  Edit3, 
  Trash2, 
  MoreVertical, 
  Calendar,
  ToggleLeft,
  ToggleRight,
  Copy,
  Building2
} from 'lucide-react';
import type { Establecimiento } from '../../modelos/Establecimiento';
import { IndicadorEstado } from '../comunes/IndicadorEstado';

interface EstablecimientoCardProps {
  Establecimiento: Establecimiento;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export function EstablecimientoCard({ 
  Establecimiento, 
  onEdit, 
  onDelete, 
  onToggleStatus,
  showActions = true,
  compact = false
}: EstablecimientoCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(Establecimiento.codigoEstablecimiento);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = Establecimiento.codigoEstablecimiento;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const truncateAddress = (address: string, maxLength: number = 50) => {
    if (address.length <= maxLength) return address;
    return address.substring(0, maxLength) + '...';
  };

  return (
    <div className={`
      bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200
      ${!Establecimiento.estaActivoEstablecimiento ? 'opacity-75 bg-gray-50' : 'hover:border-gray-300'}
      ${compact ? 'p-4' : 'p-6'}
    `}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className={`
            flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
            ${Establecimiento.estaActivoEstablecimiento 
              ? 'bg-blue-50 text-blue-600' 
              : 'bg-gray-100 text-gray-400'
            }
          `}>
            <Building2 className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {Establecimiento.nombreEstablecimiento}
              </h3>
              <IndicadorEstado
                status={Establecimiento.estaActivoEstablecimiento ? 'success' : 'error'}
                label={Establecimiento.estaActivoEstablecimiento ? 'Activo' : 'Inactivo'}
                size="xs"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyCode}
                className="flex items-center space-x-1 text-sm font-mono text-gray-600 hover:text-blue-600 transition-colors group"
                title="Copiar código"
              >
                <span>{Establecimiento.codigoEstablecimiento}</span>
                {copied ? (
                  <span className="text-green-600 text-xs">✓</span>
                ) : (
                  <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            </div>
          </div>
        </div>

        {showActions && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                />
                
                {/* Menu */}
                <div className="absolute right-0 top-10 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  <button
                    onClick={() => {
                      onEdit();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Editar</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      onToggleStatus();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    {Establecimiento.estaActivoEstablecimiento ? (
                      <>
                        <ToggleLeft className="w-4 h-4" />
                        <span>Inhabilitar</span>
                      </>
                    ) : (
                      <>
                        <ToggleRight className="w-4 h-4" />
                        <span>Habilitar</span>
                      </>
                    )}
                  </button>
                  
                  <div className="border-t border-gray-100 my-1"></div>
                  
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Address */}
      <div className="mb-4">
        <div className="flex items-start space-x-2">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-600 leading-relaxed">
              {compact ? truncateAddress(Establecimiento.direccionEstablecimiento) : Establecimiento.direccionEstablecimiento}
            </p>
            {Establecimiento.codigoPostalEstablecimiento && (
              <p className="text-xs text-gray-500 mt-1 font-mono">
                Código Postal: {Establecimiento.codigoPostalEstablecimiento}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-1">
          <Calendar className="w-3 h-3" />
          <span>Creado {formatDate(Establecimiento.creadoElEstablecimiento)}</span>
        </div>
        
        {Establecimiento.actualizadoElEstablecimiento && Establecimiento.actualizadoElEstablecimiento !== Establecimiento.creadoElEstablecimiento && (
          <div className="flex items-center space-x-1">
            <Edit3 className="w-3 h-3" />
            <span>Editado {formatDate(Establecimiento.actualizadoElEstablecimiento)}</span>
          </div>
        )}
      </div>

      {/* Quick Actions (visible on hover) */}
      {showActions && !showMenu && (
        <div className="absolute inset-x-4 bottom-4 flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-sm rounded-lg py-2">
          <button
            onClick={onEdit}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
          >
            <Edit3 className="w-3 h-3" />
            <span>Editar</span>
          </button>
          
          <button
            onClick={onToggleStatus}
            className={`flex items-center space-x-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
              Establecimiento.estaActivoEstablecimiento
                ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            {Establecimiento.estaActivoEstablecimiento ? (
              <>
                <ToggleLeft className="w-3 h-3" />
                <span>Inhabilitar</span>
              </>
            ) : (
              <>
                <ToggleRight className="w-3 h-3" />
                <span>Habilitar</span>
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Loading Overlay */}
    </div>
  );
}