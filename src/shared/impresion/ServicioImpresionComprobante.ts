import { createElement, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { ImpresionProviders } from './ImpresionProviders';
import {
  FormatoSalida,
  TipoDocumentoImprimible,
  type TamanoPapel as TamanoPapelContrato,
} from './ContratoImpresion';
import {
  resolverDisenoImpresion,
  type DisenoEfectivoImpresion,
} from './ResolverDisenoImpresion';

export type FormatoImpresionComprobante = 'A4' | 'TICKET';

export type TamanoPapelImpresionComprobante = 'mm58' | 'mm80' | 'a5' | 'a4';

export type RenderizadorImpresionComprobante = (contexto?: {
  disenoEfectivo: DisenoEfectivoImpresion;
}) => ReactElement;

export type OpcionesImpresionComprobante = {
  formato: FormatoImpresionComprobante;
  render: RenderizadorImpresionComprobante;
  titulo?: string;
  tamanoPapel?: TamanoPapelImpresionComprobante;
};

const esperarFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const copiarEstilos = (documentoOrigen: Document, documentoDestino: Document) => {
  const nodos = documentoOrigen.querySelectorAll('link[rel="stylesheet"], style');

  nodos.forEach((nodo) => {
    if (nodo.tagName.toLowerCase() === 'link') {
      const linkOrigen = nodo as HTMLLinkElement;
      const linkDestino = documentoDestino.createElement('link');
      linkDestino.rel = 'stylesheet';
      if (linkOrigen.href) {
        linkDestino.href = linkOrigen.href;
      }
      documentoDestino.head.appendChild(linkDestino);
      return;
    }

    const styleOrigen = nodo as HTMLStyleElement;
    const styleDestino = documentoDestino.createElement('style');
    styleDestino.textContent = styleOrigen.textContent || '';
    documentoDestino.head.appendChild(styleDestino);
  });
};

const inyectarCssImpresion = (documentoDestino: Document, disenoEfectivo: DisenoEfectivoImpresion) => {
  const style = documentoDestino.createElement('style');
  style.setAttribute('data-impresion-servicio', 'true');

  if (disenoEfectivo.formatoSalida === FormatoSalida.Ticket) {
    const anchoMm = disenoEfectivo.anchoTicketMm === 58 ? 58 : 80;
    style.textContent = `
      @page { size: ${anchoMm}mm auto; margin: 0; }
      html, body {
        width: ${anchoMm}mm;
        margin: 0;
        padding: 0;
        background: #fff !important;
        color: #000 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      #impresion-root {
        width: ${anchoMm}mm;
        margin: 0;
        padding: 0;
        background: #fff !important;
        color: #000 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      #impresion-root, #impresion-root * {
        color: #000 !important;
        -webkit-text-fill-color: #000 !important;
      }

      @media print {
        .marca-agua-ticket { display: none !important; }
      }

      *, *::before, *::after { box-sizing: border-box; }
    `;
  } else {
    const size = disenoEfectivo.tamanoHoja === 'A5' ? 'A5' : 'A4';
    style.textContent = `
      @page { size: ${size}; margin: 0; }
      html, body { margin: 0; padding: 0; background: white; }
      *, *::before, *::after { box-sizing: border-box; }
    `;
  }

  documentoDestino.head.appendChild(style);
};


export async function imprimirComprobante(opciones: OpcionesImpresionComprobante): Promise<void> {
  if (typeof document === 'undefined') {
    throw new Error('No se puede imprimir fuera del navegador.');
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  const limpiar = (() => {
    let finalizado = false;
    return (root?: ReturnType<typeof createRoot>) => {
      if (finalizado) {
        return;
      }
      finalizado = true;

      try {
        root?.unmount();
      } catch {
        // Limpieza defensiva: ignorar fallos al desmontar
      }

      try {
        iframe.remove();
      } catch {
        // Limpieza defensiva: ignorar fallos al remover
      }
    };
  })();

  document.body.appendChild(iframe);

  try {
    const baseHref = document.baseURI || window.location.href;

    const listo = new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error('No se pudo inicializar el contenedor de impresión.'));
    });

    iframe.srcdoc = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base href="${baseHref}" />
    <title>${opciones.titulo ?? 'Impresión'}</title>
    <style>
      html, body { margin: 0; padding: 0; background: white; }
    </style>
  </head>
  <body>
    <div id="impresion-root"></div>
  </body>
</html>`;

    await listo;

    const documentoIframe = iframe.contentDocument;
    const ventanaIframe = iframe.contentWindow;

    if (!documentoIframe || !ventanaIframe) {
      throw new Error('No se pudo acceder al documento de impresión.');
    }

    copiarEstilos(document, documentoIframe);

    const formatoSalida = opciones.formato === 'TICKET' ? FormatoSalida.Ticket : FormatoSalida.Hoja;
    const disenoEfectivo = await resolverDisenoImpresion({
      tipoDocumento: TipoDocumentoImprimible.ComprobanteElectronico,
      formatoSalida,
      tamanoPapel: (opciones.tamanoPapel as TamanoPapelContrato | undefined) ?? undefined,
    });

    inyectarCssImpresion(documentoIframe, disenoEfectivo);

    const contenedor = documentoIframe.getElementById('impresion-root');
    if (!contenedor) {
      throw new Error('No se encontró el contenedor para renderizar la impresión.');
    }

    const root = createRoot(contenedor);
    try {
      const elemento = opciones.render({ disenoEfectivo });
      root.render(createElement(ImpresionProviders, null, elemento));

      await esperarFrame();
      await esperarFrame();

      try {
        await (documentoIframe as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
      } catch {
        // Ignorar: algunas plataformas no exponen fonts.ready
      }

      const limpiarConRoot = () => limpiar(root);
      ventanaIframe.addEventListener('afterprint', limpiarConRoot, { once: true });

      try {
        ventanaIframe.focus();
        ventanaIframe.print();
      } finally {
        setTimeout(limpiarConRoot, 0);
      }
    } catch (error) {
      limpiar(root);
      throw error;
    }
  } catch (error) {
    limpiar();
    throw error;
  }
}
