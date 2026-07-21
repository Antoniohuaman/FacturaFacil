import { useMemo, useState } from 'react';
import { useFeedback } from '@/shared/feedback';
import { getConfiguredPaymentMeans, type PaymentMeanOption } from '@/shared/payments/paymentMeans';
import { normalizarImporte } from '@/shared/currency';
import { useCompras } from '../contexto/ContextoCompras';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useBankAccounts } from '../../configuracion-sistema/hooks/useCuentasBancarias';
import { useCaja } from '../../control-caja';
import { useUserSession } from '@/contexts/UserSessionContext';
import { siguienteNumeroPago } from '../utilidades/formatearCompras';
import { esMedioBancario, requiereReferencia, tieneMedioDeCaja, validarAplicacionesPagoCompra } from '../servicios/servicioPagoCompra';
import { resolverNombreFormaPago } from '../logica/reglasCompras';
import type { CuentaPorPagar } from '../modelos/CuentaPorPagar';
import type { MedioPagoCompra, AplicacionPagoCompra } from '../modelos/PagoCompra';
import type { AdjuntoCompra } from '../modelos/AdjuntoCompra';

function generarIdLinea(): string {
  return `ml-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Errores propios de una línea de medio de pago, uno por control real (nunca un solo texto a interpretar). */
export interface ErrorMedioPago {
  codigo?: string;
  monto?: string;
  cuentaBancaria?: string;
  referencia?: string;
}

/** Errores de campo del formulario de pago, listos para mostrarse junto al control correspondiente (nunca en un banner general). */
export interface ErroresPagoPorCampo {
  aplicaciones?: string;
  /** Por id de línea de medio de pago (`MedioPagoCompra.id`). */
  medios?: Record<string, ErrorMedioPago>;
  diferencia?: string;
  tipoCambio?: string;
}

function crearMedioDesde(medio: PaymentMeanOption | undefined, monto: number): MedioPagoCompra {
  return {
    id: generarIdLinea(),
    medioPagoCodigo: medio?.code ?? '',
    medioPagoNombre: medio?.label ?? '',
    monto,
  };
}

/**
 * Estado y lógica del formulario de página completa de Registro de Pago de
 * Compra. Soporta 1 o varias Cuentas por Pagar del MISMO proveedor y moneda
 * (`cxps`, ya resueltas por el paso previo de selección) — cada una con su
 * propio importe a aplicar en `aplicaciones` (nunca el total del pago
 * aplicado por igual a cada una). La distribución interna entre las cuotas
 * propias de cada CxP (si tiene un cronograma real de crédito) se resuelve
 * de forma automática por `aplicarPagoACuentaPorPagar` (de la más antigua a
 * la más nueva) — este formulario no ofrece seleccionar cuotas específicas
 * dentro de un documento, solo cuánto aplicar a cada documento completo.
 *
 * Los medios de pago provienen exclusivamente del catálogo real de
 * Configuración de Negocio → Pagos → Medios de pago (getConfiguredPaymentMeans,
 * @/shared/payments/paymentMeans). "Contado"/"Crédito" son la condición
 * comercial del comprobante origen (CuentaPorPagar.formaPago) y nunca entran
 * a este catálogo ni al modelo MedioPagoCompra.
 */
export function useFormularioPagoCompra(cxps: CuentaPorPagar[], importesIniciales: Record<string, number>) {
  const { state: comprasState, registrarPagoCompra } = useCompras();
  const { state: config } = useConfigurationContext();
  const { status: estadoCaja } = useCaja();
  const { accounts: cuentasBancarias } = useBankAccounts();
  const { session } = useUserSession();
  const feedback = useFeedback();

  const primerCxp = cxps[0];
  const moneda = primerCxp?.moneda ?? 'PEN';
  const proveedorId = primerCxp?.proveedorId ?? '';
  const proveedorNombre = primerCxp?.proveedorNombre ?? '';
  const monedaBase = config.currencies.find((c) => c.isBaseCurrency)?.code ?? moneda;

  const seriePG = config.series.find(
    (s) => s.documentType?.code === 'PG' && s.status === 'ACTIVE' && s.isActive,
  );
  const numeroPagoPreview = seriePG ? siguienteNumeroPago(comprasState.pagos, seriePG.series) : null;

  const mediosDisponibles: PaymentMeanOption[] = useMemo(
    () => getConfiguredPaymentMeans().filter((m) => m.isVisible),
    [],
  );
  const hayMediosConfigurados = mediosDisponibles.length > 0;
  const medioPorDefecto = mediosDisponibles.find((m) => m.isDefault);

  const cuentasBancariasCompatibles = cuentasBancarias.filter(
    (c) => c.isVisible && c.currencyCode === moneda,
  );

  const formaPagoNombre = primerCxp ? resolverNombreFormaPago(primerCxp, config.paymentMethods) : '';

  // Importe a aplicar por CxP (cuentaPorPagarId -> monto), inicializado desde
  // el paso de selección (por defecto, el saldo pendiente completo de cada
  // documento elegido).
  const [aplicaciones, setAplicaciones] = useState<Record<string, number>>(() => ({ ...importesIniciales }));
  const importeAplicado = round2(
    cxps.reduce((acumulado, cxp) => acumulado + (aplicaciones[cxp.id] ?? 0), 0),
  );
  const saldoInicialTotal = round2(cxps.reduce((acumulado, cxp) => acumulado + cxp.saldoPendiente, 0));

  const [fechaPago, setFechaPago] = useState(() => new Date().toISOString().slice(0, 10));
  const [tipoCambio, setTipoCambio] = useState('');
  const [medioSincronizado, setMedioSincronizado] = useState(true);
  const [mediosPago, setMediosPago] = useState<MedioPagoCompra[]>(() => [
    crearMedioDesde(medioPorDefecto, importeAplicado),
  ]);
  const [documentoSustentoTipo, setDocumentoSustentoTipo] = useState('');
  const [documentoSustentoSerie, setDocumentoSustentoSerie] = useState('');
  const [documentoSustentoNumero, setDocumentoSustentoNumero] = useState('');
  const [concepto, setConcepto] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [adjuntos, setAdjuntos] = useState<AdjuntoCompra[]>([]);
  const [enviando, setEnviando] = useState(false);
  // Mismo esquema que los formularios de OC/CC/RQ: sin errores en un
  // formulario recién abierto, solo tras un intento real de registrar el
  // pago — y se recalculan en cada render, así que desaparecen apenas el
  // dato vuelve a ser válido. `errorGeneral` es exclusivamente el fallo real
  // de un intento de envío (excepción del servicio), nunca una regla de campo.
  const [intentoRegistrar, setIntentoRegistrar] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const totalMedios = round2(mediosPago.reduce((acc, m) => acc + (m.monto || 0), 0));
  const diferencia = round2(importeAplicado - totalMedios);
  const saldoResultanteTotal = round2(
    cxps.reduce((acumulado, cxp) => acumulado + Math.max(0, cxp.saldoPendiente - (aplicaciones[cxp.id] ?? 0)), 0),
  );

  const hayMedioDeCaja = tieneMedioDeCaja(mediosPago);
  const hayMedioBancarioSinCuentaCompatible =
    cuentasBancariasCompatibles.length === 0 && mediosPago.some((m) => esMedioBancario(m.medioPagoCodigo));

  /**
   * Cambia el importe a aplicar de una CxP puntual (clamp a [0, saldo]). Si
   * solo hay un medio de pago y el usuario aún no lo editó manualmente, el
   * medio se mantiene sincronizado con el nuevo total aplicado.
   */
  function onCambiarAplicacion(cuentaPorPagarId: string, importe: number) {
    const cxp = cxps.find((c) => c.id === cuentaPorPagarId);
    if (!cxp) return;
    const seguro = normalizarImporte(Math.max(0, Math.min(cxp.saldoPendiente, Number.isFinite(importe) ? importe : 0)), cxp.moneda);
    setAplicaciones((prev) => {
      const siguiente = { ...prev, [cuentaPorPagarId]: seguro };
      const nuevoImporte = round2(cxps.reduce((acumulado, c) => acumulado + (siguiente[c.id] ?? 0), 0));
      if (mediosPago.length === 1 && medioSincronizado) {
        setMediosPago([{ ...mediosPago[0], monto: nuevoImporte }]);
      }
      return siguiente;
    });
  }

  function agregarMedio() {
    setMediosPago((prev) => [...prev, crearMedioDesde(undefined, 0)]);
  }

  function eliminarMedio(id: string) {
    setMediosPago((prev) => (prev.length > 1 ? prev.filter((m) => m.id !== id) : prev));
  }

  function actualizarMedioPago(id: string, codigoNuevo: string) {
    const def = mediosDisponibles.find((m) => m.code === codigoNuevo);
    setMediosPago((prev) =>
      prev.map((m) =>
        m.id !== id
          ? m
          : { ...m, medioPagoCodigo: codigoNuevo, medioPagoNombre: def?.label ?? codigoNuevo, cuentaBancariaId: undefined, referenciaOperacion: undefined },
      ),
    );
  }

  function actualizarCampoMedio(id: string, campo: keyof MedioPagoCompra, valor: unknown) {
    if (campo === 'monto') setMedioSincronizado(false);
    setMediosPago((prev) => prev.map((m) => (m.id !== id ? m : { ...m, [campo]: valor })));
  }

  /**
   * Única fuente de verdad de validación del formulario: alimenta tanto el
   * bloqueo real de envío (`registrarPago`) como los errores de campo que
   * muestra la interfaz (`erroresPorCampo`) — un solo recorrido, nunca dos
   * reglas separadas para lo mismo. `validarAplicacionesPagoCompra` es la
   * MISMA función que usa el contexto al registrar (mismo proveedor, misma
   * moneda, importe dentro de saldo por documento) — no se reimplementa aquí.
   */
  function calcularErroresValidacion(): { lista: string[]; porCampo: ErroresPagoPorCampo } {
    const lista: string[] = [];
    const porCampo: ErroresPagoPorCampo = { medios: {} };

    if (!seriePG) lista.push('No hay una serie PG configurada.');
    if (!hayMediosConfigurados) lista.push('No hay medios de pago activos configurados.');

    const aplicacionesSeleccionadas = cxps
      .map((cxp) => ({ cuentaPorPagarId: cxp.id, importeAplicado: aplicaciones[cxp.id] ?? 0 }))
      .filter((a) => a.importeAplicado > 0);
    const erroresAplicaciones = validarAplicacionesPagoCompra(aplicacionesSeleccionadas, cxps);
    if (erroresAplicaciones.length > 0) {
      porCampo.aplicaciones = erroresAplicaciones[0].mensaje;
      lista.push(...erroresAplicaciones.map((e) => e.mensaje));
    }

    if (mediosPago.length === 0) lista.push('Agrega al menos un medio de pago.');
    mediosPago.forEach((m) => {
      const errorMedio: ErrorMedioPago = {};
      if (!m.medioPagoCodigo) errorMedio.codigo = 'Selecciona el medio de pago.';
      if (m.monto <= 0) errorMedio.monto = 'El importe debe ser mayor a cero.';
      if (m.medioPagoCodigo && esMedioBancario(m.medioPagoCodigo) && !m.cuentaBancariaId) {
        errorMedio.cuentaBancaria = 'Selecciona la cuenta bancaria.';
      }
      if (m.medioPagoCodigo && requiereReferencia(m.medioPagoCodigo) && !m.referenciaOperacion?.trim()) {
        errorMedio.referencia = 'Ingresa la referencia/N° de operación.';
      }
      if (Object.keys(errorMedio).length > 0) porCampo.medios![m.id] = errorMedio;
    });
    Object.values(porCampo.medios!).forEach((e) => {
      [e.codigo, e.monto, e.cuentaBancaria, e.referencia].forEach((mensaje) => {
        if (mensaje) lista.push(mensaje);
      });
    });

    if (normalizarImporte(diferencia, moneda) !== 0) {
      porCampo.diferencia = `La suma de medios de pago (${totalMedios.toFixed(2)}) debe coincidir exactamente con el importe a pagar (${importeAplicado.toFixed(2)}).`;
      lista.push(porCampo.diferencia);
    }
    if (hayMedioBancarioSinCuentaCompatible) {
      lista.push(`No hay cuentas bancarias registradas en ${moneda}.`);
    }
    if (hayMedioDeCaja && estadoCaja !== 'abierta') {
      lista.push('La caja está cerrada.');
    }
    if (moneda !== monedaBase && (!tipoCambio || parseFloat(tipoCambio) <= 0)) {
      porCampo.tipoCambio = 'El tipo de cambio es obligatorio y debe ser mayor a 0.';
      lista.push(porCampo.tipoCambio);
    }
    return { lista, porCampo };
  }

  const { lista: erroresBloqueo, porCampo: erroresPorCampo } = calcularErroresValidacion();
  // Únicas razones estructurales para deshabilitar el botón en silencio (no
  // hay ningún documento/serie/medio seleccionable posible): el resto de
  // reglas se validan al hacer click y se muestran en el campo que
  // corresponde, nunca ocultando el botón sin explicación.
  const bloqueadoEstructural = !seriePG || !hayMediosConfigurados;

  async function registrarPago(): Promise<boolean> {
    if (enviando) return false;

    setIntentoRegistrar(true);
    if (erroresBloqueo.length > 0) {
      return false;
    }

    setErrorGeneral(null);
    setEnviando(true);

    try {
      const aplicacionesPago: AplicacionPagoCompra[] = cxps
        .filter((cxp) => (aplicaciones[cxp.id] ?? 0) > 0)
        .map((cxp) => ({
          cuentaPorPagarId: cxp.id,
          comprobanteCompraId: cxp.comprobanteCompraId,
          importeAplicado: aplicaciones[cxp.id],
          // Solo se envía asignación exacta por cuota cuando la CxP tiene un
          // cronograma real propio (cxp.cuotas) — el reparto entre esas
          // cuotas se deja al mecanismo agregado ya existente (de la más
          // antigua a la más nueva), no se ofrece elegir cuota específica.
          asignacionesCuotas: undefined,
        }));

      const pago = await registrarPagoCompra(
        {
          fechaPago,
          proveedorId,
          proveedorNombre,
          moneda,
          tipoCambio: tipoCambio ? parseFloat(tipoCambio) : undefined,
          mediosPago,
          aplicaciones: aplicacionesPago,
          documentoSustentoTipo: documentoSustentoTipo || undefined,
          documentoSustentoSerie: documentoSustentoSerie || undefined,
          documentoSustentoNumero: documentoSustentoNumero || undefined,
          concepto: concepto || undefined,
          observaciones: observaciones || undefined,
          adjuntos,
        },
        session?.userId,
        seriePG!.series,
      );
      feedback.success(
        `Pago ${pago.numeroPago} registrado correctamente.${hayMedioDeCaja ? ' Caja actualizada.' : ''}`,
      );
      return true;
    } catch (e) {
      setErrorGeneral(e instanceof Error ? e.message : 'Error al registrar el pago.');
      return false;
    } finally {
      setEnviando(false);
    }
  }

  return {
    moneda,
    monedaBase,
    seriePG,
    numeroPagoPreview,
    mediosDisponibles,
    hayMediosConfigurados,
    cuentasBancariasCompatibles,
    formaPagoNombre,
    aplicaciones,
    onCambiarAplicacion,
    fechaPago,
    setFechaPago,
    tipoCambio,
    setTipoCambio,
    importeAplicado,
    saldoInicialTotal,
    mediosPago,
    agregarMedio,
    eliminarMedio,
    actualizarMedioPago,
    actualizarCampoMedio,
    documentoSustentoTipo,
    setDocumentoSustentoTipo,
    documentoSustentoSerie,
    setDocumentoSustentoSerie,
    documentoSustentoNumero,
    setDocumentoSustentoNumero,
    concepto,
    setConcepto,
    observaciones,
    setObservaciones,
    adjuntos,
    setAdjuntos,
    enviando,
    intentoRegistrar,
    errorGeneral,
    erroresPorCampo,
    totalMedios,
    diferencia,
    saldoResultanteTotal,
    hayMedioDeCaja,
    estadoCaja,
    hayMedioBancarioSinCuentaCompatible,
    bloqueadoEstructural,
    registrarPago,
  };
}

export type UseFormularioPagoCompraResultado = ReturnType<typeof useFormularioPagoCompra>;
