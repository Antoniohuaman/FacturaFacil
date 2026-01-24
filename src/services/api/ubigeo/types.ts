export interface Departamento {
  codigo: string;
  nombre: string;
}

export interface Provincia {
  codigoDepartamento: string;
  codigo: string;
  nombre: string;
}

export interface Distrito {
  codigoDepartamento: string;
  codigoProvincia: string;
  codigo: string;
  nombre: string;
}

export interface UbigeoSelection {
  departamento?: Departamento;
  provincia?: Provincia;
  distrito?: Distrito;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}
