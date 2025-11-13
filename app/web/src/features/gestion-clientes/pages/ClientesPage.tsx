/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
import React, { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as ExcelJS from 'exceljs';
import ClienteFormNew from '../components/ClienteFormNew';
import ClientesTable, { type ClientesTableRef } from '../components/ClientesTable';
import ClientesFilters from '../components/ClientesFilters';
import ConfirmationModal from '../../../../../shared/src/components/ConfirmationModal';
import { useClientes } from '../hooks';
import { useCaja } from '../../control-caja/context/CajaContext';
import type { Cliente, ClienteFormData, DocumentType, ClientType } from '../models';

const PRIMARY_COLOR = '#1478D4';

function ClientesPage() {
	const navigate = useNavigate();
	const { showToast } = useCaja();
			const { clientes, transientClientes, transientCount, clearTransientClientes, createCliente, updateCliente, deleteCliente, loading, pagination, fetchClientes } = useClientes();
			const combinedClients = useMemo(() => [...clientes, ...transientClientes], [clientes, transientClientes]);

	const [showClientModal, setShowClientModal] = useState(false);
	const [editingClient, setEditingClient] = useState<Cliente | null>(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [clientToDelete, setClientToDelete] = useState<Cliente | null>(null);
	const clientesTableRef = useRef<ClientesTableRef>(null);

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

		// Indicador de filtros activos (sin polling)
		const [filtersActive, setFiltersActive] = useState(false);

	const handleExportClients = async () => {
		try {
			const workbook = new ExcelJS.Workbook();
			const worksheet = workbook.addWorksheet('Clientes');

			worksheet.columns = [
				{ header: 'Nombre/Razón Social', key: 'name', width: 40 },
				{ header: 'Documento', key: 'document', width: 20 },
				{ header: 'Tipo', key: 'type', width: 10 },
				{ header: 'Dirección', key: 'address', width: 50 },
				{ header: 'Teléfono', key: 'phone', width: 15 },
				{ header: 'Estado', key: 'status', width: 10 }
			];

			clientes.forEach((client: Cliente) => {
				worksheet.addRow({
					name: client.name,
					document: client.document,
					type: client.type,
					address: client.address,
					phone: client.phone,
					status: client.enabled ? 'Activo' : 'Inactivo'
				});
			});

			worksheet.getRow(1).font = { bold: true };
			worksheet.getRow(1).fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FFE6F3FF' }
			};

			const today = new Date();
			const dateString = today.toISOString().split('T')[0];
			const fileName = `clientes_${dateString}.xlsx`;

			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
			const url = URL.createObjectURL(blob);

			const link = document.createElement('a');
			link.href = url;
			link.download = fileName;
			link.click();

			URL.revokeObjectURL(url);

			showToast('success', '¡Exportación exitosa!', `Se exportaron ${clientes.length} clientes a Excel`);
		} catch (error) {
			showToast('error', 'Error al exportar', 'No se pudo exportar la lista de clientes');
		}
	};

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

		const result = await createCliente({
			documentType: (docTypeMap[formData.tipoDocumento] || 'SIN_DOCUMENTO') as DocumentType,
			documentNumber: formData.numeroDocumento.trim(),
			name: nombreCliente,
			type: formData.tipoCuenta as ClientType,
			address: formData.direccion.trim() || undefined,
			phone: formData.telefonos[0]?.numero || undefined,
			email: formData.emails[0] || undefined,
			gender: formData.gender || undefined,
			additionalData: formData.observaciones.trim() || undefined,
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

	const handleInputChange = (field: keyof ClienteFormData, value: any) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const resetForm = () => {
		setFormData(getInitialFormData());
		setEditingClient(null);
	};

	const handleEditClient = (client: Cliente) => {
		if (client.transient) {
			showToast('info', 'Operación no disponible: backend pendiente', 'No es posible editar un cliente transitorio');
			return;
		}
		
		let docType = '6'; // Default RUC
		let docNumber = '';

		if (client.document && client.document.includes(' ')) {
			const parts = client.document.split(' ');
			const typeStr = parts[0];
			docNumber = parts.slice(1).join(' ');
			
			// Mapeo inverso de tipo de documento
			const typeMap: Record<string, string> = {
				'NO_DOMICILIADO': '0',
				'DNI': '1',
				'CARNET_EXTRANJERIA': '4',
				'RUC': '6',
				'PASAPORTE': '7',
			};
			docType = typeMap[typeStr] || '6';
		} else if (client.document && client.document !== 'Sin documento') {
			docNumber = client.document;
		}

		setEditingClient(client);
		
		// Parsear nombre según tipo
		const esRUC = docType === '6';
		const nombreParts = client.name.split(' ');
		
		setFormData({
			...getInitialFormData(),
			tipoDocumento: docType,
			numeroDocumento: docNumber,
			
			// Razón Social o Nombres
			razonSocial: esRUC ? client.name : '',
			primerNombre: !esRUC && nombreParts.length > 0 ? nombreParts[0] : '',
			apellidoPaterno: !esRUC && nombreParts.length > 1 ? nombreParts[1] : '',
			apellidoMaterno: !esRUC && nombreParts.length > 2 ? nombreParts[2] : '',
			nombreCompleto: !esRUC ? client.name : '',
			
			// Contacto
			emails: client.email ? [client.email] : [],
			telefonos: client.phone ? [{ numero: client.phone, tipo: 'Móvil' }] : [],
			
			// Ubicación
			direccion: client.address === 'Sin dirección' ? '' : client.address,
			
			// Tipo
			tipoCuenta: client.type,
			estadoCliente: client.enabled ? 'Habilitado' : 'Deshabilitado',
			
			// Legacy
			gender: client.gender || '',
			additionalData: client.additionalData || '',
			observaciones: client.additionalData || '',
		});
		
		setShowClientModal(true);
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

		const result = await updateCliente(editingClient.id, {
			documentType: (docTypeMap[formData.tipoDocumento] || 'SIN_DOCUMENTO') as DocumentType,
			documentNumber: formData.numeroDocumento.trim(),
			name: nombreCliente,
			type: formData.tipoCuenta as ClientType,
			address: formData.direccion.trim() || undefined,
			phone: formData.telefonos[0]?.numero || undefined,
			email: formData.emails[0] || undefined,
			gender: formData.gender || undefined,
			additionalData: formData.observaciones.trim() || undefined,
			enabled: formData.estadoCliente === 'Habilitado',
		});

		if (result) {
			resetForm();
			setShowClientModal(false);
		}
	};

	return (
		<div className="flex-1 bg-gray-50 dark:bg-gray-900">
			{/* Header */}
			<div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
				<div className="flex items-center">
					<div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400">Administra y consulta la información de tus clientes en un solo lugar.</p>
					</div>
				</div>
							<div className="flex items-center gap-2">
						{transientCount > 0 && (
							<button
								onClick={() => clearTransientClientes()}
								className="px-3 py-2 text-yellow-800 bg-yellow-100 border border-yellow-300 dark:text-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700 text-sm font-medium rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800/40 transition-colors"
								title={`Deshacer importación (${transientCount})`}
							>
								Deshacer importación ({transientCount})
							</button>
						)}
					<button
						onClick={() => setShowClientModal(true)}
						style={{ backgroundColor: PRIMARY_COLOR }}
						className="px-6 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
					>
						Nuevo cliente
					</button>
					<button
						onClick={() => navigate('/importar-clientes')}
						className="px-6 py-2 text-blue-700 dark:text-blue-400 border border-blue-700 dark:border-blue-500 text-sm font-medium rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
					>
						Importar clientes
					</button>
					<button
						title="Exporta lista de clientes"
						onClick={handleExportClients}
						disabled={loading || clientes.length === 0}
						className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
						style={{ minWidth: 40, minHeight: 40 }}
					>
						<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
							<path strokeLinecap="round" strokeLinejoin="round" d="M7 10l5 5 5-5" />
							<path strokeLinecap="round" strokeLinejoin="round" d="M12 15V3" />
						</svg>
					</button>
				</div>
			</div>

			{/* Contenido */}
			<div className="px-6 pt-6 pb-6">
						<ClientesFilters
							active={filtersActive}
							onClearFilters={() => clientesTableRef.current?.clearAllFilters()}
						/>
				{loading ? (
					<div className="flex items-center justify-center py-12">
						<div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
						<span className="ml-3 text-gray-600 dark:text-gray-400">Cargando clientes...</span>
					</div>
				) : clientes.length === 0 ? (
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
						<svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No hay clientes registrados</h3>
						<p className="text-gray-500 dark:text-gray-400 mb-4">Comienza agregando tu primer cliente</p>
						<button
							onClick={() => setShowClientModal(true)}
							style={{ backgroundColor: PRIMARY_COLOR }}
							className="px-6 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
						>
							Agregar cliente
						</button>
					</div>
				) : (
								<ClientesTable
									ref={clientesTableRef}
									clients={combinedClients}
									onEditClient={handleEditClient}
									onDeleteClient={handleDeleteClient}
									onFiltersActiveChange={setFiltersActive}
								/>
				)}
			</div>

					{/* Paginación basada en API/hook */}
					{pagination.totalPages > 1 && (
				<div className="px-6 py-4 border-t border-gray-200 dark:border-gray-600">
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
									.filter(page =>
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

			{/* Modal de creación/edición */}
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

			{/* Modal de confirmación de eliminación */}
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
		</div>
	);
}

export default ClientesPage;
