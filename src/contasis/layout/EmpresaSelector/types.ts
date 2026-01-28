export interface Empresa {
  id: string;
  nombre: string;
  ruc?: string;
  logo?: string;
  gradient?: string;
}

export interface Establecimiento {
  id: string;
  nombre: string;
  direccion?: string;
  empresaId: string;
}

export interface EmpresaEstablecimientoActual {
  empresa: Empresa;
  establecimiento: Establecimiento;
}

export interface EmpresaSelectorProps {
  actual: EmpresaEstablecimientoActual | null;
  empresas?: Empresa[];
  establecimientos?: Establecimiento[];
  onChangeEmpresa?: (empresaId: string) => void;
  onChangeEstablecimiento?: (establecimientoId: string) => void;
  onAdministrarEmpresas?: () => void;
  className?: string;
}

// Para mantener compatibilidad hacia atrás (deprecated)
/** @deprecated Use Establecimiento instead */
export interface Sede extends Establecimiento {}

/** @deprecated Use EmpresaEstablecimientoActual instead */  
export interface EmpresaSedeActual extends EmpresaEstablecimientoActual {
  sede: Establecimiento;
}
