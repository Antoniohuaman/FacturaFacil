import type { User } from '../../pages/Private/features/autenticacion/types/auth.types';
import type { Company } from '../../pages/Private/features/configuracion-sistema/modelos/Company';
import type { UserSession } from '../../contexts/UserSessionContext';

export interface ContextoIdentidadAnalitica {
  userId: string;
  userRole?: string;
  userStatus?: string;
  companyId?: string;
  companyName?: string;
  companyConfigured: boolean;
  establecimientoId?: string;
  entorno?: 'demo' | 'produccion';
  entornoSunat?: 'TESTING' | 'PRODUCTION';
}

interface ResolverContextoAnaliticoEntrada {
  isAuthenticated: boolean;
  authUser: User | null;
  session: UserSession | null;
  tenantId: string | null;
  activeEstablecimientoId: string | null;
}

const obtenerCompanyIdCanonico = (
  session: UserSession | null,
  tenantId: string | null,
): string | undefined => {
  if (session?.currentCompanyId) {
    return session.currentCompanyId;
  }

  // Prototipo: la sesión normalizada usa currentCompanyId; si aún no existe,
  // el fallback más consistente es el tenant activo expuesto por TenantProvider.
  return tenantId || undefined;
};

const obtenerEntornoSunat = (company: Company | null | undefined): 'TESTING' | 'PRODUCTION' | undefined => {
  return company?.configuracionSunatEmpresa?.entornoSunat;
};

const derivarEntornoAnalitico = (
  entornoSunat: 'TESTING' | 'PRODUCTION' | undefined,
): 'demo' | 'produccion' | undefined => {
  if (!entornoSunat) {
    return undefined;
  }

  return entornoSunat === 'PRODUCTION' ? 'produccion' : 'demo';
};

const obtenerNombreEmpresaSeguro = (company: Company | null | undefined): string | undefined => {
  const razonSocial = company?.razonSocial?.trim();
  const nombreComercial = company?.nombreComercial?.trim();

  return razonSocial || nombreComercial || undefined;
};

const derivarEmpresaConfigurada = (
  companyId: string | undefined,
  company: Company | null | undefined,
): boolean => {
  if (!companyId) {
    return false;
  }

  const nombreEmpresa = obtenerNombreEmpresaSeguro(company);
  const ruc = company?.ruc?.trim();

  return Boolean(nombreEmpresa || ruc);
};

export function resolverContextoIdentidadAnalitica({
  isAuthenticated,
  authUser,
  session,
  tenantId,
  activeEstablecimientoId,
}: ResolverContextoAnaliticoEntrada): ContextoIdentidadAnalitica | null {
  if (!isAuthenticated || !authUser?.id) {
    return null;
  }

  const companyId = obtenerCompanyIdCanonico(session, tenantId);
  const currentCompany = session?.currentCompany;
  const entornoSunat = obtenerEntornoSunat(currentCompany);
  const entorno = derivarEntornoAnalitico(entornoSunat);
  const establecimientoId = session?.currentEstablecimientoId || activeEstablecimientoId || undefined;

  return {
    userId: authUser.id,
    userRole: authUser.rol,
    userStatus: authUser.estado,
    companyId,
    companyName: obtenerNombreEmpresaSeguro(currentCompany),
    companyConfigured: derivarEmpresaConfigurada(companyId, currentCompany),
    establecimientoId,
    entorno,
    entornoSunat,
  };
}
