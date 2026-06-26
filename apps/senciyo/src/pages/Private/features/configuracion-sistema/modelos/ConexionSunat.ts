export interface AccesoSOL {
  usuarioSOL: string;
  claveSOL: string;
}

export interface CredencialesGRE {
  clientId: string;
  clientSecret: string;
}

export interface ConexionSunat {
  id: string;
  empresaId: string;
  accesoSOL?: AccesoSOL;
  credencialesGRE?: CredencialesGRE;
  actualizadoEl: Date;
}

export type UpdateAccesoSOLInput = AccesoSOL;
export type UpdateCredencialesGREInput = CredencialesGRE;
