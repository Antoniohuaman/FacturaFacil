// gastos/componentes/DrawerGasto.tsx
//
// Drawer único para crear, editar y ver el detalle de un gasto. Mismo shell
// visual que Compras (`PanelDetalleComprobanteCompra.tsx`/`PanelDetallePagoCompra.tsx`):
// Drawer compartido (`@/shared/ui/drawer/Drawer`), header con chips + acciones,
// tabs internos del detalle (General/Pagos/Adjuntos/Historial — internos del
// Drawer, nunca tabs principales del módulo). El formulario reutiliza
// `BuscadorProveedor`, `EditorMediosPagoCompra`, `AdjuntosCompra`,
// `CreditScheduleModal`/`CreditScheduleSummaryCard` (crédito en cuotas) y el
// motor tributario de `servicioImpuestoGasto.ts` — nunca un cálculo manual de
// IGV, nunca un cronograma de cuotas paralelo.

import { useMemo, useState } from 'react';
import { Receipt, Clock, Wallet, Paperclip, XCircle, Printer, MoreHorizontal } from 'lucide-react';
import { Drawer } from '@/shared/ui/drawer/Drawer';
import { formatMoney } from '@/shared/currency';
import { useFeedback } from '@/shared/feedback/useFeedback';
import { useTenant } from '@/shared/tenant/TenantContext';
import { getConfiguredPaymentMeans } from '@/shared/payments/paymentMeans';
import { CreditScheduleModal } from '@/shared/payments/CreditScheduleModal';
import { CreditScheduleSummaryCard } from '@/shared/payments/CreditScheduleSummaryCard';
import { useCreditTermsConfigurator } from '@/shared/payments/useCreditTermsConfigurator';
import { useBankAccounts } from '../../configuracion-sistema/hooks/useCuentasBancarias';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import BuscadorProveedor, { type ProveedorSeleccionado } from '../../compras/componentes/BuscadorProveedor';
import EditorMediosPagoCompra from '../../compras/componentes/pagos/EditorMediosPagoCompra';
import AdjuntosCompra from '../../compras/componentes/adjuntos/AdjuntosCompra';
import { ModalAnularDocumento } from '@/shared/ui';
import { isCashPaymentMeanCode } from '@/shared/payments/paymentMeans';
import { formatearFecha } from '@/shared/formatters/fechas';
import { BADGE_ESTADO_PAGO } from '@/shared/status/estadoPago';
import { BADGE_ESTADO_DOCUMENTO_REGISTRABLE } from '@/shared/status/estadoDocumento';
import { MOTIVOS_ANULACION_PAGO } from '../../compras/constantes/motivosAnulacionCompras';
import { MOTIVOS_ANULACION_GASTO } from '../constantes/motivosAnulacionGasto';
import {
  ESTADO_PAGO_GASTO_LABELS,
  ESTADO_DOCUMENTO_GASTO_LABELS,
  TRATAMIENTO_IMPUESTO_GASTO_LABELS,
  TIPOS_ADJUNTO_GASTO,
  type Gasto,
  type TratamientoImpuestoGasto,
} from '../modelos/Gasto';
import type { CategoriaGasto } from '../modelos/CategoriaGasto';
import type { MonedaCompra } from '../../compras/modelos/tiposBaseCompras';
import {
  resolverEstadoPagoGasto,
  importeReconocidoComoGasto,
  type DatosNuevoGasto,
} from '../servicios/servicioGasto';
import { imprimirGasto, type EmpresaImpresionGasto } from '../servicios/servicioImpresionGasto';
import {
  listarImpuestosConfiguradosGasto,
  resolverImpuestoGasto,
  calcularImportesGastoDesdeSubtotal,
  calcularImportesGastoDesdeTotal,
  calcularImportesGastoSinDesglose,
} from '../servicios/servicioImpuestoGasto';
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

function BadgeEstado({ estado, labels, clases }: { estado: string; labels: Record<string, string>; clases: Record<string, string> }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${clases[estado] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[estado] ?? estado}
    </span>
  );
}

function Campo({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0 w-44">{label}</span>
      <span className="text-sm text-gray-900 text-right">{valor ?? '—'}</span>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">{titulo}</h3>
      <div className="bg-gray-50 rounded-lg px-4 py-1">{children}</div>
    </div>
  );
}

function nombreTipoDocumento(codigo: string | undefined): string {
  if (!codigo) return 'Sin documento';
  return TIPOS_DOCUMENTO_PROVEEDOR.find((t) => t.codigo === codigo)?.nombre ?? codigo;
}

type TabGasto = 'general' | 'pagos' | 'adjuntos' | 'historial';

type ModoIngresoImporte = 'subtotal' | 'total';

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
  const { state: config } = useConfigurationContext();
  const { activeWorkspace } = useTenant();
  const { registrarGasto, editarGasto, anularGasto, registrarPagoGasto, anularPagoGasto, obtenerCuentaPorPagarDeGasto, obtenerPagosDeGasto } = useContextoGastos();
  const { status: estadoCaja } = useCaja();
  const { accounts: cuentasBancarias } = useBankAccounts();

  const esFormulario = modo === 'crear' || modo === 'editar';
  const base = valoresIniciales ?? gasto;

  const [tabActivo, setTabActivo] = useState<TabGasto>('general');
  const [menuAccionesAbierto, setMenuAccionesAbierto] = useState(false);

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

  // Motor tributario (§12): el usuario nunca calcula el IGV a mano.
  const [tratamientoImpuesto, setTratamientoImpuesto] = useState<TratamientoImpuestoGasto>(base?.tratamientoImpuesto ?? 'sin_desglose');
  const [impuestoId, setImpuestoId] = useState(base?.impuestoId ?? '');
  const [modoIngreso, setModoIngreso] = useState<ModoIngresoImporte>('total');
  const [monto, setMonto] = useState((base?.total ?? '').toString());

  const [condicionPago, setCondicionPago] = useState<'contado' | 'credito'>(base?.condicionPago ?? 'contado');
  const [formaPagoMetodoId, setFormaPagoMetodoId] = useState(base?.formaPagoMetodoId ?? '');
  const [modalCuotasAbierto, setModalCuotasAbierto] = useState(false);

  const [observaciones, setObservaciones] = useState(gasto?.observaciones ?? '');
  const [adjuntos, setAdjuntos] = useState(gasto?.adjuntos ?? []);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);

  const [mostrarPago, setMostrarPago] = useState(false);
  const [mediosPago, setMediosPago] = useState<MedioPagoCompra[]>([]);
  const [montoAplicado, setMontoAplicado] = useState('');
  const [claveIdempotenciaPago] = useState(() => `pago-gasto-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const [registrandoPago, setRegistrandoPago] = useState(false);

  const [anulandoGasto, setAnulandoGasto] = useState(false);
  const [anulandoPago, setAnulandoPago] = useState<{ id: string; numeroPago: string } | null>(null);

  const impuestosDisponibles = useMemo(() => listarImpuestosConfiguradosGasto(config.taxes), [config.taxes]);
  const impuestoSeleccionado = useMemo(() => resolverImpuestoGasto(impuestoId, config.taxes), [impuestoId, config.taxes]);

  const importesCalculados = useMemo(() => {
    const montoNum = Number(monto) || 0;
    if (tratamientoImpuesto === 'sin_desglose') return calcularImportesGastoSinDesglose(montoNum);
    const tasa = impuestoSeleccionado?.tasa ?? 0;
    return modoIngreso === 'subtotal'
      ? calcularImportesGastoDesdeSubtotal(montoNum, tasa)
      : calcularImportesGastoDesdeTotal(montoNum, tasa);
  }, [monto, tratamientoImpuesto, modoIngreso, impuestoSeleccionado]);

  // Crédito y cuotas: MISMA fuente y motor que Compras (§3 de la corrección)
  // — la forma de pago configurada en Configuración de Negocio → Pagos
  // decide si hay cronograma (`PaymentMethod.code === 'CREDITO'`) e hidrata
  // su plantilla de cuotas (`PaymentMethod.creditSchedule`) vía el MISMO
  // hook que usa `FormularioComprobanteCompra.tsx`. Nunca un configurador
  // de crédito paralelo para Gastos.
  const metodosPagoActivos = useMemo(() => config.paymentMethods.filter((m) => m.isActive), [config.paymentMethods]);
  const metodoPagoSeleccionado = metodosPagoActivos.find((m) => m.id === formaPagoMetodoId);
  const {
    isCreditMethod,
    templates: plantillasCuotas,
    setTemplates: setPlantillasCuotas,
    creditTerms: cronogramaCuotas,
    errors: erroresCuotas,
    restoreDefaults: restaurarCuotasPorDefecto,
  } = useCreditTermsConfigurator({
    paymentMethodId: condicionPago === 'credito' ? formaPagoMetodoId : undefined,
    total: importesCalculados.total,
    issueDate: fechaReconocimiento || undefined,
    initialCreditTerms: gasto?.creditTerms,
  });

  const cuentaPorPagar = gasto ? obtenerCuentaPorPagarDeGasto(gasto) : undefined;
  const pagosDelGasto = gasto ? obtenerPagosDeGasto(gasto) : [];
  const estadoPago = resolverEstadoPagoGasto(cuentaPorPagar);
  const importeReconocido = gasto ? importeReconocidoComoGasto(gasto) : 0;

  const empresaImpresion: EmpresaImpresionGasto | undefined = activeWorkspace
    ? { razonSocial: activeWorkspace.razonSocial, ruc: activeWorkspace.ruc, direccion: activeWorkspace.domicilioFiscal }
    : undefined;

  function handleImprimir() {
    if (!gasto) return;
    void imprimirGasto({
      gasto,
      empresa: empresaImpresion,
      categoriaNombre: categorias.find((c) => c.id === gasto.categoriaId)?.nombre ?? 'Sin categoría',
      establecimientoNombre: establecimientos.find((e) => e.value === gasto.establecimientoId)?.label ?? 'General',
      cuentaPorPagar,
      pagos: pagosDelGasto,
      estadoPago,
    });
  }

  const mediosDisponibles = useMemo(() => getConfiguredPaymentMeans().filter((m) => m.isVisible), []);
  const cuentasBancariasCompatibles = useMemo(
    () => cuentasBancarias.filter((c) => c.isVisible && c.currencyCode === (cuentaPorPagar?.moneda ?? moneda)),
    [cuentasBancarias, cuentaPorPagar, moneda],
  );
  const hayMedioDeCaja = mediosPago.some((m) => isCashPaymentMeanCode(m.medioPagoCodigo));

  async function handleGuardar() {
    setErrores([]);
    const proveedorId = sinProveedorFormal ? undefined : proveedor?.id?.toString();
    const datos: DatosNuevoGasto = {
      empresaId,
      establecimientoId: establecimientoId || undefined,
      fechaReconocimiento,
      fechaEmision: fechaEmision || undefined,
      fechaVencimiento: condicionPago === 'credito' && !isCreditMethod ? fechaVencimiento || undefined : cronogramaCuotas?.fechaVencimientoGlobal,
      categoriaId,
      concepto,
      proveedorId,
      proveedorNombre: sinProveedorFormal ? undefined : proveedor?.nombre,
      proveedorNumeroDocumento: sinProveedorFormal ? undefined : proveedor?.numeroDocumento,
      beneficiario: sinProveedorFormal ? beneficiario : undefined,
      tipoDocumento: tipoDocumento || undefined,
      serieDocumentoProveedor: tipoDocumento ? serieDocumentoProveedor || undefined : undefined,
      numeroDocumentoProveedor: tipoDocumento ? numeroDocumentoProveedor || undefined : undefined,
      moneda,
      tipoCambio: moneda !== monedaBase ? Number(tipoCambio) || undefined : undefined,
      subtotal: importesCalculados.subtotal,
      impuesto: importesCalculados.impuesto,
      total: importesCalculados.total,
      tratamientoImpuesto,
      impuestoId: tratamientoImpuesto === 'sin_desglose' ? undefined : impuestoSeleccionado?.id,
      tasaImpuesto: tratamientoImpuesto === 'sin_desglose' ? undefined : impuestoSeleccionado?.tasa,
      condicionPago,
      formaPagoMetodoId: condicionPago === 'credito' ? formaPagoMetodoId || undefined : undefined,
      creditTerms: condicionPago === 'credito' && isCreditMethod ? cronogramaCuotas : undefined,
      observaciones: observaciones || undefined,
      adjuntos,
    };

    setEnviando(true);
    try {
      if (modo === 'editar' && gasto) {
        await editarGasto(gasto.id, datos);
        feedback.success('Gasto actualizado correctamente.');
      } else {
        await registrarGasto(datos);
        feedback.success('Gasto registrado correctamente.');
      }
      onGuardado();
      onCerrar();
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar el gasto.';
      setErrores(mensaje.split('. ').filter(Boolean));
    } finally {
      setEnviando(false);
    }
  }

  async function handleConfirmarAnularGasto(motivo: string) {
    if (!gasto) return;
    await anularGasto(gasto.id, motivo);
    feedback.success('Gasto anulado.');
    setAnulandoGasto(false);
    onGuardado();
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

  async function handleConfirmarAnularPago(motivo: string) {
    if (!anulandoPago) return;
    await anularPagoGasto(anulandoPago.id, motivo);
    feedback.success('Pago anulado.');
    setAnulandoPago(null);
    onGuardado();
  }

  const TABS: { id: TabGasto; label: string; icon: typeof Receipt }[] = [
    { id: 'general', label: 'General', icon: Receipt },
    { id: 'pagos', label: 'Pagos', icon: Wallet },
    { id: 'adjuntos', label: 'Adjuntos', icon: Paperclip },
    { id: 'historial', label: 'Historial', icon: Clock },
  ];

  const titulo = esFormulario
    ? (modo === 'editar' ? 'Editar gasto' : 'Registrar gasto')
    : gasto ? (
      <div className="flex min-w-0 items-center gap-2">
        <Receipt size={18} className="text-blue-600 shrink-0" />
        <span className="min-w-0 truncate font-mono font-semibold text-gray-900">{gasto.referenciaInterna}</span>
        <span className="min-w-0 truncate text-sm text-gray-500">— {gasto.concepto}</span>
      </div>
    ) : 'Detalle del gasto';

  const subtitulo = !esFormulario && gasto ? (
    <div className="flex flex-wrap gap-1 mt-1">
      <BadgeEstado estado={gasto.estadoDocumento} labels={ESTADO_DOCUMENTO_GASTO_LABELS} clases={BADGE_ESTADO_DOCUMENTO_REGISTRABLE} />
      <BadgeEstado estado={gasto.estadoDocumento === 'anulado' ? 'anulado' : estadoPago} labels={{ ...ESTADO_PAGO_GASTO_LABELS, anulado: 'Anulado' }} clases={{ ...BADGE_ESTADO_PAGO, anulado: 'bg-gray-100 text-gray-500' }} />
    </div>
  ) : null;

  const puedeAnularGastoActual = gasto ? gasto.estadoDocumento === 'registrado' && pagosDelGasto.every((p) => p.estadoDocumento === 'anulado') : false;
  const tienePagosActivos = pagosDelGasto.some((p) => p.estadoDocumento === 'registrado');

  const accionesEncabezado = !esFormulario && gasto ? (
    <div className="flex shrink-0 items-center gap-1">
      {gasto.estadoDocumento === 'registrado' && (estadoPago === 'pendiente' || estadoPago === 'parcial') && (
        <button
          type="button"
          title="Registrar pago"
          onClick={() => { setTabActivo('pagos'); setMostrarPago(true); setMontoAplicado(String(cuentaPorPagar?.saldoPendiente ?? '')); setMediosPago([nuevoMedioPago(cuentaPorPagar?.saldoPendiente ?? 0)]); }}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
        >
          <Wallet size={14} /> Registrar pago
        </button>
      )}
      {gasto.estadoDocumento === 'registrado' && (
        <button
          type="button"
          title={tienePagosActivos ? 'Anula primero los pagos relacionados' : 'Anular gasto'}
          disabled={!puedeAnularGastoActual}
          onClick={() => setAnulandoGasto(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <XCircle size={14} /> Anular
        </button>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuAccionesAbierto((v) => !v); }}
          title="Más acciones"
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <MoreHorizontal size={16} />
        </button>
        {menuAccionesAbierto && (
          <div className="absolute right-0 z-10 mt-2 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg" onClick={(e) => { e.stopPropagation(); setMenuAccionesAbierto(false); }}>
            <button type="button" onClick={handleImprimir} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50">
              <Printer size={14} /> Imprimir / Guardar PDF
            </button>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <Drawer
      abierto
      alCerrar={onCerrar}
      titulo={titulo}
      subtitulo={subtitulo}
      accionesEncabezado={accionesEncabezado}
      tamano="lg"
      pie={esFormulario ? (
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700">Cancelar</button>
          <button type="button" disabled={enviando} onClick={() => void handleGuardar()} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white disabled:opacity-50">
            {enviando ? 'Guardando...' : modo === 'editar' ? 'Guardar cambios' : 'Registrar gasto'}
          </button>
        </div>
      ) : undefined}
    >
      <div className="flex flex-col h-full">
        {errores.length > 0 && (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-xs space-y-1">
            {errores.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        )}

        {esFormulario ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
            <Seccion titulo="1. Datos generales">
              <div className="grid grid-cols-2 gap-3 py-2">
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">Fecha de reconocimiento *</span>
                  <input type="date" value={fechaReconocimiento} onChange={(e) => setFechaReconocimiento(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">Fecha de emisión</span>
                  <input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </label>
              </div>
              <label className="block space-y-1 py-2">
                <span className="text-xs text-gray-500">Categoría *</span>
                <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {categorias.filter((c) => c.estado === 'activa' || c.id === categoriaId).map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 py-2">
                <span className="text-xs text-gray-500">Establecimiento</span>
                <select value={establecimientoId} onChange={(e) => setEstablecimientoId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">General (toda la empresa)</option>
                  {establecimientos.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </label>
              <label className="block space-y-1 py-2">
                <span className="text-xs text-gray-500">Concepto / descripción *</span>
                <input type="text" value={concepto} onChange={(e) => setConcepto(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Ej: Alquiler de local — julio" />
              </label>
            </Seccion>

            <Seccion titulo="2. Proveedor o beneficiario">
              <label className="flex items-center gap-2 text-xs text-gray-600 py-2">
                <input type="checkbox" checked={sinProveedorFormal} onChange={(e) => setSinProveedorFormal(e.target.checked)} />
                Sin proveedor formal (movilidad, propinas, gastos sin documento)
              </label>
              <div className="py-2">
                {sinProveedorFormal ? (
                  <input type="text" value={beneficiario} onChange={(e) => setBeneficiario(e.target.value)} placeholder="Nombre del beneficiario" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                ) : (
                  <BuscadorProveedor proveedor={proveedor} onSeleccionar={setProveedor} />
                )}
              </div>
            </Seccion>

            <Seccion titulo="3. Documento sustentatorio">
              <label className="block space-y-1 py-2">
                <span className="text-xs text-gray-500">Tipo de documento</span>
                <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Sin documento</option>
                  {TIPOS_DOCUMENTO_PROVEEDOR.map((t) => <option key={t.codigo} value={t.codigo}>{t.nombre}</option>)}
                </select>
              </label>
              {tipoDocumento && (
                <div className="grid grid-cols-2 gap-3 py-2">
                  <label className="space-y-1">
                    <span className="text-xs text-gray-500">Serie</span>
                    <input type="text" value={serieDocumentoProveedor} onChange={(e) => setSerieDocumentoProveedor(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-gray-500">Número</span>
                    <input type="text" value={numeroDocumentoProveedor} onChange={(e) => setNumeroDocumentoProveedor(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </label>
                </div>
              )}
            </Seccion>

            <Seccion titulo="4. Importes">
              <div className="grid grid-cols-2 gap-3 py-2">
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

              <label className="block space-y-1 py-2">
                <span className="text-xs text-gray-500">Tratamiento del impuesto</span>
                <select
                  value={tratamientoImpuesto}
                  onChange={(e) => setTratamientoImpuesto(e.target.value as TratamientoImpuestoGasto)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {(Object.keys(TRATAMIENTO_IMPUESTO_GASTO_LABELS) as TratamientoImpuestoGasto[]).map((t) => (
                    <option key={t} value={t}>{TRATAMIENTO_IMPUESTO_GASTO_LABELS[t]}</option>
                  ))}
                </select>
              </label>

              {tratamientoImpuesto !== 'sin_desglose' && (
                <label className="block space-y-1 py-2">
                  <span className="text-xs text-gray-500">Impuesto aplicable *</span>
                  <select value={impuestoId} onChange={(e) => setImpuestoId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Selecciona un impuesto...</option>
                    {impuestosDisponibles.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                  </select>
                </label>
              )}

              {tratamientoImpuesto !== 'sin_desglose' && (
                <div className="py-2">
                  <span className="text-xs text-gray-500">¿El importe ingresado incluye impuesto?</span>
                  <div className="flex gap-3 mt-1">
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="radio" checked={modoIngreso === 'total'} onChange={() => setModoIngreso('total')} /> Sí (es el total)
                    </label>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="radio" checked={modoIngreso === 'subtotal'} onChange={() => setModoIngreso('subtotal')} /> No (es el subtotal)
                    </label>
                  </div>
                </div>
              )}

              <label className="block space-y-1 py-2">
                <span className="text-xs text-gray-500">{tratamientoImpuesto === 'sin_desglose' ? 'Total del gasto *' : modoIngreso === 'total' ? 'Total (incluye impuesto) *' : 'Subtotal (sin impuesto) *'}</span>
                <input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </label>

              <div className="py-2 space-y-1">
                <Campo label="Subtotal" valor={formatMoney(importesCalculados.subtotal, moneda)} />
                <Campo label="Impuesto" valor={formatMoney(importesCalculados.impuesto, moneda)} />
                <Campo label="Total" valor={<span className="font-semibold text-gray-900">{formatMoney(importesCalculados.total, moneda)}</span>} />
                <Campo label="Importe reconocido como gasto" valor={formatMoney(tratamientoImpuesto === 'recuperable' ? importesCalculados.subtotal : importesCalculados.total, moneda)} />
              </div>
            </Seccion>

            <Seccion titulo="5. Condición de pago">
              <div className="flex gap-3 py-2">
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="radio" checked={condicionPago === 'contado'} onChange={() => setCondicionPago('contado')} /> Contado
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="radio" checked={condicionPago === 'credito'} onChange={() => setCondicionPago('credito')} /> Crédito
                </label>
              </div>
              {condicionPago === 'credito' && (
                <>
                  <label className="block space-y-1 py-2">
                    <span className="text-xs text-gray-500">Forma de pago / condición de crédito</span>
                    <select value={formaPagoMetodoId} onChange={(e) => setFormaPagoMetodoId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">Crédito simple (sin cronograma configurado)</option>
                      {metodosPagoActivos.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </label>
                  {isCreditMethod ? (
                    <div className="py-2">
                      <CreditScheduleSummaryCard
                        creditTerms={cronogramaCuotas}
                        currency={moneda}
                        total={importesCalculados.total}
                        onConfigure={() => setModalCuotasAbierto(true)}
                        errors={erroresCuotas}
                        paymentMethodName={metodoPagoSeleccionado?.name}
                        showStatusColumn={false}
                      />
                    </div>
                  ) : (
                    <label className="block space-y-1 py-2">
                      <span className="text-xs text-gray-500">Fecha de vencimiento *</span>
                      <input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </label>
                  )}
                </>
              )}
            </Seccion>

            <Seccion titulo="6. Adjuntos">
              <div className="py-2">
                <AdjuntosCompra
                  adjuntos={adjuntos}
                  tiposPermitidos={TIPOS_ADJUNTO_GASTO}
                  onAgregar={(a) => setAdjuntos((prev) => [...prev, a])}
                  onEliminar={(id) => setAdjuntos((prev) => prev.filter((a) => a.id !== id))}
                />
              </div>
            </Seccion>

            <Seccion titulo="7. Observaciones">
              <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className="w-full border-0 bg-transparent px-0 py-2 text-sm focus:outline-none focus:ring-0" placeholder="Observaciones opcionales" />
            </Seccion>
          </div>
        ) : gasto ? (
          <>
            <div className="flex border-b border-gray-200 px-4 shrink-0">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setTabActivo(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
                      tabActivo === tab.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon size={13} />
                    {tab.label}
                    {tab.id === 'pagos' && pagosDelGasto.length > 0 && <span className="text-gray-400">({pagosDelGasto.length})</span>}
                    {tab.id === 'adjuntos' && gasto.adjuntos.length > 0 && <span className="text-gray-400">({gasto.adjuntos.length})</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {tabActivo === 'general' && (
                <>
                  <Seccion titulo="Proveedor o beneficiario">
                    <Campo label="Nombre" valor={gasto.proveedorNombre ?? gasto.beneficiario ?? 'Sin proveedor'} />
                    {gasto.proveedorNumeroDocumento && <Campo label="Documento" valor={gasto.proveedorNumeroDocumento} />}
                  </Seccion>

                  <Seccion titulo="Datos del gasto">
                    <Campo label="Referencia interna" valor={<span className="font-mono">{gasto.referenciaInterna}</span>} />
                    <Campo label="Concepto" valor={gasto.concepto} />
                    <Campo label="Categoría" valor={categorias.find((c) => c.id === gasto.categoriaId)?.nombre ?? '—'} />
                    <Campo label="Fecha de reconocimiento" valor={formatearFecha(gasto.fechaReconocimiento)} />
                    {gasto.fechaEmision && <Campo label="Fecha de emisión" valor={formatearFecha(gasto.fechaEmision)} />}
                    <Campo label="Establecimiento" valor={establecimientos.find((e) => e.value === gasto.establecimientoId)?.label ?? 'General'} />
                    {gasto.creadoPor && <Campo label="Registrado por" valor={gasto.creadoPor} />}
                  </Seccion>

                  <Seccion titulo="Documento sustentatorio">
                    {gasto.tipoDocumento ? (
                      <>
                        <Campo label="Tipo de documento" valor={nombreTipoDocumento(gasto.tipoDocumento)} />
                        <Campo label="Serie" valor={gasto.serieDocumentoProveedor || '—'} />
                        <Campo label="Número" valor={gasto.numeroDocumentoProveedor || '—'} />
                      </>
                    ) : (
                      <p className="text-sm text-gray-400 py-2">Sin documento</p>
                    )}
                  </Seccion>

                  <Seccion titulo="Importes">
                    <Campo label="Subtotal" valor={formatMoney(gasto.subtotal, gasto.moneda)} />
                    <Campo label="Impuesto" valor={formatMoney(gasto.impuesto, gasto.moneda)} />
                    <Campo label="Total" valor={<span className="font-semibold text-gray-900">{formatMoney(gasto.total, gasto.moneda)}</span>} />
                    <Campo label="Tratamiento del impuesto" valor={TRATAMIENTO_IMPUESTO_GASTO_LABELS[gasto.tratamientoImpuesto]} />
                    <Campo label="Importe reconocido como gasto" valor={formatMoney(importeReconocido, gasto.moneda)} />
                    <Campo label="Moneda" valor={gasto.moneda} />
                    {gasto.tipoCambio && <Campo label="Tipo de cambio" valor={gasto.tipoCambio.toFixed(4)} />}
                  </Seccion>

                  <Seccion titulo="Condición de pago">
                    <Campo label="Condición" valor={gasto.condicionPago === 'credito' ? 'Crédito' : 'Contado'} />
                    {gasto.formaPagoMetodoId && (
                      <Campo label="Forma de pago" valor={config.paymentMethods.find((m) => m.id === gasto.formaPagoMetodoId)?.name ?? '—'} />
                    )}
                    {gasto.fechaVencimiento && <Campo label="Vencimiento" valor={formatearFecha(gasto.fechaVencimiento)} />}
                    {cuentaPorPagar && <Campo label="Saldo pendiente" valor={formatMoney(cuentaPorPagar.saldoPendiente, cuentaPorPagar.moneda)} />}
                    <Campo label="Estado de pago" valor={<BadgeEstado estado={estadoPago} labels={ESTADO_PAGO_GASTO_LABELS} clases={BADGE_ESTADO_PAGO} />} />
                  </Seccion>

                  {gasto.creditTerms && gasto.creditTerms.schedule.length > 0 && (
                    <Seccion titulo="Cronograma de cuotas">
                      <div className="py-2">
                        <CreditScheduleSummaryCard creditTerms={gasto.creditTerms} currency={gasto.moneda} total={gasto.total} showStatusColumn />
                      </div>
                    </Seccion>
                  )}

                  {gasto.observaciones && (
                    <Seccion titulo="Observaciones">
                      <p className="text-sm text-gray-700 py-2">{gasto.observaciones}</p>
                    </Seccion>
                  )}

                  {gasto.estadoDocumento === 'anulado' && gasto.motivoAnulacion && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                      <strong>Motivo de anulación:</strong> {gasto.motivoAnulacion}
                    </div>
                  )}
                </>
              )}

              {tabActivo === 'pagos' && (
                <>
                  {pagosDelGasto.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Aún no se registró ningún pago.</p>
                  ) : (
                    <div className="space-y-3">
                      {pagosDelGasto.map((p) => (
                        <div key={p.id} className="rounded-lg border border-gray-200 p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm font-semibold text-gray-900">{p.numeroPago}</span>
                            <BadgeEstado estado={p.estadoDocumento} labels={ESTADO_DOCUMENTO_GASTO_LABELS} clases={BADGE_ESTADO_DOCUMENTO_REGISTRABLE} />
                          </div>
                          <Campo label="Fecha" valor={formatearFecha(p.fechaPago)} />
                          <Campo label="Importe" valor={formatMoney(p.montoTotalPagado, p.moneda)} />
                          <Campo label="Medio(s) de pago" valor={p.mediosPago.map((m) => m.medioPagoNombre).join(', ') || '—'} />
                          {p.creadoPor && <Campo label="Usuario" valor={p.creadoPor} />}
                          {p.estadoDocumento === 'registrado' && (
                            <div className="flex justify-end pt-1">
                              <button type="button" onClick={() => setAnulandoPago({ id: p.id, numeroPago: p.numeroPago })} className="text-red-600 text-xs font-medium hover:underline">
                                Anular pago
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {gasto.estadoDocumento === 'registrado' && (estadoPago === 'pendiente' || estadoPago === 'parcial') && (
                    <div className="pt-2 border-t border-gray-100">
                      {!mostrarPago ? (
                        <button
                          type="button"
                          onClick={() => { setMostrarPago(true); setMontoAplicado(String(cuentaPorPagar?.saldoPendiente ?? '')); setMediosPago([nuevoMedioPago(cuentaPorPagar?.saldoPendiente ?? 0)]); }}
                          className="mt-2 text-blue-600 text-xs font-medium hover:underline"
                        >
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
                </>
              )}

              {tabActivo === 'adjuntos' && (
                <AdjuntosCompra adjuntos={gasto.adjuntos} tiposPermitidos={TIPOS_ADJUNTO_GASTO} />
              )}

              {tabActivo === 'historial' && (
                gasto.historial.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Sin eventos registrados.</p>
                ) : (
                  <div className="relative pl-5 space-y-4">
                    <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-gray-200" />
                    {[...gasto.historial].reverse().map((evt, i) => (
                      <div key={i} className="relative flex gap-3">
                        <div className="absolute -left-3.5 w-3 h-3 rounded-full bg-white border-2 border-blue-400 mt-1" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-gray-700">{evt.accion}</span>
                            {evt.usuario && <span className="text-xs text-gray-500">por {evt.usuario}</span>}
                          </div>
                          <p className="text-xs text-gray-400">{formatearFecha(evt.fecha)} {evt.fecha.split('T')[1]?.slice(0, 5) ?? ''}</p>
                          {evt.detalle && <p className="text-xs text-gray-600 mt-0.5">{evt.detalle}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </>
        ) : null}
      </div>

      {gasto && (
        <ModalAnularDocumento
          abierto={anulandoGasto}
          titulo="Anular gasto"
          descripcion={`¿Confirmas anular el gasto "${gasto.concepto}"? Esta acción no elimina el registro, solo lo marca como anulado.`}
          motivos={[...MOTIVOS_ANULACION_GASTO]}
          onConfirmar={handleConfirmarAnularGasto}
          onCerrar={() => setAnulandoGasto(false)}
        />
      )}

      <ModalAnularDocumento
        abierto={anulandoPago !== null}
        titulo="Anular pago"
        descripcion={`¿Confirmas anular el pago ${anulandoPago?.numeroPago ?? ''}? Se revertirá el saldo de la cuenta por pagar y, si corresponde, se registrará la compensación en Caja.`}
        motivos={[...MOTIVOS_ANULACION_PAGO]}
        onConfirmar={handleConfirmarAnularPago}
        onCerrar={() => setAnulandoPago(null)}
      />

      <CreditScheduleModal
        isOpen={modalCuotasAbierto}
        templates={plantillasCuotas}
        onChange={setPlantillasCuotas}
        onSave={() => setModalCuotasAbierto(false)}
        onCancel={() => { restaurarCuotasPorDefecto(); setModalCuotasAbierto(false); }}
        onRestoreDefaults={restaurarCuotasPorDefecto}
        errors={erroresCuotas}
        paymentMethodName={metodoPagoSeleccionado?.name}
      />
    </Drawer>
  );
}
