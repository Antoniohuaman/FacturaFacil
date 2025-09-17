import React, { useState } from 'react';
import { useCaja } from '../store/CajaContext';
import { Settings2, User, CreditCard, Save } from 'lucide-react';

const mediosPagoDefault = [
  'Efectivo',
  'Tarjeta',
  'Yape',
  'Transferencia'
];

const usuariosDefault = [
  'Carlos Rueda',
  'Ana Torres'
];

const ConfiguracionCaja: React.FC = () => {
  const [mediosPago, setMediosPago] = useState<string[]>(mediosPagoDefault);
  const [nuevoMedio, setNuevoMedio] = useState('');
  const [usuarios, setUsuarios] = useState<string[]>(usuariosDefault);
  const [nuevoUsuario, setNuevoUsuario] = useState('');
  const [limiteCaja, setLimiteCaja] = useState(1000);
  const { margenDescuadre, setMargenDescuadre } = useCaja();

  const agregarMedio = () => {
    if (nuevoMedio && !mediosPago.includes(nuevoMedio)) {
      setMediosPago([...mediosPago, nuevoMedio]);
      setNuevoMedio('');
    }
  };

  const agregarUsuario = () => {
    if (nuevoUsuario && !usuarios.includes(nuevoUsuario)) {
      setUsuarios([...usuarios, nuevoUsuario]);
      setNuevoUsuario('');
    }
  };

  const guardarConfiguracion = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la lógica para guardar la configuración en backend
    alert('Configuración guardada correctamente');
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8 mt-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Settings2 className="w-6 h-6 text-gray-600" /> Configuración de Caja
      </h2>
      <form onSubmit={guardarConfiguracion} className="space-y-6">
        {/* Medios de pago */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Medios de pago permitidos</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={nuevoMedio}
              onChange={e => setNuevoMedio(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Agregar medio de pago"
            />
            <button type="button" onClick={agregarMedio} className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 flex items-center gap-1">
              <CreditCard className="w-4 h-4" /> Agregar
            </button>
          </div>
          <ul className="list-disc pl-5 text-sm text-gray-800">
            {mediosPago.map((medio, idx) => (
              <li key={idx}>{medio}</li>
            ))}
          </ul>
        </div>
        {/* Usuarios autorizados */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Usuarios autorizados</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={nuevoUsuario}
              onChange={e => setNuevoUsuario(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Agregar usuario"
            />
            <button type="button" onClick={agregarUsuario} className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 flex items-center gap-1">
              <User className="w-4 h-4" /> Agregar
            </button>
          </div>
          <ul className="list-disc pl-5 text-sm text-gray-800">
            {usuarios.map((usuario, idx) => (
              <li key={idx}>{usuario}</li>
            ))}
          </ul>
        </div>
        {/* Límite de caja */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Límite máximo de caja (S/)</label>
          <input
            type="number"
            min="0"
            value={limiteCaja}
            onChange={e => setLimiteCaja(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        {/* Margen de descuadre */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Margen de descuadre permitido (S/)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={margenDescuadre}
            onChange={e => setMargenDescuadre(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2">
          <Save className="w-5 h-5" /> Guardar configuración
        </button>
      </form>
    </div>
  );
};

export default ConfiguracionCaja;
