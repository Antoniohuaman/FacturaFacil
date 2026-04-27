export type TipoEmpresa = 'demo' | 'real';

export type DatosEmpresaDemoBase = {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccionFiscal: string;
  ubigeo: string;
  actividadEconomica: string;
  telefonos: string[];
  correosElectronicos: string[];
  monedaBase: 'PEN' | 'USD';
  entornoSunat: 'TEST' | 'PRODUCTION';
};

type EmpresaConClasificacion = {
  tipoEmpresa?: TipoEmpresa;
  ruc?: string | null;
  razonSocial?: string | null;
  nombreComercial?: string | null;
  direccionFiscal?: string | null;
  actividadEconomica?: string | null;
};

export const DATOS_EMPRESA_DEMO_SENCIYO: DatosEmpresaDemoBase = {
  ruc: '20000000000',
  razonSocial: 'SENCIYO S.A.C.',
  nombreComercial: 'SENCIYO',
  direccionFiscal: 'AV. PRINCIPAL 123, LIMA, LIMA, LIMA',
  ubigeo: '150101',
  actividadEconomica: 'COMERCIO AL POR MENOR',
  telefonos: ['949970564'],
  correosElectronicos: ['contacto@senciyo.com'],
  monedaBase: 'PEN',
  entornoSunat: 'TEST',
};

export const RUC_EMPRESA_DEMO_SENCIYO = DATOS_EMPRESA_DEMO_SENCIYO.ruc;

const normalizarTexto = (value?: string | null): string => value?.trim().toUpperCase() ?? '';

export function esRucEmpresaDemo(ruc?: string | null): boolean {
  return normalizarTexto(ruc) === RUC_EMPRESA_DEMO_SENCIYO;
}

export function coincideConDatosBaseDemo(
  empresa?: EmpresaConClasificacion | null,
): boolean {
  if (!empresa) {
    return false;
  }

  return (
    esRucEmpresaDemo(empresa.ruc)
    || (
      normalizarTexto(empresa.razonSocial) === normalizarTexto(DATOS_EMPRESA_DEMO_SENCIYO.razonSocial)
      && normalizarTexto(empresa.nombreComercial) === normalizarTexto(DATOS_EMPRESA_DEMO_SENCIYO.nombreComercial)
      && normalizarTexto(empresa.direccionFiscal) === normalizarTexto(DATOS_EMPRESA_DEMO_SENCIYO.direccionFiscal)
      && normalizarTexto(empresa.actividadEconomica) === normalizarTexto(DATOS_EMPRESA_DEMO_SENCIYO.actividadEconomica)
    )
  );
}

export function esEmpresaDemo(empresa?: EmpresaConClasificacion | null): boolean {
  if (!empresa) {
    return false;
  }

  return empresa.tipoEmpresa === 'demo' || coincideConDatosBaseDemo(empresa);
}

export function obtenerTipoEmpresa(empresa?: EmpresaConClasificacion | null): TipoEmpresa {
  return esEmpresaDemo(empresa) ? 'demo' : 'real';
}

export function derivarEntornoAnaliticoEmpresa(
  empresa?: EmpresaConClasificacion | null,
): 'demo' | 'produccion' | undefined {
  if (!empresa) {
    return undefined;
  }

  return esEmpresaDemo(empresa) ? 'demo' : 'produccion';
}