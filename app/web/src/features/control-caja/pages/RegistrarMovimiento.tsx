/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
import React, { useState } from 'react';
import { useCaja } from '../context/CajaContext';
import { Plus, TrendingUp, TrendingDown, Receipt } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import type { TipoMovimiento, MedioPago } from '../models';

const RegistrarMovimiento: React.FC = () => {
  const { status, agregarMovimiento, isLoading, aperturaActual } = useCaja();
  
  const [tipo, setTipo] = useState<TipoMovimiento>('Ingreso');
  const [concepto, setConcepto] = useState('');
  const [medioPago, setMedioPago] = useState<MedioPago>('Efectivo');
  const [monto, setMonto] = useState('');
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Obtener usuario desde el contexto de sesión
  const usuarioActual = aperturaActual?.usuarioNombre || 'Usuario';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    try {
      await agregarMovimiento({
        tipo,
        concepto,
        medioPago,
        monto: parseFloat(monto),
        referencia: referencia || undefined,
        usuarioId: aperturaActual?.usuarioId || 'default',
        usuarioNombre: usuarioActual,
        observaciones: observaciones || undefined,
      });

      // Limpiar formulario
      setConcepto('');
      setMonto('');
      setReferencia('');
      setObservaciones('');
      setShowConfirmModal(false);
    } catch (error) {
      setShowConfirmModal(false);
    }
  };

  if (status === 'cerrada') {
    return (
      <EmptyState
        icon={Receipt}
        title="No hay caja abierta"
        description="Debe abrir una caja antes de poder registrar movimientos."
      />
    );
  }

  return (
    <>
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6 sm:p-8 mt-4 sm:mt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-2 rounded-lg ${tipo === 'Ingreso' ? 'bg-green-100' : 'bg-red-100'}`}>
            {tipo === 'Ingreso' ? (
              <TrendingUp className="w-6 h-6 text-green-600" />
            ) : (
              <TrendingDown className="w-6 h-6 text-red-600" />
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Registrar Movimiento</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de movimiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Movimiento <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipo('Ingreso')}
                className={`px-4 py-3 rounded-md font-semibold text-sm transition-all ${
                  tipo === 'Ingreso'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={isLoading}
              >
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Ingreso
                </div>
              </button>
              <button
                type="button"
                onClick={() => setTipo('Egreso')}
                className={`px-4 py-3 rounded-md font-semibold text-sm transition-all ${
                  tipo === 'Egreso'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={isLoading}
              >
                <div className="flex items-center justify-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Egreso
                </div>
              </button>
            </div>
          </div>

          {/* Concepto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Concepto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: Venta de productos, Pago a proveedor, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              required
              disabled={isLoading}
            />
          </div>

          {/* Monto y Medio de pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medio de Pago <span className="text-red-500">*</span>
              </label>
              <select
                value={medioPago}
                onChange={(e) => setMedioPago(e.target.value as MedioPago)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                required
                disabled={isLoading}
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Yape">Yape</option>
                <option value="Plin">Plin</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Deposito">Depósito</option>
              </select>
            </div>
          </div>

          {/* Referencia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Referencia
            </label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Número de operación, comprobante, etc. (opcional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              disabled={isLoading}
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              placeholder="Detalles adicionales (opcional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Botón submit */}
          <button
            type="submit"
            disabled={isLoading || !concepto || !monto || parseFloat(monto) <= 0}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Registrando...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Registrar Movimiento
              </>
            )}
          </button>
        </form>
      </div>

      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Confirmar Registro"
        message={`¿Está seguro de registrar este ${tipo.toLowerCase()} de S/ ${parseFloat(monto || '0').toFixed(2)} por concepto de "${concepto}"?`}
        confirmText="Sí, registrar"
        cancelText="Cancelar"
        type={tipo === 'Ingreso' ? 'success' : 'warning'}
        isLoading={isLoading}
        onConfirm={handleConfirm}
        onClose={() => setShowConfirmModal(false)}
      />
    </>
  );
};

export default RegistrarMovimiento;
