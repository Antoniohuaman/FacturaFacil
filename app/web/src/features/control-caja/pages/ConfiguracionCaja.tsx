import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings2, AlertCircle, ExternalLink, Banknote, Clock } from 'lucide-react';
import { useCajas } from '../../configuracion-sistema/hooks/useCajas';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import { useUserSession } from '../../../contexts/UserSessionContext';

/**
 * ConfiguracionCaja - Read-only summary page for active establishment's cajas
 * Users must navigate to /configuracion/cajas to create/edit cajas
 */
const ConfiguracionCaja: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useConfigurationContext();
  const { session } = useUserSession();

  const empresaId = session?.currentCompanyId || '';
  const establecimientoId = session?.currentEstablishmentId || '';
  const establecimientoActual = session?.currentEstablishment;

  const { cajas, loading } = useCajas(empresaId, establecimientoId);

  // Get enabled cajas for current establishment
  const cajasHabilitadas = useMemo(() => {
    return cajas.filter(c => c.habilitada);
  }, [cajas]);

  const handleGoToConfiguration = () => {
    navigate('/configuracion/cajas');
  };

  const handleViewSessions = () => {
    navigate(`/caja/sesiones?establecimientoId=${establecimientoId}`);
  };

  if (!establecimientoId) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              Establecimiento no seleccionado
            </h3>
            <p className="text-yellow-800">
              Para ver la configuración de cajas, primero debe seleccionar un establecimiento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Configuración de Cajas</h2>
              <p className="text-sm text-gray-600 mt-1">
                Establecimiento: <span className="font-medium">{establecimientoActual?.name || 'N/A'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleViewSessions}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              <Clock className="w-4 h-4" />
              Ver Sesiones
            </button>
            <button
              onClick={handleGoToConfiguration}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Editar en Configuración
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900">Solo lectura</h4>
            <p className="text-sm text-blue-700 mt-1">
              Este es un resumen de las cajas configuradas para este establecimiento. 
              Para crear, editar o eliminar cajas, utiliza el módulo de Configuración del Sistema.
            </p>
          </div>
        </div>

        {/* Empty State */}
        {cajas.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <Banknote className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No hay cajas configuradas
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Este establecimiento no tiene cajas configuradas. Crea al menos una caja para comenzar a operar.
            </p>
            <button
              onClick={handleGoToConfiguration}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ir a Configuración
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Cajas Summary */}
        {cajas.length > 0 && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Total de Cajas</div>
                <div className="text-2xl font-bold text-gray-900">{cajas.length}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-sm text-green-600 mb-1">Cajas Habilitadas</div>
                <div className="text-2xl font-bold text-green-900">{cajasHabilitadas.length}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Cajas Inhabilitadas</div>
                <div className="text-2xl font-bold text-gray-900">{cajas.length - cajasHabilitadas.length}</div>
              </div>
            </div>

            {/* Cajas List */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Cajas Registradas</h3>
              {cajas.map((caja) => {
                const currency = state.currencies.find(c => c.id === caja.monedaId);
                return (
                  <div
                    key={caja.id}
                    className={`
                      border rounded-lg p-4
                      ${caja.habilitada 
                        ? 'bg-white border-green-200' 
                        : 'bg-gray-50 border-gray-200'}
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">{caja.nombre}</h4>
                          <span className={`
                            px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${caja.habilitada 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-200 text-gray-700'}
                          `}>
                            {caja.habilitada ? 'Habilitada' : 'Inhabilitada'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Moneda:</span> {currency?.code || caja.monedaId}
                          </div>
                          <div>
                            <span className="font-medium">Límite Máximo:</span> {currency?.symbol || 'S/'} {caja.limiteMaximo.toFixed(2)}
                          </div>
                          <div>
                            <span className="font-medium">Margen de Descuadre:</span> {caja.margenDescuadre}%
                          </div>
                          <div>
                            <span className="font-medium">Medios de Pago:</span> {caja.mediosPagoPermitidos.length}
                          </div>
                        </div>
                        {caja.mediosPagoPermitidos.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {caja.mediosPagoPermitidos.map((medio) => (
                              <span
                                key={medio}
                                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                              >
                                {medio}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action button */}
            <div className="pt-6 border-t border-gray-200">
              <button
                onClick={handleGoToConfiguration}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                Administrar Cajas
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfiguracionCaja;
