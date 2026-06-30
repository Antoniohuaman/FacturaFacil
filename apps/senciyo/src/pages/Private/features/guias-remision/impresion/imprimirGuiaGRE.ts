import { createElement } from 'react';
import type { GuiaRemision } from '../modelos/GuiaRemision';
import { TIPO_GRE_LABELS } from '../modelos/GuiaRemision';
import type {
  LogoConfiguration,
  FooterConfiguration,
} from '../../configuracion-sistema/modelos/VoucherDesignUnified';
import {
  vehiculosDataSource,
  conductoresDataSource,
} from '../../configuracion-sistema/api/fuenteDatosTransporte';
import { imprimirComprobante } from '@/shared/impresion/ServicioImpresionComprobante';
import RepresentacionImpresaGRE, { type EmpresaGRE } from './RepresentacionImpresaGRE';

export type { EmpresaGRE };

export async function imprimirGuiaGRE(
  guia: GuiaRemision,
  tenantId: string,
  empresa?: EmpresaGRE,
): Promise<void> {
  const [vehiculos, conductores] = await Promise.all([
    vehiculosDataSource.list(tenantId),
    conductoresDataSource.list(tenantId),
  ]);

  const numero =
    guia.serie && guia.correlativo
      ? `${guia.serie}-${guia.correlativo}`
      : guia.serie
        ? `${guia.serie}-[pendiente]`
        : '—';

  await imprimirComprobante({
    formato: 'A4',
    titulo: `${TIPO_GRE_LABELS[guia.tipo]} ${numero}`,
    render: (contexto) => {
      if (!contexto) throw new Error('[GRE] Contexto de impresión no disponible.');
      const { config } = contexto.disenoEfectivo;
      return createElement(RepresentacionImpresaGRE, {
        guia,
        empresa: empresa ?? {},
        logo: config.logo as LogoConfiguration,
        watermark: config.watermark,
        footer: config.footer as FooterConfiguration,
        vehiculos,
        conductores,
      });
    },
  });
}
