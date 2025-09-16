import React from 'react';
import { Eye, Receipt, User, CreditCard } from 'lucide-react';

// Tipo de movimiento (puedes importar desde models si lo tienes)
interface Movimiento {
  id: string;
  tipo: 'Ingreso' | 'Egreso' | 'Transferencia';
  concepto: string;
  medioPago: 'Efectivo' | 'Tarjeta' | 'Yape' | 'Transferencia';
  monto: number;
  referencia?: string;
  fecha: Date;
  usuario: string;
  observaciones?: string;
}

// Mock de ejemplo
const movimientoEjemplo: Movimiento = {
  id: 'mov1',
  tipo: 'Ingreso',
  concepto: 'Venta - Boleta B001-00000052',
  medioPago: 'Efectivo',
  monto: 120.00,
  referencia: 'B001-00000052',
  fecha: new Date('2025-09-16T10:30:00'),
  usuario: 'Carlos Rueda',
  observaciones: 'Pago realizado en efectivo, sin inconvenientes.'
};

const DetalleMovimientoCaja: React.FC<{ movimiento?: Movimiento }> = ({ movimiento = movimientoEjemplo }) => {
  return (
    <div className="max-w-lg mx-auto bg-white rounded-lg shadow p-8 mt-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Eye className="w-6 h-6 text-gray-600" /> Detalle de Movimiento
      </h2>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-600" />
          <span className="font-semibold">Concepto:</span>
          <span>{movimiento.concepto}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            movimiento.tipo === 'Ingreso' ? 'bg-green-100 text-green-800' :
            movimiento.tipo === 'Egreso' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {movimiento.tipo}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-purple-600" />
          <span className="font-semibold">Medio de pago:</span>
          <span>{movimiento.medioPago}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">Monto:</span>
          <span className={movimiento.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600'}>
            {movimiento.tipo === 'Egreso' ? '-' : ''}S/ {movimiento.monto.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">Referencia:</span>
          <span>{movimiento.referencia || '-'}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-gray-600" />
          <span className="font-semibold">Usuario:</span>
          <span>{movimiento.usuario}</span>
        </div>
        <div>
          <span className="font-semibold">Fecha/Hora:</span>
          <span className="ml-2">{movimiento.fecha.toLocaleString('es-PE')}</span>
        </div>
        {movimiento.observaciones && (
          <div>
            <span className="font-semibold">Observaciones:</span>
            <span className="ml-2">{movimiento.observaciones}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetalleMovimientoCaja;
