export interface Empresa {
  id: string;
  nombre: string;
  ruc?: string;
  logo?: string;
  gradient?: string;
}

export interface Sede {
  id: string;
  nombre: string;
  direccion?: string;
  empresaId: string;
}

export interface EmpresaSedeActual {
  empresa: Empresa;
  sede: Sede;
}

export interface EmpresaSelectorProps {
  actual: EmpresaSedeActual | null;
  empresas?: Empresa[];
  sedes?: Sede[];
  onChangeEmpresa?: (empresaId: string) => void;
  onChangeSede?: (sedeId: string) => void;
  className?: string;
}
