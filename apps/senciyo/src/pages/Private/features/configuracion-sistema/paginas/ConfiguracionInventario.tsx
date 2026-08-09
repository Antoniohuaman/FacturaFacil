// configuracion-sistema/paginas/ConfiguracionInventario.tsx
//
// Fuente única de configuración de Inventario. Corrección UX final 2026-08-07, basada en
// docs/AUDITORIA_UX_FLUJO_CONFIGURACION_INVENTARIO_ACTUAL_2026-08-07.md — ver
// docs/IMPLEMENTACION_UX_FINAL_CONFIGURACION_INVENTARIO_2026-08-07.md para el resumen de la
// corrección. Sigue siendo una sola página con divulgación progresiva (nunca un wizard, nunca un
// modal) en `/configuracion/inventario`.
//
// Decisión central de esta corrección: SELECCIONAR ≠ ACTIVAR. Elegir una modalidad (tarjeta) es
// una elección local, sin efecto — ninguna tarjeta activa `controlStockActivo` ni crea nada
// persistido salvo, para FIFO, el lote técnico de detección de stock que YA existía (necesario
// para poder confirmar costos antes de decidir). El único momento en que Inventario se activa de
// verdad es al presionar el CTA final ("Activar inventario" / "Activar inventario valorizado").
//
// Modo de inventario único y coordinado (`resolverModoInventario`): 'inactivo' | 'cuantitativo' |
// 'valorizado'. Esta página consulta y muta las MISMAS dos fuentes ya existentes
// (`salesPreferences.controlStockActivo` + `preferenciasInventario.estadoValorizacion`) — nunca
// crea una tercera fuente de verdad. `inventarioConfiguradoAlgunaVez` (nuevo campo de
// `PreferenciasInventario`) es la única señal adicional: un dato de ciclo de vida, monótono, que
// distingue "Pendiente de configurar" de "Inactivo" — nunca el modo operativo.

import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  FileText,
  ShoppingCart,
  ClipboardList,
  BookOpen,
  ArrowUpCircle,
  ArrowDownCircle,
  Info,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  Boxes,
  Layers,
} from 'lucide-react';
import { PageHeader, Button } from '@/contasis';
import { useUserSession } from '@/contexts/UserSessionContext';
import { useFeedback } from '@/shared/feedback/useFeedback';
import { getTenantEmpresaId } from '@/shared/tenant';
import { currencyManager } from '@/shared/currency';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import type { StockDescuentoDocumento } from '../contexto/ContextoConfiguracion';
import { obtenerUsuarioDesdeSesion, tienePermiso } from '../utilidades/permisos';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import type { Almacen } from '../modelos/Almacen';
import {
  resolverModoInventario,
  puedeDesactivarControlInventario,
  resolverEstadoVisualInventario,
  estaPreparandoValorizacion,
  type EstadoVisualInventario,
} from '../../gestion-inventario/utils/estadoActivacionValorizacionInventario';
import type { DetalleValorizacionInicial } from '../../gestion-inventario/models/valorizacionInicialInventario.types';
import {
  iniciarPreparacionValorizacion,
  confirmarCostoDetalle,
  recalcularDetalle,
  cancelarPreparacion,
  verificarCondicionesValidacion,
  puedeReanudarOIniciarActivacion,
  validarYActivarValorizacion,
} from '../../gestion-inventario/services/valorizacionInicial.service';
import { obtenerLoteActivoPorEmpresa } from '../../gestion-inventario/repositories/valorizacionInicialInventario.repository';
import { OPCIONES_TRATAMIENTO_IMPUESTO } from '../components/negocio/opcionesTratamientoImpuestoCompra';
import { valorInicialInputCosto, parsearValorCosto, determinarEsManual } from '../components/negocio/orquestacionConfirmacionCosto';

type CampoDescuento =
  | 'stockDescuentoFacturaYBoleta'
  | 'stockDescuentoNotaVenta'
  | 'stockDescuentoGuiaRemision';

// Guía de Remisión (GRE-P1-008): "Automático al emitir" dispara la salida real mediante el mismo
// motor central de Inventario (`ServicioKardexValorizado`, vía `guias-remision/logica/inventarioGRE.ts`)
// que ya usan Factura/Boleta y Nota de Salida — ver CIERRE_FINAL_GUIAS_REMISION.md, sección
// "Corrección definitiva GRE-P1-008".
const OPCIONES_CONFIGURABLES: Array<{ campo: CampoDescuento; label: string; textoAutomatico: string; icon: React.ComponentType<{ className?: string }> }> = [
  { campo: 'stockDescuentoFacturaYBoleta', label: 'Factura / Boleta', textoAutomatico: 'Automático al emitir', icon: FileText },
  { campo: 'stockDescuentoNotaVenta', label: 'Nota de Venta', textoAutomatico: 'Automático al generar', icon: ShoppingCart },
  { campo: 'stockDescuentoGuiaRemision', label: 'Guía de Remisión', textoAutomatico: 'Automático al emitir', icon: FileText },
];

const DOCUMENTOS_FIJOS: Array<{ label: string; regla: string; tooltip: string; icon: React.ComponentType<{ className?: string }> }> = [
  { label: 'Orden de Venta', regla: 'Reserva stock', tooltip: 'La Orden de Venta reserva stock, pero no descuenta inventario.', icon: ClipboardList },
  { label: 'Cotización', regla: 'No afecta stock', tooltip: 'La Cotización es referencial y no modifica inventario.', icon: BookOpen },
  { label: 'Nota de Ingreso', regla: 'Aumenta stock', tooltip: 'La Nota de Ingreso registra entradas de productos al almacén.', icon: ArrowUpCircle },
  { label: 'Nota de Salida', regla: 'Descuenta stock', tooltip: 'La Nota de Salida representa el despacho físico y siempre requiere stock disponible.', icon: ArrowDownCircle },
];

function TooltipInfo({ text }: { text: string }) {
  return (
    <div className="group relative inline-flex">
      <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-500 cursor-help" />
      <div className="invisible group-hover:visible absolute left-5 top-0 w-52 bg-gray-900 text-white text-xs rounded-lg p-2.5 z-50 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg leading-relaxed">
        {text}
        <div className="absolute left-0 top-1 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45" />
      </div>
    </div>
  );
}

const ETIQUETA_ESTADO_VISUAL: Record<EstadoVisualInventario, { texto: string; clase: string }> = {
  pendiente: { texto: 'Pendiente de configurar', clase: 'bg-gray-50 text-gray-600 border-gray-200' },
  inactivo: { texto: 'Inactivo', clase: 'bg-gray-100 text-gray-600 border-gray-300' },
  cuantitativo_activo: { texto: 'Activo · Control de existencias', clase: 'bg-green-50 text-green-700 border-green-200' },
  valorizado_activo: { texto: 'Activo · Valorizado FIFO', clase: 'bg-green-50 text-green-700 border-green-200' },
  requiere_atencion: { texto: 'Requiere atención', clase: 'bg-amber-50 text-amber-700 border-amber-200' },
};

function EtiquetaEstado({ estado }: { estado: EstadoVisualInventario }) {
  const { texto, clase } = ETIQUETA_ESTADO_VISUAL[estado];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${clase}`}>
      {texto}
    </span>
  );
}

function claveDetalle(productoId: string, almacenId: string): string {
  return `${productoId}:${almacenId}`;
}

export function ConfiguracionInventarioPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const { state, dispatch, rolesConfigurados } = useConfigurationContext();
  const { session } = useUserSession();
  const feedback = useFeedback();
  const { allProducts } = useProductStore();

  const usuarioActual = useMemo(() => obtenerUsuarioDesdeSesion(state.users, session), [state.users, session]);
  const establecimientoId = session?.currentEstablecimientoId;
  const prefs = state.salesPreferences;
  const preferenciasInventario = state.preferenciasInventario;
  const estadoValorizacion = preferenciasInventario.estadoValorizacion;
  const tratamientoImpuestoCompra = preferenciasInventario.tratamientoImpuestoCompra;
  const controlStockActivo = prefs.controlStockActivo ?? false;
  const modo = resolverModoInventario(controlStockActivo, estadoValorizacion);
  const estadoVisual = resolverEstadoVisualInventario(modo, estadoValorizacion, preferenciasInventario.inventarioConfiguradoAlgunaVez);
  const hayBorradorFIFO = estaPreparandoValorizacion(estadoValorizacion);
  const empresaId = getTenantEmpresaId();
  const almacenesMap = useMemo(() => new Map<string, Almacen>(state.almacenes.map((a) => [a.id, a])), [state.almacenes]);

  const puedeConfigurar = tienePermiso({ usuario: usuarioActual, permisoId: 'inventario.configurar', rolesDisponibles: rolesConfigurados, establecimientoId });
  const puedeConfigurarValorizacion = tienePermiso({ usuario: usuarioActual, permisoId: 'inventario.valorizacion.configurar', rolesDisponibles: rolesConfigurados, establecimientoId });
  const puedeConfirmarCostos = tienePermiso({ usuario: usuarioActual, permisoId: 'inventario.valorizacion.confirmar_costos', rolesDisponibles: rolesConfigurados, establecimientoId });
  const puedeActivarValorizacion = tienePermiso({ usuario: usuarioActual, permisoId: 'inventario.valorizacion.activar', rolesDisponibles: rolesConfigurados, establecimientoId });
  const puedeVerCostos = tienePermiso({ usuario: usuarioActual, permisoId: 'inventario.costos.ver', rolesDisponibles: rolesConfigurados, establecimientoId });

  // Borrador local de "primera configuración" (§7/§8): mientras Inventario nunca se activó, elegir
  // una tarjeta NO dispara ningún dispatch — solo decide qué sección de esta misma página mostrar.
  // Para FIFO no se necesita un booleano propio: `hayBorradorFIFO` (derivado de `estadoValorizacion`,
  // persistido) ya identifica esa elección de forma confiable incluso tras recargar la página.
  const [borradorCuantitativoElegido, setBorradorCuantitativoElegido] = useState(false);
  const modalidadElegida: 'cuantitativo' | 'valorizado' | null = hayBorradorFIFO ? 'valorizado' : borradorCuantitativoElegido ? 'cuantitativo' : null;

  const [localFyB, setLocalFyB] = useState<StockDescuentoDocumento>(prefs.stockDescuentoFacturaYBoleta ?? 'automatico');
  const [localNV, setLocalNV] = useState<StockDescuentoDocumento>(prefs.stockDescuentoNotaVenta ?? 'automatico');
  const [localGR, setLocalGR] = useState<StockDescuentoDocumento>(prefs.stockDescuentoGuiaRemision ?? 'automatico');
  const [confirmandoDesactivar, setConfirmandoDesactivar] = useState(false);
  const [costosLocales, setCostosLocales] = useState<Record<string, string>>({});
  const [aceptaIrreversibilidad, setAceptaIrreversibilidad] = useState(false);
  const [activando, setActivando] = useState(false);
  const [errorActivacion, setErrorActivacion] = useState<string | undefined>(undefined);

  const lote = useMemo(
    () => (hayBorradorFIFO ? obtenerLoteActivoPorEmpresa(empresaId) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [empresaId, estadoValorizacion, activando]
  );

  const volver = useCallback(() => {
    navigate(returnTo && returnTo.startsWith('/') ? returnTo : '/configuracion');
  }, [navigate, returnTo]);

  const valorPorCampo = (campo: CampoDescuento): StockDescuentoDocumento => {
    if (campo === 'stockDescuentoFacturaYBoleta') return localFyB;
    if (campo === 'stockDescuentoNotaVenta') return localNV;
    return localGR;
  };

  // Reglas por documento: durante la primera configuración es un borrador puramente local (se
  // consolida en el CTA final); una vez que Inventario ya se configuró alguna vez, cada cambio se
  // guarda de inmediato — un único patrón de guardado en toda la página (§12), sin botón "Guardar
  // cambios" en ningún caso.
  const handleCambiarRegla = (campo: CampoDescuento, valor: StockDescuentoDocumento) => {
    if (!puedeConfigurar) {
      feedback.error('No tienes permiso para configurar el inventario.');
      return;
    }
    const siguienteFyB = campo === 'stockDescuentoFacturaYBoleta' ? valor : localFyB;
    const siguienteNV = campo === 'stockDescuentoNotaVenta' ? valor : localNV;
    const siguienteGR = campo === 'stockDescuentoGuiaRemision' ? valor : localGR;
    setLocalFyB(siguienteFyB);
    setLocalNV(siguienteNV);
    setLocalGR(siguienteGR);
    if (preferenciasInventario.inventarioConfiguradoAlgunaVez) {
      dispatch({
        type: 'SET_SALES_PREFERENCES',
        payload: { ...prefs, stockDescuentoFacturaYBoleta: siguienteFyB, stockDescuentoNotaVenta: siguienteNV, stockDescuentoGuiaRemision: siguienteGR },
      });
    }
  };

  // Elegir "Control de existencias": únicamente decide qué sección de la página se muestra a
  // continuación — no activa nada (§7).
  const elegirControlExistencias = useCallback(() => {
    setBorradorCuantitativoElegido(true);
  }, []);

  // CTA final de la primera configuración cuantitativa, y también CTA de reactivación desde
  // "Inactivo" (§14) — la misma operación en ambos casos: activa el switch maestro y consolida las
  // reglas de documento del borrador local en una sola escritura.
  const activarCuantitativo = useCallback(() => {
    if (!puedeConfigurar) {
      feedback.error('No tienes permiso para configurar el inventario.');
      return;
    }
    dispatch({
      type: 'SET_SALES_PREFERENCES',
      payload: {
        ...prefs,
        controlStockActivo: true,
        stockDescuentoFacturaYBoleta: localFyB,
        stockDescuentoNotaVenta: localNV,
        stockDescuentoGuiaRemision: localGR,
      },
    });
    if (!preferenciasInventario.inventarioConfiguradoAlgunaVez) {
      dispatch({ type: 'SET_PREFERENCIAS_INVENTARIO', payload: { ...preferenciasInventario, inventarioConfiguradoAlgunaVez: true } });
    }
    setBorradorCuantitativoElegido(false);
    feedback.success('Inventario activado.');
  }, [puedeConfigurar, feedback, dispatch, prefs, localFyB, localNV, localGR, preferenciasInventario]);

  // Elegir "Control de existencias y costos (FIFO)" — o, desde cuantitativo ya activo, "Activar
  // costeo FIFO": en ningún caso activa nada todavía (§7/§15). Solo abre un borrador de costeo
  // (reutiliza el lote de detección de stock ya existente, técnicamente necesario para poder
  // confirmar costos) sin tocar `controlStockActivo` — si ya estaba en `true` porque el cuantitativo
  // ya operaba, sigue operando sin interrupción mientras se configura FIFO debajo (§22).
  const iniciarValorizado = useCallback(() => {
    if (!puedeConfigurarValorizacion) {
      feedback.error('No tienes permiso para configurar la valorización del inventario.');
      return;
    }
    try {
      const resultado = iniciarPreparacionValorizacion(estadoValorizacion, {
        empresaId,
        usuario: session?.userName || 'Usuario',
        productos: allProducts,
        almacenes: almacenesMap,
        generarId: () => crypto.randomUUID(),
        fechaActual: () => new Date().toISOString(),
      });
      dispatch({ type: 'SET_PREFERENCIAS_INVENTARIO', payload: { ...preferenciasInventario, estadoValorizacion: resultado.estadoValorizacion } });
      setBorradorCuantitativoElegido(false);
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : String(e));
    }
  }, [puedeConfigurarValorizacion, feedback, estadoValorizacion, empresaId, session, allProducts, almacenesMap, dispatch, preferenciasInventario]);

  const desactivarControl = useCallback(() => {
    if (!puedeConfigurar) {
      feedback.error('No tienes permiso para configurar el inventario.');
      return;
    }
    if (hayBorradorFIFO) {
      feedback.error('Cancela la activación de costos FIFO antes de desactivar el inventario.');
      return;
    }
    if (!puedeDesactivarControlInventario(estadoValorizacion)) {
      feedback.error('No es posible desactivar el control de inventario mientras la valorización esté activa.');
      return;
    }
    dispatch({ type: 'SET_SALES_PREFERENCES', payload: { ...prefs, controlStockActivo: false } });
    setConfirmandoDesactivar(false);
    feedback.info('Inventario desactivado. El stock, movimientos, reglas y configuración se conservan.');
  }, [puedeConfigurar, feedback, hayBorradorFIFO, estadoValorizacion, dispatch, prefs]);

  const limpiarOverrideLocal = (clave: string) => {
    setCostosLocales((prev) => {
      if (!(clave in prev)) return prev;
      const siguiente = { ...prev };
      delete siguiente[clave];
      return siguiente;
    });
  };
  const obtenerValorInputCosto = (detalle: DetalleValorizacionInicial): string => {
    const clave = claveDetalle(detalle.productoId, detalle.almacenId);
    return costosLocales[clave] ?? valorInicialInputCosto(detalle);
  };

  const handleConfirmarCosto = (detalle: DetalleValorizacionInicial) => {
    if (!puedeConfirmarCostos) {
      feedback.error('No tienes permiso para confirmar costos de valorización.');
      return;
    }
    const clave = claveDetalle(detalle.productoId, detalle.almacenId);
    const { valido, costo } = parsearValorCosto(obtenerValorInputCosto(detalle));
    if (!valido) {
      feedback.error('El costo debe ser un número mayor a cero.');
      return;
    }
    try {
      confirmarCostoDetalle(empresaId, detalle.productoId, detalle.almacenId, costo, new Date().toISOString(), determinarEsManual(detalle.costoPropuesto, costo));
      limpiarOverrideLocal(clave);
      feedback.success('Costo confirmado.');
      setActivando((v) => v); // fuerza recomputar `lote` vía el useMemo (misma referencia de dependencias)
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : String(e));
    }
  };

  const handleRecalcular = (productoId: string, almacenId: string) => {
    if (!puedeConfirmarCostos) {
      feedback.error('No tienes permiso para confirmar costos de valorización.');
      return;
    }
    try {
      recalcularDetalle(empresaId, productoId, almacenId, allProducts, new Date().toISOString());
      limpiarOverrideLocal(claveDetalle(productoId, almacenId));
      feedback.success('Detalle recalculado — revisa y confirma el costo nuevamente.');
      setActivando((v) => v);
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : String(e));
    }
  };

  // Abandonar el borrador de costeo FIFO (§16). El nombre visible de esta acción se decide en el
  // render según el contexto ("Seguir con control de existencias" si ya operaba en cuantitativo,
  // "Cancelar activación de costos FIFO" si Inventario nunca se activó) — el resultado siempre es
  // el mismo: la empresa vuelve exactamente al punto de partida (`no_iniciada`), sin ningún estado
  // técnico visible y sin ninguna consecuencia (cierre de UX-INV-P0-001).
  const handleCancelarPreparacion = () => {
    if (!puedeConfigurarValorizacion) {
      feedback.error('No tienes permiso para configurar la valorización del inventario.');
      return;
    }
    try {
      const resultado = cancelarPreparacion(estadoValorizacion, empresaId);
      dispatch({ type: 'SET_PREFERENCIAS_INVENTARIO', payload: { ...preferenciasInventario, estadoValorizacion: resultado.estadoValorizacion } });
      setAceptaIrreversibilidad(false);
      setBorradorCuantitativoElegido(true);
      feedback.info(modo === 'cuantitativo' ? 'Sigues con control de existencias.' : 'Se canceló la activación de costos FIFO.');
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : String(e));
    }
  };

  const handleActualizarTratamiento = (valor: typeof tratamientoImpuestoCompra) => {
    if (!puedeConfigurarValorizacion) {
      feedback.error('No tienes permiso para configurar la valorización del inventario.');
      return;
    }
    dispatch({ type: 'SET_PREFERENCIAS_INVENTARIO', payload: { ...preferenciasInventario, tratamientoImpuestoCompra: valor } });
  };

  // Orquestación única (§9/§10): valida (si corresponde) y activa en UNA sola llamada — el mismo
  // clic que confirma la preparación también enciende el switch maestro y consolida las reglas de
  // documento del borrador, para que "Inventario activo" y "Valorización activa" queden coherentes
  // sin un segundo paso ni una segunda fuente de verdad.
  const handleActivarValorizacion = useCallback(async () => {
    if (!puedeActivarValorizacion) {
      feedback.error('No tienes permiso para activar la valorización del inventario.');
      return;
    }
    if (!puedeReanudarOIniciarActivacion(estadoValorizacion) && estadoValorizacion !== 'pendiente_costos') {
      feedback.error('La activación no está disponible desde el estado actual.');
      return;
    }
    setActivando(true);
    setErrorActivacion(undefined);
    try {
      const resultado = await validarYActivarValorizacion({
        estadoValorizacionActual: estadoValorizacion,
        empresaId,
        tratamientoImpuestoCompra,
        productos: allProducts,
        almacenes: almacenesMap,
        monedaBase: currencyManager.getSnapshot().baseCurrency.code,
        generarId: () => crypto.randomUUID(),
        fechaActual: () => new Date().toISOString(),
      });
      dispatch({ type: 'SET_PREFERENCIAS_INVENTARIO', payload: { ...preferenciasInventario, estadoValorizacion: resultado.estadoValorizacion, inventarioConfiguradoAlgunaVez: preferenciasInventario.inventarioConfiguradoAlgunaVez || resultado.estadoValorizacion === 'activa' } });
      if (resultado.estadoValorizacion === 'activa') {
        dispatch({
          type: 'SET_SALES_PREFERENCES',
          payload: { ...prefs, controlStockActivo: true, stockDescuentoFacturaYBoleta: localFyB, stockDescuentoNotaVenta: localNV, stockDescuentoGuiaRemision: localGR },
        });
        setAceptaIrreversibilidad(false);
        setBorradorCuantitativoElegido(false);
        feedback.success('Inventario valorizado activado.');
      } else {
        setErrorActivacion(resultado.error);
        feedback.error(resultado.error ?? 'La activación no pudo completarse — puede reintentarse.');
      }
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : String(e);
      dispatch({ type: 'SET_PREFERENCIAS_INVENTARIO', payload: { ...preferenciasInventario, estadoValorizacion: 'fallida_recuperable' } });
      setErrorActivacion(mensaje);
      feedback.error(mensaje);
    } finally {
      setActivando(false);
    }
  }, [puedeActivarValorizacion, feedback, estadoValorizacion, empresaId, tratamientoImpuestoCompra, allProducts, almacenesMap, dispatch, preferenciasInventario, prefs, localFyB, localNV, localGR]);

  const primeraConfiguracion = estadoVisual === 'pendiente';
  const yaConfigurado = estadoVisual === 'cuantitativo_activo' || estadoVisual === 'inactivo';
  const puedeCancelarAhora = estadoValorizacion === 'en_preparacion' || estadoValorizacion === 'pendiente_costos' || estadoValorizacion === 'validada';

  const detallesConStock = (lote?.detalles ?? []).filter((d) => d.cantidadDetectada > 0);
  const motivosBloqueo = lote && estadoValorizacion === 'pendiente_costos'
    ? verificarCondicionesValidacion(lote, tratamientoImpuestoCompra, allProducts, almacenesMap)
    : [];
  const listoParaResumenFinal =
    (estadoValorizacion === 'pendiente_costos' && motivosBloqueo.length === 0) || estadoValorizacion === 'validada';

  const unidadesDetectadas = detallesConStock.reduce((acc, d) => acc + d.cantidadDetectada, 0);
  const valorEstimado = detallesConStock.reduce((acc, d) => acc + d.cantidadDetectada * (d.costoConfirmado ?? 0), 0);

  const etiquetaCancelarFIFO = modo === 'cuantitativo' ? 'Seguir con control de existencias' : 'Cancelar activación de costos FIFO';

  // Secciones de configuración FIFO (impuestos + stock inicial + resumen + activación) — el mismo
  // bloque se usa tanto durante la primera configuración como cuando Inventario ya opera en
  // cuantitativo y el usuario está sumando costeo FIFO sin interrumpirlo (§15/§22): no hay dos
  // copias de este contenido en el archivo.
  const seccionesValorizacion = hayBorradorFIFO ? (
    <>
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Cómo considerar los impuestos en el costo</h2>
        <p className="text-xs text-gray-500 mb-3">
          Puedes cambiarlo libremente antes de activar. Después de activar, el cambio aplica solo a compras futuras —
          las ya registradas conservan su tratamiento original.
        </p>
        <div className="space-y-2">
          {OPCIONES_TRATAMIENTO_IMPUESTO.map((opcion) => (
            <label key={opcion.valor} className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="tratamientoImpuestoCompra"
                checked={tratamientoImpuestoCompra === opcion.valor}
                onChange={() => handleActualizarTratamiento(opcion.valor)}
                disabled={!puedeConfigurarValorizacion}
                className="mt-0.5 w-3.5 h-3.5 accent-blue-600"
              />
              <span>
                <span className="block text-xs font-medium text-gray-800">{opcion.label}</span>
                <span className="block text-[11px] text-gray-500">{opcion.ayuda}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {estadoValorizacion !== 'activando' && estadoValorizacion !== 'fallida_recuperable' && lote && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Stock inicial</h2>
          {detallesConStock.length === 0 ? (
            <div className="text-xs text-gray-500 space-y-1">
              <p>No tienes stock existente por valorizar.</p>
              <p>Las capas de costo empezarán a crearse con tus próximas entradas.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 mb-3">
                <div className="rounded-lg border border-gray-200 p-2">
                  <p className="text-gray-500">Productos con stock</p>
                  <p className="font-semibold text-gray-800">{detallesConStock.length}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-2">
                  <p className="text-gray-500">Unidades detectadas</p>
                  <p className="font-semibold text-gray-800">{unidadesDetectadas}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-2">
                  <p className="text-gray-500">Valor inicial estimado</p>
                  <p className="font-semibold text-gray-800">{puedeVerCostos ? valorEstimado.toFixed(2) : '—'}</p>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase tracking-wide">Producto</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase tracking-wide">Almacén</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500 uppercase tracking-wide">Stock</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase tracking-wide">Costo confirmado</th>
                      {estadoValorizacion !== 'validada' && <th className="px-3 py-2" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detallesConStock.map((d) => {
                      const producto = allProducts.find((p) => p.id === d.productoId);
                      const almacen = almacenesMap.get(d.almacenId);
                      const clave = claveDetalle(d.productoId, d.almacenId);
                      return (
                        <tr key={clave} className="bg-white">
                          <td className="px-3 py-2">
                            <span className="block font-medium text-gray-800">{producto?.nombre ?? d.productoId}</span>
                            <span className="block text-[11px] text-gray-400">{producto?.codigo}</span>
                          </td>
                          <td className="px-3 py-2 text-gray-600">{almacen?.nombreAlmacen ?? d.almacenId}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-gray-800">{d.cantidadDetectada}</td>
                          <td className="px-3 py-2">
                            {!puedeVerCostos ? (
                              <span className="tabular-nums text-gray-400">—</span>
                            ) : estadoValorizacion === 'validada' ? (
                              <span className="tabular-nums text-gray-800">{d.costoConfirmado?.toFixed(2) ?? '—'}</span>
                            ) : (
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={obtenerValorInputCosto(d)}
                                onChange={(e) => setCostosLocales((prev) => ({ ...prev, [clave]: e.target.value }))}
                                disabled={!puedeConfirmarCostos}
                                className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs"
                              />
                            )}
                          </td>
                          {estadoValorizacion !== 'validada' && (
                            <td className="px-3 py-2 whitespace-nowrap">
                              {!puedeConfirmarCostos ? (
                                <span className="text-[11px] text-gray-400">Sin permiso</span>
                              ) : d.requiereRecalculo ? (
                                <button type="button" onClick={() => handleRecalcular(d.productoId, d.almacenId)} className="text-[11px] font-medium text-amber-600 hover:text-amber-800">
                                  Recalcular
                                </button>
                              ) : (
                                <button type="button" onClick={() => handleConfirmarCosto(d)} className="text-[11px] font-medium text-blue-600 hover:text-blue-800">
                                  Confirmar
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {motivosBloqueo.length > 0 && (
            <ul className="list-disc pl-4 text-[11px] text-amber-700 space-y-0.5 mt-3">
              {motivosBloqueo.map((m) => <li key={m}>{m}</li>)}
            </ul>
          )}
        </section>
      )}

      {listoParaResumenFinal && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Revisa antes de activar el costeo FIFO</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div><dt className="text-gray-500">Tipo</dt><dd className="font-medium text-gray-800">Inventario valorizado (costeo FIFO)</dd></div>
            <div><dt className="text-gray-500">Tratamiento de impuestos</dt><dd className="font-medium text-gray-800">{OPCIONES_TRATAMIENTO_IMPUESTO.find((o) => o.valor === tratamientoImpuestoCompra)?.label ?? tratamientoImpuestoCompra}</dd></div>
            <div><dt className="text-gray-500">Productos con stock inicial</dt><dd className="font-medium text-gray-800">{detallesConStock.length}</dd></div>
            <div><dt className="text-gray-500">Unidades detectadas</dt><dd className="font-medium text-gray-800">{unidadesDetectadas}</dd></div>
            <div><dt className="text-gray-500">Valor inicial estimado</dt><dd className="font-medium text-gray-800">{puedeVerCostos ? valorEstimado.toFixed(2) : '—'}</dd></div>
            <div><dt className="text-gray-500">Reglas de documento</dt><dd className="font-medium text-gray-800">Factura/Boleta: {localFyB}, Nota de Venta: {localNV}, Guía: {localGR}</dd></div>
          </dl>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Una vez activado el costeo FIFO, el inventario continuará trabajando con costos por capas y no podrá
            volver al modo de solo cantidades. Tus movimientos y costos históricos deben conservarse de forma
            consistente.
          </div>
          {!puedeActivarValorizacion ? (
            <p className="text-xs text-gray-500">No tienes permiso para activar la valorización del inventario.</p>
          ) : (
            <div className="space-y-3">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={aceptaIrreversibilidad}
                  onChange={(e) => setAceptaIrreversibilidad(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 accent-blue-600"
                />
                <span className="text-xs text-gray-700">Entiendo que después de activar FIFO no podré volver al control solo por cantidades.</span>
              </label>
              <Button
                variant="primary"
                onClick={handleActivarValorizacion}
                disabled={!aceptaIrreversibilidad || activando || motivosBloqueo.length > 0}
              >
                {activando ? 'Activando…' : 'Activar inventario valorizado'}
              </Button>
            </div>
          )}
        </section>
      )}

      {estadoValorizacion === 'activando' && (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center gap-2 text-xs text-blue-800">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" aria-hidden="true" />
            Activando la valorización de inventario — no cierres ni recargues esta pantalla.
          </div>
          {puedeActivarValorizacion && (
            <Button variant="secondary" className="mt-3" onClick={handleActivarValorizacion} disabled={activando}>
              {activando ? 'Reanudando…' : 'Reanudar activación'}
            </Button>
          )}
        </section>
      )}

      {estadoValorizacion === 'fallida_recuperable' && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-2">
          <p className="text-sm font-semibold text-red-800">La activación no pudo completarse.</p>
          {errorActivacion && <p className="text-xs text-red-700">{errorActivacion}</p>}
          {puedeActivarValorizacion ? (
            <Button variant="primary" onClick={handleActivarValorizacion} disabled={activando}>
              {activando ? 'Reintentando…' : 'Reintentar activación'}
            </Button>
          ) : (
            <p className="text-xs text-gray-500">No tienes permiso para activar la valorización del inventario.</p>
          )}
        </section>
      )}

      {puedeCancelarAhora && (
        <button type="button" onClick={handleCancelarPreparacion} className="text-xs text-gray-500 hover:text-gray-700">
          {etiquetaCancelarFIFO}
        </button>
      )}
    </>
  ) : null;

  const reglasDocumento = (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">Reglas por documento</h2>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs uppercase tracking-wide">Documento</th>
              <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs uppercase tracking-wide">Comportamiento de inventario</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {OPCIONES_CONFIGURABLES.map(({ campo, label, textoAutomatico, icon: Icon }) => {
              const valor = valorPorCampo(campo);
              return (
                <tr key={campo} className="bg-white hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 text-gray-800 font-medium">
                      <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      {label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input type="radio" name={campo} checked={valor === 'automatico'} onChange={() => handleCambiarRegla(campo, 'automatico')} disabled={!puedeConfigurar} className="w-3.5 h-3.5 accent-blue-600" />
                        <span className="text-gray-700 text-xs">{textoAutomatico}</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input type="radio" name={campo} checked={valor === 'nota_salida'} onChange={() => handleCambiarRegla(campo, 'nota_salida')} disabled={!puedeConfigurar} className="w-3.5 h-3.5 accent-blue-600" />
                        <span className="text-gray-700 text-xs">Mediante Nota de Salida</span>
                      </label>
                      {campo === 'stockDescuentoNotaVenta' && (
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input type="radio" name={campo} checked={valor === 'sin_control'} onChange={() => handleCambiarRegla(campo, 'sin_control')} disabled={!puedeConfigurar} className="w-3.5 h-3.5 accent-blue-600" />
                          <span className="text-gray-700 text-xs">No afecta stock</span>
                        </label>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {DOCUMENTOS_FIJOS.map(({ label, regla, tooltip, icon: Icon }) => (
              <tr key={label} className="bg-gray-50/40">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 text-gray-500">
                    <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    {label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-gray-500 text-xs">
                    {regla}
                    <TooltipInfo text={tooltip} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>Inventario</span>
            <EtiquetaEstado estado={estadoVisual} />
          </div>
        }
        icon={<Package className="w-5 h-5" />}
        actions={
          <Button variant="secondary" icon={<ArrowLeft />} onClick={volver}>
            {returnTo ? 'Volver a Inventario' : 'Volver'}
          </Button>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <p className="text-sm text-gray-500 -mt-2">Control de existencias, movimientos y valorización.</p>

          {estadoVisual === 'requiere_atencion' && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">El inventario valorizado requiere atención</p>
                <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                  Se detectó una inconsistencia entre el stock físico y las capas de costo registradas. No sigas
                  registrando movimientos de inventario hasta resolverla — contacta a soporte técnico para revisar
                  y corregir la información antes de continuar operando.
                </p>
              </div>
            </div>
          )}

          {estadoVisual === 'valorizado_activo' && (
            <>
              <section className="rounded-xl border border-green-200 bg-green-50 p-5">
                <div className="flex items-center gap-2 text-green-800 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <p className="text-sm font-semibold">Costeo FIFO activo</p>
                </div>
                <p className="text-xs text-green-700 leading-relaxed">
                  Las entradas crean capas de costo y las salidas consumen primero las más antiguas. El método de
                  costeo no puede desactivarse; las configuraciones para operaciones futuras siguen siendo editables.
                </p>
              </section>
              {reglasDocumento}
              <section className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-1">Cómo considerar los impuestos en el costo</h2>
                <p className="text-xs text-gray-500 mb-3">
                  El cambio aplica solo a compras futuras — las ya registradas conservan su tratamiento original.
                </p>
                <div className="space-y-2">
                  {OPCIONES_TRATAMIENTO_IMPUESTO.map((opcion) => (
                    <label key={opcion.valor} className="flex items-start gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="tratamientoImpuestoCompra"
                        checked={tratamientoImpuestoCompra === opcion.valor}
                        onChange={() => handleActualizarTratamiento(opcion.valor)}
                        disabled={!puedeConfigurarValorizacion}
                        className="mt-0.5 w-3.5 h-3.5 accent-blue-600"
                      />
                      <span>
                        <span className="block text-xs font-medium text-gray-800">{opcion.label}</span>
                        <span className="block text-[11px] text-gray-500">{opcion.ayuda}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            </>
          )}

          {primeraConfiguracion && modalidadElegida === null && (
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Elige cómo quieres controlar tu inventario</h2>
              <p className="text-xs text-gray-500 mb-4">Podrás cambiar de opción libremente antes de activar.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  disabled={!puedeConfigurar}
                  onClick={elegirControlExistencias}
                  className="text-left rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all p-4 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Boxes className="w-6 h-6 text-blue-600 mb-2" />
                  <p className="text-sm font-semibold text-gray-900">Control de existencias</p>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                    Registra cantidades por almacén. Tus documentos descontarán stock automáticamente.
                  </p>
                </button>
                <button
                  type="button"
                  disabled={!puedeConfigurarValorizacion}
                  onClick={iniciarValorizado}
                  className="text-left rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all p-4 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Layers className="w-6 h-6 text-blue-600 mb-2" />
                  <p className="text-sm font-semibold text-gray-900">Control de existencias y costos (FIFO)</p>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                    Además de cantidades, calcula el costo de cada salida por capas (FIFO).
                  </p>
                </button>
              </div>
            </section>
          )}

          {primeraConfiguracion && modalidadElegida === 'cuantitativo' && (
            <>
              {reglasDocumento}
              <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
                <h2 className="text-sm font-semibold text-gray-900">Revisa tu configuración</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div><dt className="text-gray-500">Tipo</dt><dd className="font-medium text-gray-800">Control de existencias</dd></div>
                  <div><dt className="text-gray-500">Factura / Boleta</dt><dd className="font-medium text-gray-800">{localFyB}</dd></div>
                  <div><dt className="text-gray-500">Nota de Venta</dt><dd className="font-medium text-gray-800">{localNV}</dd></div>
                  <div><dt className="text-gray-500">Guía de Remisión</dt><dd className="font-medium text-gray-800">{localGR}</dd></div>
                </dl>
                <Button variant="primary" onClick={activarCuantitativo} disabled={!puedeConfigurar}>
                  Activar inventario
                </Button>
              </section>
              {puedeConfigurarValorizacion && (
                <button type="button" onClick={iniciarValorizado} className="text-xs text-blue-600 hover:text-blue-800">
                  Prefiero calcular costos también (FIFO)
                </button>
              )}
            </>
          )}

          {primeraConfiguracion && modalidadElegida === 'valorizado' && (
            <>
              {reglasDocumento}
              {seccionesValorizacion}
            </>
          )}

          {yaConfigurado && (
            <>
              <section className="rounded-xl border border-gray-200 bg-white p-5 flex items-center justify-between flex-wrap gap-3">
                <div className={`flex items-center gap-2 text-sm ${estadoVisual === 'inactivo' ? 'text-gray-500' : 'text-green-700'}`}>
                  {estadoVisual === 'inactivo' ? <PauseCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span className="font-medium">{estadoVisual === 'inactivo' ? 'Inventario inactivo' : 'Inventario activo · Control de existencias'}</span>
                  {hayBorradorFIFO && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      Configuración de costos pendiente
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {estadoVisual === 'inactivo' && puedeConfigurar && (
                    <Button variant="primary" onClick={activarCuantitativo}>
                      Activar inventario
                    </Button>
                  )}
                  {estadoVisual === 'cuantitativo_activo' && !hayBorradorFIFO && puedeConfigurarValorizacion && (
                    <Button variant="secondary" icon={<Layers className="w-4 h-4" />} onClick={iniciarValorizado}>
                      Activar costeo FIFO
                    </Button>
                  )}
                  {estadoVisual === 'cuantitativo_activo' && !hayBorradorFIFO && puedeConfigurar && puedeDesactivarControlInventario(estadoValorizacion) && (
                    confirmandoDesactivar ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">¿Desactivar? El stock y la configuración se conservan.</span>
                        <Button variant="primary" className="!bg-red-600 hover:!bg-red-700" onClick={desactivarControl}>Confirmar</Button>
                        <Button variant="secondary" onClick={() => setConfirmandoDesactivar(false)}>Cancelar</Button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirmandoDesactivar(true)} className="text-xs text-red-500 hover:text-red-700">
                        Desactivar control de inventario
                      </button>
                    )
                  )}
                </div>
              </section>
              {reglasDocumento}
              {seccionesValorizacion}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
