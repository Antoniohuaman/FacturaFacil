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

      try {
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

        for (const prod of productosActualizados) {
          updateProduct(prod.id, prod);
        }

        feedback.success(`Nota de Salida ${notaActualizada.numero ?? ''} generada correctamente.`);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al generar la Nota de Salida.';
        feedback.error(msg);
        return false;
      }
    },
    [allProducts, configState.almacenes, usuarioNombre, updateProduct, feedback],
  );

  const anularNS = useCallback(
    (notaId: string, motivoAnulacion: string): boolean => {
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

      try {
        const productsMap = new Map(allProducts.map(p => [p.id, p]));
        const { notaActualizada, productosActualizados } = anularNSEnInventario(
          nota,
          productsMap,
          almacenesMap,
          motivoAnulacion,
          usuarioNombre,
        );

        agregarOActualizarNS(notaActualizada);

        for (const prod of productosActualizados) {
          updateProduct(prod.id, prod);
        }

        feedback.success(`Nota de Salida ${nota.numero ?? nota.id} anulada. Stock repuesto.`);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al anular la Nota de Salida.';
        feedback.error(msg);
        return false;
      }
    },
    [allProducts, configState.almacenes, usuarioNombre, updateProduct, feedback],
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
    guardarBorrador,
    generarNS,
    anularNS,
    marcarComoEntregada,
    eliminarNS,
  };
};
