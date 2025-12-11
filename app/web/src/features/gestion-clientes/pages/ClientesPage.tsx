import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import * as ExcelJS from 'exceljs';
import { Download, ChevronDown, FileSpreadsheet, Layers } from 'lucide-react';
import ClienteFormNew from '../components/ClienteFormNew';
import ClientesTable from '../components/ClientesTable';
import ClientesFilters from '../components/ClientesFilters';
import { CLIENTES_FILTERS_INITIAL_STATE, type ClientesFilterValues } from '../components/clientesFiltersConfig';
import ColumnSelector from '../components/ColumnSelector';
import ConfirmationModal from '../../../../../shared/src/components/ConfirmationModal';
import { ClientesModuleLayout } from '../components/ClientesModuleLayout';
import { useClientes } from '../hooks';
import { useClientesColumns } from '../hooks/useClientesColumns';
import { useCaja } from '../../control-caja/context/CajaContext';
import { getBusinessTodayISODate } from '@/shared/time/businessTime';
import type { Cliente, ClienteFormData, DocumentType, ClientType } from '../models';
import { serializeFiles, deserializeFiles } from '../utils/fileSerialization';
import type { DocumentCode } from '../utils/documents';
import {
	documentCodeFromType,
	documentTypeFromCode,
	normalizeDocumentNumber,
	parseLegacyDocumentString,
} from '../utils/documents';
import { mergeEmails, sanitizePhones, splitEmails, splitPhones } from '../utils/contact';

type ClienteFormValue = ClienteFormData[keyof ClienteFormData];

const PRIMARY_COLOR = '#6F36FF';

const formatDateTimeForExport = (value?: string | null): string => {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}
	return date.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
};

const booleanToLabel = (value?: boolean | null): string => {
	if (value === undefined || value === null) return '';
	return value ? 'Sí' : 'No';
};

const normalizeDocumentCodeValue = (value?: string | null): DocumentCode | '' => {
	if (!value) return '';
	const trimmed = value.trim();
	if (!trimmed) return '';
	const normalized = trimmed.toUpperCase();
	if (documentTypeFromCode(normalized as DocumentCode)) {
		return normalized as DocumentCode;
	}
	const fromType = documentCodeFromType(trimmed as DocumentType);
	return fromType ?? '';
};

const resolveDocumentCode = (client: Cliente): string => {
	const fromTipo = normalizeDocumentCodeValue(client.tipoDocumento);
	if (fromTipo) {
		return fromTipo;
	}

	const parsed = parseLegacyDocumentString(client.document);
	if (parsed.code) {
		return parsed.code;
	}
	if (parsed.type) {
		const fromParsedType = documentCodeFromType(parsed.type);
		if (fromParsedType) {
			return fromParsedType;
		}
	}

	return '';
};

const resolveDocumentNumber = (client: Cliente, documentCode?: string): string => {
	const parsed = parseLegacyDocumentString(client.document);
	const baseNumber = (client.numeroDocumento ?? parsed.number ?? '').trim();
	const normalizedCode = documentCode?.trim().toUpperCase() as DocumentCode | undefined;
	if (!normalizedCode || !documentTypeFromCode(normalizedCode)) {
		return baseNumber;
	}
	return normalizeDocumentNumber(normalizedCode, baseNumber);
};

const resolveTipoCuenta = (client: Cliente): string => client.tipoCuenta ?? client.type ?? '';

const resolveTipoPersona = (client: Cliente, documentCode: string): string => {
	if (client.tipoPersona) return client.tipoPersona;
	if (client.tipoCliente && (client.tipoCliente === 'Natural' || client.tipoCliente === 'Juridica')) {
		return client.tipoCliente;
	}

	const inferredDocumentType =
		documentTypeFromCode(documentCode as DocumentCode) ??
		parseLegacyDocumentString(client.document).type ??
		'DNI';

	return inferredDocumentType === 'RUC' ? 'Juridica' : 'Natural';
};

const resolveNameParts = (client: Cliente): {
	primerNombre: string;
	segundoNombre: string;
	apellidoPaterno: string;
	apellidoMaterno: string;
} => {
	const primerNombre = client.primerNombre?.trim() ?? '';
	const segundoNombre = client.segundoNombre?.trim() ?? '';
	const apellidoPaterno = client.apellidoPaterno?.trim() ?? '';
	const apellidoMaterno = client.apellidoMaterno?.trim() ?? '';

	if (primerNombre || segundoNombre || apellidoPaterno || apellidoMaterno) {
		return { primerNombre, segundoNombre, apellidoPaterno, apellidoMaterno };
	}

	const source = (client.nombreCompleto ?? client.name ?? '').trim();
	if (!source) {
		return { primerNombre: '', segundoNombre: '', apellidoPaterno: '', apellidoMaterno: '' };
	}

	const parts = source.split(' ').filter(Boolean);
	if (parts.length === 1) {
		return { primerNombre: parts[0], segundoNombre: '', apellidoPaterno: '', apellidoMaterno: '' };
	}
	if (parts.length === 2) {
		return { primerNombre: parts[0], segundoNombre: '', apellidoPaterno: parts[1], apellidoMaterno: '' };
	}
	if (parts.length === 3) {
		return { primerNombre: parts[0], segundoNombre: parts[1], apellidoPaterno: parts[2], apellidoMaterno: '' };
	}

	return {
		primerNombre: parts[0],
		segundoNombre: parts.slice(1, parts.length - 2).join(' '),
		apellidoPaterno: parts[parts.length - 2] ?? '',
		apellidoMaterno: parts[parts.length - 1] ?? '',
	};
};

const resolveEmails = (client: Cliente): string[] => {
	if (client.emails?.length) {
		return mergeEmails(client.emails);
	}
	if (client.email) {
		return mergeEmails(splitEmails(client.email));
	}
	return [];
};

const resolvePhones = (client: Cliente): Array<{ numero: string; tipo: string }> => {
	if (client.telefonos?.length) {
		return sanitizePhones(client.telefonos);
	}
	if (client.phone) {
		return sanitizePhones(splitPhones(client.phone));
	}
	return [];
};

const resolveEstadoCliente = (client: Cliente): string => {
	if (client.estadoCliente) return client.estadoCliente;
	return client.enabled ? 'Habilitado' : 'Deshabilitado';
};

const resolveDireccion = (client: Cliente): string => {
	if (client.direccion && client.direccion !== 'Sin dirección') {
		return client.direccion;
	}
	if (client.address && client.address !== 'Sin dirección') {
		return client.address;
	}
	return '';
};

const resolvePais = (client: Cliente): string => {
	if (client.pais) return client.pais;
	if (client.departamento || client.provincia || client.distrito) {
		return 'PE';
	}
	return '';
};

const resolveActividadesEconomicas = (client: Cliente): string => {
	if (!client.actividadesEconomicas || client.actividadesEconomicas.length === 0) return '';
	return client.actividadesEconomicas
		.map((actividad) => {
			const principal = actividad.esPrincipal ? ' (Principal)' : '';
			return `${actividad.codigo} - ${actividad.descripcion}${principal}`;
		})
		.join(' | ');
};

const resolveCpeHabilitado = (client: Cliente): string => {
	if (!client.cpeHabilitado || client.cpeHabilitado.length === 0) return '';
	return client.cpeHabilitado
		.map((cpe) => (cpe.fechaInicio ? `${cpe.tipoCPE} (${cpe.fechaInicio})` : cpe.tipoCPE))
		.join(' | ');
};

const mapClientToBasicRow = (client: Cliente): Record<string, string> => {
	const documentCode = resolveDocumentCode(client);
	const documentNumber = resolveDocumentNumber(client, documentCode);
	const tipoPersona = resolveTipoPersona(client, documentCode);
	const isRUC = documentCode === '6' || tipoPersona === 'Juridica';
	const names = resolveNameParts(client);
	const emails = resolveEmails(client);
	const phones = resolvePhones(client);

	return {
		tipoCuenta: resolveTipoCuenta(client),
		codigoTipoDocumento: documentCode,
		numeroDocumento: documentNumber,
		razonSocial: isRUC ? (client.razonSocial?.trim() || client.name || '') : '',
		apellidoPaterno: isRUC ? '' : names.apellidoPaterno,
		apellidoMaterno: isRUC ? '' : names.apellidoMaterno,
		nombre1: isRUC ? '' : names.primerNombre,
		nombre2: isRUC ? '' : names.segundoNombre,
		telefono: phones[0]?.numero ?? '',
		correo: emails[0] ?? '',
		direccion: resolveDireccion(client),
		departamento: client.departamento?.trim() ?? '',
		provincia: client.provincia?.trim() ?? '',
		distrito: client.distrito?.trim() ?? '',
	};
};

const mapClientToCompleteRow = (client: Cliente): Record<string, string> => {
	const documentCode = resolveDocumentCode(client);
	const documentNumber = resolveDocumentNumber(client, documentCode);
	const tipoPersona = resolveTipoPersona(client, documentCode);
	const names = resolveNameParts(client);
	const emails = resolveEmails(client);
	const phones = resolvePhones(client);

	return {
		id: `${client.id ?? ''}`,
		nombreBase: client.name ?? '',
		documentoLegacy: client.document ?? '',
		tipoCuenta: resolveTipoCuenta(client),
		codigoTipoDocumento: documentCode,
		numeroDocumento: documentNumber,
		tipoPersona,
		razonSocial: client.razonSocial?.trim() ?? '',
		nombreComercial: client.nombreComercial?.trim() ?? '',
		apellidoPaterno: names.apellidoPaterno,
		apellidoMaterno: names.apellidoMaterno,
		nombre1: names.primerNombre,
		nombre2: names.segundoNombre,
		nombreCompleto: client.nombreCompleto?.trim() ?? client.name ?? '',
		correo1: emails[0] ?? '',
		correo2: emails[1] ?? '',
		correo3: emails[2] ?? '',
		telefono1: phones[0]?.numero ?? '',
		telefono1Tipo: phones[0]?.tipo ?? '',
		telefono2: phones[1]?.numero ?? '',
		telefono2Tipo: phones[1]?.tipo ?? '',
		telefono3: phones[2]?.numero ?? '',
		telefono3Tipo: phones[2]?.tipo ?? '',
		paginaWeb: client.paginaWeb?.trim() ?? '',
		pais: resolvePais(client),
		departamento: client.departamento?.trim() ?? '',
		provincia: client.provincia?.trim() ?? '',
		distrito: client.distrito?.trim() ?? '',
		ubigeo: client.ubigeo?.trim() ?? '',
		direccion: resolveDireccion(client),
		referenciaDireccion: client.referenciaDireccion?.trim() ?? '',
		tipoCliente: client.tipoCliente ?? '',
		estadoCliente: resolveEstadoCliente(client),
		motivoDeshabilitacion: client.motivoDeshabilitacion?.trim() ?? '',
		formaPago: client.formaPago ?? '',
		monedaPreferida: client.monedaPreferida ?? '',
		listaPrecio: client.listaPrecio ?? '',
		usuarioAsignado: client.usuarioAsignado ?? '',
		clientePorDefecto: booleanToLabel(client.clientePorDefecto),
		exceptuadaPercepcion: booleanToLabel(client.exceptuadaPercepcion),
		esEmisorElectronico: booleanToLabel(client.esEmisorElectronico),
		esAgenteRetencion: booleanToLabel(client.esAgenteRetencion),
		esAgentePercepcion: booleanToLabel(client.esAgentePercepcion),
		esBuenContribuyente: booleanToLabel(client.esBuenContribuyente),
		observaciones: client.observaciones?.trim() ?? '',
		additionalData: client.additionalData?.trim() ?? '',
		genero: client.gender?.trim() ?? '',
		tipoContribuyente: client.tipoContribuyente ?? '',
		estadoContribuyente: client.estadoContribuyente ?? '',
		condicionDomicilio: client.condicionDomicilio ?? '',
		fechaInscripcion: client.fechaInscripcion ?? '',
		actividadesEconomicas: resolveActividadesEconomicas(client),
		sistemaEmision: client.sistemaEmision ?? '',
		cpeHabilitado: resolveCpeHabilitado(client),
		fechaRegistro: client.fechaRegistro ? formatDateTimeForExport(client.fechaRegistro) : '',
		fechaUltimaModificacion: client.fechaUltimaModificacion ? formatDateTimeForExport(client.fechaUltimaModificacion) : '',
		createdAt: client.createdAt ? formatDateTimeForExport(client.createdAt) : '',
		updatedAt: client.updatedAt ? formatDateTimeForExport(client.updatedAt) : '',
		transitorio: booleanToLabel(client.transient ?? false),
	};
};

const filterClientesList = (clients: Cliente[], filters: ClientesFilterValues): Cliente[] => {
	const searchTerm = filters.search.trim().toLowerCase();

	return clients.filter((client) => {
		if (searchTerm) {
			const documentCode = resolveDocumentCode(client);
			const documentNumber = resolveDocumentNumber(client, documentCode);
			const hayCoincidencia = [
				client.razonSocial,
				client.nombreCompleto,
				client.nombreComercial,
				client.name,
				client.numeroDocumento,
				client.document,
				documentNumber,
			]
				.filter((value): value is string => Boolean(value && value.trim()))
				.some((value) => value.toLowerCase().includes(searchTerm));
			if (!hayCoincidencia) {
				return false;
			}
		}

		if (filters.tipoCuenta) {
			const tipoCuenta = resolveTipoCuenta(client);
			if (tipoCuenta !== filters.tipoCuenta) {
				return false;
			}
		}

		if (filters.estadoCliente) {
			const estado = resolveEstadoCliente(client);
			if (estado !== filters.estadoCliente) {
				return false;
			}
		}

		return true;
	});
};

function ClientesPage() {
	const { showToast } = useCaja();
			const { clientes, transientClientes, transientCount, clearTransientClientes, createCliente, updateCliente, deleteCliente, loading, pagination, fetchClientes } = useClientes();
			const combinedClients = useMemo(() => [...clientes, ...transientClientes], [clientes, transientClientes]);
	const { columnDefinitions, visibleColumnIds, toggleColumn, resetColumns, selectAllColumns } = useClientesColumns();
	const [filters, setFilters] = useState<ClientesFilterValues>(() => ({ ...CLIENTES_FILTERS_INITIAL_STATE }));
	const hasActiveFilters = useMemo(
		() => Boolean(filters.search || filters.tipoCuenta || filters.estadoCliente),
		[filters]
	);
	const filteredClients = useMemo(
		() => filterClientesList(combinedClients, filters),
		[combinedClients, filters]
	);
	const handleApplyFilters = useCallback((nextFilters: ClientesFilterValues) => {
		setFilters(nextFilters);
	}, []);
	const handleClearFilters = useCallback(() => {
		setFilters({ ...CLIENTES_FILTERS_INITIAL_STATE });
	}, []);

	const [showClientModal, setShowClientModal] = useState(false);
	const [editingClient, setEditingClient] = useState<Cliente | null>(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [clientToDelete, setClientToDelete] = useState<Cliente | null>(null);

	const getInitialFormData = (): ClienteFormData => ({
		// Identificación
		tipoDocumento: '6',
		numeroDocumento: '',
		tipoPersona: 'Juridica', // Default para RUC
		tipoCuenta: 'Cliente',
		
		// Razón Social (Jurídica)
		razonSocial: '',
		nombreComercial: '',
		
		// Nombres (Natural)
		primerNombre: '',
		segundoNombre: '',
		apellidoPaterno: '',
		apellidoMaterno: '',
		nombreCompleto: '',
		
		// Contacto
		emails: [],
		telefonos: [],
		paginaWeb: '',
		
		// Ubicación
		pais: 'PE',
		departamento: '',
		provincia: '',
		distrito: '',
		ubigeo: '',
		direccion: '',
		referenciaDireccion: '',
		
		// Estado
		tipoCliente: 'Natural',
		estadoCliente: 'Habilitado',
		motivoDeshabilitacion: '',
		
		// Datos SUNAT
		tipoContribuyente: '',
		estadoContribuyente: '',
		condicionDomicilio: '',
		fechaInscripcion: '',
		actividadesEconomicas: [],
		sistemaEmision: '',
		esEmisorElectronico: false,
		cpeHabilitado: [],
		esAgenteRetencion: false,
		esAgentePercepcion: false,
		esBuenContribuyente: false,
		
		// Comercial
		formaPago: 'Contado',
		monedaPreferida: 'PEN',
		listaPrecio: '',
		usuarioAsignado: '',
		clientePorDefecto: false,
		exceptuadaPercepcion: false,
		
		// Adicionales
		observaciones: '',
		adjuntos: [],
		imagenes: [],
		
		// Metadatos
		fechaRegistro: new Date().toISOString(),
		fechaUltimaModificacion: new Date().toISOString(),
		
		// Legacy
		gender: '',
		additionalData: '',
	});

	const [formData, setFormData] = useState<ClienteFormData>(getInitialFormData());

	const exportButtonRef = useRef<HTMLButtonElement>(null);
	const exportMenuRef = useRef<HTMLDivElement>(null);
	const [exportMenuOpen, setExportMenuOpen] = useState(false);

	type BasicExportRow = ReturnType<typeof mapClientToBasicRow>;
	type CompleteExportRow = ReturnType<typeof mapClientToCompleteRow>;

	const basicExportColumns = useMemo<Array<{ header: string; key: keyof BasicExportRow; width?: number }>>(
		() => [
			{ header: 'TIPO DE CUENTA', key: 'tipoCuenta', width: 20 },
			{ header: 'CODIGO TIPO DE DOCUMENTO', key: 'codigoTipoDocumento', width: 26 },
			{ header: 'NUM. DOCUMENTO', key: 'numeroDocumento', width: 22 },
			{ header: 'RAZON SOCIAL', key: 'razonSocial', width: 32 },
			{ header: 'APELLIDO PATERNO', key: 'apellidoPaterno', width: 24 },
			{ header: 'APELLIDO MATERNO', key: 'apellidoMaterno', width: 24 },
			{ header: 'NOMBRE 1', key: 'nombre1', width: 22 },
			{ header: 'NOMBRE 2', key: 'nombre2', width: 22 },
			{ header: 'TELEFONO', key: 'telefono', width: 20 },
			{ header: 'CORREO', key: 'correo', width: 32 },
			{ header: 'DIRECCION', key: 'direccion', width: 36 },
			{ header: 'DEPARTAMENTO', key: 'departamento', width: 24 },
			{ header: 'PROVINCIA', key: 'provincia', width: 24 },
			{ header: 'DISTRITO', key: 'distrito', width: 24 },
		],
		[]
	);

	const completeExportColumns = useMemo<Array<{ header: string; key: keyof CompleteExportRow; width?: number }>>(
		() => [
			{ header: 'ID', key: 'id', width: 18 },
			{ header: 'NOMBRE BASE', key: 'nombreBase', width: 32 },
			{ header: 'DOCUMENTO LEGACY', key: 'documentoLegacy', width: 28 },
			{ header: 'TIPO DE CUENTA', key: 'tipoCuenta', width: 20 },
			{ header: 'CODIGO TIPO DE DOCUMENTO', key: 'codigoTipoDocumento', width: 26 },
			{ header: 'NUM. DOCUMENTO', key: 'numeroDocumento', width: 22 },
			{ header: 'TIPO PERSONA', key: 'tipoPersona', width: 18 },
			{ header: 'RAZON SOCIAL', key: 'razonSocial', width: 32 },
			{ header: 'NOMBRE COMERCIAL', key: 'nombreComercial', width: 28 },
			{ header: 'APELLIDO PATERNO', key: 'apellidoPaterno', width: 24 },
			{ header: 'APELLIDO MATERNO', key: 'apellidoMaterno', width: 24 },
			{ header: 'NOMBRE 1', key: 'nombre1', width: 22 },
			{ header: 'NOMBRE 2', key: 'nombre2', width: 22 },
			{ header: 'NOMBRE COMPLETO', key: 'nombreCompleto', width: 36 },
			{ header: 'CORREO 1', key: 'correo1', width: 28 },
			{ header: 'CORREO 2', key: 'correo2', width: 28 },
			{ header: 'CORREO 3', key: 'correo3', width: 28 },
			{ header: 'TELEFONO 1', key: 'telefono1', width: 18 },
			{ header: 'TELEFONO 1 TIPO', key: 'telefono1Tipo', width: 20 },
			{ header: 'TELEFONO 2', key: 'telefono2', width: 18 },
			{ header: 'TELEFONO 2 TIPO', key: 'telefono2Tipo', width: 20 },
			{ header: 'TELEFONO 3', key: 'telefono3', width: 18 },
			{ header: 'TELEFONO 3 TIPO', key: 'telefono3Tipo', width: 20 },
			{ header: 'PAGINA WEB', key: 'paginaWeb', width: 28 },
			{ header: 'PAIS', key: 'pais', width: 14 },
			{ header: 'DEPARTAMENTO', key: 'departamento', width: 22 },
			{ header: 'PROVINCIA', key: 'provincia', width: 22 },
			{ header: 'DISTRITO', key: 'distrito', width: 22 },
			{ header: 'UBIGEO', key: 'ubigeo', width: 16 },
			{ header: 'DIRECCION', key: 'direccion', width: 32 },
			{ header: 'REFERENCIA DIRECCION', key: 'referenciaDireccion', width: 32 },
			{ header: 'TIPO CLIENTE', key: 'tipoCliente', width: 18 },
			{ header: 'ESTADO CLIENTE', key: 'estadoCliente', width: 18 },
			{ header: 'MOTIVO DESHABILITACION', key: 'motivoDeshabilitacion', width: 32 },
			{ header: 'FORMA PAGO', key: 'formaPago', width: 18 },
			{ header: 'MONEDA PREFERIDA', key: 'monedaPreferida', width: 20 },
			{ header: 'LISTA PRECIO', key: 'listaPrecio', width: 20 },
			{ header: 'USUARIO ASIGNADO', key: 'usuarioAsignado', width: 24 },
			{ header: 'CLIENTE POR DEFECTO', key: 'clientePorDefecto', width: 24 },
			{ header: 'EXCEPTUADA PERCEPCION', key: 'exceptuadaPercepcion', width: 26 },
			{ header: 'ES EMISOR ELECTRONICO', key: 'esEmisorElectronico', width: 26 },
			{ header: 'ES AGENTE RETENCION', key: 'esAgenteRetencion', width: 24 },
			{ header: 'ES AGENTE PERCEPCION', key: 'esAgentePercepcion', width: 24 },
			{ header: 'ES BUEN CONTRIBUYENTE', key: 'esBuenContribuyente', width: 26 },
			{ header: 'OBSERVACIONES', key: 'observaciones', width: 36 },
			{ header: 'ADICIONAL', key: 'additionalData', width: 28 },
			{ header: 'GENERO', key: 'genero', width: 16 },
			{ header: 'TIPO CONTRIBUYENTE', key: 'tipoContribuyente', width: 24 },
			{ header: 'ESTADO CONTRIBUYENTE', key: 'estadoContribuyente', width: 26 },
			{ header: 'CONDICION DOMICILIO', key: 'condicionDomicilio', width: 24 },
			{ header: 'FECHA INSCRIPCION', key: 'fechaInscripcion', width: 24 },
			{ header: 'ACTIVIDADES ECONOMICAS', key: 'actividadesEconomicas', width: 40 },
			{ header: 'SISTEMA EMISION', key: 'sistemaEmision', width: 22 },
			{ header: 'CPE HABILITADO', key: 'cpeHabilitado', width: 32 },
			{ header: 'FECHA REGISTRO', key: 'fechaRegistro', width: 26 },
			{ header: 'FECHA ULTIMA MODIFICACION', key: 'fechaUltimaModificacion', width: 30 },
			{ header: 'CREATED AT', key: 'createdAt', width: 26 },
			{ header: 'UPDATED AT', key: 'updatedAt', width: 26 },
			{ header: 'TRANSITORIO', key: 'transitorio', width: 18 },
		],
		[]
	);

	const basicExportRows = useMemo(() => combinedClients.map(mapClientToBasicRow), [combinedClients]);
	const completeExportRows = useMemo(() => combinedClients.map(mapClientToCompleteRow), [combinedClients]);

	const exportClientes = async (
		variant: 'BASICO' | 'COMPLETO',
		columns: Array<{ header: string; key: string; width?: number }>,
		rows: Array<Record<string, string>>,
		textColumnKeys: string[]
	) => {
		if (!rows.length) {
			showToast('info', 'Sin clientes', 'No hay clientes para exportar en este momento');
			return;
		}

		try {
			const workbook = new ExcelJS.Workbook();
			const worksheet = workbook.addWorksheet(variant === 'BASICO' ? 'Clientes básico' : 'Clientes completo');

			worksheet.columns = columns;
			rows.forEach((row) => {
				const excelRow: Record<string, string> = {};
				columns.forEach(({ key }) => {
					excelRow[key] = row[key] ?? '';
				});
				worksheet.addRow(excelRow);
			});

			worksheet.views = [{ state: 'frozen', ySplit: 1 }];
			const headerRow = worksheet.getRow(1);
			headerRow.eachCell((cell) => {
				cell.font = { bold: true, color: { argb: 'FF0F172A' } };
				cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
				cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
				cell.border = {
					top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
					bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
				};
			});

			worksheet.columns?.forEach((column) => {
				column.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
			});

			textColumnKeys.forEach((key) => {
				const column = worksheet.getColumn(key);
				column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
					if (rowNumber === 1) return;
					if (cell.value === null || cell.value === undefined) {
						cell.value = '';
					} else if (typeof cell.value === 'number') {
						cell.value = cell.value.toString();
					} else if (typeof cell.value !== 'string') {
						cell.value = `${cell.value}`;
					}
					cell.numFmt = '@';
				});
			});

			const dateStamp = getBusinessTodayISODate();
			const fileName = variant === 'BASICO' ? `Clientes_Basico_${dateStamp}.xlsx` : `Clientes_Completo_${dateStamp}.xlsx`;
			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = fileName;
			link.click();
			URL.revokeObjectURL(url);

			showToast('success', 'Exportación lista', `Se generó el archivo ${variant === 'BASICO' ? 'básico' : 'completo'} con ${rows.length} clientes.`);
		} catch (error) {
			console.error('[Clientes] Error al exportar', error);
			showToast('error', 'No se pudo exportar', 'Inténtalo nuevamente en unos segundos.');
		}
	};

	const basicTextColumns = useMemo(() => ['tipoCuenta', 'codigoTipoDocumento', 'numeroDocumento', 'telefono'], []);
	const completeTextColumns = useMemo(
		() => [
			'id',
			'tipoCuenta',
			'codigoTipoDocumento',
			'numeroDocumento',
			'telefono1',
			'telefono1Tipo',
			'telefono2',
			'telefono2Tipo',
			'telefono3',
			'telefono3Tipo',
			'ubigeo',
		],
		[]
	);

	const handleExportClientesBasico = async () => {
		setExportMenuOpen(false);
		await exportClientes('BASICO', basicExportColumns, basicExportRows, basicTextColumns);
	};

	const handleExportClientesCompleto = async () => {
		setExportMenuOpen(false);
		await exportClientes('COMPLETO', completeExportColumns, completeExportRows, completeTextColumns);
	};

	const hasClients = combinedClients.length > 0;
	const hasVisibleClients = filteredClients.length > 0;

	useEffect(() => {
		if (!exportMenuOpen) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (exportButtonRef.current?.contains(event.target as Node)) {
				return;
			}
			if (exportMenuRef.current?.contains(event.target as Node)) {
				return;
			}
			setExportMenuOpen(false);
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setExportMenuOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [exportMenuOpen]);

	useEffect(() => {
		if (!hasClients) {
			setExportMenuOpen(false);
		}
	}, [hasClients]);

	const handleCreateClient = async () => {
		// Validación de nombre según tipo de documento
		const esRUC = formData.tipoDocumento === '6';
		const esDNI = formData.tipoDocumento === '1';
		
		if (esRUC && !formData.razonSocial.trim()) {
			showToast('warning', 'Campo requerido', 'La razón social es obligatoria para RUC');
			return;
		}

		if (!esRUC && !formData.primerNombre.trim()) {
			showToast('warning', 'Campo requerido', 'El primer nombre es obligatorio');
			return;
		}

		if (!esRUC && !formData.apellidoPaterno.trim()) {
			showToast('warning', 'Campo requerido', 'El apellido paterno es obligatorio');
			return;
		}

		if (!formData.numeroDocumento.trim()) {
			showToast('warning', 'Campo requerido', 'El número de documento es obligatorio');
			return;
		}

		if (esRUC && formData.numeroDocumento.length !== 11) {
			showToast('warning', 'RUC inválido', 'El RUC debe tener exactamente 11 dígitos');
			return;
		}

		if (esDNI && formData.numeroDocumento.length !== 8) {
			showToast('warning', 'DNI inválido', 'El DNI debe tener exactamente 8 dígitos');
			return;
		}

		if (formData.estadoCliente === 'Deshabilitado' && !formData.motivoDeshabilitacion.trim()) {
			showToast('warning', 'Campo requerido', 'Debe especificar el motivo de deshabilitación');
			return;
		}

		// Determinar el nombre para enviar al backend
		const nombreCliente = esRUC ? formData.razonSocial.trim() : formData.nombreCompleto.trim();
		
		// Mapeo de tipo de documento nuevo a antiguo
		const docTypeMap: Record<string, DocumentType> = {
			'0': 'NO_DOMICILIADO',
			'1': 'DNI',
			'4': 'CARNET_EXTRANJERIA',
			'6': 'RUC',
			'7': 'PASAPORTE',
		};

		const sanitizedEmails = formData.emails.filter(email => email.trim() !== '');
		const sanitizedTelefonos = formData.telefonos
			.filter(t => t.numero.trim() !== '')
			.map(t => ({
				numero: t.numero.trim(),
				tipo: t.tipo || 'Móvil',
			}));
		const primaryPhone = sanitizedTelefonos[0]?.numero;

		const [serializedAdjuntos, serializedImagenes] = await Promise.all([
			serializeFiles(formData.adjuntos),
			serializeFiles(formData.imagenes),
		]);

		const result = await createCliente({
			// Campos legacy (retrocompatibilidad)
			documentType: (docTypeMap[formData.tipoDocumento] || 'SIN_DOCUMENTO') as DocumentType,
			documentNumber: formData.numeroDocumento.trim(),
			name: nombreCliente,
			type: formData.tipoCuenta as ClientType,
			address: formData.direccion.trim() || undefined,
			phone: primaryPhone || undefined,
			email: sanitizedEmails[0] || undefined,
			gender: formData.gender || undefined,
			additionalData: formData.observaciones.trim() || undefined,
			
			// Campos extendidos (TODOS)
			tipoDocumento: formData.tipoDocumento,
			numeroDocumento: formData.numeroDocumento.trim(),
			tipoPersona: formData.tipoPersona,
			tipoCuenta: formData.tipoCuenta,
			razonSocial: formData.razonSocial.trim() || undefined,
			nombreComercial: formData.nombreComercial.trim() || undefined,
			primerNombre: formData.primerNombre.trim() || undefined,
			segundoNombre: formData.segundoNombre.trim() || undefined,
			apellidoPaterno: formData.apellidoPaterno.trim() || undefined,
			apellidoMaterno: formData.apellidoMaterno.trim() || undefined,
			nombreCompleto: formData.nombreCompleto.trim(),
			emails: sanitizedEmails,
			telefonos: sanitizedTelefonos,
			paginaWeb: formData.paginaWeb.trim() || undefined,
			pais: formData.pais || undefined,
			departamento: formData.departamento.trim() || undefined,
			provincia: formData.provincia.trim() || undefined,
			distrito: formData.distrito.trim() || undefined,
			ubigeo: formData.ubigeo.trim() || undefined,
			direccion: formData.direccion.trim() || undefined,
			referenciaDireccion: formData.referenciaDireccion.trim() || undefined,
			tipoCliente: formData.tipoCliente,
			estadoCliente: formData.estadoCliente,
			motivoDeshabilitacion: formData.motivoDeshabilitacion.trim() || undefined,
			tipoContribuyente: formData.tipoContribuyente.trim() || undefined,
			estadoContribuyente: formData.estadoContribuyente.trim() || undefined,
			condicionDomicilio: formData.condicionDomicilio.trim() || undefined,
			fechaInscripcion: formData.fechaInscripcion || undefined,
			actividadesEconomicas: formData.actividadesEconomicas,
			sistemaEmision: formData.sistemaEmision.trim() || undefined,
			esEmisorElectronico: formData.esEmisorElectronico,
			cpeHabilitado: formData.cpeHabilitado,
			esAgenteRetencion: formData.esAgenteRetencion,
			esAgentePercepcion: formData.esAgentePercepcion,
			esBuenContribuyente: formData.esBuenContribuyente,
			formaPago: formData.formaPago,
			monedaPreferida: formData.monedaPreferida,
			listaPrecio: formData.listaPrecio.trim() || undefined,
			usuarioAsignado: formData.usuarioAsignado.trim() || undefined,
			clientePorDefecto: formData.clientePorDefecto,
			exceptuadaPercepcion: formData.exceptuadaPercepcion,
			observaciones: formData.observaciones.trim() || undefined,
			adjuntos: serializedAdjuntos,
			imagenes: serializedImagenes,
		});

		if (result) {
			resetForm();
			setShowClientModal(false);
		}
	};

	const handleCancelClient = () => {
		resetForm();
		setShowClientModal(false);
	};

	const handleInputChange = (field: keyof ClienteFormData, value: ClienteFormValue) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const resetForm = () => {
		setFormData(getInitialFormData());
		setEditingClient(null);
	};

	const handleEditClient = async (client: Cliente) => {
		if (client.transient) {
			showToast('info', 'Operación no disponible: backend pendiente', 'No es posible editar un cliente transitorio');
			return;
		}

		try {
			setEditingClient(client);

			const legacyToNuevoMap: Record<string, string> = {
				'NO_DOMICILIADO': '0',
				'DNI': '1',
				'CARNET_EXTRANJERIA': '4',
				'RUC': '6',
				'PASAPORTE': '7',
			};

			let docType = client.tipoDocumento || '6';
			let docNumber = client.numeroDocumento || '';

			if (client.tipoDocumento && client.tipoDocumento.length > 1 && client.tipoDocumento.length <= 12) {
				docType = legacyToNuevoMap[client.tipoDocumento] || client.tipoDocumento;
			}

			if ((!client.tipoDocumento || !client.numeroDocumento) && client.document) {
				if (client.document.includes(' ')) {
					const parts = client.document.split(' ');
					const legacyType = parts[0];
					const legacyNumber = parts.slice(1).join(' ');
					if (!client.tipoDocumento) {
						docType = legacyToNuevoMap[legacyType] || docType;
					}
					if (!docNumber) {
						docNumber = legacyNumber;
					}
				} else if (client.document !== 'Sin documento' && !docNumber) {
					docNumber = client.document;
				}
			}

			const esRUC = docType === '6';
			const nombreBase = client.nombreCompleto || client.name || '';
			const nombreParts = nombreBase.split(' ').filter(Boolean);

			let fallbackSegundoNombre = '';
			let fallbackApellidoPaterno = '';
			let fallbackApellidoMaterno = '';

			if (nombreParts.length >= 4) {
				fallbackSegundoNombre = nombreParts.slice(1, nombreParts.length - 2).join(' ');
				fallbackApellidoPaterno = nombreParts[nombreParts.length - 2] || '';
				fallbackApellidoMaterno = nombreParts[nombreParts.length - 1] || '';
			} else if (nombreParts.length === 3) {
				fallbackSegundoNombre = '';
				fallbackApellidoPaterno = nombreParts[1] || '';
				fallbackApellidoMaterno = nombreParts[2] || '';
			} else if (nombreParts.length === 2) {
				fallbackSegundoNombre = '';
				fallbackApellidoPaterno = nombreParts[1] || '';
				fallbackApellidoMaterno = '';
			}

			const primerNombre = client.primerNombre ?? (!esRUC ? nombreParts[0] || '' : '');
			const segundoNombre = client.segundoNombre ?? (!esRUC ? fallbackSegundoNombre : '');
			const apellidoPaterno = client.apellidoPaterno ?? (!esRUC ? fallbackApellidoPaterno : '');
			const apellidoMaterno = client.apellidoMaterno ?? (!esRUC ? fallbackApellidoMaterno : '');

			const emails = client.emails?.length
				? client.emails
				: client.email
					? client.email.split(',').map(email => email.trim()).filter(Boolean)
					: [];

			const telefonosRaw = client.telefonos?.length
				? client.telefonos
				: client.phone
					? client.phone.split(',').map((numero, index) => ({
							numero: numero.trim(),
							tipo: index === 0 ? 'Móvil' : 'Otro',
						})).filter(t => t.numero !== '')
					: [];

			const telefonos = telefonosRaw.map(t => ({
				numero: t.numero,
				tipo: t.tipo || 'Móvil',
			}));

			const [adjuntos, imagenes] = await Promise.all([
				deserializeFiles(client.adjuntos),
				deserializeFiles(client.imagenes),
			]);

			const fechaRegistro = client.fechaRegistro || client.createdAt || new Date().toISOString();
			const fechaUltimaModificacion = client.fechaUltimaModificacion || client.updatedAt || fechaRegistro;
			const direccion = client.direccion ?? (client.address === 'Sin dirección' ? '' : client.address ?? '');
			const tipoPersona = client.tipoPersona || (esRUC ? 'Juridica' : 'Natural');
			const tipoCliente = client.tipoCliente === 'Juridica' || client.tipoCliente === 'Natural'
				? client.tipoCliente
				: tipoPersona;

			setFormData({
				...getInitialFormData(),
				tipoDocumento: docType,
				numeroDocumento: docNumber,
				tipoPersona,
				tipoCuenta: client.tipoCuenta || client.type,
				razonSocial: client.razonSocial || (esRUC ? nombreBase : ''),
				nombreComercial: client.nombreComercial || '',
				primerNombre,
				segundoNombre,
				apellidoPaterno,
				apellidoMaterno,
				nombreCompleto: esRUC ? (client.razonSocial || nombreBase) : (client.nombreCompleto || nombreBase),
				emails: emails.slice(0, 3),
				telefonos: telefonos.slice(0, 3),
				paginaWeb: client.paginaWeb || '',
				pais: client.pais || 'PE',
				departamento: client.departamento || '',
				provincia: client.provincia || '',
				distrito: client.distrito || '',
				ubigeo: client.ubigeo || '',
				direccion,
				referenciaDireccion: client.referenciaDireccion || '',
				tipoCliente: tipoCliente,
				estadoCliente: (client.estadoCliente as ClienteFormData['estadoCliente']) || (client.enabled ? 'Habilitado' : 'Deshabilitado'),
				motivoDeshabilitacion: client.motivoDeshabilitacion || '',
				tipoContribuyente: client.tipoContribuyente || '',
				estadoContribuyente: client.estadoContribuyente || '',
				condicionDomicilio: (client.condicionDomicilio as ClienteFormData['condicionDomicilio']) || '',
				fechaInscripcion: client.fechaInscripcion || '',
				actividadesEconomicas: client.actividadesEconomicas || [],
				sistemaEmision: (client.sistemaEmision as ClienteFormData['sistemaEmision']) || '',
				esEmisorElectronico: Boolean(client.esEmisorElectronico),
				cpeHabilitado: client.cpeHabilitado || [],
				esAgenteRetencion: Boolean(client.esAgenteRetencion),
				esAgentePercepcion: Boolean(client.esAgentePercepcion),
				esBuenContribuyente: Boolean(client.esBuenContribuyente),
				formaPago: (client.formaPago as ClienteFormData['formaPago']) || 'Contado',
				monedaPreferida: (client.monedaPreferida as ClienteFormData['monedaPreferida']) || 'PEN',
				listaPrecio: client.listaPrecio || '',
				usuarioAsignado: client.usuarioAsignado || '',
				clientePorDefecto: Boolean(client.clientePorDefecto),
				exceptuadaPercepcion: Boolean(client.exceptuadaPercepcion),
				observaciones: client.observaciones || client.additionalData || '',
				adjuntos,
				imagenes,
				fechaRegistro,
				fechaUltimaModificacion,
				gender: client.gender || '',
				additionalData: client.additionalData || '',
			});

			setShowClientModal(true);
		} catch (error) {
			console.error('[Clientes] Error al preparar edición', error);
			showToast('error', 'Error', 'No se pudo cargar la información completa del cliente');
		}
	};

		const handleDeleteClient = (client: Cliente) => {
			if (client.transient) {
				showToast('info', 'Operación no disponible: backend pendiente', 'No es posible eliminar un cliente transitorio');
				return;
			}
		setClientToDelete(client);
		setShowDeleteModal(true);
	};

	const handleConfirmDelete = async () => {
		if (clientToDelete) {
			const success = await deleteCliente(clientToDelete.id);
			if (success) {
				setShowDeleteModal(false);
				setClientToDelete(null);
			}
		}
	};

	const handleCancelDelete = () => {
		setShowDeleteModal(false);
		setClientToDelete(null);
	};

	const handleUpdateClient = async () => {
		// Validaciones similares a handleCreateClient
		const esRUC = formData.tipoDocumento === '6';
		const esDNI = formData.tipoDocumento === '1';
		
		if (esRUC && !formData.razonSocial.trim()) {
			showToast('warning', 'Campo requerido', 'La razón social es obligatoria para RUC');
			return;
		}

		if (!esRUC && !formData.primerNombre.trim()) {
			showToast('warning', 'Campo requerido', 'El primer nombre es obligatorio');
			return;
		}

		if (!esRUC && !formData.apellidoPaterno.trim()) {
			showToast('warning', 'Campo requerido', 'El apellido paterno es obligatorio');
			return;
		}

		if (!formData.numeroDocumento.trim()) {
			showToast('warning', 'Campo requerido', 'El número de documento es obligatorio');
			return;
		}

		if (esRUC && formData.numeroDocumento.length !== 11) {
			showToast('warning', 'RUC inválido', 'El RUC debe tener exactamente 11 dígitos');
			return;
		}

		if (esDNI && formData.numeroDocumento.length !== 8) {
			showToast('warning', 'DNI inválido', 'El DNI debe tener exactamente 8 dígitos');
			return;
		}

		if (formData.estadoCliente === 'Deshabilitado' && !formData.motivoDeshabilitacion.trim()) {
			showToast('warning', 'Campo requerido', 'Debe especificar el motivo de deshabilitación');
			return;
		}

		if (!editingClient) return;

		const nombreCliente = esRUC ? formData.razonSocial.trim() : formData.nombreCompleto.trim();
		
		const docTypeMap: Record<string, DocumentType> = {
			'0': 'NO_DOMICILIADO',
			'1': 'DNI',
			'4': 'CARNET_EXTRANJERIA',
			'6': 'RUC',
			'7': 'PASAPORTE',
		};

		const sanitizedEmails = formData.emails.filter(email => email.trim() !== '');
		const sanitizedTelefonos = formData.telefonos
			.filter(t => t.numero.trim() !== '')
			.map(t => ({
				numero: t.numero.trim(),
				tipo: t.tipo || 'Móvil',
			}));
		const primaryPhone = sanitizedTelefonos[0]?.numero;

		const [serializedAdjuntos, serializedImagenes] = await Promise.all([
			serializeFiles(formData.adjuntos),
			serializeFiles(formData.imagenes),
		]);

		const result = await updateCliente(editingClient.id, {
			// Campos legacy (retrocompatibilidad)
			documentType: (docTypeMap[formData.tipoDocumento] || 'SIN_DOCUMENTO') as DocumentType,
			documentNumber: formData.numeroDocumento.trim(),
			name: nombreCliente,
			type: formData.tipoCuenta as ClientType,
			address: formData.direccion.trim() || undefined,
			phone: primaryPhone || undefined,
			email: sanitizedEmails[0] || undefined,
			gender: formData.gender || undefined,
			additionalData: formData.observaciones.trim() || undefined,
			enabled: formData.estadoCliente === 'Habilitado',
			
			// Campos extendidos (TODOS)
			tipoDocumento: formData.tipoDocumento,
			numeroDocumento: formData.numeroDocumento.trim(),
			tipoPersona: formData.tipoPersona,
			tipoCuenta: formData.tipoCuenta,
			razonSocial: formData.razonSocial.trim() || undefined,
			nombreComercial: formData.nombreComercial.trim() || undefined,
			primerNombre: formData.primerNombre.trim() || undefined,
			segundoNombre: formData.segundoNombre.trim() || undefined,
			apellidoPaterno: formData.apellidoPaterno.trim() || undefined,
			apellidoMaterno: formData.apellidoMaterno.trim() || undefined,
			nombreCompleto: formData.nombreCompleto.trim(),
			emails: sanitizedEmails,
			telefonos: sanitizedTelefonos,
			paginaWeb: formData.paginaWeb.trim() || undefined,
			pais: formData.pais || undefined,
			departamento: formData.departamento.trim() || undefined,
			provincia: formData.provincia.trim() || undefined,
			distrito: formData.distrito.trim() || undefined,
			ubigeo: formData.ubigeo.trim() || undefined,
			direccion: formData.direccion.trim() || undefined,
			referenciaDireccion: formData.referenciaDireccion.trim() || undefined,
			tipoCliente: formData.tipoCliente,
			estadoCliente: formData.estadoCliente,
			motivoDeshabilitacion: formData.motivoDeshabilitacion.trim() || undefined,
			tipoContribuyente: formData.tipoContribuyente.trim() || undefined,
			estadoContribuyente: formData.estadoContribuyente.trim() || undefined,
			condicionDomicilio: formData.condicionDomicilio.trim() || undefined,
			fechaInscripcion: formData.fechaInscripcion || undefined,
			actividadesEconomicas: formData.actividadesEconomicas,
			sistemaEmision: formData.sistemaEmision.trim() || undefined,
			esEmisorElectronico: formData.esEmisorElectronico,
			cpeHabilitado: formData.cpeHabilitado,
			esAgenteRetencion: formData.esAgenteRetencion,
			esAgentePercepcion: formData.esAgentePercepcion,
			esBuenContribuyente: formData.esBuenContribuyente,
			formaPago: formData.formaPago,
			monedaPreferida: formData.monedaPreferida,
			listaPrecio: formData.listaPrecio.trim() || undefined,
			usuarioAsignado: formData.usuarioAsignado.trim() || undefined,
			clientePorDefecto: formData.clientePorDefecto,
			exceptuadaPercepcion: formData.exceptuadaPercepcion,
			observaciones: formData.observaciones.trim() || undefined,
			adjuntos: serializedAdjuntos,
			imagenes: serializedImagenes,
		});

		if (result) {
			resetForm();
			setShowClientModal(false);
		}
	};

	return (
		<>
			<ClientesModuleLayout activeTab="listado">
				<div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
					<div className="flex flex-wrap items-center gap-3 w-full">
						<ClientesFilters
							filters={filters}
							isActive={hasActiveFilters}
							onApply={handleApplyFilters}
							onClear={handleClearFilters}
						/>
						<ColumnSelector
							columns={columnDefinitions}
							visibleColumnIds={visibleColumnIds}
							onToggleColumn={toggleColumn}
							onReset={resetColumns}
							onSelectAll={selectAllColumns}
						/>
						{transientCount > 0 && (
							<button
								onClick={() => clearTransientClientes()}
								className="px-3 py-2 text-yellow-800 bg-yellow-100 border border-yellow-300 dark:text-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700 text-sm font-medium rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800/40 transition-colors"
								title={`Deshacer importación (${transientCount})`}
							>
								Deshacer importación ({transientCount})
							</button>
						)}
						<div className="flex-1 min-w-[1px]" />
						<button
							onClick={() => setShowClientModal(true)}
							style={{ backgroundColor: PRIMARY_COLOR }}
							className="px-6 py-2 text-white text-sm font-medium rounded-lg shadow-sm hover:opacity-95 transition-opacity"
						>
							Nuevo cliente
						</button>
						<div className="relative">
							<button
								ref={exportButtonRef}
								title="Exportar listado de clientes"
								onClick={() => {
									if (loading || !hasClients) return;
									setExportMenuOpen((prev) => !prev);
								}}
								disabled={loading || !hasClients}
								aria-haspopup="menu"
								aria-expanded={exportMenuOpen}
								className={`h-10 px-4 flex items-center gap-2 text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
									exportMenuOpen ? 'ring-2 ring-[#6F36FF]/30 dark:ring-[#8B5CF6]/40' : 'hover:bg-gray-100 dark:hover:bg-gray-600'
								}`}
							>
								<Download className="w-4 h-4" />
								<span>Exportar</span>
								<ChevronDown className={`w-4 h-4 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
							</button>
							{exportMenuOpen && (
								<div
									ref={exportMenuRef}
									className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl py-2 z-20"
									role="menu"
								>
									<button
										onClick={handleExportClientesBasico}
										className="w-full px-4 py-2.5 flex items-start gap-3 text-left text-sm text-gray-700 dark:text-gray-100 hover:bg-[#6F36FF]/5 dark:hover:bg-[#6F36FF]/10 transition-colors"
										role="menuitem"
									>
										<FileSpreadsheet className="w-4 h-4 mt-[3px] text-[#6F36FF] dark:text-[#8B5CF6]" />
										<div className="flex flex-col">
											<span className="font-medium leading-5">Exportar básico</span>
											<span className="text-xs text-gray-500 dark:text-gray-400">Columnas esenciales: identificación, contacto y ubicación.</span>
										</div>
									</button>
									<button
										onClick={handleExportClientesCompleto}
										className="w-full px-4 py-2.5 flex items-start gap-3 text-left text-sm text-gray-700 dark:text-gray-100 hover:bg-[#6F36FF]/5 dark:hover:bg-[#6F36FF]/10 transition-colors"
										role="menuitem"
									>
										<Layers className="w-4 h-4 mt-[3px] text-indigo-600 dark:text-indigo-400" />
										<div className="flex flex-col">
											<span className="font-medium leading-5">Exportar completo</span>
											<span className="text-xs text-gray-500 dark:text-gray-400">Todos los campos disponibles para auditorías y migraciones.</span>
										</div>
									</button>
								</div>
							)}
						</div>
					</div>
				</div>

				<div className="flex-1 flex flex-col">
					<div className="flex-1 px-6 pt-6 pb-6">
						{loading ? (
							<div className="flex items-center justify-center py-12">
								<div className="w-8 h-8 border-4 border-[#6F36FF] border-t-transparent rounded-full animate-spin"></div>
								<span className="ml-3 text-gray-600 dark:text-gray-400">Cargando clientes...</span>
							</div>
						) : combinedClients.length === 0 ? (
							<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
								<svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
								</svg>
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No hay clientes registrados</h3>
								<p className="text-gray-500 dark:text-gray-400 mb-4">Comienza agregando tu primer cliente</p>
								<button
									onClick={() => setShowClientModal(true)}
									style={{ backgroundColor: PRIMARY_COLOR }}
									className="px-6 py-2 text-white text-sm font-medium rounded-lg hover:opacity-95 transition-opacity"
								>
									Agregar cliente
								</button>
							</div>
						) : !hasVisibleClients ? (
							<div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
								<h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Sin coincidencias</h3>
								<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No encontramos clientes con los filtros aplicados.</p>
								<button
									onClick={handleClearFilters}
									className="mt-4 inline-flex items-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-sm font-medium text-[#6F36FF] transition hover:bg-[#6F36FF]/5 dark:text-[#8B5CF6] dark:hover:bg-[#6F36FF]/10"
								>
									Limpiar filtros
								</button>
							</div>
						) : (
										<ClientesTable
											clients={filteredClients}
											visibleColumnIds={visibleColumnIds}
											onEditClient={handleEditClient}
											onDeleteClient={handleDeleteClient}
										/>
						)}
					</div>

					{pagination.totalPages > 1 && (
						<div className="px-6 py-4 border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
							<div className="flex items-center justify-between">
								<div className="text-sm text-gray-500 dark:text-gray-400">
									{(() => {
										const start = (pagination.page - 1) * pagination.limit + 1;
										const end = Math.min(pagination.page * pagination.limit, pagination.total);
										const base = `Mostrando ${start}-${end} de ${pagination.total} resultados`;
										return transientCount > 0 ? `${base} +${transientCount} transitorios` : base;
									})()}
								</div>
								<div className="flex items-center gap-2">
									<button
										onClick={() => pagination.page > 1 && fetchClientes({ page: pagination.page - 1, limit: pagination.limit })}
										disabled={pagination.page === 1}
										className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
									>
										Anterior
									</button>

									<div className="flex items-center gap-1">
										{Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
											.filter((page) =>
												page === 1 ||
												page === pagination.totalPages ||
												Math.abs(page - pagination.page) <= 1
											)
											.map((page, index, array) => (
												<React.Fragment key={page}>
													{index > 0 && array[index - 1] !== page - 1 && (
														<span className="px-2 text-gray-400">...</span>
													)}
													<button
														onClick={() => fetchClientes({ page, limit: pagination.limit })}
														className={`px-3 py-1 text-sm rounded-lg ${
															page === pagination.page
																? 'text-white'
																: 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
														}`}
														style={page === pagination.page ? { backgroundColor: PRIMARY_COLOR } : {}}
													>
														{page}
													</button>
												</React.Fragment>
											))
										}
									</div>

									<button
										onClick={() => pagination.page < pagination.totalPages && fetchClientes({ page: pagination.page + 1, limit: pagination.limit })}
										disabled={pagination.page === pagination.totalPages}
										className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
									>
										Siguiente
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</ClientesModuleLayout>

			{showClientModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<ClienteFormNew
						formData={formData}
						onInputChange={handleInputChange}
						onCancel={handleCancelClient}
						onSave={editingClient ? handleUpdateClient : handleCreateClient}
						isEditing={!!editingClient}
					/>
				</div>
			)}

			<ConfirmationModal
				isOpen={showDeleteModal}
				title="Eliminar cliente"
				message={`¿Está seguro de eliminar el cliente ${clientToDelete?.name}?`}
				clientName={clientToDelete?.name}
				onConfirm={handleConfirmDelete}
				onCancel={handleCancelDelete}
				confirmText="Eliminar"
				cancelText="Cancelar"
				confirmButtonStyle="primary"
			/>
		</>
	);
}

export default ClientesPage;

