import React, { useState } from 'react';
import { Lock, CheckCircle2 } from 'lucide-react';

interface ResumenCaja {
  apertura: number;
  ingresos: number;
  egresos: number;
  saldo: number;
}

const mockResumen: ResumenCaja = {
  apertura: 500.00,
  ingresos: 209.50,
  egresos: 0.00,
  saldo: 709.50
};

const CierreCaja: React.FC = () => {
  const [montoCierre, setMontoCierre] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [cerrado, setCerrado] = useState(false);
  const [error, setError] = useState('');

  const handleCierre = (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(montoCierre);
    if (isNaN(monto) || monto < 0) {
      setError('Ingrese un monto válido para el cierre.');
      return;
    }
    if (Math.abs(monto - mockResumen.saldo) > 1) {
      setError('El monto de cierre no coincide con el saldo actual.');
      return;
    }
    setError('');
    setCerrado(true);
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-lg shadow p-8 mt-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Lock className="w-6 h-6 text-gray-600" /> Cierre de Caja
      </h2>
      {/* Resumen de caja */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Apertura</p>
            <p className="text-lg font-bold text-gray-900">S/ {mockResumen.apertura.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-green-600">Ingresos</p>
            <p className="text-lg font-bold text-green-700">S/ {mockResumen.ingresos.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-red-600">Egresos</p>
            <p className="text-lg font-bold text-red-700">S/ {mockResumen.egresos.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-blue-600">Saldo Actual</p>
            <p className="text-lg font-bold text-blue-700">S/ {mockResumen.saldo.toFixed(2)}</p>
          </div>
        </div>
      </div>
      {/* Formulario de cierre */}
      {!cerrado ? (
        <form onSubmit={handleCierre} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Monto de cierre</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={montoCierre}
              onChange={e => setMontoCierre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder={`S/ ${mockResumen.saldo.toFixed(2)}`}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              rows={3}
              placeholder="Observaciones del cierre (opcional)"
            />
          </div>
          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" /> Registrar cierre de caja
          </button>
        </form>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto text-green-600 mb-2" />
          <p className="text-lg font-bold text-green-800 mb-2">¡Caja cerrada correctamente!</p>
          <p className="text-sm text-gray-700">Monto de cierre: <span className="font-bold">S/ {montoCierre}</span></p>
          {observaciones && <p className="text-sm text-gray-700 mt-2">Observaciones: {observaciones}</p>}
        </div>
      )}
    </div>
  );
};

export default CierreCaja;
