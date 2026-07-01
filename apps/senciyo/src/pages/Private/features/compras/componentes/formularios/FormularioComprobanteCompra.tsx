import { useState } from 'react';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { useCompras } from '../../contexto/ContextoCompras';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useUserSession } from '@/contexts/UserSessionContext';
import { calcularTotalesLineas } from '../../logica/reglasCompras';
import { crearLineaCompraVacia } from '../../servicios/servicioOrdenCompra';
import { TIPOS_DOCUMENTO_PROVEEDOR } from '../../constantes/tiposDocumentoProveedor';
import type { LineaCompra, TipoAfectacionCompra } from '../../modelos/LineaCompra';
import type { ModalidadInventarioCC } from '../../modelos/ComprobanteCompra';
import type { ComprobanteCompra } from '../../modelos/ComprobanteCompra';
import type { CuentaPorPagar } from '../../modelos/CuentaPorPagar';
import type { MonedaCompra } from '../../modelos/tiposBaseCompras';
import type { OrdenCompra } from '../../modelos/OrdenCompra';

interface FormularioComprobanteCompraProps {
  ocOrigen?: OrdenCompra;
  onExito: (cc: ComprobanteCompra, cxp: CuentaPorPagar | null) => void;
  onCancelar: () => void;
}

function generarIdLinea(): string {
  return `linea-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function parsearDocumentoCliente(document: string): { tipo: string; numero: string } {
  const partes = document.trim().split(' ');
  if (partes.length >= 2) {
    const tipo = partes[0].toUpperCase() === 'RUC' ? '6' : '1';
    return { tipo, numero: partes.slice(1).join('') };
  }
  return { tipo: '1', numero: document };
}

export default function FormularioComprobanteCompra({
  ocOrigen,
  onExito,
  onCancelar,
}: FormularioComprobanteCompraProps) {
  const { state, registrarComprobanteCompra } = useCompras();
  const { state: config } = useConfigurationContext();
  const { session } = useUserSession();

  const almacenesActivos = config.almacenes.filter((a) => a.estaActivoAlmacen);

  // Si viene de OC, precargar datos
  const ocProveedorId = ocOrigen?.proveedorId ?? '';

  const [proveedorId, setProveedorId] = useState(ocProveedorId);
  const [tipoComprobante, setTipoComprobante] = useState('01');
  const [serieProveedor, setSerieProveedor] = useState('');
  const [numeroProveedor, setNumeroProveedor] = useState('');
  const [fechaEmisionProveedor, setFechaEmisionProveedor] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [moneda, setMoneda] = useState<MonedaCompra>(ocOrigen?.moneda ?? 'PEN');
  const [formaPago, setFormaPago] = useState<'contado' | 'credito'>(
    ocOrigen?.formaPago ?? 'contado',
  );
  const [modalidadInventario, setModalidadInventario] = useState<ModalidadInventarioCC>(
    'con_nota_ingreso',
  );
  const [almacenDestinoId, setAlmacenDestinoId] = useState(almacenesActivos[0]?.id ?? '');
  const [observaciones, setObservaciones] = useState('');
  const [lineas, setLineas] = useState<LineaCompra[]>(
    ocOrigen?.lineas ?? [crearLineaCompraVacia(generarIdLinea())],
  );
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);

  const proveedor = state.proveedores.find((p) => p.id.toString() === proveedorId);

  function recalcularLinea(linea: LineaCompra): LineaCompra {
    const bruto = linea.cantidadSolicitada * linea.costoUnitario;
    const desc = (linea.descuentoUnitario ?? 0) * linea.cantidadSolicitada;
    const neto = bruto - desc;
    const tasa = linea.tasaIgv ?? 0.18;
    let subtotal = 0;
    let igv = 0;
    if (linea.tipoAfectacion === 'gravado') {
      subtotal = neto / (1 + tasa);
      igv = neto - subtotal;
    } else {
      subtotal = neto;
    }
    const almacen = almacenesActivos.find((a) => a.id === almacenDestinoId);
    return {
      ...linea,
      subtotal: Math.round(subtotal * 100) / 100,
      igv: Math.round(igv * 100) / 100,
      total: Math.round(neto * 100) / 100,
      cantidadPendienteRecepcion: linea.cantidadSolicitada,
      cantidadPendienteFacturacion: 0,
      cantidadPendienteInventario: 0,
      almacenDestinoId: almacen?.id,
      almacenDestinoNombre: almacen?.nombreAlmacen,
    };
  }

  function actualizarLinea(id: string, campo: keyof LineaCompra, valor: unknown) {
    setLineas((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const actualizada = { ...l, [campo]: valor } as LineaCompra;
        return recalcularLinea(actualizada);
      }),
    );
  }

  function agregarLinea() {
    setLineas((prev) => [...prev, crearLineaCompraVacia(generarIdLinea())]);
  }

  function eliminarLinea(id: string) {
    setLineas((prev) => prev.filter((l) => l.id !== id));
  }

  const totalesCalculados = calcularTotalesLineas(lineas);

  async function handleSubmit() {
    const nuevosErrores: string[] = [];
    if (!proveedorId) nuevosErrores.push('Selecciona un proveedor.');
    if (!serieProveedor.trim()) nuevosErrores.push('Ingresa la serie del comprobante del proveedor.');
    if (!numeroProveedor.trim()) nuevosErrores.push('Ingresa el número del comprobante del proveedor.');
    if (lineas.length === 0) nuevosErrores.push('Agrega al menos una línea.');
    if (lineas.some((l) => !l.nombreProducto.trim())) nuevosErrores.push('Todas las líneas deben tener descripción.');

    if (nuevosErrores.length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    setErrores([]);
    setEnviando(true);

    try {
      const prov = proveedor!;
      const docParsed = parsearDocumentoCliente(prov.document ?? '');
      const lineasConAlmacen = lineas.map((l) => recalcularLinea(l));

      const { comprobante, cuentaPorPagar } = await registrarComprobanteCompra(
        {
          tipoComprobanteProveedor: tipoComprobante,
          serieProveedor: serieProveedor.toUpperCase(),
          numeroProveedor: numeroProveedor.trim(),
          fechaEmisionProveedor,
          fechaRegistro: new Date().toISOString(),
          fechaVencimiento: fechaVencimiento || undefined,
          proveedorId: prov.id.toString(),
          proveedorTipoDocumento: prov.tipoDocumento ?? docParsed.tipo,
          proveedorNumeroDocumento: prov.numeroDocumento ?? docParsed.numero,
          proveedorNombre: prov.name,
          moneda,
          formaPago,
          modalidadInventario,
          lineas: lineasConAlmacen,
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
        },
        session?.userId,
      );

      onExito(comprobante, cuentaPorPagar);
    } catch (e) {
      setErrores([e instanceof Error ? e.message : 'Error al registrar el comprobante.']);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={onCancelar} className="text-gray-400 hover:text-gray-600 p-1">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Registrar Comprobante de Compra</h1>
              <p className="text-xs text-gray-500">
                {ocOrigen ? `Desde OC: ${ocOrigen.numero}` : 'Registro directo de comprobante'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancelar}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={enviando}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              {enviando ? 'Guardando...' : 'Registrar CC'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {errores.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 space-y-1">
            {errores.map((e, i) => (
              <p key={i} className="text-sm text-red-700">• {e}</p>
            ))}
          </div>
        )}

        {/* Proveedor */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Proveedor</h2>
          <select
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            disabled={!!ocOrigen}
          >
            <option value="">Selecciona un proveedor...</option>
            {state.proveedores.map((p) => (
              <option key={p.id} value={p.id.toString()}>
                {p.name} — {p.document}
              </option>
            ))}
          </select>
        </div>

        {/* Datos del comprobante del proveedor */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Datos del comprobante</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Tipo de comprobante</label>
              <select
                value={tipoComprobante}
                onChange={(e) => setTipoComprobante(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {TIPOS_DOCUMENTO_PROVEEDOR.map((t) => (
                  <option key={t.codigo} value={t.codigo}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Serie</label>
              <input
                type="text"
                value={serieProveedor}
                onChange={(e) => setSerieProveedor(e.target.value)}
                placeholder="F001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Número</label>
              <input
                type="text"
                value={numeroProveedor}
                onChange={(e) => setNumeroProveedor(e.target.value)}
                placeholder="00000001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">F. emisión (proveedor)</label>
              <input
                type="date"
                value={fechaEmisionProveedor}
                onChange={(e) => setFechaEmisionProveedor(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">F. vencimiento (opcional)</label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Moneda</label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as MonedaCompra)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="PEN">S/ Soles (PEN)</option>
                <option value="USD">$ Dólares (USD)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Forma de pago</label>
              <select
                value={formaPago}
                onChange={(e) => setFormaPago(e.target.value as 'contado' | 'credito')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="contado">Contado</option>
                <option value="credito">Crédito</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modalidad de inventario */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Afectación de inventario</h2>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                {
                  value: 'con_nota_ingreso',
                  label: 'Con Nota de Ingreso',
                  desc: 'Se creará una NI manual en Inventario',
                },
                {
                  value: 'ingreso_automatico',
                  label: 'Ingreso automático',
                  desc: 'Stock se actualiza al registrar',
                },
                {
                  value: 'no_afecta_inventario',
                  label: 'No afecta inventario',
                  desc: 'Servicios o gastos sin stock',
                },
              ] as { value: ModalidadInventarioCC; label: string; desc: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setModalidadInventario(opt.value)}
                className={`text-left p-3 rounded-lg border-2 transition-colors ${
                  modalidadInventario === opt.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-sm text-gray-900">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
          {modalidadInventario !== 'no_afecta_inventario' && almacenesActivos.length > 0 && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Almacén de destino</label>
              <select
                value={almacenDestinoId}
                onChange={(e) => setAlmacenDestinoId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {almacenesActivos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombreAlmacen} ({a.codigoAlmacen})
                  </option>
                ))}
              </select>
            </div>
          )}
          {modalidadInventario !== 'no_afecta_inventario' && almacenesActivos.length === 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              No hay almacenes activos configurados.
            </p>
          )}
        </div>

        {/* Líneas */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Ítems</h2>
            <button
              onClick={agregarLinea}
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <Plus size={16} /> Agregar línea
            </button>
          </div>

          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide px-1">
            <div className="col-span-4">Descripción</div>
            <div className="col-span-2">Unidad</div>
            <div className="col-span-1 text-right">Cant.</div>
            <div className="col-span-2 text-right">Costo unit.</div>
            <div className="col-span-1">Afect.</div>
            <div className="col-span-1 text-right">Total</div>
            <div className="col-span-1" />
          </div>

          {lineas.map((linea) => (
            <div key={linea.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <input
                  type="text"
                  value={linea.nombreProducto}
                  onChange={(e) => actualizarLinea(linea.id, 'nombreProducto', e.target.value)}
                  placeholder="Descripción..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  value={linea.unidadMedida}
                  onChange={(e) => actualizarLinea(linea.id, 'unidadMedida', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="col-span-1">
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={linea.cantidadSolicitada}
                  onChange={(e) =>
                    actualizarLinea(linea.id, 'cantidadSolicitada', parseFloat(e.target.value) || 0)
                  }
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={linea.costoUnitario}
                  onChange={(e) =>
                    actualizarLinea(linea.id, 'costoUnitario', parseFloat(e.target.value) || 0)
                  }
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="col-span-1">
                <select
                  value={linea.tipoAfectacion}
                  onChange={(e) =>
                    actualizarLinea(linea.id, 'tipoAfectacion', e.target.value as TipoAfectacionCompra)
                  }
                  className="w-full border border-gray-300 rounded-lg px-1 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="gravado">Grav.</option>
                  <option value="exonerado">Exon.</option>
                  <option value="inafecto">Inaf.</option>
                </select>
              </div>
              <div className="col-span-1 text-right text-sm font-mono font-medium text-gray-700">
                {linea.total.toFixed(2)}
              </div>
              <div className="col-span-1 flex justify-end">
                {lineas.length > 1 && (
                  <button
                    onClick={() => eliminarLinea(linea.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Totales */}
          <div className="border-t border-gray-200 pt-4 flex justify-end">
            <div className="space-y-1 text-sm min-w-48">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-mono">
                  {totalesCalculados.subtotal.toFixed(2)} {moneda}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IGV (18%):</span>
                <span className="font-mono">
                  {totalesCalculados.igv.toFixed(2)} {moneda}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 text-base pt-1 border-t border-gray-200">
                <span>Total:</span>
                <span className="font-mono">
                  {totalesCalculados.total.toFixed(2)} {moneda}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 space-y-2">
          <h2 className="font-semibold text-gray-900">Observaciones</h2>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            placeholder="Notas opcionales..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>
    </div>
  );
}
