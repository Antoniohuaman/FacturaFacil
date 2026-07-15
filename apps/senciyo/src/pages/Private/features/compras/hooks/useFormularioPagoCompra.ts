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
  const [errores, setErrores] = useState<string[]>([]);

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
   * Única fuente de verdad de validación del formulario: la usan tanto
   * `puedeRegistrar` (para deshabilitar el botón) como `registrarPago` (para
   * bloquear el envío con mensajes claros) — evita reglas duplicadas.
   */
  function calcularErroresValidacion(): string[] {
    const nuevosErrores: string[] = [];
    if (!seriePG) {
      nuevosErrores.push('No hay una serie PG configurada. Ve a Configuración → Series y crea una serie de tipo "Pago de Compra".');
    }
    if (!hayMediosConfigurados) {
      nuevosErrores.push('No hay medios de pago activos configurados.');
    }
    if (allocations.length === 0) {
      nuevosErrores.push('Selecciona al menos una cuota o el saldo a pagar.');
    }
    if (importeAplicado <= 0) {
      nuevosErrores.push('El importe a pagar debe ser mayor a cero.');
    }
    if (normalizarImporte(importeAplicado, cxp.moneda) > normalizarImporte(cxp.saldoPendiente, cxp.moneda)) {
      nuevosErrores.push(`El importe a pagar (${importeAplicado.toFixed(2)}) no puede superar el saldo pendiente (${cxp.saldoPendiente.toFixed(2)}).`);
    }
    const cuotaConImporteInvalido = allocations.some((a) => {
      const cuota = installments.find((i) => i.numeroCuota === a.installmentNumber);
      const saldoCuota = cuota?.saldo ?? 0;
      return a.amount < 0 || normalizarImporte(a.amount, cxp.moneda) > normalizarImporte(saldoCuota, cxp.moneda);
    });
    if (cuotaConImporteInvalido) {
      nuevosErrores.push('Hay una cuota con un importe inválido (negativo o mayor a su saldo pendiente).');
    }
    if (mediosPago.length === 0) {
      nuevosErrores.push('Agrega al menos un medio de pago.');
    }
    if (mediosPago.some((m) => !m.medioPagoCodigo)) {
      nuevosErrores.push('Selecciona el medio de pago en todas las filas.');
    }
    if (mediosPago.some((m) => m.monto <= 0)) {
      nuevosErrores.push('Todos los importes de medios de pago deben ser mayores a cero.');
    }
    if (normalizarImporte(diferencia, cxp.moneda) !== 0) {
      nuevosErrores.push(`La suma de medios de pago (${totalMedios.toFixed(2)}) debe coincidir exactamente con el importe a pagar (${importeAplicado.toFixed(2)}).`);
    }
    mediosPago.forEach((m, i) => {
      if (!m.medioPagoCodigo) return;
      if (esMedioBancario(m.medioPagoCodigo) && !m.cuentaBancariaId) {
        nuevosErrores.push(`Selecciona la cuenta bancaria en la línea ${i + 1}.`);
      }
      if (requiereReferencia(m.medioPagoCodigo) && !m.referenciaOperacion?.trim()) {
        nuevosErrores.push(`Ingresa la referencia/N° de operación en la línea ${i + 1}.`);
      }
    });
    if (hayMedioBancarioSinCuentaCompatible) {
      nuevosErrores.push(`No hay cuentas bancarias registradas en ${cxp.moneda}. Configura una cuenta en esa moneda antes de continuar.`);
    }
    if (hayMedioDeCaja && estadoCaja !== 'abierta') {
      nuevosErrores.push('La caja está cerrada. Abre una caja para registrar el pago en efectivo.');
    }
    if (cxp.moneda !== monedaBase && (!tipoCambio || parseFloat(tipoCambio) <= 0)) {
      nuevosErrores.push('El tipo de cambio es obligatorio y debe ser mayor a 0.');
    }
    return nuevosErrores;
  }

  const puedeRegistrar = calcularErroresValidacion().length === 0;

  async function registrarPago(): Promise<boolean> {
    if (enviando) return false;

    const nuevosErrores = calcularErroresValidacion();

    if (nuevosErrores.length > 0) {
      setErrores(nuevosErrores);
      return false;
    }

    setErrores([]);
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
      setErrores([e instanceof Error ? e.message : 'Error al registrar el pago.']);
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
    errores,
    totalMedios,
    diferencia,
    saldoResultante,
    hayMedioDeCaja,
    estadoCaja,
    hayMedioBancarioSinCuentaCompatible,
    puedeRegistrar,
    registrarPago,
  };
}

export type UseFormularioPagoCompraResultado = ReturnType<typeof useFormularioPagoCompra>;
