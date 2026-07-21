import { useMemo, useState } from 'react';
import { Breadcrumb, PageHeader } from '@/contasis';
import { FormSectionCard, TwoColumnDocumentFields, CollapsibleNotes } from '@/shared/ui';
import ActionButtonsSection from '../../../comprobantes-electronicos/shared/form-core/components/ActionButtonsSection';
import { useCompras } from '../../contexto/ContextoCompras';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useUserSession } from '@/contexts/UserSessionContext';
import { useFeedback } from '@/shared/feedback';
import { persistirProveedorSiEsNuevo } from '../../servicios/servicioProveedorCompras';
import { validarRequerimientoCompraBasico } from '../../servicios/servicioRequerimientoCompra';
import { calcularTotalesLineas } from '../../logica/reglasCompras';
import { useClientes } from '../../../gestion-clientes/hooks/useClientes';
import BuscadorProveedor, { type ProveedorSeleccionado } from '../BuscadorProveedor';
import AdjuntosCompra from '../adjuntos/AdjuntosCompra';
import { useLineasCompra } from '../items/useLineasCompra';
import SeccionProductosCompra from '../items/SeccionProductosCompra';
import type { MonedaCompra } from '../../modelos/tiposBaseCompras';
import type { RequerimientoCompra } from '../../modelos/RequerimientoCompra';
import type { AdjuntoCompra } from '../../modelos/AdjuntoCompra';
import {
  convertirErroresValidacion,
  enfocarPrimerCampoConError,
  normalizarCampoLineas,
} from '../../modelos/ErroresValidacion';

interface FormularioRequerimientoCompraProps {
  rcBase?: Partial<RequerimientoCompra>;
  onExito: (rc: RequerimientoCompra) => void;
  onCancelar: () => void;
}

export default function FormularioRequerimientoCompra({
  rcBase,
  onExito,
  onCancelar,
}: FormularioRequerimientoCompraProps) {
  const {
    registrarRequerimientoCompra,
    guardarBorradorRC,
    actualizarRequerimientoCompraBorrador,
    registrarRequerimientoCompraDesdeBorrador,
    actualizarRequerimientoCompra,
    refrescarProveedores,
  } = useCompras();
  const esBorradorExistente = Boolean(rcBase?.id) && rcBase?.estadoDocumento === 'borrador';
  const esEdicionRegistrada = Boolean(rcBase?.id) && rcBase?.estadoDocumento !== 'borrador';
  const esEdicion = esBorradorExistente || esEdicionRegistrada;
  const { state: config } = useConfigurationContext();
  const { session } = useUserSession();
  const feedback = useFeedback();
  const { createCliente } = useClientes();

  // Fuentes de verdad desde Configuración
  const monedaDefault = (
    config.currencies.find((c) => c.isBaseCurrency && c.isActive)?.code ?? 'PEN'
  ) as MonedaCompra;

  const seriesRC = config.series.filter(
    (s) => s.documentType?.code === 'RQ' && s.status === 'ACTIVE' && s.isActive,
  );

  const [proveedor, setProveedor] = useState<ProveedorSeleccionado | null>(
    rcBase?.proveedorId
      ? {
          id: rcBase.proveedorId,
          nombre: rcBase.proveedorNombre ?? '',
          tipoDocumento: rcBase.proveedorTipoDocumento ?? '6',
          numeroDocumento: rcBase.proveedorNumeroDocumento ?? '',
        }
      : null,
  );

  const [serieId, setSerieId] = useState(rcBase?.serie ?? seriesRC[0]?.series ?? '');
  const [fechaSolicitud, setFechaSolicitud] = useState(
    rcBase?.fechaSolicitud ?? new Date().toISOString().slice(0, 10),
  );
  const [fechaRequerida, setFechaRequerida] = useState(rcBase?.fechaRequerida ?? '');
  const [moneda, setMoneda] = useState<MonedaCompra>(rcBase?.moneda ?? monedaDefault);
  const [observaciones, setObservaciones] = useState(rcBase?.observaciones ?? '');
  const [adjuntos, setAdjuntos] = useState<AdjuntoCompra[]>(rcBase?.adjuntos ?? []);
  const [enviando, setEnviando] = useState(false);
  const [intentoRegistrar, setIntentoRegistrar] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const lineasCompra = useLineasCompra(rcBase?.lineas ?? [], {
    tratamientoImpuestoCompra: config.preferenciasInventario.tratamientoImpuestoCompra,
    taxes: config.taxes,
  });
  const lineas = lineasCompra.lineas;

  const totalesCalculados = calcularTotalesLineas(lineas);

  // Misma validación que ya aplica el servicio (validarRequerimientoCompraBasico) —
  // el proveedor NUNCA participa aquí: es opcional por diseño, a diferencia de
  // la Orden de Compra.
  const erroresValidacion = useMemo(
    () =>
      convertirErroresValidacion(
        validarRequerimientoCompraBasico({ moneda, fechaSolicitud, lineas }),
      ),
    [moneda, fechaSolicitud, lineas],
  );

  function errorDeCampo(campo: string): string | undefined {
    if (!intentoRegistrar) return undefined;
    return erroresValidacion.find((e) => normalizarCampoLineas(e.campo) === campo)?.mensaje;
  }

  function construirDatosRC() {
    return {
      serie: serieId,
      fechaSolicitud,
      fechaRequerida: fechaRequerida || undefined,
      solicitanteId: rcBase?.solicitanteId ?? session?.userId,
      solicitanteNombre: rcBase?.solicitanteNombre ?? session?.userName,
      proveedorId: proveedor?.id?.toString(),
      proveedorTipoDocumento: proveedor?.tipoDocumento,
      proveedorNumeroDocumento: proveedor?.numeroDocumento,
      proveedorNombre: proveedor?.nombre,
      moneda,
      lineas,
      totales: {
        subtotal: totalesCalculados.subtotal,
        subtotalExonerado: totalesCalculados.subtotalExonerado,
        subtotalInafecto: totalesCalculados.subtotalInafecto,
        descuentoTotal: totalesCalculados.descuentoTotal,
        igv: totalesCalculados.igv,
        total: totalesCalculados.total,
        moneda,
      },
      observaciones: observaciones || undefined,
      adjuntos,
    };
  }

  async function handleGuardarBorrador() {
    setErrorGeneral(null);
    setEnviando(true);
    try {
      const datos = construirDatosRC();
      const rc = esBorradorExistente
        ? await actualizarRequerimientoCompraBorrador(rcBase!.id!, datos, session?.userName)
        : await guardarBorradorRC(datos, session?.userId, session?.userName);
      if (proveedor) {
        await persistirProveedorSiEsNuevo(proveedor, createCliente);
        refrescarProveedores();
      }
      feedback.success(esBorradorExistente ? 'Borrador actualizado.' : 'Borrador guardado.');
      onExito(rc);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'Error al guardar el borrador.';
      setErrorGeneral(mensaje);
      feedback.error(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  async function handleSubmit() {
    setIntentoRegistrar(true);
    if (erroresValidacion.length > 0) {
      enfocarPrimerCampoConError(erroresValidacion);
      return;
    }

    setErrorGeneral(null);
    setEnviando(true);

    try {
      const datos = construirDatosRC();
      const rc = esEdicionRegistrada
        ? await actualizarRequerimientoCompra(rcBase!.id!, datos, session?.userName)
        : esBorradorExistente
          ? await registrarRequerimientoCompraDesdeBorrador(rcBase!.id!, datos, session?.userName)
          : await registrarRequerimientoCompra(datos, session?.userId, session?.userName);
      if (proveedor) {
        await persistirProveedorSiEsNuevo(proveedor, createCliente);
        refrescarProveedores();
      }
      feedback.success(esEdicion ? 'Requerimiento de compra actualizado.' : 'Requerimiento de compra registrado.');
      onExito(rc);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'Error al registrar el requerimiento.';
      setErrorGeneral(mensaje);
      feedback.error(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <PageHeader
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Compras', onClick: onCancelar },
              { label: esEdicion ? 'Editar requerimiento de compra' : 'Nuevo requerimiento de compra' },
            ]}
          />
        }
        title={
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-gray-900 leading-tight">
              {esEdicion ? 'Editar Requerimiento de Compra' : 'Nuevo Requerimiento de Compra'}
            </h1>
            {serieId && (
              <span className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded">{serieId}</span>
            )}
          </div>
        }
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {errorGeneral && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {errorGeneral}
          </div>
        )}

        <FormSectionCard titulo="Datos del requerimiento">
          <TwoColumnDocumentFields
            izquierda={
              <div className="space-y-1" id="campo-proveedorId">
                <label className="text-sm font-medium text-gray-700">
                  Proveedor <span className="text-xs font-normal text-gray-400">(opcional)</span>
                </label>
                <BuscadorProveedor proveedor={proveedor} onSeleccionar={setProveedor} />
              </div>
            }
            derecha={
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Serie</label>
                    {seriesRC.length > 0 ? (
                      <select
                        value={serieId}
                        onChange={(e) => setSerieId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        {seriesRC.map((s) => (
                          <option key={s.id} value={s.series}>
                            {s.series}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="border border-amber-200 bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-700">
                        Sin serie RQ. Ve a Configuración → Series.
                      </div>
                    )}
                  </div>
                  <div className="space-y-1" id="campo-moneda">
                    <label className="text-sm font-medium text-gray-700">Moneda</label>
                    <select
                      value={moneda}
                      onChange={(e) => setMoneda(e.target.value as MonedaCompra)}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        errorDeCampo('moneda') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      {config.currencies.filter((c) => c.isActive).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.symbol} {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                    {errorDeCampo('moneda') && <p className="text-xs text-red-600">{errorDeCampo('moneda')}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1" id="campo-fechaSolicitud">
                    <label className="text-sm font-medium text-gray-700">Fecha de solicitud</label>
                    <input
                      type="date"
                      value={fechaSolicitud}
                      onChange={(e) => setFechaSolicitud(e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        errorDeCampo('fechaSolicitud') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {errorDeCampo('fechaSolicitud') && (
                      <p className="text-xs text-red-600">{errorDeCampo('fechaSolicitud')}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Fecha requerida</label>
                    <input
                      type="date"
                      value={fechaRequerida}
                      onChange={(e) => setFechaRequerida(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Solicitante</label>
                  <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
                    {rcBase?.solicitanteNombre ?? session?.userName ?? 'Usuario no identificado'}
                  </div>
                </div>
              </>
            }
          />
        </FormSectionCard>

        {/* Productos - Servicios (incluye Totales referenciales) */}
        <div id="campo-lineas" className="space-y-1">
          {errorDeCampo('lineas') && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
              {errorDeCampo('lineas')}
            </div>
          )}
          <SeccionProductosCompra
            moneda={moneda}
            lineasCompra={lineasCompra}
            totalesCalculados={totalesCalculados}
            etiquetaCosto="Precio ref."
            etiquetaTotal="Total referencial"
          />
        </div>

        {/* Observaciones */}
        <CollapsibleNotes observaciones={observaciones} onCambiarObservaciones={setObservaciones} />

        {/* Adjuntos */}
        <FormSectionCard titulo="Adjuntos">
          <AdjuntosCompra
            adjuntos={adjuntos}
            tiposPermitidos={['cotizacion_proveedor', 'contrato', 'otro']}
            cargadoPor={session?.userName}
            onAgregar={(a) => {
              setAdjuntos((prev) => [...prev, a]);
              feedback.success('Adjunto agregado.');
            }}
            onEliminar={(id) => {
              setAdjuntos((prev) => prev.filter((a) => a.id !== id));
              feedback.success('Adjunto eliminado.');
            }}
          />
        </FormSectionCard>
      </div>

      <ActionButtonsSection
        onCancelar={onCancelar}
        onGuardarBorrador={esEdicionRegistrada ? undefined : handleGuardarBorrador}
        primaryAction={{
          label: enviando ? 'Guardando...' : esEdicionRegistrada ? 'Actualizar Requerimiento' : 'Registrar Requerimiento',
          onClick: handleSubmit,
          disabled: enviando || seriesRC.length === 0,
          title: seriesRC.length === 0 ? 'Configura una serie RQ en Configuración → Series' : undefined,
        }}
      />
    </div>
  );
}
