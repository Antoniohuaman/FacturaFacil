import { useMemo, useState } from 'react';
import { useFeedback } from '@/shared/feedback';
import { getConfiguredPaymentMeans, type PaymentMeanOption } from '@/shared/payments/paymentMeans';
import type { CreditInstallment } from '@/shared/payments/paymentTerms';
import { normalizarImporte } from '@/shared/currency';
import type { CreditInstallmentAllocationInput } from '@/shared/payments/CreditInstallmentsTable';
import { useCompras } from '../contexto/ContextoCompras';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useBankAccounts } from '../../configuracion-sistema/hooks/useCuentasBancarias';
import { useCaja } from '../../control-caja';
import { useUserSession } from '@/contexts/UserSessionContext';
import { siguienteNumeroPago } from '../utilidades/formatearCompras';
import { esMedioBancario, requiereReferencia, tieneMedioDeCaja, validarAplicacionesPagoCompra } from '../servicios/servicioPagoCompra';
import { calcularDiasCredito } from '../servicios/servicioCuentaPorPagar';
import { resolverNombreFormaPago } from '../logica/reglasCompras';
import type { CuentaPorPagar } from '../modelos/CuentaPorPagar';
import { ESTADO_PAGO_CXP_LABELS } from '../modelos/CuentaPorPagar';
import type { MedioPagoCompra, AplicacionPagoCompra, AsignacionCuotaPago } from '../modelos/PagoCompra';
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
 * Cuotas reales de una CxP (crédito, generadas por generarCuotasDesdeCC) como
 * `CreditInstallment[]` para reutilizar CreditInstallmentsTable en modo
 * `allocation` — mismo componente y patrón que ya usa Cobranzas. Solo se
 * invoca para documentos con `cxp.cuotas` real y no vacío: un documento sin
 * cronograma (contado, o dato heredado) NUNCA pasa por aquí — se paga con un
 * importe simple a nivel documento, sin fabricar una cuota sintética.
 */
function construirCuotasReales(cxp: CuentaPorPagar): CreditInstallment[] {
  return (cxp.cuotas ?? []).map((cuota) => ({
    numeroCuota: cuota.numeroCuota,
    fechaVencimiento: cuota.fechaVencimiento,
    importe: cuota.montoCuota,
    pagado: cuota.montoPagado,
    saldo: cuota.saldoPendiente,
    diasCredito: calcularDiasCredito(cxp.fechaEmision, cuota.fechaVencimiento) ?? 0,
    porcentaje: cxp.total > 0 ? round2((cuota.montoCuota / cxp.total) * 100) : 0,
    // Etiqueta ya resuelta con la terminología oficial de Cuentas por Pagar —
    // el componente compartido no decide ni conoce "Pagada".
    estado: ESTADO_PAGO_CXP_LABELS[cuota.estadoPago],
  }));
}

/** true si la CxP tiene un cronograma real de cuotas (crédito con más de una fecha de vencimiento propia) — único criterio para decidir si un documento se paga por cuota explícita o con un importe simple. */
function tieneCronogramaReal(cxp: CuentaPorPagar): boolean {
  return Boolean(cxp.cuotas && cxp.cuotas.length > 0);
}

/**
 * Estado y lógica del formulario de página completa de Registro de Pago de
 * Compra. Soporta 1 o varias Cuentas por Pagar del MISMO proveedor y moneda
 * (`cxps`, ya resueltas por el paso previo de selección).
 *
 * Cada documento se paga de una de dos formas, según tenga o no cronograma
 * real (`tieneCronogramaReal`):
 * - CON cuotas reales: el usuario selecciona explícitamente cuáles paga y
 *   cuánto aplica a cada una (`asignacionesCuotasPorDocumento`, reutilizando
 *   CreditInstallmentsTable — mismo patrón que ya usaba este formulario antes
 *   de soportar múltiples documentos, y el mismo que usa Cobranzas). El
 *   importe del documento se DERIVA de la suma de esas asignaciones, nunca es
 *   un valor independiente.
 * - SIN cuotas (contado, o CxP heredada sin cronograma): un importe simple a
 *   nivel documento (`aplicacionesSimples`), capado a su saldo pendiente.
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

  // Cuotas reales por documento — solo tiene entrada para los documentos que
  // sí tienen cronograma propio (cxp.cuotas real y no vacío).
  const cuotasPorDocumento = useMemo(() => {
    const mapa: Record<string, CreditInstallment[]> = {};
    cxps.forEach((cxp) => {
      if (tieneCronogramaReal(cxp)) mapa[cxp.id] = construirCuotasReales(cxp);
    });
    return mapa;
  }, [cxps]);

  // Documentos SIN cronograma real: importe simple a nivel documento
  // (por defecto, el propuesto por el paso de selección).
  const [aplicacionesSimples, setAplicacionesSimples] = useState<Record<string, number>>(() => {
    const inicial: Record<string, number> = {};
    cxps.forEach((cxp) => {
      if (!tieneCronogramaReal(cxp)) inicial[cxp.id] = importesIniciales[cxp.id] ?? cxp.saldoPendiente;
    });
    return inicial;
  });

  // Documentos CON cronograma real: selección explícita por cuota — SIN
  // ninguna cuota preseleccionada (el sistema no puede asumir cuáles paga el
  // usuario ni por cuánto); el total de estos documentos inicia en 0 hasta
  // que el usuario marca explícitamente la(s) cuota(s) que va a pagar.
  const [asignacionesCuotasPorDocumento, setAsignacionesCuotasPorDocumento] = useState<
    Record<string, CreditInstallmentAllocationInput[]>
  >(() => {
    const inicial: Record<string, CreditInstallmentAllocationInput[]> = {};
    cxps.forEach((cxp) => {
      if (tieneCronogramaReal(cxp)) inicial[cxp.id] = [];
    });
    return inicial;
  });

  /** Importe real a aplicar a un documento: suma de sus asignaciones de cuota si tiene cronograma real, o su importe simple si no. Única fuente — nunca dos valores independientes que puedan desincronizarse (§7 del alcance). */
  function obtenerImporteDocumento(cxp: CuentaPorPagar): number {
    const asignaciones = asignacionesCuotasPorDocumento[cxp.id];
    if (asignaciones) return round2(asignaciones.reduce((acc, a) => acc + (a.amount || 0), 0));
    return aplicacionesSimples[cxp.id] ?? 0;
  }

  const importeAplicado = round2(cxps.reduce((acumulado, cxp) => acumulado + obtenerImporteDocumento(cxp), 0));
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
    cxps.reduce((acumulado, cxp) => acumulado + Math.max(0, cxp.saldoPendiente - obtenerImporteDocumento(cxp)), 0),
  );

  const hayMedioDeCaja = tieneMedioDeCaja(mediosPago);
  const hayMedioBancarioSinCuentaCompatible =
    cuentasBancariasCompatibles.length === 0 && mediosPago.some((m) => esMedioBancario(m.medioPagoCodigo));

  /**
   * Cambia el importe a aplicar de un documento SIN cronograma real (clamp a
   * [0, saldo]). Si solo hay un medio de pago y el usuario aún no lo editó
   * manualmente, el medio se mantiene sincronizado con el nuevo total aplicado.
   */
  function onCambiarAplicacionSimple(cuentaPorPagarId: string, importe: number) {
    const cxp = cxps.find((c) => c.id === cuentaPorPagarId);
    if (!cxp) return;
    const seguro = normalizarImporte(Math.max(0, Math.min(cxp.saldoPendiente, Number.isFinite(importe) ? importe : 0)), cxp.moneda);
    setAplicacionesSimples((prev) => {
      const siguiente = { ...prev, [cuentaPorPagarId]: seguro };
      sincronizarMedioUnico(siguiente, asignacionesCuotasPorDocumento);
      return siguiente;
    });
  }

  /** Cambia la selección/importe de cuotas de un documento CON cronograma real — reutiliza tal cual el mecanismo de toggle/edición/clamping de CreditInstallmentsTable. */
  function onCambiarAsignacionesCuotas(cuentaPorPagarId: string, asignaciones: CreditInstallmentAllocationInput[]) {
    setAsignacionesCuotasPorDocumento((prev) => {
      const siguiente = { ...prev, [cuentaPorPagarId]: asignaciones };
      sincronizarMedioUnico(aplicacionesSimples, siguiente);
      return siguiente;
    });
  }

  function sincronizarMedioUnico(
    simples: Record<string, number>,
    cuotas: Record<string, CreditInstallmentAllocationInput[]>,
  ) {
    if (mediosPago.length !== 1 || !medioSincronizado) return;
    const nuevoImporte = round2(
      cxps.reduce((acumulado, cxp) => {
        const asignaciones = cuotas[cxp.id];
        const importeDoc = asignaciones
          ? round2(asignaciones.reduce((acc, a) => acc + (a.amount || 0), 0))
          : simples[cxp.id] ?? 0;
        return acumulado + importeDoc;
      }, 0),
    );
    setMediosPago([{ ...mediosPago[0], monto: nuevoImporte }]);
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
   * Además valida, por cada documento con cronograma real: que tenga al
   * menos una cuota seleccionada (nunca se asume ni se envía un documento con
   * cronograma sin elección explícita del usuario) y que ninguna cuota
   * seleccionada exceda su propio saldo (defensa adicional: la UI ya lo
   * clampa, pero no debe ser la única barrera).
   */
  function calcularErroresValidacion(): { lista: string[]; porCampo: ErroresPagoPorCampo } {
    const lista: string[] = [];
    const porCampo: ErroresPagoPorCampo = { medios: {} };

    if (!seriePG) lista.push('No hay una serie PG configurada.');
    if (!hayMediosConfigurados) lista.push('No hay medios de pago activos configurados.');

    const aplicacionesSeleccionadas = cxps
      .map((cxp) => ({ cuentaPorPagarId: cxp.id, importeAplicado: obtenerImporteDocumento(cxp) }))
      .filter((a) => a.importeAplicado > 0);
    const erroresAplicaciones = validarAplicacionesPagoCompra(aplicacionesSeleccionadas, cxps);
    if (erroresAplicaciones.length > 0) {
      porCampo.aplicaciones = erroresAplicaciones[0].mensaje;
      lista.push(...erroresAplicaciones.map((e) => e.mensaje));
    }

    cxps.forEach((cxp) => {
      const cuotas = cuotasPorDocumento[cxp.id];
      if (!cuotas) return;
      const asignaciones = asignacionesCuotasPorDocumento[cxp.id] ?? [];
      if (asignaciones.length === 0) {
        const mensaje = `Selecciona al menos una cuota de ${cxp.comprobanteCompraNumero} para registrar el pago.`;
        porCampo.aplicaciones = porCampo.aplicaciones ?? mensaje;
        lista.push(mensaje);
        return;
      }
      const cuotaConImporteInvalido = asignaciones.some((a) => {
        const cuota = cuotas.find((c) => c.numeroCuota === a.installmentNumber);
        const saldoCuota = cuota?.saldo ?? 0;
        return a.amount < 0 || normalizarImporte(a.amount, cxp.moneda) > normalizarImporte(saldoCuota, cxp.moneda);
      });
      if (cuotaConImporteInvalido) {
        const mensaje = `Hay una cuota de ${cxp.comprobanteCompraNumero} con un importe inválido (negativo o mayor a su saldo pendiente).`;
        porCampo.aplicaciones = porCampo.aplicaciones ?? mensaje;
        lista.push(mensaje);
      }
    });

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
        .map((cxp) => {
          const asignacionesInput = asignacionesCuotasPorDocumento[cxp.id];
          if (asignacionesInput) {
            // Documento CON cronograma real: el importe se DERIVA de la suma
            // de las cuotas seleccionadas (§7 del alcance) — nunca un valor
            // aparte que pueda desincronizarse.
            const cuotas = cuotasPorDocumento[cxp.id] ?? [];
            const asignacionesCuotas: AsignacionCuotaPago[] = asignacionesInput
              .filter((a) => a.amount > 0)
              .map((a) => {
                const cuota = cuotas.find((c) => c.numeroCuota === a.installmentNumber);
                const cuotaReal = cxp.cuotas?.find((c) => c.numeroCuota === a.installmentNumber);
                return cuota && cuotaReal ? { cuotaId: cuotaReal.id, monto: round2(a.amount) } : null;
              })
              .filter((x): x is AsignacionCuotaPago => x !== null);
            const importeAplicadoDoc = round2(asignacionesCuotas.reduce((acc, a) => acc + a.monto, 0));
            return {
              cuentaPorPagarId: cxp.id,
              comprobanteCompraId: cxp.comprobanteCompraId,
              importeAplicado: importeAplicadoDoc,
              asignacionesCuotas,
            };
          }
          // Documento SIN cronograma real: importe simple a nivel documento.
          return {
            cuentaPorPagarId: cxp.id,
            comprobanteCompraId: cxp.comprobanteCompraId,
            importeAplicado: aplicacionesSimples[cxp.id] ?? 0,
          };
        })
        .filter((aplicacion) => aplicacion.importeAplicado > 0);

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
    cuotasPorDocumento,
    aplicacionesSimples,
    onCambiarAplicacionSimple,
    asignacionesCuotasPorDocumento,
    onCambiarAsignacionesCuotas,
    obtenerImporteDocumento,
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
