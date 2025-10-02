import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCaja } from '../context/CajaContext';
import { DollarSign, Save, AlertCircle } from 'lucide-react';
import { ConfirmationModal } from '../components/common/ConfirmationModal';

const usuarios = ['Carlos Rueda', 'Ana García', 'Miguel López', 'Sofia Hernández'];

const AperturaCaja: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [montoEfectivo, setMontoEfectivo] = useState('');
  const [montoTarjeta, setMontoTarjeta] = useState('');
  const [montoYape, setMontoYape] = useState('');
  const [notas, setNotas] = useState('');
  const [usuario, setUsuario] = useState(usuarios[0]);
  const [fechaApertura, setFechaApertura] = useState(new Date().toISOString().slice(0, 16));
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { status, abrirCaja, isLoading } = useCaja();

  // Obtener la URL de retorno de los parámetros o sessionStorage
  const returnTo = searchParams.get('returnTo') || sessionStorage.getItem('returnAfterCajaOpen');

  const montoTotal =
    (parseFloat(montoEfectivo) || 0) +
    (parseFloat(montoTarjeta) || 0) +
    (parseFloat(montoYape) || 0);

  const isFormValid = () => {
    return (
      parseFloat(montoEfectivo) >= 0 &&
      fechaApertura &&
      usuario &&
      montoTotal > 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    setShowConfirmModal(true);
  };

  const handleConfirmApertura = async () => {
    const aperturaData = {
      cajaId: 'caja-1',
      usuarioId: usuario,
      usuarioNombre: usuario,
      fechaHoraApertura: new Date(fechaApertura),
      montoInicialEfectivo: parseFloat(montoEfectivo) || 0,
      montoInicialTarjeta: parseFloat(montoTarjeta) || 0,
      montoInicialYape: parseFloat(montoYape) || 0,
      montoInicialOtros: 0,
      montoInicialTotal: montoTotal,
      notas: notas || undefined,
    };

    try {
      await abrirCaja(aperturaData);
      setShowConfirmModal(false);
      
      // Limpiar formulario
      setMontoEfectivo('');
      setMontoTarjeta('');
      setMontoYape('');
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
                  type="number"
                  value={montoEfectivo}
                  onChange={e => setMontoEfectivo(e.target.value)}
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  required
                  disabled={status === 'abierta' || isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tarjeta Inicial
                </label>
                <input
                  type="number"
                  value={montoTarjeta}
                  onChange={e => setMontoTarjeta(e.target.value)}
                  min={0}
                  step="0.01"
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
                  type="number"
                  value={montoYape}
                  onChange={e => setMontoYape(e.target.value)}
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  disabled={status === 'abierta' || isLoading}
                />
              </div>
            </div>

            {/* Total */}
            {montoTotal > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Monto Total Inicial:</span>
                  <span className="text-lg font-bold text-gray-900">S/ {montoTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Usuario/Cajero */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario/Cajero <span className="text-red-500">*</span>
            </label>
            <select
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              required
              disabled={status === 'abierta' || isLoading}
            >
              {usuarios.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
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
