// src/features/gestion-inventario/hooks/useNotasIngreso.ts

import { useState, useCallback, useEffect } from 'react';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import { useAuth } from '../../autenticacion/hooks';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import { useFeedback } from '../../../../../shared/feedback';
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

export const useNotasIngreso = () => {
  const { user } = useAuth();
  const { allProducts, updateProduct } = useProductStore();
  const { session } = useUserSession();
  const { state: configState } = useConfigurationContext();
  const feedback = useFeedback();

  const usuarioNombre = session?.userName ?? user?.nombre ?? 'Usuario';

  const [notas, setNotas] = useState<NotaIngreso[]>(() => cargarNotasIngreso());

  useEffect(() => {
    const recargar = () => setNotas(cargarNotasIngreso());
    window.addEventListener(NOTAS_INGRESO_CHANGED_EVENT, recargar);
    return () => window.removeEventListener(NOTAS_INGRESO_CHANGED_EVENT, recargar);
  }, []);

  const guardarBorrador = useCallback(
    (nota: NotaIngreso): boolean => {
      try {
        const ahora = new Date().toISOString();
        const borrador: NotaIngreso = {
          ...nota,
          estado: 'Borrador',
          esBorrador: true,
          fechaActualizacion: ahora,
          historial: nota.historial.length > 0
            ? nota.historial
            : [{ fecha: ahora, usuario: usuarioNombre, accion: 'Borrador guardado' }],
        };
        agregarOActualizarNI(borrador);
        feedback.success('Borrador guardado correctamente.');
        return true;
      } catch {
        feedback.error('No se pudo guardar el borrador.');
        return false;
      }
    },
    [usuarioNombre, feedback],
  );

  const generarNI = useCallback(
    (notaId: string): boolean => {
      const notasActuales = cargarNotasIngreso();
      const nota = notasActuales.find(n => n.id === notaId);
      if (!nota) {
        feedback.error('Nota de Ingreso no encontrada.');
        return false;
      }

      const almacen = configState.almacenes.find(a => a.id === nota.almacenDestinoId);
      if (!almacen) {
        feedback.error('Almacén de destino no encontrado. Verifique la configuración.');
        return false;
      }

      if (nota.lineas.every(l => l.tipoBienServicio === 'servicio')) {
        feedback.error('La Nota de Ingreso no puede contener solo servicios.');
        return false;
      }

      try {
        const productsMap = new Map(allProducts.map(p => [p.id, p]));
        const { notaActualizada, productosActualizados } = generarNIEnInventario(
          nota,
          notasActuales,
          productsMap,
          almacen,
          usuarioNombre,
        );

        agregarOActualizarNI(notaActualizada);

        for (const prod of productosActualizados) {
          updateProduct(prod.id, prod);
        }

        feedback.success(`Nota de Ingreso ${notaActualizada.numero ?? ''} generada correctamente.`);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al generar la Nota de Ingreso.';
        feedback.error(msg);
        return false;
      }
    },
    [allProducts, configState.almacenes, usuarioNombre, updateProduct, feedback],
  );

  const anularNI = useCallback(
    (notaId: string, motivoAnulacion: string): boolean => {
      const notasActuales = cargarNotasIngreso();
      const nota = notasActuales.find(n => n.id === notaId);
      if (!nota) {
        feedback.error('Nota de Ingreso no encontrada.');
        return false;
      }

      if (!motivoAnulacion.trim()) {
        feedback.error('Debe especificar el motivo de anulación.');
        return false;
      }

      const almacen = configState.almacenes.find(a => a.id === nota.almacenDestinoId);
      if (!almacen) {
        feedback.error('Almacén de destino no encontrado.');
        return false;
      }

      try {
        const productsMap = new Map(allProducts.map(p => [p.id, p]));
        const { notaActualizada, productosActualizados } = anularNIEnInventario(
          nota,
          productsMap,
          almacen,
          motivoAnulacion,
          usuarioNombre,
        );

        agregarOActualizarNI(notaActualizada);

        for (const prod of productosActualizados) {
          updateProduct(prod.id, prod);
        }

        feedback.success(`Nota de Ingreso ${nota.numero ?? nota.id} anulada.`);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al anular la Nota de Ingreso.';
        feedback.error(msg);
        return false;
      }
    },
    [allProducts, configState.almacenes, usuarioNombre, updateProduct, feedback],
  );

  const eliminarNI = useCallback(
    (notaId: string): boolean => {
      const notasActuales = cargarNotasIngreso();
      const nota = notasActuales.find(n => n.id === notaId);
      if (!nota) {
        feedback.error('Nota no encontrada.');
        return false;
      }
      if (nota.estado !== 'Borrador') {
        feedback.error('Solo se pueden eliminar borradores. Las notas generadas deben anularse.');
        return false;
      }
      guardarNotasIngreso(notasActuales.filter(n => n.id !== notaId));
      feedback.success('Borrador eliminado.');
      return true;
    },
    [feedback],
  );

  return {
    notas,
    usuarioNombre,
    guardarBorrador,
    generarNI,
    anularNI,
    eliminarNI,
  };
};
