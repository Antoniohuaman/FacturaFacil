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
import { persistirProveedorSiEsNuevo } from '../../servicios/servicioProveedorCompras';
import { calcularTotalesLineas } from '../../logica/reglasCompras';
import { useClientes } from '../../../gestion-clientes/hooks/useClientes';
import BuscadorProveedor, { type ProveedorSeleccionado } from '../BuscadorProveedor';
import AdjuntosCompra from '../adjuntos/AdjuntosCompra';
import { useLineasCompra } from '../items/useLineasCompra';
import SeccionProductosCompra from '../items/SeccionProductosCompra';
import type { MonedaCompra } from '../../modelos/tiposBaseCompras';
import type { OrdenCompra } from '../../modelos/OrdenCompra';
import type { AdjuntoCompra } from '../../modelos/AdjuntoCompra';

interface FormularioOrdenCompraProps {
  ocBase?: Partial<OrdenCompra>;
  onExito: (oc: OrdenCompra) => void;
  onCancelar: () => void;
}

const CAMPOS_OC_DEFAULT: CampoConfigurableDocumento[] = [
  { id: 'entregaEsperada', label: 'Entrega esperada', visible: false, grupo: 'Fechas y logística' },
  { id: 'centroCosto', label: 'Centro de costo', visible: false, grupo: 'Presupuesto' },
  { id: 'presupuesto', label: 'Presupuesto', visible: false, grupo: 'Presupuesto' },
  { id: 'requiereAprobacion', label: 'Requiere aprobación', visible: false, grupo: 'Aprobación' },
];
const STORAGE_KEY_CAMPOS_OC = 'compras_oc_campos_config';

export default function FormularioOrdenCompra({
  ocBase,
  onExito,
  onCancelar,
}: FormularioOrdenCompraProps) {
  const { registrarOrdenCompra, refrescarProveedores } = useCompras();
  const { state: config } = useConfigurationContext();
  const { session } = useUserSession();
  const { createCliente } = useClientes();
  const { campos: camposConfigurables, esVisible, guardar: guardarCamposConfigurables } =
    useConfiguracionCampos(CAMPOS_OC_DEFAULT, STORAGE_KEY_CAMPOS_OC);
  const [modalCamposAbierto, setModalCamposAbierto] = useState(false);

  // Fuentes de verdad desde Configuración
  const monedaDefault = (
    config.currencies.find((c) => c.isBaseCurrency && c.isActive)?.code ?? 'PEN'
  ) as MonedaCompra;

  const seriesOC = config.series.filter(
    (s) => s.documentType?.code === 'OC' && s.status === 'ACTIVE' && s.isActive,
  );
  const monedaBase = config.currencies.find((c) => c.isBaseCurrency)?.code ?? monedaDefault;

  const [proveedor, setProveedor] = useState<ProveedorSeleccionado | null>(
    ocBase?.proveedorId
      ? { id: ocBase.proveedorId, nombre: ocBase.proveedorNombre ?? '', tipoDocumento: ocBase.proveedorTipoDocumento ?? '6', numeroDocumento: ocBase.proveedorNumeroDocumento ?? '' }
      : null,
  );
  const [direccionFacturacion, setDireccionFacturacion] = useState(
    ocBase?.proveedorDireccionFacturacion ?? '',
  );
  const [direccionEntrega, setDireccionEntrega] = useState(
    ocBase?.proveedorDireccionEntrega ?? '',
  );
  const [serieId, setSerieId] = useState(seriesOC[0]?.series ?? '');
  const [fechaEmision, setFechaEmision] = useState(
    ocBase?.fechaEmision ?? new Date().toISOString().slice(0, 10),
  );
  const [fechaVencimiento, setFechaVencimiento] = useState(ocBase?.fechaVencimiento ?? '');
  const [fechaEntregaEsperada, setFechaEntregaEsperada] = useState(
    ocBase?.fechaEntregaEsperada ?? '',
  );
  const [moneda, setMoneda] = useState<MonedaCompra>(ocBase?.moneda ?? monedaDefault);
  const [tipoCambio, setTipoCambio] = useState(ocBase?.tipoCambio?.toString() ?? '');
  const [formaPago, setFormaPago] = useState<'contado' | 'credito'>(
    ocBase?.formaPago ?? 'contado',
  );
  const [requiereAprobacion, setRequiereAprobacion] = useState(
    ocBase?.requiereAprobacion ?? false,
  );
  const [centroCosto, setCentroCosto] = useState(ocBase?.centroCosto ?? '');
  const [presupuesto, setPresupuesto] = useState(ocBase?.presupuesto ?? '');
  const [observaciones, setObservaciones] = useState(ocBase?.observaciones ?? '');
  const [adjuntos, setAdjuntos] = useState<AdjuntoCompra[]>(ocBase?.adjuntos ?? []);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);

  const lineasCompra = useLineasCompra(ocBase?.lineas ?? []);
  const lineas = lineasCompra.lineas;

  const totalesCalculados = calcularTotalesLineas(lineas);

  async function handleSubmit() {
    const nuevosErrores: string[] = [];
    if (!proveedor) nuevosErrores.push('Selecciona un proveedor.');
    if (!serieId && seriesOC.length > 0) nuevosErrores.push('Selecciona una serie OC.');
    if (seriesOC.length === 0) nuevosErrores.push('No hay series OC configuradas. Ve a Configuración → Series.');
    if (lineas.length === 0) nuevosErrores.push('Agrega al menos una línea.');
    if (lineas.some((l) => !l.productoId)) nuevosErrores.push('Todos los ítems deben provenir de un producto real del catálogo.');
    if (lineas.some((l) => !l.unidadMedida)) nuevosErrores.push('El producto no tiene unidad de medida configurada.');
    if (lineas.some((l) => l.tipoAfectacion === 'sin_configurar')) nuevosErrores.push('El producto no tiene impuesto configurado.');
    if (lineas.some((l) => l.cantidadSolicitada <= 0)) nuevosErrores.push('La cantidad debe ser mayor a cero.');
    if (lineas.some((l) => l.costoUnitario < 0)) nuevosErrores.push('El costo unitario no puede ser negativo.');

    if (nuevosErrores.length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    setErrores([]);
    setEnviando(true);

    try {
      const oc = await registrarOrdenCompra(
        {
          serie: serieId,
          fechaEmision,
          fechaVencimiento: fechaVencimiento || undefined,
          fechaEntregaEsperada: fechaEntregaEsperada || undefined,
          proveedorId: proveedor!.id.toString(),
          proveedorTipoDocumento: proveedor!.tipoDocumento,
          proveedorNumeroDocumento: proveedor!.numeroDocumento,
          proveedorNombre: proveedor!.nombre,
          proveedorDireccionFacturacion: direccionFacturacion || undefined,
          proveedorDireccionEntrega: direccionEntrega || undefined,
          compradorId: session?.userId,
          compradorNombre: session?.userName,
          moneda,
          tipoCambio: tipoCambio ? parseFloat(tipoCambio) : undefined,
          formaPago,
          requiereAprobacion,
          centroCosto: centroCosto || undefined,
          presupuesto: presupuesto || undefined,
          observaciones: observaciones || undefined,
          lineas,
          totales: {
            subtotal: totalesCalculados.subtotal,
            subtotalExonerado: totalesCalculados.subtotalExonerado,
            subtotalInafecto: totalesCalculados.subtotalInafecto,
            descuentoTotal: totalesCalculados.descuentoTotal,
            igv: totalesCalculados.igv,
            total: totalesCalculados.total,
            moneda,
          },
          adjuntos,
        },
        session?.userId,
        session?.userName,
      );
      if (proveedor) {
        await persistirProveedorSiEsNuevo(proveedor, createCliente);
        refrescarProveedores();
      }
      onExito(oc);
    } catch (e) {
      setErrores([e instanceof Error ? e.message : 'Error al registrar la orden.']);
    } finally {
      setEnviando(false);
    }
  }

  function handleSeleccionarProveedor(p: ProveedorSeleccionado | null) {
    setProveedor(p);
    setDireccionFacturacion(p?.direccion ?? '');
    setDireccionEntrega(p?.direccion ?? '');
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <PageHeader
        breadcrumb={
          <Breadcrumb items={[{ label: 'Compras', onClick: onCancelar }, { label: 'Nueva orden de compra' }]} />
        }
        title={
          <div className="flex items-center gap-2.5">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">Nueva Orden de Compra</h1>
              <p className="text-xs text-gray-500">Completa los datos del pedido al proveedor</p>
            </div>
            {serieId && (
              <span className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded">{serieId}</span>
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

        {/* Card principal: Datos de la orden */}
        <FormSectionCard
          titulo="Datos de la orden"
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
                    onSeleccionar={handleSeleccionarProveedor}
                    error={errores.some((e) => e.includes('proveedor')) ? 'Selecciona un proveedor' : null}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Dirección de facturación</label>
                    <input
                      type="text"
                      value={direccionFacturacion}
                      onChange={(e) => setDireccionFacturacion(e.target.value)}
                      placeholder="Dirección de facturación..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Dirección de entrega</label>
                    <input
                      type="text"
                      value={direccionEntrega}
                      onChange={(e) => setDireccionEntrega(e.target.value)}
                      placeholder="Dirección de entrega..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
              </>
            }
            derecha={
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Serie</label>
                    {seriesOC.length > 0 ? (
                      <select
                        value={serieId}
                        onChange={(e) => setSerieId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        {seriesOC.map((s) => (
                          <option key={s.id} value={s.series}>
                            {s.series}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="border border-amber-200 bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-700">
                        Sin serie OC. Ve a Configuración → Series.
                      </div>
                    )}
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
                    <label className="text-sm font-medium text-gray-700">Fecha emisión</label>
                    <input
                      type="date"
                      value={fechaEmision}
                      onChange={(e) => setFechaEmision(e.target.value)}
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
                    <label className="text-sm font-medium text-gray-700">Comprador</label>
                    <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
                      {session?.userName || 'Usuario no identificado'}
                    </div>
                  </div>
                </div>

                {esVisible('entregaEsperada') && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Entrega esperada</label>
                    <input
                      type="date"
                      value={fechaEntregaEsperada}
                      onChange={(e) => setFechaEntregaEsperada(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                )}
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
                {esVisible('requiereAprobacion') && (
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiereAprobacion}
                      onChange={(e) => setRequiereAprobacion(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Requiere aprobación antes de generar comprobante de compra
                  </label>
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
            tiposPermitidos={['cotizacion_proveedor', 'orden_compra_firmada', 'contrato', 'otro']}
            cargadoPor={session?.userName}
            onAgregar={(a) => setAdjuntos((prev) => [...prev, a])}
            onEliminar={(id) => setAdjuntos((prev) => prev.filter((a) => a.id !== id))}
          />
        </FormSectionCard>
      </div>

      <DocumentFormFooter
        infoIzquierda={
          seriesOC.length === 0
            ? 'Configura una serie OC en Configuración → Series'
            : `Serie: ${serieId || '—'} · ${lineas.length} ítem(s)`
        }
        onCancelar={onCancelar}
        onSubmit={handleSubmit}
        textoBotonPrimario="Registrar OC"
        deshabilitado={enviando || seriesOC.length === 0}
        cargando={enviando}
      />

      <FieldsConfigurationModal
        abierto={modalCamposAbierto}
        titulo="Configuración de campos — Orden de Compra"
        campos={camposConfigurables}
        valoresPorDefecto={CAMPOS_OC_DEFAULT}
        onGuardar={(nuevos) => {
          guardarCamposConfigurables(nuevos);
          setModalCamposAbierto(false);
        }}
        onCerrar={() => setModalCamposAbierto(false)}
      />
    </div>
  );
}
