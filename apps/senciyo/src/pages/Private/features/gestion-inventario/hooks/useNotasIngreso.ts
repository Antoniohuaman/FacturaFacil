// src/features/gestion-inventario/hooks/useNotasIngreso.ts

import { useState, useCallback, useEffect } from 'react';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import { useAuth } from '../../autenticacion/hooks';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import { useFeedback } from '../../../../../shared/feedback';
import { getTenantEmpresaId } from '../../../../../shared/tenant';
import { sincronizarInventarioTrasConfirmacion } from '../../../../../shared/inventory/accionesStock';
import { currencyManager } from '@/shared/currency';
import {
  cargarNotasIngreso,
  guardarNotasIngreso,
  agregarOActualizarNI,
  NOTAS_INGRESO_CHANGED_EVENT,
} from '../repositories/notaIngreso.repository';
import {
  generarNIEnInventario,
  anularNIEnInventario,
} from '../services/notaIngreso.service';
import type { NotaIngreso } from '../models/notaIngreso.types';
import { useComprasOpcional } from '../../compras/contexto/ContextoCompras';

export const useNotasIngreso = () => {
  const { user } = useAuth();
  const { allProducts } = useProductStore();
  const { session } = useUserSession();
  const { state: configState } = useConfigurationContext();
  const feedback = useFeedback();
  const comprasOpcional = useComprasOpcional();

  const usuarioNombre = session?.userName ?? user?.nombre ?? 'Usuario';
  const usuarioId = session?.userId ?? '';

  const [notas, setNotas] = useState<NotaIngreso[]>(() => cargarNotasIngreso(getTenantEmpresaId()));
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    const recargar = () => setNotas(cargarNotasIngreso(getTenantEmpresaId()));
    window.addEventListener(NOTAS_INGRESO_CHANGED_EVENT, recargar);
    return () => window.removeEventListener(NOTAS_INGRESO_CHANGED_EVENT, recargar);
  }, []);

  const guardarBorrador = useCallback(
    (nota: NotaIngreso, opciones?: { silencioso?: boolean }): boolean => {
      try {
        const ahora = new Date().toISOString();
        const borrador: NotaIngreso = {
          ...nota,
          estado: 'Borrador',
          esBorrador: true,
          fechaActualizacion: ahora,
          historial: !opciones?.silencioso && nota.historial.length === 0
            ? [{ fecha: ahora, usuario: usuarioNombre, accion: 'Borrador guardado' }]
            : nota.historial,
        };
        agregarOActualizarNI(borrador, getTenantEmpresaId());
        if (!opciones?.silencioso) {
          feedback.success('Borrador guardado correctamente.');
        }
        return true;
      } catch (err) {
        if (!opciones?.silencioso) {
          const msg = err instanceof Error ? err.message : 'No se pudo guardar el borrador.';
          feedback.error(msg);
        }
        return false;
      }
    },
    [usuarioNombre, feedback],
  );

  const generarNI = useCallback(
    async (notaId: string): Promise<boolean> => {
      if (procesando) return false;
      setProcesando(true);
      try {
        const empresaId = getTenantEmpresaId();
        const notasActuales = cargarNotasIngreso(empresaId);
        const nota = notasActuales.find(n => n.id === notaId);
        if (!nota) {
          feedback.error('Nota de Ingreso no encontrada.');
          return false;
        }

        const almacenesMap = new Map(configState.almacenes.map(a => [a.id, a]));
        if (!almacenesMap.has(nota.almacenDestinoId)) {
          feedback.error('Almacén de destino no encontrado. Verifique la configuración.');
          return false;
        }

        if (nota.lineas.every(l => l.tipoBienServicio === 'servicio')) {
          feedback.error('La Nota de Ingreso no puede contener solo servicios.');
          return false;
        }

        const productsMap = new Map(allProducts.map(p => [p.id, p]));
        const { notaActualizada, movimientos } = await generarNIEnInventario(
          nota,
          notasActuales,
          productsMap,
          almacenesMap,
          usuarioNombre,
          empresaId,
          {
            generarId: () => crypto.randomUUID(),
            fechaActual: () => new Date().toISOString(),
            estadoValorizacion: configState.preferenciasInventario.estadoValorizacion,
            controlStockActivo: configState.salesPreferences?.controlStockActivo ?? false,
            monedaBase: currencyManager.getSnapshot().baseCurrency.code,
          },
        );

        // El inventario (movimiento + capa) ya quedó confirmado por la unidad de trabajo — de aquí
        // en adelante persistir el documento es lo único que falta. Si esto falla (cuota excedida,
        // corrupción), nunca se debe mostrar éxito: se relanza con contexto explícito de que el
        // inventario sí se registró y que reintentar es seguro (misma claveIdempotencia).
        try {
          agregarOActualizarNI(notaActualizada, empresaId);
        } catch (errorPersistencia) {
          const detalle = errorPersistencia instanceof Error ? errorPersistencia.message : 'error desconocido';
          throw new Error(
            `El movimiento de inventario se registró correctamente, pero la Nota de Ingreso no pudo guardarse (${detalle}). Vuelve a intentar: la operación es segura de repetir y no duplicará el movimiento.`,
          );
        }

        // La unidad de trabajo (Etapa 1B) ya escribió productos y movimientos — nunca se vuelve a
        // persistir aquí. Solo se rehidrata el store de productos y se refresca el Kardex.
        sincronizarInventarioTrasConfirmacion();

        // Etapa 3, §12: si esta NI tiene origen en un Comprobante de Compra (confirmación manual),
        // sincroniza el CC exactamente igual que la vía automática — no-op si Compras no está
        // montado en este árbol (useComprasOpcional) o si la NI no tiene ese origen.
        comprasOpcional?.sincronizarComprobanteTrasConfirmacionNI(notaActualizada, movimientos.map(m => m.id));

        feedback.success(`Nota de Ingreso ${notaActualizada.numero ?? ''} generada correctamente.`);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al generar la Nota de Ingreso.';
        feedback.error(msg);
        return false;
      } finally {
        setProcesando(false);
      }
    },
    [procesando, allProducts, configState.almacenes, configState.preferenciasInventario, configState.salesPreferences?.controlStockActivo, usuarioNombre, feedback, comprasOpcional],
  );

  const anularNI = useCallback(
    async (notaId: string, motivoAnulacion: string): Promise<boolean> => {
      if (procesando) return false;
      setProcesando(true);
      try {
        const empresaId = getTenantEmpresaId();
        const notasActuales = cargarNotasIngreso(empresaId);
        const nota = notasActuales.find(n => n.id === notaId);
        if (!nota) {
          feedback.error('Nota de Ingreso no encontrada.');
          return false;
        }

        if (!motivoAnulacion.trim()) {
          feedback.error('Debe especificar el motivo de anulación.');
          return false;
        }

        const almacenesMap = new Map(configState.almacenes.map(a => [a.id, a]));
        if (!almacenesMap.has(nota.almacenDestinoId)) {
          feedback.error('Almacén de destino no encontrado.');
          return false;
        }

        const productsMap = new Map(allProducts.map(p => [p.id, p]));
        const { notaActualizada } = await anularNIEnInventario(
          nota,
          productsMap,
          almacenesMap,
          motivoAnulacion,
          usuarioNombre,
          empresaId,
          {
            generarId: () => crypto.randomUUID(),
            fechaActual: () => new Date().toISOString(),
            estadoValorizacion: configState.preferenciasInventario.estadoValorizacion,
            controlStockActivo: configState.salesPreferences?.controlStockActivo ?? false,
            monedaBase: currencyManager.getSnapshot().baseCurrency.code,
          },
        );

        // La reversa de inventario ya quedó confirmada — si la persistencia del documento falla
        // ahora, nunca se debe mostrar éxito: se relanza con contexto explícito (mismo criterio que
        // en `generarNI`).
        try {
          agregarOActualizarNI(notaActualizada, empresaId);
        } catch (errorPersistencia) {
          const detalle = errorPersistencia instanceof Error ? errorPersistencia.message : 'error desconocido';
          throw new Error(
            `La reversa de inventario se registró correctamente, pero la Nota de Ingreso no pudo guardarse (${detalle}). Vuelve a intentar: la operación es segura de repetir.`,
          );
        }

        // La unidad de trabajo (Etapa 1B) ya escribió productos y movimientos — nunca se vuelve a
        // persistir aquí. Solo se rehidrata el store de productos y se refresca el Kardex.
        sincronizarInventarioTrasConfirmacion();

        // Cierre de brecha: sin esto, el CC de origen (si lo tiene) queda con estadoInventario
        // desactualizado y bloqueado para anularse para siempre, aunque el inventario ya se revirtió
        // arriba — mismo patrón que `generarNI` usa para la confirmación (comprasOpcional es
        // opcional: no-op si esta NI no tiene `comprobanteCompraOrigenId`, o si Compras no está
        // montado en este árbol).
        comprasOpcional?.sincronizarComprobanteTrasAnulacionNI(notaActualizada);

        feedback.success(`Nota de Ingreso ${nota.numero ?? nota.id} anulada.`);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al anular la Nota de Ingreso.';
        feedback.error(msg);
        return false;
      } finally {
        setProcesando(false);
      }
    },
    [procesando, allProducts, configState.almacenes, configState.preferenciasInventario, configState.salesPreferences?.controlStockActivo, usuarioNombre, feedback, comprasOpcional],
  );

  const eliminarNI = useCallback(
    (notaId: string): boolean => {
      try {
        const empresaId = getTenantEmpresaId();
        const notasActuales = cargarNotasIngreso(empresaId);
        const nota = notasActuales.find(n => n.id === notaId);
        if (!nota) {
          feedback.error('Nota no encontrada.');
          return false;
        }
        if (nota.estado !== 'Borrador') {
          feedback.error('Solo se pueden eliminar borradores. Las notas generadas deben anularse.');
          return false;
        }
        guardarNotasIngreso(notasActuales.filter(n => n.id !== notaId), empresaId);
        feedback.success('Borrador eliminado.');
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No se pudo eliminar el borrador.';
        feedback.error(msg);
        return false;
      }
    },
    [feedback],
  );

  return {
    notas,
    usuarioNombre,
    usuarioId,
    procesando,
    guardarBorrador,
    generarNI,
    anularNI,
    eliminarNI,
  };
};
