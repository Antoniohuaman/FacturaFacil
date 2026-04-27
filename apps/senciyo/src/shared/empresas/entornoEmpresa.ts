export type TipoEmpresa = 'demo' | 'real';
export type EntornoOperacionEmpresa = 'DEMO' | 'PRODUCCION';
export type EntornoTecnicoEmision = 'TESTING' | 'PRODUCTION';

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
};

type EmpresaConConfiguracionTributariaLegacy = {
  configuracionSunatEmpresa?: {
    entornoSunat?: EntornoTecnicoEmision | null;
  } | null;
};

type EmpresaConClasificacion = EmpresaConConfiguracionTributariaLegacy & {
  tipoEmpresa?: TipoEmpresa | null;
  entornoOperacion?: EntornoOperacionEmpresa | null;
  ruc?: string | null;
  razonSocial?: string | null;
  nombreComercial?: string | null;
  direccionFiscal?: string | null;
  domicilioFiscal?: string | null;
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
      && normalizarTexto(empresa.direccionFiscal ?? empresa.domicilioFiscal)
        === normalizarTexto(DATOS_EMPRESA_DEMO_SENCIYO.direccionFiscal)
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

const obtenerEntornoTecnicoEmisionLegacy = (
  empresa?: EmpresaConConfiguracionTributariaLegacy | null,
): EntornoTecnicoEmision | undefined => {
  const entornoLegacy = empresa?.configuracionSunatEmpresa?.entornoSunat;

  if (entornoLegacy === 'TESTING' || entornoLegacy === 'PRODUCTION') {
    return entornoLegacy;
  }

  return undefined;
};

const obtenerEntornoOperacionLegacy = (
  empresa?: EmpresaConClasificacion | null,
): EntornoOperacionEmpresa | undefined => {
  const entornoLegacy = obtenerEntornoTecnicoEmisionLegacy(empresa);

  if (!entornoLegacy) {
    return undefined;
  }

  if (entornoLegacy === 'PRODUCTION') {
    return 'PRODUCCION';
  }

  return esEmpresaDemo(empresa) ? 'DEMO' : undefined;
};

export function obtenerEntornoOperacionEmpresa(
  empresa?: EmpresaConClasificacion | null,
): EntornoOperacionEmpresa | undefined {
  if (!empresa) {
    return undefined;
  }

  if (empresa.entornoOperacion === 'DEMO' || empresa.entornoOperacion === 'PRODUCCION') {
    return empresa.entornoOperacion;
  }

  const entornoOperacionLegacy = obtenerEntornoOperacionLegacy(empresa);
  if (entornoOperacionLegacy) {
    return entornoOperacionLegacy;
  }

  if (obtenerTipoEmpresa(empresa) === 'demo') {
    return 'DEMO';
  }

  return 'PRODUCCION';
}

export function esEntornoDemoEmpresa(empresa?: EmpresaConClasificacion | null): boolean {
  return obtenerEntornoOperacionEmpresa(empresa) === 'DEMO';
}

export function esEntornoProduccionEmpresa(empresa?: EmpresaConClasificacion | null): boolean {
  return obtenerEntornoOperacionEmpresa(empresa) === 'PRODUCCION';
}

export function obtenerEtiquetaEntornoEmpresa(
  empresa?: EmpresaConClasificacion | null,
): 'Demo' | 'Producción' | undefined {
  const entornoOperacion = obtenerEntornoOperacionEmpresa(empresa);

  if (!entornoOperacion) {
    return undefined;
  }

  return entornoOperacion === 'DEMO' ? 'Demo' : 'Producción';
}

export function derivarEntornoAnaliticoEmpresa(
  empresa?: EmpresaConClasificacion | null,
): 'demo' | 'produccion' | undefined {
  const entornoOperacion = obtenerEntornoOperacionEmpresa(empresa);

  if (!entornoOperacion) {
    return undefined;
  }

  return entornoOperacion === 'DEMO' ? 'demo' : 'produccion';
}

export function obtenerEntornoTecnicoEmisionDesdeOperacion(
  entornoOperacion?: EntornoOperacionEmpresa | null,
): EntornoTecnicoEmision {
  return entornoOperacion === 'DEMO' ? 'TESTING' : 'PRODUCTION';
}

export function obtenerEntornoTecnicoEmisionEmpresa(
  empresa?: EmpresaConClasificacion | null,
): EntornoTecnicoEmision | undefined {
  const entornoOperacion = obtenerEntornoOperacionEmpresa(empresa);

  if (!entornoOperacion) {
    return obtenerEntornoTecnicoEmisionLegacy(empresa);
  }

  return obtenerEntornoTecnicoEmisionDesdeOperacion(entornoOperacion);
}

export function normalizarClasificacionEmpresa<T extends EmpresaConClasificacion>(
  empresa: T,
): T & { tipoEmpresa: TipoEmpresa; entornoOperacion: EntornoOperacionEmpresa } {
  const tipoEmpresa = obtenerTipoEmpresa(empresa);
  const entornoOperacion = obtenerEntornoOperacionEmpresa({
    ...empresa,
    tipoEmpresa,
  }) ?? (tipoEmpresa === 'demo' ? 'DEMO' : 'PRODUCCION');

  return {
    ...empresa,
    tipoEmpresa,
    entornoOperacion,
  };
}