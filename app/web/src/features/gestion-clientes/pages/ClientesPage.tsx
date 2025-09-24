import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ClienteForm from '../components/ClienteForm';
import ClientesFilters from '../components/ClientesFilters';
import ClientesTable from '../components/ClientesTable';

const PRIMARY_COLOR = '#0040A2';

const initialClients = [
	{
		id: 1,
		name: 'PLUSMEDIA S.A.C.',
		document: 'RUC 20608822658',
		type: 'Cliente',
		address: 'AV. HÉROES NRO. 280 - LIMA LIMA SAN JUAN DE MIRAFLORES',
		phone: '956 488 989',
		enabled: true,
	},
	{
		id: 2,
		name: 'José Luis Márquez',
		document: 'DNI 76274488',
		type: 'Cliente',
		address: 'Av. Huaylas 66 Mz A, Lote 09',
		phone: '988 488 911',
		enabled: true,
	},
	{
		id: 3,
		name: 'EXPORTACIONES Y MAYORISTAS SERVICE E.I.R.L.',
		document: 'RUC 20668960582',
		type: 'Cliente',
		address: 'AV. DEFENSORES NRO. 311 - LIMA LIMA SAN JUAN DE LURIGANCHO',
		phone: '962 658 244',
		enabled: true,
	},
	{
		id: 4,
		name: 'ESTUDIO FUERA DE FOCO E.I.R.L.',
		document: 'RUC 20882265860',
		type: 'Cliente',
		address: 'JR. DE LA REPÚBLICA - LIMA LIMA ATE',
		phone: '989 962 359',
		enabled: true,
	},
	{
		id: 5,
		name: 'SERVICIOS MÚLTIPLES S.A.',
		document: 'RUC 20442233852',
		type: 'Cliente',
		address: 'AV. GUILLERMO PRESCOTT S/N - TACNA TACNA ZOFRATACNA',
		phone: '956 989 488',
		enabled: true,
	},
	{
		id: 6,
		name: 'Mariano Portal Campos',
		document: 'DNI 77448822',
		type: 'Cliente',
		address: 'Av. Faucett Mz A5, Lote 20',
		phone: '940 760 842',
		enabled: true,
	},
	{
		id: 7,
		name: 'INVERSIONES DEL NORTE S.A.C.',
		document: 'RUC 20567891234',
		type: 'Cliente',
		address: 'AV. PRINCIPAL 123 - TRUJILLO LA LIBERTAD',
		phone: '987 654 321',
		enabled: true,
	},
	{
		id: 8,
		name: 'COMERCIALIZADORA SUR S.A.',
		document: 'RUC 20456789123',
		type: 'Cliente',
		address: 'JR. LOS OLIVOS 456 - AREQUIPA AREQUIPA',
		phone: '986 123 456',
		enabled: true,
	},
	{
		id: 9,
		name: 'FERRETERÍA EL MARTILLO',
		document: 'RUC 20345678912',
		type: 'Cliente',
		address: 'AV. INDUSTRIAL 789 - CHICLAYO LAMBAYEQUE',
		phone: '985 321 654',
		enabled: true,
	},
	{
		id: 10,
		name: 'TRANSPORTES DEL SUR E.I.R.L.',
		document: 'RUC 20234567891',
		type: 'Cliente',
		address: 'AV. PANAMERICANA SUR KM 20 - LIMA LIMA',
		phone: '984 456 789',
		enabled: true,
	},
	{
		id: 11,
		name: 'CONSORCIO EDUCATIVO S.A.C.',
		document: 'RUC 20123456789',
		type: 'Cliente',
		address: 'AV. UNIVERSITARIA 321 - LIMA LIMA',
		phone: '983 789 123',
		enabled: true,
	},
	{
		id: 12,
		name: 'DNI Ejemplo',
		document: 'DNI 12345678',
		type: 'Cliente',
		address: 'Calle Ficticia 99 - LIMA LIMA',
		phone: '982 111 222',
		enabled: true,
	},
];

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
	const [clients, setClients] = useState(initialClients);
	const [showClientModal, setShowClientModal] = useState(false);
	const [formData, setFormData] = useState({
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
	const [searchFilters, setSearchFilters] = useState({
		name: '',
		document: '',
		type: '',
		address: '',
		phone: '',
	});

	const filteredClients = clients.filter(client =>
		client.name.toLowerCase().includes(searchFilters.name.toLowerCase()) &&
		client.document.toLowerCase().includes(searchFilters.document.toLowerCase()) &&
		client.type.toLowerCase().includes(searchFilters.type.toLowerCase()) &&
		client.address.toLowerCase().includes(searchFilters.address.toLowerCase()) &&
		client.phone.includes(searchFilters.phone)
	);

	const handleCreateClient = () => {
		// Validaciones básicas
		if (!formData.legalName.trim()) {
			alert('El nombre/razón social es obligatorio');
			return;
		}

		if (documentType !== 'SIN_DOCUMENTO' && !formData.documentNumber.trim()) {
			alert('El número de documento es obligatorio');
			return;
		}

		// Validaciones específicas por tipo de documento
		if (documentType === 'RUC' && formData.documentNumber.length !== 11) {
			alert('El RUC debe tener exactamente 11 dígitos');
			return;
		}

		if (documentType === 'DNI' && formData.documentNumber.length !== 8) {
			alert('El DNI debe tener exactamente 8 dígitos');
			return;
		}

		if (documentType === 'PASAPORTE' && formData.documentNumber.length < 6) {
			alert('El Pasaporte debe tener al menos 6 caracteres');
			return;
		}

		if (documentType === 'CARNET_EXTRANJERIA' && formData.documentNumber.length < 9) {
			alert('El Carnet de Extranjería debe tener al menos 9 caracteres');
			return;
		}

		// Verificar si ya existe un cliente con el mismo documento
		const existingClient = clients.find(client => 
			client.document.includes(formData.documentNumber) && 
			formData.documentNumber.trim() !== ''
		);

		if (existingClient) {
			alert('Ya existe un cliente con este número de documento');
			return;
		}

		const newId = Math.max(...clients.map(c => c.id)) + 1;
		const clientToAdd = {
			id: newId,
			name: formData.legalName.trim(),
			document: documentType !== 'SIN_DOCUMENTO' ? `${documentType} ${formData.documentNumber.trim()}` : 'Sin documento',
			type: clientType,
			address: formData.address.trim() || 'Sin dirección',
			phone: formData.phone.trim() || 'Sin teléfono',
			enabled: true,
		};
		
		setClients(prev => [clientToAdd, ...prev]);
		
		// Limpiar filtros para asegurar que el nuevo cliente sea visible
		setSearchFilters({
			name: '',
			document: '',
			type: '',
			address: '',
			phone: '',
		});
		
		resetForm();
		setShowClientModal(false);
		
		// Log para debug
		console.log('Cliente creado:', clientToAdd);
		console.log('Total de clientes:', clients.length + 1);
		
		// Mostrar mensaje de éxito
		alert(`Cliente "${clientToAdd.name}" creado exitosamente`);
	};

	const handleCancelClient = () => {
		resetForm();
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
	};

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
				<div className="flex items-center">
					<button className="mr-4 p-2 hover:bg-gray-100 rounded-md transition-colors">
						<span className="text-gray-600">←</span>
					</button>
					<div>
						<h1 className="text-xl font-semibold text-gray-800">Clientes</h1>
						<p className="text-sm text-gray-500">Total: {clients.length} | Mostrando: {filteredClients.length}</p>
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
						className="px-6 py-2 text-blue-700 border border-blue-700 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors"
					>
						Importar clientes
					</button>
					<button
						title="Exporta lista de clientes"
						onClick={() => alert('Funcionalidad de exportar clientes próximamente')}
						className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
						style={{ minWidth: 40, minHeight: 40 }}
					>
						<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
							<path strokeLinecap="round" strokeLinejoin="round" d="M7 10l5 5 5-5" />
							<path strokeLinecap="round" strokeLinejoin="round" d="M12 15V3" />
						</svg>
					</button>
				</div>
			</div>

			{/* Filtros */}
			<div className="px-6 pt-4">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-sm font-medium text-gray-700">Filtros</h3>
					<button
						onClick={() => setSearchFilters({ name: '', document: '', type: '', address: '', phone: '' })}
						className="text-sm text-blue-600 hover:text-blue-800 font-medium"
					>
						Limpiar filtros
					</button>
				</div>
				<ClientesFilters
					filters={searchFilters}
					onChange={(field, value) => setSearchFilters(prev => ({ ...prev, [field]: value }))}
				/>
			</div>

			{/* Tabla */}
			<div className="flex-1 px-6 py-4 overflow-auto">
				<ClientesTable clients={filteredClients} />
			</div>

			{/* Modal */}
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
