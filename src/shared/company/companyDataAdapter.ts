import type { Company } from "../../pages/Private/features/configuracion-sistema/models/Company";
import type { CompanyData } from "../../pages/Private/features/comprobantes-electronicos/models/comprobante.types";

export function buildCompanyData(company: Company | null | undefined): CompanyData {
  if (!company) {
    return {
      name: "",
      businessName: "",
      ruc: "",
      address: "",
      phone: "",
      email: "",
    };
  }

  return {
    name: company.tradeName ?? company.businessName ?? "",
    businessName: company.businessName ?? company.tradeName ?? "",
    ruc: company.ruc ?? "",
    address: company.address ?? "",
    phone: company.phones?.[0] ?? "",
    email: company.emails?.[0] ?? "",
  };
}
