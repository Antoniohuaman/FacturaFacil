// ===============================================================
// RESOLVER DE DISEÑO PARA IMPRESIÓN (SIN HOOKS REACT)
// Lee la configuración persistida y construye un diseño efectivo
// para el servicio central de impresión por iframe.
// ===============================================================

import type {
  VoucherDesignA4Config,
  VoucherDesignConfig,
  VoucherDesignTicketConfig,
} from '@/pages/Private/features/configuracion-sistema/modelos/VoucherDesignUnified';
import {
  DISENO_A4_PREDETERMINADO,
  DISENO_TICKET_PREDETERMINADO,
} from '@/pages/Private/features/configuracion-sistema/modelos/VoucherDesignUnified';
import { FabricaAlmacenamientoDisenoComprobante } from '@/pages/Private/features/configuracion-sistema/servicios/AlmacenamientoDisenoComprobante';
import { FormatoSalida, TamanoPapel, type TipoDocumentoImprimible } from './ContratoImpresion';

export type DisenoEfectivoImpresion = {
  tipoDocumento: TipoDocumentoImprimible;
  formatoSalida: FormatoSalida;
  // Tamaño final elegido (puede venir del parámetro o del storage)
  tamanoPapel: TamanoPapel;

  // Ticket
  anchoTicketMm?: 58 | 80;

  // Hoja
  tamanoHoja?: 'A4' | 'A5';

  // Config común consumida por templates (evita hooks en UI)
  config: {
    logo: (VoucherDesignA4Config | VoucherDesignTicketConfig)['logo'];
    watermark: (VoucherDesignA4Config | VoucherDesignTicketConfig)['watermark'];
    footer: (VoucherDesignA4Config | VoucherDesignTicketConfig)['footer'];
    documentFields: (VoucherDesignA4Config | VoucherDesignTicketConfig)['documentFields'];
    productFields: (VoucherDesignA4Config | VoucherDesignTicketConfig)['productFields'];
  };

  // Metadatos/ajustes específicos de ticket (cuando existan)
  ticket?: {
    general: VoucherDesignTicketConfig['general'];
    typography: VoucherDesignTicketConfig['typography'];
    qrCode: VoucherDesignTicketConfig['qrCode'];
    separators: VoucherDesignTicketConfig['separators'];
    metadata: VoucherDesignTicketConfig['metadata'];
  };
};

export type ResolverDisenoImpresionArgs = {
  tipoDocumento: TipoDocumentoImprimible;
  formatoSalida: FormatoSalida;
  tamanoPapel?: TamanoPapel;
};

function esTamanoTicket(tamano: TamanoPapel | undefined): tamano is 'mm58' | 'mm80' {
  return tamano === TamanoPapel.Mm58 || tamano === TamanoPapel.Mm80;
}

function esTamanoHoja(tamano: TamanoPapel | undefined): tamano is 'a4' | 'a5' {
  return tamano === TamanoPapel.A4 || tamano === TamanoPapel.A5;
}

function normalizarConfigTicket(config: VoucherDesignConfig | null | undefined): VoucherDesignTicketConfig {
  const ticket = config?.ticketConfig;
  if (ticket) {
    return ticket;
  }

  const fallback = DISENO_TICKET_PREDETERMINADO.ticketConfig;
  if (!fallback) {
    throw new Error('No hay configuración predeterminada de ticket disponible.');
  }
  return fallback;
}

function normalizarConfigA4(config: VoucherDesignConfig | null | undefined): VoucherDesignA4Config {
  const a4 = config?.a4Config;
  if (a4) {
    return a4;
  }

  const fallback = DISENO_A4_PREDETERMINADO.a4Config;
  if (!fallback) {
    throw new Error('No hay configuración predeterminada A4 disponible.');
  }
  return fallback;
}

async function cargarConfigPersistida(tipo: 'A4' | 'TICKET'): Promise<VoucherDesignConfig | null> {
  try {
    const storage = FabricaAlmacenamientoDisenoComprobante.create();
    return await storage.load(tipo);
  } catch {
    return null;
  }
}

export async function resolverDisenoImpresion(
  args: ResolverDisenoImpresionArgs
): Promise<DisenoEfectivoImpresion> {
  const { tipoDocumento, formatoSalida, tamanoPapel } = args;

  if (formatoSalida === FormatoSalida.Ticket) {
    const persistido = await cargarConfigPersistida('TICKET');
    const ticketConfig = normalizarConfigTicket(persistido);

    const anchoStorage = ticketConfig.general?.paperWidth === 58 ? 58 : 80;
    const anchoTicketMm = esTamanoTicket(tamanoPapel)
      ? tamanoPapel === TamanoPapel.Mm58
        ? 58
        : 80
      : anchoStorage;

    const tamanoFinal: TamanoPapel = anchoTicketMm === 58 ? TamanoPapel.Mm58 : TamanoPapel.Mm80;

    return {
      tipoDocumento,
      formatoSalida,
      tamanoPapel: tamanoFinal,
      anchoTicketMm,
      config: {
        logo: ticketConfig.logo,
        watermark: ticketConfig.watermark,
        footer: ticketConfig.footer,
        documentFields: ticketConfig.documentFields,
        productFields: ticketConfig.productFields,
      },
      ticket: {
        general: ticketConfig.general,
        typography: ticketConfig.typography,
        qrCode: ticketConfig.qrCode,
        separators: ticketConfig.separators,
        metadata: ticketConfig.metadata,
      },
    };
  }

  // formatoSalida === 'hoja'
  const persistido = await cargarConfigPersistida('A4');
  const a4Config = normalizarConfigA4(persistido);

  const tamanoHoja = esTamanoHoja(tamanoPapel)
    ? tamanoPapel === TamanoPapel.A5
      ? 'A5'
      : 'A4'
    : 'A4';

  const tamanoFinal: TamanoPapel = tamanoHoja === 'A5' ? TamanoPapel.A5 : TamanoPapel.A4;

  return {
    tipoDocumento,
    formatoSalida,
    tamanoPapel: tamanoFinal,
    tamanoHoja,
    config: {
      logo: a4Config.logo,
      watermark: a4Config.watermark,
      footer: a4Config.footer,
      documentFields: a4Config.documentFields,
      productFields: a4Config.productFields,
    },
  };
}
