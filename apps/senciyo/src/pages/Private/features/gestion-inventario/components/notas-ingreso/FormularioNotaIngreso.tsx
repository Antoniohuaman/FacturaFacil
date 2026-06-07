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
  ChevronDown,
  Check,
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
  TIPOS_INGRESO,
  TIPOS_INGRESO_CON_PROVEEDOR,
  FORMAS_PAGO_NI,
} from '../../models/notaIngreso.constants';
import type {
  NotaIngreso,
  LineaNotaIngreso,
  TipoIngreso,
} from '../../models/notaIngreso.types';
import { useNotasIngreso } from '../../hooks/useNotasIngreso';
import { useFeedback } from '../../../../../../shared/feedback';
import type { Cliente } from '../../../gestion-clientes/models/cliente.types';
import {
  resolveIgvRate,
  calcularDesgloseTributario,
} from '../../services/notaIngreso.service';

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
  const { allProducts } = useProductStore();
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
      const provDir =
        c.direccion ?? (c.address && c.address !== 'Sin dirección' ? c.address : undefined);
      setProveedor({
        id: c.id,
        nombre: c.name,
        tipoDocumento: tipo,
        numeroDocumento: numero,
        direccion: provDir,
      });
      setDireccion(provDir ?? '');
      setBusquedaProveedor('');
      setMostrarResultados(false);
      setErrorDocumento(null);
    },
    [],
  );

  const limpiarProveedor = useCallback(() => {
    setProveedor(null);
    setDireccion('');
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
          setDireccion(r.data.direccion ?? '');
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
  const [almacenesSeleccionados, setAlmacenesSeleccionados] = useState<string[]>(() => {
    const activos = configState.almacenes.filter(a => a.estaActivoAlmacen);
    if (notaInicial) {
      const idsEnLineas = [...new Set(
        notaInicial.lineas
          .map(l => l.almacenId)
          .filter((id): id is string => Boolean(id)),
      )];
      if (idsEnLineas.length > 0) return idsEnLineas;
      return notaInicial.almacenDestinoId ? [notaInicial.almacenDestinoId] : [];
    }
    return activos.length === 1 ? [activos[0].id] : [];
  });

  const [moneda, setMoneda] = useState<'PEN' | 'USD'>(notaInicial?.moneda ?? 'PEN');
  const [documentoOrigen, setDocumentoOrigen] = useState(notaInicial?.documentoOrigen ?? '');
  const [numeroDocOrigen, setNumeroDocOrigen] = useState(
    notaInicial?.numeroDocumentoOrigen ?? '',
  );
  const [guiaRemision, setGuiaRemision] = useState(notaInicial?.guiaRemision ?? '');
  const [observaciones, setObservaciones] = useState(notaInicial?.observaciones ?? '');
  const [direccion, setDireccion] = useState(notaInicial?.direccionProveedor ?? '');
  const [direccionEnvio, setDireccionEnvio] = useState(notaInicial?.direccionEnvio ?? '');
  const [formaPago, setFormaPago] = useState(notaInicial?.formaPago ?? '');
  const [encargadoAlmacen, setEncargadoAlmacen] = useState(
    notaInicial?.encargadoAlmacen ?? usuarioNombre,
  );

  const [lineas, setLineas] = useState<LineaNotaIngreso[]>(() => {
    if (!notaInicial?.lineas.length) return [];
    // Migrate existing lines without almacenId to inherit from header
    return notaInicial.lineas.map(l => ({
      ...l,
      almacenId: l.almacenId ?? notaInicial.almacenDestinoId,
      almacenNombre: l.almacenNombre ?? notaInicial.almacenDestinoNombre,
    }));
  });

  const [dropdownAlmacen, setDropdownAlmacen] = useState(false);
  const dropdownAlmacenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownAlmacen) return;
    const handler = (e: MouseEvent) => {
      if (!dropdownAlmacenRef.current?.contains(e.target as Node)) {
        setDropdownAlmacen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownAlmacen]);

  const toggleAlmacen = async (almacenId: string) => {
    if (!almacenesSeleccionados.includes(almacenId)) {
      setAlmacenesSeleccionados(prev => [...prev, almacenId]);
      return;
    }
    if (almacenesSeleccionados.length <= 1) return;
    const lineasAfectadas = lineas.filter(l => l.almacenId === almacenId);
    if (lineasAfectadas.length > 0) {
      const almacen = almacenesActivos.find(a => a.id === almacenId);
      const ok = await feedback.openConfirm({
        title: 'Quitar almacén',
        message: `${lineasAfectadas.length} línea(s) de productos están asignadas a "${almacen?.nombreAlmacen ?? almacenId}". ¿Eliminar esas líneas?`,
        confirmText: 'Quitar líneas',
        cancelText: 'Cancelar',
        icon: 'warning',
      });
      if (!ok) return;
      setLineas(prev => prev.filter(l => l.almacenId !== almacenId));
    }
    setAlmacenesSeleccionados(prev => prev.filter(id => id !== almacenId));
  };

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

  const desgloseTributario = useMemo(() => calcularDesgloseTributario(lineas), [lineas]);
  const gravadas = desgloseTributario.filter(g => g.rate > 0);
  const noGravadas = desgloseTributario.filter(g => g.rate === 0);
  const baseGravadaTotal = parseFloat(gravadas.reduce((s, g) => s + g.base, 0).toFixed(2));

  // --- Stock actual por almacén de cada línea (informativo) ---
  const getStockActual = useCallback(
    (productoId: string, lineaAlmacenId: string): number => {
      if (!lineaAlmacenId) return 0;
      const product = allProducts.find(p => String(p.id) === productoId);
      return product?.stockPorAlmacen?.[lineaAlmacenId] ?? 0;
    },
    [allProducts],
  );

  const handleAlmacenLinea = (id: string, newAlmacenId: string) => {
    const almacen = almacenesActivos.find(a => a.id === newAlmacenId);
    if (!almacen) return;
    setLineas(prev =>
      prev.map(l =>
        l.id === id ? { ...l, almacenId: almacen.id, almacenNombre: almacen.nombreAlmacen } : l,
      ),
    );
  };

  // --- ProductSelector callback ---
  const handleAgregarProductos = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prods: { product: any; quantity: number }[]) => {
      const bienes = prods.filter(p => p.product.tipoExistencia !== 'SERVICIOS');
      if (bienes.length < prods.length) {
        feedback.warning('Las notas de ingreso solo aceptan bienes físicos. Se omitieron servicios.');
      }
      if (!bienes.length) return;
      if (almacenesSeleccionados.length === 0) {
        feedback.warning('Seleccione al menos un almacén destino antes de agregar productos.');
        return;
      }
      const nuevasLineas: LineaNotaIngreso[] = [];
      for (const { product, quantity } of bienes) {
        for (const aId of almacenesSeleccionados) {
          const almacen = almacenesActivos.find(a => a.id === aId);
          nuevasLineas.push(
            calcularLinea({
              id: `linea-${Date.now()}-${aId}-${Math.random().toString(36).slice(2, 7)}`,
              productoId: String(product.id),
              productoCodigo: product.code ?? product.codigo ?? '',
              productoNombre: product.name ?? product.nombre ?? '',
              tipoBienServicio: 'bien',
              unidad: product.unidad ?? 'NIU',
              unidadCodigo: product.unidad ?? 'NIU',
              impuesto: product.impuesto ?? undefined,
              almacenId: aId,
              almacenNombre: almacen?.nombreAlmacen ?? '',
              cantidad: quantity,
              costoUnitario: product.precioCompra ?? 0,
              subtotal: 0,
              igv: 0,
              total: 0,
            }),
          );
        }
      }
      setLineas(prev => [...prev, ...nuevasLineas]);
    },
    [feedback, almacenesSeleccionados, almacenesActivos],
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
    const almacenPrimario = almacenesActivos.find(a => a.id === almacenesSeleccionados[0]);
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
      almacenDestinoId: almacenesSeleccionados[0] ?? '',
      almacenDestinoNombre: almacenPrimario?.nombreAlmacen ?? '',
      almacenDestinoCodigo: almacenPrimario?.codigoAlmacen ?? '',
      proveedorId: proveedor?.id,
      proveedorNombre: proveedor?.nombre || undefined,
      tipoDocumentoProveedor: proveedor?.tipoDocumento || undefined,
      numeroDocumentoProveedor: proveedor?.numeroDocumento || undefined,
      direccionProveedor: direccion || undefined,
      direccionEnvio: direccionEnvio || undefined,
      moneda,
      formaPago: formaPago || undefined,
      encargadoAlmacen: encargadoAlmacen || undefined,
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
    if (almacenesSeleccionados.length === 0) return 'Seleccione al menos un almacén destino.';
    if (requiereProveedor && !proveedor?.nombre?.trim())
      return 'Este tipo de ingreso requiere especificar el proveedor.';
    if (!lineas.length) return 'Agregue al menos un producto del catálogo.';
    if (lineas.some(l => l.cantidad <= 0)) return 'Todas las cantidades deben ser mayores a 0.';
    if (lineas.some(l => !l.almacenId)) return 'Todas las líneas deben tener un almacén asignado.';
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
              Sin series de Nota de Ingreso configuradas — ir a Configuración → Series
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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
              Nota de Ingreso
            </span>
          }
        >
          <div className="grid grid-cols-12 gap-x-6 gap-y-4">

            {/* ── Columna izquierda ≈ 65% ─────────────────────────── */}
            <div className="col-span-12 lg:col-span-8 space-y-3">

              {/* Proveedor */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <User size={11} />
                  Proveedor{requiereProveedor ? ' *' : ''}
                </label>

                {proveedor ? (
                  <div className="flex items-center justify-between gap-2 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-lg px-2.5 py-2">
                    <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {proveedor.nombre}
                      </span>
                      {proveedor.tipoDocumento !== 'OTRO' && proveedor.numeroDocumento && (
                        <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {proveedor.tipoDocumento}: {proveedor.numeroDocumento}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={limpiarProveedor}
                      className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <Search
                          size={13}
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

              {/* Dirección */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <MapPin size={11} />
                  Dirección
                </label>
                <input
                  type="text"
                  value={direccion}
                  onChange={e => setDireccion(e.target.value)}
                  placeholder="Dirección del proveedor"
                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
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
                  placeholder="Dirección de envío (opcional)"
                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                />
              </div>

              {/* Almacén(es) destino — compact multiselect */}
              <div ref={dropdownAlmacenRef} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <MapPin size={11} />
                  Almacén(es) destino
                </label>
                {almacenesActivos.length === 0 ? (
                  <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-2.5 py-2">
                    Sin almacenes activos configurados
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setDropdownAlmacen(o => !o)}
                      className="w-full flex items-center gap-1.5 min-h-[38px] px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 text-left"
                    >
                      <div className="flex-1 flex flex-wrap gap-1 min-w-0">
                        {almacenesSeleccionados.length === 0 ? (
                          <span className="text-gray-400 dark:text-gray-500 text-xs py-0.5">— Seleccione almacén(es) —</span>
                        ) : (
                          <>
                            {almacenesSeleccionados.slice(0, 3).map(aId => {
                              const a = almacenesActivos.find(x => x.id === aId);
                              if (!a) return null;
                              return (
                                <span key={aId} className="inline-flex items-center gap-0.5 pl-1.5 pr-0.5 py-0.5 rounded text-[11px] font-medium bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                                  <span className="max-w-[130px] truncate" title={`${a.codigoAlmacen} — ${a.nombreAlmacen}`}>{a.codigoAlmacen} — {a.nombreAlmacen}</span>
                                  <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); void toggleAlmacen(aId); }}
                                    className="ml-0.5 hover:text-violet-900 dark:hover:text-violet-100 flex-shrink-0"
                                  >
                                    <X size={10} />
                                  </button>
                                </span>
                              );
                            })}
                            {almacenesSeleccionados.length > 3 && (
                              <span
                                title={almacenesSeleccionados.slice(3).map(id => {
                                  const a = almacenesActivos.find(x => x.id === id);
                                  return a ? `${a.codigoAlmacen} — ${a.nombreAlmacen}` : id;
                                }).join('\n')}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 cursor-default"
                              >
                                +{almacenesSeleccionados.length - 3}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <ChevronDown size={13} className={`flex-shrink-0 text-gray-400 transition-transform duration-150 ${dropdownAlmacen ? 'rotate-180' : ''}`} />
                    </button>

                    {dropdownAlmacen && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                        {almacenesActivos.map(a => (
                          <button
                            key={a.id}
                            type="button"
                            onMouseDown={() => void toggleAlmacen(a.id)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-left transition-colors"
                          >
                            <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                              almacenesSeleccionados.includes(a.id)
                                ? 'bg-violet-600 border-violet-600'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                            }`}>
                              {almacenesSeleccionados.includes(a.id) && <Check size={10} className="text-white" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-gray-800 dark:text-gray-100 truncate">{a.nombreAlmacen}</div>
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">{a.codigoAlmacen}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {almacenesSeleccionados.length === 0 && almacenesActivos.length > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Seleccione al menos un almacén para poder agregar productos.
                  </p>
                )}
              </div>

              {/* N° documento origen | Guía de remisión */}
              <div className="grid grid-cols-2 gap-3">
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

            {/* ── Columna derecha ≈ 35% ──────────────────────────── */}
            <div className="col-span-12 lg:col-span-4 space-y-3 lg:border-l lg:border-gray-200 lg:dark:border-gray-700 lg:pl-4">

              {/* Serie */}
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

              {/* Fecha documento | Fecha ingreso almacén */}
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
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Calendar size={11} />
                    Fecha ingreso
                  </label>
                  <input
                    type="date"
                    value={fechaIngreso}
                    onChange={e => setFechaIngreso(e.target.value)}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                  />
                </div>
              </div>

              {/* Tipo de ingreso */}
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

              {/* Moneda | Forma de pago */}
              <div className="grid grid-cols-2 gap-2">
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
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <CreditCard size={11} />
                    Forma de pago
                  </label>
                  <select
                    value={formaPago}
                    onChange={e => setFormaPago(e.target.value)}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                  >
                    <option value="">— Sin especif. —</option>
                    {FORMAS_PAGO_NI.map(fp => (
                      <option key={fp.value} value={fp.value}>{fp.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tipo doc. origen | Encargado de almacén */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Tipo doc. origen
                  </label>
                  <select
                    value={documentoOrigen}
                    onChange={e => setDocumentoOrigen(e.target.value)}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                  >
                    <option value="">— Sin ref. —</option>
                    <option value="01">Factura</option>
                    <option value="03">Boleta de Venta</option>
                    <option value="52">Liq. de compra</option>
                    <option value="91">Comp. operaciones</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <User size={11} />
                    Encargado de almacén
                  </label>
                  <input
                    type="text"
                    value={encargadoAlmacen}
                    onChange={e => setEncargadoAlmacen(e.target.value)}
                    placeholder="Nombre del encargado"
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                  />
                </div>
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
                        Almacén
                      </th>
                      <th className="text-right px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 w-20">
                        Stock
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
                        <td className="px-2 py-2">
                          <select
                            value={linea.almacenId ?? ''}
                            onChange={e => handleAlmacenLinea(linea.id, e.target.value)}
                            className="text-xs border border-gray-200 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none min-w-[80px]"
                          >
                            {almacenesActivos
                              .filter(a => almacenesSeleccionados.includes(a.id))
                              .map(a => (
                                <option key={a.id} value={a.id} title={a.nombreAlmacen}>
                                  {a.codigoAlmacen}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right text-[12px] font-mono text-slate-500 dark:text-slate-400">
                          {getStockActual(linea.productoId, linea.almacenId ?? almacenesSeleccionados[0] ?? '')}
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
          label: generando ? 'Generando...' : 'Generar nota de ingreso',
          onClick: handleGenerarNI,
          icon: <Save size={14} />,
          disabled: seriesNI.length === 0 || generando || guardando,
          title:
            seriesNI.length === 0
              ? 'Configure una serie de Nota de Ingreso en Configuración → Series'
              : undefined,
        }}
      />
    </div>
  );
};

export default FormularioNotaIngreso;
