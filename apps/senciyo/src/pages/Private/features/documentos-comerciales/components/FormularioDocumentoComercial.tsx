import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, FileText, AlertTriangle } from 'lucide-react';
import ProductsSection from '../../comprobantes-electronicos/shared/form-core/components/ProductsSection';
import NotesSection from '../../comprobantes-electronicos/shared/form-core/components/NotesSection';
import ActionButtonsSection from '../../comprobantes-electronicos/shared/form-core/components/ActionButtonsSection';
import FieldsConfigModal from '../../comprobantes-electronicos/shared/form-core/components/FieldsConfigModal';
import { useCart } from '../../comprobantes-electronicos/punto-venta/hooks/useCart';
import { useCurrency } from '../../comprobantes-electronicos/shared/form-core/hooks/useCurrency';
import { usePayment } from '../../comprobantes-electronicos/shared/form-core/hooks/usePayment';
import { useCreditTermsConfigurator } from '../../comprobantes-electronicos/hooks/useCreditTermsConfigurator';
import { CreditScheduleModal } from '../../comprobantes-electronicos/shared/payments/CreditScheduleModal';
import { CreditScheduleSummaryCard } from '../../comprobantes-electronicos/shared/payments/CreditScheduleSummaryCard';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useTenant } from '@/shared/tenant/TenantContext';
import { useFeedback } from '@/shared/feedback/useFeedback';
import FormularioHeaderComercial from './FormularioHeaderComercial';
import { useDocumentoComercialType } from '../hooks/useDocumentoComercialType';
import { useDocumentoComercialState } from '../hooks/useDocumentoComercialState';
import { useDocumentoComercialActions } from '../hooks/useDocumentoComercialActions';
import { useDocumentoComercialFieldsConfig } from '../hooks/useDocumentoComercialFieldsConfig';
import { useDocumentoComercialDrafts } from '../hooks/useDocumentoComercialDrafts';
import { TIPO_DOCUMENTO_COMERCIAL_LABELS } from '../models/documentoComercial.constants';
import { calcularDesgloseTributos, obtenerFechaHoyISO } from '../utils/documentoComercial.helpers';
import { tieneCambiosComerciales } from '@/shared/documentosComerciales/comparadorComercial';
import type {
  TipoDocumentoComercial,
  DocumentoComercial,
  ModoFormularioDocumentoComercial,
  DatosFormularioDocumentoComercial,
  ClienteDocumentoComercial,
} from '../models/documentoComercial.types';

interface FormularioDocumentoComercialProps {
  tipoInicial: TipoDocumentoComercial;
  modo?: ModoFormularioDocumentoComercial;
  documentoExistente?: DocumentoComercial;
  /** Datos de un documento existente para pre-llenar el formulario sin crear borrador. */
  prefillFrom?: DocumentoComercial;
  /** ID de la cotización origen cuando se convierte a NV u OV. */
  cotizacionOrigenId?: string;
}

export default function FormularioDocumentoComercial({
  tipoInicial,
  modo = 'nuevo',
  documentoExistente,
  prefillFrom,
  cotizacionOrigenId,
}: FormularioDocumentoComercialProps) {
  const navigate = useNavigate();
  const { activeEstablecimientoId } = useTenant();
  const feedback = useFeedback();
  const { state: configState } = useConfigurationContext();

  const estado = useDocumentoComercialState(tipoInicial);
  const tipo = useDocumentoComercialType(tipoInicial);
  const fieldsConfig = useDocumentoComercialFieldsConfig(estado.tipoDocumento);
  const actions = useDocumentoComercialActions();

  const { cartItems, addProductsFromSelector, updateCartItem, removeFromCart,
    agregarItemLibre, actualizarItemCarrito, eliminarItemCarrito,
    clearCart, setCartItemsFromDraft } = useCart('sin_control');
  const { currentCurrency, changeCurrency } = useCurrency();
  const { calculateTotals } = usePayment(currentCurrency);

  const totales = useMemo(() => {
    const base = calculateTotals(cartItems);
    const desglose = calcularDesgloseTributos(cartItems);
    return {
      ...base,
      taxBreakdown: desglose.map((d) => ({
        key: d.key,
        kind: d.kind,
        igvRate: d.igvRate,
        taxableBase: d.taxableBase,
        taxAmount: d.taxAmount,
        totalAmount: Math.round((d.taxableBase + d.taxAmount) * 100) / 100,
      })),
    };
  }, [calculateTotals, cartItems]);
  const inicialized = useRef(false);

  const [errorCliente, setErrorCliente] = useState<string | null>(null);
  const [creditScheduleModalOpen, setCreditScheduleModalOpen] = useState(false);
  const [modalCambiosCotizacion, setModalCambiosCotizacion] = useState<
    'sin_aprobacion' | 'con_aprobacion' | null
  >(null);
  const saltarVerificacionCambiosRef = useRef(false);

  const paymentMethodId = useMemo(() => {
    if (!estado.formaPago) return undefined;
    return configState.paymentMethods.find((m) => m.name === estado.formaPago)?.id ?? undefined;
  }, [estado.formaPago, configState.paymentMethods]);

  const { isCreditMethod, templates, setTemplates, creditTerms, errors: creditErrors, restoreDefaults } =
    useCreditTermsConfigurator({ paymentMethodId, total: totales.total, issueDate: estado.fechaEmision });

  const handleClienteChange = useCallback((c: ClienteDocumentoComercial | null) => {
    estado.setCliente(c);
    if (c) setErrorCliente(null);
  }, [estado]);

  const labelTipo = TIPO_DOCUMENTO_COMERCIAL_LABELS[estado.tipoDocumento];
  const esBorradorEdicion =
    (modo === 'editar' && (documentoExistente?.esBorrador ?? false)) || modo === 'duplicar';

  // Selección automática de la serie por defecto cuando cargan las series disponibles
  useEffect(() => {
    if (!estado.serieSeleccionada && tipo.seriesFiltradas.length > 0) {
      const defaultSerie = tipo.getSerieDefaultParaTipo(tipoInicial);
      estado.setSerieSeleccionada(defaultSerie || tipo.seriesFiltradas[0]);
    }
  }, [tipo.seriesFiltradas]); // eslint-disable-line react-hooks/exhaustive-deps

  // Inicialización del formulario desde documento existente o desde prefill (conversión/duplicar)
  useEffect(() => {
    const source = documentoExistente ?? prefillFrom;
    if (inicialized.current || !source) return;
    inicialized.current = true;

    // Al editar: mantener la serie original. Al convertir a otro tipo: usar la serie por defecto del destino.
    const serieInicial = documentoExistente
      ? source.serie
      : source.tipo === tipoInicial
        ? source.serie
        : '';

    estado.aplicarValoresIniciales({
      tipoDocumento: tipoInicial,
      ...(serieInicial ? { serieSeleccionada: serieInicial } : {}),
      fechaEmision: documentoExistente ? source.fechaEmision : obtenerFechaHoyISO(),
      cliente: source.cliente ?? null,
      moneda: source.moneda,
      formaPago: source.formaPago ?? '',
      camposOpcionales: source.camposOpcionales ?? {},
      observaciones: source.observaciones ?? '',
      notaInterna: source.notaInterna ?? '',
      modoProductos: source.modoItems,
    });

    if (source.items && source.items.length > 0) {
      setCartItemsFromDraft(source.items);
    }

    if (source.moneda !== currentCurrency) {
      changeCurrency(source.moneda);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const obtenerDatosFormulario = useCallback((): DatosFormularioDocumentoComercial => ({
    tipo: estado.tipoDocumento,
    serie: estado.serieSeleccionada,
    fechaEmision: estado.fechaEmision,
    cliente: estado.cliente ?? undefined,
    moneda: estado.moneda,
    formaPago: estado.formaPago,
    creditTerms: isCreditMethod ? creditTerms : undefined,
    items: cartItems,
    modoItems: estado.modoProductos,
    observaciones: estado.observaciones || undefined,
    notaInterna: estado.notaInterna || undefined,
    camposOpcionales: estado.camposOpcionales,
    trazabilidad: undefined,
  }), [estado, cartItems, isCreditMethod, creditTerms]);

  const { limpiarBorrador } = useDocumentoComercialDrafts({
    tipoDocumento: estado.tipoDocumento,
    serieSeleccionada: estado.serieSeleccionada,
    habilitado: modo === 'nuevo' && !prefillFrom && !cotizacionOrigenId,
    extraerEstado: obtenerDatosFormulario,
    aplicarEstado: (datos) => {
      estado.aplicarValoresIniciales({
        tipoDocumento: datos.tipo,
        serieSeleccionada: datos.serie,
        fechaEmision: datos.fechaEmision,
        cliente: datos.cliente ?? null,
        moneda: datos.moneda,
        formaPago: datos.formaPago ?? 'contado',
        camposOpcionales: datos.camposOpcionales ?? {},
        observaciones: datos.observaciones ?? '',
        notaInterna: datos.notaInterna ?? '',
        modoProductos: datos.modoItems,
      });
      if (datos.items.length > 0) {
        setCartItemsFromDraft(datos.items);
      }
    },
    debePersistir: (datos) => datos.items.length > 0 || !!datos.cliente,
  });

  const handleGenerar = useCallback(() => {
    const datos = obtenerDatosFormulario();
    const errorValidacion = actions.validarDatos(datos);
    if (errorValidacion) {
      feedback.warning(errorValidacion);
      if ((datos.tipo === 'orden_venta' || datos.tipo === 'cotizacion') && !datos.cliente) {
        setErrorCliente(errorValidacion);
      }
      return;
    }
    setErrorCliente(null);

    // Verificación de cambios comerciales en flujo de conversión desde cotización (NV/OV).
    // Solo aplica al crear el documento destino (modo !== 'editar'); nunca al editar.
    if (!saltarVerificacionCambiosRef.current && cotizacionOrigenId && prefillFrom && modo !== 'editar') {
      const snapshotOriginal = {
        clienteNumeroDocumento: prefillFrom.cliente?.numeroDocumento ?? null,
        moneda: prefillFrom.moneda,
        formaPago: prefillFrom.formaPago ?? null,
        items: prefillFrom.items.map((i) => ({
          code: i.code ?? null,
          name: i.name ?? null,
          quantity: i.quantity ?? 0,
          price: i.price ?? 0,
        })),
      };
      const snapshotActual = {
        clienteNumeroDocumento: estado.cliente?.numeroDocumento ?? null,
        moneda: currentCurrency,
        formaPago: estado.formaPago ?? null,
        items: cartItems.map((i) => ({
          code: i.code ?? null,
          name: i.name ?? null,
          quantity: i.quantity ?? 0,
          price: i.price ?? 0,
        })),
      };
      if (tieneCambiosComerciales(snapshotOriginal, snapshotActual)) {
        const requiereAprobacion = prefillFrom.camposOpcionales?.requiereAprobacion ?? false;
        const fueAprobada =
          prefillFrom.historial?.some((e) => e.accion === 'Cotización aprobada') ?? false;
        setModalCambiosCotizacion(
          requiereAprobacion && fueAprobada ? 'con_aprobacion' : 'sin_aprobacion',
        );
        return;
      }
    }
    const confirmoConCambios = saltarVerificacionCambiosRef.current && cotizacionOrigenId !== null && prefillFrom !== null;
    saltarVerificacionCambiosRef.current = false;

    let resultado;
    if (esBorradorEdicion && documentoExistente) {
      resultado = actions.generarDesdeBorrador(documentoExistente.id, datos);
    } else if (modo === 'editar' && documentoExistente) {
      resultado = actions.actualizarDocumento(documentoExistente.id, datos);
    } else {
      resultado = actions.generarDocumento(datos);
    }

    if (resultado.exito) {
      if (cotizacionOrigenId && resultado.documento) {
        actions.vincularDocumentoConCotizacion(
          cotizacionOrigenId,
          resultado.documento.id,
          resultado.documento.numero ?? '',
          resultado.documento.tipo,
          confirmoConCambios ? {
            items: datos.items,
            cliente: datos.cliente,
            moneda: datos.moneda,
            formaPago: datos.formaPago || undefined,
          } : undefined,
        );
      }
      // Regla 7: al editar una NV/OV generada desde cotización, sincronizar datos comerciales
      if (
        modo === 'editar' &&
        !esBorradorEdicion &&
        documentoExistente?.tipo !== 'cotizacion' &&
        documentoExistente?.trazabilidad?.documentoOrigenId
      ) {
        actions.sincronizarCotizacionDesdeDocumento(documentoExistente.id);
      }
      const msg = modo === 'editar' && !esBorradorEdicion
        ? `${labelTipo} actualizada exitosamente.`
        : `${labelTipo} generada exitosamente.`;
      feedback.success(msg);
      if (modo !== 'editar' || esBorradorEdicion) limpiarBorrador();
      clearCart();
      navigate('/documentos-comerciales', { state: { tipo: estado.tipoDocumento } });
    } else {
      feedback.error(resultado.error ?? 'Error al procesar el documento.');
    }
  }, [
    obtenerDatosFormulario, actions, esBorradorEdicion, documentoExistente,
    modo, labelTipo, feedback, limpiarBorrador, clearCart, navigate, estado.tipoDocumento,
    estado.cliente, estado.formaPago, setErrorCliente, cotizacionOrigenId,
    prefillFrom, currentCurrency, cartItems,
  ]);

  const handleConfirmarGuardar = useCallback(() => {
    setModalCambiosCotizacion(null);
    saltarVerificacionCambiosRef.current = true;
    handleGenerar();
  }, [handleGenerar]);

  const handleRevertirCambios = useCallback(() => {
    if (!prefillFrom) return;
    estado.aplicarValoresIniciales({
      tipoDocumento: tipoInicial,
      cliente: prefillFrom.cliente ?? null,
      moneda: prefillFrom.moneda,
      formaPago: prefillFrom.formaPago ?? '',
      observaciones: prefillFrom.observaciones ?? '',
      notaInterna: prefillFrom.notaInterna ?? '',
      camposOpcionales: prefillFrom.camposOpcionales ?? {},
      modoProductos: prefillFrom.modoItems,
    });
    setCartItemsFromDraft(prefillFrom.items);
    changeCurrency(prefillFrom.moneda);
    setModalCambiosCotizacion(null);
  }, [prefillFrom, tipoInicial, estado, setCartItemsFromDraft, changeCurrency]);

  const handleActualizarBorrador = useCallback(() => {
    if (!documentoExistente) return;
    const datos = obtenerDatosFormulario();
    const resultado = actions.actualizarDocumento(documentoExistente.id, datos);
    if (resultado.exito) {
      feedback.success(`Cambios guardados en borrador de ${labelTipo.toLowerCase()}.`);
      navigate('/documentos-comerciales', { state: { tipo: estado.tipoDocumento } });
    } else {
      feedback.error(resultado.error ?? 'Error al guardar cambios.');
    }
  }, [documentoExistente, obtenerDatosFormulario, actions, feedback, labelTipo, navigate, estado.tipoDocumento]);

  const handleGuardarBorrador = useCallback(() => {
    const datos = obtenerDatosFormulario();
    const resultado = actions.guardarComoBorrador(datos);
    if (resultado.exito) {
      feedback.success(`Borrador de ${labelTipo.toLowerCase()} guardado.`);
      limpiarBorrador();
      clearCart();
      navigate('/documentos-comerciales', { state: { tipo: estado.tipoDocumento } });
    } else {
      feedback.error('Error al guardar el borrador.');
    }
  }, [obtenerDatosFormulario, actions, labelTipo, feedback, limpiarBorrador, clearCart, navigate, estado.tipoDocumento]);

  const handleCancelar = useCallback(() => {
    limpiarBorrador();
    clearCart();
    if (cotizacionOrigenId) {
      // Regla 8: cancelar conversión devuelve al listado de cotizaciones con drawer abierto
      navigate('/documentos-comerciales', {
        state: { tipo: 'cotizacion', abrirDetalleId: cotizacionOrigenId },
      });
    } else {
      navigate('/documentos-comerciales', { state: { tipo: estado.tipoDocumento } });
    }
  }, [limpiarBorrador, clearCart, navigate, estado.tipoDocumento, cotizacionOrigenId]);

  const handleMonedaChange = useCallback(
    (moneda: typeof currentCurrency) => {
      estado.setMoneda(moneda);
      changeCurrency(moneda);
    },
    [estado, changeCurrency],
  );

  const esSinSerie = tipo.seriesFiltradas.length === 0;
  const estaVacio = cartItems.length === 0;

  const generarDeshabilitado = useMemo(() => {
    if (esSinSerie && modo !== 'editar') return true;
    if (estado.tipoDocumento === 'cotizacion' && modo !== 'editar') {
      return !estado.cliente || cartItems.length === 0;
    }
    return false;
  }, [esSinSerie, modo, estado.tipoDocumento, estado.cliente, cartItems.length]);

  const tituloFormulario =
    modo === 'nuevo'
      ? `Nueva ${labelTipo.toLowerCase()}`
      : modo === 'duplicar'
      ? `Nueva ${labelTipo.toLowerCase()}`
      : esBorradorEdicion
      ? `Retomar borrador de ${labelTipo.toLowerCase()}`
      : `Editar ${documentoExistente?.numero ?? labelTipo.toLowerCase()}`;

  const labelBotonPrimario = modo === 'editar' && !esBorradorEdicion
    ? 'Guardar cambios'
    : `Generar ${labelTipo.toLowerCase()}`;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-gray-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 flex items-center gap-3">
        <FileText size={18} className="text-violet-600 dark:text-violet-400" />
        <div>
          <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
            {tituloFormulario}
          </h1>
          {esSinSerie && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Sin series configuradas para {labelTipo.toLowerCase()}. Configure una serie en Configuración → Series.
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Regla 3: advertencia al editar cotización Aceptada — la edición invalida la aceptación */}
        {modo === 'editar' &&
          documentoExistente?.tipo === 'cotizacion' &&
          documentoExistente?.estado === 'Aceptada' && (
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Editando una cotización aceptada
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Al guardar los cambios, la aceptación quedará invalidada y la cotización
                volverá al estado Vigente o Pendiente aprobación según la configuración actual.
              </p>
            </div>
          </div>
        )}
        <FormularioHeaderComercial
          tipoDocumento={estado.tipoDocumento}
          serieSeleccionada={estado.serieSeleccionada}
          seriesFiltradas={tipo.seriesFiltradas}
          onSerieChange={estado.setSerieSeleccionada}
          fechaEmision={estado.fechaEmision}
          onFechaEmisionChange={estado.setFechaEmision}
          moneda={estado.moneda}
          onMonedaChange={handleMonedaChange}
          formaPago={estado.formaPago}
          onFormaPagoChange={estado.setFormaPago}
          cliente={estado.cliente}
          onClienteChange={handleClienteChange}
          errorCliente={errorCliente}
          camposOpcionales={estado.camposOpcionales}
          onCampoOpcionalChange={estado.setCampoOpcional}
          fieldsConfig={fieldsConfig.config}
          onAbrirConfigCampos={estado.abrirConfigCampos}
        />

        {isCreditMethod && (
          <CreditScheduleSummaryCard
            creditTerms={creditTerms}
            currency={estado.moneda}
            total={totales.total}
            onConfigure={() => setCreditScheduleModalOpen(true)}
            errors={creditErrors}
          />
        )}

        <ProductsSection
          cartItems={cartItems}
          addProductsFromSelector={addProductsFromSelector}
          updateCartItem={updateCartItem}
          removeFromCart={removeFromCart}
          agregarItemLibre={agregarItemLibre}
          actualizarItemCarrito={actualizarItemCarrito}
          eliminarItemCarrito={eliminarItemCarrito}
          modoProductosActual={estado.modoProductos}
          onModoProductosChange={estado.setModoProductos}
          totals={totales}
          selectedEstablecimientoId={activeEstablecimientoId ?? undefined}
          preferredPriceColumnId={undefined}
          mostrarDetalleCompleto={false}
        />

        {fieldsConfig.config.notesSection && (
          <NotesSection
            observaciones={estado.observaciones}
            setObservaciones={estado.setObservaciones}
            notaInterna={estado.notaInterna}
            setNotaInterna={estado.setNotaInterna}
            collapsible
            defaultExpanded={false}
          />
        )}
      </div>

      <ActionButtonsSection
        onCancelar={handleCancelar}
        onGuardarBorrador={
          esBorradorEdicion
            ? undefined
            : fieldsConfig.config.actionButtons.guardarBorrador && modo === 'nuevo'
            ? handleGuardarBorrador
            : undefined
        }
        onVistaPrevia={undefined}
        isCartEmpty={estaVacio}
        primaryAction={{
          label: labelBotonPrimario,
          onClick: handleGenerar,
          icon: <Save size={14} />,
          disabled: generarDeshabilitado,
          title: esSinSerie && modo !== 'editar'
            ? `Configure una serie de ${labelTipo.toLowerCase()} en Configuración → Series`
            : estado.tipoDocumento === 'cotizacion' && !estado.cliente
            ? 'Seleccione un cliente para generar la cotización'
            : estado.tipoDocumento === 'cotizacion' && cartItems.length === 0
            ? 'Agregue al menos un producto o servicio'
            : undefined,
        }}
        secondaryAction={
          esBorradorEdicion
            ? {
                label: modo === 'duplicar' ? 'Guardar borrador' : 'Guardar cambios',
                onClick: handleActualizarBorrador,
                icon: <Save size={14} />,
              }
            : undefined
        }
      />

      <FieldsConfigModal
        isOpen={estado.showFieldsConfigModal}
        onClose={estado.cerrarConfigCampos}
        config={fieldsConfig.config}
        onToggleNotesSection={fieldsConfig.toggleNotesSection}
        onToggleActionButton={fieldsConfig.toggleActionButton}
        onToggleOptionalField={fieldsConfig.toggleOptionalField}
        onToggleOptionalFieldRequired={fieldsConfig.toggleOptionalFieldRequired}
        onResetToDefaults={fieldsConfig.resetToDefaults}
      />

      <CreditScheduleModal
        isOpen={creditScheduleModalOpen}
        templates={templates}
        onChange={setTemplates}
        onSave={() => setCreditScheduleModalOpen(false)}
        onCancel={() => { restoreDefaults(); setCreditScheduleModalOpen(false); }}
        onRestoreDefaults={restoreDefaults}
        errors={creditErrors}
      />

      {/* Modal de control de cambios comerciales en conversión desde cotización */}
      {modalCambiosCotizacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            {modalCambiosCotizacion === 'sin_aprobacion' ? (
              <>
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                      Datos modificados respecto a la cotización
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      Cambiaste información comercial (cliente, productos, precios, moneda o forma de pago)
                      que proviene de la cotización. Al confirmar, estos cambios también quedarán
                      reflejados en la cotización de origen.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setModalCambiosCotizacion(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Volver y revisar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmarGuardar}
                    className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    Confirmar y guardar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                      No se pueden modificar datos de la cotización aprobada
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      Esta cotización fue aprobada internamente. No puedes modificar datos
                      comerciales (cliente, productos, precios, moneda o forma de pago)
                      durante la conversión.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleCancelar}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Volver a la cotización
                  </button>
                  <button
                    type="button"
                    onClick={handleRevertirCambios}
                    className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    Continuar sin modificar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
