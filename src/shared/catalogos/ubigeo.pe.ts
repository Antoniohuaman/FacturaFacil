import catalogoUbigeo from './ubigeo.pe.2022.json';

export type UbigeoRow = {
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
};

const filasUbigeo = catalogoUbigeo as UbigeoRow[];

let inicializado = false;
let departamentosOrdenados: string[] = [];
let provinciasPorDepartamento = new Map<string, string[]>();
let distritosPorDepartamentoProvincia = new Map<string, string[]>();
const ubigeoPorUbicacion = new Map<string, string>();
const nombrePorUbigeo = new Map<string, Omit<UbigeoRow, 'ubigeo'>>();

const normalizarTexto = (valor: string): string =>
  valor
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

const claveDepartamentoProvincia = (departamento: string, provincia: string): string =>
  `${normalizarTexto(departamento)}|${normalizarTexto(provincia)}`;

const claveUbicacion = (departamento: string, provincia: string, distrito: string): string =>
  `${normalizarTexto(departamento)}|${normalizarTexto(provincia)}|${normalizarTexto(distrito)}`;

const asegurarIndices = () => {
  if (inicializado) {
    return;
  }

  const departamentos = new Set<string>();
  const provincias = new Map<string, Set<string>>();
  const distritos = new Map<string, Set<string>>();

  for (const fila of filasUbigeo) {
    const departamento = normalizarTexto(fila.departamento);
    const provincia = normalizarTexto(fila.provincia);
    const distrito = normalizarTexto(fila.distrito);
    const ubigeo = fila.ubigeo.trim().padStart(6, '0');

    departamentos.add(departamento);

    if (!provincias.has(departamento)) {
      provincias.set(departamento, new Set<string>());
    }
    provincias.get(departamento)?.add(provincia);

    const claveDepProv = claveDepartamentoProvincia(departamento, provincia);
    if (!distritos.has(claveDepProv)) {
      distritos.set(claveDepProv, new Set<string>());
    }
    distritos.get(claveDepProv)?.add(distrito);

    ubigeoPorUbicacion.set(claveUbicacion(departamento, provincia, distrito), ubigeo);
    nombrePorUbigeo.set(ubigeo, { departamento, provincia, distrito });
  }

  departamentosOrdenados = Array.from(departamentos).sort((a, b) => a.localeCompare(b, 'es'));

  provinciasPorDepartamento = new Map(
    Array.from(provincias.entries()).map(([departamento, listaProvincias]) => [
      departamento,
      Array.from(listaProvincias).sort((a, b) => a.localeCompare(b, 'es')),
    ])
  );

  distritosPorDepartamentoProvincia = new Map(
    Array.from(distritos.entries()).map(([clave, listaDistritos]) => [
      clave,
      Array.from(listaDistritos).sort((a, b) => a.localeCompare(b, 'es')),
    ])
  );

  inicializado = true;
};

export const listarDepartamentos = (): string[] => {
  asegurarIndices();
  return departamentosOrdenados;
};

export const listarProvincias = (departamento: string): string[] => {
  asegurarIndices();
  return provinciasPorDepartamento.get(normalizarTexto(departamento)) ?? [];
};

export const listarDistritos = (departamento: string, provincia: string): string[] => {
  asegurarIndices();
  return distritosPorDepartamentoProvincia.get(claveDepartamentoProvincia(departamento, provincia)) ?? [];
};

export const obtenerUbigeo = (departamento: string, provincia: string, distrito: string): string => {
  asegurarIndices();
  return ubigeoPorUbicacion.get(claveUbicacion(departamento, provincia, distrito)) ?? '';
};

export const obtenerUbicacionPorUbigeo = (
  ubigeo: string
): { departamento: string; provincia: string; distrito: string } | null => {
  asegurarIndices();
  const codigo = ubigeo.trim().padStart(6, '0');
  return nombrePorUbigeo.get(codigo) ?? null;
};

export const obtenerFilasUbigeo = (): UbigeoRow[] => filasUbigeo;
