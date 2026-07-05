import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Breadcrumb, PageHeader } from '@/contasis';
import {
  FormSectionCard,
  TwoColumnDocumentFields,
  CollapsibleNotes,
  DocumentFormFooter,
  FieldsConfigurationModal,
  useConfiguracionCampos,
  type CampoConfigurableDocumento,
} from '@/shared/ui';
import { useCompras } from '../../contexto/ContextoCompras';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useUserSession } from '@/contexts/UserSessionContext';
import { calcularTotalesLineas } from '../../logica/reglasCompras';
import { persistirProveedorSiEsNuevo } from '../../servicios/servicioProveedorCompras';
import { TIPOS_DOCUMENTO_PROVEEDOR } from '../../constantes/tiposDocumentoProveedor';
import { extraerDatosOCParaCC } from '../../mapeadores/mapeadorOCaCC';
import { useClientes } from '../../../gestion-clientes/hooks/useClientes';
import BuscadorProveedor, { type ProveedorSeleccionado } from '../BuscadorProveedor';
import AdjuntosCompra from '../adjuntos/AdjuntosCompra';
import SelectorModalidadInventario from './SelectorModalidadInventario';
import { useLineasCompra } from '../items/useLineasCompra';
import SeccionProductosCompra from '../items/SeccionProductosCompra';
import type { ModalidadInventarioCC } from '../../modelos/ComprobanteCompra';
import type { ComprobanteCompra } from '../../modelos/ComprobanteCompra';
import type { CuentaPorPagar } from '../../modelos/CuentaPorPagar';
import type { MonedaCompra } from '../../modelos/tiposBaseCompras';
import type { OrdenCompra } from '../../modelos/OrdenCompra';
import type { AdjuntoCompra } from '../../modelos/AdjuntoCompra';

interface FormularioComprobanteCompraProps {
  ocOrigen?: OrdenCompra;
  onExito: (cc: ComprobanteCompra, cxp: CuentaPorPagar) => void;
  onCancelar: () => void;
}

const CAMPOS_CC_DEFAULT: CampoConfigurableDocumento[] = [
  { id: 'centroCosto', label: 'Centro de costo', visible: false, grupo: 'Presupuesto' },
  { id: 'presupuesto', label: 'Presupuesto', visible: false, grupo: 'Presupuesto' },
];
const STORAGE_KEY_CAMPOS_CC = 'compras_cc_campos_config';

export default function FormularioComprobanteCompra({
  ocOrigen,
  onExito,
  onCancelar,
}: FormularioComprobanteCompraProps) {
  const { registrarComprobanteCompra, refrescarProveedores } = useCompras();
  const { state: config } = useConfigurationContext();
  const { session } = useUserSession();
  const { createCliente } = useClientes();
  const { campos: camposConfigurables, esVisible, guardar: guardarCamposConfigurables } =
    useConfiguracionCampos(CAMPOS_CC_DEFAULT, STORAGE_KEY_CAMPOS_CC);
  const [modalCamposAbierto, setModalCamposAbierto] = useState(false);

  // Fuentes de verdad desde Configuración
  const monedaDefault = (
    config.currencies.find((c) => c.isBaseCurrency && c.isActive)?.code ?? 'PEN'
  ) as MonedaCompra;

  const almacenesActivos = config.almacenes.filter((a) => a.estaActivoAlmacen);
  const monedaBase = config.currencies.find((c) => c.isBaseCurrency)?.code ?? monedaDefault;

  // Si viene de una OC aprobada, se heredan condiciones, TC, centro de costo/
  // presupuesto y las líneas con sus cantidades de seguimiento reseteadas.
  const datosDesdeOC = ocOrigen ? extraerDatosOCParaCC(ocOrigen) : null;

  const [proveedor, setProveedor] = useState<ProveedorSeleccionado | null>(
    ocOrigen?.proveedorId
      ? { id: ocOrigen.proveedorId, nombre: ocOrigen.proveedorNombre, tipoDocumento: ocOrigen.proveedorTipoDocumento, numeroDocumento: ocOrigen.proveedorNumeroDocumento }
      : null,
  );
  const [direccionProveedor, setDireccionProveedor] = useState('');
  const [tipoComprobante, setTipoComprobante] = useState('01');
  const [serieProveedor, setSerieProveedor] = useState('');
  const [numeroProveedor, setNumeroProveedor] = useState('');
  const [fechaEmisionProveedor, setFechaEmisionProveedor] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [moneda, setMoneda] = useState<MonedaCompra>(ocOrigen?.moneda ?? monedaDefault);
  const [tipoCambio, setTipoCambio] = useState(datosDesdeOC?.tipoCambio?.toString() ?? '');
  const [formaPago, setFormaPago] = useState<'contado' | 'credito'>(
    ocOrigen?.formaPago ?? 'contado',
  );
  const [modalidadInventario, setModalidadInventario] = useState<ModalidadInventarioCC>(
    datosDesdeOC?.modalidadInventarioSugerida ?? 'con_nota_ingreso',
  );
  const [almacenId, setAlmacenId] = useState(almacenesActivos[0]?.id ?? '');
  const [centroCosto, setCentroCosto] = useState(datosDesdeOC?.centroCosto ?? '');
  const [presupuesto, setPresupuesto] = useState(datosDesdeOC?.presupuesto ?? '');
  const [observaciones, setObservaciones] = useState(datosDesdeOC?.observaciones ?? '');
  const [adjuntos, setAdjuntos] = useState<AdjuntoCompra[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);

  const lineasCompra = useLineasCompra(datosDesdeOC?.lineas ?? []);
  const lineas = lineasCompra.lineas;

  const totalesCalculados = calcularTotalesLineas(lineas);
  const documentoAfectaInventario = modalidadInventario !== 'no_afecta_inventario';
  const almacenSeleccionado = almacenesActivos.find((a) => a.id === almacenId);
  const tipoComprobanteLabel = TIPOS_DOCUMENTO_PROVEEDOR.find((t) => t.codigo === tipoComprobante)?.nombre;

  async function handleSubmit() {
    const nuevosErrores: string[] = [];
    if (!proveedor) nuevosErrores.push('Selecciona un proveedor.');
    if (!serieProveedor.trim()) nuevosErrores.push('Ingresa la serie del comprobante del proveedor.');
    if (!numeroProveedor.trim()) nuevosErrores.push('Ingresa el número del comprobante del proveedor.');
    if (lineas.length === 0) nuevosErrores.push('Agrega al menos una línea.');
    if (lineas.some((l) => !l.productoId)) nuevosErrores.push('Todos los ítems deben provenir de un producto real del catálogo.');
    if (lineas.some((l) => !l.unidadMedida)) nuevosErrores.push('El producto no tiene unidad de medida configurada.');
    if (lineas.some((l) => l.tipoAfectacion === 'sin_configurar')) nuevosErrores.push('El producto no tiene impuesto configurado.');
    if (lineas.some((l) => l.cantidadSolicitada <= 0)) nuevosErrores.push('La cantidad debe ser mayor a cero.');
    if (lineas.some((l) => l.costoUnitario < 0)) nuevosErrores.push('El costo unitario no puede ser negativo.');
    if (documentoAfectaInventario && !almacenSeleccionado) {
      nuevosErrores.push('Selecciona el almacén de destino para el ingreso a inventario.');
    }

    if (nuevosErrores.length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    setErrores([]);
    setEnviando(true);

    const lineasParaRegistrar = lineas.map((l) => ({
      ...l,
      afectaInventario: documentoAfectaInventario,
      almacenDestinoId: documentoAfectaInventario ? almacenSeleccionado?.id : undefined,
      almacenDestinoNombre: documentoAfectaInventario ? almacenSeleccionado?.nombreAlmacen : undefined,
    }));

    try {
      const { comprobante, cuentaPorPagar } = await registrarComprobanteCompra(
        {
          tipoComprobanteProveedor: tipoComprobante,
          serieProveedor: serieProveedor.toUpperCase(),
          numeroProveedor: numeroProveedor.trim(),
          fechaEmisionProveedor,
          fechaRegistro: new Date().toISOString(),
          fechaVencimiento: fechaVencimiento || undefined,
          proveedorId: proveedor!.id.toString(),
          proveedorTipoDocumento: proveedor!.tipoDocumento,
          proveedorNumeroDocumento: proveedor!.numeroDocumento,
          proveedorNombre: proveedor!.nombre,
          direccionProveedor: direccionProveedor || undefined,
          compradorId: session?.userId,
          compradorNombre: session?.userName,
          moneda,
          tipoCambio: tipoCambio ? parseFloat(tipoCambio) : undefined,
          formaPago,
          modalidadInventario,
          centroCosto: centroCosto || undefined,
          presupuesto: presupuesto || undefined,
          lineas: lineasParaRegistrar,
          totales: {
            subtotal: totalesCalculados.subtotal,
            subtotalExonerado: totalesCalculados.subtotalExonerado,
            subtotalInafecto: totalesCalculados.subtotalInafecto,
            descuentoTotal: totalesCalculados.descuentoTotal,
            igv: totalesCalculados.igv,
            total: totalesCalculados.total,
            moneda,
          },
          observaciones: observaciones || undefined,
          ordenCompraOrigenId: ocOrigen?.id,
          adjuntos,
        },
        session?.userId,
      );

      if (proveedor) {
        await persistirProveedorSiEsNuevo(proveedor, createCliente);
        refrescarProveedores();
      }

      onExito(comprobante, cuentaPorPagar);
    } catch (e) {
      setErrores([e instanceof Error ? e.message : 'Error al registrar el comprobante.']);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <PageHeader
        breadcrumb={
          <Breadcrumb items={[{ label: 'Compras', onClick: onCancelar }, { label: 'Registrar comprobante' }]} />
        }
        title={
          <div className="flex items-center gap-2.5">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">Registrar Comprobante de Compra</h1>
              <p className="text-xs text-gray-500">
                {ocOrigen ? `Desde OC: ${ocOrigen.numero}` : 'Registra el documento recibido del proveedor'}
              </p>
            </div>
            {tipoComprobanteLabel && (
              <span className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded">
                {tipoComprobanteLabel}
              </span>
            )}
          </div>
        }
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {errores.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 space-y-1">
            {errores.map((e, i) => (
              <p key={i} className="text-sm text-red-700">• {e}</p>
            ))}
          </div>
        )}

        {/* Card principal: Datos del comprobante */}
        <FormSectionCard
          titulo="Datos del comprobante"
          acciones={
            <button
              type="button"
              onClick={() => setModalCamposAbierto(true)}
              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium transition-colors"
            >
              <Settings size={13} />
              <span>+ Campos</span>
            </button>
          }
        >
          <TwoColumnDocumentFields
            izquierda={
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Proveedor</label>
                  <BuscadorProveedor
                    proveedor={proveedor}
                    onSeleccionar={(p) => {
                      setProveedor(p);
                      setDireccionProveedor(p?.direccion ?? '');
                    }}
                    deshabilitado={!!ocOrigen}
                    error={errores.some((e) => e.includes('proveedor')) ? 'Selecciona un proveedor' : null}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Dirección del proveedor</label>
                  <input
                    type="text"
                    value={direccionProveedor}
                    onChange={(e) => setDireccionProveedor(e.target.value)}
                    placeholder="Dirección del proveedor..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </>
            }
            derecha={
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Tipo de comprobante</label>
                    <select
                      value={tipoComprobante}
                      onChange={(e) => setTipoComprobante(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {TIPOS_DOCUMENTO_PROVEEDOR.map((t) => (
                        <option key={t.codigo} value={t.codigo}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Serie proveedor</label>
                    <input
                      type="text"
                      value={serieProveedor}
                      onChange={(e) => setSerieProveedor(e.target.value)}
                      placeholder="F001"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Número proveedor</label>
                    <input
                      type="text"
                      value={numeroProveedor}
                      onChange={(e) => setNumeroProveedor(e.target.value)}
                      placeholder="00000001"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">F. emisión (proveedor)</label>
                    <input
                      type="date"
                      value={fechaEmisionProveedor}
                      onChange={(e) => setFechaEmisionProveedor(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">F. vencimiento</label>
                    <input
                      type="date"
                      value={fechaVencimiento}
                      onChange={(e) => setFechaVencimiento(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Moneda</label>
                    <select
                      value={moneda}
                      onChange={(e) => setMoneda(e.target.value as MonedaCompra)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {config.currencies.filter((c) => c.isActive).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.symbol} {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {moneda !== monedaBase && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Tipo de cambio</label>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={tipoCambio}
                      onChange={(e) => setTipoCambio(e.target.value)}
                      placeholder={`1 ${moneda} = ? ${monedaBase}`}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Forma de pago</label>
                    <select
                      value={formaPago}
                      onChange={(e) => setFormaPago(e.target.value as 'contado' | 'credito')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="contado">Contado</option>
                      <option value="credito">Crédito</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Comprador</label>
                    <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
                      {session?.userName || 'Usuario no identificado'}
                    </div>
                  </div>
                </div>

                <SelectorModalidadInventario
                  modalidad={modalidadInventario}
                  onCambiarModalidad={setModalidadInventario}
                  almacenesActivos={almacenesActivos}
                  almacenId={almacenId}
                  onCambiarAlmacen={setAlmacenId}
                />

                {esVisible('centroCosto') && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Centro de costo</label>
                    <input
                      type="text"
                      value={centroCosto}
                      onChange={(e) => setCentroCosto(e.target.value)}
                      placeholder="Ej: Administración"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                )}
                {esVisible('presupuesto') && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Presupuesto</label>
                    <input
                      type="text"
                      value={presupuesto}
                      onChange={(e) => setPresupuesto(e.target.value)}
                      placeholder="Ej: Presupuesto 2026-Q3"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                )}
              </>
            }
          />
        </FormSectionCard>

        {/* Productos - Servicios */}
        <SeccionProductosCompra
          moneda={moneda}
          lineasCompra={lineasCompra}
          totalesCalculados={totalesCalculados}
        />

        {/* Observaciones */}
        <CollapsibleNotes observaciones={observaciones} onCambiarObservaciones={setObservaciones} />

        {/* Adjuntos */}
        <FormSectionCard titulo="Adjuntos">
          <AdjuntosCompra
            adjuntos={adjuntos}
            tiposPermitidos={['factura_proveedor', 'guia_remision', 'cotizacion_proveedor', 'contrato', 'otro']}
            cargadoPor={session?.userName}
            onAgregar={(a) => setAdjuntos((prev) => [...prev, a])}
            onEliminar={(id) => setAdjuntos((prev) => prev.filter((a) => a.id !== id))}
          />
        </FormSectionCard>
      </div>

      <DocumentFormFooter
        infoIzquierda={
          <>
            {lineas.length} ítem(s) · Total:{' '}
            <span className="font-semibold text-gray-700">
              {totalesCalculados.total.toFixed(2)} {moneda}
            </span>
          </>
        }
        onCancelar={onCancelar}
        onSubmit={handleSubmit}
        textoBotonPrimario="Registrar CC"
        deshabilitado={enviando}
        cargando={enviando}
      />

      <FieldsConfigurationModal
        abierto={modalCamposAbierto}
        titulo="Configuración de campos — Comprobante de Compra"
        campos={camposConfigurables}
        valoresPorDefecto={CAMPOS_CC_DEFAULT}
        onGuardar={(nuevos) => {
          guardarCamposConfigurables(nuevos);
          setModalCamposAbierto(false);
        }}
        onCerrar={() => setModalCamposAbierto(false)}
      />
    </div>
  );
}
