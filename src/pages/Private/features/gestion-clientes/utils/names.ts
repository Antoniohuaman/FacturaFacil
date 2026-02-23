export type NameParts = {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
};

export type LegacyNameParts = {
  primerNombre: string;
  segundoNombre: string;
};

export type ResolveCustomerNameParams = {
  tipoDocumento?: string | null;
  tipoPersona?: string | null;
  razonSocial?: string | null;
  nombreCompleto?: string | null;
  nombres?: string | null;
  primerNombre?: string | null;
  segundoNombre?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  fallbackFullName?: string | null;
  preferExistingParts?: boolean;
  splitMode?: 'cliente' | 'import';
};

export type ResolvedCustomerNameFields = NameParts & LegacyNameParts & {
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

const splitGivenNames = (nombres: string): LegacyNameParts => {
  const tokens = normalizeHumanName(nombres).split(' ').filter(Boolean);
  if (tokens.length === 0) {
    return { primerNombre: '', segundoNombre: '' };
  }

  return {
    primerNombre: tokens[0] ?? '',
    segundoNombre: tokens.slice(1).join(' '),
  };
};

const resolveGivenNames = (parts: {
  nombres?: string | null;
  primerNombre?: string | null;
  segundoNombre?: string | null;
}): string => {
  const nombres = normalizeHumanName(parts.nombres ?? '');
  if (nombres) {
    return nombres;
  }

  const legacyTokens = [parts.primerNombre, parts.segundoNombre]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => normalizeHumanName(value));

  return normalizeHumanName(legacyTokens.join(' '));
};

export const buildFullName = (parts: Partial<NameParts & LegacyNameParts>): string => {
  const tokens = [
    resolveGivenNames(parts),
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
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      nombreCompleto: '',
    };
  }

  const parts = normalized.split(' ').filter(Boolean);
  if (parts.length === 1) {
    return {
      nombres: parts[0],
      apellidoPaterno: '',
      apellidoMaterno: '',
      nombreCompleto: normalized,
    };
  }

  if (parts.length === 2) {
    return {
      nombres: parts[0],
      apellidoPaterno: parts[1],
      apellidoMaterno: '',
      nombreCompleto: normalized,
    };
  }

  if (parts.length === 3) {
    if (mode === 'import') {
      return {
        nombres: parts[0],
        apellidoPaterno: parts[1],
        apellidoMaterno: parts[2],
        nombreCompleto: normalized,
      };
    }

    return {
      nombres: [parts[0], parts[1]].filter(Boolean).join(' '),
      apellidoPaterno: parts[2],
      apellidoMaterno: '',
      nombreCompleto: normalized,
    };
  }

  return {
    nombres: parts.slice(0, parts.length - 2).join(' '),
    apellidoPaterno: parts[parts.length - 2] ?? '',
    apellidoMaterno: parts[parts.length - 1] ?? '',
    nombreCompleto: normalized,
  };
};

export const normalizarNombres = (
  parts: Partial<NameParts & LegacyNameParts>
): NameParts & LegacyNameParts => {
  const nombres = resolveGivenNames(parts);
  const apellidoPaterno = normalizeHumanName(parts.apellidoPaterno ?? '');
  const apellidoMaterno = normalizeHumanName(parts.apellidoMaterno ?? '');
  const nombreCompleto = normalizeHumanName(
    parts.nombreCompleto ?? buildFullName({ nombres, apellidoPaterno, apellidoMaterno })
  );
  const legacy = splitGivenNames(nombres);

  return {
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    nombreCompleto,
    primerNombre: legacy.primerNombre,
    segundoNombre: legacy.segundoNombre,
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
      nombres: '',
      primerNombre: '',
      segundoNombre: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      nombreCompleto: razon,
    };
  }

  const nombres = resolveGivenNames({
    nombres: params.nombres,
    primerNombre: params.primerNombre,
    segundoNombre: params.segundoNombre,
  });
  const apellidoPaterno = normalizeHumanName(params.apellidoPaterno ?? '');
  const apellidoMaterno = normalizeHumanName(params.apellidoMaterno ?? '');
  const hasExistingParts = Boolean(nombres || apellidoPaterno || apellidoMaterno);

  let resolvedParts: NameParts;
  if (params.preferExistingParts !== false && hasExistingParts) {
    resolvedParts = {
      nombres,
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
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      nombreCompleto: '',
    };
  }

  const mergedFullName = nombreCompleto || buildFullName(resolvedParts);
  const normalized = normalizarNombres({
    ...resolvedParts,
    nombreCompleto: mergedFullName,
  });

  return {
    razonSocial: '',
    nombres: normalized.nombres,
    primerNombre: normalized.primerNombre,
    segundoNombre: normalized.segundoNombre,
    apellidoPaterno: normalized.apellidoPaterno,
    apellidoMaterno: normalized.apellidoMaterno,
    nombreCompleto: normalized.nombreCompleto,
  };
};
