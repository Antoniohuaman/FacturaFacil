// gastos/componentes/DrawerGasto.tsx
//
// Drawer único para crear, editar y ver el detalle de un gasto — mismo
// componente compartido `Drawer` (`@/shared/ui`), mismo criterio que ya usa
// Clientes (`drawerMode: 'create'|'view'|'edit'` sobre un solo Drawer, nunca
// uno por modo). El formulario de pago reutiliza `EditorMediosPagoCompra`
// (Compras) tal cual — nunca un editor de medios de pago nuevo.

import { useMemo, useState } from 'react';
import { Drawer } from '@/shared/ui';
import { formatMoney } from '@/shared/currency';
import { useFeedback } from '@/shared/feedback/useFeedback';
import { getConfiguredPaymentMeans } from '@/shared/payments/paymentMeans';
import { useBankAccounts } from '../../configuracion-sistema/hooks/useCuentasBancarias';
import BuscadorProveedor, { type ProveedorSeleccionado } from '../../compras/componentes/BuscadorProveedor';
import EditorMediosPagoCompra from '../../compras/componentes/pagos/EditorMediosPagoCompra';
import AdjuntosCompra from '../../compras/componentes/adjuntos/AdjuntosCompra';
import { esMedioDeCaja } from '../../compras/servicios/servicioPagoCompra';
import { ESTADO_PAGO_GASTO_LABELS, TIPOS_ADJUNTO_GASTO, type Gasto, type TratamientoImpuestoGasto } from '../modelos/Gasto';
import type { CategoriaGasto } from '../modelos/CategoriaGasto';
import type { MonedaCompra } from '../../compras/modelos/tiposBaseCompras';
import {
  resolverEstadoPagoGasto,
  importeReconocidoComoGasto,
  type DatosNuevoGasto,
} from '../servicios/servicioGasto';
import { useContextoGastos } from '../contexto/useContextoGastos';
import { useCaja } from '../../control-caja/context/CajaContext';
import type { MedioPagoCompra } from '../../compras/modelos/PagoCompra';
import { TIPOS_DOCUMENTO_PROVEEDOR } from '../../compras/constantes/tiposDocumentoProveedor';

export type ModoDrawerGasto = 'crear' | 'editar' | 'ver';

interface DrawerGastoProps {
  modo: ModoDrawerGasto;
  gasto?: Gasto;
  valoresIniciales?: Omit<DatosNuevoGasto, 'fechaReconocimiento' | 'empresaId'>;
  categorias: CategoriaGasto[];
  establecimientos: Array<{ value: string; label: string }>;
  monedas: Array<{ code: string; label: string }>;
  monedaBase: string;
  empresaId: string;
  onCerrar: () => void;
  onGuardado: () => void;
}

function nuevoMedioPago(monto: number): MedioPagoCompra {
  return { id: `medio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, medioPagoCodigo: '', medioPagoNombre: '', monto };
}

export default function DrawerGasto({
  modo,
  gasto,
  valoresIniciales,
  categorias,
  establecimientos,
  monedas,
  monedaBase,
  empresaId,
  onCerrar,
  onGuardado,
}: DrawerGastoProps) {
  const feedback = useFeedback();
  const { registrarGasto, anularGasto, registrarPagoGasto, anularPagoGasto, obtenerCuentaPorPagarDeGasto, obtenerPagosDeGasto } = useContextoGastos();
  const { status: estadoCaja } = useCaja();
  const { accounts: cuentasBancarias } = useBankAccounts();

  const esFormulario = modo === 'crear' || modo === 'editar';
  const base = valoresIniciales ?? gasto;

  const [fechaReconocimiento, setFechaReconocimiento] = useState(gasto?.fechaReconocimiento?.slice(0, 10) ?? '');
  const [fechaEmision, setFechaEmision] = useState(base?.fechaEmision?.slice(0, 10) ?? '');
  const [fechaVencimiento, setFechaVencimiento] = useState(base?.fechaVencimiento?.slice(0, 10) ?? '');
  const [categoriaId, setCategoriaId] = useState(base?.categoriaId ?? categorias[0]?.id ?? '');
  const [establecimientoId, setEstablecimientoId] = useState(base?.establecimientoId ?? '');
  const [concepto, setConcepto] = useState(base?.concepto ?? '');
  const [proveedor, setProveedor] = useState<ProveedorSeleccionado | null>(
    base?.proveedorId
      ? { id: base.proveedorId, nombre: base.proveedorNombre ?? '', tipoDocumento: '', numeroDocumento: base.proveedorNumeroDocumento ?? '' }
      : null,
  );
  const [sinProveedorFormal, setSinProveedorFormal] = useState(!base?.proveedorId && Boolean(base?.beneficiario));
  const [beneficiario, setBeneficiario] = useState(base?.beneficiario ?? '');
  const [tipoDocumento, setTipoDocumento] = useState(base?.tipoDocumento ?? '');
  const [serieDocumentoProveedor, setSerieDocumentoProveedor] = useState(base?.serieDocumentoProveedor ?? '');
  const [numeroDocumentoProveedor, setNumeroDocumentoProveedor] = useState(base?.numeroDocumentoProveedor ?? '');
  const [moneda, setMoneda] = useState<MonedaCompra>(base?.moneda ?? (monedaBase as MonedaCompra));
  const [tipoCambio, setTipoCambio] = useState(base?.tipoCambio?.toString() ?? '');
  const [subtotal, setSubtotal] = useState(base?.subtotal?.toString() ?? '');
  const [impuesto, setImpuesto] = useState(base?.impuesto?.toString() ?? '0');
  const [tratamientoImpuesto, setTratamientoImpuesto] = useState<TratamientoImpuestoGasto>(base?.tratamientoImpuesto ?? 'sin_desglose');
  const [condicionPago, setCondicionPago] = useState<'contado' | 'credito'>(base?.condicionPago ?? 'contado');
  const [observaciones, setObservaciones] = useState(gasto?.observaciones ?? '');
  const [adjuntos, setAdjuntos] = useState(gasto?.adjuntos ?? []);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);

  const [mostrarPago, setMostrarPago] = useState(false);
  const [mediosPago, setMediosPago] = useState<MedioPagoCompra[]>([]);
  const [montoAplicado, setMontoAplicado] = useState('');
  const [claveIdempotenciaPago] = useState(() => `pago-gasto-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const [registrandoPago, setRegistrandoPago] = useState(false);

  const total = (Number(subtotal) || 0) + (Number(impuesto) || 0);

  const cuentaPorPagar = gasto ? obtenerCuentaPorPagarDeGasto(gasto) : undefined;
  const pagosDelGasto = gasto ? obtenerPagosDeGasto(gasto) : [];
  const estadoPago = resolverEstadoPagoGasto(cuentaPorPagar);
  const importeReconocido = gasto ? importeReconocidoComoGasto(gasto) : 0;

  const mediosDisponibles = useMemo(() => getConfiguredPaymentMeans().filter((m) => m.isVisible), []);
  const cuentasBancariasCompatibles = useMemo(
    () => cuentasBancarias.filter((c) => c.isVisible && c.currencyCode === (cuentaPorPagar?.moneda ?? moneda)),
    [cuentasBancarias, cuentaPorPagar, moneda],
  );
  const hayMedioDeCaja = mediosPago.some((m) => esMedioDeCaja(m.medioPagoCodigo));

  async function handleGuardar() {
    setErrores([]);
    const proveedorId = sinProveedorFormal ? undefined : proveedor?.id?.toString();
    const datos: DatosNuevoGasto = {
      empresaId,
      establecimientoId: establecimientoId || undefined,
      fechaReconocimiento,
      fechaEmision: fechaEmision || undefined,
      fechaVencimiento: condicionPago === 'credito' ? fechaVencimiento || undefined : undefined,
      categoriaId,
      concepto,
      proveedorId,
      proveedorNombre: sinProveedorFormal ? undefined : proveedor?.nombre,
      proveedorNumeroDocumento: sinProveedorFormal ? undefined : proveedor?.numeroDocumento,
      beneficiario: sinProveedorFormal ? beneficiario : undefined,
      tipoDocumento: tipoDocumento || undefined,
      serieDocumentoProveedor: serieDocumentoProveedor || undefined,
      numeroDocumentoProveedor: numeroDocumentoProveedor || undefined,
      moneda,
      tipoCambio: moneda !== monedaBase ? Number(tipoCambio) || undefined : undefined,
      subtotal: Number(subtotal) || 0,
      impuesto: Number(impuesto) || 0,
      total: Math.round(total * 100) / 100,
      tratamientoImpuesto,
      condicionPago,
      observaciones: observaciones || undefined,
      adjuntos,
    };

    setEnviando(true);
    try {
      await registrarGasto(datos);
      feedback.success('Gasto registrado correctamente.');
      onGuardado();
      onCerrar();
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo registrar el gasto.';
      setErrores(mensaje.split('. ').filter(Boolean));
    } finally {
      setEnviando(false);
    }
  }

  async function handleAnular() {
    if (!gasto) return;
    const confirmado = await feedback.openConfirm({
      title: 'Anular gasto',
      message: `¿Confirmas anular el gasto "${gasto.concepto}"?`,
      confirmText: 'Anular gasto',
      cancelText: 'Cancelar',
      icon: 'danger',
    });
    if (!confirmado) return;
    try {
      await anularGasto(gasto.id, 'Anulado por el usuario');
      feedback.success('Gasto anulado.');
      onGuardado();
      onCerrar();
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : 'No se pudo anular el gasto.');
    }
  }

  async function handleRegistrarPago() {
    if (!gasto) return;
    setRegistrandoPago(true);
    try {
      await registrarPagoGasto({
        gastoId: gasto.id,
        mediosPago,
        montoAplicado: Number(montoAplicado) || 0,
        claveIdempotencia: claveIdempotenciaPago,
      });
      feedback.success('Pago registrado correctamente.');
      setMostrarPago(false);
      setMediosPago([]);
      setMontoAplicado('');
      onGuardado();
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : 'No se pudo registrar el pago.');
    } finally {
      setRegistrandoPago(false);
    }
  }

  async function handleAnularPago(pagoId: string, numeroPago: string) {
    const confirmado = await feedback.openConfirm({
      title: 'Anular pago',
      message: `¿Confirmas anular el pago ${numeroPago}?`,
      confirmText: 'Anular pago',
      cancelText: 'Cancelar',
      icon: 'danger',
    });
    if (!confirmado) return;
    try {
      await anularPagoGasto(pagoId, 'Anulado por el usuario');
      feedback.success('Pago anulado.');
      onGuardado();
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : 'No se pudo anular el pago.');
    }
  }

  return (
    <Drawer
      abierto
      alCerrar={onCerrar}
      titulo={modo === 'ver' ? gasto?.concepto ?? 'Detalle del gasto' : modo === 'editar' ? 'Editar gasto' : 'Registrar gasto'}
      tamano="lg"
    >
      <div className="p-4 space-y-6 text-sm">
        {errores.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-xs space-y-1">
            {errores.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        )}

        {esFormulario ? (
          <>
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Datos generales</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">Fecha de reconocimiento *</span>
                  <input type="date" value={fechaReconocimiento} onChange={(e) => setFechaReconocimiento(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">Fecha de emisión</span>
                  <input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-xs text-gray-500">Categoría *</span>
                <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {categorias.filter((c) => c.estado === 'activa' || c.id === categoriaId).map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-gray-500">Establecimiento</span>
                <select value={establecimientoId} onChange={(e) => setEstablecimientoId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">General (toda la empresa)</option>
                  {establecimientos.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-gray-500">Concepto / descripción *</span>
                <input type="text" value={concepto} onChange={(e) => setConcepto(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Ej: Alquiler de local — julio" />
              </label>
            </section>

            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Proveedor o beneficiario</p>
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={sinProveedorFormal} onChange={(e) => setSinProveedorFormal(e.target.checked)} />
                Sin proveedor formal (movilidad, propinas, gastos sin documento)
              </label>
              {sinProveedorFormal ? (
                <input type="text" value={beneficiario} onChange={(e) => setBeneficiario(e.target.value)} placeholder="Nombre del beneficiario" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              ) : (
                <BuscadorProveedor proveedor={proveedor} onSeleccionar={setProveedor} />
              )}
            </section>

            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Documento sustentatorio</p>
              <label className="block space-y-1">
                <span className="text-xs text-gray-500">Tipo de documento</span>
                <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Sin documento</option>
                  {TIPOS_DOCUMENTO_PROVEEDOR.map((t) => <option key={t.codigo} value={t.codigo}>{t.nombre}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">Serie</span>
                  <input type="text" value={serieDocumentoProveedor} onChange={(e) => setSerieDocumentoProveedor(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">Número</span>
                  <input type="text" value={numeroDocumentoProveedor} onChange={(e) => setNumeroDocumentoProveedor(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Importes</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">Moneda *</span>
                  <select value={moneda} onChange={(e) => setMoneda(e.target.value as MonedaCompra)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    {monedas.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
                  </select>
                </label>
                {moneda !== monedaBase && (
                  <label className="space-y-1">
                    <span className="text-xs text-gray-500">Tipo de cambio *</span>
                    <input type="number" step="0.0001" value={tipoCambio} onChange={(e) => setTipoCambio(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </label>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">Subtotal *</span>
                  <input type="number" step="0.01" value={subtotal} onChange={(e) => setSubtotal(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">Impuesto</span>
                  <input type="number" step="0.01" value={impuesto} onChange={(e) => setImpuesto(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </label>
              </div>
              <p className="text-sm font-semibold text-gray-800">Total: {formatMoney(Math.round(total * 100) / 100, moneda)}</p>
              <label className="block space-y-1">
                <span className="text-xs text-gray-500">Tratamiento del impuesto</span>
                <select value={tratamientoImpuesto} onChange={(e) => setTratamientoImpuesto(e.target.value as TratamientoImpuestoGasto)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="sin_desglose">Sin desglose de impuesto</option>
                  <option value="recuperable">Impuesto recuperable</option>
                  <option value="no_recuperable">Impuesto no recuperable</option>
                </select>
              </label>
            </section>

            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Condición de pago</p>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="radio" checked={condicionPago === 'contado'} onChange={() => setCondicionPago('contado')} /> Contado
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="radio" checked={condicionPago === 'credito'} onChange={() => setCondicionPago('credito')} /> Crédito
                </label>
              </div>
              {condicionPago === 'credito' && (
                <label className="block space-y-1">
                  <span className="text-xs text-gray-500">Fecha de vencimiento *</span>
                  <input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </label>
              )}
            </section>

            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Adjuntos</p>
              <AdjuntosCompra
                adjuntos={adjuntos}
                tiposPermitidos={TIPOS_ADJUNTO_GASTO}
                onAgregar={(a) => setAdjuntos((prev) => [...prev, a])}
                onEliminar={(id) => setAdjuntos((prev) => prev.filter((a) => a.id !== id))}
              />
            </section>

            <label className="block space-y-1">
              <span className="text-xs text-gray-500">Observaciones</span>
              <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700">Cancelar</button>
              <button type="button" disabled={enviando} onClick={() => void handleGuardar()} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white disabled:opacity-50">
                {enviando ? 'Guardando...' : 'Registrar gasto'}
              </button>
            </div>
          </>
        ) : gasto ? (
          <>
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Datos generales</p>
              <p><span className="text-gray-500">Fecha de reconocimiento: </span>{gasto.fechaReconocimiento.slice(0, 10)}</p>
              <p><span className="text-gray-500">Categoría: </span>{categorias.find((c) => c.id === gasto.categoriaId)?.nombre ?? '—'}</p>
              <p><span className="text-gray-500">Establecimiento: </span>{establecimientos.find((e) => e.value === gasto.establecimientoId)?.label ?? 'General'}</p>
              <p><span className="text-gray-500">Proveedor/beneficiario: </span>{gasto.proveedorNombre ?? gasto.beneficiario ?? '—'}</p>
            </section>
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Documento sustentatorio</p>
              <p>{gasto.tipoDocumento ? `${gasto.tipoDocumento} ${gasto.serieDocumentoProveedor ?? ''}-${gasto.numeroDocumentoProveedor ?? ''}` : 'Sin documento'}</p>
            </section>
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Importes</p>
              <p><span className="text-gray-500">Total: </span>{formatMoney(gasto.total, gasto.moneda)}</p>
              <p><span className="text-gray-500">Reconocido como gasto: </span>{formatMoney(importeReconocido, gasto.moneda)}</p>
            </section>
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Condición y estado de pago</p>
              <p><span className="text-gray-500">Condición: </span>{gasto.condicionPago === 'credito' ? 'Crédito' : 'Contado'}</p>
              <p><span className="text-gray-500">Estado: </span>{gasto.estadoDocumento === 'anulado' ? 'Anulado' : ESTADO_PAGO_GASTO_LABELS[estadoPago]}</p>
              {cuentaPorPagar && <p><span className="text-gray-500">Saldo pendiente: </span>{formatMoney(cuentaPorPagar.saldoPendiente, cuentaPorPagar.moneda)}</p>}
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Pagos relacionados</p>
              {pagosDelGasto.length === 0 ? (
                <p className="text-gray-400">Sin pagos registrados.</p>
              ) : (
                <ul className="space-y-1">
                  {pagosDelGasto.map((p) => (
                    <li key={p.id} className="flex items-center justify-between border-b border-gray-100 py-1">
                      <span>{p.numeroPago} — {formatMoney(p.montoTotalPagado, p.moneda)} — {p.estadoDocumento === 'anulado' ? 'Anulado' : 'Registrado'}</span>
                      {p.estadoDocumento === 'registrado' && (
                        <button type="button" onClick={() => void handleAnularPago(p.id, p.numeroPago)} className="text-red-600 text-xs hover:underline">
                          Anular
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {gasto.estadoDocumento === 'registrado' && (estadoPago === 'pendiente' || estadoPago === 'parcial') && (
                <div className="mt-2">
                  {!mostrarPago ? (
                    <button type="button" onClick={() => { setMostrarPago(true); setMontoAplicado(String(cuentaPorPagar?.saldoPendiente ?? '')); setMediosPago([nuevoMedioPago(cuentaPorPagar?.saldoPendiente ?? 0)]); }} className="text-blue-600 text-xs font-medium hover:underline">
                      + Registrar pago
                    </button>
                  ) : (
                    <div className="mt-2 space-y-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <label className="block space-y-1">
                        <span className="text-xs text-gray-500">Importe a pagar</span>
                        <input type="number" step="0.01" value={montoAplicado} onChange={(e) => setMontoAplicado(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      </label>
                      <EditorMediosPagoCompra
                        mediosPago={mediosPago}
                        mediosDisponibles={mediosDisponibles}
                        cuentasBancariasCompatibles={cuentasBancariasCompatibles}
                        moneda={cuentaPorPagar?.moneda ?? moneda}
                        cajaAbierta={estadoCaja === 'abierta'}
                        hayMedioDeCaja={hayMedioDeCaja}
                        onAgregar={() => setMediosPago((prev) => [...prev, nuevoMedioPago(0)])}
                        onEliminar={(id) => setMediosPago((prev) => prev.filter((m) => m.id !== id))}
                        onCambiarMedio={(id, codigo) => {
                          const opcion = mediosDisponibles.find((m) => m.code === codigo);
                          setMediosPago((prev) => prev.map((m) => (m.id === id ? { ...m, medioPagoCodigo: codigo, medioPagoNombre: opcion?.label ?? '' } : m)));
                        }}
                        onCambiarCampo={(id, campo, valor) => setMediosPago((prev) => prev.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)))}
                      />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setMostrarPago(false)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-300">Cancelar</button>
                        <button type="button" disabled={registrandoPago} onClick={() => void handleRegistrarPago()} className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white disabled:opacity-50">
                          {registrandoPago ? 'Registrando...' : 'Confirmar pago'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Adjuntos</p>
              <AdjuntosCompra adjuntos={gasto.adjuntos} tiposPermitidos={TIPOS_ADJUNTO_GASTO} />
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Historial y auditoría</p>
              <ul className="space-y-1 text-xs text-gray-600">
                {gasto.historial.map((h, i) => (
                  <li key={i}>{h.fecha.slice(0, 10)} — {h.accion}{h.detalle ? `: ${h.detalle}` : ''}</li>
                ))}
              </ul>
            </section>

            {gasto.estadoDocumento === 'registrado' && (
              <div className="flex justify-end pt-2 border-t border-gray-200">
                <button type="button" onClick={() => void handleAnular()} className="px-4 py-2 text-sm rounded-lg border border-red-300 text-red-700 hover:bg-red-50">
                  Anular gasto
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </Drawer>
  );
}
