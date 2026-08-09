import type { CSSProperties } from 'react';
import type {
  LogoConfiguration,
  WatermarkConfiguration,
  FooterConfiguration,
} from '../../configuracion-sistema/modelos/VoucherDesignUnified';
import type { GuiaRemision } from '../modelos/GuiaRemision';
import { TIPO_GRE_LABELS } from '../modelos/GuiaRemision';
import type { Vehiculo, Conductor } from '../../configuracion-sistema/modelos/Transporte';
import {
  MOTIVOS_TRASLADO,
  MODALIDADES_TRANSPORTE,
  ENTIDADES_AUTORIZADORAS_D37,
  DOCUMENTOS_RELACIONADOS_GRE,
} from '../../configuracion-sistema/datos/catalogosGRE';
import {
  formatearPlaca,
  nombreCompletoConductor,
} from '../../configuracion-sistema/components/transporte/helpersTransporte';
import { obtenerReglaFlujoGRE } from '../logica/reglasFlujoGRE';

// ─── Interfaz pública ────────────────────────────────────────

export interface EmpresaGRE {
  razonSocial?: string;
  ruc?: string;
  direccion?: string;
  autorizacionEspecialEmisor?: { entidadNombre: string; numeroAutorizacion: string };
}

interface Props {
  guia: GuiaRemision;
  empresa: EmpresaGRE;
  logo: LogoConfiguration;
  watermark: WatermarkConfiguration;
  footer: FooterConfiguration;
  vehiculos: Vehiculo[];
  conductores: Conductor[];
}

// ─── Utilidades ──────────────────────────────────────────────

function formatearPesoValor(total: number | undefined, unidad: 'KGM' | 'TNE'): string {
  if (total === undefined) return '—';
  return unidad === 'KGM' ? total.toFixed(3) : (total / 1000).toFixed(3);
}

function partes(...args: (string | undefined)[]): string {
  return args.filter((x): x is string => Boolean(x)).join(', ');
}

/** Resuelve la abreviatura de la entidad autorizadora a partir del nombre completo ya resuelto (misma fuente única `ENTIDADES_AUTORIZADORAS_D37` — nunca una segunda tabla). */
function resolverAbreviaturaEntidad(entidadNombre?: string): string | undefined {
  if (!entidadNombre) return undefined;
  return ENTIDADES_AUTORIZADORAS_D37.find((e) => e.entidad === entidadNombre)?.abreviatura;
}

const WATERMARK_SIZE: Record<string, number> = { small: 70, medium: 110, large: 150 };

const SIN_CORTE: CSSProperties = { breakInside: 'avoid' };

const TH: CSSProperties = {
  padding: '4px 8px',
  fontWeight: 'bold',
  color: '#4B5563',
  textAlign: 'center',
  border: '1px solid #E5E7EB',
  fontSize: '9px',
  textTransform: 'uppercase',
  background: '#F9FAFB',
};

const TD: CSSProperties = {
  padding: '5px 8px',
  border: '1px solid #E5E7EB',
  verticalAlign: 'top',
};

// ─── Micro-componentes ────────────────────────────────────────

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={SIN_CORTE}>
      <div style={{ marginTop: '14px', marginBottom: '5px' }}>
        <p
          style={{
            fontSize: '9px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#6B7280',
            borderBottom: '1px solid #E5E7EB',
            paddingBottom: '2px',
          }}
        >
          {titulo}
        </p>
      </div>
      {children}
    </div>
  );
}

function Campo({ label, value }: { label: string; value?: string | null }) {
  if (value == null || value === '') return null;
  return (
    <div>
      <span style={{ fontSize: '9px', color: '#9CA3AF', display: 'block' }}>{label}</span>
      <span style={{ fontSize: '11px', color: '#111827' }}>{value}</span>
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
      {children}
    </div>
  );
}

/** Indicador booleano compacto ("Label: Sí/No") — mismo criterio visual que `IndicadorBoolean` del drawer de detalle GRE, adaptado a impresión. */
function IndicadorSiNo({ label, valor }: { label: string; valor?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '10px' }}>
      <span style={{ color: '#6B7280' }}>{label}</span>
      <span style={{ fontWeight: 600, color: valor ? '#047857' : '#9CA3AF' }}>{valor ? 'Sí' : 'No'}</span>
    </div>
  );
}

// ─── Cabecera de empresa + identificación del documento ────────

function CabeceraGRE({
  guia,
  empresa,
  logo,
}: {
  guia: GuiaRemision;
  empresa: EmpresaGRE;
  logo: LogoConfiguration;
}) {
  const logoAlign: CSSProperties['textAlign'] =
    logo.position === 'center' ? 'center' : logo.position === 'right' ? 'right' : 'left';

  const numero =
    guia.serie && guia.correlativo
      ? `${guia.serie}-${guia.correlativo}`
      : guia.serie
        ? `${guia.serie}-[pendiente]`
        : '—';

  const actor = TIPO_GRE_LABELS[guia.tipo].replace(/^GRE\s+/i, '').toUpperCase();
  const abreviaturaEntidad = resolverAbreviaturaEntidad(empresa.autorizacionEspecialEmisor?.entidadNombre);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', ...SIN_CORTE }}>
      {/* Bloque empresa — identidad, nunca repite el RUC (ya destacado en la caja del documento) */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {logo.enabled && logo.url && (
          <div style={{ marginBottom: '8px', textAlign: logoAlign }}>
            <img
              src={logo.url}
              alt="Logo"
              style={{ width: logo.width, height: logo.height, objectFit: 'contain', display: 'inline-block' }}
            />
          </div>
        )}
        {empresa.razonSocial && (
          <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            {empresa.razonSocial}
          </p>
        )}
        {empresa.direccion && (
          <p style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>
            {empresa.direccion}
          </p>
        )}
        {empresa.autorizacionEspecialEmisor && (
          <div style={{ marginTop: '6px' }}>
            <p style={{ fontSize: '10px', color: '#374151', margin: 0 }}>
              <span style={{ color: '#9CA3AF' }}>Entidad emisora: </span>
              {abreviaturaEntidad ?? empresa.autorizacionEspecialEmisor.entidadNombre}
            </p>
            <p style={{ fontSize: '10px', color: '#374151', margin: 0 }}>
              <span style={{ color: '#9CA3AF' }}>N.° autorización: </span>
              {empresa.autorizacionEspecialEmisor.numeroAutorizacion}
            </p>
          </div>
        )}
      </div>

      {/* Bloque documento — identifica exclusivamente QUIÉN emite + QUÉ documento es + su número.
          Sin fecha de emisión ni estado operativo: eso vive en "Datos de emisión" y en la UI del ERP. */}
      <div
        style={{
          border: '2px solid #374151',
          borderRadius: '6px',
          padding: '10px 18px',
          textAlign: 'center',
          minWidth: '210px',
          flexShrink: 0,
        }}
      >
        {empresa.ruc && (
          <p style={{ fontSize: '10px', fontWeight: 600, color: '#374151', margin: 0 }}>
            R.U.C. {empresa.ruc}
          </p>
        )}
        <p
          style={{
            fontSize: '11px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#111827',
            margin: '4px 0 0',
          }}
        >
          Guía de remisión
        </p>
        <p
          style={{
            fontSize: '11px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#111827',
            margin: 0,
          }}
        >
          Electrónica {actor}
        </p>
        <p
          style={{
            fontSize: '17px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            marginTop: '4px',
            marginBottom: 0,
            color: '#111827',
          }}
        >
          {numero}
        </p>
      </div>
    </div>
  );
}

// ─── Vehículos / conductores (compartido entre modalidades) ────

function ListaVehiculos({
  vehiculosIds,
  vehiculos,
  placaM1L,
}: {
  vehiculosIds: string[];
  vehiculos: Vehiculo[];
  placaM1L?: string;
}) {
  if (placaM1L) {
    return (
      <Seccion titulo="Vehículos">
        <div style={{ fontSize: '10px', display: 'flex', gap: '10px' }}>
          <span style={{ color: '#9CA3AF', minWidth: '72px' }}>Vehículo M1/L</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#111827' }}>
            {formatearPlaca(placaM1L)}
          </span>
        </div>
      </Seccion>
    );
  }

  if (vehiculosIds.length === 0) return null;

  return (
    <Seccion titulo="Vehículos">
      {vehiculosIds.map((vid, idx) => {
        const v = vehiculos.find((x) => x.id === vid);
        if (!v) return null;
        const ent = ENTIDADES_AUTORIZADORAS_D37.find((e) => e.codigo === v.codigoEntidadAutorizadora);
        return (
          <div key={vid} style={{ fontSize: '10px', marginBottom: '3px', display: 'flex', gap: '10px' }}>
            <span style={{ color: '#9CA3AF', minWidth: '72px' }}>
              {idx === 0 ? 'Principal' : `Secundario ${idx}`}
            </span>
            <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#111827' }}>
              {formatearPlaca(v.placa)}
            </span>
            {ent && (
              <span style={{ color: '#6B7280' }}>
                · {ent.abreviatura}
                {v.numeroAutorizacion ? ` — Aut. N.° ${v.numeroAutorizacion}` : ''}
              </span>
            )}
          </div>
        );
      })}
    </Seccion>
  );
}

function ListaConductores({
  conductoresIds,
  conductores,
}: {
  conductoresIds: string[];
  conductores: Conductor[];
}) {
  if (conductoresIds.length === 0) return null;

  return (
    <Seccion titulo="Conductores">
      {conductoresIds.map((cid, idx) => {
        const c = conductores.find((x) => x.id === cid);
        if (!c) return null;
        return (
          <div key={cid} style={{ fontSize: '10px', marginBottom: '3px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ color: '#9CA3AF', minWidth: '72px' }}>
              {idx === 0 ? 'Principal' : `Secundario ${idx}`}
            </span>
            <span style={{ fontWeight: 'bold', color: '#111827' }}>
              {nombreCompletoConductor(c)}
            </span>
            <span style={{ color: '#6B7280' }}>
              · {c.tipoDocumento} {c.numeroDocumento} · Lic. {c.numeroLicencia}
            </span>
          </div>
        );
      })}
    </Seccion>
  );
}

// ─── Datos del traslado (modalidad + indicadores) ──────────────

function DatosDelTraslado({ guia }: { guia: GuiaRemision }) {
  const esPrivado = guia.modalidadTransporte === '02';
  const modalidadCat = MODALIDADES_TRANSPORTE.find((m) => m.codigo === guia.modalidadTransporte);
  const tp = esPrivado ? guia.transportePrivado : guia.transportePublico;
  const fechaLabel = esPrivado ? 'Fecha de inicio de traslado' : 'Fecha de entrega de bienes al transportista';
  const fechaValor = esPrivado
    ? guia.transportePrivado?.fechaInicioTraslado
    : guia.transportePublico?.fechaEntregaBienes;

  return (
    <Seccion titulo="Datos del traslado">
      <Grid2>
        <Campo
          label="Modalidad de transporte"
          value={`${guia.modalidadTransporte} — ${modalidadCat?.descripcion ?? '—'}`}
        />
        <Campo label={fechaLabel} value={fechaValor} />
      </Grid2>
      {tp && (
        <div style={{ marginTop: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px', maxWidth: '360px' }}>
          <IndicadorSiNo label="Vehículo categoría M1/L" valor={tp.esM1oL} />
          <IndicadorSiNo label="Transbordo programado" valor={tp.transbordo} />
          {esPrivado && guia.transportePrivado && !guia.transportePrivado.esM1oL && (
            <>
              <IndicadorSiNo label="Retorno de vehículo vacío" valor={guia.transportePrivado.retornoVehiculoVacio} />
              <IndicadorSiNo label="Retorno con envases vacíos" valor={guia.transportePrivado.retornoEnvases} />
            </>
          )}
          {!esPrivado && guia.transportePublico && !guia.transportePublico.esM1oL && (
            <>
              <IndicadorSiNo label="Registrar vehículos y conductores" valor={guia.transportePublico.registrarVehiculosConductores} />
              <IndicadorSiNo label="Retorno con envases vacíos" valor={guia.transportePublico.retornoEnvases} />
            </>
          )}
        </div>
      )}
    </Seccion>
  );
}

// ─── Transporte (transportista — solo aplica a modalidad pública) ─

function BloqueTransportista({ tp }: { tp: NonNullable<GuiaRemision['transportePublico']> }) {
  if (!tp.transportistaNombre && !tp.transportistaNumeroDocumento && !tp.registroMTC) return null;
  return (
    <Seccion titulo="Transporte">
      <Grid2>
        {tp.transportistaNumeroDocumento && (
          <Campo label={tp.transportistaTipoDocumento || 'RUC'} value={tp.transportistaNumeroDocumento} />
        )}
        {tp.transportistaNombre && (
          <Campo label="Razón social / Nombre del transportista" value={tp.transportistaNombre} />
        )}
        {tp.registroMTC && <Campo label="Registro MTC" value={tp.registroMTC} />}
      </Grid2>
    </Seccion>
  );
}

// ─── Componente principal ─────────────────────────────────────

export default function RepresentacionImpresaGRE({
  guia,
  empresa,
  logo,
  watermark,
  footer,
  vehiculos,
  conductores,
}: Props) {
  const motivo = MOTIVOS_TRASLADO.find((m) => m.codigo === guia.motivoTraslado);
  const regla = obtenerReglaFlujoGRE(guia.tipo, guia.motivoTraslado);
  const esPrivado = guia.modalidadTransporte === '02';
  const tpPrivado = guia.transportePrivado;
  const tpPublico = guia.transportePublico;

  // La columna "Peso (kg)" por línea solo se muestra si el documento realmente tiene, para al
  // menos un bien, un peso de línea calculado (snapshot real, nunca inventado) — evita una
  // columna de ceros cuando el catálogo no tiene peso configurado por producto.
  const hayPesoPorLinea = guia.bienes.some((b) => b.pesoLineaKg !== undefined && b.pesoLineaKg > 0);

  const footerFontSize: Record<string, string> = { small: '9px', medium: '11px', large: '13px' };
  const footerAlign: Record<string, CSSProperties['textAlign']> = {
    left: 'left',
    center: 'center',
    right: 'right',
  };

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: '#111827',
        padding: '28px 36px',
        background: 'white',
        position: 'relative',
      }}
    >
      {/* Marca de agua */}
      {watermark.enabled && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) rotate(${watermark.rotation}deg)`,
            opacity: watermark.opacity,
            zIndex: 0,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {watermark.type === 'text' && (
            <span
              style={{
                fontSize: `${WATERMARK_SIZE[watermark.size] ?? 110}px`,
                fontWeight: 'bold',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                color: watermark.color ?? '#000000',
              }}
            >
              {watermark.text ?? ''}
            </span>
          )}
          {watermark.type === 'image' && watermark.imageUrl && (
            <img src={watermark.imageUrl} alt="" style={{ maxWidth: '380px', display: 'block' }} />
          )}
        </div>
      )}

      {/* Contenido sobre la marca de agua */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* 1. Encabezado empresa + identificación de la GRE */}
        <CabeceraGRE guia={guia} empresa={empresa} logo={logo} />

        <hr style={{ border: 'none', borderTop: '2px solid #111827', margin: '12px 0' }} />

        {/* 2. Datos de emisión */}
        <Seccion titulo="Datos de emisión">
          <Grid2>
            <Campo label="Fecha de emisión" value={guia.fechaEmision} />
            <Campo label="Motivo de traslado" value={`${guia.motivoTraslado} — ${motivo?.descripcion ?? '—'}`} />
          </Grid2>
          {regla.requiereEspecificacion && guia.especificacionMotivo && (
            <div style={{ marginTop: '4px' }}>
              <Campo label="Especificación del motivo" value={guia.especificacionMotivo} />
            </div>
          )}
        </Seccion>

        {/* 3. Participante(s) — label y obligatoriedad según reglasFlujoGRE (tipo + motivo) */}
        <Seccion titulo={regla.actorPrincipal.label}>
          <Grid2>
            <Campo label="Nombre / Razón social" value={guia.destinatarioNombre || '—'} />
            <Campo label={guia.destinatarioTipoDocumento} value={guia.destinatarioNumeroDocumento || '—'} />
            {guia.destinatarioDireccion && <Campo label="Dirección" value={guia.destinatarioDireccion} />}
            {(guia.destinatarioDistrito ?? guia.destinatarioProvincia ?? guia.destinatarioDepartamento) && (
              <Campo
                label="Distrito / Provincia / Departamento"
                value={partes(guia.destinatarioDistrito, guia.destinatarioProvincia, guia.destinatarioDepartamento)}
              />
            )}
            {guia.destinatarioUbigeo && <Campo label="Ubigeo" value={guia.destinatarioUbigeo} />}
          </Grid2>
        </Seccion>

        {regla.actorSecundario !== null && guia.compradorNombre && (
          <Seccion titulo={regla.actorSecundario.label}>
            <Grid2>
              <Campo label="Nombre / Razón social" value={guia.compradorNombre} />
              {guia.compradorTipoDocumento && guia.compradorNumeroDocumento && (
                <Campo label={guia.compradorTipoDocumento} value={guia.compradorNumeroDocumento} />
              )}
            </Grid2>
          </Seccion>
        )}

        {/* 4. Puntos de traslado */}
        <Seccion titulo="Puntos de traslado">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
            <div>
              <p style={{ fontSize: '9px', color: '#9CA3AF', marginBottom: '2px' }}>Punto de partida</p>
              <p style={{ fontSize: '11px', color: '#111827', fontWeight: 500, margin: 0 }}>
                {guia.puntoPartida.direccion || '—'}
              </p>
              {partes(guia.puntoPartida.distrito, guia.puntoPartida.provincia, guia.puntoPartida.departamento) && (
                <p style={{ fontSize: '10px', color: '#6B7280', marginTop: '1px' }}>
                  {partes(guia.puntoPartida.distrito, guia.puntoPartida.provincia, guia.puntoPartida.departamento)}
                </p>
              )}
              {guia.puntoPartida.ubigeo && (
                <p style={{ fontSize: '9px', color: '#9CA3AF', marginTop: '1px' }}>Ubigeo: {guia.puntoPartida.ubigeo}</p>
              )}
            </div>
            <div>
              <p style={{ fontSize: '9px', color: '#9CA3AF', marginBottom: '2px' }}>Punto de llegada</p>
              <p style={{ fontSize: '11px', color: '#111827', fontWeight: 500, margin: 0 }}>
                {guia.puntoLlegada.direccion || '—'}
              </p>
              {partes(guia.puntoLlegada.distrito, guia.puntoLlegada.provincia, guia.puntoLlegada.departamento) && (
                <p style={{ fontSize: '10px', color: '#6B7280', marginTop: '1px' }}>
                  {partes(guia.puntoLlegada.distrito, guia.puntoLlegada.provincia, guia.puntoLlegada.departamento)}
                </p>
              )}
              {guia.puntoLlegada.ubigeo && (
                <p style={{ fontSize: '9px', color: '#9CA3AF', marginTop: '1px' }}>Ubigeo: {guia.puntoLlegada.ubigeo}</p>
              )}
            </div>
          </div>
        </Seccion>

        {/* 5. Bienes a transportar */}
        <Seccion titulo="Bienes a transportar">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr>
                <th style={{ ...TH, textAlign: 'center', width: '28px' }}>N°</th>
                <th style={{ ...TH, textAlign: 'left', width: '80px' }}>Código</th>
                <th style={{ ...TH, textAlign: 'left' }}>Descripción</th>
                <th style={{ ...TH, width: '50px' }}>U.M.</th>
                <th style={{ ...TH, textAlign: 'right', width: '60px' }}>Cantidad</th>
                {hayPesoPorLinea && <th style={{ ...TH, textAlign: 'right', width: '70px' }}>Peso (kg)</th>}
              </tr>
            </thead>
            <tbody>
              {guia.bienes.length === 0 && (
                <tr>
                  <td colSpan={hayPesoPorLinea ? 6 : 5} style={{ ...TD, textAlign: 'center', color: '#9CA3AF' }}>
                    Sin bienes registrados
                  </td>
                </tr>
              )}
              {guia.bienes.map((b, idx) => (
                <tr key={b.id} style={{ borderTop: '1px solid #E5E7EB', ...SIN_CORTE }}>
                  <td style={{ ...TD, textAlign: 'center', color: '#6B7280' }}>{idx + 1}</td>
                  <td style={{ ...TD, fontFamily: 'monospace', color: '#6B7280', fontSize: '9px' }}>
                    {b.codigoBien ?? (b.productoId != null ? String(b.productoId) : '—')}
                  </td>
                  <td style={TD}>
                    <span style={{ color: '#111827' }}>{b.descripcion || '—'}</span>
                    {b.normalizado && (
                      <span
                        style={{
                          marginLeft: '5px',
                          fontSize: '8px',
                          padding: '0 4px',
                          background: '#EDE9FE',
                          color: '#5B21B6',
                          borderRadius: '3px',
                          fontWeight: 'bold',
                        }}
                      >
                        SUNAT
                      </span>
                    )}
                    {b.codigoProductoSunat && (
                      <p style={{ fontSize: '8px', color: '#9CA3AF', fontFamily: 'monospace', margin: '1px 0 0' }}>
                        Cód. SUNAT: {b.codigoProductoSunat}
                      </p>
                    )}
                    {b.codigoSubpartidaNacional && (
                      <p style={{ fontSize: '8px', color: '#9CA3AF', fontFamily: 'monospace', margin: '1px 0 0' }}>
                        Subpartida: {b.codigoSubpartidaNacional}
                      </p>
                    )}
                    {b.codigoGTIN && (
                      <p style={{ fontSize: '8px', color: '#9CA3AF', fontFamily: 'monospace', margin: '1px 0 0' }}>
                        GTIN: {b.codigoGTIN}
                      </p>
                    )}
                  </td>
                  <td style={{ ...TD, textAlign: 'center' }}>{b.unidad}</td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace' }}>{b.cantidad}</td>
                  {hayPesoPorLinea && (
                    <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace' }}>
                      {b.pesoLineaKg !== undefined ? b.pesoLineaKg.toFixed(3) : '—'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Resumen de peso — bloque propio, nunca mezclado con el título de la tabla */}
          <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'flex-end', gap: '24px', ...SIN_CORTE }}>
            <p style={{ fontSize: '10px', color: '#6B7280', margin: 0 }}>
              Unidad de medida del peso bruto: <strong style={{ color: '#111827' }}>{guia.unidadPeso}</strong>
            </p>
            <p style={{ fontSize: '10px', color: '#6B7280', margin: 0 }}>
              Peso bruto total de la carga: <strong style={{ color: '#111827' }}>{formatearPesoValor(guia.pesoTotal, guia.unidadPeso)}</strong>
            </p>
          </div>
        </Seccion>

        {/* 6-9. Datos del traslado, transporte, vehículos, conductores */}
        <DatosDelTraslado guia={guia} />

        {!esPrivado && tpPublico && <BloqueTransportista tp={tpPublico} />}

        {esPrivado && tpPrivado && !tpPrivado.esM1oL && (
          <ListaVehiculos vehiculosIds={tpPrivado.vehiculosIds} vehiculos={vehiculos} />
        )}
        {esPrivado && tpPrivado?.esM1oL && (
          <ListaVehiculos vehiculosIds={[]} vehiculos={vehiculos} placaM1L={tpPrivado.placaVehiculoM1L} />
        )}
        {!esPrivado && tpPublico && !tpPublico.esM1oL && tpPublico.registrarVehiculosConductores && (
          <ListaVehiculos vehiculosIds={tpPublico.vehiculosIds} vehiculos={vehiculos} />
        )}
        {!esPrivado && tpPublico?.esM1oL && (
          <ListaVehiculos vehiculosIds={[]} vehiculos={vehiculos} placaM1L={tpPublico.placaVehiculoM1L} />
        )}

        {esPrivado && tpPrivado && !tpPrivado.esM1oL && (
          <ListaConductores conductoresIds={tpPrivado.conductoresIds} conductores={conductores} />
        )}
        {!esPrivado && tpPublico && !tpPublico.esM1oL && tpPublico.registrarVehiculosConductores && (
          <ListaConductores conductoresIds={tpPublico.conductoresIds} conductores={conductores} />
        )}

        {/* 10. Documentos relacionados — solo si existen realmente */}
        {guia.documentosRelacionados.length > 0 && (
          <Seccion titulo="Documentos relacionados">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr>
                  <th style={{ ...TH, textAlign: 'left' }}>Tipo de documento</th>
                  <th style={{ ...TH, textAlign: 'left' }}>Número</th>
                  <th style={{ ...TH, width: '90px' }}>Fecha emisión</th>
                  <th style={{ ...TH, width: '70px' }}>Origen</th>
                </tr>
              </thead>
              <tbody>
                {guia.documentosRelacionados.map((doc) => {
                  const tipoCat = DOCUMENTOS_RELACIONADOS_GRE.find((x) => x.codigo === doc.tipoDocumentoCodigo);
                  return (
                    <tr key={doc.id} style={{ borderTop: '1px solid #E5E7EB', ...SIN_CORTE }}>
                      <td style={TD}>{tipoCat?.documento ?? `Tipo ${doc.tipoDocumentoCodigo}`}</td>
                      <td style={{ ...TD, fontFamily: 'monospace' }}>
                        {doc.numeroDocumento}
                        {doc.rucEmisorExterno && (
                          <p style={{ fontSize: '8px', color: '#9CA3AF', margin: '1px 0 0' }}>
                            RUC emisor: {doc.rucEmisorExterno}
                          </p>
                        )}
                      </td>
                      <td style={{ ...TD, textAlign: 'center' }}>{doc.fechaEmision ?? '—'}</td>
                      <td style={{ ...TD, textAlign: 'center' }}>{doc.origen}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Seccion>
        )}

        {/* 11. Observaciones — bloque independiente al final, solo si existen */}
        {guia.observaciones && (
          <Seccion titulo="Observaciones">
            <p style={{ fontSize: '10px', color: '#374151', margin: 0 }}>{guia.observaciones}</p>
          </Seccion>
        )}

        {/*
          12. QR: no se representa. No existe hoy en SenciYo ninguna fuente real de QR para GRE
          (ni para Comprobantes en producción — el único generador de QR encontrado en el código,
          `usePreview.tsx#generateQRUrl`, es un MOCK explícito de vista previa que apunta a un
          servicio público de terceros con datos que su propio comentario admite no ser reales:
          "En producción, esto sería la URL real de SUNAT"). Representar un QR aquí exigiría o
          bien reutilizar ese mock (mostrando un código que podría confundirse con uno válido) o
          bien inventar un payload nuevo — ambos prohibidos explícitamente. Queda como dependencia
          pendiente de una fuente real de QR SUNAT (XML/CDR), fuera del alcance de este frontend.
        */}

        {/* 13. Pie de página — sistema centralizado, sin cambios */}
        {footer.enabled && footer.showCustomText && footer.customText && (
          <div
            style={{
              marginTop: '28px',
              paddingTop: '8px',
              paddingBottom: `${footer.padding}px`,
              borderTop: '1px solid #E5E7EB',
              textAlign: footerAlign[footer.textAlignment] ?? 'center',
              fontSize: footerFontSize[footer.fontSize] ?? '9px',
              fontWeight: footer.fontWeight === 'bold' ? 'bold' : 'normal',
              color: '#6B7280',
              ...SIN_CORTE,
            }}
          >
            {footer.customText}
          </div>
        )}
      </div>
    </div>
  );
}
