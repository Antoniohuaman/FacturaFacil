import { Plus, Trash2, AlertCircle } from 'lucide-react';
import type { PaymentMeanOption } from '@/shared/payments/paymentMeans';
import type { MedioPagoCompra } from '../../modelos/PagoCompra';
import type { BankAccount } from '../../../configuracion-sistema/modelos/BankAccount';
import { esMedioBancario, requiereReferencia } from '../../servicios/servicioPagoCompra';
import type { ErrorMedioPago } from '../../hooks/useFormularioPagoCompra';

interface EditorMediosPagoCompraProps {
  mediosPago: MedioPagoCompra[];
  mediosDisponibles: PaymentMeanOption[];
  cuentasBancariasCompatibles: BankAccount[];
  moneda: string;
  cajaAbierta: boolean;
  hayMedioDeCaja: boolean;
  onAgregar: () => void;
  onEliminar: (id: string) => void;
  onCambiarMedio: (id: string, codigo: string) => void;
  onCambiarCampo: (id: string, campo: keyof MedioPagoCompra, valor: unknown) => void;
  /** Tras un intento real de registrar el pago — antes de eso, ninguna fila muestra error de campo. */
  mostrarErrores?: boolean;
  /** Por id de línea (`MedioPagoCompra.id`), calculado en `useFormularioPagoCompra`. */
  erroresPorMedio?: Record<string, ErrorMedioPago>;
}

/**
 * Editor de medios de pago: consume exclusivamente el catálogo real de
 * Configuración de Negocio → Pagos → Medios de pago (mediosDisponibles ya
 * viene filtrado desde el hook vía getConfiguredPaymentMeans). No existe
 * "Contado"/"Crédito" aquí: eso es información del documento origen, no un
 * medio de pago. La clasificación bancario/caja/referencia está centralizada
 * en servicioPagoCompra, no se infiere de texto.
 */
export default function EditorMediosPagoCompra({
  mediosPago,
  mediosDisponibles,
  cuentasBancariasCompatibles,
  moneda,
  cajaAbierta,
  hayMedioDeCaja,
  onAgregar,
  onEliminar,
  onCambiarMedio,
  onCambiarCampo,
  mostrarErrores = false,
  erroresPorMedio,
}: EditorMediosPagoCompraProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Medios de pago</label>
        <button
          type="button"
          onClick={onAgregar}
          disabled={mediosDisponibles.length === 0}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={14} /> Agregar medio
        </button>
      </div>

      {mediosDisponibles.length === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          No hay medios de pago activos configurados.
        </p>
      )}

      {mediosPago.map((linea, i) => {
        const esBancario = esMedioBancario(linea.medioPagoCodigo);
        const conReferencia = requiereReferencia(linea.medioPagoCodigo);
        const errorLinea: ErrorMedioPago = mostrarErrores ? (erroresPorMedio?.[linea.id] ?? {}) : {};
        return (
          <div
            key={linea.id}
            className="flex flex-wrap items-end gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200"
          >
            <span className="text-[11px] font-medium text-gray-400 self-center shrink-0">{i + 1}</span>

            <div className="flex-1 min-w-[140px] space-y-1">
              <label className="text-xs text-gray-500">Medio de pago</label>
              <select
                value={linea.medioPagoCodigo}
                onChange={(e) => onCambiarMedio(linea.id, e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white ${
                  errorLinea.codigo ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Selecciona un medio...</option>
                {mediosDisponibles.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.label}
                  </option>
                ))}
              </select>
              {errorLinea.codigo && <p className="text-xs text-red-600">{errorLinea.codigo}</p>}
            </div>

            <div className="w-28 space-y-1">
              <label className="text-xs text-gray-500">Importe</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={linea.monto || ''}
                onChange={(e) => onCambiarCampo(linea.id, 'monto', parseFloat(e.target.value) || 0)}
                className={`w-full border rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white ${
                  errorLinea.monto ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errorLinea.monto && <p className="text-xs text-red-600">{errorLinea.monto}</p>}
            </div>

            {esBancario && (
              <div className="flex-1 min-w-[160px] space-y-1">
                <label className="text-xs text-gray-500">
                  Cuenta bancaria <span className="text-red-500">*</span>
                </label>
                <select
                  value={linea.cuentaBancariaId ?? ''}
                  onChange={(e) => onCambiarCampo(linea.id, 'cuentaBancariaId', e.target.value || undefined)}
                  className={`w-full border rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white ${
                    errorLinea.cuentaBancaria ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={cuentasBancariasCompatibles.length === 0}
                >
                  <option value="">Seleccionar cuenta...</option>
                  {cuentasBancariasCompatibles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.bankName} — {c.accountNumber} ({c.currencyCode})
                    </option>
                  ))}
                </select>
                {cuentasBancariasCompatibles.length === 0 ? (
                  <p className="text-xs text-red-600">No hay cuentas en {moneda}.</p>
                ) : (
                  errorLinea.cuentaBancaria && <p className="text-xs text-red-600">{errorLinea.cuentaBancaria}</p>
                )}
              </div>
            )}

            {(esBancario || conReferencia) && (
              <div className="flex-1 min-w-[140px] space-y-1">
                <label className="text-xs text-gray-500">
                  {esBancario ? 'N° operación' : 'Referencia'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={linea.referenciaOperacion ?? ''}
                  onChange={(e) => onCambiarCampo(linea.id, 'referenciaOperacion', e.target.value || undefined)}
                  placeholder={esBancario ? 'Ej: 12345678' : 'Ej: N° de cheque'}
                  className={`w-full border rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    errorLinea.referencia ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errorLinea.referencia && <p className="text-xs text-red-600">{errorLinea.referencia}</p>}
              </div>
            )}

            {mediosPago.length > 1 && (
              <button
                onClick={() => onEliminar(linea.id)}
                className="text-gray-400 hover:text-red-500 transition-colors shrink-0 pb-2"
                aria-label="Eliminar medio"
                title="Eliminar medio"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        );
      })}

      {hayMedioDeCaja && !cajaAbierta && (
        <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle size={14} className="shrink-0" />
          La caja está cerrada. Debes abrir una caja para registrar el pago en efectivo.
        </div>
      )}
    </div>
  );
}
