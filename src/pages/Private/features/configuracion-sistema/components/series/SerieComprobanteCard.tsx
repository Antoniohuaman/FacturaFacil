import {
  FileText,
  Receipt,
  Hash,
  Circle,
  Pencil,
  Trash2
} from 'lucide-react';

export interface SerieComprobante {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'factura' | 'boleta';
  numeroActual: string;
  estadoUso: string;
  activo: boolean;
  esPorDefecto?: boolean;
}

interface SerieComprobanteCardProps {
  serie: SerieComprobante;
  onToggleActivo: (id: string) => void;
  onEditar: (id: string) => void;
  onEliminar: (id: string) => void;
}

const tipoConfig = {
  factura: {
    icon: FileText,
    color: 'blue',
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50'
  },
  boleta: {
    icon: Receipt,
    color: 'green',
    colorClass: 'text-green-600',
    bgClass: 'bg-green-50'
  }
};

export function SerieComprobanteCard({
  serie,
  onToggleActivo,
  onEditar,
  onEliminar
}: SerieComprobanteCardProps) {
  const config = tipoConfig[serie.tipo];
  const IconComponent = config.icon;

  return (
    <div
      className={`
        border rounded-lg p-4 transition-all
        ${serie.activo
          ? 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'
          : 'border-gray-100 bg-gray-50 dark:bg-gray-900 dark:border-gray-800'
        }
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
              {serie.tipo === 'factura' ? 'Factura' : 'Boleta'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Toggle Switch */}
          <button
            onClick={() => onToggleActivo(serie.id)}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-300 dark:bg-gray-600"
            style={{ backgroundColor: serie.activo ? '#10b981' : '#d1d5db' }}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                serie.activo ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>

          {/* Edit Button */}
          <button
            onClick={() => onEditar(serie.id)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Editar"
          >
            <Pencil className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>

          {/* Delete Button */}
          <button
            onClick={() => onEliminar(serie.id)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
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
            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
              <Hash className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Usage Status */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estado de Uso</p>
          <div className="flex items-center space-x-1">
            <Circle className={`w-2 h-2 fill-current ${
              serie.estadoUso === 'En uso' ? 'text-yellow-600' : 'text-gray-400'
            }`} />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {serie.estadoUso}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
