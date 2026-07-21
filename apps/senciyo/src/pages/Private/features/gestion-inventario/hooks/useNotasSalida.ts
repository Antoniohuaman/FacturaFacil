// src/features/gestion-inventario/hooks/useNotasSalida.ts

import { useState, useCallback, useEffect } from 'react';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import { useAuth } from '../../autenticacion/hooks';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import { useFeedback } from '../../../../../shared/feedback';
import { useTenant } from '@/shared/tenant/TenantContext';
import { getTenantEmpresaId } from '../../../../../shared/tenant';
import {
  cargarNotasSalida,
  guardarNotasSalida,
  agregarOActualizarNS,
  NOTAS_SALIDA_CHANGED_EVENT,
} from '../repositories/notaSalida.repository';
import {
  prepararSalidaNS,
  reconstruirOperacionNSDesdeSnapshot,
  construirPreparacionInventarioNS,
  construirDatosOperacionSalidaNS,
  construirNotaSalidaGenerada,
  anularNSEnInventario,
  marcarNSComoEntregada,
} from '../services/notaSalida.service';
import { ServicioKardexValorizado } from '../services/servicioKardexValorizado';
import { sincronizarInventarioTrasConfirmacion } from '../../../../../shared/inventory/accionesStock';
import {
  obtenerReservasDeOV,
  atenderOrdenVentaPostNS,
  atenderOrdenVentaPostNSDirecta,
  restaurarOVPostAnulacionNSDirecta,
  vincularDocumentoComercialNS,
  desvincularDocumentoComercialNS,
  construirRestauracionReservaDesdeOV,
} from '../../../../../shared/documentosComerciales/postEmisionOrdenVenta';
import type { NotaSalida } from '../models/notaSalida.types';

export const useNotasSalida = () => {
  const { user } = useAuth();
  const { allProducts, updateProduct } = useProductStore();
  const { session } = useUserSession();
  const { state: configState } = useConfigurationContext();
  const { activeEstablecimientoId } = useTenant();
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
    async (notaId: string): Promise<boolean> => {
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
        const hayAlmacenesActivos = configState.almacenes.some(a => a.estaActivoAlmacen !== false);
        if (!hayAlmacenesActivos) {
          feedback.error('No hay almacenes activos configurados. Verifique la configuración.');
          return false;
        }

        if (nota.lineas.every(l => l.tipoBienServicio === 'servicio')) {
          feedback.error('La Nota de Salida no puede contener solo servicios.');
          return false;
        }

        const productsMap = new Map(allProducts.map(p => [p.id, p]));

        // 1. Identidad + snapshot INMUTABLE ANTES de tocar inventario (corrección post-1D, §2): si
        // ya existe un snapshot de preparación persistido, un intento previo ya completó la
        // preparación (y puede o no haber llegado a confirmar inventario) — se reutiliza EXACTAMENTE
        // ese snapshot (`reconstruirOperacionNSDesdeSnapshot`), sin volver a ejecutar FIFO, sin
        // volver a consultar `esProductoInventariable` contra el catálogo vigente y sin reconstruir
        // cantidades/almacenes desde el stock actual. Si no, es un intento genuinamente nuevo: se
        // calcula FIFO/OV sobre el stock vigente y se persiste identidad + snapshot ANTES de invocar
        // al motor.
        let resultado;
        if (nota.preparacionInventario) {
          resultado = reconstruirOperacionNSDesdeSnapshot(nota);
        } else {
          resultado = prepararSalidaNS(
            nota,
            notasActuales,
            productsMap,
            almacenesMap,
            activeEstablecimientoId ?? '',
          );
          agregarOActualizarNS({
            ...nota,
            correlativo: resultado.correlativo,
            numero: resultado.numero,
            lineas: resultado.lineasExpandidas,
            preparacionInventario: construirPreparacionInventarioNS(resultado),
          });
        }

        const empresaId = getTenantEmpresaId();
        const fecha = new Date().toISOString();

        // Una NS compuesta únicamente por servicios y/o productos legítimamente no inventariables
        // no genera ninguna operación de inventario (sin versión nueva, sin movimientos) — se
        // finaliza como Generada directamente.
        if (resultado.lineasOperacion.length > 0) {
          const datosOperacion = construirDatosOperacionSalidaNS({
            nota,
            resultado,
            empresaId,
            usuario: usuarioNombre,
            fecha,
          });

          // 2-5. Hash canónico, reserva idempotente, preparación del documento completo y
          // confirmación — todo dentro de una sola operación mediante el motor genérico. `nota.id`
          // ya es estable; y ahora `resultado` también lo es entre reintentos (paso 1), así que el
          // hash coincide y un reintento siempre resuelve 'repetida' en vez de descontar dos veces.
          await ServicioKardexValorizado.registrarSalidaValorizada(datosOperacion, {
            almacenes: almacenesMap,
            generarId: () => crypto.randomUUID(),
            fechaActual: () => new Date().toISOString(),
          });

          // 6. Sincronización oficial de UI (Etapa 1B) — nunca una segunda escritura de productos
          // ni de movimientos: solo rehidrata el store desde el localStorage ya actualizado por la
          // unidad de trabajo y reutiliza el evento existente del Kardex.
          sincronizarInventarioTrasConfirmacion();
        }

        // Solo se marca 'Generada' DESPUÉS de que el inventario quedó confirmado o repetido (o de
        // determinar que esta NS no afecta inventario).
        const notaActualizada = construirNotaSalidaGenerada(nota, resultado, usuarioNombre, fecha);
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

        if (notaActualizada.ordenVentaOrigenId) {
          if (notaActualizada.origen === 'OrdenVenta') {
            // NS generada directamente desde OV (sin pasar por comprobante).
            atenderOrdenVentaPostNSDirecta(notaActualizada.ordenVentaOrigenId, {
              numeroNS: notaActualizada.numero ?? notaActualizada.id,
              usuario: usuarioNombre,
              aLiberar: resultado.despachosOV,
            });
            vincularDocumentoComercialNS(
              notaActualizada.ordenVentaOrigenId,
              notaActualizada.id,
              notaActualizada.updatedAt,
            );
          } else {
            // NS generada desde comprobante que proviene de OV.
            atenderOrdenVentaPostNS(notaActualizada.ordenVentaOrigenId, {
              numeroNS: notaActualizada.numero ?? notaActualizada.id,
              usuario: usuarioNombre,
              aLiberar: resultado.despachosOV,
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
    [procesando, allProducts, configState.almacenes, usuarioNombre, feedback, activeEstablecimientoId],
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

        // NS directa desde OV: restaurar OV y reponer solo la reserva que esta NS descontó.
        // NS desde comprobante que a su vez proviene de OV: mismo tratamiento.
        // Usamos construirRestauracionReservaDesdeOV para obtener la reserva con el
        // establecimientoId/almacenId correcto de la OV (no el almacén físico de la NS),
        // garantizando que restaurarReservasDeOV aplique al campo correcto de Zustand.
        if (nota.ordenVentaOrigenId) {
          const reservasOV = obtenerReservasDeOV(nota.ordenVentaOrigenId);
          const lineasAnuladas = nota.lineas
            .filter(l => l.tipoBienServicio === 'bien')
            .map(l => ({
              sku: l.productoCodigo,
              cantidad: l.cantidad,
              // almacenId físico necesario para el matching de reservas legacy (sku+almacenId).
              almacenId: l.almacenId ?? nota.almacenOrigenId,
            }));
          const aRestaurar = construirRestauracionReservaDesdeOV(reservasOV, lineasAnuladas);
          restaurarOVPostAnulacionNSDirecta(nota.ordenVentaOrigenId, {
            numeroNS: nota.numero ?? nota.id,
            usuario: usuarioNombre,
            aRestaurar,
          });
        }

        // NS desde NV: desvincular NS de la NV origen
        if (nota.notaVentaOrigenId) {
          desvincularDocumentoComercialNS(nota.notaVentaOrigenId, nota.id);
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
