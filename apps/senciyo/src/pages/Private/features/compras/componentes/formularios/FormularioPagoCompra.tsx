import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Breadcrumb, PageHeader } from '@/contasis';
import { formatMoney } from '@/shared/currency';
import { useUserSession } from '@/contexts/UserSessionContext';
import {
  FormSectionCard,
  TwoColumnDocumentFields,
  CollapsibleNotes,
  DocumentFormFooter,
  FieldsConfigurationModal,
  useConfiguracionCampos,
  type CampoConfigurableDocumento,
} from '@/shared/ui';
import { useFormularioPagoCompra } from '../../hooks/useFormularioPagoCompra';
import TablaAplicacionPagoCompra from '../pagos/TablaAplicacionPagoCompra';
import EditorMediosPagoCompra from '../pagos/EditorMediosPagoCompra';
import ResumenPagoCompra from '../pagos/ResumenPagoCompra';
import AdjuntosCompra from '../adjuntos/AdjuntosCompra';
import type { CuentaPorPagar } from '../../modelos/CuentaPorPagar';
import { enfocarPrimerCampoConError } from '../../modelos/ErroresValidacion';

interface FormularioPagoCompraProps {
  cxp: CuentaPorPagar;
  onExito: () => void;
  onCancelar: () => void;
}

const CAMPOS_PAGO_DEFAULT: CampoConfigurableDocumento[] = [
  { id: 'documentoSustento', label: 'Documento sustentatorio', visible: false },
];
const STORAGE_KEY_CAMPOS_PAGO = 'compras_pago_campos_config';

export default function FormularioPagoCompra({ cxp, onExito, onCancelar }: FormularioPagoCompraProps) {
  const { session } = useUserSession();
  const f = useFormularioPagoCompra(cxp);
  const { campos: camposConfigurables, esVisible, guardar: guardarCamposConfigurables } =
    useConfiguracionCampos(CAMPOS_PAGO_DEFAULT, STORAGE_KEY_CAMPOS_PAGO);
  const [modalCamposAbierto, setModalCamposAbierto] = useState(false);

  async function handleSubmit() {
    const ok = await f.registrarPago();
    if (ok) {
      onExito();
      return;
    }
    const primerError = f.erroresPorCampo.allocations
      ? 'allocations'
      : Object.keys(f.erroresPorCampo.medios ?? {}).length > 0
        ? 'medios'
        : f.erroresPorCampo.diferencia
          ? 'diferencia'
          : f.erroresPorCampo.tipoCambio
            ? 'tipoCambio'
            : null;
    if (primerError) {
      enfocarPrimerCampoConError([{ campo: primerError, codigo: primerError.toUpperCase(), mensaje: '' }]);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <PageHeader
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Compras', onClick: onCancelar },
              { label: 'Cuentas por Pagar', onClick: onCancelar },
              { label: 'Registrar pago' },
            ]}
          />
        }
        title={
          <div className="flex items-center gap-2.5">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">Registrar Pago de Compra</h1>
            </div>
            {f.numeroPagoPreview && (
              <span className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded">
                {f.numeroPagoPreview}
              </span>
            )}
          </div>
        }
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {f.errorGeneral && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {f.errorGeneral}
          </div>
        )}

        {!f.seriePG && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
            No hay una serie PG activa configurada. Ve a Configuración → Series y crea una serie de tipo &quot;Pago de Compra&quot;.
          </div>
        )}

        {/* Documento a pagar */}
        <FormSectionCard titulo="Documento a pagar">
          <div id="campo-allocations" className="space-y-2">
            <TablaAplicacionPagoCompra
              cxp={cxp}
              formaPagoNombre={f.formaPagoNombre}
              installments={f.installments}
              allocations={f.allocations}
              onChangeAllocations={f.onChangeAllocations}
              disabled={f.enviando}
            />
            {f.intentoRegistrar && f.erroresPorCampo.allocations && (
              <p className="text-xs text-red-600">{f.erroresPorCampo.allocations}</p>
            )}
          </div>
        </FormSectionCard>

        {/* Datos del pago: medios (izquierda) + documento PG / sustentatorio / concepto (derecha) */}
        <FormSectionCard
          titulo="Datos del pago"
          acciones={
            <button
              type="button"
              onClick={() => setModalCamposAbierto(true)}
              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium transition-colors"
            >
              <Settings size={13} />
              <span>+ Campos</span>
            </button>
          }
        >
          <TwoColumnDocumentFields
            izquierda={
              <div id="campo-medios" className="space-y-2">
                <EditorMediosPagoCompra
                  mediosPago={f.mediosPago}
                  mediosDisponibles={f.mediosDisponibles}
                  cuentasBancariasCompatibles={f.cuentasBancariasCompatibles}
                  moneda={cxp.moneda}
                  cajaAbierta={f.estadoCaja === 'abierta'}
                  hayMedioDeCaja={f.hayMedioDeCaja}
                  onAgregar={f.agregarMedio}
                  onEliminar={f.eliminarMedio}
                  onCambiarMedio={f.actualizarMedioPago}
                  onCambiarCampo={f.actualizarCampoMedio}
                  mostrarErrores={f.intentoRegistrar}
                  erroresPorMedio={f.erroresPorCampo.medios}
                />
                <div id="campo-diferencia">
                  {f.intentoRegistrar && f.erroresPorCampo.diferencia && (
                    <p className="text-xs text-red-600">{f.erroresPorCampo.diferencia}</p>
                  )}
                </div>
              </div>
            }
            derecha={
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Documento de pago</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Tipo de documento</label>
                    <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
                      Pago
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Serie PG</label>
                    <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600 font-mono">
                      {f.seriePG?.series ?? 'Sin serie'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Próximo número</label>
                    <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600 font-mono">
                      {f.numeroPagoPreview ?? '—'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Fecha de pago</label>
                    <input
                      type="date"
                      value={f.fechaPago}
                      onChange={(e) => f.setFechaPago(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Moneda</label>
                    <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
                      {cxp.moneda}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Total a pagar</label>
                    <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm font-semibold text-gray-900">
                      {formatMoney(f.importeAplicado, cxp.moneda)}
                    </div>
                  </div>
                </div>

                {cxp.moneda !== f.monedaBase && (
                  <div className="space-y-1" id="campo-tipoCambio">
                    <label className="text-sm font-medium text-gray-700">Tipo de cambio</label>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={f.tipoCambio}
                      onChange={(e) => f.setTipoCambio(e.target.value)}
                      placeholder={`1 ${cxp.moneda} = ? ${f.monedaBase}`}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        f.intentoRegistrar && f.erroresPorCampo.tipoCambio ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {f.intentoRegistrar && f.erroresPorCampo.tipoCambio && (
                      <p className="text-xs text-red-600">{f.erroresPorCampo.tipoCambio}</p>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-gray-100 space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Concepto <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={f.concepto}
                    onChange={(e) => f.setConcepto(e.target.value)}
                    placeholder="Ingresa un concepto..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                {esVisible('documentoSustento') && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Doc. sustentatorio</label>
                      <input
                        type="text"
                        value={f.documentoSustentoTipo}
                        onChange={(e) => f.setDocumentoSustentoTipo(e.target.value)}
                        placeholder="Ej: Recibo, cheque..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Serie</label>
                      <input
                        type="text"
                        value={f.documentoSustentoSerie}
                        onChange={(e) => f.setDocumentoSustentoSerie(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Número</label>
                      <input
                        type="text"
                        value={f.documentoSustentoNumero}
                        onChange={(e) => f.setDocumentoSustentoNumero(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                )}
              </>
            }
          />
        </FormSectionCard>

        {/* Observaciones */}
        <CollapsibleNotes observaciones={f.observaciones} onCambiarObservaciones={f.setObservaciones} />

        {/* Adjuntos */}
        <FormSectionCard titulo="Adjuntos">
          <AdjuntosCompra
            adjuntos={f.adjuntos}
            tiposPermitidos={['voucher_pago', 'otro']}
            cargadoPor={session?.userName}
            onAgregar={(a) => f.setAdjuntos((prev) => [...prev, a])}
            onEliminar={(id) => f.setAdjuntos((prev) => prev.filter((a) => a.id !== id))}
          />
        </FormSectionCard>

        {/* Resumen */}
        <ResumenPagoCompra
          moneda={cxp.moneda}
          saldoInicial={cxp.saldoPendiente}
          importeAplicado={f.importeAplicado}
          totalMedios={f.totalMedios}
          saldoResultante={f.saldoResultante}
          diferencia={f.diferencia}
        />
      </div>

      <DocumentFormFooter
        infoIzquierda={
          <>
            Total: <span className="font-semibold text-gray-700">{formatMoney(f.importeAplicado, cxp.moneda)}</span>
            {' · '}Saldo resultante: <span className="font-semibold text-gray-700">{formatMoney(f.saldoResultante, cxp.moneda)}</span>
          </>
        }
        onCancelar={onCancelar}
        onSubmit={handleSubmit}
        textoBotonPrimario="Registrar pago"
        deshabilitado={f.enviando || f.bloqueadoEstructural}
        tituloBotonPrimario={
          !f.seriePG
            ? 'Configura una serie de tipo "Pago de Compra" en Configuración → Series.'
            : !f.hayMediosConfigurados
              ? 'Configura al menos un medio de pago activo en Configuración → Pagos.'
              : undefined
        }
        cargando={f.enviando}
      />

      <FieldsConfigurationModal
        abierto={modalCamposAbierto}
        titulo="Configuración de campos — Pago de Compra"
        campos={camposConfigurables}
        valoresPorDefecto={CAMPOS_PAGO_DEFAULT}
        onGuardar={(nuevos) => {
          guardarCamposConfigurables(nuevos);
          setModalCamposAbierto(false);
        }}
        onCerrar={() => setModalCamposAbierto(false)}
      />
    </div>
  );
}
