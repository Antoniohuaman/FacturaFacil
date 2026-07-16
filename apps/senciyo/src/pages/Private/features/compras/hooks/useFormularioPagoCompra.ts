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
import { esMedioBancario, requiereReferencia, tieneMedioDeCaja } from '../servicios/servicioPagoCompra';
import { calcularDiasCredito } from '../servicios/servicioCuentaPorPagar';
import { resolverNombreFormaPago } from '../logica/reglasCompras';
import type { CuentaPorPagar } from '../modelos/CuentaPorPagar';
import { ESTADO_PAGO_CXP_LABELS } from '../modelos/CuentaPorPagar';
import type { MedioPagoCompra } from '../modelos/PagoCompra';
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
  allocations?: string;
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
 * Cuotas reales de la CxP (crédito, generadas por generarCuotasDesdeCC) como
 * `CreditInstallment[]` para reutilizar CreditInstallmentsTable en modo
 * `allocation` — el mismo componente y patrón que ya usa Cobranzas. Si la CxP
 * no trae cuotas (contado / dato heredado), se sintetiza una única cuota a
 * partir del propio saldo de la CxP, para que el usuario siempre pague desde
 * la misma tabla de selección real.
 */
function construirCuotasParaFormulario(cxp: CuentaPorPagar): CreditInstallment[] {
  if (cxp.cuotas && cxp.cuotas.length > 0) {
    return cxp.cuotas.map((cuota) => ({
      numeroCuota: cuota.numeroCuota,
      fechaVencimiento: cuota.fechaVencimiento,
      importe: cuota.montoCuota,
      pagado: cuota.montoPagado,
      saldo: cuota.saldoPendiente,
      diasCredito: calcularDiasCredito(cxp.fechaEmision, cuota.fechaVencimiento) ?? 0,
      porcentaje: cxp.total > 0 ? round2((cuota.montoCuota / cxp.total) * 100) : 0,
      // Etiqueta ya resuelta con la terminología oficial de Cuentas por
      // Pagar — el componente compartido no decide ni conoce "Pagada".
      estado: ESTADO_PAGO_CXP_LABELS[cuota.estadoPago],
    }));
  }
  return [
    {
      numeroCuota: 1,
      fechaVencimiento: cxp.fechaVencimiento ?? cxp.fechaEmision,
      importe: cxp.total,
      pagado: cxp.totalPagado,
      saldo: cxp.saldoPendiente,
      diasCredito: calcularDiasCredito(cxp.fechaEmision, cxp.fechaVencimiento) ?? 0,
      porcentaje: 100,
      estado: ESTADO_PAGO_CXP_LABELS[cxp.estadoPago],
    },
  ];
}

/**
 * Estado y lógica del formulario de página completa de Registro de Pago de
 * Compra. Fase 1: una sola Cuenta por Pagar (con su cuota real, generada por
 * generarCuotasDesdeCC), sin pago múltiple de CxP.
 *
 * Los medios de pago provienen exclusivamente del catálogo real de
 * Configuración de Negocio → Pagos → Medios de pago (getConfiguredPaymentMeans,
 * @/shared/payments/paymentMeans). "Contado"/"Crédito" son la condición
 * comercial del comprobante origen (CuentaPorPagar.formaPago) y nunca entran
 * a este catálogo ni al modelo MedioPagoCompra.
 */
export function useFormularioPagoCompra(cxp: CuentaPorPagar) {
  const { state: comprasState, registrarPagoCompra } = useCompras();
  const { state: config } = useConfigurationContext();
  const { status: estadoCaja } = useCaja();
  const { accounts: cuentasBancarias } = useBankAccounts();
  const { session } = useUserSession();
  const feedback = useFeedback();
  const monedaBase = config.currencies.find((c) => c.isBaseCurrency)?.code ?? cxp.moneda;

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
    (c) => c.isVisible && c.currencyCode === cxp.moneda,
  );

  const formaPagoNombre = resolverNombreFormaPago(cxp, config.paymentMethods);

  const installments = useMemo(() => construirCuotasParaFormulario(cxp), [cxp]);
  const [allocations, setAllocations] = useState<CreditInstallmentAllocationInput[]>(() =>
    installments
      .filter((cuota) => normalizarImporte(cuota.saldo ?? 0, cxp.moneda) > 0)
      .map((cuota) => ({ installmentNumber: cuota.numeroCuota, amount: cuota.saldo ?? 0 })),
  );
  const importeAplicado = round2(allocations.reduce((acumulado, a) => acumulado + (a.amount || 0), 0));

  const [fechaPago, setFechaPago] = useState(() => new Date().toISOString().slice(0, 10));
  const [tipoCambio, setTipoCambio] = useState('');
  const [medioSincronizado, setMedioSincronizado] = useState(true);
  const [mediosPago, setMediosPago] = useState<MedioPagoCompra[]>(() => [
    crearMedioDesde(medioPorDefecto, cxp.saldoPendiente),
  ]);
  const [documentoSustentoTipo, setDocumentoSustentoTipo] = useState('');
  const [documentoSustentoSerie, setDocumentoSustentoSerie] = useState('');
  const [documentoSustentoNumero, setDocumentoSustentoNumero] = useState('');
  const [concepto, setConcepto] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [adjuntos, setAdjuntos] = useState<AdjuntoCompra[]>([]);
  const [enviando, setEnviando] = useState(false);
  // Mismo esquema que los formularios de OC/CC: sin errores en un formulario
  // recién abierto, solo tras un intento real de registrar el pago — y se
  // recalculan en cada render, así que desaparecen apenas el dato vuelve a
  // ser válido. `errorGeneral` es exclusivamente el fallo real de un intento
  // de envío (excepción del servicio), nunca una regla de campo.
  const [intentoRegistrar, setIntentoRegistrar] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const totalMedios = round2(mediosPago.reduce((acc, m) => acc + (m.monto || 0), 0));
  const diferencia = round2(importeAplicado - totalMedios);
  const saldoResultante = Math.max(0, round2(cxp.saldoPendiente - importeAplicado));

  const hayMedioDeCaja = tieneMedioDeCaja(mediosPago);
  const hayMedioBancarioSinCuentaCompatible =
    cuentasBancariasCompatibles.length === 0 && mediosPago.some((m) => esMedioBancario(m.medioPagoCodigo));

  /**
   * Selección real de cuotas/saldo a pagar: una, varias, completas o
   * parciales, con posibilidad de desmarcar (CreditInstallmentsTable en modo
   * `allocation` ya implementa el toggle/edición/clamping a saldo). Si solo
   * hay un medio y el usuario aún no lo editó manualmente, el medio se
   * mantiene sincronizado con el nuevo importe total seleccionado.
   */
  function onChangeAllocations(nuevasAsignaciones: CreditInstallmentAllocationInput[]) {
    setAllocations(nuevasAsignaciones);
    const nuevoImporte = round2(nuevasAsignaciones.reduce((acumulado, a) => acumulado + (a.amount || 0), 0));
    if (mediosPago.length === 1 && medioSincronizado) {
      setMediosPago([{ ...mediosPago[0], monto: nuevoImporte }]);
    }
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
   * reglas separadas para lo mismo. Los casos que ya tienen un aviso propio
   * siempre visible (sin serie PG, sin medios configurados, caja cerrada,
   * sin cuentas bancarias compatibles) no repiten el mensaje aquí: siguen
   * bloqueando el envío, pero no se muestran una segunda vez en otro lugar.
   */
  function calcularErroresValidacion(): { lista: string[]; porCampo: ErroresPagoPorCampo } {
    const lista: string[] = [];
    const porCampo: ErroresPagoPorCampo = { medios: {} };

    if (!seriePG) lista.push('No hay una serie PG configurada.');
    if (!hayMediosConfigurados) lista.push('No hay medios de pago activos configurados.');

    if (allocations.length === 0) {
      porCampo.allocations = 'Selecciona al menos una cuota o el saldo a pagar.';
    } else if (importeAplicado <= 0) {
      porCampo.allocations = 'El importe a pagar debe ser mayor a cero.';
    } else if (normalizarImporte(importeAplicado, cxp.moneda) > normalizarImporte(cxp.saldoPendiente, cxp.moneda)) {
      porCampo.allocations = `El importe a pagar (${importeAplicado.toFixed(2)}) no puede superar el saldo pendiente (${cxp.saldoPendiente.toFixed(2)}).`;
    } else {
      const cuotaConImporteInvalido = allocations.some((a) => {
        const cuota = installments.find((i) => i.numeroCuota === a.installmentNumber);
        const saldoCuota = cuota?.saldo ?? 0;
        return a.amount < 0 || normalizarImporte(a.amount, cxp.moneda) > normalizarImporte(saldoCuota, cxp.moneda);
      });
      if (cuotaConImporteInvalido) {
        porCampo.allocations = 'Hay una cuota con un importe inválido (negativo o mayor a su saldo pendiente).';
      }
    }
    if (porCampo.allocations) lista.push(porCampo.allocations);

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

    if (normalizarImporte(diferencia, cxp.moneda) !== 0) {
      porCampo.diferencia = `La suma de medios de pago (${totalMedios.toFixed(2)}) debe coincidir exactamente con el importe a pagar (${importeAplicado.toFixed(2)}).`;
      lista.push(porCampo.diferencia);
    }
    if (hayMedioBancarioSinCuentaCompatible) {
      lista.push(`No hay cuentas bancarias registradas en ${cxp.moneda}.`);
    }
    if (hayMedioDeCaja && estadoCaja !== 'abierta') {
      lista.push('La caja está cerrada.');
    }
    if (cxp.moneda !== monedaBase && (!tipoCambio || parseFloat(tipoCambio) <= 0)) {
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
      // Solo se envían asignaciones exactas por cuota cuando la CxP tiene un
      // cronograma real (cxp.cuotas) — para el caso sintético de contado, el
      // pago se sigue registrando de forma agregada (comportamiento actual).
      const asignacionesCuotas =
        cxp.cuotas && cxp.cuotas.length > 0
          ? allocations
              .map((a) => {
                const cuota = cxp.cuotas!.find((c) => c.numeroCuota === a.installmentNumber);
                return cuota ? { cuotaId: cuota.id, monto: round2(a.amount) } : null;
              })
              .filter((asignacion): asignacion is { cuotaId: string; monto: number } => asignacion !== null)
          : undefined;

      const pago = await registrarPagoCompra(
        {
          fechaPago,
          proveedorId: cxp.proveedorId,
          proveedorNombre: cxp.proveedorNombre,
          moneda: cxp.moneda,
          tipoCambio: tipoCambio ? parseFloat(tipoCambio) : undefined,
          montoTotalPagado: importeAplicado,
          mediosPago,
          cuentasPorPagarAplicadas: [cxp.id],
          comprobantesCompraAplicados: [cxp.comprobanteCompraId],
          asignacionesCuotas,
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
    monedaBase,
    seriePG,
    numeroPagoPreview,
    mediosDisponibles,
    hayMediosConfigurados,
    cuentasBancariasCompatibles,
    formaPagoNombre,
    installments,
    allocations,
    onChangeAllocations,
    fechaPago,
    setFechaPago,
    tipoCambio,
    setTipoCambio,
    importeAplicado,
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
    saldoResultante,
    hayMedioDeCaja,
    estadoCaja,
    hayMedioBancarioSinCuentaCompatible,
    bloqueadoEstructural,
    registrarPago,
  };
}

export type UseFormularioPagoCompraResultado = ReturnType<typeof useFormularioPagoCompra>;
