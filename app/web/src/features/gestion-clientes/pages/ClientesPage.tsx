/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as ExcelJS from 'exceljs';
import ClienteForm from '../components/ClienteForm';
import ClientesTable, { type ClientesTableRef } from '../components/ClientesTable';
import ClientesFilters from '../components/ClientesFilters';
import ConfirmationModal from '../../../../../shared/src/components/ConfirmationModal';
import { useClientes } from '../hooks';
import { useCaja } from '../../control-caja/context/CajaContext';
import type { Cliente, ClienteFormData, DocumentType, ClientType } from '../models';

const PRIMARY_COLOR = '#1478D4';

const documentTypes = [
	{ value: 'RUC', label: 'RUC' },
	{ value: 'DNI', label: 'DNI' },
	{ value: 'SIN_DOCUMENTO', label: 'SIN DOCUMENTO' },
	{ value: 'NO_DOMICILIADO', label: 'NO DOMICILIADO' },
	{ value: 'PASAPORTE', label: 'PASAPORTE' },
	{ value: 'CARNET_EXTRANJERIA', label: 'CARNET EXTRANJERÍA' },
	{ value: 'CARNET_IDENTIDAD', label: 'CARNET DE IDENTIDAD' },
	{ value: 'DOC_IDENTIF_PERS_NAT_NO_DOM', label: 'DOC.IDENTIF.PERS.NAT.NO DOM.' },
	{ value: 'TAM_TARJETA_ANDINA', label: 'TAM - TARJETA ANDINA DE MIGRACIÓN' },
	{ value: 'CARNET_PERMISO_TEMP_PERMANENCIA', label: 'CARNET PERMISO TEMP.PERMANENCIA' },
];

const clientTypes = [
	{ value: 'Cliente', label: 'Cliente' },
	{ value: 'Proveedor', label: 'Proveedor' },
];

function ClientesPage() {
	const navigate = useNavigate();
	const { showToast } = useCaja();
	const { clientes, loading, createCliente, updateCliente, deleteCliente, pagination, fetchClientes } = useClientes();

	const [showClientModal, setShowClientModal] = useState(false);
	const [editingClient, setEditingClient] = useState<Cliente | null>(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [clientToDelete, setClientToDelete] = useState<Cliente | null>(null);
	const clientesTableRef = useRef<ClientesTableRef>(null);

	const [formData, setFormData] = useState<ClienteFormData>({
		documentNumber: '',
		legalName: '',
		address: '',
		gender: '',
		phone: '',
		email: '',
		additionalData: '',
	});
	const [documentType, setDocumentType] = useState('RUC');
	const [clientType, setClientType] = useState('Cliente');

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
		if (!formData.legalName.trim()) {
			showToast('warning', 'Campo requerido', 'El nombre/razón social es obligatorio');
			return;
		}

		if (documentType !== 'SIN_DOCUMENTO' && !formData.documentNumber.trim()) {
			showToast('warning', 'Campo requerido', 'El número de documento es obligatorio');
			return;
		}

		if (documentType === 'RUC' && formData.documentNumber.length !== 11) {
			showToast('warning', 'RUC inválido', 'El RUC debe tener exactamente 11 dígitos');
			return;
		}

		if (documentType === 'DNI' && formData.documentNumber.length !== 8) {
			showToast('warning', 'DNI inválido', 'El DNI debe tener exactamente 8 dígitos');
			return;
		}

		if (documentType === 'PASAPORTE' && formData.documentNumber.length < 6) {
			showToast('warning', 'Pasaporte inválido', 'El Pasaporte debe tener al menos 6 caracteres');
			return;
		}

		if (documentType === 'CARNET_EXTRANJERIA' && formData.documentNumber.length < 9) {
			showToast('warning', 'Carnet inválido', 'El Carnet de Extranjería debe tener al menos 9 caracteres');
			return;
		}

		const result = await createCliente({
			documentType: documentType as DocumentType,
			documentNumber: formData.documentNumber.trim(),
			name: formData.legalName.trim(),
			type: clientType as ClientType,
			address: formData.address.trim() || undefined,
			phone: formData.phone.trim() || undefined,
			email: formData.email.trim() || undefined,
			gender: formData.gender || undefined,
			additionalData: formData.additionalData.trim() || undefined,
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

	const handleInputChange = (field: keyof ClienteFormData, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const handleDocumentTypeChange = (type: string) => {
		setDocumentType(type);
	};

	const handleClientTypeChange = (type: string) => {
		setClientType(type);
	};

	const resetForm = () => {
		setFormData({
			documentNumber: '',
			legalName: '',
			address: '',
			gender: '',
			phone: '',
			email: '',
			additionalData: '',
		});
		setDocumentType('RUC');
		setClientType('Cliente');
		setEditingClient(null);
	};

	const handleEditClient = (client: Cliente) => {
		let docType = 'SIN_DOCUMENTO';
		let docNumber = '';

		if (client.document === 'Sin documento') {
			docType = 'SIN_DOCUMENTO';
			docNumber = '';
		} else if (client.document && !client.document.includes(' ')) {
			docNumber = client.document;
			docType = 'SIN_DOCUMENTO';
		} else if (client.document && client.document.includes(' ')) {
			const documentParts = client.document.split(' ');
			docType = documentParts[0];
			docNumber = documentParts.slice(1).join(' ');
		}

		setEditingClient(client);
		setFormData({
			documentNumber: docNumber || '',
			legalName: client.name,
			address: client.address === 'Sin dirección' ? '' : client.address,
			gender: client.gender || '',
			phone: client.phone || '',
			email: client.email || '',
			additionalData: client.additionalData || '',
		});
		setDocumentType(docType);
		setClientType(client.type);
		setShowClientModal(true);
	};

	const handleDeleteClient = (client: Cliente) => {
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
		if (!formData.legalName.trim()) {
			showToast('warning', 'Campo requerido', 'El nombre/razón social es obligatorio');
			return;
		}

		if (documentType !== 'SIN_DOCUMENTO' && !formData.documentNumber.trim()) {
			showToast('warning', 'Campo requerido', 'El número de documento es obligatorio');
			return;
		}

		if (documentType === 'RUC' && formData.documentNumber.length !== 11) {
			showToast('warning', 'RUC inválido', 'El RUC debe tener exactamente 11 dígitos');
			return;
		}

		if (documentType === 'DNI' && formData.documentNumber.length !== 8) {
			showToast('warning', 'DNI inválido', 'El DNI debe tener exactamente 8 dígitos');
			return;
		}

		if (documentType === 'PASAPORTE' && formData.documentNumber.length < 6) {
			showToast('warning', 'Pasaporte inválido', 'El Pasaporte debe tener al menos 6 caracteres');
			return;
		}

		if (documentType === 'CARNET_EXTRANJERIA' && formData.documentNumber.length < 9) {
			showToast('warning', 'Carnet inválido', 'El Carnet de Extranjería debe tener al menos 9 caracteres');
			return;
		}

		if (!editingClient) return;

		const result = await updateCliente(editingClient.id, {
			documentType: documentType as DocumentType,
			documentNumber: formData.documentNumber.trim(),
			name: formData.legalName.trim(),
			type: clientType as ClientType,
			address: formData.address.trim() || undefined,
			phone: formData.phone.trim() || undefined,
			email: formData.email.trim() || undefined,
			gender: formData.gender || undefined,
			additionalData: formData.additionalData.trim() || undefined,
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
									clients={clientes}
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
										return `Mostrando ${start}-${end} de ${pagination.total} resultados`;
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
					<ClienteForm
						formData={formData}
						documentType={documentType}
						clientType={clientType}
						documentTypes={documentTypes}
						clientTypes={clientTypes}
						onInputChange={handleInputChange}
						onDocumentTypeChange={handleDocumentTypeChange}
						onClientTypeChange={handleClientTypeChange}
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
