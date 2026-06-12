// src/features/gestion-inventario/components/notas-salida/FormularioNotaSalida.tsx

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Save,
  Package,
  Hash,
  Calendar,
  Layers,
  DollarSign,
  Building2,
  Search,
  User,
  Loader2,
  X,
  Trash2,
  MapPin,
  FileText,
  CreditCard,
  Truck,
} from 'lucide-react';
import { ConfigurationCard } from '../../../comprobantes-electronicos/shared/form-core/components/ConfigurationCard';
import ActionButtonsSection from '../../../comprobantes-electronicos/shared/form-core/components/ActionButtonsSection';
import ProductSelector from '../../../comprobantes-electronicos/lista-comprobantes/pages/ProductSelector';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useTenant } from '@/shared/tenant/TenantContext';
import { useProductStore } from '../../../catalogo-articulos/hooks/useProductStore';
import { useClientes } from '../../../gestion-clientes/hooks/useClientes';
import { servicioConsultaDocumentos } from '@/shared/documentos/servicioConsultaDocumentos';
import {
  TIPOS_SALIDA,
  TIPOS_SALIDA_CON_CLIENTE,
  FORMAS_PAGO_NS,
  METODOS_ENVIO_NS,
} from '../../models/notaSalida.constants';
import type { NotaSalida, LineaNotaSalida, TipoSalida } from '../../models/notaSalida.types';
import { useNotasSalida } from '../../hooks/useNotasSalida';
import { useFeedback } from '../../../../../../shared/feedback';
import type { Cliente } from '../../../gestion-clientes/models/cliente.types';
import {
  resolveIgvRateNS,
  calcularDesgloseTributarioNS,
} from '../../services/notaSalida.service';

const calcularLinea = (l: LineaNotaSalida): LineaNotaSalida => {
  const rate = resolveIgvRateNS(l.impuesto);
  const subtotal = parseFloat((l.cantidad * l.pvUnitario).toFixed(2));
  const igv = parseFloat((subtotal * rate).toFixed(2));
  const total = parseFloat((subtotal + igv).toFixed(2));
  return { ...l, subtotal, igv, total };
};

const hoy = () => new Date().toISOString().split('T')[0];

interface ClienteInfo {
  id?: string | number;
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  direccion?: string;
}

function extraerDocumentoCliente(c: Cliente): { tipo: string; numero: string } {
  const ext = (c.numeroDocumento ?? '').replace(/\D/g, '');
  if (ext.length >= 8) {
    return { tipo: ext.length === 11 ? 'RUC' : ext.length === 8 ? 'DNI' : 'OTRO', numero: ext };
  }
  const base = (c.document ?? '').replace(/\D/g, '');
  if (base.length >= 8) {
    return { tipo: base.length === 11 ? 'RUC' : base.length === 8 ? 'DNI' : 'OTRO', numero: base };
  }
  return { tipo: 'OTRO', numero: '' };
}

interface Props {
  notaInicial?: Partial<NotaSalida>;
  onCancelar: () => void;
  onGuardado: () => void;
}

const FormularioNotaSalida: React.FC<Props> = ({ notaInicial, onCancelar, onGuardado }) => {
  const { state: configState } = useConfigurationContext();
  const { activeEstablecimientoId } = useTenant();
  const { allProducts } = useProductStore();
  const { clientes, fetchClientes } = useClientes();
  const { guardarBorrador, generarNS, usuarioNombre, usuarioId } = useNotasSalida();
  const feedback = useFeedback();

  const almacenesActivos = useMemo(
    () => configState.almacenes.filter(a => a.estaActivoAlmacen),
    [configState.almacenes],
  );

  const seriesNS = useMemo(
    () =>
      configState.series
        .filter(
          s =>
            s.isActive !== false &&
            (s.status === 'ACTIVE' || !s.status) &&
            s.documentType?.code === 'NS' &&
            (!activeEstablecimientoId || s.EstablecimientoId === activeEstablecimientoId),
        )
        .map(s => s.series),
    [configState.series, activeEstablecimientoId],
  );

  const defaultSerie = useMemo(
    () =>
      configState.series.find(
        s =>
          s.isActive !== false &&
          (s.status === 'ACTIVE' || !s.status) &&
          s.documentType?.code === 'NS' &&
          s.isDefault &&
          (!activeEstablecimientoId || s.EstablecimientoId === activeEstablecimientoId),
      )?.series ??
      seriesNS[0] ??
      '',
    [configState.series, seriesNS, activeEstablecimientoId],
  );

  const [serieSeleccionada, setSerieSeleccionada] = useState<string>(
    notaInicial?.serie ?? defaultSerie,
  );

  useEffect(() => {
    if (!serieSeleccionada && defaultSerie) setSerieSeleccionada(defaultSerie);
  }, [defaultSerie, serieSeleccionada]);

  // ── Cliente ──────────────────────────────────────────────────────────────
  const [cliente, setCliente] = useState<ClienteInfo | null>(() =>
    notaInicial?.clienteNombre
      ? {
          id: notaInicial.clienteId,
          nombre: notaInicial.clienteNombre,
          tipoDocumento: notaInicial.tipoDocumentoCliente ?? 'RUC',
          numeroDocumento: notaInicial.numeroDocumentoCliente ?? '',
          direccion: notaInicial.direccionFacturacion,
        }
      : null,
  );
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [cargandoLookup, setCargandoLookup] = useState(false);
  const [errorDocumento, setErrorDocumento] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputClienteRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = busquedaCliente.trim();
    if (q.length < 2) { setMostrarResultados(false); return; }
    debounceRef.current = setTimeout(() => {
      void fetchClientes({ search: q, limit: 25, page: 1 });
      setMostrarResultados(true);
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [busquedaCliente, fetchClientes]);

  const seleccionarCliente = useCallback((c: Cliente) => {
    const { tipo, numero } = extraerDocumentoCliente(c);
    const dir = c.direccion ?? (c.address && c.address !== 'Sin dirección' ? c.address : undefined);
    setCliente({ id: c.id, nombre: c.name, tipoDocumento: tipo, numeroDocumento: numero, direccion: dir });
    setDireccionFacturacion(dir ?? '');
    setBusquedaCliente('');
    setMostrarResultados(false);
    setErrorDocumento(null);
  }, []);

  const limpiarCliente = useCallback(() => {
    setCliente(null);
    setDireccionFacturacion('');
    setBusquedaCliente('');
    setErrorDocumento(null);
    setTimeout(() => inputClienteRef.current?.focus(), 0);
  }, []);

  const handleLookup = useCallback(async () => {
    const num = busquedaCliente.replace(/\D/g, '');
    if (!num) return;
    setCargandoLookup(true);
    setErrorDocumento(null);
    try {
      if (num.length === 11) {
        const r = await servicioConsultaDocumentos.consultarRuc(num);
        if (r.success && r.data) {
          setCliente({ nombre: r.data.razonSocial, tipoDocumento: 'RUC', numeroDocumento: num, direccion: r.data.direccion });
          setDireccionFacturacion(r.data.direccion ?? '');
          setBusquedaCliente('');
          setMostrarResultados(false);
        } else {
          setErrorDocumento('RUC no encontrado en SUNAT.');
        }
      } else if (num.length === 8) {
        const r = await servicioConsultaDocumentos.consultarDni(num);
        if (r.success && r.data) {
          setCliente({ nombre: r.data.nombreCompleto, tipoDocumento: 'DNI', numeroDocumento: num });
          setBusquedaCliente('');
          setMostrarResultados(false);
        } else {
          setErrorDocumento('DNI no encontrado en RENIEC.');
        }
      }
    } catch {
      setErrorDocumento('Error de conexión. Intente nuevamente.');
    } finally {
      setCargandoLookup(false);
    }
  }, [busquedaCliente]);

  // ── Campos del formulario ─────────────────────────────────────────────────
  const [fechaDocumento, setFechaDocumento] = useState(notaInicial?.fechaDocumento ?? hoy());
  const [fechaEntregaPrevista, setFechaEntregaPrevista] = useState(notaInicial?.fechaEntregaPrevista ?? '');
  const [tipoSalida, setTipoSalida] = useState<TipoSalida>(notaInicial?.tipoSalida ?? '01');
  const [almacenOrigenId, setAlmacenOrigenId] = useState<string>(() => {
    if (notaInicial?.almacenOrigenId) return notaInicial.almacenOrigenId;
    return almacenesActivos.length === 1 ? almacenesActivos[0].id : '';
  });
  const [moneda, setMoneda] = useState<'PEN' | 'USD'>(notaInicial?.moneda ?? 'PEN');
  const [formaPago, setFormaPago] = useState(notaInicial?.formaPago ?? '');
  const [metodoEnvio, setMetodoEnvio] = useState(notaInicial?.metodoEnvio ?? '');
  const [numeroDocOrigen, setNumeroDocOrigen] = useState(notaInicial?.numeroDocumentoOrigen ?? '');
  const [observaciones, setObservaciones] = useState(notaInicial?.observaciones ?? '');
  const [direccionFacturacion, setDireccionFacturacion] = useState(notaInicial?.direccionFacturacion ?? '');
  const [direccionEnvio, setDireccionEnvio] = useState(notaInicial?.direccionEnvio ?? '');
  const [contacto, setContacto] = useState(notaInicial?.contacto ?? '');
  const [lineas, setLineas] = useState<LineaNotaSalida[]>(notaInicial?.lineas ?? []);

  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);

  const requiereCliente = TIPOS_SALIDA_CON_CLIENTE.includes(tipoSalida);

  const almacenOrigen = useMemo(
    () => almacenesActivos.find(a => a.id === almacenOrigenId),
    [almacenesActivos, almacenOrigenId],
  );

  // ── Stock actual por producto/almacén ─────────────────────────────────────
  const getStockActual = useCallback(
    (productoId: string, almId: string): number => {
      if (!almId) return 0;
      const product = allProducts.find(p => String(p.id) === productoId);
      return product?.stockPorAlmacen?.[almId] ?? 0;
    },
    [allProducts],
  );

  // ── Líneas con stock insuficiente (validación visual en tiempo real) ───────
  const lineasConStockInsuficiente = useMemo(() => {
    const invalidas = new Set<string>();
    for (const l of lineas) {
      if (l.tipoBienServicio !== 'bien') continue;
      const almId = l.almacenId ?? almacenOrigenId;
      if (!almId) continue;
      const stock = getStockActual(l.productoId, almId);
      if (l.cantidad > stock) invalidas.add(l.id);
    }
    return invalidas;
  }, [lineas, almacenOrigenId, getStockActual]);

  // ── Totales ───────────────────────────────────────────────────────────────
  const totales = useMemo(() => {
    let baseGravada = 0;
    let igvTotal = 0;
    let noGravado = 0;
    for (const l of lineas) {
      const rate = resolveIgvRateNS(l.impuesto);
      if (rate > 0) {
        baseGravada += l.subtotal;
        igvTotal += l.igv;
      } else {
        noGravado += l.subtotal;
      }
    }
    return {
      baseImponible: parseFloat(baseGravada.toFixed(2)),
      igv: parseFloat(igvTotal.toFixed(2)),
      noGravados: parseFloat(noGravado.toFixed(2)),
      total: parseFloat((baseGravada + igvTotal + noGravado).toFixed(2)),
    };
  }, [lineas]);

  const desgloseTributario = useMemo(() => calcularDesgloseTributarioNS(lineas), [lineas]);
  const gravadas = desgloseTributario.filter(g => g.rate > 0);
  const noGravadas = desgloseTributario.filter(g => g.rate === 0);
  const baseGravadaTotal = parseFloat(gravadas.reduce((s, g) => s + g.base, 0).toFixed(2));

  // ── Callbacks de productos ────────────────────────────────────────────────
  const handleAgregarProductos = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prods: { product: any; quantity: number }[]) => {
      const bienes = prods.filter(p => p.product.tipoExistencia !== 'SERVICIOS');
      if (bienes.length < prods.length) {
        feedback.warning('Las notas de salida solo aceptan bienes físicos. Se omitieron servicios.');
      }
      if (!bienes.length) return;
      if (!almacenOrigenId) {
        feedback.warning('Seleccione un almacén de origen antes de agregar productos.');
        return;
      }
      const nuevasLineas: LineaNotaSalida[] = bienes.map(({ product, quantity }) =>
        calcularLinea({
          id: `linea-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          productoId: String(product.id),
          productoCodigo: product.code ?? product.codigo ?? '',
          productoNombre: product.name ?? product.nombre ?? '',
          tipoBienServicio: 'bien',
          unidad: product.unidad ?? 'NIU',
          unidadCodigo: product.unidad ?? 'NIU',
          impuesto: product.impuesto ?? undefined,
          almacenId: almacenOrigenId,
          almacenNombre: almacenOrigen?.nombreAlmacen ?? '',
          cantidad: quantity,
          pvUnitario: product.precioVenta ?? product.precio ?? 0,
          subtotal: 0,
          igv: 0,
          total: 0,
        }),
      );
      setLineas(prev => [...prev, ...nuevasLineas]);
    },
    [feedback, almacenOrigenId, almacenOrigen],
  );

  const handleCantidad = (id: string, val: string) => {
    const cant = Math.max(0, parseFloat(val) || 0);
    setLineas(prev => prev.map(l => (l.id === id ? calcularLinea({ ...l, cantidad: cant }) : l)));
  };

  const handlePrecio = (id: string, val: string) => {
    const precio = Math.max(0, parseFloat(val) || 0);
    setLineas(prev => prev.map(l => (l.id === id ? calcularLinea({ ...l, pvUnitario: precio }) : l)));
  };

  const eliminarLinea = (id: string) => setLineas(prev => prev.filter(l => l.id !== id));

  const handleAlmacenOrigen = (newAlmacenId: string) => {
    setAlmacenOrigenId(newAlmacenId);
    const almacen = almacenesActivos.find(a => a.id === newAlmacenId);
    setLineas(prev =>
      prev.map(l => ({ ...l, almacenId: newAlmacenId, almacenNombre: almacen?.nombreAlmacen ?? '' })),
    );
  };

  const buildNota = (estado: 'Borrador' | 'Generada'): NotaSalida => {
    const ahora = new Date().toISOString();
    return {
      id: notaInicial?.id ?? `NS-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tipoDocumento: 'nota_salida',
      serie: serieSeleccionada,
      correlativo: notaInicial?.correlativo,
      numero: notaInicial?.numero,
      estado,
      esBorrador: estado === 'Borrador',
      fechaDocumento,
      fechaEntregaPrevista: fechaEntregaPrevista || undefined,
      tipoSalida,
      almacenOrigenId,
      almacenOrigenNombre: almacenOrigen?.nombreAlmacen ?? '',
      almacenOrigenCodigo: almacenOrigen?.codigoAlmacen ?? undefined,
      encargadoAlmacenId: usuarioId || undefined,
      encargadoAlmacen: usuarioNombre || undefined,
      clienteId: cliente?.id,
      clienteNombre: cliente?.nombre || undefined,
      tipoDocumentoCliente: cliente?.tipoDocumento || undefined,
      numeroDocumentoCliente: cliente?.numeroDocumento || undefined,
      direccionFacturacion: direccionFacturacion || undefined,
      direccionEnvio: direccionEnvio || undefined,
      contacto: contacto || undefined,
      moneda,
      formaPago: formaPago || undefined,
      metodoEnvio: metodoEnvio || undefined,
      documentoOrigen: notaInicial?.documentoOrigen,
      numeroDocumentoOrigen: numeroDocOrigen || undefined,
      origen: notaInicial?.origen ?? 'Manual',
      comprobanteOrigenId: notaInicial?.comprobanteOrigenId,
      ordenVentaOrigenId: notaInicial?.ordenVentaOrigenId,
      lineas,
      baseImponible: totales.baseImponible,
      impuesto: totales.igv,
      total: totales.total,
      observaciones: observaciones || undefined,
      historial: notaInicial?.historial ?? [],
      usuario: usuarioNombre,
      createdAt: notaInicial?.createdAt ?? ahora,
      updatedAt: ahora,
    };
  };

  const validarParaGenerar = (): string | null => {
    if (!serieSeleccionada)
      return 'Configure una serie de Nota de Salida en Configuración → Series.';
    if (!fechaDocumento) return 'La fecha del documento es obligatoria.';
    if (!almacenOrigenId) return 'Seleccione el almacén de origen.';
    if (requiereCliente && !cliente?.nombre?.trim())
      return 'Este tipo de salida requiere especificar el cliente.';
    if (!lineas.length) return 'Agregue al menos un producto del catálogo.';
    if (lineas.some(l => l.cantidad <= 0)) return 'Todas las cantidades deben ser mayores a 0.';
    if (lineasConStockInsuficiente.size > 0)
      return 'No hay stock suficiente en el almacén seleccionado para generar la nota de salida.';
    return null;
  };

  const handleGuardarBorrador = () => {
    if (guardando) return;
    setGuardando(true);
    const ok = guardarBorrador(buildNota('Borrador'));
    setGuardando(false);
    if (ok) onGuardado();
  };

  const handleGenerarNS = () => {
    const err = validarParaGenerar();
    if (err) { feedback.error(err); return; }
    if (generando) return;
    setGenerando(true);
    const nota = buildNota('Borrador');
    guardarBorrador(nota, { silencioso: true });
    const ok = generarNS(nota.id);
    setGenerando(false);
    if (ok) onGuardado();
  };

  const numDigits = busquedaCliente.replace(/\D/g, '').length;
  const mostrarBotonLookup = numDigits === 8 || numDigits === 11;

  return (
    <div className="flex flex-col flex-1 bg-slate-50 dark:bg-gray-900">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 flex items-center gap-3">
        <Package size={18} className="text-orange-500 dark:text-orange-400 flex-shrink-0" />
        <div className="min-w-0">
          <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
            {notaInicial?.numero ? `Editar ${notaInicial.numero}` : 'Nueva Nota de Salida'}
          </h1>
          {seriesNS.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 truncate">
              Sin series de Nota de Salida configuradas — ir a Configuración → Series
            </p>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* === Datos del documento === */}
        <ConfigurationCard
          title="Datos del documento"
          icon={FileText}
          defaultExpanded
          actions={
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
              Nota de Salida
            </span>
          }
        >
          <div className="grid grid-cols-12 gap-x-6 gap-y-4">

            {/* ── Columna izquierda ≈ 65% ─────────────────────────────── */}
            <div className="col-span-12 lg:col-span-8 space-y-3">

              {/* Cliente */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <User size={11} />
                  Cliente{requiereCliente ? ' *' : ''}
                </label>

                {cliente ? (
                  <div className="flex items-center justify-between gap-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg px-2.5 py-2">
                    <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {cliente.nombre}
                      </span>
                      {cliente.tipoDocumento !== 'OTRO' && cliente.numeroDocumento && (
                        <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {cliente.tipoDocumento}: {cliente.numeroDocumento}
                        </span>
                      )}
                    </div>
                    <button type="button" onClick={limpiarCliente} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          ref={inputClienteRef}
                          type="text"
                          placeholder="Buscar cliente, RUC o DNI..."
                          value={busquedaCliente}
                          onChange={e => setBusquedaCliente(e.target.value)}
                          onFocus={() => busquedaCliente.length >= 2 && setMostrarResultados(true)}
                          onBlur={() => setTimeout(() => setMostrarResultados(false), 200)}
                          className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg pl-8 pr-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
                        />
                      </div>
                      {mostrarBotonLookup && (
                        <button
                          type="button"
                          onClick={() => void handleLookup()}
                          disabled={cargandoLookup}
                          title={numDigits === 11 ? 'Consultar RUC en SUNAT' : 'Consultar DNI en RENIEC'}
                          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-2 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-700 transition-colors disabled:opacity-50"
                        >
                          {cargandoLookup ? <Loader2 size={12} className="animate-spin" /> : <Building2 size={12} />}
                          <span>{numDigits === 11 ? 'SUNAT' : 'RENIEC'}</span>
                        </button>
                      )}
                    </div>
                    {errorDocumento && (
                      <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errorDocumento}</p>
                    )}
                    {mostrarResultados && clientes.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                        {(clientes as Cliente[]).slice(0, 8).map((c, idx) => {
                          const { tipo, numero } = extraerDocumentoCliente(c);
                          return (
                            <button
                              key={c.id ?? idx}
                              type="button"
                              onMouseDown={() => seleccionarCliente(c)}
                              className="w-full text-left px-3 py-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                            >
                              <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{c.name}</div>
                              {numero && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {tipo !== 'OTRO' ? `${tipo}: ${numero}` : numero}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dirección de facturación */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <MapPin size={11} />
                  Dirección de facturación
                </label>
                <input
                  type="text"
                  value={direccionFacturacion}
                  onChange={e => setDireccionFacturacion(e.target.value)}
                  placeholder="Dirección del cliente"
                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
              </div>

              {/* Dirección de envío */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Truck size={11} />
                  Dirección de envío
                </label>
                <input
                  type="text"
                  value={direccionEnvio}
                  onChange={e => setDireccionEnvio(e.target.value)}
                  placeholder="Dirección de entrega (opcional)"
                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
              </div>

              {/* Almacén origen */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <MapPin size={11} />
                  Almacén de origen *
                </label>
                {almacenesActivos.length === 0 ? (
                  <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-2.5 py-2">
                    Sin almacenes activos configurados
                  </div>
                ) : (
                  <select
                    value={almacenOrigenId}
                    onChange={e => handleAlmacenOrigen(e.target.value)}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  >
                    <option value="">— Seleccione almacén —</option>
                    {almacenesActivos.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.codigoAlmacen} — {a.nombreAlmacen}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Documento origen / Método de envío */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">N° documento origen</label>
                  <input
                    type="text"
                    value={numeroDocOrigen}
                    onChange={e => setNumeroDocOrigen(e.target.value)}
                    placeholder="Ej: OV-0001"
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Truck size={11} />
                    Método de envío
                  </label>
                  <select
                    value={metodoEnvio}
                    onChange={e => setMetodoEnvio(e.target.value)}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  >
                    <option value="">— Sin especif. —</option>
                    {METODOS_ENVIO_NS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contacto */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Contacto</label>
                <input
                  type="text"
                  value={contacto}
                  onChange={e => setContacto(e.target.value)}
                  placeholder="Nombre del contacto (opcional)"
                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
              </div>
            </div>

            {/* ── Columna derecha ≈ 35% ────────────────────────────────── */}
            <div className="col-span-12 lg:col-span-4 space-y-3 lg:border-l lg:border-gray-200 lg:dark:border-gray-700 lg:pl-4">

              {/* Serie */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Hash size={11} />
                  Serie
                </label>
                {seriesNS.length === 0 ? (
                  <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-2 py-2">
                    Sin series configuradas
                  </div>
                ) : seriesNS.length === 1 ? (
                  <div className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-gray-50 dark:bg-gray-700/50 font-mono text-gray-800 dark:text-gray-100">
                    {seriesNS[0]}
                  </div>
                ) : (
                  <select
                    value={serieSeleccionada}
                    onChange={e => setSerieSeleccionada(e.target.value)}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  >
                    {seriesNS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              </div>

              {/* Fecha documento / Fecha entrega prevista */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Calendar size={11} />
                    Fecha doc.
                  </label>
                  <input
                    type="date"
                    value={fechaDocumento}
                    onChange={e => setFechaDocumento(e.target.value)}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Calendar size={11} />
                    Entrega prevista
                  </label>
                  <input
                    type="date"
                    value={fechaEntregaPrevista}
                    onChange={e => setFechaEntregaPrevista(e.target.value)}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                </div>
              </div>

              {/* Tipo de salida */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Layers size={11} />
                  Tipo de salida
                </label>
                <select
                  value={tipoSalida}
                  onChange={e => setTipoSalida(e.target.value as TipoSalida)}
                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
                >
                  {TIPOS_SALIDA.map(t => (
                    <option key={t.codigo} value={t.codigo}>{t.codigo} — {t.descripcion}</option>
                  ))}
                </select>
              </div>

              {/* Moneda / Forma de pago */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <DollarSign size={11} />
                    Moneda
                  </label>
                  <select
                    value={moneda}
                    onChange={e => setMoneda(e.target.value as 'PEN' | 'USD')}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  >
                    <option value="PEN">S/ PEN</option>
                    <option value="USD">$ USD</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <CreditCard size={11} />
                    Forma de pago
                  </label>
                  <select
                    value={formaPago}
                    onChange={e => setFormaPago(e.target.value)}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  >
                    <option value="">— Sin especif. —</option>
                    {FORMAS_PAGO_NS.map(fp => (
                      <option key={fp.value} value={fp.value}>{fp.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Encargado de almacén */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <User size={11} />
                  Encargado de almacén
                </label>
                <div className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-100 truncate">
                  {usuarioNombre}
                </div>
              </div>
            </div>

          </div>
        </ConfigurationCard>

        {/* === Productos === */}
        <ConfigurationCard title="Productos" icon={Package} defaultExpanded>
          <div className="space-y-3">
            <ProductSelector
              onAddProducts={handleAgregarProductos}
              existingProducts={lineas.map(l => l.productoId)}
            />

            {lineas.length > 0 && (
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full text-[13px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Producto</th>
                      <th className="text-right px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 w-20">Cant.</th>
                      <th className="text-left px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 w-20">Unidad</th>
                      <th className="text-right px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 w-20">Stock</th>
                      <th className="text-left px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 w-28">Impuesto</th>
                      <th className="text-right px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 w-28">P.V. Unit.</th>
                      <th className="text-right px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 w-24">Subtotal</th>
                      <th className="text-right px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 w-24">Total</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {lineas.map(linea => {
                      const stockActual = getStockActual(linea.productoId, linea.almacenId ?? almacenOrigenId);
                      const sinStock = lineasConStockInsuficiente.has(linea.id);
                      return (
                        <tr key={linea.id} className={`transition-colors ${sinStock ? 'bg-red-50/60 dark:bg-red-900/10' : 'hover:bg-slate-50/70 dark:hover:bg-gray-700/30'}`}>
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[220px]" title={linea.productoNombre}>
                              {linea.productoNombre}
                            </div>
                            {linea.productoCodigo && (
                              <div className="text-[11px] text-gray-500 font-mono">{linea.productoCodigo}</div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0.001"
                              step="1"
                              value={linea.cantidad}
                              onChange={e => handleCantidad(linea.id, e.target.value)}
                              className={`w-16 text-right text-sm border rounded px-2 py-1 outline-none focus:ring-1 ${
                                sinStock
                                  ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 focus:ring-red-400 focus:border-red-400'
                                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-orange-500 focus:border-orange-500'
                              }`}
                            />
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">{linea.unidad}</td>
                          <td className={`px-3 py-2 text-right text-[12px] font-mono ${sinStock ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                            {stockActual}
                            {sinStock && <span className="ml-1 text-[10px]">↓</span>}
                          </td>
                          <td className="px-3 py-2">
                            {linea.impuesto ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                                {linea.impuesto}
                              </span>
                            ) : <span className="text-[11px] text-gray-400">—</span>}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={linea.pvUnitario}
                              onChange={e => handlePrecio(linea.id, e.target.value)}
                              className="w-24 text-right text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 outline-none focus:ring-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-orange-500 focus:border-orange-500"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{linea.subtotal.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">{linea.total.toFixed(2)}</td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => eliminarLinea(linea.id)} className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {lineasConStockInsuficiente.size > 0 && (
              <div className="flex items-start gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-xs text-red-700 dark:text-red-400">
                <span className="font-semibold">Stock insuficiente:</span>
                <span>Las líneas marcadas en rojo no tienen stock suficiente en el almacén de origen.</span>
              </div>
            )}

            {lineas.length > 0 && (
              <div className="flex justify-end">
                <div className="space-y-1 min-w-[280px] text-[13px]">
                  {gravadas.length > 0 && (
                    <div className="flex justify-between gap-8 text-slate-600 dark:text-slate-400">
                      <span>Op. gravadas</span>
                      <span>{moneda} {baseGravadaTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {gravadas.map(g => g.igv > 0 && (
                    <div key={g.key} className="flex justify-between gap-8 text-slate-600 dark:text-slate-400">
                      <span>{g.labelIgv}</span>
                      <span>{moneda} {g.igv.toFixed(2)}</span>
                    </div>
                  ))}
                  {noGravadas.map(g => (
                    <div key={g.key} className="flex justify-between gap-8 text-slate-600 dark:text-slate-400">
                      <span>{g.labelBase}</span>
                      <span>{moneda} {g.base.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between gap-8 font-semibold border-t border-slate-200 dark:border-slate-600 pt-1">
                    <span className="text-slate-900 dark:text-white">Total {moneda}</span>
                    <span className="text-orange-600 dark:text-orange-400">{totales.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ConfigurationCard>

        {/* === Observaciones === */}
        <ConfigurationCard title="Observaciones" icon={FileText} collapsible defaultExpanded={false}>
          <textarea
            rows={2}
            maxLength={500}
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            placeholder="Observaciones adicionales..."
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
          />
        </ConfigurationCard>
      </div>

      {/* Sticky footer */}
      <ActionButtonsSection
        onCancelar={onCancelar}
        onGuardarBorrador={handleGuardarBorrador}
        isCartEmpty={lineas.length === 0}
        primaryAction={{
          label: generando ? 'Generando...' : 'Generar nota de salida',
          onClick: handleGenerarNS,
          icon: <Save size={14} />,
          disabled: seriesNS.length === 0 || generando || guardando || lineasConStockInsuficiente.size > 0,
          title:
            seriesNS.length === 0
              ? 'Configure una serie de Nota de Salida en Configuración → Series'
              : lineasConStockInsuficiente.size > 0
              ? 'Corrija el stock insuficiente antes de generar'
              : undefined,
        }}
      />
    </div>
  );
};

export default FormularioNotaSalida;
