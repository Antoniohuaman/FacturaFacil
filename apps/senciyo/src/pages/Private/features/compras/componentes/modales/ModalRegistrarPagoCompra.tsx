import { useState, useEffect } from 'react';
import { Plus, Trash2, X, CreditCard } from 'lucide-react';
import type { CuentaPorPagar } from '../../modelos/CuentaPorPagar';
import type { MedioPagoCompra } from '../../modelos/PagoCompra';
import { useCompras } from '../../contexto/ContextoCompras';
import { useCaja } from '../../../control-caja';
import type { MedioPago } from '@/shared/payments/medioPago';
import { useUserSession } from '@/contexts/UserSessionContext';

interface ModalRegistrarPagoCompraProps {
  cxp: CuentaPorPagar | null;
  abierto: boolean;
  onExito: () => void;
  onCerrar: () => void;
}

const MEDIOS_DISPONIBLES = [
  { codigo: '008', nombre: 'Efectivo', esCaja: true },
  { codigo: '001', nombre: 'Depósito en cuenta', esCaja: false },
  { codigo: '003', nombre: 'Transferencia bancaria', esCaja: false },
  { codigo: '005', nombre: 'Tarjeta de débito', esCaja: false },
  { codigo: '006', nombre: 'Tarjeta de crédito', esCaja: false },
  { codigo: '999', nombre: 'Otro', esCaja: false },
];

function generarIdLinea(): string {
  return `ml-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function ModalRegistrarPagoCompra({
  cxp,
  abierto,
  onExito,
  onCerrar,
}: ModalRegistrarPagoCompraProps) {
  const { registrarPagoCompra } = useCompras();
  const { agregarMovimiento, status: estadoCaja } = useCaja();
  const { session } = useUserSession();

  const [fechaPago, setFechaPago] = useState(() => new Date().toISOString().slice(0, 10));
  const [concepto, setConcepto] = useState('');
  const [lineas, setLineas] = useState<MedioPagoCompra[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (abierto && cxp) {
      setLineas([
        {
          id: generarIdLinea(),
          medioPagoCodigo: '008',
          medioPagoNombre: 'Efectivo',
          monto: cxp.saldoPendiente,
        },
      ]);
      setConcepto(`Pago a ${cxp.proveedorNombre} — ${cxp.comprobanteCompraNumero}`);
      setFechaPago(new Date().toISOString().slice(0, 10));
      setError('');
    }
  }, [abierto, cxp]);

  if (!abierto || !cxp) return null;

  const totalLineas = lineas.reduce((s, l) => s + (l.monto || 0), 0);
  const saldo = cxp.saldoPendiente;

  function agregarLinea() {
    setLineas((prev) => [
      ...prev,
      { id: generarIdLinea(), medioPagoCodigo: '008', medioPagoNombre: 'Efectivo', monto: 0 },
    ]);
  }

  function eliminarLinea(id: string) {
    setLineas((prev) => prev.filter((l) => l.id !== id));
  }

  function actualizarLinea(id: string, campo: keyof MedioPagoCompra, valor: unknown) {
    setLineas((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        if (campo === 'medioPagoCodigo' && typeof valor === 'string') {
          const def = MEDIOS_DISPONIBLES.find((m) => m.codigo === valor);
          return { ...l, medioPagoCodigo: valor, medioPagoNombre: def?.nombre ?? valor };
        }
        return { ...l, [campo]: valor };
      }),
    );
  }

  async function handleConfirmar() {
    if (!cxp) return;
    if (lineas.length === 0) {
      setError('Agrega al menos un medio de pago.');
      return;
    }
    if (lineas.some((l) => l.monto <= 0)) {
      setError('Todos los montos deben ser mayores a cero.');
      return;
    }
    if (totalLineas > saldo + 0.01) {
      setError(`El total pagado (${totalLineas.toFixed(2)}) supera el saldo pendiente (${saldo.toFixed(2)}).`);
      return;
    }

    setError('');
    setProcesando(true);

    try {
      const pago = await registrarPagoCompra(
        {
          fechaPago,
          proveedorId: cxp.proveedorId,
          proveedorNombre: cxp.proveedorNombre,
          moneda: cxp.moneda,
          montoTotalPagado: totalLineas,
          mediosPago: lineas,
          cuentasPorPagarAplicadas: [cxp.id],
          comprobantesCompraAplicados: [cxp.comprobanteCompraId],
          concepto: concepto || undefined,
        },
        session?.userId,
      );

      // Registrar egreso en Caja si hay medios de caja
      const lineasCaja = lineas.filter((l) =>
        MEDIOS_DISPONIBLES.find((m) => m.codigo === l.medioPagoCodigo)?.esCaja,
      );
      if (lineasCaja.length > 0 && estadoCaja === 'abierta') {
        for (const linea of lineasCaja) {
          await agregarMovimiento({
            tipo: 'Egreso',
            concepto: concepto || `Pago a ${cxp.proveedorNombre}`,
            medioPago: 'Efectivo' as MedioPago,
            monto: linea.monto,
            referencia: pago.numeroPago,
            usuarioId: session?.userId ?? '',
            usuarioNombre: session?.userName ?? '',
          });
        }
      }

      onExito();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar el pago.');
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={!procesando ? onCerrar : undefined} />
      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 shrink-0">
          <CreditCard className="text-blue-600" size={20} />
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">Registrar Pago</h2>
            <p className="text-xs text-gray-500">{cxp.proveedorNombre} · {cxp.comprobanteCompraNumero}</p>
          </div>
          <button onClick={onCerrar} disabled={procesando} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Resumen CxP */}
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex gap-6 text-sm shrink-0">
          <div>
            <span className="text-blue-600 font-medium">Total:</span>{' '}
            {cxp.total.toFixed(2)} {cxp.moneda}
          </div>
          <div>
            <span className="text-blue-600 font-medium">Pagado:</span>{' '}
            {cxp.totalPagado.toFixed(2)} {cxp.moneda}
          </div>
          <div>
            <span className="text-blue-600 font-medium">Saldo:</span>{' '}
            <strong>{cxp.saldoPendiente.toFixed(2)} {cxp.moneda}</strong>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Fecha de pago</label>
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                disabled={procesando}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Concepto</label>
              <input
                type="text"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Descripción del pago..."
                disabled={procesando}
              />
            </div>
          </div>

          {/* Líneas de medios de pago */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Medios de pago</label>
              <button
                onClick={agregarLinea}
                disabled={procesando}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus size={14} /> Agregar medio
              </button>
            </div>

            {lineas.map((linea) => (
              <div key={linea.id} className="flex gap-2 items-center">
                <select
                  value={linea.medioPagoCodigo}
                  onChange={(e) => actualizarLinea(linea.id, 'medioPagoCodigo', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  disabled={procesando}
                >
                  {MEDIOS_DISPONIBLES.map((m) => (
                    <option key={m.codigo} value={m.codigo}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={linea.monto || ''}
                  onChange={(e) =>
                    actualizarLinea(linea.id, 'monto', parseFloat(e.target.value) || 0)
                  }
                  className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="0.00"
                  disabled={procesando}
                />
                {lineas.length > 1 && (
                  <button
                    onClick={() => eliminarLinea(linea.id)}
                    disabled={procesando}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Totales */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Total a pagar:</span>
              <span className={totalLineas > saldo + 0.01 ? 'text-red-600 font-medium' : ''}>
                {totalLineas.toFixed(2)} {cxp.moneda}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Saldo restante:</span>
              <span>{Math.max(0, saldo - totalLineas).toFixed(2)} {cxp.moneda}</span>
            </div>
          </div>

          {estadoCaja === 'cerrada' && lineas.some((l) => MEDIOS_DISPONIBLES.find((m) => m.codigo === l.medioPagoCodigo)?.esCaja) && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              La caja está cerrada. El pago se registrará pero no se creará el movimiento de caja automáticamente.
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <button
            onClick={onCerrar}
            disabled={procesando}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={procesando || lineas.length === 0 || totalLineas <= 0}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {procesando ? 'Registrando...' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}
