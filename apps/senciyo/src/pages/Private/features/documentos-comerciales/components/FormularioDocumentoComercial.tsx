import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, FileText } from 'lucide-react';
import ProductsSection from '../../comprobantes-electronicos/shared/form-core/components/ProductsSection';
import NotesSection from '../../comprobantes-electronicos/shared/form-core/components/NotesSection';
import ActionButtonsSection from '../../comprobantes-electronicos/shared/form-core/components/ActionButtonsSection';
import FieldsConfigModal from '../../comprobantes-electronicos/shared/form-core/components/FieldsConfigModal';
import { useCart } from '../../comprobantes-electronicos/punto-venta/hooks/useCart';
import { useCurrency } from '../../comprobantes-electronicos/shared/form-core/hooks/useCurrency';
import { usePayment } from '../../comprobantes-electronicos/shared/form-core/hooks/usePayment';
import { useTenant } from '@/shared/tenant/TenantContext';
import { useFeedback } from '@/shared/feedback/useFeedback';
import FormularioHeaderComercial from './FormularioHeaderComercial';
import { useDocumentoComercialType } from '../hooks/useDocumentoComercialType';
import { useDocumentoComercialState } from '../hooks/useDocumentoComercialState';
import { useDocumentoComercialActions } from '../hooks/useDocumentoComercialActions';
import { useDocumentoComercialFieldsConfig } from '../hooks/useDocumentoComercialFieldsConfig';
import { useDocumentoComercialDrafts } from '../hooks/useDocumentoComercialDrafts';
import { TIPO_DOCUMENTO_COMERCIAL_LABELS } from '../models/documentoComercial.constants';
import { calcularDesgloseTributos } from '../utils/documentoComercial.helpers';
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
}

export default function FormularioDocumentoComercial({
  tipoInicial,
  modo = 'nuevo',
  documentoExistente,
}: FormularioDocumentoComercialProps) {
  const navigate = useNavigate();
  const { activeEstablecimientoId } = useTenant();
  const feedback = useFeedback();

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

  const handleClienteChange = useCallback((c: ClienteDocumentoComercial | null) => {
    estado.setCliente(c);
    if (c) setErrorCliente(null);
  }, [estado]);

  const labelTipo = TIPO_DOCUMENTO_COMERCIAL_LABELS[estado.tipoDocumento];
  const esBorradorEdicion =
    (modo === 'editar' && (documentoExistente?.esBorrador ?? false)) || modo === 'duplicar';

  useEffect(() => {
    if (!estado.serieSeleccionada && tipo.seriesFiltradas.length > 0) {
      estado.setSerieSeleccionada(tipo.seriesFiltradas[0]);
    }
  }, [tipo.seriesFiltradas]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (inicialized.current || !documentoExistente) return;
    inicialized.current = true;

    estado.aplicarValoresIniciales({
      tipoDocumento: documentoExistente.tipo,
      serieSeleccionada: documentoExistente.serie,
      fechaEmision: documentoExistente.fechaEmision,
      cliente: documentoExistente.cliente ?? null,
      moneda: documentoExistente.moneda,
      formaPago: documentoExistente.formaPago ?? '',
      camposOpcionales: documentoExistente.camposOpcionales ?? {},
      observaciones: documentoExistente.observaciones ?? '',
      notaInterna: documentoExistente.notaInterna ?? '',
      modoProductos: documentoExistente.modoItems,
    });

    if (documentoExistente.items && documentoExistente.items.length > 0) {
      setCartItemsFromDraft(documentoExistente.items);
    }

    if (documentoExistente.moneda !== currentCurrency) {
      changeCurrency(documentoExistente.moneda);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const obtenerDatosFormulario = useCallback((): DatosFormularioDocumentoComercial => ({
    tipo: estado.tipoDocumento,
    serie: estado.serieSeleccionada,
    fechaEmision: estado.fechaEmision,
    cliente: estado.cliente ?? undefined,
    moneda: estado.moneda,
    formaPago: estado.formaPago,
    items: cartItems,
    modoItems: estado.modoProductos,
    observaciones: estado.observaciones || undefined,
    notaInterna: estado.notaInterna || undefined,
    camposOpcionales: estado.camposOpcionales,
    trazabilidad: undefined,
  }), [estado, cartItems]);

  const { limpiarBorrador } = useDocumentoComercialDrafts({
    tipoDocumento: estado.tipoDocumento,
    serieSeleccionada: estado.serieSeleccionada,
    habilitado: modo === 'nuevo',
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
      if (datos.tipo === 'orden_venta' && !datos.cliente) {
        setErrorCliente(errorValidacion);
      }
      return;
    }
    setErrorCliente(null);

    let resultado;
    if (esBorradorEdicion && documentoExistente) {
      resultado = actions.generarDesdeBorrador(documentoExistente.id, datos);
    } else if (modo === 'editar' && documentoExistente) {
      resultado = actions.actualizarDocumento(documentoExistente.id, datos);
    } else {
      resultado = actions.generarDocumento(datos);
    }

    if (resultado.exito) {
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
    setErrorCliente,
  ]);

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
    navigate('/documentos-comerciales', { state: { tipo: estado.tipoDocumento } });
  }, [limpiarBorrador, clearCart, navigate, estado.tipoDocumento]);

  const handleMonedaChange = useCallback(
    (moneda: typeof currentCurrency) => {
      estado.setMoneda(moneda);
      changeCurrency(moneda);
    },
    [estado, changeCurrency],
  );

  const esSinSerie = tipo.seriesFiltradas.length === 0;
  const estaVacio = cartItems.length === 0;

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
          disabled: esSinSerie && modo !== 'editar',
          title: esSinSerie && modo !== 'editar'
            ? `Configure una serie de ${labelTipo.toLowerCase()} en Configuración → Series`
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
    </div>
  );
}
