import { useState } from 'react';

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
	const [searchFilters] = useState({
		name: '',
		document: '',
		type: '',
		address: '',
		phone: ''
	});

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

	const filteredClients = clients.filter(client => {
		return (
			client.name.toLowerCase().includes(searchFilters.name.toLowerCase()) &&
			client.document.toLowerCase().includes(searchFilters.document.toLowerCase()) &&
			client.type.toLowerCase().includes(searchFilters.type.toLowerCase()) &&
			client.address.toLowerCase().includes(searchFilters.address.toLowerCase()) &&
			client.phone.includes(searchFilters.phone)
		);
	});

	return (
		<div className="h-full flex flex-col">
			{/* Header del módulo Clientes */}
			<div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
				<div className="flex items-center">
					<button className="mr-4 p-2 hover:bg-gray-100 rounded-md transition-colors">
						{/* Icono de retroceso, puedes importar ChevronLeft si lo tienes */}
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

			{/* Contenedor de la tabla con máximo ancho */}
			<div className="flex-1 px-6 py-4 overflow-auto">
				<div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ maxWidth: '1320px' }}>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-gray-50 border-b border-gray-200">
								<tr>
									<th className="text-left px-4 py-3 font-medium text-gray-700 text-sm">Nombre</th>
									<th className="text-left px-4 py-3 font-medium text-gray-700 text-sm">Documento</th>
									<th className="text-left px-4 py-3 font-medium text-gray-700 text-sm">Tipo</th>
									<th className="text-left px-4 py-3 font-medium text-gray-700 text-sm">Dirección</th>
									<th className="text-left px-4 py-3 font-medium text-gray-700 text-sm">Teléfono</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200">
								{filteredClients.map((client) => (
									<tr key={client.id} className={`hover:bg-gray-50 transition-colors ${!client.enabled ? 'opacity-50' : ''}`}>
										<td className="px-4 py-3">{client.name}</td>
										<td className="px-4 py-3">{client.document}</td>
										<td className="px-4 py-3">{client.type}</td>
										<td className="px-4 py-3">{client.address}</td>
										<td className="px-4 py-3">{client.phone}</td>
									</tr>
								))}
							</tbody>
						</table>
						{filteredClients.length === 0 && (
							<div className="text-center py-12">
								<p className="text-gray-500">No se encontraron clientes</p>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Modal Nuevo Cliente */}
			{showClientModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[80vh] h-auto min-h-[400px] overflow-hidden flex flex-col">
						{/* Header */}
						<div className="flex items-center justify-between p-6 pb-3 border-b border-gray-100">
							<h2 className="text-xl font-semibold text-gray-900">
								Nuevo cliente
							</h2>
							<button 
								onClick={handleCancelClient}
								className="p-2 hover:bg-gray-100 rounded-full transition-colors"
							>
								<span className="h-5 w-5 text-gray-400">✕</span>
							</button>
						</div>

						{/* Body */}
						<div className="px-6 pt-3 pb-4 overflow-y-auto flex-1 min-h-0" style={{ maxHeight: 'calc(80vh - 140px)' }}>
							{/* Document Type Selector */}
							<div className="mb-6">
								<div className="flex flex-wrap gap-2">
									{documentTypes.map((type) => (
										<button
											key={type.value}
											onClick={() => setDocumentType(type.value)}
											className={`px-4 py-2 rounded-lg border text-sm font-medium mr-2 mb-2 ${documentType === type.value ? 'bg-blue-100 border-blue-400 text-blue-900' : 'bg-white border-gray-300 text-gray-700'}`}
										>
											{type.label}
										</button>
									))}
								</div>
							</div>

							{/* Document Number - Only show if not "SIN DOCUMENTO" */}
							{documentType !== 'SIN_DOCUMENTO' && (
								<div className="mb-4">
									<label className="block text-sm font-medium text-gray-700 mb-1">
										N° de Documento
									</label>
									<input
										type="text"
										value={formData.documentNumber}
										onChange={(e) => handleInputChange('documentNumber', e.target.value)}
										className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										placeholder="Ingresa el número de documento"
									/>
								</div>
							)}

							{/* Legal Name */}
							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Nombre legal <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.legalName}
									onChange={(e) => handleInputChange('legalName', e.target.value)}
									className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									placeholder="Ingresa el nombre legal"
								/>
							</div>

							{/* Address */}
							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Dirección
								</label>
								<input
									type="text"
									value={formData.address}
									onChange={(e) => handleInputChange('address', e.target.value)}
									className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									placeholder="Ingresa la dirección"
								/>
							</div>

							{/* Client Type */}
							<div className="mb-5">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Tipo
								</label>
								<select
									value={clientType}
									onChange={(e) => setClientType(e.target.value)}
									className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
								>
									{clientTypes.map((type) => (
										<option key={type.value} value={type.value}>{type.label}</option>
									))}
								</select>
							</div>

							{/* Phone */}
							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Teléfono
								</label>
								<input
									type="text"
									value={formData.phone}
									onChange={(e) => handleInputChange('phone', e.target.value)}
									className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									placeholder="Ingresa el teléfono"
								/>
							</div>

							{/* Email */}
							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Email
								</label>
								<input
									type="email"
									value={formData.email}
									onChange={(e) => handleInputChange('email', e.target.value)}
									className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									placeholder="Ingresa el email"
								/>
							</div>

							{/* Additional Data */}
							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Información adicional
								</label>
								<textarea
									value={formData.additionalData}
									onChange={(e) => handleInputChange('additionalData', e.target.value)}
									rows={3}
									className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
									placeholder="Información adicional del cliente"
								/>
							</div>
						</div>

						{/* Footer */}
						<div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50">
							<button
								onClick={handleCancelClient}
								className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-full hover:bg-gray-200 hover:text-gray-800 transition-colors"
							>
								Cancelar
							</button>
							<button
								onClick={handleCreateClient}
								className="px-4 py-2 text-sm font-medium text-white border rounded-full hover:opacity-90 transition-opacity"
								style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
							>
								Guardar
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default ClientesPage;
