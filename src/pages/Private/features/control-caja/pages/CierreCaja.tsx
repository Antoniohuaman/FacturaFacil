/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
import React, { useState } from 'react';
import { useCaja } from '../context/CajaContext';
import { Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { calcularDescuadre, hasDescuadre } from '../utils';

const CierreCaja: React.FC = () => {
  const [montoCierre, setMontoCierre] = useState('');
  const [montoEfectivo, setMontoEfectivo] = useState('');
  const [montoTarjeta, setMontoTarjeta] = useState('');
  const [montoYape, setMontoYape] = useState('');
  const [montoOtros, setMontoOtros] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDescuadreWarning, setShowDescuadreWarning] = useState(false);

  const { status, cerrarCaja, isLoading, getResumen, margenDescuadre, aperturaActual } = useCaja();

  const resumen = getResumen();
  const montoIngresado = parseFloat(montoCierre) || 0;
  const descuadre = calcularDescuadre(montoIngresado, resumen.saldo);
  const tieneDescuadre = hasDescuadre(descuadre);
  const margenPermitidoEnMonto = (margenDescuadre / 100) * Math.abs(resumen.saldo);
  const descuadreExcedido = Math.abs(descuadre) > margenPermitidoEnMonto;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'cerrada') return;

    if (descuadreExcedido) {
      setShowDescuadreWarning(true);
    } else {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmCierre = async () => {
    try {
      const cierreCaja = {
        usuarioId: aperturaActual?.usuarioId || 'default',
        usuarioNombre: aperturaActual?.usuarioNombre || 'Usuario',
        fechaHoraCierre: new Date(),
        montoFinalEfectivo: parseFloat(montoEfectivo) || resumen.totalEfectivo,
        montoFinalTarjeta: parseFloat(montoTarjeta) || resumen.totalTarjeta,
        montoFinalYape: parseFloat(montoYape) || resumen.totalYape,
        montoFinalOtros: parseFloat(montoOtros) || resumen.totalOtros,
        montoFinalTotal: montoIngresado,
        descuadre,
        observaciones: observaciones || undefined,
      };

      await cerrarCaja(cierreCaja);
      setShowConfirmModal(false);
      setMontoCierre('');
      setMontoEfectivo('');
      setMontoTarjeta('');
      setMontoYape('');
      setMontoOtros('');
      setObservaciones('');
    } catch (error) {
      setShowConfirmModal(false);
    }
  };

  return (
    <>
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6 sm:p-8 mt-4 sm:mt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-100 rounded-lg">
            <Lock className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Cierre de Caja</h2>
        </div>

        {status === 'cerrada' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-yellow-900">No hay caja abierta</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Debe abrir una caja antes de poder realizar el cierre.
              </p>
            </div>
          </div>
        )}

        {/* Resumen */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-lg mb-6 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Resumen de Caja</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-3 rounded-md">
              <p className="text-xs text-gray-500">Apertura</p>
              <p className="text-lg font-bold text-gray-900">S/ {resumen.apertura.toFixed(2)}</p>
            </div>
            <div className="bg-white p-3 rounded-md">
              <p className="text-xs text-green-600">Ingresos</p>
              <p className="text-lg font-bold text-green-700">S/ {resumen.ingresos.toFixed(2)}</p>
            </div>
            <div className="bg-white p-3 rounded-md">
              <p className="text-xs text-red-600">Egresos</p>
              <p className="text-lg font-bold text-red-700">S/ {resumen.egresos.toFixed(2)}</p>
            </div>
            <div className="bg-white p-3 rounded-md border-2 border-blue-200">
              <p className="text-xs text-blue-600 font-medium">Saldo Esperado</p>
              <p className="text-xl font-bold text-blue-700">S/ {resumen.saldo.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto de Cierre <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={montoCierre}
              onChange={(e) => setMontoCierre(e.target.value)}
              min={0}
              step="0.01"
              placeholder="0.00"
              required
              autoFocus
              disabled={status === 'cerrada' || isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {status === 'abierta' && (
              <p className="text-xs text-gray-500 mt-1">Monto esperado: S/ {resumen.saldo.toFixed(2)}</p>
            )}
          </div>

          {tieneDescuadre && montoCierre && (
            <div className={`p-4 rounded-lg border ${descuadreExcedido ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${descuadreExcedido ? 'text-red-600' : 'text-yellow-600'}`} />
                <div>
                  <p className={`text-sm font-semibold ${descuadreExcedido ? 'text-red-900' : 'text-yellow-900'}`}>
                    {descuadreExcedido ? 'Descuadre excede el margen' : 'Descuadre detectado'}
                  </p>
                  <p className={`text-sm ${descuadreExcedido ? 'text-red-700' : 'text-yellow-700'}`}>
                    Diferencia: S/ {descuadre.toFixed(2)} (Margen: {margenDescuadre.toFixed(2)}% ~ S/ {margenPermitidoEnMonto.toFixed(2)})
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              placeholder="Observaciones del cierre (opcional)"
              disabled={status === 'cerrada' || isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={status === 'cerrada' || isLoading || !montoCierre}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Cerrando caja...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                {status === 'cerrada' ? 'Caja Cerrada' : 'Cerrar Caja'}
              </>
            )}
          </button>
        </form>
      </div>

      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Confirmar Cierre de Caja"
        message={`¿Está seguro de cerrar la caja?${tieneDescuadre ? ` Se registrará un descuadre de S/ ${descuadre.toFixed(2)}.` : ''} Esta acción no se puede deshacer.`}
        confirmText="Sí, cerrar caja"
        cancelText="Cancelar"
        type="danger"
        isLoading={isLoading}
        onConfirm={handleConfirmCierre}
        onClose={() => setShowConfirmModal(false)}
      />

      <ConfirmationModal
        isOpen={showDescuadreWarning}
        title="Descuadre Excede el Margen"
        message={`El descuadre de S/ ${descuadre.toFixed(2)} excede el margen permitido (${margenDescuadre.toFixed(2)}% ~ S/ ${margenPermitidoEnMonto.toFixed(2)}). No se puede cerrar la caja. Por favor, verifique el monto.`}
        confirmText="Entendido"
        type="danger"
        onConfirm={() => setShowDescuadreWarning(false)}
        onClose={() => setShowDescuadreWarning(false)}
      />
    </>
  );
};

export default CierreCaja;
