import { useState } from 'react';
import ClienteForm from '../components/ClienteForm';
import ClientesFilters from '../components/ClientesFilters';
import ClientesTable from '../components/ClientesTable';

const PRIMARY_COLOR = '#0040A2';
// const PRIMARY_LIGHT = '#E6F0FF'; // Removed unused constant

const initialClients = [
	{
		id: 1,
		name: 'PLUSMEDIA S.A.C.',
		document: 'RUC 20608822658',
		type: 'Cliente',
		address: 'AV. HÉROES NRO. 280 - LIMA LIMA SAN JUAN DE MIRAFLORES',
		phone: '956 488 989',
		enabled: true
	},
	{
		id: 2,
		name: 'José Luis Márquez',
		document: 'DNI 76274488',
		type: 'Cliente',
		address: 'Av. Huaylas 66 Mz A, Lote 09',
		phone: '988 488 911',
		enabled: true
	},
	{
		id: 3,
		name: 'EXPORTACIONES Y MAYORISTAS SERVICE E.I.R.L.',
		document: 'RUC 20668960582',
		type: 'Cliente',
		address: 'AV. DEFENSORES NRO. 311 - LIMA LIMA SAN JUAN DE LURIGANCHO',
		phone: '962 658 244',
		enabled: true
	},
	{
		id: 4,
		name: 'ESTUDIO FUERA DE FOCO E.I.R.L.',
		document: 'RUC 20882265860',
		type: 'Cliente',
		address: 'JR. DE LA REPÚBLICA - LIMA LIMA ATE',
		phone: '989 962 359',
		enabled: true
	},
	{
		id: 5,
		name: 'SERVICIOS MÚLTIPLES S.A.',
		document: 'RUC 20442233852',
		type: 'Cliente',
		address: 'AV. GUILLERMO PRESCOTT S/N - TACNA TACNA ZOFRATACNA',
		phone: '956 989 488',
		enabled: true
	},
	{
		id: 6,
		name: 'Mariano Portal Campos',
		document: 'DNI 77448822',
		type: 'Cliente',
		address: 'Av. Faucett Mz A5, Lote 20',
		phone: '940 760 842',
		enabled: true
	}
];

const documentTypes = [
	{ value: 'RUC', label: 'RUC' },
	{ value: 'DNI', label: 'DNI' },
	{ value: 'SIN_DOCUMENTO', label: 'SIN DOCUMENTO' }
];

const clientTypes = [
	{ value: 'Cliente', label: 'Cliente' },
	{ value: 'Proveedor', label: 'Proveedor' }
];

function ClientesPage() {
	const [clients, setClients] = useState(initialClients);
	const [showClientModal, setShowClientModal] = useState(false);
	const [formData, setFormData] = useState({
		documentNumber: '',
		legalName: '',
		address: '',
		gender: '',
		phone: '',
		email: '',
		additionalData: ''
	});
	const [documentType, setDocumentType] = useState('RUC');
	const [clientType, setClientType] = useState('Cliente');
	const [searchFilters, setSearchFilters] = useState({
		name: '',
		document: '',
		type: '',
		address: '',
		phone: ''
	});
	const filteredClients = clients.filter(client => {
		return (
			client.name.toLowerCase().includes(searchFilters.name.toLowerCase()) &&
			client.document.toLowerCase().includes(searchFilters.document.toLowerCase()) &&
			client.type.toLowerCase().includes(searchFilters.type.toLowerCase()) &&
			client.address.toLowerCase().includes(searchFilters.address.toLowerCase()) &&
			client.phone.includes(searchFilters.phone)
		);
	});
	// ...existing code...

	const handleCreateClient = () => {
		const newId = Math.max(...clients.map(c => c.id)) + 1;
		const clientToAdd = {
			id: newId,
			name: formData.legalName || 'Cliente sin nombre',
			document: documentType !== 'SIN_DOCUMENTO' ? `${documentType} ${formData.documentNumber}` : 'Sin documento',
			type: clientType,
			address: formData.address || 'Sin dirección',
			phone: formData.phone || '',
			enabled: true
		};
		setClients(prev => [...prev, clientToAdd]);
		setFormData({
			documentNumber: '',
			legalName: '',
			address: '',
			gender: '',
			phone: '',
			email: '',
			additionalData: ''
		});
		setDocumentType('RUC');
		setClientType('Cliente');
		setShowClientModal(false);
	};

	const handleCancelClient = () => {
		setFormData({
			documentNumber: '',
			legalName: '',
			address: '',
			gender: '',
			phone: '',
			email: '',
			additionalData: ''
		});
		setDocumentType('RUC');
		setClientType('Cliente');
		setShowClientModal(false);
	};

	const handleInputChange = (field: keyof typeof formData, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};
	const handleDocumentTypeChange = (type: string) => {
		setDocumentType(type);
	};
	const handleClientTypeChange = (type: string) => {
		setClientType(type);
	};

	const handleFiltersChange = (field: keyof typeof searchFilters, value: string) => {
		setSearchFilters(prev => ({ ...prev, [field]: value }));
	};

	// Sin paginación

	return (
		<div className="h-full flex flex-col">
			{/* Header del módulo Clientes */}
			<div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
				<div className="flex items-center">
					<button className="mr-4 p-2 hover:bg-gray-100 rounded-md transition-colors">
						<span className="text-gray-600">←</span>
					</button>
					<h1 className="text-xl font-semibold text-gray-800">Clientes</h1>
				</div>
				<button 
					onClick={() => setShowClientModal(true)}
					style={{ backgroundColor: PRIMARY_COLOR }}
					className="px-6 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
				>
					Nuevo cliente
				</button>
			</div>

			{/* Filtros de búsqueda */}
			<div className="px-6 pt-4">
				<ClientesFilters filters={searchFilters} onChange={handleFiltersChange} />
			</div>

			{/* Tabla de clientes */}
			<div className="flex-1 px-6 py-4 overflow-auto">
				<ClientesTable clients={filteredClients} />
			</div>

			{/* Modal Nuevo Cliente */}
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
						onSave={handleCreateClient}
					/>
				</div>
			)}
		</div>
	);
}

export default ClientesPage;
