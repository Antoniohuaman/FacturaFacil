// src/features/gestion-inventario/components/notas-ingreso/FormularioNotaIngreso.tsx

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
} from 'lucide-react';
import { ConfigurationCard } from '../../../comprobantes-electronicos/shared/form-core/components/ConfigurationCard';
import ActionButtonsSection from '../../../comprobantes-electronicos/shared/form-core/components/ActionButtonsSection';
import ProductSelector from '../../../comprobantes-electronicos/lista-comprobantes/pages/ProductSelector';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useTenant } from '@/shared/tenant/TenantContext';
import { useClientes } from '../../../gestion-clientes/hooks/useClientes';
import { servicioConsultaDocumentos } from '@/shared/documentos/servicioConsultaDocumentos';
import {
  TIPOS_INGRESO,
  TIPOS_INGRESO_CON_PROVEEDOR,
} from '../../models/notaIngreso.constants';
import type {
  NotaIngreso,
  LineaNotaIngreso,
  TipoIngreso,
} from '../../models/notaIngreso.types';
import { useNotasIngreso } from '../../hooks/useNotasIngreso';
import { useFeedback } from '../../../../../../shared/feedback';
import type { Cliente } from '../../../gestion-clientes/models/cliente.types';

// PURCHASE MODEL: igv = subtotal × rate  (not price / (1+rate) which is the SALES model)
const resolveIgvRate = (impuesto?: string): number => {
  if (!impuesto) return 0.18;
  const lower = impuesto.toLowerCase();
  if (lower.includes('exonerado') || lower.includes('inafecto') || lower.includes('gratuita')) return 0;
  const m = impuesto.match(/(\d+(?:\.\d+)?)\s*%/);
  if (m) {
    const pct = parseFloat(m[1]);
    return Number.isFinite(pct) ? pct / 100 : 0.18;
  }
  return 0.18;
};

const calcularLinea = (l: LineaNotaIngreso): LineaNotaIngreso => {
  const rate = resolveIgvRate(l.impuesto);
  const subtotal = parseFloat((l.cantidad * l.costoUnitario).toFixed(2));
  const igv = parseFloat((subtotal * rate).toFixed(2));
  const total = parseFloat((subtotal + igv).toFixed(2));
  return { ...l, subtotal, igv, total };
};

const hoy = () => new Date().toISOString().split('T')[0];

interface ProveedorInfo {
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
  notaInicial?: NotaIngreso;
  onCancelar: () => void;
  onGuardado: () => void;
}

const FormularioNotaIngreso: React.FC<Props> = ({ notaInicial, onCancelar, onGuardado }) => {
  const { state: configState } = useConfigurationContext();
  const { activeEstablecimientoId } = useTenant();
  const { clientes, fetchClientes } = useClientes();
  const { guardarBorrador, generarNI, usuarioNombre } = useNotasIngreso();
  const feedback = useFeedback();

  const almacenesActivos = useMemo(
    () => configState.almacenes.filter(a => a.estaActivoAlmacen),
    [configState.almacenes],
  );

  // --- Series NI disponibles para el establecimiento activo ---
  const seriesNI = useMemo(
    () =>
      configState.series
        .filter(
          s =>
            s.isActive !== false &&
            (s.status === 'ACTIVE' || !s.status) &&
            s.documentType?.code === 'NI' &&
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
          s.documentType?.code === 'NI' &&
          s.isDefault &&
          (!activeEstablecimientoId || s.EstablecimientoId === activeEstablecimientoId),
      )?.series ??
      seriesNI[0] ??
      '',
    [configState.series, seriesNI, activeEstablecimientoId],
  );

  const [serieSeleccionada, setSerieSeleccionada] = useState<string>(
    notaInicial?.serie ?? defaultSerie,
  );

  useEffect(() => {
    if (!serieSeleccionada && defaultSerie) setSerieSeleccionada(defaultSerie);
  }, [defaultSerie, serieSeleccionada]);

  // --- Proveedor — exact same pattern as FormularioHeaderComercial ---
  const [proveedor, setProveedor] = useState<ProveedorInfo | null>(() =>
    notaInicial?.proveedorNombre
      ? {
          id: notaInicial.proveedorId,
          nombre: notaInicial.proveedorNombre,
          tipoDocumento: notaInicial.tipoDocumentoProveedor ?? 'RUC',
          numeroDocumento: notaInicial.numeroDocumentoProveedor ?? '',
          direccion: notaInicial.direccionProveedor,
        }
      : null,
  );
  const [busquedaProveedor, setBusquedaProveedor] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [cargandoLookup, setCargandoLookup] = useState(false);
  const [errorDocumento, setErrorDocumento] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputProveedorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = busquedaProveedor.trim();
    if (q.length < 2) {
      setMostrarResultados(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void fetchClientes({ search: q, limit: 25, page: 1 });
      setMostrarResultados(true);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [busquedaProveedor, fetchClientes]);

  const seleccionarProveedor = useCallback(
    (c: Cliente) => {
      const { tipo, numero } = extraerDocumentoCliente(c);
      setProveedor({
        id: c.id,
        nombre: c.name,
        tipoDocumento: tipo,
        numeroDocumento: numero,
        direccion:
          c.direccion ?? (c.address && c.address !== 'Sin dirección' ? c.address : undefined),
      });
      setBusquedaProveedor('');
      setMostrarResultados(false);
      setErrorDocumento(null);
    },
    [],
  );

  const limpiarProveedor = useCallback(() => {
    setProveedor(null);
    setBusquedaProveedor('');
    setErrorDocumento(null);
    setTimeout(() => inputProveedorRef.current?.focus(), 0);
  }, []);

  const handleLookup = useCallback(async () => {
    const num = busquedaProveedor.replace(/\D/g, '');
    if (!num) return;
    setCargandoLookup(true);
    setErrorDocumento(null);
    try {
      if (num.length === 11) {
        const r = await servicioConsultaDocumentos.consultarRuc(num);
        if (r.success && r.data) {
          setProveedor({
            nombre: r.data.razonSocial,
            tipoDocumento: 'RUC',
            numeroDocumento: num,
            direccion: r.data.direccion,
          });
          setBusquedaProveedor('');
          setMostrarResultados(false);
        } else {
          setErrorDocumento('RUC no encontrado en SUNAT.');
        }
      } else if (num.length === 8) {
        const r = await servicioConsultaDocumentos.consultarDni(num);
        if (r.success && r.data) {
          setProveedor({
            nombre: r.data.nombreCompleto,
            tipoDocumento: 'DNI',
            numeroDocumento: num,
          });
          setBusquedaProveedor('');
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
  }, [busquedaProveedor]);

  // --- Campos del formulario ---
  const [fechaDocumento, setFechaDocumento] = useState(notaInicial?.fechaDocumento ?? hoy());
  const [fechaIngreso, setFechaIngreso] = useState(notaInicial?.fechaIngresoAlmacen ?? hoy());
  const [tipoIngreso, setTipoIngreso] = useState<TipoIngreso>(notaInicial?.tipoIngreso ?? '02');
  const [almacenDestinoId, setAlmacenDestinoId] = useState(
    notaInicial?.almacenDestinoId ?? (almacenesActivos[0]?.id ?? ''),
  );
  const [moneda, setMoneda] = useState<'PEN' | 'USD'>(notaInicial?.moneda ?? 'PEN');
  const [documentoOrigen, setDocumentoOrigen] = useState(notaInicial?.documentoOrigen ?? '');
  const [numeroDocOrigen, setNumeroDocOrigen] = useState(
    notaInicial?.numeroDocumentoOrigen ?? '',
  );
  const [guiaRemision, setGuiaRemision] = useState(notaInicial?.guiaRemision ?? '');
  const [observaciones, setObservaciones] = useState(notaInicial?.observaciones ?? '');

  const [lineas, setLineas] = useState<LineaNotaIngreso[]>(
    notaInicial?.lineas.length ? notaInicial.lineas : [],
  );

  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);

  const requiereProveedor = TIPOS_INGRESO_CON_PROVEEDOR.includes(tipoIngreso);

  // --- Totales (purchase model: subtotal = qty × cost; igv = subtotal × rate) ---
  const totales = useMemo(() => {
    let baseGravada = 0;
    let igvTotal = 0;
    let noGravado = 0;
    for (const l of lineas) {
      const rate = resolveIgvRate(l.impuesto);
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

  // --- ProductSelector callback ---
  const handleAgregarProductos = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prods: { product: any; quantity: number }[]) => {
      const bienes = prods.filter(p => p.product.tipoExistencia !== 'SERVICIOS');
      if (bienes.length < prods.length) {
        feedback.warning('Se omitieron servicios. NI solo acepta bienes físicos.');
      }
      if (!bienes.length) return;
      setLineas(prev => [
        ...prev,
        ...bienes.map(({ product, quantity }) =>
          calcularLinea({
            id: `linea-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            productoId: String(product.id),
            productoCodigo: product.code ?? product.codigo ?? '',
            productoNombre: product.name ?? product.nombre ?? '',
            tipoBienServicio: 'bien',
            unidad: product.unidad ?? 'NIU',
            unidadCodigo: product.unidad ?? 'NIU',
            impuesto: product.impuesto ?? undefined,
            cantidad: quantity,
            costoUnitario: product.precioCompra ?? 0,
            subtotal: 0,
            igv: 0,
            total: 0,
          }),
        ),
      ]);
    },
    [feedback],
  );

  const handleCantidad = (id: string, val: string) => {
    const cant = Math.max(0, parseFloat(val) || 0);
    setLineas(prev => prev.map(l => (l.id === id ? calcularLinea({ ...l, cantidad: cant }) : l)));
  };

  const handleCosto = (id: string, val: string) => {
    const costo = Math.max(0, parseFloat(val) || 0);
    setLineas(prev =>
      prev.map(l => (l.id === id ? calcularLinea({ ...l, costoUnitario: costo }) : l)),
    );
  };

  const eliminarLinea = (id: string) => setLineas(prev => prev.filter(l => l.id !== id));

  const buildNota = (estado: 'Borrador' | 'Generada'): NotaIngreso => {
    const ahora = new Date().toISOString();
    const almacen = almacenesActivos.find(a => a.id === almacenDestinoId);
    return {
      id: notaInicial?.id ?? `NI-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tipoDocumento: 'nota_ingreso',
      serie: serieSeleccionada,
      correlativo: notaInicial?.correlativo,
      numero: notaInicial?.numero,
      estado,
      esBorrador: estado === 'Borrador',
      fechaDocumento,
      fechaIngresoAlmacen: fechaIngreso,
      tipoIngreso,
      almacenDestinoId,
      almacenDestinoNombre: almacen?.nombreAlmacen ?? '',
      almacenDestinoCodigo: almacen?.codigoAlmacen ?? '',
      proveedorId: proveedor?.id,
      proveedorNombre: proveedor?.nombre || undefined,
      tipoDocumentoProveedor: proveedor?.tipoDocumento || undefined,
      numeroDocumentoProveedor: proveedor?.numeroDocumento || undefined,
      direccionProveedor: proveedor?.direccion,
      moneda,
      documentoOrigen: documentoOrigen || undefined,
      numeroDocumentoOrigen: numeroDocOrigen || undefined,
      guiaRemision: guiaRemision || undefined,
      observaciones: observaciones || undefined,
      lineas,
      baseImponible: totales.baseImponible,
      descuentos: 0,
      isc: 0,
      impuesto: totales.igv,
      noGravados: totales.noGravados,
      otc: 0,
      total: totales.total,
      usuario: usuarioNombre,
      fechaCreacion: notaInicial?.fechaCreacion ?? ahora,
      fechaActualizacion: ahora,
      historial: notaInicial?.historial ?? [],
    };
  };

  const validarParaGenerar = (): string | null => {
    if (!serieSeleccionada)
      return 'Configure una serie de Nota de Ingreso en Configuración → Series.';
    if (!fechaDocumento) return 'La fecha del documento es obligatoria.';
    if (!almacenDestinoId) return 'Seleccione un almacén de destino.';
    if (requiereProveedor && !proveedor?.nombre?.trim())
      return 'Este tipo de ingreso requiere especificar el proveedor.';
    if (!lineas.length) return 'Agregue al menos un producto del catálogo.';
    if (lineas.some(l => l.cantidad <= 0)) return 'Todas las cantidades deben ser mayores a 0.';
    return null;
  };

  const handleGuardarBorrador = () => {
    if (guardando) return;
    setGuardando(true);
    const ok = guardarBorrador(buildNota('Borrador'));
    setGuardando(false);
    if (ok) onGuardado();
  };

  const handleGenerarNI = () => {
    const err = validarParaGenerar();
    if (err) {
      feedback.error(err);
      return;
    }
    if (generando) return;
    setGenerando(true);
    const nota = buildNota('Borrador');
    guardarBorrador(nota);
    const ok = generarNI(nota.id);
    setGenerando(false);
    if (ok) onGuardado();
  };

  const numDigits = busquedaProveedor.replace(/\D/g, '').length;
  const mostrarBotonLookup = numDigits === 8 || numDigits === 11;

  return (
    <div className="flex flex-col flex-1 bg-slate-50 dark:bg-gray-900">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 flex items-center gap-3">
        <Package size={18} className="text-teal-600 dark:text-teal-400 flex-shrink-0" />
        <div className="min-w-0">
          <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
            {notaInicial?.numero ? `Editar ${notaInicial.numero}` : 'Nueva Nota de Ingreso'}
          </h1>
          {seriesNI.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 truncate">
              Sin series NI configuradas — ir a Configuración → Series
            </p>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* === Datos del documento === */}
        <ConfigurationCard title="Datos del documento" icon={FileText} defaultExpanded>
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
              Nota de Ingreso
            </span>

            {/* Serie + Fecha doc + Fecha ingreso */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Hash size={11} />
                  Serie
                </label>
                {seriesNI.length === 0 ? (
                  <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-2 py-2">
                    Sin series configuradas
                  </div>
                ) : seriesNI.length === 1 ? (
                  <div className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-gray-50 dark:bg-gray-700/50 font-mono text-gray-800 dark:text-gray-100">
                    {seriesNI[0]}
                  </div>
                ) : (
                  <select
                    value={serieSeleccionada}
                    onChange={e => setSerieSeleccionada(e.target.value)}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                  >
                    {seriesNI.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Calendar size={11} />
                  Fecha documento
                </label>
                <input
                  type="date"
                  value={fechaDocumento}
                  onChange={e => setFechaDocumento(e.target.value)}
                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Calendar size={11} />
                  Fecha ingreso almacén
                </label>
                <input
                  type="date"
                  value={fechaIngreso}
                  onChange={e => setFechaIngreso(e.target.value)}
                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                />
              </div>
            </div>

            {/* Tipo ingreso + Almacén + Moneda */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Layers size={11} />
                  Tipo de ingreso
                </label>
                <select
                  value={tipoIngreso}
                  onChange={e => setTipoIngreso(e.target.value as TipoIngreso)}
                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                >
                  {TIPOS_INGRESO.map(t => (
                    <option key={t.codigo} value={t.codigo}>
                      {t.codigo} — {t.descripcion}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <MapPin size={11} />
                  Almacén destino
                </label>
                <select
                  value={almacenDestinoId}
                  onChange={e => setAlmacenDestinoId(e.target.value)}
                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                >
                  <option value="">— Seleccione —</option>
                  {almacenesActivos.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.codigoAlmacen} — {a.nombreAlmacen}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <DollarSign size={11} />
                  Moneda
                </label>
                <select
                  value={moneda}
                  onChange={e => setMoneda(e.target.value as 'PEN' | 'USD')}
                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                >
                  <option value="PEN">S/ PEN</option>
                  <option value="USD">$ USD</option>
                </select>
              </div>
            </div>

            {/* Proveedor — exact same pattern as FormularioHeaderComercial */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <User size={11} />
                Proveedor{requiereProveedor ? ' *' : ''}
              </label>

              {proveedor ? (
                <div className="flex items-start justify-between gap-2 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-lg px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                      {proveedor.nombre}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {proveedor.tipoDocumento !== 'OTRO'
                        ? `${proveedor.tipoDocumento}: ${proveedor.numeroDocumento}`
                        : proveedor.numeroDocumento}
                      {proveedor.direccion && (
                        <span className="ml-2 text-gray-400">• {proveedor.direccion}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={limpiarProveedor}
                    className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <Search
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                      <input
                        ref={inputProveedorRef}
                        type="text"
                        placeholder="Buscar proveedor, RUC o DNI..."
                        value={busquedaProveedor}
                        onChange={e => setBusquedaProveedor(e.target.value)}
                        onFocus={() => busquedaProveedor.length >= 2 && setMostrarResultados(true)}
                        onBlur={() => setTimeout(() => setMostrarResultados(false), 200)}
                        className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg pl-8 pr-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
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
                        {cargandoLookup ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Building2 size={12} />
                        )}
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
                            onMouseDown={() => seleccionarProveedor(c)}
                            className="w-full text-left px-3 py-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                          >
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                              {c.name}
                            </div>
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

            {/* Referencias opcionales */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Tipo documento origen
                </label>
                <select
                  value={documentoOrigen}
                  onChange={e => setDocumentoOrigen(e.target.value)}
                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                >
                  <option value="">— Sin referencia —</option>
                  <option value="01">Factura</option>
                  <option value="03">Boleta de Venta</option>
                  <option value="52">Liquidación de compra</option>
                  <option value="91">Comprobante de operaciones - Ley N° 29972</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  N° documento origen
                </label>
                <input
                  type="text"
                  value={numeroDocOrigen}
                  onChange={e => setNumeroDocOrigen(e.target.value)}
                  placeholder="Ej: F001-00001234"
                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Guía de remisión
                </label>
                <input
                  type="text"
                  value={guiaRemision}
                  onChange={e => setGuiaRemision(e.target.value)}
                  placeholder="Ej: T001-00000001"
                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                />
              </div>
            </div>
          </div>
        </ConfigurationCard>

        {/* === Productos === */}
        <ConfigurationCard title="Productos" icon={Package} defaultExpanded>
          <div className="space-y-3">
            {/* Real catalog selector — same widget used by Comprobantes */}
            <ProductSelector
              onAddProducts={handleAgregarProductos}
              existingProducts={lineas.map(l => l.productoId)}
            />

            {lineas.length > 0 && (
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full text-[13px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Producto
                      </th>
                      <th className="text-right px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 w-20">
                        Cant.
                      </th>
                      <th className="text-left px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 w-20">
                        Unidad
                      </th>
                      <th className="text-left px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 w-28">
                        Impuesto
                      </th>
                      <th className="text-right px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 w-28">
                        Costo unit.
                      </th>
                      <th className="text-right px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 w-24">
                        Subtotal
                      </th>
                      <th className="text-right px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 w-24">
                        Total
                      </th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {lineas.map(linea => (
                      <tr
                        key={linea.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="px-3 py-2">
                          <div
                            className="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[220px]"
                            title={linea.productoNombre}
                          >
                            {linea.productoNombre}
                          </div>
                          {linea.productoCodigo && (
                            <div className="text-[11px] text-gray-500 font-mono">
                              {linea.productoCodigo}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0.001"
                            step="1"
                            value={linea.cantidad}
                            onChange={e => handleCantidad(linea.id, e.target.value)}
                            className="w-16 text-right text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                          />
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">
                          {linea.unidad}
                        </td>
                        <td className="px-3 py-2">
                          {linea.impuesto ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                              {linea.impuesto}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={linea.costoUnitario}
                            onChange={e => handleCosto(linea.id, e.target.value)}
                            className="w-24 text-right text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                          {linea.subtotal.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">
                          {linea.total.toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => eliminarLinea(linea.id)}
                            className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals breakdown */}
            {lineas.length > 0 && (
              <div className="flex justify-end">
                <div className="space-y-1 min-w-[260px] text-[13px]">
                  {totales.baseImponible > 0 && (
                    <div className="flex justify-between gap-8 text-slate-600 dark:text-slate-400">
                      <span>Op. gravadas</span>
                      <span>
                        {moneda} {totales.baseImponible.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {totales.igv > 0 && (
                    <div className="flex justify-between gap-8 text-slate-600 dark:text-slate-400">
                      <span>IGV</span>
                      <span>
                        {moneda} {totales.igv.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {totales.noGravados > 0 && (
                    <div className="flex justify-between gap-8 text-slate-600 dark:text-slate-400">
                      <span>Op. exoneradas / inafectas</span>
                      <span>
                        {moneda} {totales.noGravados.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between gap-8 font-semibold border-t border-slate-200 dark:border-slate-600 pt-1">
                    <span className="text-slate-900 dark:text-white">Total {moneda}</span>
                    <span className="text-violet-600 dark:text-violet-400">
                      {totales.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ConfigurationCard>

        {/* === Observaciones === */}
        <ConfigurationCard
          title="Observaciones"
          icon={FileText}
          collapsible
          defaultExpanded={false}
        >
          <textarea
            rows={2}
            maxLength={500}
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            placeholder="Ej: Factura F001-0001234 del 15/01/2024"
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none resize-none"
          />
        </ConfigurationCard>
      </div>

      {/* Sticky footer */}
      <ActionButtonsSection
        onCancelar={onCancelar}
        onGuardarBorrador={handleGuardarBorrador}
        isCartEmpty={lineas.length === 0}
        primaryAction={{
          label: generando ? 'Generando...' : 'Generar NI',
          onClick: handleGenerarNI,
          icon: <Save size={14} />,
          disabled: seriesNI.length === 0 || generando || guardando,
          title:
            seriesNI.length === 0
              ? 'Configure una serie NI en Configuración → Series'
              : undefined,
        }}
      />
    </div>
  );
};

export default FormularioNotaIngreso;
