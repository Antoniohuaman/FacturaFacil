// SesionesCajaPage - Historial de sesiones de caja
import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, User, CheckCircle, XCircle, Eye, Calendar } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';

// Placeholder types - replace with actual types when implementing
interface SesionCaja {
  id: string;
  cajaId: string;
  cajaNombre: string;
  fechaApertura: Date;
  fechaCierre?: Date;
  usuarioApertura: string;
  usuarioCierre?: string;
  estado: 'abierta' | 'cerrada';
  montoInicial: number;
  montoFinal?: number;
}

export function SesionesCajaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get filters from query string
  const cajaIdFilter = searchParams.get('cajaId');
  const establecimientoIdFilter = searchParams.get('establecimientoId');

  // Placeholder state - replace with actual data loading
  const [sesiones] = useState<SesionCaja[]>([]);
  const [loading] = useState(false);

  // Filter sessions
  const filteredSesiones = useMemo(() => {
    let result = sesiones;

    if (cajaIdFilter) {
      result = result.filter(s => s.cajaId === cajaIdFilter);
    }

    return result;
  }, [sesiones, cajaIdFilter]);

  const handleViewDetails = (sesionId: string) => {
    // TODO: Navigate to session details
    console.log('View session:', sesionId);
  };

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <PageHeader 
        title="Historial de Sesiones"
        icon={<Clock className="w-6 h-6 text-white" />}
      />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/caja')}
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Control de Caja
        </button>

        {/* Filters info */}
        {cajaIdFilter && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">
                Filtrando por caja específica
              </span>
            </div>
            {establecimientoIdFilter && (
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Establecimiento: {establecimientoIdFilter}
              </p>
            )}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredSesiones.length === 0 ? (
          /* En desarrollo card */
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Historial en Desarrollo
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              La funcionalidad de historial de sesiones está en desarrollo.
              Próximamente podrás ver todas las aperturas y cierres de caja con detalles completos.
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-500 space-y-1">
              <p>✓ Filtros por caja y fecha</p>
              <p>✓ Detalle de movimientos por sesión</p>
              <p>✓ Reportes y exportación</p>
              <p>✓ Auditoría de operaciones</p>
            </div>
          </div>
        ) : (
          /* Table with sessions */
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fecha Apertura
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Caja
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Monto Inicial
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Monto Final
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSesiones.map((sesion) => (
                    <tr key={sesion.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {new Date(sesion.fechaApertura).toLocaleString('es-PE')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {sesion.cajaNombre}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {sesion.usuarioApertura}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sesion.estado === 'abierta' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            Abierta
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            <XCircle className="w-3 h-3" />
                            Cerrada
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          S/ {sesion.montoInicial.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {sesion.montoFinal !== undefined 
                            ? `S/ ${sesion.montoFinal.toFixed(2)}` 
                            : '-'
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleViewDetails(sesion.id)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          Ver detalles
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
