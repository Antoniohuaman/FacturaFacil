import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import * as ExcelJS from 'exceljs';
import { Download, ChevronDown, FileSpreadsheet, Layers, Pencil } from 'lucide-react';
import ClienteFormNew from '../components/ClienteFormNew';
import ClientesTable from '../components/ClientesTable';
import ClientesFilters from '../components/ClientesFilters';
import { CLIENTES_FILTERS_INITIAL_STATE, type ClientesFilterValues } from '../components/clientesFiltersConfig';
import ColumnSelector from '../components/ColumnSelector';
import ConfirmationModal from '../../../../../../app/shared/src/components/ConfirmationModal';
import { ClientesModuleLayout } from '../components/ClientesModuleLayout';
import { useClientes } from '../hooks';
import { useClientesColumns } from '../hooks/useClientesColumns';
import { useCaja } from '../../control-caja/context/CajaContext';
import { formatBusinessDateTimeLocal, getBusinessTodayISODate } from '@/shared/time/businessTime';
import type { Cliente, ClienteFormData, DocumentType, ClientType } from '../models';
import type { DocumentCode } from '../utils/documents';
import { serializeFiles, deserializeFiles } from '../utils/fileSerialization';
import {
	documentCodeFromType,
	documentTypeFromCode,
	parseLegacyDocumentString,
	resolveDocumentCodeFromInputs,
	resolveDocumentNumberFromInputs,
	isSunatDocCode,
} from '../utils/documents';
import {
	normalizeEmailList,
	normalizeEmailListLoose,
	normalizePhoneEntriesForForm,
	normalizePhoneEntriesForPayload,
	normalizePhoneList,
	sanitizePhones,
	splitPhoneStringToEntries,
} from '../utils/contact';
import { resolveCustomerNameFields } from '../utils/names';
import { useFocusFromQuery } from '../../../../../hooks/useFocusFromQuery';
import { useAutoExportRequest } from '@/shared/export/useAutoExportRequest';
import { REPORTS_HUB_PATH } from '@/shared/export/autoExportParams';
import { Drawer } from '@/shared/ui';
import { usePriceProfilesCatalog } from '../../lista-precios/hooks/usePriceProfilesCatalog';
import { Button } from '@/contasis';

type DrawerMode = 'create' | 'view' | 'edit';
type ClienteViewTab = 'datosPrincipales' | 'direcciones' | 'contactos' | 'configuracionComercial' | 'datosSunat';

const CLIENTE_VIEW_TABS: Array<{ id: ClienteViewTab; label: string }> = [
	{ id: 'datosPrincipales', label: 'Datos principales' },
	{ id: 'direcciones', label: 'Direcciones' },
	{ id: 'contactos', label: 'Contactos' },
	{ id: 'configuracionComercial', label: 'Configuración comercial' },
	{ id: 'datosSunat', label: 'Datos SUNAT' },
];

type ClienteFormValue = ClienteFormData[keyof ClienteFormData];
type DireccionPersistidaCliente = {
	id: string;
	pais: string;
	departamento: string;
	provincia: string;
	distrito: string;
	ubigeo: string;
	direccion: string;
	referenciaDireccion: string;
};

type DireccionesPersistidasPayload = {
	direcciones: DireccionPersistidaCliente[];
	principalId: string | null;
};

const PRIMARY_COLOR = '#6F36FF';
const CLIENTE_DIRECCIONES_STORAGE_PREFIX = 'facturafacil:clientes:direcciones';

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

type PriceProfileLabelResolver = (value?: string | null) => string;

const resolveDocumentCode = (client: Cliente): DocumentCode | '' =>
	resolveDocumentCodeFromInputs({
		tipoDocumento: client.tipoDocumento,
		legacyDocument: client.document,
	});

const resolveDocumentNumber = (client: Cliente, documentCode?: DocumentCode | ''): string =>
	resolveDocumentNumberFromInputs({
		tipoDocumento: client.tipoDocumento,
		numeroDocumento: client.numeroDocumento,
		legacyDocument: client.document,
		documentCode,
	});

const buildDireccionesStorageKeysForClient = (client: Cliente): string[] => {
	const keys: string[] = [];
	const clientId = client.id !== undefined && client.id !== null ? `${client.id}`.trim() : '';
	if (clientId) {
		keys.push(`${CLIENTE_DIRECCIONES_STORAGE_PREFIX}:id:${clientId}`);
	}

	const documentCode = resolveDocumentCode(client);
	const documentNumber = resolveDocumentNumber(client, documentCode).trim();
	if (documentNumber) {
		const typeCode = documentCode || 'sin-tipo';
		keys.push(`${CLIENTE_DIRECCIONES_STORAGE_PREFIX}:doc:${typeCode}:${documentNumber}`);
	}

	return keys;
};

const isDireccionPersistidaValida = (value: unknown): value is DireccionPersistidaCliente => {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const candidate = value as Record<string, unknown>;
	return (
		typeof candidate.id === 'string' &&
		typeof candidate.pais === 'string' &&
		typeof candidate.departamento === 'string' &&
		typeof candidate.provincia === 'string' &&
		typeof candidate.distrito === 'string' &&
		typeof candidate.ubigeo === 'string' &&
		typeof candidate.direccion === 'string' &&
		typeof candidate.referenciaDireccion === 'string'
	);
};

const readPersistedDirecciones = (client: Cliente): DireccionesPersistidasPayload | null => {
	if (typeof window === 'undefined') {
		return null;
	}

	const keys = buildDireccionesStorageKeysForClient(client);
	for (const key of keys) {
		const raw = window.localStorage.getItem(key);
		if (!raw) {
			continue;
		}

		try {
			const parsed = JSON.parse(raw) as Partial<DireccionesPersistidasPayload>;
			const direcciones = Array.isArray(parsed?.direcciones)
				? parsed.direcciones.filter(isDireccionPersistidaValida)
				: [];
			if (direcciones.length === 0) {
				continue;
			}

			const principalId = typeof parsed?.principalId === 'string' ? parsed.principalId : null;
			return { direcciones, principalId };
		} catch {
			continue;
		}
	}

	return null;
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

const resolveNameParts = (client: Cliente) => {
	const resolved = resolveCustomerNameFields({
		tipoDocumento: client.tipoDocumento,
		tipoPersona: client.tipoPersona,
		razonSocial: client.razonSocial,
		nombreCompleto: client.nombreCompleto,
		primerNombre: client.primerNombre,
		segundoNombre: client.segundoNombre,
		apellidoPaterno: client.apellidoPaterno,
		apellidoMaterno: client.apellidoMaterno,
		fallbackFullName: client.name,
		preferExistingParts: true,
		splitMode: 'cliente',
	});

	return {
		primerNombre: resolved.primerNombre,
		segundoNombre: resolved.segundoNombre,
		apellidoPaterno: resolved.apellidoPaterno,
		apellidoMaterno: resolved.apellidoMaterno,
	};
};

const resolveEmails = (client: Cliente): string[] => {
	if (client.emails?.length) {
		return normalizeEmailList(client.emails);
	}
	if (client.email) {
		return normalizeEmailList(client.email);
	}
	return [];
};

const resolvePhones = (client: Cliente): Array<{ numero: string; tipo: string }> => {
	if (client.telefonos?.length) {
		return sanitizePhones(client.telefonos);
	}
	if (client.phone) {
		return normalizePhoneList(client.phone);
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

const mapClientToCompleteRow = (
	client: Cliente,
	resolveProfileLabel: PriceProfileLabelResolver,
): Record<string, string> => {
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
		listaPrecio: resolveProfileLabel(client.listaPrecio),
		usuarioAsignado: client.usuarioAsignado ?? '',
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
	useFocusFromQuery();
	const { showToast } = useCaja();
	const { request: autoExportRequest, finish: finishAutoExport } = useAutoExportRequest('clientes-maestro');
	const autoExportHandledRef = useRef(false);
	const autoExportRunnerRef = useRef<() => Promise<void>>(async () => {});
			const { clientes, transientClientes, transientCount, clearTransientClientes, createCliente, updateCliente, deleteCliente, loading, pagination, fetchClientes } = useClientes();
			const combinedClients = useMemo(() => [...clientes, ...transientClientes], [clientes, transientClientes]);
	const {
		columnsConfig,
		visibleColumnIds,
		toggleColumn,
		resetColumns,
		selectAllColumns,
		reorderColumns
	} = useClientesColumns();
	const { resolveProfileId, resolveProfileLabel } = usePriceProfilesCatalog();
	const normalizeProfileSelectionValue = useCallback((value?: string | null) => resolveProfileId(value) ?? '', [resolveProfileId]);
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
	const [drawerMode, setDrawerMode] = useState<DrawerMode>('create');
	const [activeViewTab, setActiveViewTab] = useState<ClienteViewTab>('datosPrincipales');
	const [editingClient, setEditingClient] = useState<Cliente | null>(null);
	const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [clientToDelete, setClientToDelete] = useState<Cliente | null>(null);

	const getBusinessTimestamp = (value?: string | null): string => {
		if (value) {
			const parsed = new Date(value);
			if (!Number.isNaN(parsed.getTime())) {
				return formatBusinessDateTimeLocal(parsed);
			}
		}
		return formatBusinessDateTimeLocal(new Date());
	};

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
		fechaRegistro: getBusinessTimestamp(),
		fechaUltimaModificacion: getBusinessTimestamp(),
		
		// Legacy
		gender: '',
		additionalData: '',
	});

	const [formData, setFormData] = useState<ClienteFormData>(getInitialFormData());

	const exportButtonRef = useRef<HTMLButtonElement>(null);
	const exportMenuRef = useRef<HTMLDivElement>(null);
	const botonNuevoClienteRef = useRef<HTMLButtonElement>(null);
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
			{ header: 'PERFIL DE PRECIO', key: 'listaPrecio', width: 20 },
			{ header: 'USUARIO ASIGNADO', key: 'usuarioAsignado', width: 24 },
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
	const completeExportRows = useMemo(
		() => combinedClients.map((client) => mapClientToCompleteRow(client, resolveProfileLabel)),
		[combinedClients, resolveProfileLabel]
	);

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
	
	autoExportRunnerRef.current = handleExportClientesCompleto;

	useEffect(() => {
		if (!autoExportRequest || autoExportHandledRef.current || loading) {
			return;
		}

		autoExportHandledRef.current = true;
		const runAutoExport = async () => {
			try {
				await autoExportRunnerRef.current();
			} finally {
				finishAutoExport(REPORTS_HUB_PATH);
			}
		};

		void runAutoExport();
	}, [autoExportRequest, finishAutoExport, loading]);

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

	const handleCreateClient = async (options?: { crearOtro?: boolean }) => {
		// Validación de nombre según tipo de documento
		const esRUC = formData.tipoDocumento === '6';
		const esDNI = formData.tipoDocumento === '1';
		
		if (esRUC && !formData.razonSocial.trim()) {
			showToast('warning', 'Campo requerido', 'La razón social es obligatoria para RUC');
			return false;
		}

		if (!esRUC && !formData.primerNombre.trim()) {
			showToast('warning', 'Campo requerido', 'El primer nombre es obligatorio');
			return false;
		}

		if (!esRUC && !formData.apellidoPaterno.trim()) {
			showToast('warning', 'Campo requerido', 'El apellido paterno es obligatorio');
			return false;
		}

		if (!formData.numeroDocumento.trim()) {
			showToast('warning', 'Campo requerido', 'El número de documento es obligatorio');
			return false;
		}

		if (esRUC && formData.numeroDocumento.length !== 11) {
			showToast('warning', 'RUC inválido', 'El RUC debe tener exactamente 11 dígitos');
			return false;
		}

		if (esDNI && formData.numeroDocumento.length !== 8) {
			showToast('warning', 'DNI inválido', 'El DNI debe tener exactamente 8 dígitos');
			return false;
		}

		if (formData.estadoCliente === 'Deshabilitado' && !formData.motivoDeshabilitacion.trim()) {
			showToast('warning', 'Campo requerido', 'Debe especificar el motivo de deshabilitación');
			return false;
		}

		// Determinar el nombre para enviar al backend
		const nombreCliente = esRUC ? formData.razonSocial.trim() : formData.nombreCompleto.trim();
		
		// Mapeo de tipo de documento nuevo a antiguo
		// Determinar DocumentType legacy desde el código SUNAT
		const legacyDocType = documentTypeFromCode(formData.tipoDocumento) || 'SIN_DOCUMENTO';

		const sanitizedEmails = normalizeEmailListLoose(formData.emails);
		const sanitizedTelefonos = normalizePhoneEntriesForPayload(formData.telefonos);
		const primaryPhone = sanitizedTelefonos[0]?.numero;
		const profileForPayload = normalizeProfileSelectionValue(formData.listaPrecio);

		const [serializedAdjuntos, serializedImagenes] = await Promise.all([
			serializeFiles(formData.adjuntos),
			serializeFiles(formData.imagenes),
		]);

		const result = await createCliente({
			// Campos legacy (retrocompatibilidad)
			documentType: legacyDocType as DocumentType,
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
			listaPrecio: profileForPayload || undefined,
			usuarioAsignado: formData.usuarioAsignado.trim() || undefined,
			clientePorDefecto: formData.clientePorDefecto,
			exceptuadaPercepcion: formData.exceptuadaPercepcion,
			observaciones: formData.observaciones.trim() || undefined,
			adjuntos: serializedAdjuntos,
			imagenes: serializedImagenes,
		});

		if (result) {
			resetForm();
			if (!options?.crearOtro) {
				setShowClientModal(false);
			}
			return true;
		}

		return false;
	};

	const handleCancelClient = () => {
		resetForm();
		setShowClientModal(false);
		setDrawerMode('create');
		setActiveViewTab('datosPrincipales');
		setSelectedClient(null);
	};

	const handleInputChange = (field: keyof ClienteFormData, value: ClienteFormValue) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const resetForm = () => {
		setFormData(getInitialFormData());
		setEditingClient(null);
	};

	const resolveClientDisplayName = (client: Cliente): string => {
		return client.razonSocial?.trim() || client.nombreCompleto?.trim() || client.name || '-';
	};

	const resolveClientDocumentLabel = (client: Cliente): string => {
		const code = resolveDocumentCode(client);
		const number = resolveDocumentNumber(client, code);
		const label = documentTypeFromCode(code as DocumentCode) || 'Documento';
		return number ? `${label} ${number}` : label;
	};

	const handleViewClient = (client: Cliente) => {
		setSelectedClient(client);
		setDrawerMode('view');
		setActiveViewTab('datosPrincipales');
		setShowClientModal(true);
	};

	const handleEditClient = async (client: Cliente) => {
		if (client.transient) {
			showToast('info', 'Operación no disponible: backend pendiente', 'No es posible editar un cliente transitorio');
			return;
		}

		try {
			setDrawerMode('edit');
			setSelectedClient(client);
			setEditingClient(client);

			const parsed = parseLegacyDocumentString(client.document);
			const resolvedCode: string = (() => {
				if (isSunatDocCode(client.tipoDocumento)) return client.tipoDocumento as string;
				if (parsed.code) return parsed.code;
				const fromType = documentCodeFromType(parsed.type!);
				if (fromType) return fromType;
				return '6';
			})();

			const docType = resolvedCode;
			const docNumber = client.numeroDocumento?.trim() || (parsed.number?.trim() || (client.document && client.document !== 'Sin documento' ? client.document : ''));

			const esRUC = docType === '6';
			const nombreBase = client.nombreCompleto || client.name || '';
			const resolvedNames = resolveCustomerNameFields({
				tipoDocumento: docType,
				tipoPersona: client.tipoPersona,
				razonSocial: client.razonSocial,
				nombreCompleto: client.nombreCompleto,
				primerNombre: client.primerNombre,
				segundoNombre: client.segundoNombre,
				apellidoPaterno: client.apellidoPaterno,
				apellidoMaterno: client.apellidoMaterno,
				fallbackFullName: nombreBase,
				preferExistingParts: true,
				splitMode: 'import',
			});

			const primerNombre = resolvedNames.primerNombre;
			const segundoNombre = resolvedNames.segundoNombre;
			const apellidoPaterno = resolvedNames.apellidoPaterno;
			const apellidoMaterno = resolvedNames.apellidoMaterno;

			const emails = client.emails?.length
				? client.emails
				: normalizeEmailListLoose(client.email);

			const telefonosRaw = client.telefonos?.length
				? client.telefonos
				: splitPhoneStringToEntries(client.phone);

			const telefonos = normalizePhoneEntriesForForm(telefonosRaw);

			const [adjuntos, imagenes] = await Promise.all([
				deserializeFiles(client.adjuntos),
				deserializeFiles(client.imagenes),
			]);

						const fechaRegistro = getBusinessTimestamp(client.fechaRegistro || client.createdAt);
						const fechaUltimaModificacionOrigen = client.fechaUltimaModificacion || client.updatedAt;
						const fechaUltimaModificacion = fechaUltimaModificacionOrigen
							? getBusinessTimestamp(fechaUltimaModificacionOrigen)
							: fechaRegistro;
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
				listaPrecio: normalizeProfileSelectionValue(client.listaPrecio),
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
		
		const legacyDocType = documentTypeFromCode(formData.tipoDocumento) || 'SIN_DOCUMENTO';

		const sanitizedEmails = normalizeEmailListLoose(formData.emails);
		const sanitizedTelefonos = normalizePhoneEntriesForPayload(formData.telefonos);
		const primaryPhone = sanitizedTelefonos[0]?.numero;
		const profileForPayload = normalizeProfileSelectionValue(formData.listaPrecio);

		const [serializedAdjuntos, serializedImagenes] = await Promise.all([
			serializeFiles(formData.adjuntos),
			serializeFiles(formData.imagenes),
		]);

		const result = await updateCliente(editingClient.id, {
			// Campos legacy (retrocompatibilidad)
			documentType: legacyDocType as DocumentType,
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
			listaPrecio: profileForPayload || undefined,
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
			setDrawerMode('create');
			setSelectedClient(null);
		}
	};

	const activeDrawerClient = selectedClient ?? editingClient;
	const activeClientId = showClientModal ? (activeDrawerClient?.id ?? null) : null;
	const isViewMode = drawerMode === 'view' && Boolean(activeDrawerClient);
	const drawerTitle =
		drawerMode === 'create' ? 'Nuevo cliente' : drawerMode === 'edit' ? 'Editar cliente' : 'Detalle del cliente';
	const drawerSubtitle = !isViewMode && activeDrawerClient
		? resolveClientDisplayName(activeDrawerClient)
		: undefined;

	const normalizeText = (value?: string | null): string => (value && value.trim() ? value.trim() : '');
	const displayText = (value?: string | null): string => normalizeText(value) || '-';
	const hasText = (value?: string | null): boolean => Boolean(normalizeText(value));

	const readOnlyField = (label: string, value: string, isFullWidth = false) => (
		<div className={`rounded-md border border-gray-200 p-2.5 dark:border-gray-700 ${isFullWidth ? 'sm:col-span-2' : ''}`}>
			<p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{label}</p>
			<p className="mt-0.5 truncate text-[13px] leading-snug text-gray-900 dark:text-gray-100" title={value}>
				{value}
			</p>
		</div>
	);

	const renderEmptyViewState = (message: string) => (
		<div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">{message}</div>
	);

	const estadoClienteLabel = activeDrawerClient
		? activeDrawerClient.estadoCliente || (activeDrawerClient.enabled ? 'Habilitado' : 'Deshabilitado')
		: '-';

	const drawerHeaderTitle = isViewMode && activeDrawerClient ? (
		<div className="min-w-0">
			<p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Detalle del cliente</p>
			<p
				className="mt-0.5 truncate text-lg font-semibold leading-tight text-gray-900 dark:text-gray-100"
				title={resolveClientDisplayName(activeDrawerClient)}
			>
				{resolveClientDisplayName(activeDrawerClient)}
			</p>
			<p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{resolveClientDocumentLabel(activeDrawerClient)}</p>
		</div>
	) : (
		drawerTitle
	);

	const drawerHeaderActions = isViewMode && activeDrawerClient ? (
		<div className="flex items-center gap-2">
			<span
				className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
					estadoClienteLabel === 'Habilitado'
						? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
						: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
				}`}
			>
				{estadoClienteLabel}
			</span>
			<button
				type="button"
				onClick={() => void handleEditClient(activeDrawerClient)}
				className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
				aria-label="Editar"
				title="Editar"
			>
				<Pencil className="h-4 w-4" />
			</button>
		</div>
	) : undefined;

	const renderReadOnlyTabContent = () => {
		if (!activeDrawerClient) return null;

		const primaryFields = [
			{ label: 'Tipo de cuenta', value: displayText(activeDrawerClient.tipoCuenta || activeDrawerClient.type) },
			{ label: 'Tipo de persona', value: displayText(activeDrawerClient.tipoPersona) },
			{ label: 'Nombre comercial', value: displayText(activeDrawerClient.nombreComercial) },
			{ label: 'Tipo de cliente', value: displayText(activeDrawerClient.tipoCliente) },
			{ label: 'Observaciones', value: displayText(activeDrawerClient.observaciones || activeDrawerClient.additionalData), fullWidth: true },
		];

		const direccionesPersistidas = readPersistedDirecciones(activeDrawerClient);
		const direccionLegacyPrincipal: DireccionPersistidaCliente = {
			id: 'direccion-main',
			pais: normalizeText(activeDrawerClient.pais),
			departamento: normalizeText(activeDrawerClient.departamento),
			provincia: normalizeText(activeDrawerClient.provincia),
			distrito: normalizeText(activeDrawerClient.distrito),
			ubigeo: normalizeText(activeDrawerClient.ubigeo),
			direccion: normalizeText(activeDrawerClient.direccion) || normalizeText(activeDrawerClient.address),
			referenciaDireccion: normalizeText(activeDrawerClient.referenciaDireccion),
		};
		const hasLegacyAddress = [
			direccionLegacyPrincipal.direccion,
			direccionLegacyPrincipal.referenciaDireccion,
			direccionLegacyPrincipal.pais,
			direccionLegacyPrincipal.departamento,
			direccionLegacyPrincipal.provincia,
			direccionLegacyPrincipal.distrito,
			direccionLegacyPrincipal.ubigeo,
		].some(Boolean);
		const direccionesDetalle = direccionesPersistidas?.direcciones.length
			? direccionesPersistidas.direcciones
			: hasLegacyAddress
				? [direccionLegacyPrincipal]
				: [];
		const principalDetalleId =
			direccionesPersistidas?.principalId && direccionesDetalle.some((direccion) => direccion.id === direccionesPersistidas.principalId)
				? direccionesPersistidas.principalId
				: direccionesDetalle[0]?.id ?? null;
		const hasAddressData = direccionesDetalle.some((direccion) =>
			[direccion.direccion, direccion.referenciaDireccion, direccion.pais, direccion.departamento, direccion.provincia, direccion.distrito, direccion.ubigeo].some(Boolean)
		);

		const contactEmails = activeDrawerClient.emails?.filter((email) => hasText(email)) ?? [];
		const contactPhones = activeDrawerClient.telefonos?.filter((phone) => hasText(phone.numero)) ?? [];
		const emailsLabel = contactEmails.length > 0 ? contactEmails.join(', ') : displayText(activeDrawerClient.email);
		const phonesLabel =
			contactPhones.length > 0
				? contactPhones.map((phone) => (hasText(phone.tipo) ? `${phone.tipo}: ${phone.numero}` : phone.numero)).join(', ')
				: displayText(activeDrawerClient.phone);
		const hasContactData = contactEmails.length > 0 || contactPhones.length > 0 || hasText(activeDrawerClient.email) || hasText(activeDrawerClient.phone) || hasText(activeDrawerClient.paginaWeb);

		const priceProfileLabel = displayText(resolveProfileLabel(activeDrawerClient.listaPrecio));
		const hasCommercialData = [
			hasText(activeDrawerClient.formaPago),
			hasText(activeDrawerClient.monedaPreferida),
			hasText(priceProfileLabel === '-' ? '' : priceProfileLabel),
			hasText(activeDrawerClient.usuarioAsignado),
			activeDrawerClient.clientePorDefecto !== undefined,
			activeDrawerClient.exceptuadaPercepcion !== undefined,
			hasText(activeDrawerClient.motivoDeshabilitacion),
		].some(Boolean);

		const actividadesEconomicasLabel = activeDrawerClient.actividadesEconomicas?.length
			? activeDrawerClient.actividadesEconomicas
					.map((actividad) => `${actividad.codigo} - ${actividad.descripcion}${actividad.esPrincipal ? ' (Principal)' : ''}`)
					.join(' | ')
			: '-';
		const cpeHabilitadoLabel = activeDrawerClient.cpeHabilitado?.length
			? activeDrawerClient.cpeHabilitado
					.map((cpe) => (hasText(cpe.fechaInicio) ? `${cpe.tipoCPE} (${cpe.fechaInicio})` : cpe.tipoCPE))
					.join(' | ')
			: '-';
		const hasSunatData = [
			hasText(activeDrawerClient.tipoContribuyente),
			hasText(activeDrawerClient.estadoContribuyente),
			hasText(activeDrawerClient.condicionDomicilio),
			hasText(activeDrawerClient.fechaInscripcion),
			actividadesEconomicasLabel !== '-',
			hasText(activeDrawerClient.sistemaEmision),
			cpeHabilitadoLabel !== '-',
			activeDrawerClient.esEmisorElectronico !== undefined,
			activeDrawerClient.esAgenteRetencion !== undefined,
			activeDrawerClient.esAgentePercepcion !== undefined,
			activeDrawerClient.esBuenContribuyente !== undefined,
		].some(Boolean);

		switch (activeViewTab) {
			case 'datosPrincipales':
				if (!primaryFields.some((field) => field.value !== '-')) {
					return renderEmptyViewState('Sin datos principales');
				}
				return (
					<div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
						{primaryFields.map((field) => (
							<React.Fragment key={field.label}>{readOnlyField(field.label, field.value, field.fullWidth)}</React.Fragment>
						))}
					</div>
				);

			case 'direcciones':
				if (!hasAddressData) {
					return renderEmptyViewState('Sin direcciones');
				}
				return (
					<div className="space-y-2">
						{direccionesDetalle.map((direccion) => {
							const esPrincipal = direccion.id === principalDetalleId;
							const titulo = displayText(direccion.direccion);
							const ubicacion = [direccion.distrito, direccion.provincia, direccion.departamento, direccion.pais]
								.filter(Boolean)
								.join(' · ');

							return (
								<div
									key={direccion.id}
									className="rounded-md border border-gray-200 p-2.5 dark:border-gray-700"
								>
									<div className="flex items-start justify-between gap-2">
										<div className="min-w-0">
											<p className="truncate text-[13px] font-medium text-gray-900 dark:text-gray-100" title={titulo}>
												{titulo}
											</p>
											<p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400" title={ubicacion || '-'}>
												{ubicacion || '-'}
												{direccion.ubigeo ? ` · UBI ${direccion.ubigeo}` : ''}
											</p>
											{direccion.referenciaDireccion ? (
												<p className="mt-1 truncate text-[11px] text-gray-500 dark:text-gray-400" title={direccion.referenciaDireccion}>
													{direccion.referenciaDireccion}
												</p>
											) : null}
										</div>
										{esPrincipal ? (
											<span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
												Principal
											</span>
										) : null}
									</div>
								</div>
							);
						})}
					</div>
				);

			case 'contactos':
				if (!hasContactData) {
					return renderEmptyViewState('Sin contactos');
				}
				return (
					<div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
						{readOnlyField('Correos', emailsLabel, true)}
						{readOnlyField('Teléfonos', phonesLabel, true)}
						{readOnlyField('Página web', displayText(activeDrawerClient.paginaWeb), true)}
					</div>
				);

			case 'configuracionComercial':
				if (!hasCommercialData) {
					return renderEmptyViewState('Sin configuración comercial');
				}
				return (
					<div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
						{readOnlyField('Forma de pago', displayText(activeDrawerClient.formaPago))}
						{readOnlyField('Moneda preferida', displayText(activeDrawerClient.monedaPreferida))}
						{readOnlyField('Lista de precios', priceProfileLabel)}
						{readOnlyField('Usuario asignado', displayText(activeDrawerClient.usuarioAsignado))}
						{readOnlyField('Cliente por defecto', booleanToLabel(activeDrawerClient.clientePorDefecto) || '-')}
						{readOnlyField('Exceptuada de percepción', booleanToLabel(activeDrawerClient.exceptuadaPercepcion) || '-')}
						{readOnlyField('Motivo de deshabilitación', displayText(activeDrawerClient.motivoDeshabilitacion), true)}
					</div>
				);

			case 'datosSunat':
				if (!hasSunatData) {
					return renderEmptyViewState('Sin datos SUNAT');
				}
				return (
					<div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
						{readOnlyField('Tipo de contribuyente', displayText(activeDrawerClient.tipoContribuyente))}
						{readOnlyField('Estado contribuyente', displayText(activeDrawerClient.estadoContribuyente))}
						{readOnlyField('Condición de domicilio', displayText(activeDrawerClient.condicionDomicilio))}
						{readOnlyField('Fecha de inscripción', displayText(activeDrawerClient.fechaInscripcion))}
						{readOnlyField('Sistema de emisión', displayText(activeDrawerClient.sistemaEmision))}
						{readOnlyField('Emisor electrónico', booleanToLabel(activeDrawerClient.esEmisorElectronico) || '-')}
						{readOnlyField('Agente de retención', booleanToLabel(activeDrawerClient.esAgenteRetencion) || '-')}
						{readOnlyField('Agente de percepción', booleanToLabel(activeDrawerClient.esAgentePercepcion) || '-')}
						{readOnlyField('Buen contribuyente', booleanToLabel(activeDrawerClient.esBuenContribuyente) || '-')}
						{readOnlyField('Actividades económicas', actividadesEconomicasLabel, true)}
						{readOnlyField('CPE habilitado', cpeHabilitadoLabel, true)}
					</div>
				);
			default:
				return null;
		}
	};

	const openCreateDrawer = () => {
		resetForm();
		setSelectedClient(null);
		setDrawerMode('create');
		setActiveViewTab('datosPrincipales');
		setShowClientModal(true);
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
								columns={columnsConfig}
								onToggleColumn={toggleColumn}
								onReset={resetColumns}
								onSelectAll={selectAllColumns}
								onReorderColumns={reorderColumns}
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
						<Button
							ref={botonNuevoClienteRef}
							onClick={openCreateDrawer}
							variant="primary"
							size="md"
						>
							Nuevo cliente
						</Button>
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
									onClick={openCreateDrawer}
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
											onRowClick={handleViewClient}
											onEditClient={handleEditClient}
											onDeleteClient={handleDeleteClient}
											selectedClientId={activeClientId}
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

			<Drawer
				abierto={showClientModal}
				alCerrar={handleCancelClient}
				titulo={drawerHeaderTitle}
				subtitulo={drawerSubtitle}
				accionesEncabezado={drawerHeaderActions}
				lado="derecha"
				tamano="lg"
				devolverFocoARef={botonNuevoClienteRef}
			>
				{drawerMode === 'view' && activeDrawerClient ? (
					<div className="space-y-2.5 px-4 py-3">
						<div className="border-b border-gray-200 dark:border-gray-700">
							<div className="flex items-end gap-4 overflow-x-auto" role="tablist" aria-label="Detalle del cliente">
								{CLIENTE_VIEW_TABS.map((tab) => (
									<button
										key={tab.id}
										type="button"
										role="tab"
										aria-selected={activeViewTab === tab.id}
										onClick={() => setActiveViewTab(tab.id)}
										className={`-mb-px whitespace-nowrap border-b-2 px-0.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
											activeViewTab === tab.id
												? 'border-blue-600 text-blue-600 dark:text-blue-400'
												: 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
										}`}
									>
										{tab.label}
									</button>
								))}
							</div>
						</div>

						{renderReadOnlyTabContent()}
					</div>
				) : (
					<ClienteFormNew
						formData={formData}
						onInputChange={handleInputChange}
						onCancel={handleCancelClient}
						onSave={(options) => (editingClient ? handleUpdateClient() : handleCreateClient(options))}
						isEditing={drawerMode === 'edit'}
						modoPresentacion="drawer"
						clienteIdPersistencia={editingClient?.id ?? null}
					/>
				)}
			</Drawer>

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

