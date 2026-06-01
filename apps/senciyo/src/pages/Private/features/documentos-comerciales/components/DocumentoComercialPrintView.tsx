import type { DocumentoComercial } from '../models/documentoComercial.types';
import type { DisenoEfectivoImpresion } from '@/shared/impresion/ResolverDisenoImpresion';
import { FormatoSalida } from '@/shared/impresion/ContratoImpresion';
import {
  obtenerSimboloMoneda,
  formatearDocumentoCliente,
  calcularDesgloseTributos,
  formatearNumeroParaBorrador,
} from '../utils/documentoComercial.helpers';
import { TIPO_DOCUMENTO_COMERCIAL_LABELS } from '../models/documentoComercial.constants';

interface DocumentoComercialPrintViewProps {
  doc: DocumentoComercial;
  disenoEfectivo?: DisenoEfectivoImpresion;
}

export function DocumentoComercialPrintView({
  doc,
  disenoEfectivo,
}: DocumentoComercialPrintViewProps) {
  const simbolo = obtenerSimboloMoneda(doc.moneda);
  const numero = doc.numero ?? formatearNumeroParaBorrador(doc.serie);
  const desglose = calcularDesgloseTributos(doc.items);
  const labelTipo = TIPO_DOCUMENTO_COMERCIAL_LABELS[doc.tipo];
  const isTicket = disenoEfectivo?.formatoSalida === FormatoSalida.Ticket;

  if (isTicket) {
    return <TicketView doc={doc} simbolo={simbolo} numero={numero} desglose={desglose} labelTipo={labelTipo} />;
  }

  return <A4View doc={doc} simbolo={simbolo} numero={numero} desglose={desglose} labelTipo={labelTipo} />;
}

interface ViewProps {
  doc: DocumentoComercial;
  simbolo: string;
  numero: string;
  desglose: ReturnType<typeof calcularDesgloseTributos>;
  labelTipo: string;
}

function TicketView({ doc, simbolo, numero, desglose, labelTipo }: ViewProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000', padding: '4mm 3mm' }}>
      {/* Encabezado */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>{labelTipo}</div>
        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{numero}</div>
        <div style={{ fontSize: '10px', color: '#444', marginTop: '2px' }}>{doc.estado}</div>
      </div>

      <div style={{ borderTop: '1px dashed #999', margin: '4px 0' }} />

      {/* Fechas y pago */}
      <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
        <div>Emisión: {doc.fechaEmision}</div>
        {doc.camposOpcionales?.fechaVencimiento && <div>Vence: {doc.camposOpcionales.fechaVencimiento}</div>}
        <div>Moneda: {doc.moneda} | Pago: {doc.formaPago ?? '—'}</div>
      </div>

      {/* Cliente */}
      {doc.cliente && (
        <>
          <div style={{ borderTop: '1px dashed #999', margin: '4px 0' }} />
          <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
            <div style={{ fontWeight: 'bold' }}>{doc.cliente.nombre}</div>
            <div>{formatearDocumentoCliente(doc.cliente.tipoDocumento, doc.cliente.numeroDocumento)}</div>
            {doc.cliente.direccion && <div>{doc.cliente.direccion}</div>}
          </div>
        </>
      )}

      <div style={{ borderTop: '1px dashed #999', margin: '4px 0' }} />

      {/* Ítems */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', paddingBottom: '2px', borderBottom: '1px solid #999' }}>Descripción</th>
            <th style={{ textAlign: 'right', paddingBottom: '2px', borderBottom: '1px solid #999' }}>Cant.</th>
            <th style={{ textAlign: 'right', paddingBottom: '2px', borderBottom: '1px solid #999' }}>P.U.</th>
            <th style={{ textAlign: 'right', paddingBottom: '2px', borderBottom: '1px solid #999' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((item) => (
            <tr key={item.id}>
              <td style={{ padding: '2px 0' }}>
                {item.name}
                {item.unidadMedida ? ` (${item.unidadMedida})` : ''}
              </td>
              <td style={{ textAlign: 'right', padding: '2px 0' }}>{item.quantity}</td>
              <td style={{ textAlign: 'right', padding: '2px 0' }}>{simbolo}{item.price.toFixed(2)}</td>
              <td style={{ textAlign: 'right', padding: '2px 0' }}>{simbolo}{(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totales */}
      <div style={{ borderTop: '1px solid #999', marginTop: '4px', paddingTop: '4px', fontSize: '10px' }}>
        {desglose.map((row) => {
          if (row.kind === 'gravado') {
            const pct = Math.round(row.igvRate * 100);
            return (
              <div key={row.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Base IGV {pct}%:</span><span>{simbolo}{row.taxableBase.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>IGV {pct}%:</span><span>{simbolo}{row.taxAmount.toFixed(2)}</span>
                </div>
              </div>
            );
          }
          const label = row.kind === 'exonerado' ? 'Exonerado' : 'Inafecto';
          return (
            <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{label}:</span><span>{simbolo}{row.taxableBase.toFixed(2)}</span>
            </div>
          );
        })}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginTop: '4px', borderTop: '1px solid #000', paddingTop: '3px' }}>
          <span>TOTAL:</span><span>{simbolo}{doc.totales.total.toFixed(2)}</span>
        </div>
      </div>

      {doc.observaciones && (
        <>
          <div style={{ borderTop: '1px dashed #999', margin: '4px 0' }} />
          <div style={{ fontSize: '10px', color: '#555' }}>{doc.observaciones}</div>
        </>
      )}
    </div>
  );
}

function A4View({ doc, simbolo, numero, desglose, labelTipo }: ViewProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#000', padding: '20mm 15mm', maxWidth: '210mm', margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px', textTransform: 'uppercase' }}>{labelTipo}</h1>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>{numero}</div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>Estado: {doc.estado}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Fechas */}
        <div style={{ fontSize: '11px', lineHeight: '1.8' }}>
          <div><strong>Fecha emisión:</strong> {doc.fechaEmision}</div>
          {doc.camposOpcionales?.fechaVencimiento && (
            <div><strong>Fecha vencimiento:</strong> {doc.camposOpcionales.fechaVencimiento}</div>
          )}
          <div><strong>Moneda:</strong> {doc.moneda}</div>
          <div><strong>Forma de pago:</strong> {doc.formaPago ?? '—'}</div>
          {doc.vendedor && <div><strong>Usuario:</strong> {doc.vendedor}</div>}
        </div>

        {/* Cliente */}
        {doc.cliente && (
          <div style={{ background: '#f8f8f8', padding: '10px 12px', borderRadius: '6px', fontSize: '11px', lineHeight: '1.8' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}>{doc.cliente.nombre}</div>
            <div style={{ color: '#555' }}>{formatearDocumentoCliente(doc.cliente.tipoDocumento, doc.cliente.numeroDocumento)}</div>
            {doc.cliente.direccion && <div style={{ color: '#666' }}>{doc.cliente.direccion}</div>}
            {doc.cliente.email && <div style={{ color: '#666' }}>{doc.cliente.email}</div>}
          </div>
        )}
      </div>

      {/* Tabla de ítems */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '12px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333', background: '#f5f5f5' }}>
            <th style={{ textAlign: 'left', padding: '6px 4px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}>Descripción</th>
            <th style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}>Unid.</th>
            <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}>Cant.</th>
            <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}>P. Unit.</th>
            <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}>Desc.</th>
            <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}>Importe</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((item, idx) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #eee', background: idx % 2 === 1 ? '#fafafa' : 'white' }}>
              <td style={{ padding: '5px 4px' }}>{item.name}{item.code ? ` [${item.code}]` : ''}</td>
              <td style={{ textAlign: 'center', padding: '5px 4px', color: '#666' }}>{item.unidadMedida ?? '—'}</td>
              <td style={{ textAlign: 'right', padding: '5px 4px' }}>{item.quantity}</td>
              <td style={{ textAlign: 'right', padding: '5px 4px' }}>{simbolo}{item.price.toFixed(2)}</td>
              <td style={{ textAlign: 'right', padding: '5px 4px', color: '#666' }}>
                {item.descuentoItem ? `${item.descuentoItem}%` : '—'}
              </td>
              <td style={{ textAlign: 'right', padding: '5px 4px', fontWeight: 'bold' }}>
                {simbolo}{(item.price * item.quantity).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totales */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ minWidth: '220px', fontSize: '11px' }}>
          {desglose.map((row) => {
            if (row.kind === 'gravado') {
              const pct = Math.round(row.igvRate * 100);
              return (
                <div key={row.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#555' }}>
                    <span>Base IGV {pct}%:</span><span>{simbolo}{row.taxableBase.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#555' }}>
                    <span>IGV {pct}%:</span><span>{simbolo}{row.taxAmount.toFixed(2)}</span>
                  </div>
                </div>
              );
            }
            const label = row.kind === 'exonerado' ? 'Exonerado' : 'Inafecto';
            return (
              <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#555' }}>
                <span>{label}:</span><span>{simbolo}{row.taxableBase.toFixed(2)}</span>
              </div>
            );
          })}
          {desglose.length === 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#555' }}>
              <span>Subtotal:</span><span>{simbolo}{doc.totales.subtotal.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px', borderTop: '2px solid #333', marginTop: '4px', paddingTop: '6px' }}>
            <span>TOTAL {doc.moneda}:</span><span>{simbolo}{doc.totales.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Observaciones */}
      {doc.observaciones && (
        <div style={{ marginTop: '16px', padding: '10px 12px', background: '#f8f8f8', borderRadius: '4px', fontSize: '11px', color: '#555' }}>
          <strong>Observaciones:</strong> {doc.observaciones}
        </div>
      )}

      {/* Campos opcionales relevantes */}
      {(doc.camposOpcionales?.metodoEnvio || doc.camposOpcionales?.ordenCompra) && (
        <div style={{ marginTop: '12px', fontSize: '10px', color: '#666', lineHeight: '1.8' }}>
          {doc.camposOpcionales?.ordenCompra && <span style={{ marginRight: '16px' }}>O/C: {doc.camposOpcionales.ordenCompra}</span>}
          {doc.camposOpcionales?.metodoEnvio && <span>Envío: {doc.camposOpcionales.metodoEnvio}</span>}
        </div>
      )}
    </div>
  );
}
