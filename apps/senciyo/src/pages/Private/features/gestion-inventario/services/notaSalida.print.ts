// src/features/gestion-inventario/services/notaSalida.print.ts
// Simple window.open print for NS (internal document)

import { TIPO_SALIDA_LABEL } from '../models/notaSalida.constants';
import type { NotaSalida } from '../models/notaSalida.types';
import { calcularDesgloseTributarioNS } from './notaSalida.service';

const escHtml = (s?: string): string =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fmt2 = (n: number): string => n.toFixed(2);

const fmtFecha = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return iso;
  }
};

export function imprimirNotaSalida(nota: NotaSalida): void {
  const win = window.open('', '_blank', 'width=860,height=1000');
  if (!win) return;

  const tipoLabel = TIPO_SALIDA_LABEL[nota.tipoSalida] ?? nota.tipoSalida;
  const estadoLabel =
    nota.estado === 'Generada' ? 'GENERADA' :
    nota.estado === 'Entregada' ? 'ENTREGADA' :
    nota.estado === 'Anulada' ? 'ANULADA' : 'BORRADOR';

  const lineasHtml = nota.lineas
    .map(
      (l, i) => `
      <tr class="${i % 2 === 0 ? 'even' : ''}">
        <td class="code">${escHtml(l.productoCodigo)}</td>
        <td>${escHtml(l.productoNombre)}</td>
        <td class="num">${l.cantidad}</td>
        <td>${escHtml(l.unidad)}</td>
        <td>${escHtml(l.impuesto ?? '—')}</td>
        <td class="num">${fmt2(l.pvUnitario)}</td>
        <td class="num">${fmt2(l.subtotal)}</td>
        <td class="num bold">${fmt2(l.total)}</td>
      </tr>`,
    )
    .join('');

  const desgloseGrupos = calcularDesgloseTributarioNS(nota.lineas);
  const gravadas = desgloseGrupos.filter(g => g.rate > 0);
  const noGravadas = desgloseGrupos.filter(g => g.rate === 0);
  const baseGravadaTotal = gravadas.reduce((s, g) => s + g.base, 0);
  const COL_COUNT = 8;
  const totalesHtml = `
    ${gravadas.length > 0 ? `<tr><td colspan="${COL_COUNT - 1}" class="tot-label">Op. gravadas</td><td class="num">${fmt2(baseGravadaTotal)}</td></tr>` : ''}
    ${gravadas.filter(g => g.igv > 0).map(g =>
      `<tr><td colspan="${COL_COUNT - 1}" class="tot-label">${escHtml(g.labelIgv ?? '')}</td><td class="num">${fmt2(g.igv)}</td></tr>`
    ).join('')}
    ${noGravadas.map(g =>
      `<tr><td colspan="${COL_COUNT - 1}" class="tot-label">${escHtml(g.labelBase)}</td><td class="num">${fmt2(g.base)}</td></tr>`
    ).join('')}
    <tr class="total-row">
      <td colspan="${COL_COUNT - 1}" class="tot-label bold">TOTAL ${nota.moneda}</td>
      <td class="num bold">${fmt2(nota.total)}</td>
    </tr>`;

  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Nota de Salida ${escHtml(nota.numero ?? nota.serie)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; padding: 24px 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 16px; }
  .doc-title { font-size: 18px; font-weight: 700; letter-spacing: .5px; }
  .doc-subtitle { font-size: 11px; color: #555; margin-top: 2px; }
  .serie { font-size: 15px; font-weight: 700; text-align: right; font-family: monospace; }
  .estado { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; margin-top: 4px; letter-spacing: .5px; }
  .estado.GENERADA { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
  .estado.ENTREGADA { background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd; }
  .estado.BORRADOR { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
  .estado.ANULADA { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; text-decoration: line-through; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-bottom: 16px; }
  .grid .field { display: flex; gap: 4px; }
  .grid .label { color: #6b7280; white-space: nowrap; min-width: 120px; }
  .grid .value { font-weight: 600; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #374151; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10.5px; }
  th { background: #f8fafc; text-align: left; padding: 5px 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: #6b7280; border-bottom: 1px solid #e2e8f0; }
  th.num, td.num { text-align: right; }
  td { padding: 4px 6px; border-bottom: 1px solid #f1f5f9; }
  tr.even td { background: #fafafa; }
  .code { font-family: monospace; color: #6b7280; }
  .bold { font-weight: 700; }
  .tot-label { text-align: right; color: #6b7280; padding-right: 8px; font-size: 10px; }
  .total-row td { background: #f8fafc; border-top: 1px solid #e2e8f0; padding-top: 6px; }
  .obs { margin-top: 8px; padding: 8px; background: #f8fafc; border-radius: 4px; font-size: 10.5px; color: #4b5563; }
  .anulado-banner { text-align: center; color: #dc2626; font-size: 12px; font-weight: 700; margin-bottom: 12px; padding: 6px; border: 1px solid #fca5a5; background: #fff5f5; border-radius: 4px; }
  .footer { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
  @media print {
    body { padding: 0; }
    @page { size: A4; margin: 18mm 16mm 15mm; }
  }
</style>
</head>
<body>

${nota.estado === 'Anulada' ? '<div class="anulado-banner">⚠ NOTA DE SALIDA ANULADA</div>' : ''}

<div class="header">
  <div>
    <div class="doc-title">NOTA DE SALIDA</div>
    <div class="doc-subtitle">${escHtml(tipoLabel)}</div>
  </div>
  <div>
    <div class="serie">${escHtml(nota.numero ?? `Borrador — ${nota.serie}`)}</div>
    <div style="text-align:right"><span class="estado ${estadoLabel}">${estadoLabel}</span></div>
  </div>
</div>

<div class="grid">
  <div class="field"><span class="label">Fecha documento:</span><span class="value">${fmtFecha(nota.fechaDocumento)}</span></div>
  <div class="field"><span class="label">Almacén origen:</span><span class="value">${escHtml(nota.almacenOrigenNombre)}</span></div>
  ${nota.fechaEntregaPrevista ? `<div class="field"><span class="label">Fecha entrega prevista:</span><span class="value">${fmtFecha(nota.fechaEntregaPrevista)}</span></div>` : '<div></div>'}
  <div class="field"><span class="label">Moneda:</span><span class="value">${nota.moneda}</span></div>
  ${nota.clienteNombre ? `
  <div class="field"><span class="label">Cliente:</span><span class="value">${escHtml(nota.clienteNombre)}</span></div>
  <div class="field"><span class="label">${escHtml(nota.tipoDocumentoCliente ?? 'RUC')}:</span><span class="value">${escHtml(nota.numeroDocumentoCliente ?? '—')}</span></div>
  ` : '<div></div><div></div>'}
  ${nota.direccionFacturacion ? `<div class="field"><span class="label">Dir. facturación:</span><span class="value">${escHtml(nota.direccionFacturacion)}</span></div>` : '<div></div>'}
  ${nota.direccionEnvio ? `<div class="field"><span class="label">Dir. de envío:</span><span class="value">${escHtml(nota.direccionEnvio)}</span></div>` : '<div></div>'}
  ${nota.encargadoAlmacen ? `<div class="field"><span class="label">Encargado almacén:</span><span class="value">${escHtml(nota.encargadoAlmacen)}</span></div>` : '<div></div>'}
  ${nota.metodoEnvio ? `<div class="field"><span class="label">Método de envío:</span><span class="value">${escHtml(nota.metodoEnvio)}</span></div>` : '<div></div>'}
  ${nota.documentoOrigen || nota.numeroDocumentoOrigen ? `
  <div class="field"><span class="label">Doc. origen:</span><span class="value">${escHtml(nota.documentoOrigen ?? '')}${nota.numeroDocumentoOrigen ? `: ${nota.numeroDocumentoOrigen}` : ''}</span></div>
  ` : '<div></div>'}
</div>

<div class="section-title">Productos</div>
<table>
  <thead>
    <tr>
      <th>Código</th>
      <th>Descripción</th>
      <th class="num">Cant.</th>
      <th>Unidad</th>
      <th>Impuesto</th>
      <th class="num">P.V. Unit.</th>
      <th class="num">Subtotal</th>
      <th class="num">Total</th>
    </tr>
  </thead>
  <tbody>${lineasHtml}</tbody>
  <tfoot>${totalesHtml}</tfoot>
</table>

${nota.observaciones ? `<div class="obs"><strong>Observaciones:</strong> ${escHtml(nota.observaciones)}</div>` : ''}
${nota.motivoAnulacion ? `<div class="obs" style="border-left:3px solid #dc2626;margin-top:6px"><strong>Motivo anulación:</strong> ${escHtml(nota.motivoAnulacion)}</div>` : ''}

<div class="footer">
  <span>Generado por: ${escHtml(nota.usuario)}</span>
  <span>Fecha creación: ${fmtFecha(nota.createdAt)}</span>
  <span>SenciYo — FacturaFácil</span>
</div>

<script>window.onload = function(){ window.focus(); window.print(); };</` + `script>
</body>
</html>`);

  win.document.close();
}
