import { useState, useEffect, useRef } from 'react';
import { Receipt, Clock, Link2, Pencil, Copy, XCircle, Printer, Download, MoreHorizontal, Trash2 } from 'lucide-react';
import { Drawer } from '@/shared/ui/drawer/Drawer';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { listarTiposOperacion } from '@/shared/catalogos-sunat';
import { CreditInstallmentsTable } from '@/shared/payments/CreditInstallmentsTable';
import { formatMoney } from '@/shared/currency';
import AdjuntosCompra from '../adjuntos/AdjuntosCompra';
import { CLASIFICACION_LINEA_LABELS } from '../../modelos/LineaCompra';
import type { ComprobanteCompra, EstadoPrincipalCC } from '../../modelos/ComprobanteCompra';
import {
  ESTADO_DOCUMENTO_CC_LABELS,
  ESTADO_PAGO_CC_LABELS,
  ESTADO_INVENTARIO_CC_LABELS,
  MODALIDAD_INVENTARIO_CC_LABELS,
} from '../../modelos/ComprobanteCompra';
import {
  BADGE_ESTADO_DOCUMENTO_CC,
  BADGE_ESTADO_PAGO_CC,
  BADGE_ESTADO_INVENTARIO_CC,
  BADGE_ESTADO_PAGO_CXP,
  BADGE_ESTADO_DOCUMENTO_PAGO,
  BADGE_ESTADO_PRINCIPAL_CC,
  ETIQUETA_ESTADO_PRINCIPAL_CC,
} from '../../constantes/estadosCompras';
import {
  calcularEstadoPrincipalCC,
  puedeEditarCC,
  puedeEliminarBorradorCC,
  puedeAnularCC,
  puedeImprimirCC,
  calcularTotalesLineas,
  construirFilasResumenTributarioCompra,
  formatearEtiquetaImpuesto,
  resolverNombreFormaPago,
} from '../../logica/reglasCompras';
import { formatearFechaCompra, formatearNumeroCompra, formatearNumeroComprobanteCompra } from '../../utilidades/formatearCompras';
import { TIPOS_DOCUMENTO_PROVEEDOR } from '../../constantes/tiposDocumentoProveedor';
import type { OrdenCompra } from '../../modelos/OrdenCompra';
import type { CuentaPorPagar } from '../../modelos/CuentaPorPagar';
import { ESTADO_PAGO_CXP_LABELS } from '../../modelos/CuentaPorPagar';
import type { PagoCompra } from '../../modelos/PagoCompra';
import { ESTADO_DOCUMENTO_PAGO_LABELS } from '../../modelos/PagoCompra';

interface PanelDetalleComprobanteCompraProps {
  cc: ComprobanteCompra | null;
  ordenes: OrdenCompra[];
  cuentasPorPagar: CuentaPorPagar[];
  pagos: PagoCompra[];
  onCerrar: () => void;
  onVerOrdenCompra?: (oc: OrdenCompra) => void;
  onVerCuentaPorPagar?: (cxp: CuentaPorPagar) => void;
  onVerPago?: (pago: PagoCompra) => void;
  onEditar?: (cc: ComprobanteCompra) => void;
  onDuplicar?: (cc: ComprobanteCompra) => void;
  onAnular?: (cc: ComprobanteCompra) => void;
  onImprimir?: (cc: ComprobanteCompra) => void;
  onEliminarBorrador?: (cc: ComprobanteCompra) => void;
}

type TabCC = 'general' | 'historial' | 'relacionados';

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

/** Acción principal visible del header (icono + texto corto), máximo 2 por estado — el resto va al menú "Más acciones". Mismo patrón que PanelDetalleOrdenCompra. */
function BotonEncabezado({
  icon: Icon,
  texto,
  label,
  onClick,
  danger,
}: {
  icon: typeof Receipt;
  texto: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
      }`}
    >
      <Icon size={14} /> {texto}
    </button>
  );
}

/** Fila del menú "Más acciones" del header. */
function ItemMenuAccion({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Receipt;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

export default function PanelDetalleComprobanteCompra({
  cc,
  ordenes,
  cuentasPorPagar,
  pagos,
  onCerrar,
  onVerOrdenCompra,
  onVerCuentaPorPagar,
  onVerPago,
  onEditar,
  onDuplicar,
  onAnular,
  onImprimir,
  onEliminarBorrador,
}: PanelDetalleComprobanteCompraProps) {
  const { state: config } = useConfigurationContext();
  const [tabActivo, setTabActivo] = useState<TabCC>('general');
  const [menuAccionesAbierto, setMenuAccionesAbierto] = useState(false);
  const menuAccionesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (menuAccionesRef.current && !menuAccionesRef.current.contains(e.target as Node)) {
        setMenuAccionesAbierto(false);
      }
    }
    if (menuAccionesAbierto) {
      document.addEventListener('mousedown', handleClickFuera);
      return () => document.removeEventListener('mousedown', handleClickFuera);
    }
  }, [menuAccionesAbierto]);

  const tiposOperacion = listarTiposOperacion();

  const TABS: { id: TabCC; label: string; icon: typeof Receipt }[] = [
    { id: 'general', label: 'General', icon: Receipt },
    { id: 'relacionados', label: 'Documentos relacionados', icon: Link2 },
    { id: 'historial', label: 'Historial', icon: Clock },
  ];

  const ocOrigen = cc ? ordenes.find((o) => o.id === cc.ordenCompraOrigenId) : undefined;
  const cxp = cc ? cuentasPorPagar.find((c) => c.comprobanteCompraId === cc.id) : undefined;
  const pagosDelComprobante = cc
    ? pagos.filter((p) => p.comprobantesCompraAplicados.includes(cc.id))
    : [];

  const nombreFormaPago = cc ? resolverNombreFormaPago(cc, config.paymentMethods) : '';
  // Misma fuente que el formulario y el listado: se reconstruye el desglose
  // tributario desde las líneas persistidas, nunca desde un cálculo propio.
  const totalesDocumento = cc ? calcularTotalesLineas(cc.lineas) : null;

  const titulo = cc ? (
    <div className="flex min-w-0 items-center gap-2">
      <Receipt size={18} className="text-blue-600 shrink-0" />
      {cc.serieProveedor && cc.numeroProveedor ? (
        <span className="min-w-0 truncate font-mono font-semibold text-gray-900">
          {formatearNumeroComprobanteCompra(cc)}
        </span>
      ) : (
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="shrink-0 font-mono font-semibold text-gray-900">
            {TIPOS_DOCUMENTO_PROVEEDOR.find((t) => t.codigo === cc.tipoComprobanteProveedor)?.nombreCorto ?? 'Comprobante'}
          </span>
          <span className="min-w-0 truncate text-xs text-gray-400">sin número</span>
        </span>
      )}
    </div>
  ) : null;

  const subtitulo = cc ? (
    <div className="flex flex-wrap gap-1 mt-1">
      <BadgeEstado
        estado={calcularEstadoPrincipalCC(cc)}
        labels={ETIQUETA_ESTADO_PRINCIPAL_CC as unknown as Record<string, string>}
        clases={BADGE_ESTADO_PRINCIPAL_CC as unknown as Record<string, string>}
      />
    </div>
  ) : null;

  /** Máximo 2 acciones visibles en el header (más el menú "Más acciones"), mismas reglas que el listado — ninguna regla de negocio nueva. */
  function construirAccionesHeaderCC(
    ccActual: ComprobanteCompra,
    estado: EstadoPrincipalCC,
  ): { visibles: React.ReactNode[]; menu: React.ReactNode[] } {
    const visibles: React.ReactNode[] = [];
    const menu: React.ReactNode[] = [];

    const agregarDuplicarVisible = () => {
      if (onDuplicar) {
        visibles.push(<BotonEncabezado key="duplicar" icon={Copy} texto="Duplicar" label="Duplicar comprobante de compra" onClick={() => onDuplicar(ccActual)} />);
      }
    };
    const agregarImprimirPdfMenu = () => {
      if (onImprimir && puedeImprimirCC(ccActual)) {
        menu.push(
          <ItemMenuAccion key="imprimir" icon={Printer} label="Imprimir comprobante de compra" onClick={() => onImprimir(ccActual)} />,
          <ItemMenuAccion key="pdf" icon={Download} label="Descargar PDF" onClick={() => onImprimir(ccActual)} />,
        );
      }
    };

    switch (estado) {
      case 'Borrador':
        if (onEditar && puedeEditarCC(ccActual)) {
          visibles.push(
            <BotonEncabezado key="editar" icon={Pencil} texto="Editar" label="Editar comprobante de compra" onClick={() => { onCerrar(); onEditar(ccActual); }} />,
          );
        }
        agregarDuplicarVisible();
        if (onEliminarBorrador && puedeEliminarBorradorCC(ccActual)) {
          menu.push(<ItemMenuAccion key="eliminar" icon={Trash2} label="Eliminar borrador" onClick={() => onEliminarBorrador(ccActual)} danger />);
        }
        agregarImprimirPdfMenu();
        break;
      case 'Registrado':
        if (onAnular && puedeAnularCC(ccActual)) {
          visibles.push(
            <BotonEncabezado key="anular" icon={XCircle} texto="Anular" label="Anular comprobante de compra" onClick={() => onAnular(ccActual)} danger />,
          );
        }
        agregarDuplicarVisible();
        agregarImprimirPdfMenu();
        break;
      case 'Anulado':
      case 'Convertido':
        if (onImprimir && puedeImprimirCC(ccActual)) {
          visibles.push(<BotonEncabezado key="imprimir" icon={Printer} texto="Imprimir" label="Imprimir comprobante de compra" onClick={() => onImprimir(ccActual)} />);
          menu.push(<ItemMenuAccion key="pdf" icon={Download} label="Descargar PDF" onClick={() => onImprimir(ccActual)} />);
        }
        agregarDuplicarVisible();
        break;
      default:
        break;
    }

    return { visibles, menu };
  }

  const estadoCC = cc ? calcularEstadoPrincipalCC(cc) : null;
  const { visibles: accionesVisibles, menu: accionesMenu } =
    cc && estadoCC ? construirAccionesHeaderCC(cc, estadoCC) : { visibles: [], menu: [] };

  const accionesEncabezado = cc ? (
    <div className="flex shrink-0 items-center gap-1">
      {accionesVisibles}
      {accionesMenu.length > 0 && (
        <div className="relative" ref={menuAccionesRef}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuAccionesAbierto((v) => !v); }}
            title="Más acciones"
            aria-label="Más acciones"
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuAccionesAbierto && (
            <div
              className="absolute right-0 z-10 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
              onClick={(e) => { e.stopPropagation(); setMenuAccionesAbierto(false); }}
            >
              {accionesMenu}
            </div>
          )}
        </div>
      )}
    </div>
  ) : null;

  return (
    <Drawer
      abierto={cc !== null}
      alCerrar={onCerrar}
      titulo={titulo}
      subtitulo={subtitulo}
      accionesEncabezado={accionesEncabezado}
      tamano="lg"
    >
      {cc && (
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
                <Seccion titulo="Proveedor">
                  <Campo label="Nombre" valor={cc.proveedorNombre} />
                  <Campo
                    label="Documento"
                    valor={`${cc.proveedorTipoDocumento === '6' ? 'RUC' : 'DOC'} ${cc.proveedorNumeroDocumento}`}
                  />
                </Seccion>

                <Seccion titulo="Datos del comprobante">
                  <Campo
                    label="Tipo de comprobante"
                    valor={TIPOS_DOCUMENTO_PROVEEDOR.find((t) => t.codigo === cc.tipoComprobanteProveedor)?.nombre ?? '—'}
                  />
                  <Campo
                    label="Serie / N.°"
                    valor={cc.serieProveedor && cc.numeroProveedor ? formatearNumeroComprobanteCompra(cc) : 'Sin número'}
                  />
                  <Campo label="Fecha de emisión" valor={cc.fechaEmisionProveedor ? formatearFechaCompra(cc.fechaEmisionProveedor) : '—'} />
                  <Campo label="Fecha registro" valor={formatearFechaCompra(cc.fechaRegistro)} />
                  {cc.fechaVencimiento && <Campo label="Vencimiento" valor={formatearFechaCompra(cc.fechaVencimiento)} />}
                  <Campo label="Comprador" valor={cc.compradorNombre} />
                  <Campo label="Moneda" valor={cc.moneda} />
                  {cc.tipoCambio && <Campo label="Tipo de cambio" valor={cc.tipoCambio.toFixed(3)} />}
                  {cc.centroCosto && <Campo label="Centro de costo" valor={cc.centroCosto} />}
                  {cc.presupuesto && <Campo label="Presupuesto" valor={cc.presupuesto} />}
                </Seccion>

                {(cc.proveedorDireccionFacturacion || cc.proveedorDireccionEntrega) && (
                  <Seccion titulo="Direcciones">
                    {cc.proveedorDireccionFacturacion && (
                      <Campo label="Dirección de facturación" valor={cc.proveedorDireccionFacturacion} />
                    )}
                    {cc.proveedorDireccionEntrega && (
                      <Campo label="Dirección de entrega" valor={cc.proveedorDireccionEntrega} />
                    )}
                  </Seccion>
                )}

                {cc.tipoOperacion && (
                  <Seccion titulo="Tipo de operación">
                    <Campo
                      label="Tipo de operación"
                      valor={
                        (() => {
                          const tipo = tiposOperacion.find((t) => t.codigo === cc.tipoOperacion);
                          return tipo ? `${tipo.codigo} - ${tipo.descripcion}` : cc.tipoOperacion;
                        })()
                      }
                    />
                  </Seccion>
                )}

                <Seccion titulo="Forma de pago">
                  <Campo label="Forma de pago" valor={nombreFormaPago} />
                  {cc.condicionesPago && (
                    <Campo label="Condiciones" valor={cc.condicionesPago} />
                  )}
                </Seccion>

                {cc.formaPago === 'credito' && cc.creditTerms && cc.creditTerms.schedule.length > 0 && (
                  <Seccion titulo="Condición y cuotas de crédito">
                    <div className="py-2">
                      <CreditInstallmentsTable
                        installments={cc.creditTerms.schedule}
                        currency={cc.moneda}
                        mode="readonly"
                        compact
                      />
                    </div>
                  </Seccion>
                )}

                <Seccion titulo="Base imponible">
                  <Campo
                    label="Base imponible de compra"
                    valor={formatMoney(totalesDocumento!.subtotal, cc.moneda)}
                  />
                </Seccion>

                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Ítems ({cc.lineas.length})
                  </h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Descripción</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Clasificación</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 text-xs">Cant.</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 text-xs">Costo</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Impuesto</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 text-xs">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {cc.lineas.map((linea) => (
                          <tr key={linea.id}>
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900">{linea.nombreProducto}</div>
                              <div className="text-xs text-gray-400">
                                {linea.unidadMedida}
                                {linea.codigoProducto && ` · ${linea.codigoProducto}`}
                                {(linea.descuentoUnitario ?? 0) > 0 && ` · desc. ${linea.descuentoUnitario!.toFixed(2)}`}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600">
                              {CLASIFICACION_LINEA_LABELS[linea.clasificacion]}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-gray-700">
                              {linea.cantidadFacturada || linea.cantidadSolicitada}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-gray-700">
                              {formatMoney(linea.costoUnitario, cc.moneda)}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600">
                              {formatearEtiquetaImpuesto(linea.tipoAfectacion, linea.tasaIgv ?? 0)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-medium text-gray-900">
                              {formatMoney(linea.total, cc.moneda)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Seccion titulo="Totales">
                  {construirFilasResumenTributarioCompra(totalesDocumento!).map((fila) => (
                    <Campo key={fila.clave} label={fila.etiqueta} valor={formatMoney(fila.monto, cc.moneda)} />
                  ))}
                  {totalesDocumento!.descuentoTotal > 0 && (
                    <Campo label="Descuentos" valor={`-${formatMoney(totalesDocumento!.descuentoTotal, cc.moneda)}`} />
                  )}
                  {cc.totales.detraccion && cc.totales.detraccion > 0 && (
                    <Campo label="Detracción" valor={`-${formatMoney(cc.totales.detraccion, cc.moneda)}`} />
                  )}
                  {cc.totales.retencion && cc.totales.retencion > 0 && (
                    <Campo label="Retención" valor={`-${formatMoney(cc.totales.retencion, cc.moneda)}`} />
                  )}
                  <Campo
                    label="Total"
                    valor={
                      <span className="font-semibold text-gray-900 font-mono">
                        {formatMoney(totalesDocumento!.total, cc.moneda)}
                      </span>
                    }
                  />
                </Seccion>

                <Seccion titulo="Afectación de inventario">
                  <Campo
                    label="Modalidad inventario"
                    valor={MODALIDAD_INVENTARIO_CC_LABELS[cc.modalidadInventario]}
                  />
                </Seccion>

                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Adjuntos ({cc.adjuntos.length})
                  </h3>
                  <AdjuntosCompra adjuntos={cc.adjuntos} tiposPermitidos={[]} />
                </div>

                <Seccion titulo="Estados operativos secundarios">
                  <Campo
                    label="Documento"
                    valor={<BadgeEstado estado={cc.estadoDocumento} labels={ESTADO_DOCUMENTO_CC_LABELS} clases={BADGE_ESTADO_DOCUMENTO_CC} />}
                  />
                  <Campo
                    label="Pago"
                    valor={<BadgeEstado estado={cc.estadoPago} labels={ESTADO_PAGO_CC_LABELS} clases={BADGE_ESTADO_PAGO_CC} />}
                  />
                  <Campo
                    label="Inventario"
                    valor={<BadgeEstado estado={cc.estadoInventario} labels={ESTADO_INVENTARIO_CC_LABELS} clases={BADGE_ESTADO_INVENTARIO_CC} />}
                  />
                </Seccion>

                {cc.observaciones && (
                  <Seccion titulo="Observaciones">
                    <p className="text-sm text-gray-700 py-2">{cc.observaciones}</p>
                  </Seccion>
                )}

                {cc.estadoDocumento === 'anulado' && cc.motivoAnulacion && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                    <strong>Motivo de anulación:</strong> {cc.motivoAnulacion}
                  </div>
                )}
              </>
            )}

            {tabActivo === 'relacionados' && (
              <>
                <Seccion titulo="Orden de compra origen">
                  {ocOrigen ? (
                    <button
                      type="button"
                      onClick={() => onVerOrdenCompra?.(ocOrigen)}
                      disabled={!onVerOrdenCompra}
                      className="w-full flex justify-between items-center py-2 text-left disabled:cursor-default"
                    >
                      <span className="text-sm text-gray-900 font-mono">{formatearNumeroCompra(ocOrigen.serie, ocOrigen.correlativo)}</span>
                      <span className="text-sm text-gray-500">
                        {formatMoney(ocOrigen.totales.total, ocOrigen.moneda)}
                      </span>
                    </button>
                  ) : (
                    <p className="text-sm text-gray-400 py-2">Este comprobante no proviene de una orden de compra.</p>
                  )}
                </Seccion>

                <Seccion titulo="Cuenta por pagar">
                  {cxp ? (
                    <button
                      type="button"
                      onClick={() => onVerCuentaPorPagar?.(cxp)}
                      disabled={!onVerCuentaPorPagar}
                      className="w-full flex justify-between items-center py-2 text-left disabled:cursor-default"
                    >
                      <span className="text-sm text-gray-900">
                        Saldo {formatMoney(cxp.saldoPendiente, cxp.moneda)}
                      </span>
                      <BadgeEstado estado={cxp.estadoPago} labels={ESTADO_PAGO_CXP_LABELS} clases={BADGE_ESTADO_PAGO_CXP} />
                    </button>
                  ) : (
                    <p className="text-sm text-gray-400 py-2">No se encontró una cuenta por pagar asociada.</p>
                  )}
                </Seccion>

                <Seccion titulo={`Pagos (${pagosDelComprobante.length})`}>
                  {pagosDelComprobante.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">Aún no se registró ningún pago.</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {pagosDelComprobante.map((pago) => (
                        <button
                          key={pago.id}
                          type="button"
                          onClick={() => onVerPago?.(pago)}
                          disabled={!onVerPago}
                          className="w-full flex justify-between items-center py-2 text-left disabled:cursor-default"
                        >
                          <span className="text-sm text-gray-900 font-mono">{pago.numeroPago}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              {formatMoney(pago.montoTotalPagado, pago.moneda)}
                            </span>
                            <BadgeEstado
                              estado={pago.estadoDocumento}
                              labels={ESTADO_DOCUMENTO_PAGO_LABELS}
                              clases={BADGE_ESTADO_DOCUMENTO_PAGO}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </Seccion>

                {cc.notasIngresoRelacionadas && cc.notasIngresoRelacionadas.length > 0 && (
                  <Seccion titulo="Notas de ingreso">
                    <Campo label="Notas de ingreso vinculadas" valor={cc.notasIngresoRelacionadas.length} />
                  </Seccion>
                )}
              </>
            )}

            {tabActivo === 'historial' && (
              <>
                {cc.historial.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Sin eventos registrados.</p>
                ) : (
                  <div className="relative pl-5 space-y-4">
                    <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-gray-200" />
                    {[...cc.historial].reverse().map((evt, i) => (
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
                          {evt.detalle && (
                            <p className="text-xs text-gray-600 mt-0.5">{evt.detalle}</p>
                          )}
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
