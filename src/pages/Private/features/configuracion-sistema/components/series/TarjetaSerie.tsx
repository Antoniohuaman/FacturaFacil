/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
// src/features/configuration/components/series/SeriesCard.tsx
import { useState } from 'react';
import { 
  FileText, Receipt, Clipboard, MessageSquare, 
  Edit3, Trash2, Hash, MoreVertical, 
  ToggleLeft, ToggleRight, Calendar, CheckCircle,
  AlertTriangle, Play, NotebookPen
} from 'lucide-react';
import type { Series } from '../../modelos/Series';
import type { Establishment } from '../../modelos/Establishment';
import { StatusIndicator } from '../comunes/IndicadorEstado';
import { DefaultSelector } from '../comunes/SelectorPredeterminado';

interface SeriesCardProps {
  series: Series;
  establishment: Establishment;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onSetDefault: () => void;
  onAdjustCorrelative: () => void;
  showActions?: boolean;
  compact?: boolean;
}

const voucherTypeConfig = {
  INVOICE: {
    label: 'Factura Electrónica',
    icon: FileText,
    color: 'blue',
    prefix: 'F',
    description: 'Para ventas a empresas con RUC'
  },
  RECEIPT: {
    label: 'Boleta Electrónica',
    icon: Receipt,
    color: 'green',
    prefix: 'B',
    description: 'Para ventas a consumidores finales'
  },
  CREDIT_NOTE: {
    label: 'Nota de Crédito',
    icon: FileText,
    color: 'red',
    prefix: 'NC',
    description: 'Para anular o corregir facturas'
  },
  DEBIT_NOTE: {
    label: 'Nota de Débito',
    icon: FileText,
    color: 'orange',
    prefix: 'ND',
    description: 'Para aumentar el valor de facturas'
  },
  GUIDE: {
    label: 'Guía de Remisión',
    icon: Clipboard,
    color: 'purple',
    prefix: 'GR',
    description: 'Para transporte de mercancías'
  },
  QUOTATION: {
    label: 'Cotización',
    icon: MessageSquare,
    color: 'purple',
    prefix: 'COT',
    description: 'Propuesta comercial para clientes'
  },
  SALES_NOTE: {
    label: 'Nota de Venta',
    icon: Clipboard,
    color: 'orange',
    prefix: 'NV',
    description: 'Documento interno, sin validez tributaria'
  },
  COLLECTION: {
    label: 'Recibo de Cobranza',
    icon: NotebookPen,
    color: 'cyan',
    prefix: 'C',
    description: 'Pagos registrados en caja'
  },
  OTHER: {
    label: 'Otro Documento',
    icon: MessageSquare,
    color: 'gray',
    prefix: '',
    description: 'Otro tipo de documento'
  }
};

export function SeriesCard({
  series,
  establishment: _establishment, // Disponible para funcionalidad futura
  onEdit,
  onDelete, 
  onToggleStatus,
  onSetDefault,
  onAdjustCorrelative,
  showActions = true,
  compact = false
}: SeriesCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Special handling for 'OTHER' category to determine the correct display config
  let config;
  if (series.documentType.category === 'OTHER') {
    if (series.documentType.code === 'NV' || series.documentType.name.includes('Nota de Venta')) {
      config = {
        label: 'Nota de Venta',
        icon: Clipboard,
        color: 'orange',
        prefix: 'NV',
        description: 'Documento interno, sin validez tributaria'
      };
    } else if (series.documentType.code === 'COT' || series.documentType.name.includes('Cotización')) {
      config = {
        label: 'Cotización',
        icon: MessageSquare,
        color: 'purple',
        prefix: 'COT',
        description: 'Propuesta comercial para clientes'
      };
    } else {
      config = voucherTypeConfig[series.documentType.category];
    }
  } else {
    config = voucherTypeConfig[series.documentType.category];
  }

  config = config || {
    label: 'Documento Desconocido',
    icon: FileText,
    color: 'gray',
    prefix: '?',
    description: 'Tipo de documento no reconocido'
  };
  
  const Icon = config.icon;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getNextNumbers = () => {
    const current = series.correlativeNumber;
    return Array.from({ length: 3 }, (_, i) => 
      (current + i).toString().padStart(8, '0')
    );
  };

  const getUsageStatus = () => {
    if (series.statistics.documentsIssued > 0) {
      return {
        status: 'warning' as const,
        label: 'En uso',
        description: 'Ya se han emitido documentos con esta serie'
      };
    }
    return {
      status: 'pending' as const,
      label: 'Sin uso',
      description: 'No se han emitido documentos aún'
    };
  };

  const usage = getUsageStatus();

  return (
    <div className={`
      bg-white border-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200
      ${series.isActive 
        ? `border-${config.color}-200 hover:border-${config.color}-300` 
        : 'border-gray-200 opacity-75'
      }
      ${series.isDefault ? 'ring-2 ring-green-200' : ''}
      ${compact ? 'p-4' : 'p-6'}
    `}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1">
          <div className={`
            w-12 h-12 rounded-lg flex items-center justify-center
            ${series.isActive 
              ? `bg-${config.color}-50 border-2 border-${config.color}-200` 
              : 'bg-gray-50 border-2 border-gray-200'
            }
          `}>
            <Icon className={`w-6 h-6 ${
              series.isActive ? `text-${config.color}-600` : 'text-gray-400'
            }`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-xl font-bold text-gray-900 font-mono">
                {series.series}
              </h3>
              {series.isDefault && (
                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Por defecto
                </span>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-1">
              {config.label}
            </p>
            
            <div className="flex items-center space-x-2">
              <StatusIndicator
                status={series.isActive ? 'success' : 'error'}
                label={series.isActive ? 'Activa' : 'Inactiva'}
                size="xs"
              />
              <StatusIndicator
                status={usage.status}
                label={usage.label}
                size="xs"
              />
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
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                />
                
                <div className="absolute right-0 top-10 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  <button
                    onClick={() => {
                      onEdit();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Editar Serie</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      onAdjustCorrelative();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Hash className="w-4 h-4" />
                    <span>Ajustar Correlativo</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      onToggleStatus();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    {series.isActive ? (
                      <>
                        <ToggleLeft className="w-4 h-4" />
                        <span>Desactivar</span>
                      </>
                    ) : (
                      <>
                        <ToggleRight className="w-4 h-4" />
                        <span>Activar</span>
                      </>
                    )}
                  </button>
                  
                  {!series.isDefault && series.isActive && (
                    <button
                      onClick={() => {
                        onSetDefault();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Establecer por Defecto</span>
                    </button>
                  )}
                  
                  <div className="border-t border-gray-100 my-1"></div>
                  
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    disabled={series.isDefault || series.statistics.documentsIssued > 0}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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

      {/* Current Number Display */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">Correlativo Actual</h4>
          <button
            onClick={onAdjustCorrelative}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Ajustar correlativo"
          >
            <Hash className="w-4 h-4" />
          </button>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="text-center">
            <div className="text-2xl font-bold font-mono text-gray-900 mb-1">
              {series.correlativeNumber.toString().padStart(8, '0')}
            </div>
            <p className="text-xs text-gray-500">Próximo número a usar</p>
          </div>
        </div>
      </div>

      {/* Next Numbers Preview */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Próximos Números</h4>
        <div className="flex space-x-2">
          {getNextNumbers().map((number, index) => (
            <div
              key={index}
              className={`flex-1 text-center py-2 px-2 rounded text-xs font-mono ${
                index === 0 
                  ? 'bg-blue-50 text-blue-900 border border-blue-200' 
                  : 'bg-gray-50 text-gray-600'
              }`}
            >
              {series.series}-{number}
            </div>
          ))}
        </div>
      </div>

      {/* Series Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Tipo de Operación</p>
          <p className="text-sm font-medium text-gray-900">
            {config.label}
          </p>
        </div>
        
        <div>
          <p className="text-xs text-gray-500 mb-1">Número Inicial</p>
          <p className="text-sm font-medium text-gray-900 font-mono">
            {series.configuration.startNumber.toString().padStart(8, '0')}
          </p>
        </div>
      </div>

      {/* Usage Information */}
      <div className={`p-3 rounded-lg border ${
        series.statistics.documentsIssued > 0 
          ? 'bg-amber-50 border-amber-200' 
          : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center space-x-2">
          {series.statistics.documentsIssued > 0 ? (
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          ) : (
            <Play className="w-4 h-4 text-green-600" />
          )}
          <p className={`text-sm font-medium ${
            series.statistics.documentsIssued > 0 ? 'text-amber-900' : 'text-green-900'
          }`}>
            Estado de Uso
          </p>
        </div>
        <p className={`text-xs mt-1 ${
          series.statistics.documentsIssued > 0 ? 'text-amber-700' : 'text-green-700'
        }`}>
          {series.statistics.documentsIssued > 0 ? 'Serie en uso' : 'Serie sin usar'}
        </p>
      </div>

      {/* Actions Section */}
      {showActions && !showMenu && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            {/* Default Selector */}
            {series.isActive && (
              <DefaultSelector
                isDefault={series.isDefault}
                onSetDefault={onSetDefault}
                label="Por defecto"
                size="sm"
              />
            )}

            {/* Quick Actions */}
            <div className="flex items-center space-x-2 ml-auto">
              <button
                onClick={onEdit}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Editar serie"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              
              <button
                onClick={onToggleStatus}
                className={`p-2 rounded-lg transition-colors ${
                  series.isActive
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-green-600 hover:bg-green-50'
                }`}
                title={series.isActive ? 'Desactivar serie' : 'Activar serie'}
              >
                {series.isActive ? (
                  <ToggleLeft className="w-4 h-4" />
                ) : (
                  <ToggleRight className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100 mt-4">
        <div className="flex items-center space-x-1">
          <Calendar className="w-3 h-3" />
          <span>Creada {formatDate(series.createdAt)}</span>
        </div>
        
        {series.updatedAt && series.updatedAt !== series.createdAt && (
          <div className="flex items-center space-x-1">
            <Edit3 className="w-3 h-3" />
            <span>Editada {formatDate(series.updatedAt)}</span>
          </div>
        )}
      </div>

      {/* Validation Warnings */}
      {(!series.isActive || (config.prefix && !series.series.startsWith(config.prefix))) && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              {!series.isActive && (
                <p className="text-red-800">Serie desactivada - No se pueden emitir documentos</p>
              )}
              {config.prefix && !series.series.startsWith(config.prefix) && (
                <p className="text-red-800">
                  Prefijo incorrecto - Debería comenzar con "{config.prefix}"
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hover Effects */}
    </div>
  );
}