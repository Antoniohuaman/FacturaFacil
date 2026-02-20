import {
  listarDepartamentos,
  listarDistritos,
  listarProvincias,
  obtenerFilasUbigeo,
  obtenerUbicacionPorUbigeo,
} from '@/shared/catalogos/ubigeo.pe';

export interface District {
  code: string;
  name: string;
}

export interface Province {
  code: string;
  name: string;
  districts: District[];
}

export interface Department {
  code: string;
  name: string;
  provinces: Province[];
}

const toTitleCase = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\b\p{L}/gu, (char) => char.toUpperCase());

const construirUbigeoData = (): Department[] => {
  const filas = obtenerFilasUbigeo();
  const depMap = new Map<string, Department>();

  for (const fila of filas) {
    const codigoDepartamento = fila.ubigeo.slice(0, 2);
    const codigoProvincia = fila.ubigeo.slice(0, 4);

    if (!depMap.has(fila.departamento)) {
      depMap.set(fila.departamento, {
        code: codigoDepartamento,
        name: toTitleCase(fila.departamento),
        provinces: [],
      });
    }

    const departamento = depMap.get(fila.departamento)!;
    let provincia = departamento.provinces.find((item) => item.code === codigoProvincia);

    if (!provincia) {
      provincia = {
        code: codigoProvincia,
        name: toTitleCase(fila.provincia),
        districts: [],
      };
      departamento.provinces.push(provincia);
    }

    provincia.districts.push({
      code: fila.ubigeo,
      name: toTitleCase(fila.distrito),
    });
  }

  return Array.from(depMap.values());
};

export const ubigeoData: Department[] = construirUbigeoData();

export function parseUbigeoCode(ubigeoCode: string): {
  department: string;
  province: string;
  district: string;
} | null {
  if (!ubigeoCode || ubigeoCode.trim().length !== 6) {
    return null;
  }

  const ubicacion = obtenerUbicacionPorUbigeo(ubigeoCode);
  if (!ubicacion) {
    return null;
  }

  return {
    department: toTitleCase(ubicacion.departamento),
    province: toTitleCase(ubicacion.provincia),
    district: toTitleCase(ubicacion.distrito),
  };
}

export { listarDepartamentos, listarProvincias, listarDistritos };
