import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  Upload,
  Info,
  AlertCircle,
  FileSpreadsheet,
  RefreshCcw,
  XCircle,
  CheckCircle2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCaja } from '../../control-caja/context/CajaContext';
import { useClientes } from '../hooks';
import { ClientesModuleLayout } from '../components/ClientesModuleLayout';
import type {
  ImportMode,
  CreateClienteDTO,
  BulkImportSummary,
  ClientType,
} from '../models';
import type { DocumentCode, DocumentDefinition } from '../utils/documents';
import {
  DOCUMENT_DEFINITIONS,
  buildDocumentReference,
  documentTypeFromCode,
  findDocumentDefinition,
  normalizeDocumentNumber,
  normalizeKey,
  onlyDigits,
} from '../utils/documents';
import { isValidEmail, mergeEmails, sanitizePhones } from '../utils/contact';

type ValidationError = {
  rowNumber: number;
  documentReference: string;
  messages: string[];
};

type ParseResult = {
  dtos: CreateClienteDTO[];
  errors: ValidationError[];
  totalRows: number;
  validRows: number;
};

type ImportReport = {
  mode: ImportMode;
  fileName: string;
  totalRows: number;
  validRows: number;
  parseErrors: ValidationError[];
  backendSummary?: BulkImportSummary;
  backendErrors?: BulkImportSummary['errors'];
  executedAt: Date;
};

const BASIC_TEMPLATE_PATH = '/plantillas/Plantilla_ImportacionClientes_basico.xlsx';
const COMPLETE_TEMPLATE_PATH = '/plantillas/Plantilla_ImportacionClientes_completo.xlsx';

const BASIC_TEMPLATE_HEADERS = [
  'TIPO DE CUENTA',
  'CODIGO TIPO DE DOCUMENTO',
  'NUM. DOCUMENTO',
  'RAZON SOCIAL',
  'APELLIDO PATERNO',
  'APELLIDO MATERNO',
  'NOMBRE 1',
  'NOMBRE 2',
  'TELEFONO',
  'CORREO',
  'DIRECCION',
  'DEPARTAMENTO',
  'PROVINCIA',
  'DISTRITO',
] as const;

type BasicTemplateHeader = typeof BASIC_TEMPLATE_HEADERS[number];

const normalizeTemplateHeader = (header: string): string => header.trim().replace(/\s+/g, ' ').toUpperCase();

const BASIC_HEADER_NORMALIZED_TO_CANONICAL: Record<string, BasicTemplateHeader> = {
  'TIPO DE CUENTA': 'TIPO DE CUENTA',
  'CODIGO TIPO DE DOCUMENTO': 'CODIGO TIPO DE DOCUMENTO',
  'NUM. DOCUMENTO': 'NUM. DOCUMENTO',
  'RAZON SOCIAL': 'RAZON SOCIAL',
  'APELLIDO PATERNO': 'APELLIDO PATERNO',
  'APELLIDO MATERNO': 'APELLIDO MATERNO',
  'NOMBRE 1': 'NOMBRE 1',
  'NOMBRE 2': 'NOMBRE 2',
  'TELEFONO': 'TELEFONO',
  'TELÉFONO': 'TELEFONO',
  'CORREO': 'CORREO',
  'DIRECCION': 'DIRECCION',
  'DIRECCIÓN': 'DIRECCION',
  'DEPARTAMENTO': 'DEPARTAMENTO',
  'PROVINCIA': 'PROVINCIA',
  'DISTRITO': 'DISTRITO',
};

type BasicRowNormalized = {
  tipoCuenta: string;
  codigoDocumento: string;
  numeroDocumento: string;
  razonSocial: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombre1: string;
  nombre2: string;
  telefono: string;
  correo: string;
  direccion: string;
  departamento: string;
  provincia: string;
  distrito: string;
};

const createHeaderIndexMap = <T extends string>(
  headerRow: string[],
  expectedHeaders: readonly T[],
  dictionary: Record<string, T>,
  modeLabel: string
): Record<T, number> => {
  if (headerRow.length < expectedHeaders.length) {
    throw new Error(`La plantilla de ${modeLabel} no coincide con la versión oficial. Descarga el archivo nuevamente.`);
  }

  const indexMap = {} as Record<T, number>;

  expectedHeaders.forEach((expectedHeader, index) => {
    const rawHeader = headerRow[index] ?? '';
    const canonical = dictionary[normalizeTemplateHeader(rawHeader)];
    if (!canonical || canonical !== expectedHeader) {
      throw new Error(`Los encabezados del archivo no coinciden con la plantilla oficial de ${modeLabel}. Descárgala nuevamente antes de importar.`);
    }
    indexMap[expectedHeader] = index;
  });

  for (let idx = expectedHeaders.length; idx < headerRow.length; idx += 1) {
    const extra = headerRow[idx];
    if (extra && extra.toString().trim() !== '') {
      throw new Error(`Se detectaron columnas adicionales en el archivo. Utiliza la plantilla oficial de ${modeLabel} sin agregar ni reordenar columnas.`);
    }
  }

  return indexMap;
};

const COMPLETE_TEMPLATE_HEADERS = [
  'TIPO DE CUENTA',
  'CODIGO TIPO DE DOCUMENTO',
  'NUM. DOCUMENTO',
  'RAZON SOCIAL',
  'NOMBRE COMERCIAL',
  'APELLIDO PATERNO',
  'APELLIDO MATERNO',
  'NOMBRE 1',
  'NOMBRE 2',
  'TELEFONO 1',
  'TELEFONO 2',
  'TELEFONO 3',
  'CORREO 1',
  'CORREO 2',
  'CORREO 3',
  'ESTADO CLIENTE',
  'DIRECCION',
  'DEPARTAMENTO',
  'PROVINCIA',
  'DISTRITO',
  'REFERENCIA',
  'UBIGEO',
] as const;

type CompleteTemplateHeader = typeof COMPLETE_TEMPLATE_HEADERS[number];

const COMPLETE_HEADER_NORMALIZED_TO_CANONICAL: Record<string, CompleteTemplateHeader> = {
  'TIPO DE CUENTA': 'TIPO DE CUENTA',
  'CODIGO TIPO DE DOCUMENTO': 'CODIGO TIPO DE DOCUMENTO',
  'NUM. DOCUMENTO': 'NUM. DOCUMENTO',
  'RAZON SOCIAL': 'RAZON SOCIAL',
  'NOMBRE COMERCIAL': 'NOMBRE COMERCIAL',
  'APELLIDO PATERNO': 'APELLIDO PATERNO',
  'APELLIDO MATERNO': 'APELLIDO MATERNO',
  'NOMBRE 1': 'NOMBRE 1',
  'NOMBRE 2': 'NOMBRE 2',
  'TELEFONO 1': 'TELEFONO 1',
  'TELEFONO 2': 'TELEFONO 2',
  'TELEFONO 3': 'TELEFONO 3',
  'TELÉFONO 1': 'TELEFONO 1',
  'TELÉFONO 2': 'TELEFONO 2',
  'TELÉFONO 3': 'TELEFONO 3',
  'CORREO 1': 'CORREO 1',
  'CORREO 2': 'CORREO 2',
  'CORREO 3': 'CORREO 3',
  'ESTADO CLIENTE': 'ESTADO CLIENTE',
  'DIRECCION': 'DIRECCION',
  'DIRECCIÓN': 'DIRECCION',
  'DEPARTAMENTO': 'DEPARTAMENTO',
  'PROVINCIA': 'PROVINCIA',
  'DISTRITO': 'DISTRITO',
  'REFERENCIA': 'REFERENCIA',
  'UBIGEO': 'UBIGEO',
};

type CompleteRowNormalized = {
  tipoCuenta: string;
  codigoDocumento: string;
  numeroDocumento: string;
  razonSocial: string;
  nombreComercial: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombre1: string;
  nombre2: string;
  telefono1: string;
  telefono2: string;
  telefono3: string;
  correo1: string;
  correo2: string;
  correo3: string;
  estadoCliente: string;
  direccion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  referencia: string;
  ubigeo: string;
};

const CLIENT_TYPE_MAP: Record<string, ClientType> = {
  cliente: 'Cliente',
  proveedor: 'Proveedor',
  clienteproveedor: 'Cliente-Proveedor',
  'cliente-proveedor': 'Cliente-Proveedor',
};

const ESTADO_MAP: Record<string, 'Habilitado' | 'Deshabilitado'> = {
  habilitado: 'Habilitado',
  activo: 'Habilitado',
  deshabilitado: 'Deshabilitado',
  inactivo: 'Deshabilitado',
};

const UBIGEO_EXPECTED_DIGITS = 6;

const getDefinitionByCode = (code?: string): DocumentDefinition | undefined => {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  return DOCUMENT_DEFINITIONS.find((definition) => definition.code === normalized as DocumentCode);
};

const resolveDocumentDefinition = (value: string): DocumentDefinition | undefined =>
  getDefinitionByCode(value) ?? findDocumentDefinition(value);

const normalizeUbigeoCode = (rawValue: string, errors?: string[]): string => {
  const trimmed = (rawValue ?? '').trim();
  if (!trimmed) {
    return '';
  }

  const digits = onlyDigits(trimmed);
  if (!digits) {
    errors?.push('El UBIGEO solo puede contener dígitos.');
    return '';
  }

  if (digits.length < UBIGEO_EXPECTED_DIGITS) {
    return digits.padStart(UBIGEO_EXPECTED_DIGITS, '0');
  }

  return digits;
};

const resolveDocument = (value: string): DocumentDefinition | undefined => resolveDocumentDefinition(value);

const collectEmails = (
  row: Record<string, string>,
  keys: string[],
  errors: string[],
  max = 3
): string[] => {
  const rawEmails: string[] = [];
  for (const key of keys) {
    const value = row[key];
    if (!value) continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (!isValidEmail(trimmed)) {
      errors.push(`Correo inválido (${trimmed})`);
      continue;
    }
    rawEmails.push(trimmed);
  }
  return mergeEmails(rawEmails).slice(0, max);
};

const collectPhones = (
  row: Record<string, string>,
  keys: Array<{ number: string; type?: string }>,
  errors: string[],
): Array<{ numero: string; tipo: string }> => {
  const phones = keys
    .map(({ number, type }) => {
      const raw = row[number];
      if (!raw) return null;
      const digits = onlyDigits(raw);
      if (!digits) {
        errors.push(`El teléfono "${raw}" es inválido`);
        return null;
      }
      if (digits.length < 6 || digits.length > 15) {
        errors.push(`El teléfono ${digits} debe tener entre 6 y 15 dígitos`);
        return null;
      }
      const tipoColumn = type ? row[type] : undefined;
      const tipoNormalizado = tipoColumn && tipoColumn.trim() !== '' ? tipoColumn.trim() : 'Móvil';
      return { numero: digits, tipo: tipoNormalizado };
    })
    .filter((telefono): telefono is { numero: string; tipo: string } => Boolean(telefono));

  return sanitizePhones(phones);
};

const buildBasicRow = (
  values: string[],
  indexMap: Record<BasicTemplateHeader, number>
): BasicRowNormalized => {
  const read = (header: BasicTemplateHeader): string => {
    const idx = indexMap[header];
    if (idx === undefined) {
      return '';
    }
    return values[idx] ?? '';
  };

  return {
    tipoCuenta: read('TIPO DE CUENTA').trim(),
    codigoDocumento: read('CODIGO TIPO DE DOCUMENTO').trim(),
    numeroDocumento: read('NUM. DOCUMENTO').trim(),
    razonSocial: read('RAZON SOCIAL').trim(),
    apellidoPaterno: read('APELLIDO PATERNO').trim(),
    apellidoMaterno: read('APELLIDO MATERNO').trim(),
    nombre1: read('NOMBRE 1').trim(),
    nombre2: read('NOMBRE 2').trim(),
    telefono: read('TELEFONO').trim(),
    correo: read('CORREO').trim(),
    direccion: read('DIRECCION').trim(),
    departamento: read('DEPARTAMENTO').trim(),
    provincia: read('PROVINCIA').trim(),
    distrito: read('DISTRITO').trim(),
  };
};

const buildCompleteRow = (
  values: string[],
  indexMap: Record<CompleteTemplateHeader, number>
): CompleteRowNormalized => {
  const read = (header: CompleteTemplateHeader): string => {
    const idx = indexMap[header];
    if (idx === undefined) {
      return '';
    }
    return values[idx] ?? '';
  };

  return {
    tipoCuenta: read('TIPO DE CUENTA').trim(),
    codigoDocumento: read('CODIGO TIPO DE DOCUMENTO').trim(),
    numeroDocumento: read('NUM. DOCUMENTO').trim(),
    razonSocial: read('RAZON SOCIAL').trim(),
    nombreComercial: read('NOMBRE COMERCIAL').trim(),
    apellidoPaterno: read('APELLIDO PATERNO').trim(),
    apellidoMaterno: read('APELLIDO MATERNO').trim(),
    nombre1: read('NOMBRE 1').trim(),
    nombre2: read('NOMBRE 2').trim(),
    telefono1: read('TELEFONO 1').trim(),
    telefono2: read('TELEFONO 2').trim(),
    telefono3: read('TELEFONO 3').trim(),
    correo1: read('CORREO 1').trim(),
    correo2: read('CORREO 2').trim(),
    correo3: read('CORREO 3').trim(),
    estadoCliente: read('ESTADO CLIENTE').trim(),
    direccion: read('DIRECCION').trim(),
    departamento: read('DEPARTAMENTO').trim(),
    provincia: read('PROVINCIA').trim(),
    distrito: read('DISTRITO').trim(),
    referencia: read('REFERENCIA').trim(),
    ubigeo: read('UBIGEO').trim(),
  };
};

const buildDtoFromBasicRecord = (
  row: BasicRowNormalized,
  errors: string[]
): CreateClienteDTO | null => {
  const missingColumns: string[] = [];

  if (!row.tipoCuenta) {
    missingColumns.push('TIPO DE CUENTA');
  }

  if (!row.codigoDocumento) {
    missingColumns.push('CODIGO TIPO DE DOCUMENTO');
  }

  const codigo = row.codigoDocumento.toUpperCase();
  const documentType = documentTypeFromCode(codigo);
  const normalizedCode = documentType ? (codigo as DocumentCode) : undefined;

  if (!documentType) {
    errors.push(`Código de tipo de documento inválido (${row.codigoDocumento || 'vacío'})`);
  }

  const documentNumber = normalizeDocumentNumber(normalizedCode, row.numeroDocumento, errors);

  const requiresDocumentNumber = documentType
    ? !['SIN_DOCUMENTO', 'NO_DOMICILIADO', 'DOC_IDENTIF_PERS_NAT_NO_DOM'].includes(documentType)
    : false;

  if (requiresDocumentNumber && !documentNumber) {
    missingColumns.push('NUM. DOCUMENTO');
    errors.push('Número de documento requerido');
  }

  if (documentType === 'RUC') {
    if (!row.razonSocial) {
      missingColumns.push('RAZON SOCIAL');
    }
  } else {
    if (!row.apellidoPaterno) {
      missingColumns.push('APELLIDO PATERNO');
    }
    if (!row.apellidoMaterno) {
      missingColumns.push('APELLIDO MATERNO');
    }
    if (!row.nombre1) {
      missingColumns.push('NOMBRE 1');
    }
  }

  if (missingColumns.length > 0) {
    errors.push(`Faltan datos obligatorios: ${[...new Set(missingColumns)].join(', ')}`);
  }

  const tipoCuentaNormalized = normalizeKey(row.tipoCuenta);
  const clientType = CLIENT_TYPE_MAP[tipoCuentaNormalized];

  if (!clientType) {
    errors.push(`Tipo de cuenta inválido (${row.tipoCuenta || 'vacío'})`);
  }

  const emails = mergeEmails(row.correo ? [row.correo] : []);
  if (row.correo && emails.length === 0) {
    errors.push(`Correo inválido (${row.correo})`);
  }

  let telefonos: Array<{ numero: string; tipo: string }> = [];
  const telefonoDigits = row.telefono ? onlyDigits(row.telefono) : '';
  if (row.telefono && !telefonoDigits) {
    errors.push(`Teléfono inválido (${row.telefono})`);
  } else if (telefonoDigits && (telefonoDigits.length < 6 || telefonoDigits.length > 15)) {
    errors.push(`El teléfono debe tener entre 6 y 15 dígitos (${telefonoDigits})`);
  } else if (telefonoDigits) {
    telefonos = sanitizePhones([{ numero: telefonoDigits, tipo: 'Móvil' }]);
  }

  if (!documentType || !clientType || (requiresDocumentNumber && !documentNumber) || errors.length > 0) {
    return null;
  }

  const tipoPersona = documentType === 'RUC' ? 'Juridica' : 'Natural';
  const nombreCompleto = documentType === 'RUC'
    ? row.razonSocial.trim()
    : [row.nombre1, row.nombre2, row.apellidoPaterno, row.apellidoMaterno]
        .map((value) => value.trim())
        .filter(Boolean)
        .join(' ');

  const payload: CreateClienteDTO = {
    documentType,
    documentNumber,
    name: nombreCompleto,
    type: clientType,
    tipoDocumento: codigo,
    numeroDocumento: documentNumber,
    tipoPersona,
    tipoCuenta: clientType,
    nombreCompleto,
  };

  if (documentType === 'RUC') {
    payload.razonSocial = row.razonSocial.trim();
  } else {
    payload.primerNombre = row.nombre1.trim();
    if (row.nombre2.trim()) {
      payload.segundoNombre = row.nombre2.trim();
    }
    payload.apellidoPaterno = row.apellidoPaterno.trim();
    payload.apellidoMaterno = row.apellidoMaterno.trim();
  }

  if (emails.length > 0) {
    payload.email = emails[0];
    payload.emails = emails;
  }

  if (telefonos.length > 0) {
    payload.phone = telefonos[0].numero;
    payload.telefonos = telefonos;
  }

  if (row.direccion) {
    payload.address = row.direccion;
    payload.direccion = row.direccion;
  }

  if (row.departamento) {
    payload.departamento = row.departamento;
  }

  if (row.provincia) {
    payload.provincia = row.provincia;
  }

  if (row.distrito) {
    payload.distrito = row.distrito;
  }

  if (row.departamento || row.provincia || row.distrito) {
    payload.pais = 'PE';
  }

  return payload;
};

const buildDtoFromCompleteRecord = (
  row: CompleteRowNormalized,
  errors: string[]
): CreateClienteDTO | null => {
  const missingColumns: string[] = [];

  if (!row.tipoCuenta) {
    missingColumns.push('TIPO DE CUENTA');
  }

  if (!row.codigoDocumento) {
    missingColumns.push('CODIGO TIPO DE DOCUMENTO');
  }

  const codigo = row.codigoDocumento.toUpperCase();
  const docDefinition = row.codigoDocumento ? resolveDocument(row.codigoDocumento) : null;

  const normalizeCode = docDefinition?.nuevo;
  const documentNumber = normalizeDocumentNumber(normalizeCode, row.numeroDocumento, errors);

  if (!docDefinition) {
    errors.push(`Código de tipo de documento inválido (${row.codigoDocumento || 'vacío'})`);
  }

  const requiresDocumentNumber = docDefinition
    ? !['SIN_DOCUMENTO', 'NO_DOMICILIADO'].includes(docDefinition.legacy)
    : codigo !== '0';

  if (requiresDocumentNumber && !documentNumber) {
    missingColumns.push('NUM. DOCUMENTO');
    errors.push('Número de documento requerido');
  }

  const clientTypeKey = normalizeKey(row.tipoCuenta);
  const clientType = CLIENT_TYPE_MAP[clientTypeKey];
  if (!clientType) {
    errors.push(`Tipo de cuenta inválido (${row.tipoCuenta || 'vacío'})`);
  }

  const estadoRaw = row.estadoCliente;
  let estadoCliente: 'Habilitado' | 'Deshabilitado' | undefined;
  if (!estadoRaw) {
    missingColumns.push('ESTADO CLIENTE');
  } else {
    const estadoKey = normalizeKey(estadoRaw);
    estadoCliente = ESTADO_MAP[estadoKey];
    if (!estadoCliente) {
      errors.push(`Estado cliente inválido (${estadoRaw})`);
    }
  }

  if (docDefinition?.legacy === 'RUC') {
    if (!row.razonSocial) {
      missingColumns.push('RAZON SOCIAL');
    }
  } else {
    if (!row.apellidoPaterno) {
      missingColumns.push('APELLIDO PATERNO');
    }
    if (!row.apellidoMaterno) {
      missingColumns.push('APELLIDO MATERNO');
    }
    if (!row.nombre1) {
      missingColumns.push('NOMBRE 1');
    }
  }

  const emailRow: Record<string, string> = {
    correo1: row.correo1,
    correo2: row.correo2,
    correo3: row.correo3,
  };

  const emails = collectEmails(emailRow, ['correo1', 'correo2', 'correo3'], errors);

  const phonesRow: Record<string, string> = {
    telefono1: row.telefono1,
    telefono2: row.telefono2,
    telefono3: row.telefono3,
    telefono1tipo: row.telefono1 ? 'Principal' : '',
    telefono2tipo: row.telefono2 ? 'Alterno' : '',
    telefono3tipo: row.telefono3 ? 'Alterno' : '',
  };

  const telefonos = collectPhones(
    phonesRow,
    [
      { number: 'telefono1', type: 'telefono1tipo' },
      { number: 'telefono2', type: 'telefono2tipo' },
      { number: 'telefono3', type: 'telefono3tipo' },
    ],
    errors
  );

  if (missingColumns.length > 0) {
    errors.push(`Faltan datos obligatorios: ${[...new Set(missingColumns)].join(', ')}`);
  }

  if (!docDefinition || !clientType || !estadoCliente || errors.length > 0) {
    return null;
  }

  const nombreNaturalPartes = [
    row.nombre1,
    row.nombre2,
    row.apellidoPaterno,
    row.apellidoMaterno,
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ');

  const nombreNatural = docDefinition.legacy === 'RUC' ? undefined : buildNombreNatural(nombreNaturalPartes);
  const nombrePrincipal = docDefinition.legacy === 'RUC'
    ? row.razonSocial.trim()
    : nombreNaturalPartes || row.razonSocial.trim();

  if (!nombrePrincipal) {
    errors.push('Nombre o razón social requerido');
    return null;
  }

  const ubigeo = normalizeUbigeoCode(row.ubigeo, errors);

  const payload: CreateClienteDTO = {
    documentType: docDefinition.legacy,
    documentNumber: documentNumber || '',
    name: nombrePrincipal,
    type: clientType,
    address: row.direccion || undefined,
    phone: telefonos[0]?.numero,
    email: emails[0],
    tipoDocumento: docDefinition.nuevo,
    numeroDocumento: documentNumber || undefined,
    tipoPersona: docDefinition.legacy === 'RUC' ? 'Juridica' : 'Natural',
    tipoCuenta: clientType,
    razonSocial: docDefinition.legacy === 'RUC' ? row.razonSocial.trim() : undefined,
    nombreComercial: row.nombreComercial || undefined,
    primerNombre: docDefinition.legacy === 'RUC' ? undefined : nombreNatural?.primerNombre,
    segundoNombre: docDefinition.legacy === 'RUC' ? undefined : nombreNatural?.segundoNombre,
    apellidoPaterno: docDefinition.legacy === 'RUC' ? undefined : nombreNatural?.apellidoPaterno,
    apellidoMaterno: docDefinition.legacy === 'RUC' ? undefined : nombreNatural?.apellidoMaterno,
    nombreCompleto: nombrePrincipal,
    emails: emails.length > 0 ? emails : undefined,
    telefonos: telefonos.length > 0 ? telefonos : undefined,
    pais: row.departamento || row.provincia || row.distrito || ubigeo ? 'PE' : undefined,
    departamento: row.departamento || undefined,
    provincia: row.provincia || undefined,
    distrito: row.distrito || undefined,
    ubigeo: ubigeo || undefined,
    direccion: row.direccion || undefined,
    referenciaDireccion: row.referencia || undefined,
    estadoCliente,
    tipoCliente: clientType,
    motivoDeshabilitacion: estadoCliente === 'Deshabilitado' ? 'Importado como deshabilitado' : undefined,
    observaciones: undefined,
    adjuntos: [],
    imagenes: [],
  };

  if (row.direccion) {
    payload.address = row.direccion;
  }

  return payload;
};

const parseBasicSheet = (rows: Array<Array<string | number>>): ParseResult => {
  if (!rows.length) {
    return { dtos: [], errors: [], totalRows: 0, validRows: 0 };
  }

  const headerRow = (rows[0] || []).map((cell) => (cell ?? '').toString());
  const headerIndexMap: Partial<Record<BasicTemplateHeader, number>> = {};

  headerRow.forEach((cell, index) => {
    const canonical = BASIC_HEADER_NORMALIZED_TO_CANONICAL[normalizeTemplateHeader(cell ?? '')];
    if (canonical) {
      headerIndexMap[canonical] = index;
    }
  });

  const missingHeaders = BASIC_TEMPLATE_HEADERS.filter((header) => headerIndexMap[header] === undefined);
  if (missingHeaders.length > 0) {
    throw new Error('La plantilla no coincide con los encabezados oficiales. Descarga nuevamente el archivo desde el botón "Descargar plantilla".');
  }

  const dtos: CreateClienteDTO[] = [];
  const errors: ValidationError[] = [];
  let totalRows = 0;

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const rawRow = rows[rowIndex] ?? [];
    const values = rawRow.map((cell) => (cell ?? '').toString());
    if (values.every((value) => value.trim() === '')) {
      continue;
    }

    totalRows += 1;
    const trimmedValues = values.map((value) => value.trim());
    const basicRow = buildBasicRow(trimmedValues, headerIndexMap as Record<BasicTemplateHeader, number>);
    const rowErrors: string[] = [];

    const docCode = basicRow.codigoDocumento.toUpperCase();
    const docDefinition = basicRow.codigoDocumento ? resolveDocument(basicRow.codigoDocumento) : undefined;
    const normalizedDocCode = docDefinition?.nuevo;
    const normalizedReferenceNumber = normalizeDocumentNumber(normalizedDocCode, basicRow.numeroDocumento);
    const documentReference = buildDocumentReference(docCode, normalizedReferenceNumber || basicRow.numeroDocumento);

    const dto = buildDtoFromBasicRecord(basicRow, rowErrors);

    if (!dto || rowErrors.length > 0) {
      errors.push({
        rowNumber: rowIndex + 1,
        documentReference,
        messages: rowErrors.length > 0 ? rowErrors : ['No se pudo transformar el registro'],
      });
      continue;
    }

    dtos.push(dto);
  }

  return {
    dtos,
    errors,
    totalRows,
    validRows: dtos.length,
  };
};

const parseCompleteSheet = (rows: Array<Array<string | number>>): ParseResult => {
  if (!rows.length) {
    return { dtos: [], errors: [], totalRows: 0, validRows: 0 };
  }

  const headerRow = (rows[0] || []).map((cell) => (cell ?? '').toString());
  const headerIndexMap = createHeaderIndexMap(
    headerRow,
    COMPLETE_TEMPLATE_HEADERS,
    COMPLETE_HEADER_NORMALIZED_TO_CANONICAL,
    'importación completa'
  );

  const dtos: CreateClienteDTO[] = [];
  const errors: ValidationError[] = [];
  let totalRows = 0;

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const rawRow = rows[rowIndex] ?? [];
    const values = rawRow.map((cell) => (cell ?? '').toString());
    if (values.every((value) => value.trim() === '')) {
      continue;
    }

    totalRows += 1;
    const trimmedValues = values.map((value) => value.trim());
    const completeRow = buildCompleteRow(trimmedValues, headerIndexMap);
    const rowErrors: string[] = [];

    const codigo = completeRow.codigoDocumento.toUpperCase();
    const docDefinition = completeRow.codigoDocumento ? resolveDocument(completeRow.codigoDocumento) : undefined;
    const normalizedCode = docDefinition?.nuevo;
    const numeroReferencia = normalizeDocumentNumber(normalizedCode, completeRow.numeroDocumento);
    const documentReference = buildDocumentReference(codigo, numeroReferencia || completeRow.numeroDocumento);

    const dto = buildDtoFromCompleteRecord(completeRow, rowErrors);

    if (!dto || rowErrors.length > 0) {
      errors.push({
        rowNumber: rowIndex + 1,
        documentReference,
        messages: rowErrors.length > 0 ? rowErrors : ['No se pudo transformar el registro'],
      });
      continue;
    }

    dtos.push(dto);
  }

  return {
    dtos,
    errors,
    totalRows,
    validRows: dtos.length,
  };
};

const buildNombreNatural = (nombreCompleto: string): {
  primerNombre?: string;
  segundoNombre?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
} => {
  const partes = nombreCompleto
    .split(' ')
    .map((parte) => parte.trim())
    .filter(Boolean);

  if (partes.length === 0) {
    return {};
  }

  if (partes.length === 1) {
    return { primerNombre: partes[0] };
  }

  if (partes.length === 2) {
    return {
      primerNombre: partes[0],
      apellidoPaterno: partes[1],
    };
  }

  if (partes.length === 3) {
    return {
      primerNombre: partes[0],
      apellidoPaterno: partes[1],
      apellidoMaterno: partes[2],
    };
  }

  return {
    primerNombre: partes[0],
    segundoNombre: partes.slice(1, partes.length - 2).join(' ') || undefined,
    apellidoPaterno: partes[partes.length - 2],
    apellidoMaterno: partes[partes.length - 1],
  };
};


const parseFile = async (file: File, mode: ImportMode): Promise<ParseResult> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error('El archivo no contiene hojas válidas');
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as Array<Array<string | number>>;

  if (!rows.length) {
    return {
      dtos: [],
      errors: [],
      totalRows: 0,
      validRows: 0,
    };
  }

  if (mode === 'BASICO') {
    return parseBasicSheet(rows);
  }
  return parseCompleteSheet(rows);
};

type ModeMeta = {
  label: string;
  description: string;
  instructions: string;
  requiredColumns: string[];
  optionalColumns: string[];
  templateHeaders: string[];
  templateExample: string[];
};

const IMPORT_MODE_CONFIG: Record<ImportMode, ModeMeta> = {
  BASICO: {
    label: 'Importación básica',
    description: 'Usa la plantilla oficial para crear o actualizar clientes desde Excel respetando los encabezados originales.',
    instructions: 'Descarga la plantilla desde el botón, completa los campos obligatorios y no agregues ni reordenes columnas.',
    requiredColumns: [
      'TIPO DE CUENTA',
      'CODIGO TIPO DE DOCUMENTO',
      'NUM. DOCUMENTO',
      'RAZON SOCIAL (si el código es 6)',
      'APELLIDOS Y NOMBRES (si el código es distinto de 6)',
    ],
    optionalColumns: [
      'NOMBRE 2',
      'TELEFONO',
      'CORREO',
      'DIRECCION',
      'DEPARTAMENTO',
      'PROVINCIA',
      'DISTRITO',
    ],
    templateHeaders: [
      'TIPO DE CUENTA',
      'CODIGO TIPO DE DOCUMENTO',
      'NUM. DOCUMENTO',
      'RAZON SOCIAL ',
      'APELLIDO PATERNO',
      'APELLIDO MATERNO',
      'NOMBRE 1',
      'NOMBRE 2',
      'TELEFONO',
      'CORREO',
      'DIRECCION',
      'DEPARTAMENTO',
      'PROVINCIA',
      'DISTRITO',
    ],
    templateExample: [
      'CLIENTE',
      '6',
      '23656985698',
      'EJEMPLO EMPRESA SAC',
      '',
      '',
      '',
      '',
      '',
      '',
      'CALLE. EJEMPLO 4589 - LIMA - LIMA -SURCO',
      'LIMA',
      'LIMA',
      'SURCO',
    ],
  },
  COMPLETO: {
    label: 'Importación completa',
    description: 'Usa la plantilla oficial completa para registrar o actualizar clientes con todos los campos disponibles.',
    instructions: 'Descarga la plantilla oficial, respeta los encabezados y no agregues ni reordenes columnas. Cada fila se procesa usando el número de documento como identificador.',
    requiredColumns: [
      'TIPO DE CUENTA',
      'CODIGO TIPO DE DOCUMENTO',
      'NUM. DOCUMENTO',
      'RAZON SOCIAL (si el código es 6)',
      'APELLIDOS Y NOMBRES (si el código es distinto de 6)',
      'ESTADO CLIENTE',
    ],
    optionalColumns: [
      'NOMBRE COMERCIAL',
      'NOMBRE 2',
      'TELEFONO 1',
      'TELEFONO 2',
      'TELEFONO 3',
      'CORREO 1',
      'CORREO 2',
      'CORREO 3',
      'DIRECCION',
      'DEPARTAMENTO',
      'PROVINCIA',
      'DISTRITO',
      'REFERENCIA',
      'UBIGEO',
    ],
    templateHeaders: [
      'TIPO DE CUENTA',
      'CODIGO TIPO DE DOCUMENTO',
      'NUM. DOCUMENTO',
      'RAZON SOCIAL',
      'NOMBRE COMERCIAL',
      'APELLIDO PATERNO',
      'APELLIDO MATERNO',
      'NOMBRE 1',
      'NOMBRE 2',
      'TELEFONO 1',
      'TELEFONO 2',
      'TELEFONO 3',
      'CORREO 1',
      'CORREO 2',
      'CORREO 3',
      'ESTADO CLIENTE',
      'DIRECCION',
      'DEPARTAMENTO',
      'PROVINCIA',
      'DISTRITO',
      'REFERENCIA',
      'UBIGEO',
    ],
    templateExample: [
      'CLIENTE',
      '6',
      '23656985698',
      'EJEMPLO EMPRESA SAC',
      'EJEMPLONOMCOMERCIAL',
      '',
      '',
      '',
      '',
      '985698569',
      '12545685',
      '965896589',
      'EJEMPLO1@GMAIL.COM',
      'EJEMPLO2@GMAIL.COM',
      '',
      'HABILITADO',
      'CALLE. EJEMPLO 4589 - LIMA - LIMA -SURCO',
      'LIMA',
      'LIMA',
      'SURCO',
      'FRENDE AL GRIGO A',
      '1256326',
    ],
  },
};

const formatNumber = (value: number): string => new Intl.NumberFormat('es-PE').format(value);

const formatDateTime = (date: Date): string =>
  date.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });

const ImportarClientesPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useCaja();
  const { bulkImportClientes, loading } = useClientes();

  const [mode, setMode] = useState<ImportMode>('BASICO');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const modeMeta = useMemo(() => IMPORT_MODE_CONFIG[mode], [mode]);
  const isBusy = processing || loading;

  const handleModeChange = (nextMode: ImportMode) => {
    setMode(nextMode);
    setReport(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrag = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
    } else if (event.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      showToast('error', 'Formato no compatible', 'Solo se aceptan archivos Excel (.xlsx o .xls)');
      return;
    }

    setSelectedFile(file);
    setReport(null);
    showToast('success', 'Archivo listo', `${file.name} está listo para validar`);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      showToast('error', 'Formato no compatible', 'Solo se aceptan archivos Excel (.xlsx o .xls)');
      return;
    }

    setSelectedFile(file);
    setReport(null);
    showToast('success', 'Archivo listo', `${file.name} está listo para validar`);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setReport(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const templatePath = mode === 'BASICO' ? BASIC_TEMPLATE_PATH : COMPLETE_TEMPLATE_PATH;
    window.open(templatePath, '_blank');
    showToast('success', 'Plantilla descargada', 'Descargaste la plantilla oficial más reciente');
  };

  const handleImport = async () => {
    if (!selectedFile) {
      showToast('warning', 'Selecciona un archivo', 'Debes adjuntar un Excel antes de importar');
      return;
    }

    try {
      setProcessing(true);

      const parseResult = await parseFile(selectedFile, mode);

      const baseReport: ImportReport = {
        mode,
        fileName: selectedFile.name,
        totalRows: parseResult.totalRows,
        validRows: parseResult.validRows,
        parseErrors: parseResult.errors,
        executedAt: new Date(),
      };

      if (parseResult.totalRows === 0) {
        setReport(baseReport);
        showToast('warning', 'Archivo vacío', 'La plantilla no contiene registros para procesar');
        return;
      }

      if (parseResult.validRows === 0) {
        setReport(baseReport);
        showToast('error', 'Sin registros válidos', 'Revisa las observaciones y corrige tu archivo');
        return;
      }

      const response = await bulkImportClientes({ modo: mode, registros: parseResult.dtos });

      if (!response) {
        setReport(baseReport);
        return;
      }

      setReport({
        ...baseReport,
        backendSummary: response.summary,
        backendErrors: response.summary.errors,
        executedAt: new Date(),
      });
    } catch (error) {
      console.error('[ImportarClientes] Error durante la importación', error);
      const message = error instanceof Error ? error.message : 'Ocurrió un problema al procesar el archivo';
      showToast('error', 'No se pudo procesar el archivo', message);
    } finally {
      setProcessing(false);
    }
  };

  const renderStat = (label: string, value: number | string, tone: 'primary' | 'success' | 'warning' | 'neutral') => {
    const palette: Record<'primary' | 'success' | 'warning' | 'neutral', string> = {
      primary: 'text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300',
      success: 'text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-300',
      warning: 'text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300',
      neutral: 'text-gray-700 bg-gray-50 dark:bg-gray-700/40 dark:text-gray-200',
    };

    return (
      <div className={`rounded-lg px-3 py-2 text-center ${palette[tone]}`}>
        <div className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</div>
        <div className="text-lg font-semibold">{typeof value === 'number' ? formatNumber(value) : value}</div>
      </div>
    );
  };

  const renderErrorList = (title: string, errorsList: ValidationError[]) => (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-500" />
        {title}
      </h4>
      <div className="max-h-48 overflow-y-auto rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/10 px-3 py-2">
        <ul className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
          {errorsList.map((item, index) => (
            <li key={`${item.rowNumber}-${index}`}>
              <span className="font-semibold">Fila {item.rowNumber}</span>
              {item.documentReference ? ` · ${item.documentReference}` : ''}
              {': '}
              {item.messages.join('; ')}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <ClientesModuleLayout activeTab="importar">
      <div className="flex-1 bg-gray-50 dark:bg-gray-900">
        <div className="px-6 py-6 lg:px-12 lg:py-10">
          <div className="space-y-2 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Importación de clientes</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Importa registros nuevos o actualiza clientes existentes usando el número de documento como identificador.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{modeMeta.instructions}</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
          {(Object.keys(IMPORT_MODE_CONFIG) as ImportMode[]).map((modeKey) => {
            const meta = IMPORT_MODE_CONFIG[modeKey];
            const isActive = modeKey === mode;
            return (
              <button
                key={modeKey}
                onClick={() => handleModeChange(modeKey)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  isActive
                    ? 'border-blue-600 bg-blue-600 text-white shadow'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200'
                }`}
              >
                {meta.label}
              </button>
            );
          })}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.7fr,1fr]">
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm">
              <div className="p-6 space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Archivo de importación</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Descarga la plantilla correspondiente, complétala y súbela sin modificar los encabezados.</p>
                  </div>
                  <div className="flex gap-2">
                    {mode === 'BASICO' ? (
                      <a
                        href={BASIC_TEMPLATE_PATH}
                        download
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-500 dark:hover:bg-blue-900/30"
                      >
                        <Download className="w-4 h-4" />
                        Descargar plantilla
                      </a>
                    ) : (
                      <button
                        onClick={handleDownloadTemplate}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-500 dark:hover:bg-blue-900/30"
                      >
                        <Download className="w-4 h-4" />
                        Descargar plantilla
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (selectedFile) {
                          handleReset();
                        }
                        fileInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                      <RefreshCcw className="w-4 h-4" />
                      {selectedFile ? 'Cambiar archivo' : 'Buscar archivo'}
                    </button>
                  </div>
                </div>

                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`rounded-2xl border-2 border-dashed transition-colors p-8 text-center cursor-pointer ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-400/80'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet className="w-12 h-12 text-green-500" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleReset();
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        <XCircle className="w-3 h-3" />
                        Quitar archivo
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                      <span className="font-medium">Arrastra y suelta tu archivo aquí</span>
                      <span className="text-xs">o haz clic para seleccionar desde tu equipo</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">Formatos aceptados: .xlsx, .xls</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                  <button
                    onClick={() => navigate('/clientes')}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
                    disabled={isBusy}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
                    disabled={!selectedFile || isBusy}
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!selectedFile || isBusy}
                    className={`inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg text-white transition ${
                      !selectedFile || isBusy
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isBusy ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Importar ahora
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm">
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div>
                    <h3 className="text-lg font-semibold">Resultados de la importación</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Se actualiza automáticamente después de cada carga.</p>
                  </div>
                </div>

                {report ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {renderStat('Filas procesadas', report.totalRows, 'primary')}
                      {renderStat('Registros válidos', report.validRows, 'success')}
                      {renderStat('Errores de archivo', report.parseErrors.length, 'warning')}
                      {renderStat('Última ejecución', formatDateTime(report.executedAt), 'neutral')}
                    </div>

                    {report.backendSummary && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {renderStat('Creados', report.backendSummary.created, 'success')}
                        {renderStat('Actualizados', report.backendSummary.updated, 'primary')}
                        {renderStat('Omitidos', report.backendSummary.skipped, 'warning')}
                      </div>
                    )}

                    {report.parseErrors.length > 0 && renderErrorList('Observaciones detectadas en el archivo', report.parseErrors)}

                    {report.backendErrors && report.backendErrors.length > 0 && (
                      renderErrorList(
                        'Observaciones durante la importación',
                        report.backendErrors.map((item) => ({
                          rowNumber: item.rowNumber,
                          documentReference: item.documentReference,
                          messages: [item.reason],
                        }))
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Aún no se ha realizado ninguna importación en esta sesión. Carga un archivo para ver el resumen aquí.
                  </p>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                  <Info className="w-5 h-5 text-blue-500" />
                  <div>
                    <h3 className="text-lg font-semibold">Guía rápida</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{modeMeta.description}</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-600 text-white text-xs font-semibold">1</div>
                    <span>Descarga la plantilla oficial desde el botón y evita modificar los encabezados.</span>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-600 text-white text-xs font-semibold">2</div>
                    <span>Llena los campos obligatorios usando los códigos SUNAT (0, 1, 4, 6, 7, A, B, etc.) para el tipo de documento.</span>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-600 text-white text-xs font-semibold">3</div>
                    <span>Importa el archivo: si el número de documento ya existe, se actualiza; si no existe, se crea un nuevo cliente.</span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <p className="uppercase text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Campos obligatorios</p>
                    <ul className="space-y-1 text-gray-700 dark:text-gray-300 list-disc list-inside">
                      {modeMeta.requiredColumns.map((column) => (
                        <li key={column}>{column}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="uppercase text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Campos opcionales</p>
                    <ul className="space-y-1 text-gray-600 dark:text-gray-400 list-disc list-inside">
                      {modeMeta.optionalColumns.map((column) => (
                        <li key={column}>{column}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-xs text-blue-800 dark:text-blue-200">
                  <p className="font-semibold mb-1">Recomendaciones</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>No insertes columnas ni cambies su orden.</li>
                    <li>Usa textos simples (sin fórmulas) y elimina celdas combinadas.</li>
                    <li>Verifica que el correo tenga formato válido y que el teléfono tenga entre 6 y 15 dígitos.</li>
                    <li>Razón social es obligatoria para RUC; apellidos y nombres lo son para los demás códigos.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm">
              <div className="p-6 space-y-4 text-sm text-gray-600 dark:text-gray-300">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">Detalles de la sesión</h4>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Modo seleccionado</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{modeMeta.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Archivo adjunto</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedFile ? selectedFile.name : 'Sin archivo'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Estado actual</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{isBusy ? 'Procesando...' : 'En espera'}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      </div>
    </ClientesModuleLayout>
  );
};

export default ImportarClientesPage;
