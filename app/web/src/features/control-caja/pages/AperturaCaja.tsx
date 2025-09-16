import React, { useState } from 'react';
import { DollarSign, Save } from 'lucide-react';

// Tipos básicos


const usuarios = ['Carlos Rueda', 'Ana García', 'Miguel López', 'Sofia Hernández'];

const AperturaCaja: React.FC = () => {
  const [montoEfectivo, setMontoEfectivo] = useState(0);
  const [montoTarjeta, setMontoTarjeta] = useState(0);
  const [montoYape, setMontoYape] = useState(0);
  const [notas, setNotas] = useState('');
  const [usuario, setUsuario] = useState(usuarios[0]);
  const [fechaApertura, setFechaApertura] = useState(new Date().toISOString().slice(0,16));
  const [guardado, setGuardado] = useState(false);

  const handleApertura = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la lógica para guardar la sesión
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-lg shadow p-8 mt-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <DollarSign className="w-7 h-7 text-green-600" /> Apertura de Caja
      </h2>
      <form onSubmit={handleApertura} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha y Hora de Apertura</label>
          <input
            type="datetime-local"
            value={fechaApertura}
            onChange={e => setFechaApertura(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            required
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Efectivo Inicial</label>
            <input
              type="number"
              min={0}
              value={montoEfectivo}
              onChange={e => setMontoEfectivo(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tarjeta Inicial</label>
            <input
              type="number"
              min={0}
              value={montoTarjeta}
              onChange={e => setMontoTarjeta(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Yape Inicial</label>
            <input
              type="number"
              min={0}
              value={montoYape}
              onChange={e => setMontoYape(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Usuario/Cajero</label>
          <select
            value={usuario}
            onChange={e => setUsuario(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            required
          >
            {usuarios.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notas de Apertura</label>
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Observaciones, comentarios, etc."
          />
        </div>
        <button type="submit" className="w-full px-4 py-2 bg-green-600 text-white rounded-md font-semibold flex items-center justify-center gap-2">
          <Save className="w-5 h-5" /> Abrir Caja
        </button>
        {guardado && (
          <div className="text-green-600 text-center mt-2">¡Apertura registrada correctamente!</div>
        )}
      </form>
    </div>
  );
};

export default AperturaCaja;
