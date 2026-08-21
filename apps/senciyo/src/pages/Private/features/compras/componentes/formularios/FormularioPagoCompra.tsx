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
import { useFormularioPagoCompra, type DependenciasFormularioPagoCentral } from '../../hooks/useFormularioPagoCompra';
import TablaDocumentosPagoCompra from '../pagos/TablaDocumentosPagoCompra';
import EditorMediosPagoCompra from '../pagos/EditorMediosPagoCompra';
import ResumenPagoCompra from '../pagos/ResumenPagoCompra';
import AdjuntosCompra from '../adjuntos/AdjuntosCompra';
import type { CuentaPorPagar } from '../../modelos/CuentaPorPagar';
import { enfocarPrimerCampoConError } from '../../modelos/ErroresValidacion';

/**
 * Contexto visual/de navegación según el origen documental (§4 de la
 * corrección puntual) — generaliza ÚNICAMENTE el texto y el breadcrumb del
 * formulario compartido, nunca su lógica. Compras pasa sus valores actuales
 * tal cual (sin cambio de comportamiento); Gastos pasa los suyos propios.
 */
export interface MetadatosOrigenFormularioPago {
  tipoOrigen: 'compra' | 'gasto';
  /** Primer nivel del breadcrumb — "Compras" o "Gastos". */
  etiquetaModulo: string;
  /** Segundo nivel del breadcrumb — sección genérica ("Cuentas por Pagar") o la referencia del documento origen puntual (ej. la referencia del gasto). */
  etiquetaDocumentoOrigen: string;
  /** Título visible de la página. */
  tituloFormulario: string;
}

interface FormularioPagoCompraProps {
  /** Documentos a pagar (1 o varios), ya resueltos por el paso previo de selección — mismo proveedor y moneda. */
  cxps: CuentaPorPagar[];
  /** Importe inicial a aplicar por CxP (cuentaPorPagarId -> monto), propuesto por el paso de selección. */
  importesIniciales: Record<string, number>;
  /** Inyectadas por el llamador según el origen documental (compra o gasto) — nunca un `useCompras()` fijo aquí (§11 de la corrección: mismo formulario para ambos orígenes). */
  dependencias: DependenciasFormularioPagoCentral;
  /** Breadcrumb/título según origen (§4 de la corrección puntual) — nunca "Compras" hardcodeado para un pago de Gasto. */
  metadatosOrigen: MetadatosOrigenFormularioPago;
  onExito: () => void;
  onCancelar: () => void;
}

const CAMPOS_PAGO_DEFAULT: CampoConfigurableDocumento[] = [
  { id: 'documentoSustento', label: 'Documento sustentatorio', visible: false },
];
const STORAGE_KEY_CAMPOS_PAGO = 'compras_pago_campos_config';

export default function FormularioPagoCompra({ cxps, importesIniciales, dependencias, metadatosOrigen, onExito, onCancelar }: FormularioPagoCompraProps) {
  const { session } = useUserSession();
  const f = useFormularioPagoCompra(cxps, importesIniciales, dependencias);
  const proveedorNombre = cxps[0]?.proveedorNombre ?? '';
  const { campos: camposConfigurables, esVisible, guardar: guardarCamposConfigurables } =
    useConfiguracionCampos(CAMPOS_PAGO_DEFAULT, STORAGE_KEY_CAMPOS_PAGO);
  const [modalCamposAbierto, setModalCamposAbierto] = useState(false);

  async function handleSubmit() {
    const ok = await f.registrarPago();
    if (ok) {
      onExito();
      return;
    }
    const primerError = f.erroresPorCampo.aplicaciones
      ? 'aplicaciones'
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
              { label: metadatosOrigen.etiquetaModulo, onClick: onCancelar },
              { label: metadatosOrigen.etiquetaDocumentoOrigen, onClick: onCancelar },
              { label: 'Registrar pago' },
            ]}
          />
        }
        title={
          <div className="flex items-center gap-2.5">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">{metadatosOrigen.tituloFormulario}</h1>
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

        {f.erroresPorCampo.restriccionOrigen && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {f.erroresPorCampo.restriccionOrigen}
          </div>
        )}

        {!f.seriePG && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
            No hay una serie PG activa configurada. Ve a Configuración → Series y crea una serie de tipo &quot;Pago a proveedor&quot;.
          </div>
        )}

        {/* Documento(s) a pagar — Gastos siempre envía uno solo; Compras puede enviar varios del mismo proveedor y moneda (remediación §6/§26: singular/plural por cantidad, nunca por origen). */}
        <FormSectionCard titulo={cxps.length > 1 ? `Documentos a pagar — ${proveedorNombre}` : `Documento a pagar — ${proveedorNombre}`}>
          <div id="campo-aplicaciones" className="space-y-2">
            <TablaDocumentosPagoCompra
              documentos={cxps}
              moneda={f.moneda}
              disabled={f.enviando}
              aplicacionesSimples={f.aplicacionesSimples}
              onCambiarAplicacionSimple={f.onCambiarAplicacionSimple}
              cuotasPorDocumento={f.cuotasPorDocumento}
              asignacionesCuotasPorDocumento={f.asignacionesCuotasPorDocumento}
              onCambiarAsignacionesCuotas={f.onCambiarAsignacionesCuotas}
              obtenerImporteDocumento={f.obtenerImporteDocumento}
            />
            {f.intentoRegistrar && f.erroresPorCampo.aplicaciones && (
              <p className="text-xs text-red-600">{f.erroresPorCampo.aplicaciones}</p>
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
              <div id="campo-medios" className="space-y-3">
                {/*
                  Lo primero que se lee (remediación UX del pago compartido
                  §9/§23): cuánto hay que cubrir, justo encima de con qué
                  medio(s) se cubre — nunca compitiendo en protagonismo con
                  "Tipo de documento"/"Serie PG"/"Próximo número" (información
                  técnica, ver la columna derecha). Derivado de "Documentos a
                  pagar" arriba — nunca un valor editable aparte que pueda
                  desincronizarse.
                */}
                <div className="flex items-baseline justify-between rounded-lg bg-blue-50/60 px-3 py-2">
                  <span className="text-sm font-medium text-gray-700">Importe a pagar</span>
                  <span className="text-lg font-semibold text-gray-900">{formatMoney(f.importeAplicado, f.moneda)}</span>
                </div>
                <EditorMediosPagoCompra
                  mediosPago={f.mediosPago}
                  mediosDisponibles={f.mediosDisponibles}
                  cuentasBancariasCompatibles={f.cuentasBancariasCompatibles}
                  moneda={f.moneda}
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Fecha de pago</label>
                    <input
                      type="date"
                      value={f.fechaPago}
                      onChange={(e) => f.setFechaPago(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div className="space-y-1">
                    {/* Moneda de la obligación — no editable aquí, dato secundario pero visible (remediación §22). */}
                    <label className="text-xs text-gray-500">Moneda</label>
                    <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
                      {f.moneda}
                    </div>
                  </div>
                </div>

                {f.moneda !== f.monedaBase && (
                  <div className="space-y-1" id="campo-tipoCambio">
                    <label className="text-sm font-medium text-gray-700">Tipo de cambio</label>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={f.tipoCambio}
                      onChange={(e) => f.setTipoCambio(e.target.value)}
                      placeholder={`1 ${f.moneda} = ? ${f.monedaBase}`}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        f.intentoRegistrar && f.erroresPorCampo.tipoCambio ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {f.intentoRegistrar && f.erroresPorCampo.tipoCambio && (
                      <p className="text-xs text-red-600">{f.erroresPorCampo.tipoCambio}</p>
                    )}
                  </div>
                )}

                {/*
                  Tipo de documento/Serie/Próximo número: automáticos, no
                  editables — nunca al mismo nivel visual que Importe/Medio de
                  pago (remediación §7/§8). El próximo número ya se ve también
                  en la cabecera de la página; aquí basta una línea discreta.
                */}
                <p className="text-[11px] text-gray-400">
                  Pago{f.seriePG ? ` · Serie ${f.seriePG.series}` : ' · Sin serie'}{f.numeroPagoPreview ? ` · ${f.numeroPagoPreview}` : ''}
                </p>

                <div className="pt-2 border-t border-gray-100 space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Nota del pago <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={f.concepto}
                    onChange={(e) => f.setConcepto(e.target.value)}
                    placeholder="Ej. Pago de la primera cuota"
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
          moneda={f.moneda}
          saldoInicial={f.saldoInicialTotal}
          totalMedios={f.totalMedios}
          cantidadMedios={f.mediosPago.length}
          saldoResultante={f.saldoResultanteTotal}
          diferencia={f.diferencia}
        />
      </div>

      <DocumentFormFooter
        infoIzquierda={
          <>
            Pago: <span className="font-semibold text-gray-700">{formatMoney(f.importeAplicado, f.moneda)}</span>
            {' · '}Saldo después del pago: <span className="font-semibold text-gray-700">{formatMoney(f.saldoResultanteTotal, f.moneda)}</span>
          </>
        }
        onCancelar={onCancelar}
        onSubmit={handleSubmit}
        textoBotonPrimario="Registrar pago"
        deshabilitado={f.enviando || f.bloqueadoEstructural}
        tituloBotonPrimario={
          !f.seriePG
            ? 'Configura una serie de tipo "Pago a proveedor" en Configuración → Series.'
            : !f.hayMediosConfigurados
              ? 'Configura al menos un medio de pago activo en Configuración → Pagos.'
              : undefined
        }
        cargando={f.enviando}
      />

      <FieldsConfigurationModal
        abierto={modalCamposAbierto}
        titulo="Configuración de campos — Pago a proveedor"
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
