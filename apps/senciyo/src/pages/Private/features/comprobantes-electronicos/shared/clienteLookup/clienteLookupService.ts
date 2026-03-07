import type { ClientData } from '../../models/comprobante.types';

export type ClienteLookupSource = 'RENIEC' | 'SUNAT';

export interface ReniecLookupData {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
}

export interface SunatLookupData {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  tipo: string;
  direccion: string;
  estado: string;
  condicion: string;
  pais: string;
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
  referenciaDireccion?: string;
  fechaInscripcion: string;
  sistemaEmision: string;
  actEconomicas: string[];
  esAgenteRetencion: boolean;
  esAgentePercepcion: boolean;
  esBuenContribuyente: boolean;
  esEmisorElectronico: boolean;
  exceptuadaPercepcion: boolean;
}

export interface ClienteLookupResult extends ClientData {
  origen: ClienteLookupSource;
  reniec?: ReniecLookupData;
  sunat?: SunatLookupData;
}

const normalizeDigits = (value: string): string => value.replace(/\D/g, '');

const hashDeterministico = (seed: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return hash >>> 0;
};

const pickByHash = <T,>(list: readonly T[], hash: number, offset = 0): T => {
  if (list.length === 0) {
    throw new Error('No se puede seleccionar desde una lista vacía');
  }
  return list[(hash + offset) % list.length];
};

const NOMBRES_1 = ['Luis', 'Carlos', 'José', 'Miguel', 'Diego', 'Jorge', 'Piero', 'Andrés', 'Marco', 'Daniel'] as const;
const NOMBRES_2 = ['Alberto', 'Fernando', 'Antonio', 'Eduardo', 'Raúl', 'Manuel', 'Enrique', 'Javier', 'Renato', 'David'] as const;
const APELLIDOS_PATERNO = ['Quispe', 'Flores', 'Sánchez', 'Rodríguez', 'García', 'Torres', 'Vargas', 'Castillo', 'Rojas', 'Huamán'] as const;
const APELLIDOS_MATERNO = ['Pérez', 'Mendoza', 'Ramírez', 'Gutiérrez', 'Cruz', 'Aguilar', 'Romero', 'Navarro', 'Salazar', 'Campos'] as const;

type UbicacionPeru = {
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
};

const UBICACIONES_PERU: readonly UbicacionPeru[] = [
  { departamento: 'LIMA', provincia: 'LIMA', distrito: 'MIRAFLORES', ubigeo: '150122' },
  { departamento: 'LIMA', provincia: 'LIMA', distrito: 'SAN ISIDRO', ubigeo: '150131' },
  { departamento: 'LIMA', provincia: 'LIMA', distrito: 'SURCO', ubigeo: '150140' },
  { departamento: 'AREQUIPA', provincia: 'AREQUIPA', distrito: 'YANAHUARA', ubigeo: '040129' },
  { departamento: 'LA LIBERTAD', provincia: 'TRUJILLO', distrito: 'TRUJILLO', ubigeo: '130101' },
  { departamento: 'CUSCO', provincia: 'CUSCO', distrito: 'WANCHAQ', ubigeo: '080108' },
  { departamento: 'PIURA', provincia: 'PIURA', distrito: 'PIURA', ubigeo: '200101' },
  { departamento: 'LAMBAYEQUE', provincia: 'CHICLAYO', distrito: 'CHICLAYO', ubigeo: '140101' },
  { departamento: 'JUNIN', provincia: 'HUANCAYO', distrito: 'HUANCAYO', ubigeo: '120101' },
  { departamento: 'ANCASH', provincia: 'SANTA', distrito: 'CHIMBOTE', ubigeo: '021801' },
] as const;

const VIAS = ['Av.', 'Jr.', 'Calle', 'Psje.'] as const;
const NOMBRES_VIA = ['Los Laureles', 'Las Palmeras', 'El Sol', 'Los Pinos', 'San Martín', 'Túpac Amaru', 'Manco Cápac', 'Los Geranios', 'Los Álamos', 'República'] as const;
const REFERENCIAS = ['Frente al parque central', 'A media cuadra del mercado', 'Cerca a la municipalidad', 'Costado de la clínica local', 'Frente al colegio principal'] as const;

const GIROS_EMPRESA = ['Comercial', 'Distribuidora', 'Servicios', 'Consultora', 'Tecnología', 'Logística', 'Inversiones', 'Soluciones'] as const;
const RUBROS = ['Andina', 'Pacífico', 'Norte', 'Sur', 'Central', 'Integral', 'Corporativa', 'Empresarial', 'Digital', 'Industrial'] as const;
const SUFIJOS_EMPRESA = ['S.A.C.', 'S.R.L.', 'S.A.'] as const;
const ACTIVIDADES = [
  'Principal - 6201 - ACTIVIDADES DE PROGRAMACIÓN INFORMÁTICA',
  'Secundaria - 7020 - ACTIVIDADES DE CONSULTORÍA DE GESTIÓN',
  'Secundaria - 4690 - VENTA AL POR MAYOR NO ESPECIALIZADA',
  'Secundaria - 5210 - ALMACENAMIENTO Y DEPÓSITO',
  'Secundaria - 4752 - VENTA AL POR MENOR DE FERRETERÍA',
] as const;

const buildDeterministicPersonFromDni = (dni: string): ReniecLookupData => {
  const hash = hashDeterministico(dni);
  const primerNombre = pickByHash(NOMBRES_1, hash, 0);
  const segundoNombre = pickByHash(NOMBRES_2, hash, 3);
  const apellidoPaterno = pickByHash(APELLIDOS_PATERNO, hash, 5).toUpperCase();
  const apellidoMaterno = pickByHash(APELLIDOS_MATERNO, hash, 7).toUpperCase();
  const nombres = `${primerNombre} ${segundoNombre}`.toUpperCase();
  const nombreCompleto = `${apellidoPaterno} ${apellidoMaterno} ${nombres}`.trim();

  return {
    dni,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    nombreCompleto,
  };
};

const buildDeterministicEmpresaFromRuc = (ruc: string): SunatLookupData => {
  const hash = hashDeterministico(ruc);
  const ubicacion = pickByHash(UBICACIONES_PERU, hash, 2);
  const via = pickByHash(VIAS, hash, 11);
  const nombreVia = pickByHash(NOMBRES_VIA, hash, 13);
  const referenciaDireccion = pickByHash(REFERENCIAS, hash, 17);
  const numeroVia = 100 + (hash % 800);
  const giro = pickByHash(GIROS_EMPRESA, hash, 19);
  const rubro = pickByHash(RUBROS, hash, 23);
  const sufijo = pickByHash(SUFIJOS_EMPRESA, hash, 29);
  const razonSocial = `${giro} ${rubro} ${sufijo}`;
  const nombreComercial = `${giro} ${rubro}`;
  const direccion = `${via} ${nombreVia} ${numeroVia}, ${ubicacion.distrito}, ${ubicacion.provincia}, ${ubicacion.departamento}`;
  const fechaInscripcion = `20${(hash % 10) + 10}-${String((hash % 12) + 1).padStart(2, '0')}-01`;
  const actividadPrincipal = pickByHash(ACTIVIDADES, hash, 31);
  const actividadSecundaria = pickByHash(ACTIVIDADES, hash, 37);

  return {
    ruc,
    razonSocial,
    nombreComercial,
    tipo: ruc.startsWith('20') ? 'SOCIEDAD ANONIMA CERRADA' : 'PERSONA NATURAL CON NEGOCIO',
    direccion,
    estado: 'ACTIVO',
    condicion: 'HABIDO',
    pais: 'PE',
    departamento: ubicacion.departamento,
    provincia: ubicacion.provincia,
    distrito: ubicacion.distrito,
    ubigeo: ubicacion.ubigeo,
    referenciaDireccion,
    fechaInscripcion,
    sistemaEmision: 'ELECTRONICA',
    actEconomicas: actividadPrincipal === actividadSecundaria ? [actividadPrincipal] : [actividadPrincipal, actividadSecundaria],
    esAgenteRetencion: hash % 5 === 0,
    esAgentePercepcion: hash % 7 === 0,
    esBuenContribuyente: hash % 11 === 0,
    esEmisorElectronico: true,
    exceptuadaPercepcion: hash % 13 === 0,
  };
};

export const lookupPersonaPorDni = async (dni: string): Promise<ClienteLookupResult | null> => {
  const normalized = normalizeDigits(dni);
  if (normalized.length !== 8) {
    return null;
  }

  const reniec = buildDeterministicPersonFromDni(normalized);
  const nombreNatural = `${reniec.nombres} ${reniec.apellidoPaterno} ${reniec.apellidoMaterno}`.trim();

  return {
    nombre: nombreNatural,
    tipoDocumento: 'dni',
    documento: normalized,
    direccion: undefined,
    email: undefined,
    telefono: undefined,
    origen: 'RENIEC',
    reniec,
  };
};

export const lookupEmpresaPorRuc = async (ruc: string): Promise<ClienteLookupResult | null> => {
  const normalized = normalizeDigits(ruc);
  if (normalized.length !== 11) {
    return null;
  }

  if (!(normalized.startsWith('1') || normalized.startsWith('2'))) {
    return null;
  }

  const sunat = buildDeterministicEmpresaFromRuc(normalized);

  return {
    nombre: sunat.razonSocial,
    tipoDocumento: 'ruc',
    documento: normalized,
    direccion: sunat.direccion,
    email: undefined,
    telefono: undefined,
    origen: 'SUNAT',
    sunat,
  };
};
