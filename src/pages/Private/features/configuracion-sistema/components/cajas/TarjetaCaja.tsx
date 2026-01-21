// Componente TarjetaCaja - muestra una caja con acciones
import { Edit2, Power, PowerOff, Trash2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Caja } from '../../modelos/Caja';
import type { Currency } from '../../modelos/Currency';

interface CajaCardProps {
  caja: Caja;
  currency?: Currency;
  onEdit: (id: string) => void;
  onToggleEnabled: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TarjetaCaja({ caja, currency, onEdit, onToggleEnabled, onDelete }: CajaCardProps) {
  const handleToggleEnabled = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleEnabled(caja.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(caja.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(caja.id);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className={`
      bg-white dark:bg-gray-800 rounded-lg border 
      ${caja.habilitadaCaja ? 'border-green-200 dark:border-green-800' : 'border-gray-200 dark:border-gray-700'}
      p-6 hover:shadow-md transition-shadow duration-200
    `}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {caja.nombreCaja}
            </h3>
            <span className={`
              px-2.5 py-0.5 rounded-full text-xs font-medium
              ${caja.habilitadaCaja 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}
            `}>
              {caja.habilitadaCaja ? 'Habilitada' : 'Inhabilitada'}
            </span>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="font-medium">Moneda:</span>
              <span>{currency?.code || caja.monedaIdCaja}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium">Límite Máximo:</span>
              <span>{currency?.symbol || 'S/'} {caja.limiteMaximoCaja.toFixed(2)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium">Margen de Descuadre:</span>
              <span>{caja.margenDescuadreCaja}%</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleToggleEnabled}
            className={`
              p-2 rounded-lg transition-colors
              ${caja.habilitadaCaja
                ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30'
                : 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30'}
            `}
            title={caja.habilitadaCaja ? 'Inhabilitar' : 'Habilitar'}
          >
            {caja.habilitadaCaja ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
          </button>

          <button
            onClick={handleDelete}
            className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors group relative"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
            
            {/* Mensaje de ayuda */}
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg p-3 shadow-lg z-10">
              <div className="font-semibold mb-1">Condiciones para eliminar:</div>
              <ul className="list-disc list-inside space-y-1">
                <li>Caja inhabilitada</li>
                <li>Sin historial de operaciones</li>
                <li>Sin sesión abierta</li>
              </ul>
              {/* Flecha */}
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
            </div>
          </button>
        </div>
      </div>

      {/* Medios de pago */}
      <div className="mb-4">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
          Medios de Pago
        </span>
        <div className="flex flex-wrap gap-1.5">
          {caja.mediosPagoPermitidos.length > 0 ? (
            caja.mediosPagoPermitidos.map((medio) => (
              <span
                key={medio}
                className="px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded text-xs font-medium"
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

      {/* Información del pie */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            Actualizado: {formatDate(caja.actualizadoElCaja)}
          </span>
          {caja.usuariosAutorizadosCaja.length > 0 && (
            <span>
              {caja.usuariosAutorizadosCaja.length} usuario(s) autorizado(s)
            </span>
          )}
        </div>
      </div>

      {caja.observacionesCaja && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 italic">
            {caja.observacionesCaja}
          </p>
        </div>
      )}

      {/* Enlace a Ver Turnos */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <Link
          to={`/caja/sesiones?cajaId=${caja.id}&establecimientoId=${caja.establecimientoIdCaja}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          <Clock className="w-4 h-4" />
          Ver Turnos
        </Link>
      </div>
    </div>
  );
}
