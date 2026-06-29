import type { GuiaRemision } from '../modelos/GuiaRemision';
import { TIPO_GRE_LABELS } from '../modelos/GuiaRemision';
import { MOTIVOS_TRASLADO, ENTIDADES_AUTORIZADORAS_D37, DOCUMENTOS_RELACIONADOS_GRE } from '../../configuracion-sistema/datos/catalogosGRE';
import { vehiculosDataSource, conductoresDataSource } from '../../configuracion-sistema/api/fuenteDatosTransporte';
import { formatearPlaca, nombreCompletoConductor } from '../../configuracion-sistema/components/transporte/helpersTransporte';
import { getEstadoGRELabel } from '../logica/estadosGRE';

export interface EmpresaGRE {
  razonSocial?: string;
  ruc?: string;
  direccion?: string;
}

export async function imprimirGuiaGRE(
  guia: GuiaRemision,
  tenantId: string,
  empresa?: EmpresaGRE,
): Promise<void> {
  const [vehiculos, conductores] = await Promise.all([
    vehiculosDataSource.list(tenantId),
    conductoresDataSource.list(tenantId),
  ]);

  const motivo = MOTIVOS_TRASLADO.find((m) => m.codigo === guia.motivoTraslado);
  const numero = guia.serie && guia.correlativo
    ? `${guia.serie}-${guia.correlativo}`
    : guia.serie
      ? `${guia.serie}-[pendiente]`
      : '—';

  const esPrivado = guia.modalidadTransporte === '02';

  const filasBienes = guia.bienes
    .map(
      (b) =>
        `<tr>
          <td>${escHtml(b.codigoBien ?? b.productoId?.toString() ?? '—')}</td>
          <td>${escHtml(b.descripcion)}</td>
          <td style="text-align:right">${b.cantidad}</td>
          <td style="text-align:center">${escHtml(b.unidad)}</td>
          <td style="text-align:right">${b.pesoLineaKg !== undefined ? b.pesoLineaKg.toFixed(3) : '—'}</td>
        </tr>`,
    )
    .join('');

  const filasDocRel = guia.documentosRelacionados
    .map((d) => {
      const tipoCat = DOCUMENTOS_RELACIONADOS_GRE.find((x) => x.codigo === d.tipoDocumentoCodigo);
      return `<tr>
        <td>${escHtml(tipoCat?.documento ?? d.tipoDocumentoCodigo)}</td>
        <td>${escHtml(d.numeroDocumento)}</td>
        <td>${escHtml(d.fechaEmision ?? '—')}</td>
        <td>${escHtml(d.origen)}</td>
      </tr>`;
    })
    .join('');

  let bloqueTransporte = '';
  if (esPrivado && guia.transportePrivado) {
    const tp = guia.transportePrivado;
    if (tp.esM1oL) {
      bloqueTransporte = `<p><strong>Modalidad:</strong> Transporte privado — Vehículo M1/L</p>
        <p><strong>Placa M1/L:</strong> ${escHtml(tp.placaVehiculoM1L ?? '—')}</p>
        <p><strong>Fecha inicio traslado:</strong> ${escHtml(tp.fechaInicioTraslado)}</p>`;
    } else {
      const vRows = tp.vehiculosIds
        .map((vid, idx) => {
          const v = vehiculos.find((x) => x.id === vid);
          if (!v) return '';
          const ent = ENTIDADES_AUTORIZADORAS_D37.find((e) => e.codigo === v.codigoEntidadAutorizadora);
          return `<li>${idx === 0 ? 'Principal' : `Secundario ${idx}`}: <strong>${formatearPlaca(v.placa)}</strong>${ent ? ` — ${escHtml(ent.abreviatura)}` : ''}</li>`;
        })
        .join('');
      const cRows = tp.conductoresIds
        .map((cid, idx) => {
          const c = conductores.find((x) => x.id === cid);
          if (!c) return '';
          return `<li>${idx === 0 ? 'Principal' : `Secundario ${idx}`}: ${escHtml(nombreCompletoConductor(c))} — ${escHtml(c.tipoDocumento)} ${escHtml(c.numeroDocumento)} — Lic. ${escHtml(c.numeroLicencia)}</li>`;
        })
        .join('');
      bloqueTransporte = `<p><strong>Modalidad:</strong> Transporte privado</p>
        <p><strong>Fecha inicio traslado:</strong> ${escHtml(tp.fechaInicioTraslado)}</p>
        ${vRows ? `<p><strong>Vehículos:</strong></p><ul>${vRows}</ul>` : ''}
        ${cRows ? `<p><strong>Conductores:</strong></p><ul>${cRows}</ul>` : ''}`;
    }
  } else if (!esPrivado && guia.transportePublico) {
    const tp = guia.transportePublico;
    if (tp.esM1oL) {
      bloqueTransporte = `<p><strong>Modalidad:</strong> Transporte público — Vehículo M1/L</p>
        <p><strong>Placa M1/L:</strong> ${escHtml(tp.placaVehiculoM1L ?? '—')}</p>
        <p><strong>Fecha entrega bienes:</strong> ${escHtml(tp.fechaEntregaBienes ?? '—')}</p>`;
    } else {
      const vRows = tp.registrarVehiculosConductores
        ? tp.vehiculosIds.map((vid, idx) => {
            const v = vehiculos.find((x) => x.id === vid);
            if (!v) return '';
            return `<li>${idx === 0 ? 'Principal' : `Secundario ${idx}`}: <strong>${formatearPlaca(v.placa)}</strong></li>`;
          }).join('')
        : '';
      const cRows = tp.registrarVehiculosConductores
        ? tp.conductoresIds.map((cid, idx) => {
            const c = conductores.find((x) => x.id === cid);
            if (!c) return '';
            return `<li>${idx === 0 ? 'Principal' : `Secundario ${idx}`}: ${escHtml(nombreCompletoConductor(c))} — Lic. ${escHtml(c.numeroLicencia)}</li>`;
          }).join('')
        : '';
      bloqueTransporte = `<p><strong>Modalidad:</strong> Transporte público</p>
        <p><strong>Transportista:</strong> ${escHtml(tp.transportistaNombre)} (RUC ${escHtml(tp.transportistaNumeroDocumento)})</p>
        ${tp.registroMTC ? `<p><strong>Registro MTC:</strong> ${escHtml(tp.registroMTC)}</p>` : ''}
        <p><strong>Fecha entrega bienes:</strong> ${escHtml(tp.fechaEntregaBienes ?? '—')}</p>
        ${vRows ? `<p><strong>Vehículos:</strong></p><ul>${vRows}</ul>` : ''}
        ${cRows ? `<p><strong>Conductores:</strong></p><ul>${cRows}</ul>` : ''}`;
    }
  }

  const pesoDisplay = guia.pesoTotal !== undefined
    ? guia.unidadPeso === 'KGM'
      ? `${guia.pesoTotal.toFixed(3)} KGM`
      : `${(guia.pesoTotal / 1000).toFixed(3)} TNE`
    : '—';

  const cabecerEmpresa = empresa?.razonSocial
    ? `<div class="empresa-header">
        <div class="empresa-nombre">${escHtml(empresa.razonSocial)}</div>
        ${empresa.ruc ? `<div class="empresa-ruc">RUC ${escHtml(empresa.ruc)}</div>` : ''}
        ${empresa.direccion ? `<div class="empresa-dir">${escHtml(empresa.direccion)}</div>` : ''}
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>${escHtml(TIPO_GRE_LABELS[guia.tipo])} ${escHtml(numero)}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #111; }
  .empresa-header { border-bottom: 2px solid #4c1d95; padding-bottom: 8px; margin-bottom: 12px; }
  .empresa-nombre { font-size: 15px; font-weight: bold; color: #4c1d95; }
  .empresa-ruc, .empresa-dir { font-size: 11px; color: #555; margin-top: 2px; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  h2 { font-size: 13px; margin: 14px 0 4px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  p { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; font-size: 11px; }
  th { background: #f5f5f5; font-weight: bold; }
  ul { margin: 4px 0 4px 16px; padding: 0; }
  li { margin: 2px 0; }
  .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
  .meta div { background: #f9f9f9; border: 1px solid #eee; padding: 4px 6px; border-radius: 4px; }
  .meta label { display: block; font-size: 10px; color: #666; margin-bottom: 1px; }
  @media print { body { margin: 10px; } }
</style>
</head>
<body>
${cabecerEmpresa}
<h1>${escHtml(TIPO_GRE_LABELS[guia.tipo])}</h1>
<p style="font-size:18px;font-weight:bold;font-family:monospace">${escHtml(numero)}</p>
<div class="meta">
  <div><label>Fecha de emisión</label>${escHtml(guia.fechaEmision)}</div>
  <div><label>Motivo de traslado</label>${escHtml(guia.motivoTraslado)} — ${escHtml(motivo?.descripcion ?? '—')}</div>
  <div><label>Estado</label>${escHtml(getEstadoGRELabel(guia.estado))}</div>
</div>

<h2>Destinatario</h2>
<p><strong>${escHtml(guia.destinatarioNombre)}</strong></p>
<p>${escHtml(guia.destinatarioTipoDocumento)} ${escHtml(guia.destinatarioNumeroDocumento)}</p>
${guia.destinatarioDireccion ? `<p>${escHtml(guia.destinatarioDireccion)}</p>` : ''}

<h2>Puntos de traslado</h2>
<div class="meta">
  <div><label>Punto de partida</label>${escHtml(guia.puntoPartida.direccion)}<br/>${escHtml([guia.puntoPartida.distrito, guia.puntoPartida.provincia].filter(Boolean).join(', '))}</div>
  <div><label>Punto de llegada</label>${escHtml(guia.puntoLlegada.direccion)}<br/>${escHtml([guia.puntoLlegada.distrito, guia.puntoLlegada.provincia].filter(Boolean).join(', '))}</div>
</div>

<h2>Bienes a transportar (Peso bruto total: ${escHtml(pesoDisplay)})</h2>
<table>
  <thead><tr><th>Código</th><th>Descripción</th><th>Cantidad</th><th>Unidad</th><th>Peso (kg)</th></tr></thead>
  <tbody>${filasBienes || '<tr><td colspan="5">Sin bienes</td></tr>'}</tbody>
</table>

<h2>Transporte</h2>
${bloqueTransporte}

${filasDocRel ? `<h2>Documentos relacionados</h2>
<table>
  <thead><tr><th>Tipo</th><th>Número</th><th>F. Emisión</th><th>Origen</th></tr></thead>
  <tbody>${filasDocRel}</tbody>
</table>` : ''}

${guia.observaciones ? `<h2>Observaciones</h2><p>${escHtml(guia.observaciones)}</p>` : ''}
</body>
</html>`;

  const ventana = window.open('', '_blank', 'width=900,height=700');
  if (!ventana) return;
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  ventana.print();
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
