
import { useState } from 'react';
import AperturaCaja from './AperturaCaja';
import CierreCaja from './CierreCaja';
import MovimientosCaja from './MovimientosCaja';
import DetalleMovimientoCaja from './DetalleMovimientoCaja';
import ConfiguracionCaja from './ConfiguracionCaja';
import ReportesCaja from './ReportesCaja';

const TABS = [
  { key: 'apertura', label: 'Apertura' },
  { key: 'cierre', label: 'Cierre' },
  { key: 'movimientos', label: 'Movimientos' },
  { key: 'detalle', label: 'Detalle' },
  { key: 'configuracion', label: 'Configuración' },
  { key: 'reportes', label: 'Reportes' }
];

export default function ControlCajaHome() {
  const [activeTab, setActiveTab] = useState('apertura');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Control de Caja</h1>
      <div className="mb-8">
        <nav className="flex gap-2 border-b">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div>
        {activeTab === 'apertura' && <AperturaCaja />}
        {activeTab === 'cierre' && <CierreCaja />}
        {activeTab === 'movimientos' && <MovimientosCaja />}
        {activeTab === 'detalle' && <DetalleMovimientoCaja />}
        {activeTab === 'configuracion' && <ConfiguracionCaja />}
        {activeTab === 'reportes' && <ReportesCaja />}
      </div>
    </div>
  );
}
