import {
  Hash,
  Circle,
  Pencil,
  Trash2,
  FileCheck,
  Receipt,
  Clipboard,
  MessageSquare,
  NotebookPen
} from 'lucide-react';

// Tipos completos de voucher
type VoucherType = 'INVOICE' | 'RECEIPT' | 'SALE_NOTE' | 'QUOTE' | 'COLLECTION';

export interface SerieComprobante {
  id: string;
  codigo: string;
  nombre: string;
  tipo: VoucherType;
  numeroActual: string;
  estadoUso: string;
  activo: boolean;
  esPorDefecto?: boolean;
  tieneUso?: boolean;
}

interface SerieComprobanteCardProps {
  serie: SerieComprobante;
  onToggleActivo: (id: string) => void;
  onEditar: (id: string) => void;
  onEliminar: (id: string) => void;
  onAjustarCorrelativo: (id: string) => void;
  className?: string;
}

// Configuración completa de todos los tipos de voucher
const voucherTypeConfig = {
  INVOICE: {
    label: 'Factura Electrónica',
    icon: FileCheck,
    color: 'blue',
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50'
  },
  RECEIPT: {
    label: 'Boleta Electrónica',
    icon: Receipt,
    color: 'green',
    colorClass: 'text-green-600',
    bgClass: 'bg-green-50'
  },
  SALE_NOTE: {
    label: 'Nota de Venta',
    icon: Clipboard,
    color: 'orange',
    colorClass: 'text-orange-600',
    bgClass: 'bg-orange-50'
  },
  QUOTE: {
    label: 'Cotización',
    icon: MessageSquare,
    color: 'purple',
    colorClass: 'text-purple-600',
    bgClass: 'bg-purple-50'
  },
  COLLECTION: {
    label: 'Recibo de Cobranza',
    icon: NotebookPen,
    color: 'cyan',
    colorClass: 'text-cyan-600',
    bgClass: 'bg-cyan-50'
  }
};

export function SerieComprobanteCard({
  serie,
  onToggleActivo,
  onEditar,
  onEliminar,
  onAjustarCorrelativo,
  className = ''
}: SerieComprobanteCardProps) {
  const config = voucherTypeConfig[serie.tipo];
  const IconComponent = config.icon;

  return (
    <div
      data-focus={`configuracion:series:${serie.id}`}
      className={`
        border-2 rounded-lg p-4 transition-all hover:shadow-md
        ${serie.activo
          ? 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'
          : 'border-gray-100 bg-gray-50 dark:bg-gray-900 dark:border-gray-800'
        }
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* Icon Container */}
          <div className={`w-10 h-10 ${config.bgClass} dark:bg-gray-700 rounded-lg flex items-center justify-center`}>
            <IconComponent className={`w-5 h-5 ${config.colorClass} dark:${config.colorClass}`} />
          </div>

          {/* Serie Info */}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-900 dark:text-white text-lg">
                {serie.codigo}
              </span>
              {serie.esPorDefecto && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  Por defecto
                </span>
              )}
              {!serie.activo && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                  Inactiva
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {config.label}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1">
          {/* Toggle Switch - Mejorado con mejor UX */}
          <button
            onClick={() => onToggleActivo(serie.id)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              serie.activo
                ? `bg-${config.color}-600 focus:ring-${config.color}-500`
                : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-500'
            }`}
            title={serie.activo ? 'Desactivar' : 'Activar'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                serie.activo ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>

          {/* Edit Button */}
          <button
            onClick={() => onEditar(serie.id)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            title="Editar"
          >
            <Pencil className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" />
          </button>

          {/* Delete Button con validación */}
          <button
            onClick={() => onEliminar(serie.id)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Eliminar"
            disabled={serie.esPorDefecto || serie.tieneUso}
          >
            <Trash2 className={`w-4 h-4 ${
              serie.esPorDefecto || serie.tieneUso
                ? 'text-gray-400'
                : 'text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300'
            }`} />
          </button>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Current Number */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Número Actual</p>
          <div className="flex items-center space-x-2">
            <span className="font-mono font-semibold text-gray-900 dark:text-white">
              {serie.numeroActual.padStart(8, '0')}
            </span>
            <button
              onClick={() => onAjustarCorrelativo(serie.id)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              title="Ajustar correlativo"
            >
              <Hash className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" />
            </button>
          </div>
        </div>

        {/* Usage Status */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estado de Uso</p>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              serie.estadoUso === 'En uso'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}>
              <Circle className={`w-1.5 h-1.5 mr-1 fill-current ${
                serie.estadoUso === 'En uso' ? 'text-yellow-600' : 'text-gray-400'
              }`} />
              {serie.estadoUso}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
