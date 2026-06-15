// src/features/gestion-inventario/hooks/useNotasSalida.ts

import { useState, useCallback, useEffect } from 'react';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import { useAuth } from '../../autenticacion/hooks';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import { useFeedback } from '../../../../../shared/feedback';
import {
  cargarNotasSalida,
  guardarNotasSalida,
  agregarOActualizarNS,
  NOTAS_SALIDA_CHANGED_EVENT,
} from '../repositories/notaSalida.repository';
import {
  generarNSEnInventario,
  anularNSEnInventario,
  marcarNSComoEntregada,
} from '../services/notaSalida.service';
import {
  liberarReservasDeOV,
  obtenerReservasDeOV,
  atenderOrdenVentaPostNS,
  atenderOrdenVentaPostNSDirecta,
  restaurarOVPostAnulacionNSDirecta,
  vincularDocumentoComercialNS,
  desvincularDocumentoComercialNS,
} from '../../../../../shared/documentosComerciales/postEmisionOrdenVenta';
import type { NotaSalida } from '../models/notaSalida.types';

export const useNotasSalida = () => {
  const { user } = useAuth();
  const { allProducts, updateProduct } = useProductStore();
  const { session } = useUserSession();
  const { state: configState } = useConfigurationContext();
  const feedback = useFeedback();

  const usuarioNombre = session?.userName ?? user?.nombre ?? 'Usuario';
  const usuarioId = session?.userId ?? '';

  const [notas, setNotas] = useState<NotaSalida[]>(() => cargarNotasSalida());
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    const recargar = () => setNotas(cargarNotasSalida());
    window.addEventListener(NOTAS_SALIDA_CHANGED_EVENT, recargar);
    return () => window.removeEventListener(NOTAS_SALIDA_CHANGED_EVENT, recargar);
  }, []);

  const guardarBorrador = useCallback(
    (nota: NotaSalida, opciones?: { silencioso?: boolean }): boolean => {
      try {
        const ahora = new Date().toISOString();
        const borrador: NotaSalida = {
          ...nota,
          estado: 'Borrador',
          esBorrador: true,
          updatedAt: ahora,
          historial:
            !opciones?.silencioso && nota.historial.length === 0
              ? [{ fecha: ahora, usuario: usuarioNombre, accion: 'Borrador guardado' }]
              : nota.historial,
        };
        agregarOActualizarNS(borrador);
        if (!opciones?.silencioso) {
          feedback.success('Borrador guardado correctamente.');
        }
        return true;
      } catch {
        if (!opciones?.silencioso) {
          feedback.error('No se pudo guardar el borrador.');
        }
        return false;
      }
    },
    [usuarioNombre, feedback],
  );

  const generarNS = useCallback(
    (notaId: string): boolean => {
      if (procesando) return false;
      setProcesando(true);
      try {
        const notasActuales = cargarNotasSalida();
        const nota = notasActuales.find(n => n.id === notaId);
        if (!nota) {
          feedback.error('Nota de Salida no encontrada.');
          return false;
        }

        const almacenesMap = new Map(configState.almacenes.map(a => [a.id, a]));
        if (!almacenesMap.has(nota.almacenOrigenId)) {
          feedback.error('Almacén de origen no encontrado. Verifique la configuración.');
          return false;
        }

        if (nota.lineas.every(l => l.tipoBienServicio === 'servicio')) {
          feedback.error('La Nota de Salida no puede contener solo servicios.');
          return false;
        }

        const productsMap = new Map(allProducts.map(p => [p.id, p]));
        const { notaActualizada, productosActualizados } = generarNSEnInventario(
          nota,
          notasActuales,
          productsMap,
          almacenesMap,
          usuarioNombre,
        );

        agregarOActualizarNS(notaActualizada);

        if (notaActualizada.comprobanteOrigenId) {
          window.dispatchEvent(new CustomEvent('facturafacil:comprobante-ns-generada', {
            detail: {
              comprobanteId: notaActualizada.comprobanteOrigenId,
              notaSalidaId: notaActualizada.id,
              fechaGeneracionNotaSalida: notaActualizada.updatedAt,
            },
          }));
        }

        // productosActualizados es un snapshot anterior a liberarReservasDeOV; si liberamos
        // primero, updateProduct sobreescribe stockReservadoPorAlmacen con el valor del snapshot.
        // El stock real debe aplicarse antes de que la liberación escriba el reservado = 0.
        for (const prod of productosActualizados) {
          updateProduct(prod.id, prod);
        }

        if (notaActualizada.ordenVentaOrigenId) {
          // Liberar solo la cantidad realmente despachada en esta NS (soporte salida parcial).
          // No liberar toda la reserva OV de una vez: si la NS es parcial, la reserva pendiente
          // debe quedar activa para futuros despachos.
          const reservasOV = obtenerReservasDeOV(notaActualizada.ordenVentaOrigenId);
          if (reservasOV.length > 0) {
            const aLiberar: Array<{ sku: string; cantidad: number; almacenId: string }> = [];
            for (const linea of notaActualizada.lineas.filter(l => l.tipoBienServicio === 'bien')) {
              const almId = linea.almacenId ?? notaActualizada.almacenOrigenId;
              const prod = productsMap.get(linea.productoId);
              if (!prod?.codigo) continue;
              const maxLiberable = reservasOV
                .filter(r => r.sku === prod.codigo && r.almacenId === almId)
                .reduce((s, r) => s + r.cantidad, 0);
              const cantLiberar = Math.min(linea.cantidad, maxLiberable);
              if (cantLiberar > 0) {
                aLiberar.push({ sku: prod.codigo, cantidad: cantLiberar, almacenId: almId });
              }
            }
            if (aLiberar.length > 0) {
              liberarReservasDeOV(aLiberar);
            }
          }

          if (notaActualizada.origen === 'OrdenVenta') {
            // NS generada directamente desde OV (sin pasar por comprobante):
            // la OV estaba en 'Reservada', pasa a 'Atendida'.
            atenderOrdenVentaPostNSDirecta(notaActualizada.ordenVentaOrigenId, {
              numeroNS: notaActualizada.numero ?? notaActualizada.id,
              usuario: usuarioNombre,
            });
            vincularDocumentoComercialNS(
              notaActualizada.ordenVentaOrigenId,
              notaActualizada.id,
              notaActualizada.updatedAt,
            );
          } else {
            // NS generada desde comprobante que proviene de OV:
            // la OV estaba en 'Pendiente de salida', pasa a 'Atendida'.
            atenderOrdenVentaPostNS(notaActualizada.ordenVentaOrigenId, {
              numeroNS: notaActualizada.numero ?? notaActualizada.id,
              usuario: usuarioNombre,
            });
          }
        }

        // Vincular NS a la Nota de Venta origen si corresponde
        if (notaActualizada.notaVentaOrigenId) {
          vincularDocumentoComercialNS(
            notaActualizada.notaVentaOrigenId,
            notaActualizada.id,
            notaActualizada.updatedAt,
          );
        }

        feedback.success(`Nota de Salida ${notaActualizada.numero ?? ''} generada correctamente.`);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al generar la Nota de Salida.';
        feedback.error(msg);
        return false;
      } finally {
        setProcesando(false);
      }
    },
    [procesando, allProducts, configState.almacenes, usuarioNombre, updateProduct, feedback],
  );

  const anularNS = useCallback(
    (notaId: string, motivoAnulacion: string): boolean => {
      if (procesando) return false;
      setProcesando(true);
      try {
        const notasActuales = cargarNotasSalida();
        const nota = notasActuales.find(n => n.id === notaId);
        if (!nota) {
          feedback.error('Nota de Salida no encontrada.');
          return false;
        }

        if (!motivoAnulacion.trim()) {
          feedback.error('Debe especificar el motivo de anulación.');
          return false;
        }

        const almacenesMap = new Map(configState.almacenes.map(a => [a.id, a]));
        const productsMap = new Map(allProducts.map(p => [p.id, p]));
        const { notaActualizada, productosActualizados } = anularNSEnInventario(
          nota,
          productsMap,
          almacenesMap,
          motivoAnulacion,
          usuarioNombre,
        );

        agregarOActualizarNS(notaActualizada);

        if (nota.comprobanteOrigenId) {
          window.dispatchEvent(new CustomEvent('facturafacil:comprobante-ns-anulada', {
            detail: { comprobanteId: nota.comprobanteOrigenId },
          }));
        }

        for (const prod of productosActualizados) {
          updateProduct(prod.id, prod);
        }

        // NS directa desde OV: restaurar OV a 'Reservada' y reponer reserva de stock
        if (nota.origen === 'OrdenVenta' && nota.ordenVentaOrigenId) {
          restaurarOVPostAnulacionNSDirecta(nota.ordenVentaOrigenId, {
            numeroNS: nota.numero ?? nota.id,
            usuario: usuarioNombre,
          });
        }

        // NS desde NV: desvincular NS de la NV origen
        if (nota.notaVentaOrigenId) {
          desvincularDocumentoComercialNS(nota.notaVentaOrigenId);
        }

        feedback.success(`Nota de Salida ${nota.numero ?? nota.id} anulada. Stock repuesto.`);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al anular la Nota de Salida.';
        feedback.error(msg);
        return false;
      } finally {
        setProcesando(false);
      }
    },
    [procesando, allProducts, configState.almacenes, usuarioNombre, updateProduct, feedback],
  );

  const marcarComoEntregada = useCallback(
    (notaId: string): boolean => {
      const notasActuales = cargarNotasSalida();
      const nota = notasActuales.find(n => n.id === notaId);
      if (!nota) {
        feedback.error('Nota de Salida no encontrada.');
        return false;
      }
      try {
        const notaActualizada = marcarNSComoEntregada(nota, usuarioNombre);
        agregarOActualizarNS(notaActualizada);
        feedback.success(`Nota de Salida ${nota.numero ?? nota.id} marcada como Entregada.`);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al marcar como entregada.';
        feedback.error(msg);
        return false;
      }
    },
    [usuarioNombre, feedback],
  );

  const eliminarNS = useCallback(
    (notaId: string): boolean => {
      const notasActuales = cargarNotasSalida();
      const nota = notasActuales.find(n => n.id === notaId);
      if (!nota) {
        feedback.error('Nota no encontrada.');
        return false;
      }
      if (nota.estado !== 'Borrador') {
        feedback.error('Solo se pueden eliminar borradores. Las notas generadas deben anularse.');
        return false;
      }
      guardarNotasSalida(notasActuales.filter(n => n.id !== notaId));
      feedback.success('Borrador eliminado.');
      return true;
    },
    [feedback],
  );

  return {
    notas,
    usuarioNombre,
    usuarioId,
    procesando,
    guardarBorrador,
    generarNS,
    anularNS,
    marcarComoEntregada,
    eliminarNS,
  };
};
