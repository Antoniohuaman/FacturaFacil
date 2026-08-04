// gastos/componentes/DrawerGasto.tsx
//
// Drawer de SOLO CONSULTA del detalle de un gasto (§1/§9/§16 de la
// corrección — registrar/editar viven en una página completa,
// `FormularioGasto.tsx`, nunca en este Drawer). Mismo shell visual que
// Compras (`PanelDetalleComprobanteCompra.tsx`): Drawer compartido
// (`@/shared/ui/drawer/Drawer`), header con chips + acciones, tabs internos
// del detalle (General/Pagos/Adjuntos/Historial — internos del Drawer,
// nunca tabs principales del módulo).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Clock, Wallet, Paperclip, XCircle, Trash2, Printer, Pencil, MoreHorizontal } from 'lucide-react';
import { Drawer } from '@/shared/ui/drawer/Drawer';
import { formatMoney } from '@/shared/currency';
import { useFeedback } from '@/shared/feedback/useFeedback';
import { useTenant } from '@/shared/tenant/TenantContext';
import { CreditScheduleSummaryCard } from '@/shared/payments/CreditScheduleSummaryCard';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import AdjuntosCompra from '../../compras/componentes/adjuntos/AdjuntosCompra';
import { ModalAnularDocumento } from '@/shared/ui';
import { formatearFecha } from '@/shared/formatters/fechas';
import { BADGE_ESTADO_PAGO } from '@/shared/status/estadoPago';
import { BADGE_ESTADO_DOCUMENTO_REGISTRABLE } from '@/shared/status/estadoDocumento';
import { MOTIVOS_ANULACION_PAGO } from '../../compras/constantes/motivosAnulacionCompras';
import { MOTIVOS_ANULACION_GASTO } from '../constantes/motivosAnulacionGasto';
import {
  ESTADO_PAGO_GASTO_LABELS,
  ESTADO_DOCUMENTO_GASTO_LABELS,
  BADGE_ESTADO_DOCUMENTO_GASTO,
  TRATAMIENTO_IMPUESTO_GASTO_LABELS,
  TIPOS_ADJUNTO_GASTO,
  type Gasto,
} from '../modelos/Gasto';
import type { CategoriaGasto } from '../modelos/CategoriaGasto';
import {
  resolverEstadoPagoGasto,
  importeReconocidoComoGasto,
  nombreDocumentoSustentatorioGasto,
  puedeEditarGasto,
  tienePagosActivosGasto,
  presentarReferenciaGasto,
  presentarEstadoDocumentoGasto,
  ETIQUETA_ALCANCE_TODA_EMPRESA,
} from '../servicios/servicioGasto';
import { imprimirGasto, type EmpresaImpresionGasto } from '../servicios/servicioImpresionGasto';
import { useContextoGastos } from '../contexto/useContextoGastos';

interface DrawerGastoProps {
  gasto: Gasto;
  categorias: CategoriaGasto[];
  establecimientos: Array<{ value: string; label: string }>;
  /** Pestaña con la que abre el Drawer — usada para dar acceso DIRECTO a "Pagos" cuando el listado bloquea "Anular gasto" por pagos activos (§12 de la corrección final). `undefined` abre en "general", como siempre. */
  pestanaInicial?: TabGasto;
  onCerrar: () => void;
  onEditar: (gasto: Gasto) => void;
  onGuardado: () => void;
}

function BadgeEstado({ estado, labels, clases, etiqueta }: { estado: string; labels: Record<string, string>; clases: Record<string, string>; etiqueta?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${clases[estado] ?? 'bg-gray-100 text-gray-600'}`}>
      {etiqueta ?? labels[estado] ?? estado}
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

type TabGasto = 'general' | 'pagos' | 'adjuntos' | 'historial';

export default function DrawerGasto({ gasto, categorias, establecimientos, pestanaInicial, onCerrar, onEditar, onGuardado }: DrawerGastoProps) {
  const feedback = useFeedback();
  const navigate = useNavigate();
  const { state: config } = useConfigurationContext();
  const { activeWorkspace } = useTenant();
  const { anularGasto, descartarBorradorGasto, anularPagoGasto, obtenerCuentaPorPagarDeGasto, obtenerPagosDeGasto } = useContextoGastos();

  const [tabActivo, setTabActivo] = useState<TabGasto>(pestanaInicial ?? 'general');
  const [menuAccionesAbierto, setMenuAccionesAbierto] = useState(false);

  const [anulandoGasto, setAnulandoGasto] = useState(false);
  const [descartandoBorrador, setDescartandoBorrador] = useState(false);
  const [anulandoPago, setAnulandoPago] = useState<{ id: string; numeroPago: string } | null>(null);

  const cuentaPorPagar = obtenerCuentaPorPagarDeGasto(gasto);
  const pagosDelGasto = obtenerPagosDeGasto(gasto);
  const estadoPago = resolverEstadoPagoGasto(cuentaPorPagar);
  const importeReconocido = importeReconocidoComoGasto(gasto);
  const esBorrador = gasto.estadoDocumento === 'borrador';

  const empresaImpresion: EmpresaImpresionGasto | undefined = activeWorkspace
    ? { razonSocial: activeWorkspace.razonSocial, ruc: activeWorkspace.ruc, direccion: activeWorkspace.domicilioFiscal }
    : undefined;

  function handleImprimir() {
    void imprimirGasto({
      gasto,
      empresa: empresaImpresion,
      categoriaNombre: categorias.find((c) => c.id === gasto.categoriaId)?.nombre ?? 'Sin categoría',
      establecimientoNombre: establecimientos.find((e) => e.value === gasto.establecimientoId)?.label ?? ETIQUETA_ALCANCE_TODA_EMPRESA,
      formaPagoNombre: config.paymentMethods.find((m) => m.id === gasto.formaPagoMetodoId)?.name,
      cuentaPorPagar,
      pagos: pagosDelGasto,
      estadoPago,
      series: config.series,
    });
  }

  function irARegistrarPago() {
    navigate(`/gastos/${gasto.id}/pagar`);
  }

  async function handleConfirmarAnularGasto(motivo: string) {
    await anularGasto(gasto.id, motivo);
    feedback.success('Gasto anulado.');
    setAnulandoGasto(false);
    onGuardado();
  }

  async function handleConfirmarDescartarBorrador() {
    await descartarBorradorGasto(gasto.id);
    feedback.success('Borrador descartado.');
    setDescartandoBorrador(false);
    onGuardado();
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

  const titulo = (
    <div className="flex min-w-0 items-center gap-2">
      <Receipt size={18} className="text-blue-600 shrink-0" />
      <span className={`min-w-0 truncate font-semibold ${esBorrador ? 'text-gray-500 italic' : 'font-mono text-gray-900'}`}>{presentarReferenciaGasto(gasto, config.series)}</span>
      <span className="min-w-0 truncate text-sm text-gray-500">— {gasto.concepto}</span>
    </div>
  );

  const subtitulo = (
    <div className="flex flex-wrap gap-1 mt-1">
      <BadgeEstado estado={gasto.estadoDocumento} labels={ESTADO_DOCUMENTO_GASTO_LABELS} clases={BADGE_ESTADO_DOCUMENTO_GASTO} etiqueta={presentarEstadoDocumentoGasto(gasto)} />
      {gasto.estadoDocumento !== 'borrador' && (
        <BadgeEstado estado={gasto.estadoDocumento === 'anulado' ? 'anulado' : estadoPago} labels={{ ...ESTADO_PAGO_GASTO_LABELS, anulado: 'Anulado' }} clases={{ ...BADGE_ESTADO_PAGO, anulado: 'bg-gray-100 text-gray-500' }} />
      )}
    </div>
  );

  const tienePagosActivos = tienePagosActivosGasto(cuentaPorPagar, pagosDelGasto);
  const esEditable = puedeEditarGasto(gasto, cuentaPorPagar, pagosDelGasto);

  const accionesEncabezado = (
    <div className="flex shrink-0 items-center gap-1">
      {gasto.estadoDocumento !== 'anulado' && (
        <button
          type="button"
          title={esEditable ? (esBorrador ? 'Editar / Registrar' : 'Editar') : 'Un gasto con pagos aplicados ya no puede editarse'}
          disabled={!esEditable}
          onClick={() => onEditar(gasto)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <Pencil size={14} /> {esBorrador ? 'Editar / Registrar' : 'Editar'}
        </button>
      )}
      {esBorrador && (
        <button
          type="button"
          title="Descartar borrador"
          onClick={() => setDescartandoBorrador(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <Trash2 size={14} /> Descartar
        </button>
      )}
      {gasto.estadoDocumento === 'registrado' && (estadoPago === 'pendiente' || estadoPago === 'parcial') && (
        <button
          type="button"
          title="Registrar pago"
          onClick={irARegistrarPago}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
        >
          <Wallet size={14} /> Registrar pago
        </button>
      )}
      {gasto.estadoDocumento === 'registrado' && (
        <button
          type="button"
          title={tienePagosActivos ? 'Anula primero los pagos relacionados' : 'Anular gasto'}
          onClick={() => {
            if (tienePagosActivos) {
              feedback.warning('Este gasto tiene pagos activos. Anula primero los pagos relacionados para poder anular el gasto.');
              setTabActivo('pagos');
              return;
            }
            setAnulandoGasto(true);
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
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
  );

  return (
    <Drawer abierto alCerrar={onCerrar} titulo={titulo} subtitulo={subtitulo} accionesEncabezado={accionesEncabezado} tamano="lg">
      <div className="flex flex-col h-full">
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
                <Campo label="Referencia interna" valor={<span className={esBorrador ? 'italic text-gray-500' : 'font-mono'}>{presentarReferenciaGasto(gasto, config.series)}</span>} />
                <Campo label="Concepto" valor={gasto.concepto} />
                <Campo label="Categoría" valor={categorias.find((c) => c.id === gasto.categoriaId)?.nombre ?? '—'} />
                <Campo label="Fecha del gasto" valor={formatearFecha(gasto.fechaReconocimiento)} />
                {gasto.tipoDocumento && gasto.fechaEmision && <Campo label="Fecha del documento" valor={formatearFecha(gasto.fechaEmision)} />}
                <Campo label="Fecha de registro" valor={`${formatearFecha(gasto.fechaCreacion)} ${gasto.fechaCreacion.slice(11, 16)}`.trim()} />
                <Campo label="Aplica a" valor={establecimientos.find((e) => e.value === gasto.establecimientoId)?.label ?? ETIQUETA_ALCANCE_TODA_EMPRESA} />
                {gasto.creadoPor && <Campo label="Registrado por" valor={gasto.creadoPor} />}
              </Seccion>

              <Seccion titulo="Documento sustentatorio">
                {gasto.tipoDocumento ? (
                  <Campo label="Documento" valor={nombreDocumentoSustentatorioGasto(gasto)} />
                ) : (
                  <p className="text-sm text-gray-400 py-2">Sin documento</p>
                )}
              </Seccion>

              <Seccion titulo="Importes">
                <Campo label="Subtotal" valor={formatMoney(gasto.subtotal, gasto.moneda)} />
                <Campo label="IGV" valor={formatMoney(gasto.impuesto, gasto.moneda)} />
                <Campo label="Total" valor={<span className="font-semibold text-gray-900">{formatMoney(gasto.total, gasto.moneda)}</span>} />
                <Campo label="Tratamiento del IGV" valor={TRATAMIENTO_IMPUESTO_GASTO_LABELS[gasto.tratamientoImpuesto]} />
                <Campo label="Importe que afecta la rentabilidad" valor={formatMoney(importeReconocido, gasto.moneda)} />
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
                  <button
                    type="button"
                    onClick={irARegistrarPago}
                    className="mt-2 text-blue-600 text-xs font-medium hover:underline"
                  >
                    + Registrar pago
                  </button>
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
      </div>

      <ModalAnularDocumento
        abierto={anulandoGasto}
        titulo="Anular gasto"
        descripcion={`¿Confirmas anular el gasto "${gasto.concepto}"? Esta acción no elimina el registro, solo lo marca como anulado.`}
        motivos={[...MOTIVOS_ANULACION_GASTO]}
        onConfirmar={handleConfirmarAnularGasto}
        onCerrar={() => setAnulandoGasto(false)}
      />

      <ModalAnularDocumento
        abierto={descartandoBorrador}
        titulo="Descartar borrador"
        descripcion={`¿Confirmas descartar el borrador "${gasto.concepto}"? Nunca fue registrado oficialmente — el registro se conserva para auditoría, pero deja de estar disponible como borrador.`}
        motivos={[...MOTIVOS_ANULACION_GASTO]}
        etiquetaMotivo="Motivo del descarte"
        textoBotonConfirmar="Confirmar descarte"
        textoProcesando="Descartando..."
        onConfirmar={handleConfirmarDescartarBorrador}
        onCerrar={() => setDescartandoBorrador(false)}
      />

      <ModalAnularDocumento
        abierto={anulandoPago !== null}
        titulo="Anular pago"
        descripcion={`¿Confirmas anular el pago ${anulandoPago?.numeroPago ?? ''}? Se revertirá el saldo de la cuenta por pagar y, si corresponde, se registrará la compensación en Caja.`}
        motivos={[...MOTIVOS_ANULACION_PAGO]}
        onConfirmar={handleConfirmarAnularPago}
        onCerrar={() => setAnulandoPago(null)}
      />
    </Drawer>
  );
}
