import { useState } from 'react';
import { Wallet, Link2, Clock, Printer } from 'lucide-react';
import { Drawer } from '@/shared/ui/drawer/Drawer';
import { formatMoney } from '@/shared/currency';
import { useBankAccounts } from '../../../configuracion-sistema/hooks/useCuentasBancarias';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import AdjuntosCompra from '../adjuntos/AdjuntosCompra';
import type { PagoCompra } from '../../modelos/PagoCompra';
import { ESTADO_DOCUMENTO_PAGO_LABELS } from '../../modelos/PagoCompra';
import type { CuentaPorPagar } from '../../modelos/CuentaPorPagar';
import { ESTADO_PAGO_CXP_LABELS } from '../../modelos/CuentaPorPagar';
import type { ComprobanteCompra } from '../../modelos/ComprobanteCompra';
import type { OrdenCompra } from '../../modelos/OrdenCompra';
import { BADGE_ESTADO_DOCUMENTO_PAGO, BADGE_ESTADO_PAGO_CXP } from '../../constantes/estadosCompras';
import { TIPOS_DOCUMENTO_PROVEEDOR_POR_CODIGO } from '../../constantes/tiposDocumentoProveedor';
import { tieneMedioDeCaja } from '../../servicios/servicioPagoCompra';
import { obtenerAplicacionesPago } from '../../logica/reglasCompras';
import { formatearFechaCompra, formatearNumeroCompra, formatearNumeroComprobanteCompra } from '../../utilidades/formatearCompras';

interface PanelDetallePagoCompraProps {
  pago: PagoCompra | null;
  cuentasPorPagar: CuentaPorPagar[];
  comprobantes: ComprobanteCompra[];
  ordenes: OrdenCompra[];
  onCerrar: () => void;
  onVerCuentaPorPagar?: (cxp: CuentaPorPagar) => void;
  onVerComprobante?: (cc: ComprobanteCompra) => void;
  onVerOrdenCompra?: (oc: OrdenCompra) => void;
  onImprimir?: (pago: PagoCompra) => void;
}

type TabPago = 'general' | 'relacionados' | 'historial';

function BadgeEstado({
  estado,
  labels,
  clases,
}: {
  estado: string;
  labels: Record<string, string>;
  clases: Record<string, string>;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${clases[estado] ?? 'bg-gray-100 text-gray-600'}`}
    >
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

/** Acción principal visible del header (icono + texto corto). Mismo patrón que PanelDetalleComprobanteCompra. */
function BotonEncabezado({
  icon: Icon,
  texto,
  label,
  onClick,
}: {
  icon: typeof Wallet;
  texto: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
    >
      <Icon size={14} /> {texto}
    </button>
  );
}

export default function PanelDetallePagoCompra({
  pago,
  cuentasPorPagar,
  comprobantes,
  ordenes,
  onCerrar,
  onVerCuentaPorPagar,
  onVerComprobante,
  onVerOrdenCompra,
  onImprimir,
}: PanelDetallePagoCompraProps) {
  const { accounts: cuentasBancarias } = useBankAccounts();
  const { state: config } = useConfigurationContext();
  const [tabActivo, setTabActivo] = useState<TabPago>('general');

  // Documentos aplicados reales (1 o varios — obtenerAplicacionesPago
  // resuelve tanto pagos nuevos como legacy de un único documento por
  // igual). Cada aplicación resuelve su propia CxP, el Comprobante de
  // Compra correspondiente y, si existe, la Orden de Compra de origen de
  // ese comprobante — nunca se asume que todos los documentos vienen de la
  // misma OC.
  const aplicacionesResueltas = pago
    ? obtenerAplicacionesPago(pago).map((aplicacion) => {
        const cxp = cuentasPorPagar.find((c) => c.id === aplicacion.cuentaPorPagarId);
        const comprobante =
          comprobantes.find((c) => c.id === aplicacion.comprobanteCompraId) ??
          (cxp ? comprobantes.find((c) => c.id === cxp.comprobanteCompraId) : undefined);
        const oc = comprobante ? ordenes.find((o) => o.id === comprobante.ordenCompraOrigenId) : undefined;
        return { aplicacion, cxp, comprobante, oc };
      })
    : [];
  const cajaUtilizada = pago?.cajaId ? config.cajas.find((c) => c.id === pago.cajaId) : undefined;
  const hayMovimientoCajaDerivado = pago ? !cajaUtilizada && tieneMedioDeCaja(pago.mediosPago) : false;

  const TABS: { id: TabPago; label: string; icon: typeof Wallet }[] = [
    { id: 'general', label: 'General', icon: Wallet },
    { id: 'relacionados', label: 'Documentos relacionados', icon: Link2 },
    { id: 'historial', label: 'Historial', icon: Clock },
  ];

  const titulo = pago ? (
    <div className="flex items-center gap-2">
      <Wallet size={18} className="text-blue-600 shrink-0" />
      <span className="font-mono font-semibold text-gray-900">{pago.numeroPago}</span>
    </div>
  ) : null;

  const subtitulo = pago ? (
    <div className="flex flex-wrap gap-1 mt-1">
      <BadgeEstado
        estado={pago.estadoDocumento}
        labels={ESTADO_DOCUMENTO_PAGO_LABELS}
        clases={BADGE_ESTADO_DOCUMENTO_PAGO}
      />
      {aplicacionesResueltas.length === 1 && aplicacionesResueltas[0].cxp && (
        <BadgeEstado
          estado={aplicacionesResueltas[0].cxp.estadoPago}
          labels={ESTADO_PAGO_CXP_LABELS}
          clases={BADGE_ESTADO_PAGO_CXP}
        />
      )}
    </div>
  ) : null;

  const accionesEncabezado = pago && onImprimir ? (
    <div className="flex shrink-0 items-center gap-1">
      <BotonEncabezado icon={Printer} texto="Imprimir" label="Imprimir / Descargar PDF" onClick={() => onImprimir(pago)} />
    </div>
  ) : null;

  return (
    <Drawer
      abierto={pago !== null}
      alCerrar={onCerrar}
      titulo={titulo}
      subtitulo={subtitulo}
      accionesEncabezado={accionesEncabezado}
      tamano="lg"
    >
      {pago && (
        <div className="flex flex-col h-full">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-4 shrink-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTabActivo(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
                    tabActivo === tab.id
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {tabActivo === 'general' && (
              <>
                <Seccion titulo="Documento">
                  <Campo label="N° de pago" valor={pago.numeroPago} />
                  <Campo
                    label="Estado del pago"
                    valor={<BadgeEstado estado={pago.estadoDocumento} labels={ESTADO_DOCUMENTO_PAGO_LABELS} clases={BADGE_ESTADO_DOCUMENTO_PAGO} />}
                  />
                  <Campo label="Proveedor" valor={pago.proveedorNombre} />
                  <Campo label="Fecha de pago" valor={formatearFechaCompra(pago.fechaPago)} />
                  <Campo label="Fecha de registro" valor={formatearFechaCompra(pago.fechaCreacion)} />
                  <Campo label="Moneda" valor={pago.moneda} />
                  {pago.tipoCambio && <Campo label="Tipo de cambio" valor={pago.tipoCambio.toFixed(3)} />}
                  {pago.concepto && <Campo label="Concepto" valor={pago.concepto} />}
                  <Campo
                    label="Total"
                    valor={
                      <span className="font-semibold text-gray-900 font-mono">
                        {formatMoney(pago.montoTotalPagado, pago.moneda)}
                      </span>
                    }
                  />
                  {pago.observaciones && <Campo label="Observaciones" valor={pago.observaciones} />}
                </Seccion>

                <Seccion titulo={`Documentos aplicados (${aplicacionesResueltas.length})`}>
                  <div className="divide-y divide-gray-100">
                    {aplicacionesResueltas.map(({ aplicacion, cxp }, i) => (
                      <div key={`${aplicacion.cuentaPorPagarId}-${i}`} className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-700 font-mono">
                          {cxp
                            ? `${TIPOS_DOCUMENTO_PROVEEDOR_POR_CODIGO[cxp.tipoComprobanteOrigen]?.nombre ?? cxp.tipoComprobanteOrigen} ${cxp.comprobanteCompraNumero}`
                            : 'Documento no disponible'}
                        </span>
                        <span className="text-sm font-medium text-gray-900 font-mono">
                          {formatMoney(aplicacion.importeAplicado, pago.moneda)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Seccion>

                {(pago.documentoSustentoTipo || pago.documentoSustentoSerie) && (
                  <Seccion titulo="Documento sustentatorio">
                    {pago.documentoSustentoTipo && (
                      <Campo label="Tipo" valor={pago.documentoSustentoTipo} />
                    )}
                    {(pago.documentoSustentoSerie || pago.documentoSustentoNumero) && (
                      <Campo
                        label="Serie - número"
                        valor={`${pago.documentoSustentoSerie ?? ''}-${pago.documentoSustentoNumero ?? ''}`}
                      />
                    )}
                  </Seccion>
                )}

                <Seccion titulo={`Medios de pago (${pago.mediosPago.length})`}>
                  <div className="divide-y divide-gray-100">
                    {pago.mediosPago.map((medio) => {
                      const cuenta = medio.cuentaBancariaId
                        ? cuentasBancarias.find((c) => c.id === medio.cuentaBancariaId)
                        : undefined;
                      return (
                        <div key={medio.id} className="py-2 space-y-0.5">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">{medio.medioPagoNombre}</span>
                            <span className="text-sm font-mono font-medium text-gray-900">
                              {formatMoney(medio.monto, medio.moneda ?? pago.moneda)}
                            </span>
                          </div>
                          {cuenta && (
                            <p className="text-xs text-gray-400">
                              Cuenta: {cuenta.bankName} — {cuenta.accountNumber}
                            </p>
                          )}
                          {!cuenta && cajaUtilizada && (
                            <p className="text-xs text-gray-400">Caja: {cajaUtilizada.nombreCaja}</p>
                          )}
                          {medio.referenciaOperacion && (
                            <p className="text-xs text-gray-400">N° de operación/referencia: {medio.referenciaOperacion}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Seccion>

                <Seccion titulo={`Adjuntos (${pago.adjuntos?.length ?? 0})`}>
                  <div className="py-2">
                    <AdjuntosCompra adjuntos={pago.adjuntos ?? []} tiposPermitidos={[]} />
                  </div>
                </Seccion>

                {pago.estadoDocumento === 'anulado' && pago.motivoAnulacion && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                    <strong>Motivo de anulación:</strong> {pago.motivoAnulacion}
                  </div>
                )}
              </>
            )}

            {tabActivo === 'relacionados' && (
              <>
                <Seccion titulo={`Cuentas por pagar (${aplicacionesResueltas.length})`}>
                  {aplicacionesResueltas.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">No se encontró ninguna cuenta por pagar asociada.</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {aplicacionesResueltas.map(({ aplicacion, cxp }, i) => (
                        <button
                          key={`cxp-${aplicacion.cuentaPorPagarId}-${i}`}
                          type="button"
                          onClick={() => cxp && onVerCuentaPorPagar?.(cxp)}
                          disabled={!cxp || !onVerCuentaPorPagar}
                          className="w-full flex justify-between items-center py-2 text-left disabled:cursor-default"
                        >
                          <span className="text-sm text-gray-900">
                            {cxp ? `Saldo ${formatMoney(cxp.saldoPendiente, cxp.moneda)}` : 'No disponible'}
                          </span>
                          {cxp && (
                            <BadgeEstado estado={cxp.estadoPago} labels={ESTADO_PAGO_CXP_LABELS} clases={BADGE_ESTADO_PAGO_CXP} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </Seccion>

                <Seccion titulo={`Comprobantes de Compra (${aplicacionesResueltas.length})`}>
                  {aplicacionesResueltas.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">No se encontró ningún comprobante de compra origen.</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {aplicacionesResueltas.map(({ aplicacion, comprobante }, i) => (
                        <button
                          key={`cc-${aplicacion.cuentaPorPagarId}-${i}`}
                          type="button"
                          onClick={() => comprobante && onVerComprobante?.(comprobante)}
                          disabled={!comprobante || !onVerComprobante}
                          className="w-full flex justify-between items-center py-2 text-left disabled:cursor-default"
                        >
                          <span className="text-sm text-gray-900 font-mono">
                            {comprobante ? formatearNumeroComprobanteCompra(comprobante) : 'No disponible'}
                          </span>
                          {comprobante && (
                            <span className="text-sm text-gray-500">
                              {formatMoney(comprobante.totales.total, comprobante.moneda)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </Seccion>

                <Seccion titulo="Órdenes de Compra">
                  {(() => {
                    const ordenesUnicas = Array.from(
                      new Map(
                        aplicacionesResueltas
                          .filter(({ oc }) => Boolean(oc))
                          .map(({ oc }) => [oc!.id, oc!]),
                      ).values(),
                    );
                    if (ordenesUnicas.length === 0) {
                      return <p className="text-sm text-gray-400 py-2">Este pago no proviene de ninguna orden de compra.</p>;
                    }
                    return (
                      <div className="divide-y divide-gray-100">
                        {ordenesUnicas.map((oc) => (
                          <button
                            key={oc.id}
                            type="button"
                            onClick={() => onVerOrdenCompra?.(oc)}
                            disabled={!onVerOrdenCompra}
                            className="w-full flex justify-between items-center py-2 text-left disabled:cursor-default"
                          >
                            <span className="text-sm text-gray-900 font-mono">{formatearNumeroCompra(oc.serie, oc.correlativo)}</span>
                            <span className="text-sm text-gray-500">{formatMoney(oc.totales.total, oc.moneda)}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </Seccion>

                <Seccion titulo="Caja">
                  {cajaUtilizada ? (
                    <p className="text-sm text-gray-900 py-2">Caja utilizada: {cajaUtilizada.nombreCaja}</p>
                  ) : hayMovimientoCajaDerivado ? (
                    <p className="text-sm text-gray-500 py-2">
                      Este pago usó un medio de caja, pero no se identificó la caja específica.
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 py-2">Este pago no generó movimiento de caja.</p>
                  )}
                </Seccion>
              </>
            )}

            {tabActivo === 'historial' && (
              <>
                {pago.historial.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Sin eventos registrados.</p>
                ) : (
                  <div className="relative pl-5 space-y-4">
                    <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-gray-200" />
                    {[...pago.historial].reverse().map((evt, i) => (
                      <div key={i} className="relative flex gap-3">
                        <div className="absolute -left-3.5 w-3 h-3 rounded-full bg-white border-2 border-blue-400 mt-1" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-gray-700">{evt.accion}</span>
                            {evt.usuario && (
                              <span className="text-xs text-gray-500">por {evt.usuario}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            {formatearFechaCompra(evt.fecha)} {evt.fecha.split('T')[1]?.slice(0, 5) ?? ''}
                          </p>
                          {evt.detalle && <p className="text-xs text-gray-600 mt-0.5">{evt.detalle}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
