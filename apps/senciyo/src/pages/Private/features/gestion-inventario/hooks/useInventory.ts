// src/features/inventario/hooks/useInventory.ts

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import { useAuth } from '../../autenticacion/hooks';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { obtenerUsuarioDesdeSesion, tienePermiso } from '../../configuracion-sistema/utilidades/permisos';
import type {
  StockAlert,
  MovimientoStock,
  InventoryView,
  FilterPeriod,
  StockAdjustmentData,
  StockTransferData,
  MassStockUpdateData
} from '../models';
import type { Transferencia } from '../models/transferencia.types';
import { filterByPeriod, sortByDateDesc, inferirTransferenciasDesdeMovimientos } from '../utils/inventory.helpers';
import { InventoryService } from '../services/inventory.service';
import { ServicioKardexValorizado } from '../services/servicioKardexValorizado';
import { StockRepository, STOCK_MOVEMENTS_CHANGED_EVENT } from '../repositories/stock.repository';
import { TransferenciaRepository } from '../repositories/transferencia.repository';
import { generateTransferId } from '../utils/inventory.helpers';
import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { DatosOperacionEntradaCuantitativa, DatosOperacionSalidaCuantitativa } from '../models/operacionEntradaInventario.types';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import { useFeedback } from '../../../../../shared/feedback';
import { getTenantEmpresaId, tryGetTenantEmpresaId } from '../../../../../shared/tenant';
import { sincronizarInventarioTrasConfirmacion } from '../../../../../shared/inventory/accionesStock';
import {
  obtenerOperacionIdEstablePersistente as obtenerOperacionIdEstablePersistenteGenerico,
  limpiarSesionPendienteOperacion,
} from '../../../../../shared/inventory/sesionPendienteOperacionInventario';
import { serializarCanonicamente } from '../utils/serializacionCanonicaInventario';

type AdjustmentModalOptions = {
  almacenId?: string | null;
  mode?: 'manual' | 'prefilled';
};

const ESPACIO_AJUSTE_POSITIVO = 'ajuste_positivo';
const ESPACIO_AJUSTE_NEGATIVO = 'ajuste_negativo';

/** Huella canónica del contenido del ajuste — solo datos de negocio, nunca fechas técnicas ni IDs generados durante la ejecución. */
function construirHuellaAjuste(data: StockAdjustmentData): string {
  return serializarCanonicamente({
    productoId: data.productoId,
    almacenId: data.almacenId,
    cantidad: data.cantidad,
    motivo: data.motivo,
    observaciones: (data.observaciones ?? '').trim(),
    documentoReferencia: (data.documentoReferencia ?? '').trim(),
  });
}

/**
 * Devuelve el `operacionId` estable para el contenido del ajuste positivo dado (Etapa 1C/§2 de la
 * corrección final) — reutiliza la sesión pendiente genérica (Etapa 1D, §9), tenantizada y
 * persistida en `localStorage`: sobrevive a desmontaje/recarga, mismo contenido reutiliza el id,
 * contenido distinto genera uno nuevo.
 */
export function obtenerOperacionIdEstablePersistente(
  empresaId: string,
  data: StockAdjustmentData,
  generarId: () => string
): string {
  return obtenerOperacionIdEstablePersistenteGenerico(ESPACIO_AJUSTE_POSITIVO, empresaId, construirHuellaAjuste(data), generarId);
}

/** Se elimina tras un resultado 'nueva'/'repetida' o al cancelar explícitamente la acción — nunca ante un fallo incierto. */
export function limpiarSesionPendienteAjustePositivo(empresaId: string): void {
  limpiarSesionPendienteOperacion(ESPACIO_AJUSTE_POSITIVO, empresaId);
}

/** Análogo a `obtenerOperacionIdEstablePersistente`, para ajustes negativos (Etapa 1D, §20) — misma sesión pendiente genérica, espacio de nombres propio para no compartir ni pisar la sesión del ajuste positivo. */
export function obtenerOperacionIdEstablePersistenteAjusteNegativo(
  empresaId: string,
  data: StockAdjustmentData,
  generarId: () => string
): string {
  return obtenerOperacionIdEstablePersistenteGenerico(ESPACIO_AJUSTE_NEGATIVO, empresaId, construirHuellaAjuste(data), generarId);
}

export function limpiarSesionPendienteAjusteNegativo(empresaId: string): void {
  limpiarSesionPendienteOperacion(ESPACIO_AJUSTE_NEGATIVO, empresaId);
}

export interface ParametrosConstruirDatosAjuste {
  data: StockAdjustmentData;
  almacen: Almacen;
  empresaId: string;
  usuario: string;
  operacionId: string;
  fecha: string;
}

/**
 * Construye el DTO real de un ajuste positivo (§1/§4 de la corrección final de Etapa 1C) — la
 * misma función que usa la ruta productiva de `handleStockAdjustment`, para que las pruebas
 * cubran el flujo real de construcción de datos y no solo una clave fabricada a mano.
 * `documentoId`, `lineaId` y `claveIdempotencia` se derivan todos del mismo `operacionId` estable.
 */
export function construirDatosAjustePositivo(
  params: ParametrosConstruirDatosAjuste
): DatosOperacionEntradaCuantitativa {
  const { data, almacen, empresaId, usuario, operacionId, fecha } = params;
  return {
    modoOperacion: 'cuantitativo',
    empresaId,
    documentoId: operacionId,
    tipoDocumento: 'ajuste',
    tipoOperacion: 'ajuste_positivo',
    claveIdempotencia: `ajuste_positivo:${operacionId}`,
    usuario,
    fecha,
    motivo: data.motivo,
    observaciones: data.observaciones,
    documentoReferencia: data.documentoReferencia,
    lineas: [{
      lineaId: operacionId,
      productoId: data.productoId,
      almacenId: almacen.id,
      cantidadUnidadMinima: data.cantidad,
    }],
  };
}

/** Análogo a `construirDatosAjustePositivo`, para el motor de SALIDAS (Etapa 1D, §20). */
export function construirDatosAjusteNegativo(
  params: ParametrosConstruirDatosAjuste
): DatosOperacionSalidaCuantitativa {
  const { data, almacen, empresaId, usuario, operacionId, fecha } = params;
  return {
    modoOperacion: 'cuantitativo',
    empresaId,
    documentoId: operacionId,
    tipoDocumento: 'ajuste',
    tipoOperacion: 'ajuste_negativo',
    claveIdempotencia: `ajuste_negativo:${operacionId}`,
    usuario,
    fecha,
    motivo: data.motivo,
    observaciones: data.observaciones,
    documentoReferencia: data.documentoReferencia,
    lineas: [{
      lineaId: operacionId,
      productoId: data.productoId,
      almacenId: almacen.id,
      cantidadUnidadMinima: data.cantidad,
    }],
  };
}

/** Sincroniza stockPorEstablecimiento para los establecimientos afectados */
function syncEstablecimientoStock(
  product: Product,
  affectedEstIds: string[],
  almacenes: Almacen[]
): Product {
  // BRECHA-03: inicializar el mapa si es null/undefined en lugar de saltar silenciosamente
  const nextStockPorEst = { ...(product.stockPorEstablecimiento ?? {}) };
  affectedEstIds.forEach(estId => {
    if (!estId) return;
    nextStockPorEst[estId] = almacenes
      .filter(a => a.establecimientoId === estId)
      .reduce((sum, a) => sum + (product.stockPorAlmacen?.[a.id] ?? 0), 0);
  });
  return { ...product, stockPorEstablecimiento: nextStockPorEst };
}

/**
 * Hook personalizado para gestión de inventario
 * Centraliza toda la lógica de negocio relacionada con stock
 */
export const useInventory = () => {
  const { user } = useAuth();
  const { allProducts, updateProduct } = useProductStore();
  const { session } = useUserSession();
  const { state: configState, rolesConfigurados } = useConfigurationContext();
  const establecimientoId = session?.currentEstablecimientoId;
  const usuarioActual = useMemo(() => obtenerUsuarioDesdeSesion(configState.users, session), [configState.users, session]);

  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);

  const [selectedView, setSelectedView] = useState<InventoryView>('situacion');
  const [filterPeriodo, setFilterPeriodo] = useState<FilterPeriod>('semana');
  const [almacenFiltro, setalmacenFiltro] = useState<string>('todos');
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [suggestedQuantity, setSuggestedQuantity] = useState<number>(0);
  const [prefilledAlmacenId, setPrefilledAlmacenId] = useState<string | null>(null);
  const [adjustmentMode, setAdjustmentMode] = useState<'manual' | 'prefilled'>('manual');

  // Cargar transferencias una sola vez al montar
  useEffect(() => {
    setTransferencias(TransferenciaRepository.getAll());
  }, []);

  // Cargar movimientos al montar y re-sincronizar cada vez que cualquier módulo
  // (ventas, NC, anulaciones, ajustes, transferencias) escriba en StockRepository.
  useEffect(() => {
    const recargar = () => setMovimientos(StockRepository.getMovements());
    recargar();
    window.addEventListener(STOCK_MOVEMENTS_CHANGED_EVENT, recargar);
    return () => window.removeEventListener(STOCK_MOVEMENTS_CHANGED_EVENT, recargar);
  }, []);

  const almacenesActivos = useMemo(
    () => configState.almacenes.filter(almacen => almacen.estaActivoAlmacen),
    [configState.almacenes]
  );

  const usuarioNombre = session?.userName || user?.nombre || 'Usuario';

  /**
   * Permiso pre-calculado para el establecimiento activo.
   * Se pasa al panel de transferencias para controlar visibilidad de acciones.
   */
  const puedeTransferir = useMemo(
    () => tienePermiso({
      usuario: usuarioActual,
      permisoId: 'inventario.transferir',
      rolesDisponibles: rolesConfigurados,
      establecimientoId,
    }),
    [usuarioActual, rolesConfigurados, establecimientoId]
  );

  /**
   * Transferencias del repositorio + legacy inferidas desde movimientos,
   * filtradas al establecimiento activo (origen o destino).
   * Si no hay establecimiento activo, se devuelve vacío para evitar leakage.
   */
  const todasTransferencias = useMemo<Transferencia[]>(() => {
    const idsEnRepositorio = new Set(transferencias.map(t => t.id));
    const legacy = inferirTransferenciasDesdeMovimientos(movimientos, idsEnRepositorio);
    const combined = [...transferencias, ...legacy].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
    if (!establecimientoId) return [];
    return combined.filter(
      t => t.establecimientoOrigenId === establecimientoId ||
           t.establecimientoDestinoId === establecimientoId
    );
  }, [transferencias, movimientos, establecimientoId]);

  const stockAlerts = useMemo<StockAlert[]>(() => {
    const alerts = InventoryService.generateAlerts(allProducts, almacenesActivos);
    if (almacenFiltro && almacenFiltro !== 'todos') {
      return alerts.filter(alert => alert.almacenId === almacenFiltro);
    }
    return alerts;
  }, [allProducts, almacenesActivos, almacenFiltro]);

  const filteredMovements = useMemo<MovimientoStock[]>(() => {
    let filtered = filterByPeriod(movimientos, filterPeriodo);
    if (almacenFiltro !== 'todos') {
      filtered = filtered.filter(
        mov => mov.almacenId === almacenFiltro ||
               mov.almacenOrigenId === almacenFiltro ||
               mov.almacenDestinoId === almacenFiltro
      );
    }
    return sortByDateDesc(filtered);
  }, [movimientos, filterPeriodo, almacenFiltro]);

  const { success, error, warning } = useFeedback();

  const handleStockAdjustment = useCallback(async (data: StockAdjustmentData) => {
    try {
      if (!tienePermiso({
        usuario: usuarioActual,
        permisoId: 'inventario.ajustar',
        rolesDisponibles: rolesConfigurados,
        establecimientoId,
      })) {
        warning('Sin permiso', 'No tienes permisos para ajustar inventario.');
        return;
      }

      const product = allProducts.find(p => p.id === data.productoId);
      const almacen = almacenesActivos.find(almacen => almacen.id === data.almacenId);

      if (!product || !almacen) {
        warning('Producto o almacén no encontrado', 'Advertencia');
        return;
      }

      // Ajustes positivos (Etapa 1C): motor de entradas cuantitativas (reserva idempotente +
      // preparación pura + unidad de trabajo recuperable). El resto de tipos (incluyendo
      // AJUSTE_NEGATIVO) permanece en el flujo previo hasta la Etapa 1D.
      if (data.tipo === 'AJUSTE_POSITIVO') {
        const empresaId = getTenantEmpresaId();
        // operacionId estable persistido (corrección final, §2): sobrevive a un desmontaje/recarga
        // de la pantalla — un reintento con el MISMO contenido reutiliza el mismo id; un contenido
        // distinto (acción realmente distinta) genera uno nuevo.
        const operacionId = obtenerOperacionIdEstablePersistente(empresaId, data, () => crypto.randomUUID());
        const almacenesMap = new Map(almacenesActivos.map(a => [a.id, a]));
        const datos = construirDatosAjustePositivo({
          data,
          almacen,
          empresaId,
          usuario: usuarioNombre,
          operacionId,
          fecha: new Date().toISOString(),
        });

        const resultado = await ServicioKardexValorizado.registrarEntradaValorizada(datos, {
          almacenes: almacenesMap,
          generarId: () => crypto.randomUUID(),
          fechaActual: () => new Date().toISOString(),
        });

        // La unidad de trabajo (Etapa 1B) ya escribió productos y movimientos — nunca se vuelve a
        // persistir aquí (nada de updateProduct). Solo se rehidrata el store y se refresca el Kardex.
        sincronizarInventarioTrasConfirmacion();
        // Éxito ('nueva' o 'repetida'): se limpia la sesión pendiente — la próxima acción parte de un id nuevo.
        limpiarSesionPendienteAjustePositivo(empresaId);

        const cantidadNueva = resultado.movimientos[0]?.cantidadNueva ?? InventoryService.getStock(product, almacen.id);
        success(`${data.tipo}: ${data.cantidad} u · Nuevo stock: ${cantidadNueva}`, 'Ajuste registrado');
        setShowAdjustmentModal(false);
        return;
      }

      // Ajustes negativos (Etapa 1D, §20): motor de salidas cuantitativas (reserva idempotente +
      // preparación pura + unidad de trabajo recuperable). No toca reservas de OV. El resto de
      // tipos (ENTRADA, SALIDA, DEVOLUCION, MERMA) permanece en el flujo previo — fuera del
      // alcance de esta migración.
      if (data.tipo === 'AJUSTE_NEGATIVO') {
        const empresaId = getTenantEmpresaId();
        const operacionId = obtenerOperacionIdEstablePersistenteAjusteNegativo(empresaId, data, () => crypto.randomUUID());
        const almacenesMap = new Map(almacenesActivos.map(a => [a.id, a]));
        const datos = construirDatosAjusteNegativo({
          data,
          almacen,
          empresaId,
          usuario: usuarioNombre,
          operacionId,
          fecha: new Date().toISOString(),
        });

        const resultado = await ServicioKardexValorizado.registrarSalidaValorizada(datos, {
          almacenes: almacenesMap,
          generarId: () => crypto.randomUUID(),
          fechaActual: () => new Date().toISOString(),
        });

        // La unidad de trabajo (Etapa 1B) ya escribió productos y movimientos — nunca se vuelve a
        // persistir aquí (nada de updateProduct, ni registerAdjustment). Solo se rehidrata el
        // store y se refresca el Kardex.
        sincronizarInventarioTrasConfirmacion();
        limpiarSesionPendienteAjusteNegativo(empresaId);

        const cantidadNueva = resultado.movimientos[0]?.cantidadNueva ?? InventoryService.getStock(product, almacen.id);
        success(`${data.tipo}: ${data.cantidad} u · Nuevo stock: ${cantidadNueva}`, 'Ajuste registrado');
        setShowAdjustmentModal(false);
        return;
      }

      const result = InventoryService.registerAdjustment(
        product,
        almacen,
        data,
        usuarioNombre
      );

      const finalProduct = InventoryService.recalcularTotalesStock(result.product, almacenesActivos);
      updateProduct(finalProduct.id, finalProduct);
      // No llamar setMovimientos aquí: StockRepository.addMovement ya disparó
      // STOCK_MOVEMENTS_CHANGED_EVENT, el listener del useEffect lo recarga.
      // Llamarlo aquí duplicaría el movimiento en el estado local.
      success(`${data.tipo}: ${data.cantidad} u · Nuevo stock: ${result.movement.cantidadNueva}`, 'Ajuste registrado');
      setShowAdjustmentModal(false);
    } catch (err) {
      console.error('Error al registrar ajuste:', err);
      error(err instanceof Error ? err.message : 'No se pudo registrar el ajuste', 'Error');
    }
  }, [allProducts, almacenesActivos, establecimientoId, rolesConfigurados, updateProduct, usuarioNombre, success, error, warning, usuarioActual]);

  /**
   * Crea una nueva transferencia.
   * Intra-establecimiento: mueve stock inmediatamente → CONFIRMADA.
   * Inter-establecimiento: crea entidad → PENDIENTE (sin mover stock).
   */
  const handleCreateTransfer = useCallback((data: StockTransferData) => {
    try {
      if (!tienePermiso({
        usuario: usuarioActual,
        permisoId: 'inventario.transferir',
        rolesDisponibles: rolesConfigurados,
        establecimientoId,
      })) {
        warning('Sin permiso', 'No tienes permisos para transferir inventario.');
        return;
      }

      const product = allProducts.find(p => p.id === data.productoId);
      const almacenOrigen = almacenesActivos.find(a => a.id === data.almacenOrigenId);
      const almacenDestino = almacenesActivos.find(a => a.id === data.almacenDestinoId);

      if (!product || !almacenOrigen || !almacenDestino) {
        warning('Producto o almacenes no encontrados', 'Advertencia');
        return;
      }

      // El almacén origen debe pertenecer al establecimiento activo
      if (establecimientoId && almacenOrigen.establecimientoId !== establecimientoId) {
        warning('El almacén origen debe pertenecer al establecimiento activo.', 'Establecimiento incorrecto');
        return;
      }

      const esIntra = almacenOrigen.establecimientoId === almacenDestino.establecimientoId;
      const tipoTransferencia = esIntra ? 'INTRA_ESTABLECIMIENTO' as const : 'INTER_ESTABLECIMIENTO' as const;

      if (esIntra) {
        // Movimiento inmediato
        const result = InventoryService.registerTransfer(
          product,
          almacenOrigen,
          almacenDestino,
          data,
          usuarioNombre
        );

        let finalProduct = result.product;
        finalProduct = syncEstablecimientoStock(
          finalProduct,
          [almacenOrigen.establecimientoId, almacenDestino.establecimientoId].filter(Boolean),
          almacenesActivos
        );

        updateProduct(finalProduct.id, finalProduct);
        setMovimientos(prev => [...result.movements, ...prev]);

        const trfId = result.movements[0].transferenciaId ?? generateTransferId();
        const entidad: Transferencia = {
          id: trfId,
          fecha: new Date(),
          productoId: product.id,
          productoCodigo: product.codigo,
          productoNombre: product.nombre,
          almacenOrigenId: almacenOrigen.id,
          almacenOrigenNombre: almacenOrigen.nombreAlmacen,
          establecimientoOrigenId: almacenOrigen.establecimientoId,
          establecimientoOrigenNombre: almacenOrigen.nombreEstablecimientoDesnormalizado || '',
          almacenDestinoId: almacenDestino.id,
          almacenDestinoNombre: almacenDestino.nombreAlmacen,
          establecimientoDestinoId: almacenDestino.establecimientoId,
          establecimientoDestinoNombre: almacenDestino.nombreEstablecimientoDesnormalizado || '',
          cantidad: data.cantidad,
          tipoTransferencia,
          estado: 'CONFIRMADA',
          documentoReferencia: data.documentoReferencia,
          observaciones: data.observaciones,
          usuario: usuarioNombre,
          movimientoSalidaId: result.movements[0].id,
          movimientoEntradaId: result.movements[1].id,
        };
        TransferenciaRepository.upsert(entidad);
        setTransferencias(prev => [entidad, ...prev]);

        success(
          `${data.cantidad} u · ${almacenOrigen.nombreAlmacen} → ${almacenDestino.nombreAlmacen}`,
          'Transferencia confirmada'
        );
      } else {
        // Inter-establecimiento: solo registrar como PENDIENTE

        // BRECHA-01: si el usuario confirmó habilitar el producto en el establecimiento destino
        if (data.habilitarProductoEnDestino && !product.disponibleEnTodos && almacenDestino.establecimientoId) {
          const destEstId = almacenDestino.establecimientoId;
          const idsActuales = product.establecimientoIds ?? [];
          if (!idsActuales.includes(destEstId)) {
            const productHabilitado: Product = {
              ...product,
              establecimientoIds: [...idsActuales, destEstId],
              stockPorEstablecimiento: {
                ...(product.stockPorEstablecimiento ?? {}),
                [destEstId]: product.stockPorEstablecimiento?.[destEstId] ?? 0,
              },
              fechaActualizacion: new Date(),
            };
            updateProduct(productHabilitado.id, productHabilitado);
          }
        }

        const trfId = generateTransferId();
        const entidad: Transferencia = {
          id: trfId,
          fecha: new Date(),
          productoId: product.id,
          productoCodigo: product.codigo,
          productoNombre: product.nombre,
          almacenOrigenId: almacenOrigen.id,
          almacenOrigenNombre: almacenOrigen.nombreAlmacen,
          establecimientoOrigenId: almacenOrigen.establecimientoId,
          establecimientoOrigenNombre: almacenOrigen.nombreEstablecimientoDesnormalizado || '',
          almacenDestinoId: almacenDestino.id,
          almacenDestinoNombre: almacenDestino.nombreAlmacen,
          establecimientoDestinoId: almacenDestino.establecimientoId,
          establecimientoDestinoNombre: almacenDestino.nombreEstablecimientoDesnormalizado || '',
          cantidad: data.cantidad,
          tipoTransferencia,
          estado: 'PENDIENTE',
          documentoReferencia: data.documentoReferencia,
          observaciones: data.observaciones,
          usuario: usuarioNombre,
        };
        TransferenciaRepository.upsert(entidad);
        setTransferencias(prev => [entidad, ...prev]);
        success(
          `${trfId} creada · Pendiente de despacho`,
          'Transferencia registrada'
        );
      }

      setShowTransferModal(false);
    } catch (err) {
      console.error('Error al crear transferencia:', err);
      error(err instanceof Error ? err.message : 'No se pudo crear la transferencia', 'Error');
    }
  }, [allProducts, almacenesActivos, establecimientoId, rolesConfigurados, updateProduct, usuarioNombre, success, error, warning, usuarioActual]);

  /** Despacha una transferencia inter-establecimiento (PENDIENTE → EN_TRANSITO) */
  const handleDespacharTransfer = useCallback((transferenciaId: string) => {
    try {
      const transferencia = TransferenciaRepository.getById(transferenciaId);
      if (!transferencia || transferencia.estado !== 'PENDIENTE') {
        warning('Operación no válida', 'La transferencia no está en estado Pendiente.');
        return;
      }

      if (!tienePermiso({ usuario: usuarioActual, permisoId: 'inventario.transferir', rolesDisponibles: rolesConfigurados, establecimientoId })) {
        warning('No tienes permiso para despachar transferencias.', 'Sin permiso');
        return;
      }

      if (transferencia.establecimientoOrigenId !== establecimientoId) {
        warning('Solo el establecimiento origen puede despachar.', 'Establecimiento incorrecto');
        return;
      }

      const product = allProducts.find(p => p.id === transferencia.productoId);
      const almacenOrigen = almacenesActivos.find(a => a.id === transferencia.almacenOrigenId);

      if (!product || !almacenOrigen) {
        warning('Producto o almacén no encontrado', 'Advertencia');
        return;
      }

      const result = InventoryService.registerTransferSalida(
        product,
        almacenOrigen,
        transferencia,
        usuarioNombre
      );

      const finalProduct = syncEstablecimientoStock(
        result.product,
        [almacenOrigen.establecimientoId].filter(Boolean),
        almacenesActivos
      );
      updateProduct(finalProduct.id, finalProduct);
      setMovimientos(prev => [result.movement, ...prev]);

      const updated: Transferencia = {
        ...transferencia,
        estado: 'EN_TRANSITO',
        fechaDespacho: new Date(),
        movimientoSalidaId: result.movement.id,
      };
      TransferenciaRepository.upsert(updated);
      setTransferencias(prev => prev.map(t => t.id === transferenciaId ? updated : t));

      success(`${transferenciaId} despachada · En tránsito`, 'Transferencia despachada');
    } catch (err) {
      console.error('Error al despachar transferencia:', err);
      error(err instanceof Error ? err.message : 'No se pudo despachar la transferencia', 'Error');
    }
  }, [allProducts, almacenesActivos, establecimientoId, rolesConfigurados, usuarioActual, updateProduct, usuarioNombre, success, error, warning]);

  /** Confirma la recepción de una transferencia (EN_TRANSITO → RECIBIDA) */
  const handleRecibirTransfer = useCallback((transferenciaId: string) => {
    try {
      const transferencia = TransferenciaRepository.getById(transferenciaId);
      if (!transferencia || transferencia.estado !== 'EN_TRANSITO') {
        warning('Operación no válida', 'La transferencia no está en tránsito.');
        return;
      }

      if (!tienePermiso({ usuario: usuarioActual, permisoId: 'inventario.transferir', rolesDisponibles: rolesConfigurados, establecimientoId })) {
        warning('No tienes permiso para confirmar recepción.', 'Sin permiso');
        return;
      }

      if (transferencia.establecimientoDestinoId !== establecimientoId) {
        warning('Solo el establecimiento destino puede confirmar la recepción.', 'Establecimiento incorrecto');
        return;
      }

      const product = allProducts.find(p => p.id === transferencia.productoId);
      const almacenDestino = almacenesActivos.find(a => a.id === transferencia.almacenDestinoId);

      if (!product || !almacenDestino) {
        warning('Producto o almacén no encontrado', 'Advertencia');
        return;
      }

      const result = InventoryService.registerTransferEntrada(
        product,
        almacenDestino,
        transferencia,
        usuarioNombre
      );

      const finalProduct = syncEstablecimientoStock(
        result.product,
        [almacenDestino.establecimientoId].filter(Boolean),
        almacenesActivos
      );
      updateProduct(finalProduct.id, finalProduct);
      setMovimientos(prev => [result.movement, ...prev]);

      const updated: Transferencia = {
        ...transferencia,
        estado: 'RECIBIDA',
        fechaRecepcion: new Date(),
        movimientoEntradaId: result.movement.id,
      };
      TransferenciaRepository.upsert(updated);
      setTransferencias(prev => prev.map(t => t.id === transferenciaId ? updated : t));

      success(`${transferenciaId} recibida`, 'Recepción confirmada');
    } catch (err) {
      console.error('Error al recibir transferencia:', err);
      error(err instanceof Error ? err.message : 'No se pudo confirmar la recepción', 'Error');
    }
  }, [allProducts, almacenesActivos, establecimientoId, rolesConfigurados, usuarioActual, updateProduct, usuarioNombre, success, error, warning]);

  /** Cancela una transferencia PENDIENTE sin mover stock */
  const handleCancelarTransfer = useCallback((transferenciaId: string) => {
    try {
      const transferencia = TransferenciaRepository.getById(transferenciaId);
      if (!transferencia || transferencia.estado !== 'PENDIENTE') {
        warning('Operación no válida', 'Solo se pueden cancelar transferencias Pendientes.');
        return;
      }

      if (!tienePermiso({ usuario: usuarioActual, permisoId: 'inventario.transferir', rolesDisponibles: rolesConfigurados, establecimientoId })) {
        warning('No tienes permiso para cancelar transferencias.', 'Sin permiso');
        return;
      }

      if (transferencia.establecimientoOrigenId !== establecimientoId) {
        warning('Solo el establecimiento origen puede cancelar una transferencia pendiente.', 'Establecimiento incorrecto');
        return;
      }

      const updated: Transferencia = { ...transferencia, estado: 'CANCELADA' };
      TransferenciaRepository.upsert(updated);
      setTransferencias(prev => prev.map(t => t.id === transferenciaId ? updated : t));

      success(`${transferenciaId} cancelada`, 'Transferencia cancelada');
    } catch (err) {
      console.error('Error al cancelar transferencia:', err);
      error(err instanceof Error ? err.message : 'No se pudo cancelar la transferencia', 'Error');
    }
  }, [establecimientoId, rolesConfigurados, usuarioActual, success, error, warning]);

  /**
   * Anula una transferencia generando movimientos inversos.
   * Usa 'inventario.transferir' como guardia de permiso (no existe permiso específico de anulación aún).
   * El establecimiento activo debe ser origen o destino para poder anular.
   */
  const handleAnularTransfer = useCallback((transferenciaId: string) => {
    try {
      const transferencia = TransferenciaRepository.getById(transferenciaId);
      if (!transferencia) {
        warning('Transferencia no encontrada', 'Advertencia');
        return;
      }
      const estadosAnulables = ['CONFIRMADA', 'RECIBIDA', 'EN_TRANSITO'] as const;
      if (!estadosAnulables.includes(transferencia.estado as typeof estadosAnulables[number])) {
        warning('Operación no válida', 'Esta transferencia no puede anularse.');
        return;
      }

      if (!tienePermiso({ usuario: usuarioActual, permisoId: 'inventario.transferir', rolesDisponibles: rolesConfigurados, establecimientoId })) {
        warning('No tienes permiso para anular esta transferencia.', 'Sin permiso');
        return;
      }

      const esOrigen = transferencia.establecimientoOrigenId === establecimientoId;
      const esDestino = transferencia.establecimientoDestinoId === establecimientoId;
      if (!esOrigen && !esDestino) {
        warning('Solo los establecimientos involucrados pueden anular esta transferencia.', 'Establecimiento incorrecto');
        return;
      }

      const product = allProducts.find(p => p.id === transferencia.productoId);
      const almacenOrigen = almacenesActivos.find(a => a.id === transferencia.almacenOrigenId);
      const almacenDestino = almacenesActivos.find(a => a.id === transferencia.almacenDestinoId);

      if (!product || !almacenOrigen || !almacenDestino) {
        warning('Producto o almacenes no encontrados', 'Advertencia');
        return;
      }

      const result = InventoryService.registerTransferAnulacion(
        product,
        almacenOrigen,
        almacenDestino,
        transferencia,
        usuarioNombre
      );

      const finalProduct = syncEstablecimientoStock(
        result.product,
        [almacenOrigen.establecimientoId, almacenDestino.establecimientoId].filter(Boolean),
        almacenesActivos
      );
      updateProduct(finalProduct.id, finalProduct);
      setMovimientos(prev => [...result.movements, ...prev]);

      const updated: Transferencia = {
        ...transferencia,
        estado: 'ANULADA',
        fechaAnulacion: new Date(),
      };
      TransferenciaRepository.upsert(updated);
      setTransferencias(prev => prev.map(t => t.id === transferenciaId ? updated : t));

      success(`${transferenciaId} anulada · Stock restituido`, 'Transferencia anulada');
    } catch (err) {
      console.error('Error al anular transferencia:', err);
      error(err instanceof Error ? err.message : 'No se pudo anular la transferencia', 'Error');
    }
  }, [allProducts, almacenesActivos, establecimientoId, rolesConfigurados, usuarioActual, updateProduct, usuarioNombre, success, error, warning]);

  const handleMassStockUpdate = useCallback((data: MassStockUpdateData) => {
    try {
      if (!tienePermiso({
        usuario: usuarioActual,
        permisoId: 'inventario.actualizacion_masiva',
        rolesDisponibles: rolesConfigurados,
        establecimientoId,
      })) {
        warning('Sin permiso', 'No tienes permisos para actualizacion masiva de inventario.');
        return;
      }

      const result = InventoryService.processMassUpdate(
        allProducts,
        almacenesActivos,
        data,
        usuarioNombre
      );

      result.updatedProducts.forEach(product => {
        updateProduct(product.id, product);
      });
      setMovimientos(prev => [...result.movements, ...prev]);
      success(`${result.movements.length} movimientos registrados`, 'Actualización masiva completada');
    } catch (err) {
      console.error('Error en actualización masiva:', err);
      error(err instanceof Error ? err.message : 'No se pudo completar la actualización masiva', 'Error');
    }
  }, [allProducts, almacenesActivos, establecimientoId, rolesConfigurados, updateProduct, usuarioNombre, success, error, warning, usuarioActual]);

  const openAdjustmentModal = useCallback((
    productId: string,
    suggestedQty: number = 0,
    options?: AdjustmentModalOptions
  ) => {
    // No se reinicia la sesión pendiente aquí: si el usuario reabre el modal para retomar la
    // misma acción (mismo contenido) tras un desmontaje/recarga, debe reutilizar el mismo
    // operacionId. Un contenido genuinamente distinto ya obtiene un id nuevo por huella (§2).
    setSelectedProductId(productId || null);
    setSuggestedQuantity(suggestedQty);
    setPrefilledAlmacenId(options?.almacenId ?? null);
    setAdjustmentMode(options?.mode ?? (productId ? 'prefilled' : 'manual'));
    setShowAdjustmentModal(true);
  }, []);

  /** Cancelación explícita del modal de ajuste (§2/§20): limpia la sesión pendiente del ajuste positivo Y del negativo — no se sabe cuál estaba en curso, y limpiar la que no aplica es inofensivo (no existe). */
  const closeAdjustmentModal = useCallback(() => {
    const empresaId = tryGetTenantEmpresaId();
    if (empresaId) {
      limpiarSesionPendienteAjustePositivo(empresaId);
      limpiarSesionPendienteAjusteNegativo(empresaId);
    }
    setShowAdjustmentModal(false);
  }, []);

  const openTransferModal = useCallback(() => {
    setShowTransferModal(true);
  }, []);

  const reloadMovements = useCallback(() => {
    setMovimientos(StockRepository.getMovements());
  }, []);

  return {
    selectedView,
    filterPeriodo,
    almacenFiltro,
    showAdjustmentModal,
    showTransferModal,
    selectedProductId,
    suggestedQuantity,
    prefilledAlmacenId,
    adjustmentMode,
    almacenesActivos,
    almacenes: almacenesActivos,
    stockAlerts,
    filteredMovements,
    transferencias: todasTransferencias,
    establecimientoActualId: establecimientoId ?? '',
    puedeTransferir,

    setSelectedView,
    setFilterPeriodo,
    setalmacenFiltro,
    setShowAdjustmentModal,
    setShowTransferModal,

    handleStockAdjustment,
    handleCreateTransfer,
    handleDespacharTransfer,
    handleRecibirTransfer,
    handleCancelarTransfer,
    handleAnularTransfer,
    handleMassStockUpdate,
    openAdjustmentModal,
    closeAdjustmentModal,
    openTransferModal,
    reloadMovements,
  };
};
