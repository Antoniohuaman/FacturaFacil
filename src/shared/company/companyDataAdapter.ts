import type { Company } from "../../pages/Private/features/configuracion-sistema/modelos/Company";
import type { CompanyData } from "../../pages/Private/features/comprobantes-electronicos/models/comprobante.types";

export function buildCompanyData(company: Company | null | undefined): CompanyData {
  if (!company) {
    return {
      name: "",
      razonSocial: "",
      ruc: "",
      address: "",
      phone: "",
      email: "",
    };
  }

  return {
    name: company.nombreComercial ?? company.razonSocial ?? "",
    razonSocial: company.razonSocial ?? company.nombreComercial ?? "",
    ruc: company.ruc ?? "",
    address: company.direccionFiscal ?? "",
    phone: company.telefonos?.[0] ?? "",
    email: company.correosElectronicos?.[0] ?? "",
  };
}
