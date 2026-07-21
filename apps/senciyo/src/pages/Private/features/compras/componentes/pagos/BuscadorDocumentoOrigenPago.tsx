import { useEffect, useMemo, useState } from 'react';
import { Search, CreditCard, Building2, ChevronLeft, Check } from 'lucide-react';
import { formatMoney, normalizarImporte } from '@/shared/currency';
import type { CuentaPorPagar } from '../../modelos/CuentaPorPagar';
import type { MonedaCompra } from '../../modelos/tiposBaseCompras';
import { filtrarCuentasPorPagar } from '../../logica/filtrosCompras';
import { puedeRegistrarPago, resolverNombreFormaPago } from '../../logica/reglasCompras';
import { getNombreTipoDocumentoProveedor } from '../../constantes/tiposDocumentoProveedor';
import { formatearFechaCompra } from '../../utilidades/formatearCompras';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';

interface BuscadorDocumentoOrigenPagoProps {
  cuentasPorPagar: CuentaPorPagar[];
  /** Preselección al entrar desde la acción "Pagar" de una CxP específica. */
  proveedorIdInicial?: string;
  cxpIdsPreseleccionadas?: string[];
  onContinuar: (seleccion: { cxps: CuentaPorPagar[]; importesIniciales: Record<string, number> }) => void;
}

/**
 * Paso previo real de "Registrar pago" (§6-§9 del alcance): proveedor →
 * moneda → selección múltiple de documentos pendientes del mismo proveedor y
 * moneda, cada uno con un importe a aplicar editable (por defecto, su saldo
 * pendiente completo). Solo lista CxP con saldo pendiente > 0 y estado
 * pendiente/parcial (nunca pagadas, anuladas o sin saldo) — no permite crear
 * ni escribir una CxP inexistente, solo seleccionar reales.
 */
export default function BuscadorDocumentoOrigenPago({
  cuentasPorPagar,
  proveedorIdInicial,
  cxpIdsPreseleccionadas,
  onContinuar,
}: BuscadorDocumentoOrigenPagoProps) {
  const { state: config } = useConfigurationContext();
  const [busqueda, setBusqueda] = useState('');
  const [proveedorId, setProveedorId] = useState<string | null>(proveedorIdInicial ?? null);
  const [moneda, setMoneda] = useState<MonedaCompra | null>(null);
  const [importes, setImportes] = useState<Record<string, number>>({});

  const candidatas = useMemo(
    () => cuentasPorPagar.filter((cxp) => puedeRegistrarPago(cxp) && cxp.saldoPendiente > 0),
    [cuentasPorPagar],
  );

  const proveedores = useMemo(() => {
    const mapa = new Map<string, { id: string; nombre: string; numeroDocumento: string; cantidad: number }>();
    candidatas.forEach((cxp) => {
      const actual = mapa.get(cxp.proveedorId) ?? {
        id: cxp.proveedorId,
        nombre: cxp.proveedorNombre,
        numeroDocumento: cxp.proveedorNumeroDocumento,
        cantidad: 0,
      };
      actual.cantidad += 1;
      mapa.set(cxp.proveedorId, actual);
    });
    return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [candidatas]);

  const proveedorFiltrados = proveedores.filter(
    (p) =>
      !busqueda ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.numeroDocumento.includes(busqueda),
  );

  const documentosProveedor = useMemo(
    () => (proveedorId ? candidatas.filter((cxp) => cxp.proveedorId === proveedorId) : []),
    [candidatas, proveedorId],
  );

  const monedasDisponibles = useMemo(
    () => Array.from(new Set(documentosProveedor.map((cxp) => cxp.moneda))),
    [documentosProveedor],
  );

  // Auto-resuelve moneda: única disponible, o la del documento preseleccionado.
  useEffect(() => {
    if (!proveedorId) return;
    if (moneda && monedasDisponibles.includes(moneda)) return;
    if (cxpIdsPreseleccionadas?.length) {
      const preseleccionada = documentosProveedor.find((c) => cxpIdsPreseleccionadas.includes(c.id));
      if (preseleccionada) {
        setMoneda(preseleccionada.moneda);
        return;
      }
    }
    if (monedasDisponibles.length === 1) {
      setMoneda(monedasDisponibles[0]);
    } else {
      setMoneda(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proveedorId, monedasDisponibles.join(',')]);

  const documentosCompatibles = useMemo(
    () => documentosProveedor.filter((cxp) => cxp.moneda === moneda),
    [documentosProveedor, moneda],
  );

  // Preselección inicial (acceso "Pagar" desde una CxP puntual): importe = saldo pendiente completo.
  useEffect(() => {
    if (!cxpIdsPreseleccionadas?.length || !moneda) return;
    setImportes((prev) => {
      const siguiente = { ...prev };
      let cambio = false;
      documentosCompatibles.forEach((cxp) => {
        if (cxpIdsPreseleccionadas.includes(cxp.id) && siguiente[cxp.id] === undefined) {
          siguiente[cxp.id] = cxp.saldoPendiente;
          cambio = true;
        }
      });
      return cambio ? siguiente : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moneda, documentosCompatibles.length]);

  const documentosFiltrados = filtrarCuentasPorPagar(documentosCompatibles, { busqueda });

  function alternarSeleccion(cxp: CuentaPorPagar) {
    setImportes((prev) => {
      const siguiente = { ...prev };
      if ((siguiente[cxp.id] ?? 0) > 0) {
        delete siguiente[cxp.id];
      } else {
        siguiente[cxp.id] = cxp.saldoPendiente;
      }
      return siguiente;
    });
  }

  function cambiarImporte(cxp: CuentaPorPagar, valor: number) {
    const seguro = normalizarImporte(Math.max(0, Math.min(cxp.saldoPendiente, Number.isFinite(valor) ? valor : 0)), cxp.moneda);
    setImportes((prev) => ({ ...prev, [cxp.id]: seguro }));
  }

  function volverAProveedores() {
    setProveedorId(null);
    setMoneda(null);
    setImportes({});
    setBusqueda('');
  }

  function cambiarMoneda(nuevaMoneda: MonedaCompra) {
    setMoneda(nuevaMoneda);
    setImportes({});
  }

  const seleccionadas = documentosCompatibles.filter((cxp) => (importes[cxp.id] ?? 0) > 0);
  const totalSeleccionado = seleccionadas.reduce((acc, cxp) => acc + (importes[cxp.id] ?? 0), 0);

  function handleContinuar() {
    if (seleccionadas.length === 0) return;
    onContinuar({ cxps: seleccionadas, importesIniciales: importes });
  }

  // ---------------------------------------------------------------------
  // Paso 1: proveedor
  // ---------------------------------------------------------------------
  if (!proveedorId) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar proveedor por nombre o RUC/DNI..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {proveedorFiltrados.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {proveedores.length === 0 ? 'No hay proveedores con cuentas por pagar pendientes' : 'Sin resultados para la búsqueda'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Documentos pendientes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {proveedorFiltrados.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setProveedorId(p.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-gray-400 shrink-0" />
                        <div>
                          <div className="font-medium text-gray-900">{p.nombre}</div>
                          <div className="text-xs text-gray-500">{p.numeroDocumento}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{p.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const proveedorActivo = proveedores.find((p) => p.id === proveedorId);

  // ---------------------------------------------------------------------
  // Paso 2 (si aplica): moneda
  // ---------------------------------------------------------------------
  if (!moneda) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={volverAProveedores}
          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <ChevronLeft size={16} /> Cambiar proveedor
        </button>
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">{proveedorActivo?.nombre}</span> tiene documentos pendientes en más de una moneda. Selecciona con cuál vas a pagar.
        </p>
        <div className="flex flex-wrap gap-2">
          {monedasDisponibles.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => cambiarMoneda(m)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-blue-300"
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Paso 3: documentos pendientes (selección múltiple + importe a aplicar)
  // ---------------------------------------------------------------------
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <button type="button" onClick={volverAProveedores} className="flex items-center gap-1 text-blue-600 hover:underline">
            <ChevronLeft size={16} /> Cambiar proveedor
          </button>
          <span className="text-gray-300">·</span>
          <span className="font-medium text-gray-900">{proveedorActivo?.nombre}</span>
          {monedasDisponibles.length > 1 && (
            <>
              <span className="text-gray-300">·</span>
              <button type="button" onClick={() => cambiarMoneda(moneda)} className="text-blue-600 hover:underline">
                Moneda: {moneda}
              </button>
            </>
          )}
          {monedasDisponibles.length <= 1 && <span>· Moneda: {moneda}</span>}
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por número de comprobante..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {documentosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin resultados para la búsqueda</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-10 px-4 py-3" />
                <th className="text-left px-4 py-3 font-medium text-gray-600">Documento</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Condición</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimiento</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Saldo pendiente</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Importe a aplicar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documentosFiltrados.map((cxp) => {
                const seleccionado = (importes[cxp.id] ?? 0) > 0;
                return (
                  <tr
                    key={cxp.id}
                    className={`transition-colors cursor-pointer ${seleccionado ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}
                    onClick={() => alternarSeleccion(cxp)}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
                          seleccionado ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'
                        }`}
                      >
                        {seleccionado && <Check size={12} />}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">
                      {cxp.comprobanteCompraNumero}
                      <div className="text-xs text-gray-400 font-sans">
                        {getNombreTipoDocumentoProveedor(cxp.tipoComprobanteOrigen)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{resolverNombreFormaPago(cxp, config.paymentMethods)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {cxp.fechaVencimiento ? formatearFechaCompra(cxp.fechaVencimiento) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {formatMoney(cxp.saldoPendiente, cxp.moneda)}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        min={0}
                        max={cxp.saldoPendiente}
                        step="0.01"
                        disabled={!seleccionado}
                        value={seleccionado ? (importes[cxp.id] ?? 0) : ''}
                        onChange={(e) => cambiarImporte(cxp, parseFloat(e.target.value))}
                        className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <span className="text-sm text-gray-600">
          {seleccionadas.length} documento{seleccionadas.length !== 1 ? 's' : ''} seleccionado{seleccionadas.length !== 1 ? 's' : ''}
        </span>
        <span className="text-sm font-semibold text-gray-900">
          Total: {formatMoney(totalSeleccionado, moneda)}
        </span>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleContinuar}
          disabled={seleccionadas.length === 0}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continuar con el pago
        </button>
      </div>
    </div>
  );
}
