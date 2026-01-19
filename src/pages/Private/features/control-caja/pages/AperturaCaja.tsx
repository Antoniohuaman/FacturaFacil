/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCaja } from '../context/CajaContext';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import { DollarSign, Save, AlertCircle } from 'lucide-react';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { calcularMontoInicialTotal } from '../utils';
import { formatBusinessDateTimeIso, formatBusinessDateTimeLocal, parseBusinessDateTimeLocal } from '@/shared/time/businessTime';

const AperturaCaja: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useUserSession();
  
  // Valores numéricos para cálculos
  const [montoEfectivoNum, setMontoEfectivoNum] = useState(0);
  const [montoTarjetaNum, setMontoTarjetaNum] = useState(0);
  const [montoYapeNum, setMontoYapeNum] = useState(0);
  
  // Valores de texto para inputs controlados
  const [montoEfectivoTxt, setMontoEfectivoTxt] = useState('0.00');
  const [montoTarjetaTxt, setMontoTarjetaTxt] = useState('0.00');
  const [montoYapeTxt, setMontoYapeTxt] = useState('0.00');
  
  const [notas, setNotas] = useState('');
  const [fechaApertura, setFechaApertura] = useState(() => formatBusinessDateTimeLocal());
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { status, abrirCaja, isLoading, activeCajaId } = useCaja();

  // Obtener usuario desde el contexto de sesión
  const usuarioActual = session?.userName || 'Usuario';
  const usuarioId = session?.userId || 'default';

  // Obtener la URL de retorno de los parámetros o sessionStorage
  const returnTo = searchParams.get('returnTo') || sessionStorage.getItem('returnAfterCajaOpen');

  const montoTotal = calcularMontoInicialTotal(montoEfectivoNum, montoTarjetaNum, montoYapeNum);

  const isFormValid = () => {
    return (
      montoEfectivoNum >= 0 &&
      fechaApertura &&
      usuarioActual
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    setShowConfirmModal(true);
  };

  const handleConfirmApertura = async () => {
    const fechaHoraApertura = parseBusinessDateTimeLocal(fechaApertura) ?? new Date(formatBusinessDateTimeIso());
    const aperturaData = {
      usuarioId: usuarioId,
      usuarioNombre: usuarioActual,
      fechaHoraApertura,
      montoInicialEfectivo: montoEfectivoNum,
      montoInicialTarjeta: montoTarjetaNum,
      montoInicialYape: montoYapeNum,
      montoInicialOtros: 0,
      montoInicialTotal: montoTotal,
      notas: notas || undefined,
    };

    try {
      if (!activeCajaId) {
        // La validación principal se hace en CajaContext, aquí solo evitamos llamar sin caja.
        return;
      }
      await abrirCaja(aperturaData);
      setShowConfirmModal(false);
      
      // Limpiar formulario
      setMontoEfectivoTxt('0.00');
      setMontoTarjetaTxt('0.00');
      setMontoYapeTxt('0.00');
      setMontoEfectivoNum(0);
      setMontoTarjetaNum(0);
      setMontoYapeNum(0);
      setNotas('');
      
      // Limpiar sessionStorage
      sessionStorage.removeItem('returnAfterCajaOpen');
      
      // Redirigir después de un pequeño delay para que el usuario vea el toast de éxito
      if (returnTo) {
        setTimeout(() => {
          navigate(returnTo);
        }, 1500);
      }
    } catch (error) {
      setShowConfirmModal(false);
    }
  };

  return (
    <>
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6 sm:p-8 mt-4 sm:mt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Apertura de Caja</h2>
        </div>

        {/* Indicador de retorno automático */}
        {returnTo && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900">Retorno automático activado</h4>
              <p className="text-sm text-blue-700 mt-1">
                Después de aperturar la caja, serás redirigido automáticamente para continuar con la emisión de comprobantes.
              </p>
            </div>
          </div>
        )}

        {status === 'abierta' && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900">Caja ya abierta</h4>
              <p className="text-sm text-blue-700 mt-1">
                La caja ya está abierta. Debe cerrarla antes de realizar una nueva apertura.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fecha y hora */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha y Hora de Apertura <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={fechaApertura}
              onChange={e => setFechaApertura(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              required
              disabled={status === 'abierta' || isLoading}
            />
          </div>

          {/* Montos iniciales */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Montos Iniciales
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Efectivo Inicial <span className="text-red-500">*</span>
                </label>
                <input
                  inputMode="decimal"
                  value={montoEfectivoTxt}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, '');
                    setMontoEfectivoTxt(v);
                    const n = Number(v);
                    setMontoEfectivoNum(Number.isFinite(n) ? n : 0);
                  }}
                  onBlur={() => {
                    const n = Number(montoEfectivoTxt || 0);
                    setMontoEfectivoNum(n);
                    setMontoEfectivoTxt(n.toFixed(2));
                  }}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  disabled={status === 'abierta' || isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tarjeta Inicial
                </label>
                <input
                  inputMode="decimal"
                  value={montoTarjetaTxt}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, '');
                    setMontoTarjetaTxt(v);
                    const n = Number(v);
                    setMontoTarjetaNum(Number.isFinite(n) ? n : 0);
                  }}
                  onBlur={() => {
                    const n = Number(montoTarjetaTxt || 0);
                    setMontoTarjetaNum(n);
                    setMontoTarjetaTxt(n.toFixed(2));
                  }}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  disabled={status === 'abierta' || isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yape Inicial
                </label>
                <input
                  inputMode="decimal"
                  value={montoYapeTxt}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, '');
                    setMontoYapeTxt(v);
                    const n = Number(v);
                    setMontoYapeNum(Number.isFinite(n) ? n : 0);
                  }}
                  onBlur={() => {
                    const n = Number(montoYapeTxt || 0);
                    setMontoYapeNum(n);
                    setMontoYapeTxt(n.toFixed(2));
                  }}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  disabled={status === 'abierta' || isLoading}
                />
              </div>
            </div>

            {/* Total */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Monto Total Inicial:</span>
                <span className="text-lg font-bold text-gray-900">S/ {montoTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Usuario/Cajero - Solo lectura */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario/Cajero <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={usuarioActual}
              className="w-full px-3 py-2 border border-gray-300 bg-gray-50 rounded-md text-sm focus:outline-none cursor-not-allowed"
              readOnly
              disabled
            />
            <p className="mt-1 text-xs text-gray-500">Usuario actual de la sesión</p>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas de Apertura
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              placeholder="Observaciones, comentarios, etc."
              disabled={status === 'abierta' || isLoading}
            />
          </div>

          {/* Botón de submit */}
          <button
            type="submit"
            disabled={status === 'abierta' || isLoading || !isFormValid()}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Abriendo caja...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {status === 'abierta' ? 'Caja Abierta' : 'Abrir Caja'}
              </>
            )}
          </button>
        </form>
      </div>

      {/* Modal de confirmación */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Confirmar Apertura de Caja"
        message={`¿Está seguro de abrir la caja con un monto inicial de S/ ${montoTotal.toFixed(2)}? Esta acción registrará el inicio de las operaciones del día.`}
        confirmText="Sí, abrir caja"
        cancelText="Cancelar"
        type="info"
        isLoading={isLoading}
        onConfirm={handleConfirmApertura}
        onClose={() => setShowConfirmModal(false)}
      />
    </>
  );
};

export default AperturaCaja;
