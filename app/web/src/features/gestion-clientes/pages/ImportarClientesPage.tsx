import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
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
import type {
  ImportMode,
  CreateClienteDTO,
  BulkImportSummary,
  DocumentType,
  ClientType,
  TipoPersona,
} from '../models';

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

const BASIC_TEMPLATE_HEADERS = [
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
] as const;

type BasicTemplateHeader = typeof BASIC_TEMPLATE_HEADERS[number];

const normalizeTemplateHeader = (header: string): string => header.trim().replace(/\s+/g, ' ').toUpperCase();

const BASIC_HEADER_NORMALIZED_TO_CANONICAL: Record<string, BasicTemplateHeader> = {
  'TIPO DE CUENTA': 'TIPO DE CUENTA',
  'CODIGO TIPO DE DOCUMENTO': 'CODIGO TIPO DE DOCUMENTO',
  'NUM. DOCUMENTO': 'NUM. DOCUMENTO',
  'RAZON SOCIAL': 'RAZON SOCIAL ',
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

const DOCUMENT_CODE_TO_TYPE: Record<string, DocumentType> = {
  '0': 'DOC_IDENTIF_PERS_NAT_NO_DOM',
  '1': 'DNI',
  '4': 'CARNET_EXTRANJERIA',
  '6': 'RUC',
  '7': 'PASAPORTE',
  'A': 'CARNET_IDENTIDAD',
  'B': 'DOC_IDENTIF_PERS_NAT_NO_DOM',
  'C': 'DOC_IDENTIF_PERS_NAT_NO_DOM',
  'D': 'DOC_IDENTIF_PERS_NAT_NO_DOM',
  'E': 'TAM_TARJETA_ANDINA',
  'F': 'CARNET_PERMISO_TEMP_PERMANENCIA',
  'G': 'CARNET_IDENTIDAD',
  'H': 'CARNET_PERMISO_TEMP_PERMANENCIA',
};

const DOCUMENT_REQUIRED_DIGITS: Record<string, number> = {
  '1': 8,
  '6': 11,
};

type DocumentDefinition = {
  tokens: string[];
  legacy: DocumentType;
  nuevo: string;
  requiredDigits?: number;
};

const DOCUMENT_DEFINITIONS: DocumentDefinition[] = [
  { tokens: ['ruc', '6'], legacy: 'RUC', nuevo: '6', requiredDigits: 11 },
  { tokens: ['dni', '1'], legacy: 'DNI', nuevo: '1', requiredDigits: 8 },
  { tokens: ['pasaporte', 'pas', 'passport', '7'], legacy: 'PASAPORTE', nuevo: '7' },
  { tokens: ['carnetextranjeria', 'ce', 'carnetextranjero', '4'], legacy: 'CARNET_EXTRANJERIA', nuevo: '4' },
  { tokens: ['nodomiciliado', '0'], legacy: 'NO_DOMICILIADO', nuevo: '0' },
  { tokens: ['sindocumento', 'sd', ''], legacy: 'SIN_DOCUMENTO', nuevo: '0' },
];

const TRUE_VALUES = new Set(['si', 'sí', 'true', '1', 'x', 'yes', 'activo', 'habilitado', 'default']);
const FALSE_VALUES = new Set(['no', 'false', '0', 'inactive', 'inactivo', 'deshabilitado']);

const CLIENT_TYPE_MAP: Record<string, ClientType> = {
  cliente: 'Cliente',
  proveedor: 'Proveedor',
  clienteproveedor: 'Cliente-Proveedor',
  'cliente-proveedor': 'Cliente-Proveedor',
};

const PERSONA_MAP: Record<string, TipoPersona> = {
  natural: 'Natural',
  juridica: 'Juridica',
  jurídica: 'Juridica',
};

const ESTADO_MAP: Record<string, 'Habilitado' | 'Deshabilitado'> = {
  habilitado: 'Habilitado',
  activo: 'Habilitado',
  deshabilitado: 'Deshabilitado',
  inactivo: 'Deshabilitado',
};

const FORMA_PAGO_MAP: Record<string, 'Contado' | 'Credito'> = {
  contado: 'Contado',
  cash: 'Contado',
  credito: 'Credito',
  crédito: 'Credito',
};

const MONEDA_MAP: Record<string, 'PEN' | 'USD' | 'EUR'> = {
  pen: 'PEN',
  soles: 'PEN',
  sol: 'PEN',
  usd: 'USD',
  dolares: 'USD',
  dólares: 'USD',
  eur: 'EUR',
  euro: 'EUR',
};

const normalizeKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase();

const onlyDigits = (value: string): string => value.replace(/\D+/g, '');

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const resolveDocument = (value: string): DocumentDefinition | null => {
  const normalized = normalizeKey(value);
  return DOCUMENT_DEFINITIONS.find((definition) =>
    definition.tokens.some((token) => token === normalized)
  ) ?? null;
};

const resolveClientType = (value?: string): ClientType => {
  if (!value) return 'Cliente';
  const mapped = CLIENT_TYPE_MAP[normalizeKey(value)];
  return mapped ?? 'Cliente';
};

const resolvePersona = (value: string | undefined, docLegacy: DocumentType): TipoPersona => {
  if (value) {
    const mapped = PERSONA_MAP[normalizeKey(value)];
    if (mapped) {
      return docLegacy === 'RUC' ? 'Juridica' : mapped;
    }
  }
  return docLegacy === 'RUC' ? 'Juridica' : 'Natural';
};

const resolveEstado = (value?: string): 'Habilitado' | 'Deshabilitado' => {
  if (!value) return 'Habilitado';
  return ESTADO_MAP[normalizeKey(value)] ?? 'Habilitado';
};

const resolveFormaPago = (value?: string): 'Contado' | 'Credito' | undefined => {
  if (!value) return undefined;
  return FORMA_PAGO_MAP[normalizeKey(value)];
};

const resolveMoneda = (value?: string): 'PEN' | 'USD' | 'EUR' | undefined => {
  if (!value) return undefined;
  return MONEDA_MAP[normalizeKey(value)];
};

const resolveBoolean = (value?: string): boolean | undefined => {
  if (!value || value.trim() === '') return undefined;
  const normalized = normalizeKey(value);
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return undefined;
};

const buildDocumentReference = (row: Record<string, string>): string => {
  const rawType = row['tipodocumento'] || row['documentotype'] || '';
  const docDef = resolveDocument(rawType);
  if (!docDef) {
    return rawType || '-';
  }

  const rawNumber = row['numerodocumento'] || row['documento'] || '';
  const documentNumber = docDef.requiredDigits ? onlyDigits(rawNumber) : rawNumber.trim();
  return docDef.legacy === 'SIN_DOCUMENTO'
    ? 'SIN_DOCUMENTO'
    : `${docDef.legacy} ${documentNumber || '-'}`;
};

const collectEmails = (
  row: Record<string, string>,
  keys: string[],
  errors: string[],
  max = 3
): string[] => {
  const seen = new Set<string>();
  const emails: string[] = [];

  for (const key of keys) {
    const value = row[key];
    if (!value) continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (!isValidEmail(trimmed)) {
      errors.push(`Correo inválido (${trimmed})`);
      continue;
    }
    if (seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    emails.push(trimmed);
    if (emails.length === max) break;
  }

  return emails;
};

const collectPhones = (
  row: Record<string, string>,
  keys: Array<{ number: string; type?: string }>,
  errors: string[],
): Array<{ numero: string; tipo: string }> => {
  const phones: Array<{ numero: string; tipo: string }> = [];

  keys.forEach(({ number, type }) => {
    const raw = row[number];
    if (!raw) return;
    const digits = onlyDigits(raw);
    if (!digits) {
      errors.push(`El teléfono "${raw}" es inválido`);
      return;
    }
    if (digits.length < 6 || digits.length > 15) {
      errors.push(`El teléfono ${digits} debe tener entre 6 y 15 dígitos`);
      return;
    }
    const tipoColumn = type ? row[type] : undefined;
    const tipoNormalizado = tipoColumn && tipoColumn.trim() !== '' ? tipoColumn.trim() : 'Móvil';
    phones.push({ numero: digits, tipo: tipoNormalizado });
  });

  return phones;
};

const buildDocumentReferenceFromBasic = (codigo: string, numero: string): string => {
  const cleanCode = codigo.trim().toUpperCase();
  const cleanedNumber = numero.trim();
  if (!cleanCode && !cleanedNumber) {
    return '-';
  }
  if (!cleanCode) {
    return cleanedNumber || '-';
  }
  return `${cleanCode} ${cleanedNumber || '-'}`;
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
    razonSocial: read('RAZON SOCIAL ').trim(),
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

  if (!row.numeroDocumento) {
    missingColumns.push('NUM. DOCUMENTO');
  }

  const codigo = row.codigoDocumento.toUpperCase();
  const documentType = codigo ? DOCUMENT_CODE_TO_TYPE[codigo] : undefined;

  if (!documentType) {
    errors.push(`Código de tipo de documento inválido (${row.codigoDocumento || 'vacío'})`);
  }

  const requiredDigits = codigo ? DOCUMENT_REQUIRED_DIGITS[codigo] : undefined;
  const documentNumber = requiredDigits ? onlyDigits(row.numeroDocumento) : row.numeroDocumento.trim();

  if (requiredDigits && documentNumber.length !== requiredDigits) {
    errors.push(`El número de documento debe tener ${requiredDigits} dígitos para el código ${codigo}`);
  }

  if (!documentNumber) {
    missingColumns.push('NUM. DOCUMENTO');
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

  const correo = row.correo ? row.correo.trim() : '';
  if (correo && !isValidEmail(correo)) {
    errors.push(`Correo inválido (${correo})`);
  }

  const telefonoDigits = row.telefono ? onlyDigits(row.telefono) : '';
  if (row.telefono && !telefonoDigits) {
    errors.push(`Teléfono inválido (${row.telefono})`);
  }
  if (telefonoDigits && (telefonoDigits.length < 6 || telefonoDigits.length > 15)) {
    errors.push(`El teléfono debe tener entre 6 y 15 dígitos (${telefonoDigits})`);
  }

  if (!documentType || !clientType || !documentNumber || errors.length > 0) {
    return null;
  }

  const tipoPersona: TipoPersona = documentType === 'RUC' ? 'Juridica' : 'Natural';
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

  if (correo) {
    payload.email = correo;
    payload.emails = [correo];
  }

  if (telefonoDigits) {
    payload.phone = telefonoDigits;
    payload.telefonos = [{ numero: telefonoDigits, tipo: 'Móvil' }];
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
    const docNumberForReference = docCode && DOCUMENT_REQUIRED_DIGITS[docCode]
      ? onlyDigits(basicRow.numeroDocumento)
      : basicRow.numeroDocumento.trim();
    const documentReference = buildDocumentReferenceFromBasic(docCode, docNumberForReference || basicRow.numeroDocumento);

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

const buildDtoFromFullRow = (
  row: Record<string, string>,
  _rowNumber: number,
  errors: string[]
): CreateClienteDTO | null => {
  const docDef = resolveDocument(row['tipodocumento'] || row['documentotype'] || '');
  if (!docDef) {
    errors.push('TipoDocumento inválido');
    return null;
  }

  let documentNumber = row['numerodocumento'] || row['documento'] || '';
  documentNumber = docDef.requiredDigits ? onlyDigits(documentNumber) : documentNumber.trim();

  if (docDef.requiredDigits && documentNumber.length !== docDef.requiredDigits) {
    errors.push(`El ${docDef.legacy} debe tener ${docDef.requiredDigits} dígitos`);
  }

  if (!documentNumber && docDef.legacy !== 'SIN_DOCUMENTO' && docDef.legacy !== 'NO_DOMICILIADO') {
    errors.push('Número de documento requerido');
  }

  if (documentNumber && docDef.legacy === 'SIN_DOCUMENTO') {
    errors.push('SIN_DOCUMENTO no debe tener número');
  }

  const razonSocial = row['razonsocial']?.trim();
  const nombreCompletoRaw = row['nombrecompleto']?.trim();
  const nombreDesdePartes = [
    row['primernombre'],
    row['segundonombre'],
    row['apellidopaterno'],
    row['apellidomaterno'],
  ]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(' ');

  const nombreFallback = row['razonsocialnombre']?.trim() || row['nombre']?.trim() || '';
  const nombreFuente = nombreCompletoRaw || nombreDesdePartes || nombreFallback;
  const nombrePrincipal = docDef.legacy === 'RUC'
    ? razonSocial || nombreFallback
    : nombreFuente || razonSocial || nombreFallback;

  const nombreNatural =
    docDef.legacy === 'RUC'
      ? undefined
      : buildNombreNatural(nombreFuente || razonSocial || nombreFallback);

  if (!nombrePrincipal.trim()) {
    errors.push('Nombre o razón social requerido');
  }

  const emails = collectEmails(
    row,
    ['correo', 'correo1', 'correo2', 'correo3', 'email', 'email1', 'email2', 'email3'],
    errors
  );

  const telefonos = collectPhones(
    row,
    [
      { number: 'telefono1', type: 'telefono1tipo' },
      { number: 'telefono2', type: 'telefono2tipo' },
      { number: 'telefono3', type: 'telefono3tipo' },
    ],
    errors
  );

  const estadoCliente = resolveEstado(row['estadocliente'] || row['estado']);
  const tipoPersona = resolvePersona(row['tipopersona'], docDef.legacy);
  const tipoCliente = row['tipocliente'] ? resolvePersona(row['tipocliente'], docDef.legacy) : tipoPersona;
  const clientType = resolveClientType(row['tipocuenta']);

  const formaPago = resolveFormaPago(row['formapago']);
  if (row['formapago'] && !formaPago) {
    errors.push('Forma de pago inválida');
  }

  const monedaPreferida = resolveMoneda(row['monedapreferida'] || row['moneda']);
  if (row['monedapreferida'] && !monedaPreferida) {
    errors.push('Moneda preferida inválida');
  }

  const clientePorDefecto = resolveBoolean(row['clientepordefecto']);
  const exceptuadaPercepcion = resolveBoolean(row['exceptuadapercepcion']);

  const motivoDeshabilitacion = row['motivodeshabilitacion']?.trim();
  if (estadoCliente === 'Deshabilitado' && !motivoDeshabilitacion) {
    errors.push('Debe registrar un motivo de deshabilitación');
  }

  return {
    documentType: docDef.legacy,
    documentNumber: documentNumber || '',
    name: nombrePrincipal.trim(),
    type: clientType,
    address: row['direccion']?.trim() || undefined,
    phone: telefonos[0]?.numero,
    email: emails[0],
    additionalData: row['observaciones']?.trim() || undefined,
    tipoDocumento: docDef.nuevo,
    numeroDocumento: documentNumber || undefined,
    tipoPersona,
    tipoCuenta: clientType,
    razonSocial: docDef.legacy === 'RUC' ? nombrePrincipal.trim() : razonSocial || undefined,
    nombreComercial: row['nombrecomercial']?.trim() || undefined,
    primerNombre: docDef.legacy === 'RUC' ? undefined : nombreNatural?.primerNombre,
    segundoNombre: docDef.legacy === 'RUC' ? undefined : nombreNatural?.segundoNombre,
    apellidoPaterno: docDef.legacy === 'RUC' ? undefined : nombreNatural?.apellidoPaterno,
    apellidoMaterno: docDef.legacy === 'RUC' ? undefined : nombreNatural?.apellidoMaterno,
    nombreCompleto: nombrePrincipal.trim(),
    emails,
    telefonos,
    paginaWeb: row['paginaweb']?.trim() || undefined,
    pais: row['pais']?.trim().toUpperCase() || 'PE',
    departamento: row['departamento']?.trim() || undefined,
    provincia: row['provincia']?.trim() || undefined,
    distrito: row['distrito']?.trim() || undefined,
    ubigeo: row['ubigeo']?.trim() || undefined,
    direccion: row['direccion']?.trim() || undefined,
    referenciaDireccion: row['referenciadireccion']?.trim() || undefined,
    tipoCliente,
    estadoCliente,
    motivoDeshabilitacion: estadoCliente === 'Deshabilitado' ? motivoDeshabilitacion || 'Importado como deshabilitado' : undefined,
    tipoContribuyente: undefined,
    estadoContribuyente: undefined,
    condicionDomicilio: undefined,
    fechaInscripcion: undefined,
    actividadesEconomicas: undefined,
    sistemaEmision: undefined,
    esEmisorElectronico: resolveBoolean(row['esemisorelectronico']),
    cpeHabilitado: undefined,
    esAgenteRetencion: resolveBoolean(row['esagenteretencion']),
    esAgentePercepcion: resolveBoolean(row['esagentepercepcion']),
    esBuenContribuyente: resolveBoolean(row['esbuencontribuyente']),
    formaPago: formaPago ?? 'Contado',
    monedaPreferida: monedaPreferida ?? 'PEN',
    listaPrecio: row['listaprecio']?.trim() || undefined,
    usuarioAsignado: row['usuarioasignado']?.trim() || undefined,
    clientePorDefecto: clientePorDefecto ?? false,
    exceptuadaPercepcion: exceptuadaPercepcion ?? false,
    observaciones: row['observaciones']?.trim() || undefined,
    adjuntos: [],
    imagenes: [],
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

  let headerRowIndex = 0;
  const firstCell = rows[0]?.[0]?.toString().toLowerCase() ?? '';
  if (firstCell.includes('instruccion')) {
    headerRowIndex = 1;
  }

  const headerRow = (rows[headerRowIndex] || []).map((cell) => (cell ?? '').toString());
  const normalizedHeaders = headerRow.map(normalizeKey);
  const dataRows = rows.slice(headerRowIndex + 1);

  const dtos: CreateClienteDTO[] = [];
  const errors: ValidationError[] = [];
  let totalRows = 0;

  dataRows.forEach((cells, index) => {
    const values = (cells as Array<string | number>).map((cell) => (cell ?? '').toString().trim());
    if (values.every((value) => value === '')) {
      return;
    }

    totalRows += 1;
    const rowNumber = headerRowIndex + index + 2;
    const rowMap: Record<string, string> = {};

    normalizedHeaders.forEach((key, columnIndex) => {
      if (!key) return;
      rowMap[key] = values[columnIndex] ?? '';
    });

    const rowErrors: string[] = [];
    const dto = buildDtoFromFullRow(rowMap, rowNumber, rowErrors);

    if (!dto || rowErrors.length > 0) {
      errors.push({
        rowNumber,
        documentReference: buildDocumentReference(rowMap),
        messages: rowErrors.length > 0 ? rowErrors : ['No se pudo transformar el registro'],
      });
      return;
    }

    dtos.push(dto);
  });

  return {
    dtos,
    errors,
    totalRows,
    validRows: dtos.length,
  };
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
    description: 'Incluye todo el catálogo de campos (excepto los datos que provienen de SUNAT) para crear o actualizar clientes detalladamente.',
    instructions: 'Respete los encabezados y utilice “Sí/No” para banderas booleanas. Si un cliente se importa varias veces, se actualizará usando el número de documento.',
    requiredColumns: ['TipoDocumento', 'NumeroDocumento', 'NombreCompleto/RazonSocial', 'EstadoCliente'],
    optionalColumns: [
      'TipoCuenta', 'TipoPersona', 'NombreComercial', 'PrimerNombre', 'SegundoNombre', 'ApellidoPaterno', 'ApellidoMaterno',
      'Correo1', 'Correo2', 'Correo3', 'Telefono1', 'Telefono1Tipo', 'Telefono2', 'Telefono2Tipo', 'Telefono3', 'Telefono3Tipo',
      'Direccion', 'ReferenciaDireccion', 'Pais', 'Departamento', 'Provincia', 'Distrito', 'Ubigeo',
      'FormaPago', 'MonedaPreferida', 'ListaPrecio', 'UsuarioAsignado', 'ClientePorDefecto', 'ExceptuadaPercepcion', 'Observaciones'
    ],
    templateHeaders: [
      'TipoDocumento',
      'NumeroDocumento',
      'TipoCuenta',
      'TipoPersona',
      'RazonSocial',
      'NombreComercial',
      'PrimerNombre',
      'SegundoNombre',
      'ApellidoPaterno',
      'ApellidoMaterno',
      'NombreCompleto',
      'Correo1',
      'Correo2',
      'Correo3',
      'Telefono1',
      'Telefono1Tipo',
      'Telefono2',
      'Telefono2Tipo',
      'Telefono3',
      'Telefono3Tipo',
      'PaginaWeb',
      'Pais',
      'Departamento',
      'Provincia',
      'Distrito',
      'Ubigeo',
      'Direccion',
      'ReferenciaDireccion',
      'TipoCliente',
      'EstadoCliente',
      'MotivoDeshabilitacion',
      'FormaPago',
      'MonedaPreferida',
      'ListaPrecio',
      'UsuarioAsignado',
      'ClientePorDefecto',
      'ExceptuadaPercepcion',
      'Observaciones',
    ],
    templateExample: [
      'DNI',
      '45678912',
      'Cliente',
      'Natural',
      '',
      '',
      'María',
      'Fernanda',
      'Lopez',
      'Quispe',
      'María Fernanda Lopez Quispe',
      'maria@demo.com',
      '',
      '',
      '987654321',
      'Móvil',
      '',
      '',
      '',
      '',
      'https://demo.com',
      'PE',
      'Lima',
      'Lima',
      'Miraflores',
      '150122',
      'Av. Demo 456',
      'Edificio B',
      'Natural',
      'Habilitado',
      '',
      'Contado',
      'PEN',
      '',
      '',
      'No',
      'No',
      'Cliente importado desde plantilla',
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
    if (mode === 'BASICO') {
      window.open(BASIC_TEMPLATE_PATH, '_blank');
      return;
    }

    const meta = IMPORT_MODE_CONFIG[mode];
    const headers = meta.templateHeaders;
    const instructionRow = [meta.instructions, ...Array(Math.max(headers.length - 1, 0)).fill('')];
    const data = [instructionRow, headers, meta.templateExample];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!cols'] = headers.map(() => ({ wch: 18 }));
    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(headers.length - 1, 0) } }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

    const now = new Date();
    const dateStamp = now.toISOString().split('T')[0];
    const fileName = `Plantilla_Completa_${dateStamp}.xlsx`;

    XLSX.writeFile(workbook, fileName);
    showToast('success', 'Plantilla generada', 'Descargaste la plantilla más reciente');
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
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="px-6 py-6 lg:px-12 lg:py-10">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/clientes')}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Volver al listado"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Importación de clientes</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Importa registros nuevos o actualiza clientes existentes usando el número de documento como identificador.
            </p>
          </div>
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
  );
};

export default ImportarClientesPage;
