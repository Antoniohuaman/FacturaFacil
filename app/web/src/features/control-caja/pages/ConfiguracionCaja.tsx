/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
import React, { useState } from 'react';
import { useCaja } from '../context/CajaContext';
import { Settings2, CreditCard, Save, X, Plus, AlertCircle } from 'lucide-react';
import { ConfirmationModal } from '../components/common/ConfirmationModal';

const ConfiguracionCaja: React.FC = () => {
  const [mediosPago, setMediosPago] = useState<string[]>([
    'Efectivo',
    'Tarjeta',
    'Yape',
    'Transferencia',
    'Plin',
    'Deposito'
  ]);
  const [nuevoMedio, setNuevoMedio] = useState('');
  const [limiteCaja, setLimiteCaja] = useState(5000);
  const { margenDescuadre, setMargenDescuadre, showToast } = useCaja();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const agregarMedio = () => {
    const medioTrimmed = nuevoMedio.trim();

    if (!medioTrimmed) {
      showToast('warning', 'Campo vacío', 'Por favor, ingrese un medio de pago.');
      return;
    }

    if (mediosPago.includes(medioTrimmed)) {
      showToast('warning', 'Duplicado', 'Este medio de pago ya existe en la lista.');
      return;
    }

    setMediosPago([...mediosPago, medioTrimmed]);
    setNuevoMedio('');
    showToast('success', 'Medio agregado', `${medioTrimmed} fue agregado exitosamente.`);
  };

  const eliminarMedio = (medio: string) => {
    setMediosPago(mediosPago.filter(m => m !== medio));
    showToast('info', 'Medio eliminado', `${medio} fue eliminado de la lista.`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (margenDescuadre < 0) {
      showToast('error', 'Valor inválido', 'El margen de descuadre no puede ser negativo.');
      return;
    }

    if (limiteCaja < 0) {
      showToast('error', 'Valor inválido', 'El límite de caja no puede ser negativo.');
      return;
    }

    setShowConfirmModal(true);
  };

  const guardarConfiguracion = async () => {
    try {
      // Simular guardado en backend
      await new Promise((resolve) => setTimeout(resolve, 800));

      setShowConfirmModal(false);
      showToast('success', '¡Configuración guardada!', 'Los cambios se aplicaron correctamente.');
    } catch (error) {
      showToast('error', 'Error', 'No se pudo guardar la configuración.');
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings2 className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Configuración de Caja</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Medios de pago */}
            <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-gray-700" />
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Medios de Pago Permitidos
                </h3>
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={nuevoMedio}
                  onChange={e => setNuevoMedio(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), agregarMedio())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: POS, QR, etc."
                />
                <button
                  type="button"
                  onClick={agregarMedio}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {mediosPago.map((medio, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-700"
                  >
                    {medio}
                    <button
                      type="button"
                      onClick={() => eliminarMedio(medio)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Límites y márgenes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Límite Máximo de Caja <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 text-sm">S/</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={limiteCaja}
                    onChange={e => setLimiteCaja(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Monto máximo permitido en caja</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Margen de Descuadre <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 text-sm">S/</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={margenDescuadre}
                    onChange={e => setMargenDescuadre(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Diferencia máxima permitida en el cierre</p>
              </div>
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900">Importante</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Los medios de pago configurados estarán disponibles para su selección en las operaciones de caja.
                  Los cambios afectarán a todas las futuras operaciones.
                </p>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="w-full px-4 py-3 text-white rounded-md font-semibold flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ backgroundColor: '#1478D4' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1068C4'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1478D4'}
            >
              <Save className="w-5 h-5" />
              Guardar Configuración
            </button>
          </form>
        </div>
      </div>

      {/* Confirmation modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Confirmar Cambios"
        message="¿Está seguro de guardar esta configuración? Los cambios se aplicarán de inmediato a todas las operaciones de caja."
        confirmText="Sí, guardar cambios"
        cancelText="Cancelar"
        type="info"
        onConfirm={guardarConfiguracion}
        onClose={() => setShowConfirmModal(false)}
      />
    </>
  );
};

export default ConfiguracionCaja;
