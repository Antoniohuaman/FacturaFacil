export type NameParts = {
  primerNombre: string;
  segundoNombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
};

export type ResolveCustomerNameParams = {
  tipoDocumento?: string | null;
  tipoPersona?: string | null;
  razonSocial?: string | null;
  nombreCompleto?: string | null;
  primerNombre?: string | null;
  segundoNombre?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  fallbackFullName?: string | null;
  preferExistingParts?: boolean;
  splitMode?: 'cliente' | 'import';
};

export type ResolvedCustomerNameFields = NameParts & {
  razonSocial: string;
};

/*
Casos comparativos (salidas esperadas = comportamiento actual)
- " Juan   Carlos  Perez  Ruiz " -> splitFullName(cliente): primerNombre="Juan", segundoNombre="Carlos", apellidoPaterno="Perez", apellidoMaterno="Ruiz"
- " Juan   Carlos  Perez " -> splitFullName(cliente): primerNombre="Juan", segundoNombre="Carlos", apellidoPaterno="Perez", apellidoMaterno=""
- " Juan   Carlos  Perez " -> splitFullName(import): primerNombre="Juan", segundoNombre="", apellidoPaterno="Carlos", apellidoMaterno="Perez"
- " Juan Perez " -> splitFullName: primerNombre="Juan", apellidoPaterno="Perez"
- " Juan " -> splitFullName: primerNombre="Juan"
- "" -> splitFullName: todos vacio
- RUC (tipoDocumento=6): razonSocial se usa y no se inventan nombres personales
- No RUC: se usan nombres personales; si solo hay nombre completo, se divide conservadoramente
*/

export const normalizeHumanName = (input: string): string =>
  input.replace(/\s+/g, ' ').trim();

export const buildFullName = (parts: Partial<NameParts>): string => {
  const tokens = [
    parts.primerNombre,
    parts.segundoNombre,
    parts.apellidoPaterno,
    parts.apellidoMaterno,
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => normalizeHumanName(value));

  return normalizeHumanName(tokens.join(' '));
};

export const splitFullName = (fullName: string, mode: 'cliente' | 'import' = 'cliente'): NameParts => {
  const normalized = normalizeHumanName(fullName || '');
  if (!normalized) {
    return {
      primerNombre: '',
      segundoNombre: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      nombreCompleto: '',
    };
  }

  const parts = normalized.split(' ').filter(Boolean);
  if (parts.length === 1) {
    return {
      primerNombre: parts[0],
      segundoNombre: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      nombreCompleto: normalized,
    };
  }

  if (parts.length === 2) {
    return {
      primerNombre: parts[0],
      segundoNombre: '',
      apellidoPaterno: parts[1],
      apellidoMaterno: '',
      nombreCompleto: normalized,
    };
  }

  if (parts.length === 3) {
    if (mode === 'import') {
      return {
        primerNombre: parts[0],
        segundoNombre: '',
        apellidoPaterno: parts[1],
        apellidoMaterno: parts[2],
        nombreCompleto: normalized,
      };
    }

    return {
      primerNombre: parts[0],
      segundoNombre: parts[1],
      apellidoPaterno: parts[2],
      apellidoMaterno: '',
      nombreCompleto: normalized,
    };
  }

  return {
    primerNombre: parts[0],
    segundoNombre: parts.slice(1, parts.length - 2).join(' '),
    apellidoPaterno: parts[parts.length - 2] ?? '',
    apellidoMaterno: parts[parts.length - 1] ?? '',
    nombreCompleto: normalized,
  };
};

export const resolveCustomerNameFields = (params: ResolveCustomerNameParams): ResolvedCustomerNameFields => {
  const isJuridica = params.tipoDocumento?.toString().trim() === '6' ||
    params.tipoPersona?.toString().trim() === 'Juridica';

  const razonSocial = normalizeHumanName(params.razonSocial ?? '');
  const nombreCompleto = normalizeHumanName(params.nombreCompleto ?? '');
  const fallbackFullName = normalizeHumanName(params.fallbackFullName ?? '');

  if (isJuridica) {
    const razon = razonSocial || nombreCompleto || fallbackFullName;
    return {
      razonSocial: razon,
      primerNombre: '',
      segundoNombre: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      nombreCompleto: razon,
    };
  }

  const primerNombre = normalizeHumanName(params.primerNombre ?? '');
  const segundoNombre = normalizeHumanName(params.segundoNombre ?? '');
  const apellidoPaterno = normalizeHumanName(params.apellidoPaterno ?? '');
  const apellidoMaterno = normalizeHumanName(params.apellidoMaterno ?? '');
  const hasExistingParts = Boolean(primerNombre || segundoNombre || apellidoPaterno || apellidoMaterno);

  let resolvedParts: NameParts;
  if (params.preferExistingParts !== false && hasExistingParts) {
    resolvedParts = {
      primerNombre,
      segundoNombre,
      apellidoPaterno,
      apellidoMaterno,
      nombreCompleto: '',
    };
  } else if (nombreCompleto) {
    resolvedParts = splitFullName(nombreCompleto, params.splitMode ?? 'cliente');
  } else if (fallbackFullName) {
    resolvedParts = splitFullName(fallbackFullName, params.splitMode ?? 'cliente');
  } else {
    resolvedParts = {
      primerNombre: '',
      segundoNombre: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      nombreCompleto: '',
    };
  }

  const mergedFullName = nombreCompleto || buildFullName(resolvedParts);

  return {
    razonSocial: '',
    primerNombre: resolvedParts.primerNombre,
    segundoNombre: resolvedParts.segundoNombre,
    apellidoPaterno: resolvedParts.apellidoPaterno,
    apellidoMaterno: resolvedParts.apellidoMaterno,
    nombreCompleto: mergedFullName,
  };
};
