import type {
  Empresa,
  User,
  WorkspaceContext,
} from '../../pages/Private/features/autenticacion/types/auth.types';
import type { Company } from '../../pages/Private/features/configuracion-sistema/modelos/Company';
import type { UserSession } from '../../contexts/UserSessionContext';
import {
  derivarEntornoAnaliticoEmpresa,
} from '../empresas/entornoEmpresa';

export interface ContextoIdentidadAnalitica {
  userId: string;
  userRole?: string;
  userStatus?: string;
  companyId?: string;
  companyConfigured: boolean;
  establecimientoId?: string;
  entorno?: 'demo' | 'produccion';
}

interface ResolverContextoAnaliticoEntrada {
  isAuthenticated: boolean;
  authUser: User | null;
  session: UserSession | null;
  tenantId: string | null;
  activeEstablecimientoId: string | null;
}

type EmpresaAnalitica = Pick<Company, 'ruc' | 'razonSocial' | 'nombreComercial'>
  | Pick<Empresa, 'ruc' | 'razonSocial' | 'nombreComercial'>;

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

const obtenerNombreEmpresaSeguro = (company: EmpresaAnalitica | null | undefined): string | undefined => {
  const razonSocial = company?.razonSocial?.trim();
  const nombreComercial = company?.nombreComercial?.trim();

  return razonSocial || nombreComercial || undefined;
};

const derivarEmpresaConfigurada = (
  companyId: string | undefined,
  company: EmpresaAnalitica | null | undefined,
): boolean => {
  if (!companyId) {
    return false;
  }

  const nombreEmpresa = obtenerNombreEmpresaSeguro(company);
  const ruc = company?.ruc?.trim();

  return Boolean(nombreEmpresa || ruc);
};

export function resolverContextoEmpresaAnalitica(
  companyId: string | undefined,
  company: EmpresaAnalitica | null | undefined,
): Pick<ContextoIdentidadAnalitica, 'companyId' | 'companyConfigured'> {
  return {
    companyId,
    companyConfigured: derivarEmpresaConfigurada(companyId, company),
  };
}

export function resolverContextoEmpresaAnaliticaDesdeTenant(
  empresas: Empresa[],
  contextoActual: WorkspaceContext | null,
): Pick<ContextoIdentidadAnalitica, 'companyId' | 'companyConfigured'> | null {
  if (!contextoActual?.empresaId) {
    return null;
  }

  const empresaActual = contextoActual.empresa
    || empresas.find((empresa) => empresa.id === contextoActual.empresaId)
    || null;

  return resolverContextoEmpresaAnalitica(contextoActual.empresaId, empresaActual);
}

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
  const contextoEmpresa = resolverContextoEmpresaAnalitica(companyId, currentCompany);
  const entorno = derivarEntornoAnaliticoEmpresa(currentCompany);
  const establecimientoId = session?.currentEstablecimientoId || activeEstablecimientoId || undefined;

  return {
    userId: authUser.id,
    userRole: authUser.rol,
    userStatus: authUser.estado,
    companyId: contextoEmpresa.companyId,
    companyConfigured: contextoEmpresa.companyConfigured,
    establecimientoId,
    entorno,
  };
}
