import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConfigurationContext } from '../../contexto/ContextoConfiguracion';
import { OPCIONES_TRATAMIENTO_IMPUESTO } from './opcionesTratamientoImpuestoCompra';
import { useProductStore } from '../../../catalogo-articulos/hooks/useProductStore';
import { useFeedback } from '@/shared/feedback/useFeedback';
import { getTenantEmpresaId } from '@/shared/tenant';
import { useUserSession } from '@/contexts/UserSessionContext';
import { currencyManager } from '@/shared/currency';
import type { Almacen } from '../../modelos/Almacen';
import type { ValorizacionInicialInventario } from '../../../gestion-inventario/models/valorizacionInicialInventario.types';
import { obtenerLoteActivoPorEmpresa } from '../../../gestion-inventario/repositories/valorizacionInicialInventario.repository';
import type { DetalleValorizacionInicial } from '../../../gestion-inventario/models/valorizacionInicialInventario.types';
import {
  iniciarPreparacionValorizacion,
  confirmarCostoDetalle,
  recalcularDetalle,
  cancelarPreparacion,
  verificarCondicionesValidacion,
  validarYTransicionarAValidada,
  puedeReanudarOIniciarActivacion,
  verificarCondicionesActivacion,
  ejecutarActivacionValorizacion,
} from '../../../gestion-inventario/services/valorizacionInicial.service';
import { valorInicialInputCosto, parsearValorCosto, determinarEsManual } from './orquestacionConfirmacionCosto';

function claveDetalle(productoId: string, almacenId: string): string {
  return `${productoId}:${almacenId}`;
}

export default function SeccionValorizacionInventario() {
  const { state, dispatch } = useConfigurationContext();
  const { allProducts } = useProductStore();
  const feedback = useFeedback();
  const { session } = useUserSession();
  const usuario = session?.userName || 'Usuario';

  const estadoValorizacion = state.preferenciasInventario.estadoValorizacion;
  const tratamientoImpuestoCompra = state.preferenciasInventario.tratamientoImpuestoCompra;

  const almacenesMap = useMemo(() => new Map<string, Almacen>(state.almacenes.map((a) => [a.id, a])), [state.almacenes]);
  const empresaId = getTenantEmpresaId();

  const [lote, setLote] = useState<ValorizacionInicialInventario | undefined>(undefined);
  // Overrides locales del input de costo, por clave producto:almacén — SOLO para claves donde el
  // usuario ya escribió algo en esta sesión de edición. Cualquier clave ausente aquí cae al valor
  // inicial derivado del lote (`valorInicialInputCosto`), nunca a `undefined`/NaN. Se limpia la
  // entrada de una clave (nunca el mapa completo) al confirmar o recalcular ESE detalle — así una
  // edición en curso de OTRA fila nunca se pierde por una acción en una fila distinta. Se limpia
  // por completo únicamente cuando cambia el lote activo (id distinto — otra preparación).
  const [costosLocales, setCostosLocales] = useState<Record<string, string>>({});
  // Confirmación inline (nunca un modal/wizard nuevo) antes de activar — se reinicia cada vez que
  // cambia el lote activo, para que un lote distinto nunca herede una confirmación pendiente.
  const [confirmandoActivacion, setConfirmandoActivacion] = useState(false);
  const [activando, setActivando] = useState(false);
  const [errorActivacion, setErrorActivacion] = useState<string | undefined>(undefined);
  // Evita reintentar la reanudación automática en cada render — solo una vez por montaje real.
  const reanudacionAutomaticaIntentadaRef = useRef(false);
  // Re-entrancia real (revisión final Etapa 4B, §3): evita que un doble disparo síncrono del mismo
  // render (StrictMode invocando el efecto dos veces, o un clic manual mientras la reanudación
  // automática ya está en vuelo) invoque `ejecutarActivacionValorizacion` dos veces antes de que
  // `setActivando(true)` se refleje en un nuevo render. La idempotencia real la garantiza el
  // ledger; este ref solo evita una invocación redundante desde la UI.
  const activandoRef = useRef(false);

  useEffect(() => {
    setLote(obtenerLoteActivoPorEmpresa(empresaId));
  }, [empresaId, estadoValorizacion]);

  useEffect(() => {
    setCostosLocales({});
  }, [lote?.id]);

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

  const actualizarEstadoValorizacion = (nuevo: typeof estadoValorizacion) => {
    dispatch({
      type: 'SET_PREFERENCIAS_INVENTARIO',
      payload: { ...state.preferenciasInventario, estadoValorizacion: nuevo },
    });
  };

  const handleIniciar = () => {
    try {
      const resultado = iniciarPreparacionValorizacion(estadoValorizacion, {
        empresaId,
        usuario,
        productos: allProducts,
        almacenes: almacenesMap,
        generarId: () => crypto.randomUUID(),
        fechaActual: () => new Date().toISOString(),
      });
      actualizarEstadoValorizacion(resultado.estadoValorizacion);
      setLote(resultado.lote);
      feedback.success('Preparación de valorización iniciada.');
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : String(e));
    }
  };

  const handleConfirmarCosto = (detalle: DetalleValorizacionInicial) => {
    const clave = claveDetalle(detalle.productoId, detalle.almacenId);
    // Nunca depende de que `costosLocales[clave]` exista: aceptar la propuesta sin tocar el input
    // debe funcionar igual que confirmarla tras editarla.
    const valorTexto = obtenerValorInputCosto(detalle);
    const { valido, costo } = parsearValorCosto(valorTexto);
    if (!valido) {
      feedback.error('El costo debe ser un número mayor a cero.');
      return;
    }
    const esManual = determinarEsManual(detalle.costoPropuesto, costo);
    try {
      const loteActualizado = confirmarCostoDetalle(empresaId, detalle.productoId, detalle.almacenId, costo, new Date().toISOString(), esManual);
      setLote(loteActualizado);
      limpiarOverrideLocal(clave);
      feedback.success('Costo confirmado.');
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : String(e));
    }
  };

  const handleRecalcular = (productoId: string, almacenId: string) => {
    try {
      const loteActualizado = recalcularDetalle(empresaId, productoId, almacenId, allProducts, new Date().toISOString());
      setLote(loteActualizado);
      // El recálculo trae una propuesta NUEVA — cualquier valor que el usuario hubiera escrito
      // para esta fila queda obsoleto y exige una nueva confirmación explícita.
      limpiarOverrideLocal(claveDetalle(productoId, almacenId));
      feedback.success('Detalle recalculado — revisa y confirma el costo nuevamente.');
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : String(e));
    }
  };

  const handleCancelar = () => {
    try {
      const resultado = cancelarPreparacion(estadoValorizacion, empresaId);
      actualizarEstadoValorizacion(resultado.estadoValorizacion);
      setLote(resultado.lote);
      feedback.info('Preparación cancelada.');
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : String(e));
    }
  };

  const handleValidar = () => {
    try {
      const resultado = validarYTransicionarAValidada(estadoValorizacion, empresaId, tratamientoImpuestoCompra, allProducts, almacenesMap);
      actualizarEstadoValorizacion(resultado.estadoValorizacion);
      setLote(resultado.lote);
      feedback.success('Preparación validada.');
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : String(e));
    }
  };

  /**
   * Activación final (cierre Etapa 4B) — irreversible. `estadoValorizacion` pasa a `'activando'`
   * ANTES de la llamada asíncrona (bloquea toda mutación de inventario mientras se ejecuta, y deja
   * evidencia real para que una recarga a mitad de camino pueda reanudar). Reutiliza exactamente
   * `ejecutarActivacionValorizacion` — nunca reconstruye la lógica de activación aquí.
   *
   * Revisión final Etapa 4B (§3): usa `puedeReanudarOIniciarActivacion`, NO `puedeIniciarActivacion`
   * a solas — esta última rechaza `'activando'` (no está en su propio conjunto de transiciones
   * permitidas), lo que dejaba la reanudación automática y el botón manual "Reanudar activación"
   * completamente inoperantes cuando el estado ya era `'activando'` (recarga o reintento). El
   * guard `activandoRef` (además del estado `activando`, que solo controla el render) evita que un
   * doble disparo síncrono del mismo render (StrictMode, doble clic) invoque la función dos veces
   * antes de que el primer `setActivando(true)` se refleje.
   */
  const handleActivar = useCallback(async () => {
    if (activandoRef.current || !puedeReanudarOIniciarActivacion(estadoValorizacion)) {
      if (!puedeReanudarOIniciarActivacion(estadoValorizacion)) {
        feedback.error('La activación no está disponible desde el estado actual.');
      }
      return;
    }
    activandoRef.current = true;
    setActivando(true);
    setErrorActivacion(undefined);
    dispatch({ type: 'SET_PREFERENCIAS_INVENTARIO', payload: { ...state.preferenciasInventario, estadoValorizacion: 'activando' } });
    try {
      const resultado = await ejecutarActivacionValorizacion({
        empresaId,
        tratamientoImpuestoCompra,
        productos: allProducts,
        almacenes: almacenesMap,
        monedaBase: currencyManager.getSnapshot().baseCurrency.code,
        generarId: () => crypto.randomUUID(),
        fechaActual: () => new Date().toISOString(),
      });
      dispatch({ type: 'SET_PREFERENCIAS_INVENTARIO', payload: { ...state.preferenciasInventario, estadoValorizacion: resultado.estadoValorizacion } });
      setLote(resultado.lote);
      setConfirmandoActivacion(false);
      if (resultado.estadoValorizacion === 'activa') {
        feedback.success('Inventario valorizado activado.');
      } else {
        setErrorActivacion(resultado.error);
        feedback.error(resultado.error ?? 'La activación no pudo completarse — puede reintentarse.');
      }
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : String(e);
      dispatch({ type: 'SET_PREFERENCIAS_INVENTARIO', payload: { ...state.preferenciasInventario, estadoValorizacion: 'fallida_recuperable' } });
      setErrorActivacion(mensaje);
      feedback.error(mensaje);
    } finally {
      activandoRef.current = false;
      setActivando(false);
    }
  }, [estadoValorizacion, feedback, empresaId, tratamientoImpuestoCompra, allProducts, almacenesMap, dispatch, state.preferenciasInventario]);

  // Recarga durante 'activando' (cierre Etapa 4B, §7): la operación real (ledger de idempotencia +
  // unidad de trabajo) es la fuente de verdad, nunca este componente — reanuda automáticamente
  // llamando a la MISMA función, que resuelve 'nueva'/'repetida'/'reactivada'/'ambigua' por sí sola.
  useEffect(() => {
    if (estadoValorizacion === 'activando' && !reanudacionAutomaticaIntentadaRef.current) {
      reanudacionAutomaticaIntentadaRef.current = true;
      handleActivar();
    }
  }, [estadoValorizacion, handleActivar]);

  if (estadoValorizacion === 'no_iniciada' || estadoValorizacion === 'cancelada_antes_activacion') {
    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-500 leading-relaxed">
          Detecta el stock existente por producto y almacén, y prepara su costo inicial para cuando la valorización de inventario esté disponible.
          Esto NO activa la valorización todavía.
        </p>
        <button
          type="button"
          onClick={handleIniciar}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {estadoValorizacion === 'cancelada_antes_activacion' ? 'Reiniciar preparación' : 'Iniciar preparación'}
        </button>
      </div>
    );
  }

  if (estadoValorizacion === 'activa') {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-800">
          <p className="font-semibold">Inventario valorizado activo.</p>
          <p className="mt-1">
            Compras, ventas, ajustes, importaciones y transferencias operan en modo valorizado (costo por capas FIFO). Esta activación es irreversible.
          </p>
        </div>
      </div>
    );
  }

  if (estadoValorizacion === 'activando') {
    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800 flex items-center gap-2">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" aria-hidden="true" />
          Activando la valorización de inventario — no cierres ni recargues esta pantalla.
        </div>
        {/* Acción segura de respaldo (revisión final Etapa 4B, §3): la reanudación automática ya se
            intenta al montar (ver el efecto de abajo), pero esta acción visible cubre cualquier caso
            en que ese efecto no se haya disparado (p. ej. la pestaña estuvo en segundo plano). Nunca
            inicia una segunda activación — reutiliza `handleActivar`, cuya idempotencia real la
            garantiza el ledger de `ejecutarActivacionValorizacion`, nunca este botón. */}
        <button
          type="button"
          onClick={handleActivar}
          disabled={activando}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {activando ? 'Reanudando…' : 'Reanudar activación'}
        </button>
      </div>
    );
  }

  if (estadoValorizacion === 'fallida_recuperable') {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
          <p className="font-semibold">La activación no pudo completarse.</p>
          {errorActivacion && <p className="mt-1">{errorActivacion}</p>}
        </div>
        <button
          type="button"
          onClick={handleActivar}
          disabled={activando}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {activando ? 'Reintentando…' : 'Reintentar activación'}
        </button>
      </div>
    );
  }

  if (!lote) {
    return <p className="text-xs text-gray-500">No se encontró la preparación de valorización activa.</p>;
  }

  const detalles = lote.detalles;
  const pendientesCosto = detalles.filter((d) => !d.confirmado).length;
  const pendientesRecalculo = detalles.filter((d) => d.requiereRecalculo).length;
  const unidadesDetectadas = detalles.reduce((acc, d) => acc + d.cantidadDetectada, 0);
  const valorEstimado = detalles.reduce((acc, d) => acc + d.cantidadDetectada * (d.costoConfirmado ?? 0), 0);

  const motivosBloqueo = estadoValorizacion === 'pendiente_costos'
    ? verificarCondicionesValidacion(lote, tratamientoImpuestoCompra, allProducts, almacenesMap)
    : [];

  const bloqueantesActivacion = lote.estado === 'validada'
    ? verificarCondicionesActivacion(lote, tratamientoImpuestoCompra, allProducts, almacenesMap, currencyManager.getSnapshot().baseCurrency.code)
    : [];

  const estadoDetalle = (d: ValorizacionInicialInventario['detalles'][number]): string => {
    if (d.requiereRecalculo) return 'Stock modificado, requiere revisión';
    if (lote.estado === 'validada') return 'Validado';
    if (d.confirmado) return 'Confirmado';
    return 'Pendiente de costo';
  };

  return (
    <div className="space-y-4">
      {lote.estado === 'validada' && (
        <div className="space-y-3">
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-800">
            Preparación validada.
          </div>
          {bloqueantesActivacion.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">La activación todavía no está disponible:</p>
              <ul className="list-disc pl-4 text-[11px] text-amber-700 space-y-0.5">
                {bloqueantesActivacion.map((m) => <li key={m}>{m}</li>)}
              </ul>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 space-y-2">
              <p className="font-semibold">Activar la valorización de inventario es irreversible.</p>
              <p>
                A partir de la activación, Compras, Ventas, ajustes, importaciones y transferencias operarán en modo
                valorizado (costo por capas FIFO). No existe una acción para desactivar.
              </p>
              {!confirmandoActivacion ? (
                <button
                  type="button"
                  onClick={() => setConfirmandoActivacion(true)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Activar valorización
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleActivar}
                    disabled={activando}
                    className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {activando ? 'Activando…' : 'Confirmar activación (irreversible)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmandoActivacion(false)}
                    disabled={activando}
                    className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {lote.estado !== 'validada' && (
        <div className="rounded-lg border border-gray-200 p-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Tratamiento de impuestos de compra
          </label>
          <div className="space-y-2">
            {OPCIONES_TRATAMIENTO_IMPUESTO.map((opcion) => (
              <label key={opcion.valor} className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="tratamientoImpuestoCompra"
                  checked={tratamientoImpuestoCompra === opcion.valor}
                  onChange={() =>
                    dispatch({
                      type: 'SET_PREFERENCIAS_INVENTARIO',
                      payload: { ...state.preferenciasInventario, tratamientoImpuestoCompra: opcion.valor },
                    })
                  }
                  className="mt-0.5 w-3.5 h-3.5 accent-blue-600"
                />
                <span>
                  <span className="block text-xs font-medium text-gray-800">{opcion.label}</span>
                  <span className="block text-[11px] text-gray-500">{opcion.ayuda}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 p-2">
          <p className="text-gray-500">Detectados</p>
          <p className="font-semibold text-gray-800">{detalles.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-2">
          <p className="text-gray-500">Pendientes de costo</p>
          <p className="font-semibold text-gray-800">{pendientesCosto}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-2">
          <p className="text-gray-500">Requieren recálculo</p>
          <p className="font-semibold text-gray-800">{pendientesRecalculo}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-2">
          <p className="text-gray-500">Unidades / valor estimado</p>
          <p className="font-semibold text-gray-800">{unidadesDetectadas} / {valorEstimado.toFixed(2)}</p>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase tracking-wide">Producto</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase tracking-wide">Almacén</th>
              <th className="text-right px-3 py-2 font-medium text-gray-500 uppercase tracking-wide">Stock</th>
              <th className="text-right px-3 py-2 font-medium text-gray-500 uppercase tracking-wide">Costo propuesto</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase tracking-wide">Costo confirmado</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase tracking-wide">Estado</th>
              {lote.estado !== 'validada' && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {detalles.map((d) => {
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
                  <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                    {d.origenPropuesta === 'sin_propuesta' ? '—' : d.costoPropuesto.toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    {lote.estado === 'validada' ? (
                      <span className="tabular-nums text-gray-800">{d.costoConfirmado?.toFixed(2) ?? '—'}</span>
                    ) : (
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={obtenerValorInputCosto(d)}
                        onChange={(e) => setCostosLocales((prev) => ({ ...prev, [clave]: e.target.value }))}
                        className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{estadoDetalle(d)}</td>
                  {lote.estado !== 'validada' && (
                    <td className="px-3 py-2 whitespace-nowrap">
                      {d.requiereRecalculo ? (
                        <button
                          type="button"
                          onClick={() => handleRecalcular(d.productoId, d.almacenId)}
                          className="text-[11px] font-medium text-amber-600 hover:text-amber-800"
                        >
                          Recalcular
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConfirmarCosto(d)}
                          className="text-[11px] font-medium text-blue-600 hover:text-blue-800"
                        >
                          Confirmar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {detalles.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-gray-400">
                  No se detectó stock positivo para valorizar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {motivosBloqueo.length > 0 && (
        <ul className="list-disc pl-4 text-[11px] text-amber-700 space-y-0.5">
          {motivosBloqueo.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}

      <div className="flex items-center justify-between">
        <button type="button" onClick={handleCancelar} className="text-xs text-red-500 hover:text-red-700">
          Cancelar preparación
        </button>
        {lote.estado === 'pendiente_costos' && (
          <button
            type="button"
            onClick={handleValidar}
            disabled={motivosBloqueo.length > 0}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Validar preparación
          </button>
        )}
      </div>
    </div>
  );
}
