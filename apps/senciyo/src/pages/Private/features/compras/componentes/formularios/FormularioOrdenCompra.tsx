import { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import { useCompras } from '../../contexto/ContextoCompras';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useUserSession } from '@/contexts/UserSessionContext';
import { crearLineaCompraVacia } from '../../servicios/servicioOrdenCompra';
import { calcularTotalesLineas } from '../../logica/reglasCompras';
import type { LineaCompra, TipoAfectacionCompra } from '../../modelos/LineaCompra';
import type { MonedaCompra } from '../../modelos/tiposBaseCompras';
import type { OrdenCompra } from '../../modelos/OrdenCompra';

interface FormularioOrdenCompraProps {
  ocBase?: Partial<OrdenCompra>;
  onExito: (oc: OrdenCompra) => void;
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

export default function FormularioOrdenCompra({
  ocBase,
  onExito,
  onCancelar,
}: FormularioOrdenCompraProps) {
  const { state, registrarOrdenCompra } = useCompras();
  const { state: config } = useConfigurationContext();
  const { session } = useUserSession();

  const seriesOC = config.series.filter(
    (s) => s.documentType?.code === 'orden_compra' && s.status === 'ACTIVE' && s.isActive,
  );

  const [proveedorId, setProveedorId] = useState(ocBase?.proveedorId ?? '');
  const [serieId, setSerieId] = useState(seriesOC[0]?.series ?? '');
  const [fechaEmision, setFechaEmision] = useState(
    ocBase?.fechaEmision ?? new Date().toISOString().slice(0, 10),
  );
  const [fechaVencimiento, setFechaVencimiento] = useState(ocBase?.fechaVencimiento ?? '');
  const [fechaEntregaEsperada, setFechaEntregaEsperada] = useState(
    ocBase?.fechaEntregaEsperada ?? '',
  );
  const [moneda, setMoneda] = useState<MonedaCompra>(ocBase?.moneda ?? 'PEN');
  const [formaPago, setFormaPago] = useState<'contado' | 'credito'>(
    ocBase?.formaPago ?? 'contado',
  );
  const [requiereAprobacion, setRequiereAprobacion] = useState(
    ocBase?.requiereAprobacion ?? false,
  );
  const [observaciones, setObservaciones] = useState(ocBase?.observaciones ?? '');
  const [lineas, setLineas] = useState<LineaCompra[]>(
    ocBase?.lineas ?? [crearLineaCompraVacia(generarIdLinea())],
  );
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);

  const proveedor = state.proveedores.find((p) => p.id.toString() === proveedorId);

  // Recalcular totales de cada línea al cambiar
  useEffect(() => {
    setLineas((prev) =>
      prev.map((l) => {
        const neto = l.cantidadSolicitada * l.costoUnitario - (l.descuentoUnitario ?? 0) * l.cantidadSolicitada;
        const igv = l.tipoAfectacion === 'gravado' ? neto * (1 - 1 / (1 + (l.tasaIgv ?? 0.18))) : 0;
        const base = l.tipoAfectacion === 'gravado' ? neto / (1 + (l.tasaIgv ?? 0.18)) : neto;
        return {
          ...l,
          subtotal: Math.round(base * 100) / 100,
          igv: Math.round(igv * 100) / 100,
          total: Math.round(neto * 100) / 100,
          cantidadPendienteRecepcion: l.cantidadSolicitada,
        };
      }),
    );
  }, []); // solo al montar

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
      igv = 0;
    }
    return {
      ...linea,
      subtotal: Math.round(subtotal * 100) / 100,
      igv: Math.round(igv * 100) / 100,
      total: Math.round(neto * 100) / 100,
      cantidadPendienteRecepcion: linea.cantidadSolicitada,
      cantidadPendienteFacturacion: 0,
      cantidadPendienteInventario: 0,
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
    if (!serieId && seriesOC.length > 0) nuevosErrores.push('Selecciona una serie.');
    if (lineas.length === 0) nuevosErrores.push('Agrega al menos una línea.');
    if (lineas.some((l) => !l.nombreProducto.trim())) nuevosErrores.push('Todas las líneas deben tener descripción.');
    if (lineas.some((l) => l.cantidadSolicitada <= 0)) nuevosErrores.push('La cantidad de cada línea debe ser mayor a 0.');

    if (nuevosErrores.length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    setErrores([]);
    setEnviando(true);

    try {
      const prov = proveedor!;
      const docParsed = parsearDocumentoCliente(prov.document ?? '');
      const serieActual = serieId || 'OC';

      const oc = await registrarOrdenCompra(
        {
          serie: serieActual,
          fechaEmision,
          fechaVencimiento: fechaVencimiento || undefined,
          fechaEntregaEsperada: fechaEntregaEsperada || undefined,
          proveedorId: prov.id.toString(),
          proveedorTipoDocumento: prov.tipoDocumento ?? docParsed.tipo,
          proveedorNumeroDocumento: prov.numeroDocumento ?? docParsed.numero,
          proveedorNombre: prov.name,
          moneda,
          formaPago,
          requiereAprobacion,
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
        },
        session?.userId,
        session?.userName,
      );
      onExito(oc);
    } catch (e) {
      setErrores([e instanceof Error ? e.message : 'Error al registrar la orden.']);
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
            <button
              onClick={onCancelar}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Nueva Orden de Compra</h1>
              <p className="text-xs text-gray-500">Completa los datos del pedido al proveedor</p>
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
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              {enviando ? 'Guardando...' : 'Registrar OC'}
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

        {/* Sección 1: Proveedor */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Proveedor</h2>

          {state.proveedores.length === 0 ? (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              No se encontraron proveedores. Ve a Gestión de Clientes y agrega contactos con tipo
              &quot;Proveedor&quot;.
            </div>
          ) : (
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Selecciona un proveedor...</option>
              {state.proveedores.map((p) => (
                <option key={p.id} value={p.id.toString()}>
                  {p.name} — {p.document}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Sección 2: Datos de la OC */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Datos de la orden</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {/* Serie */}
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
                <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 bg-gray-50">
                  Sin serie configurada
                </div>
              )}
            </div>

            {/* Moneda */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Moneda</label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as MonedaCompra)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="PEN">S/ Soles (PEN)</option>
                <option value="USD">$ Dólares (USD)</option>
              </select>
            </div>

            {/* Forma de pago */}
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

            {/* Fecha emisión */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Fecha emisión</label>
              <input
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Fecha vencimiento */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">F. vencimiento (opcional)</label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Fecha entrega esperada */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Entrega esperada (opcional)</label>
              <input
                type="date"
                value={fechaEntregaEsperada}
                onChange={(e) => setFechaEntregaEsperada(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Requiere aprobación */}
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={requiereAprobacion}
              onChange={(e) => setRequiereAprobacion(e.target.checked)}
              className="rounded border-gray-300"
            />
            Requiere aprobación antes de generar comprobante de compra
          </label>

          {/* Observaciones */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Observaciones (opcional)</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              placeholder="Notas adicionales para esta orden..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Sección 3: Líneas */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Ítems del pedido</h2>
            <button
              onClick={agregarLinea}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <Plus size={16} /> Agregar línea
            </button>
          </div>

          {/* Cabecera de tabla */}
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide px-1">
            <div className="col-span-4">Descripción</div>
            <div className="col-span-2">Unidad</div>
            <div className="col-span-1 text-right">Cantidad</div>
            <div className="col-span-2 text-right">Costo unit.</div>
            <div className="col-span-1">Afectación</div>
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
                  placeholder="Nombre del producto o servicio..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  value={linea.unidadMedida}
                  onChange={(e) => actualizarLinea(linea.id, 'unidadMedida', e.target.value)}
                  placeholder="Unidad..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="col-span-1">
                <select
                  value={linea.tipoAfectacion}
                  onChange={(e) =>
                    actualizarLinea(linea.id, 'tipoAfectacion', e.target.value as TipoAfectacionCompra)
                  }
                  className="w-full border border-gray-300 rounded-lg px-1 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
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
              {totalesCalculados.subtotalExonerado > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Exonerado:</span>
                  <span className="font-mono">
                    {totalesCalculados.subtotalExonerado.toFixed(2)} {moneda}
                  </span>
                </div>
              )}
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
      </div>
    </div>
  );
}
