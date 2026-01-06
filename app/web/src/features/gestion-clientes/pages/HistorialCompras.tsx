import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, DollarSign, FileText, Search, ShoppingCart, Download } from 'lucide-react';
import DetalleCompraModal from '../components/DetalleCompraModal';
import { useCompras } from '../hooks';
import type { CompraDetalle, Producto } from '../models';

type TabId = 'ventas' | 'productos' | 'cobros' | 'anulaciones';

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'ventas', label: 'Ventas' },
  { id: 'productos', label: 'Productos' },
  { id: 'cobros', label: 'Cobros' },
  { id: 'anulaciones', label: 'Anulaciones' },
];

const BASE_ESTADO_FILTER = 'Todos';

const currencySymbol = (currency?: string) => {
  const code = currency?.toUpperCase();
  if (code === 'USD') return '$';
  if (code === 'EUR') return '€';
  if (code === 'CLP') return '$';
  if (code === 'MXN') return '$';
  return 'S/';
};

const formatCurrency = (value: number, currency?: string) =>
  `${currencySymbol(currency)} ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const estadoComprobanteBadge = (color?: string) => {
  switch (color) {
    case 'green':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'orange':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    case 'red':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'blue':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

const cobroBadgeClass = (estado?: string) => {
  switch (estado?.toLowerCase()) {
    case 'cancelado':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'pendiente':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'parcial':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'vencido':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    case 'anulado':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

const tipoColor = (tipo: string) => {
  const normalized = tipo.toLowerCase();
  if (normalized.includes('fact')) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  }
  if (normalized.includes('boleta')) {
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
  }
  return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300';
};

const formatEstadoLabel = (value?: string) => {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const LoadingSpinner = ({ message }: { message?: string }) => (
  <div className="flex items-center justify-center py-10">
    <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    <span className="ml-3 text-sm text-gray-600 dark:text-gray-300">{message ?? 'Cargando...'}</span>
  </div>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="py-10 text-center text-gray-500 dark:text-gray-400">
    <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-gray-400" />
    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</p>
    <p className="text-sm">{description}</p>
  </div>
);

const TabToolbar: React.FC<{
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  children?: React.ReactNode;
  onExport?: () => void;
  disableExport?: boolean;
  exportLabel: string;
}> = ({ searchPlaceholder, searchValue, onSearchChange, children, onExport, disableExport, exportLabel }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div className="flex flex-1 flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden />
        <input
          type="search"
          aria-label={searchPlaceholder}
          className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      {children}
    </div>
    {onExport ? (
      <button
        type="button"
        aria-label={exportLabel}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
        onClick={onExport}
        disabled={disableExport}
      >
        <Download className="h-4 w-4" />
      </button>
    ) : null}
  </div>
);

const Pagination: React.FC<{
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}> = ({ page, pageSize, total, onChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const canPrev = page > 1;
  const canNext = page < totalPages;
  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
      <span>
        Página {page} de {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-100 disabled:opacity-40 dark:border-gray-600 dark:text-gray-200"
          onClick={() => onChange(page - 1)}
          disabled={!canPrev}
        >
          Anterior
        </button>
        <button
          type="button"
          className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-100 disabled:opacity-40 dark:border-gray-600 dark:text-gray-200"
          onClick={() => onChange(page + 1)}
          disabled={!canNext}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};

const downloadCsv = (rows: string[][], filename: string) => {
  if (typeof window === 'undefined' || !rows.length) return;
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.click();
  URL.revokeObjectURL(url);
};

const HistorialCompras: React.FC = () => {
  const navigate = useNavigate();
  const { clienteId, clienteName } = useParams();
  const decodedClienteName = clienteName ? decodeURIComponent(clienteName) : undefined;
  const {
    compras,
    cobranzas,
    loadingList,
    loadingDetalle,
    error,
    getCompraDetalle,
    reload,
  } = useCompras(clienteId, decodedClienteName);

  const [modalOpen, setModalOpen] = useState(false);
  const [compraSeleccionada, setCompraSeleccionada] = useState<CompraDetalle | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('ventas');
  const [ventasSearch, setVentasSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>(BASE_ESTADO_FILTER);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [ventasPage, setVentasPage] = useState(1);
  const [productosSearch, setProductosSearch] = useState('');
  const [productosPage, setProductosPage] = useState(1);
  const [anulacionesSearch, setAnulacionesSearch] = useState('');
  const [cobrosSearch, setCobrosSearch] = useState('');
  const pageSize = 8;

  const sortedCompras = useMemo(
    () =>
      [...compras].sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      ),
    [compras]
  );

  const estadoOptions = useMemo(() => {
    const uniqueEstados = new Set<string>();
    compras.forEach((compra) => {
      if (compra.estadoComprobante) {
        uniqueEstados.add(compra.estadoComprobante);
      }
    });
    return [BASE_ESTADO_FILTER, ...Array.from(uniqueEstados)];
  }, [compras]);

  const metrics = useMemo(() => {
    if (!sortedCompras.length) {
      return {
        totalDocumentos: 0,
        montoTotal: null as number | null,
        ticketPromedio: null as number | null,
        ultimaVenta: null as string | null,
        currency: null as string | null,
      };
    }
    const totalDocumentos = sortedCompras.length;
    const currencies = new Set(sortedCompras.map((compra) => compra.moneda ?? 'PEN'));
    const singleCurrency = currencies.size === 1 ? currencies.values().next().value : null;
    const montoTotal = sortedCompras.reduce((sum, compra) => sum + compra.monto, 0);
    return {
      totalDocumentos,
      montoTotal: singleCurrency ? montoTotal : null,
      ticketPromedio: singleCurrency && totalDocumentos ? montoTotal / totalDocumentos : null,
      ultimaVenta: sortedCompras[0]?.fechaDisplay ?? null,
      currency: singleCurrency,
    };
  }, [sortedCompras]);

  const filteredVentas = useMemo(() => {
    const search = ventasSearch.trim().toLowerCase();
    return sortedCompras.filter((compra) => {
      if (search) {
        const searchTarget = `${compra.comprobante} ${compra.tipoComprobante} ${compra.monto} ${compra.estadoComprobante}`.toLowerCase();
        if (!searchTarget.includes(search)) {
          return false;
        }
      }
      if (estadoFilter !== BASE_ESTADO_FILTER && compra.estadoComprobante !== estadoFilter) {
        return false;
      }
      if (dateFrom && new Date(compra.fecha) < new Date(dateFrom)) {
        return false;
      }
      if (dateTo && new Date(compra.fecha) > new Date(dateTo)) {
        return false;
      }
      return true;
    });
  }, [sortedCompras, ventasSearch, estadoFilter, dateFrom, dateTo]);

  const ventasPageItems = useMemo(() => {
    const start = (ventasPage - 1) * pageSize;
    return filteredVentas.slice(start, start + pageSize);
  }, [filteredVentas, ventasPage, pageSize]);

  const aggregatedProductos = useMemo(() => {
    const summary = new Map<string, { producto: Producto; cantidad: number; monto: number; ultimaFecha: string | null; moneda?: string }>();
    sortedCompras.forEach((compra) => {
      (compra.items ?? []).forEach((item) => {
        const current = summary.get(String(item.id));
        const subtotal = item.subtotal ?? item.cantidad * item.precioUnitario;
        const existingFecha = current?.ultimaFecha ?? null;
        const newestFecha = !existingFecha || new Date(compra.fecha) > new Date(existingFecha) ? compra.fecha : existingFecha;
        const compraCurrency = compra.moneda ?? current?.moneda;
        const moneda = current && compra.moneda && current.moneda && current.moneda !== compra.moneda ? undefined : compraCurrency;
        summary.set(String(item.id), {
          producto: item,
          cantidad: (current?.cantidad ?? 0) + item.cantidad,
          monto: Number(((current?.monto ?? 0) + subtotal).toFixed(2)),
          ultimaFecha: newestFecha,
          moneda,
        });
      });
    });
    return Array.from(summary.values());
  }, [sortedCompras]);

  const filteredProductos = useMemo(() => {
    const search = productosSearch.trim().toLowerCase();
    return aggregatedProductos.filter((item) =>
      item.producto.nombre.toLowerCase().includes(search)
    );
  }, [aggregatedProductos, productosSearch]);

  const productosPageItems = useMemo(() => {
    const start = (productosPage - 1) * pageSize;
    return filteredProductos.slice(start, start + pageSize);
  }, [filteredProductos, productosPage, pageSize]);

  useEffect(() => {
    const maxVentasPage = Math.max(1, Math.ceil(filteredVentas.length / pageSize) || 1);
    if (ventasPage > maxVentasPage) {
      setVentasPage(maxVentasPage);
    }
  }, [filteredVentas.length, pageSize, ventasPage]);

  useEffect(() => {
    const maxProductosPage = Math.max(1, Math.ceil(filteredProductos.length / pageSize) || 1);
    if (productosPage > maxProductosPage) {
      setProductosPage(maxProductosPage);
    }
  }, [filteredProductos.length, pageSize, productosPage]);

  const anulaciones = useMemo(
    () => sortedCompras.filter((compra) => compra.estadoComprobante?.toLowerCase() === 'anulado'),
    [sortedCompras]
  );

  const anulacionesFiltered = useMemo(() => {
    const search = anulacionesSearch.trim().toLowerCase();
    return anulaciones.filter((compra) =>
      `${compra.comprobante} ${compra.tipoComprobante}`.toLowerCase().includes(search)
    );
  }, [anulaciones, anulacionesSearch]);

  const filteredCobros = useMemo(() => {
    const search = cobrosSearch.trim().toLowerCase();
    if (!search) return cobranzas;
    return cobranzas.filter((cobro) =>
      `${cobro.numero} ${cobro.comprobanteNumero ?? ''} ${cobro.medioPago} ${cobro.estado}`.toLowerCase().includes(search)
    );
  }, [cobranzas, cobrosSearch]);

  const handleExportVentas = useCallback(() => {
    if (!filteredVentas.length) return;
    const rows = [
      ['Fecha', 'Tipo', 'Serie-Número', 'Moneda', 'Importe', 'Estado (Comprobante)', 'Cobro'],
      ...filteredVentas.map((venta) => [
        venta.fechaDisplay ?? '—',
        venta.tipoComprobante,
        venta.comprobante,
        venta.moneda ?? '—',
        venta.monto.toFixed(2),
        venta.estadoComprobante,
        formatEstadoLabel(venta.estadoCobro),
      ]),
    ];
    downloadCsv(rows, `ventas-${clienteId ?? 'cliente'}.csv`);
  }, [filteredVentas, clienteId]);

  const handleExportProductos = useCallback(() => {
    if (!filteredProductos.length) return;
    const rows = [
      ['Producto', 'Cantidad total', 'Monto total', 'Moneda', 'Última compra'],
      ...filteredProductos.map((item) => [
        item.producto.nombre,
        String(item.cantidad),
        item.moneda ? item.monto.toFixed(2) : '—',
        item.moneda ?? '—',
        item.ultimaFecha ? formatShortDate(item.ultimaFecha) : 'Sin registro',
      ]),
    ];
    downloadCsv(rows, `productos-${clienteId ?? 'cliente'}.csv`);
  }, [filteredProductos, clienteId]);

  const handleExportAnulaciones = useCallback(() => {
    if (!anulacionesFiltered.length) return;
    const rows = [
      ['Fecha', 'Tipo', 'Serie-Número', 'Moneda', 'Importe', 'Estado (Comprobante)'],
      ...anulacionesFiltered.map((venta) => [
        venta.fechaDisplay ?? '—',
        venta.tipoComprobante,
        venta.comprobante,
        venta.moneda ?? '—',
        venta.monto.toFixed(2),
        venta.estadoComprobante,
      ]),
    ];
    downloadCsv(rows, `anulaciones-${clienteId ?? 'cliente'}.csv`);
  }, [anulacionesFiltered, clienteId]);

  const handleExportCobros = useCallback(() => {
    if (!filteredCobros.length) return;
    const rows = [
      ['Fecha', 'Documento Cobranza', 'Comprobante', 'Medio de pago', 'Moneda', 'Importe', 'Estado'],
      ...filteredCobros.map((cobro) => [
        formatShortDate(cobro.fecha),
        cobro.numero,
        cobro.comprobanteNumero ?? cobro.comprobanteId,
        cobro.medioPago,
        cobro.moneda ?? '—',
        cobro.monto.toFixed(2),
        formatEstadoLabel(cobro.estado),
      ]),
    ];
    downloadCsv(rows, `cobros-${clienteId ?? 'cliente'}.csv`);
  }, [filteredCobros, clienteId]);

  const verDetalles = useCallback(
    async (compraId: number | string) => {
      if (!clienteId) return;
      setModalOpen(true);
      setCompraSeleccionada(null);
      const detalle = await getCompraDetalle(clienteId, compraId);
      setCompraSeleccionada(detalle);
    },
    [clienteId, getCompraDetalle]
  );

  const showProductosPlaceholder = aggregatedProductos.length === 0;

  return (
    <div className="flex-1 bg-gray-50 p-6 dark:bg-gray-900">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/clientes')}
          className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label="Volver a Clientes"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Historial de Ventas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {decodedClienteName ?? 'Cliente desconocido'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Total ventas"
          icon={ShoppingCart}
          loading={loadingList}
          error={Boolean(error)}
          value={metrics.totalDocumentos.toString()}
        />
        <MetricCard
          label="Monto total"
          icon={DollarSign}
          loading={loadingList}
          error={Boolean(error)}
          value={metrics.montoTotal !== null && metrics.currency
            ? formatCurrency(metrics.montoTotal, metrics.currency)
            : '—'}
        />
        <MetricCard
          label="Ticket promedio"
          icon={FileText}
          loading={loadingList}
          error={Boolean(error)}
          value={metrics.ticketPromedio !== null && metrics.currency
            ? formatCurrency(metrics.ticketPromedio, metrics.currency)
            : '—'}
        />
        <MetricCard
          label="Última venta"
          icon={Calendar}
          loading={loadingList}
          error={Boolean(error)}
          value={metrics.ultimaVenta ?? '—'}
        />
      </div>

      <div className="mt-8">
        <div role="tablist" aria-label="Historial del cliente" className="flex flex-wrap gap-2 border-b border-gray-200 text-sm font-medium dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`rounded-t-lg px-3 py-2 transition ${
                activeTab === tab.id
                  ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
            <div className="flex items-center justify-between gap-3">
              <span>{error}</span>
              <button
                type="button"
                className="rounded-md border border-red-200 px-3 py-1 text-sm font-medium dark:border-red-500"
                onClick={reload}
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {activeTab === 'ventas' && (
            <>
              <TabToolbar
                searchPlaceholder="Buscar por número, tipo o monto"
                searchValue={ventasSearch}
                onSearchChange={(value) => {
                  setVentasSearch(value);
                  setVentasPage(1);
                }}
                exportLabel="Exportar ventas"
                onExport={handleExportVentas}
                disableExport={!filteredVentas.length}
              >
                <select
                  aria-label="Filtrar por estado"
                  className="h-10 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  value={estadoFilter}
                  onChange={(event) => {
                    setEstadoFilter(event.target.value);
                    setVentasPage(1);
                  }}
                >
                  {estadoOptions.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="date"
                    aria-label="Fecha inicio"
                    className="h-10 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                    value={dateFrom}
                    onChange={(event) => {
                      setDateFrom(event.target.value);
                      setVentasPage(1);
                    }}
                  />
                  <input
                    type="date"
                    aria-label="Fecha fin"
                    className="h-10 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                    value={dateTo}
                    onChange={(event) => {
                      setDateTo(event.target.value);
                      setVentasPage(1);
                    }}
                  />
                </div>
              </TabToolbar>

              {loadingList ? (
                <LoadingSpinner message="Cargando ventas" />
              ) : filteredVentas.length === 0 ? (
                <EmptyState title="Sin ventas" description="Aún no registramos ventas para este cliente con los filtros actuales." />
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-3 text-left">Fecha</th>
                        <th className="px-4 py-3 text-left">Tipo</th>
                        <th className="px-4 py-3 text-left">Serie-Número</th>
                        <th className="px-4 py-3 text-right">Importe</th>
                        <th className="px-4 py-3 text-center">Estado (Comprobante)</th>
                        <th className="px-4 py-3 text-center">Cobro</th>
                        <th className="px-4 py-3 text-center">Productos</th>
                        <th className="px-4 py-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {ventasPageItems.map((venta) => (
                        <tr key={venta.id} className="text-gray-700 dark:text-gray-200">
                          <td className="px-4 py-3">{venta.fechaDisplay ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${tipoColor(venta.tipoComprobante)}`}>
                              {venta.tipoComprobante}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">{venta.comprobante}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatCurrency(venta.monto, venta.moneda)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${estadoComprobanteBadge(venta.estadoComprobanteColor)}`}>
                              {venta.estadoComprobante}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${cobroBadgeClass(venta.estadoCobro)}`}>
                              {formatEstadoLabel(venta.estadoCobro)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">{venta.productos}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                              onClick={() => verDetalles(venta.id)}
                            >
                              Ver detalle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination
                    page={ventasPage}
                    pageSize={pageSize}
                    total={filteredVentas.length}
                    onChange={setVentasPage}
                  />
                </div>
              )}
            </>
          )}

          {activeTab === 'productos' && (
            <>
              <TabToolbar
                searchPlaceholder="Buscar producto"
                searchValue={productosSearch}
                onSearchChange={(value) => {
                  setProductosSearch(value);
                  setProductosPage(1);
                }}
                onExport={handleExportProductos}
                disableExport={!filteredProductos.length}
                exportLabel="Exportar productos"
              />
              {showProductosPlaceholder ? (
                <EmptyState title="Sin desagregación de productos" description="Aún no contamos con items asociados a las ventas. Cuando se registren, verás un resumen aquí." />
              ) : filteredProductos.length === 0 ? (
                <EmptyState title="Sin coincidencias" description="No encontramos productos con ese criterio." />
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-3 text-left">Producto</th>
                        <th className="px-4 py-3 text-center">Cantidad total</th>
                        <th className="px-4 py-3 text-right">Monto total</th>
                        <th className="px-4 py-3 text-left">Última compra</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {productosPageItems.map((item) => (
                        <tr key={item.producto.id} className="text-gray-700 dark:text-gray-200">
                          <td className="px-4 py-3 font-medium">{item.producto.nombre}</td>
                          <td className="px-4 py-3 text-center">{item.cantidad}</td>
                          <td className="px-4 py-3 text-right">{item.moneda ? formatCurrency(item.monto, item.moneda) : '—'}</td>
                          <td className="px-4 py-3">{item.ultimaFecha ? formatShortDate(item.ultimaFecha) : 'Sin registro'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination
                    page={productosPage}
                    pageSize={pageSize}
                    total={filteredProductos.length}
                    onChange={setProductosPage}
                  />
                </div>
              )}
            </>
          )}

          {activeTab === 'cobros' && (
            <>
              <TabToolbar
                searchPlaceholder="Buscar cobros"
                searchValue={cobrosSearch}
                onSearchChange={setCobrosSearch}
                exportLabel="Exportar cobros"
                onExport={handleExportCobros}
                disableExport={!filteredCobros.length}
              />
              {filteredCobros.length === 0 ? (
                <EmptyState title="Sin cobranzas registradas" description="Todavía no registramos pagos asociados a este cliente." />
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-3 text-left">Fecha</th>
                        <th className="px-4 py-3 text-left">Documento Cobranza</th>
                        <th className="px-4 py-3 text-left">Comprobante</th>
                        <th className="px-4 py-3 text-left">Medio de pago</th>
                        <th className="px-4 py-3 text-right">Importe</th>
                        <th className="px-4 py-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredCobros.map((cobro) => (
                        <tr key={cobro.id} className="text-gray-700 dark:text-gray-200">
                          <td className="px-4 py-3">{formatShortDate(cobro.fecha)}</td>
                          <td className="px-4 py-3 font-medium">{cobro.numero}</td>
                          <td className="px-4 py-3">{cobro.comprobanteNumero ?? cobro.comprobanteId}</td>
                          <td className="px-4 py-3">{cobro.medioPago}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatCurrency(cobro.monto, cobro.moneda)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${cobroBadgeClass(cobro.estado)}`}>
                              {formatEstadoLabel(cobro.estado)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'anulaciones' && (
            <>
              <TabToolbar
                searchPlaceholder="Buscar anulaciones"
                searchValue={anulacionesSearch}
                onSearchChange={setAnulacionesSearch}
                onExport={handleExportAnulaciones}
                disableExport={!anulacionesFiltered.length}
                exportLabel="Exportar anulaciones"
              />
              {anulacionesFiltered.length === 0 ? (
                <EmptyState title="Sin anulaciones" description="No registramos notas o documentos anulados para este cliente." />
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-3 text-left">Fecha</th>
                        <th className="px-4 py-3 text-left">Tipo</th>
                        <th className="px-4 py-3 text-left">Serie-Número</th>
                        <th className="px-4 py-3 text-right">Importe</th>
                        <th className="px-4 py-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {anulacionesFiltered.map((venta) => (
                        <tr key={venta.id} className="text-gray-700 dark:text-gray-200">
                          <td className="px-4 py-3">{venta.fechaDisplay ?? '—'}</td>
                          <td className="px-4 py-3">{venta.tipoComprobante}</td>
                          <td className="px-4 py-3 font-medium">{venta.comprobante}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(venta.monto, venta.moneda)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${estadoComprobanteBadge(venta.estadoComprobanteColor)}`}>
                              {venta.estadoComprobante}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <DetalleCompraModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        compra={compraSeleccionada}
        loading={loadingDetalle}
      />
    </div>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
  error: boolean;
}> = ({ label, value, icon: Icon, loading, error }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
        {loading ? (
          <div className="mt-2 h-6 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        ) : (
          <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{error ? '—' : value}</p>
        )}
      </div>
      <Icon className="h-8 w-8 text-indigo-500" />
    </div>
  </div>
);

export default HistorialCompras;
