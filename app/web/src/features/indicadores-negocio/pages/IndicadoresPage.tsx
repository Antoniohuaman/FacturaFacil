import { useState } from 'react';

// const PRIMARY_COLOR = '#0040A2'; // Eliminado porque no se usa

const establishments = [
	{ id: 'all', name: 'Todos los establecimientos' },
	{ id: 'store1', name: 'Tienda Centro' },
	{ id: 'store2', name: 'Tienda Norte' },
	{ id: 'store3', name: 'Tienda Sur' }
];

const salesData = {
	total: 485750.50,
	growth: 12.5,
	byDocument: {
		factura: 324500.25,
		boleta: 161250.25
	},
	documentsCount: 2847,
	avgTicket: 170.65,
	dailySales: [
		{ date: '2024-09-10', total: 15420, igv: 2775.60, documents: 92 },
		{ date: '2024-09-11', total: 18750, igv: 3375.00, documents: 108 },
		{ date: '2024-09-12', total: 22100, igv: 3978.00, documents: 127 },
		{ date: '2024-09-13', total: 19850, igv: 3573.00, documents: 115 },
		{ date: '2024-09-14', total: 25630, igv: 4613.40, documents: 148 }
	]
};

const sellers = [
	{ name: 'Ana García', sales: 125480.75, documents: 678, growth: 15.2 },
	{ name: 'Carlos López', sales: 98750.50, documents: 542, growth: 8.7 },
	{ name: 'María Rodríguez', sales: 87320.25, documents: 498, growth: -3.1 },
	{ name: 'José Martínez', sales: 76890.00, documents: 421, growth: 22.4 }
];

const topProducts = [
	{ name: 'Laptop HP Pavilion', quantity: 145, amount: 89750.50, growth: 18.5 },
	{ name: 'Mouse Inalámbrico', quantity: 320, amount: 12800.00, growth: 25.3 },
	{ name: 'Teclado Mecánico', quantity: 185, amount: 18500.75, growth: 12.1 },
	{ name: 'Monitor 24"', quantity: 98, amount: 35280.00, growth: -5.2 }
];

const topClients = [
	{ name: 'Empresa XYZ S.A.C.', amount: 45750.25, frequency: 28, growth: 32.1 },
	{ name: 'Comercial ABC E.I.R.L.', amount: 38920.50, frequency: 22, growth: 18.7 },
	{ name: 'Distribuidora 123', amount: 32150.75, frequency: 35, growth: 8.9 },
	{ name: 'Inversiones DEF', amount: 28480.00, frequency: 18, growth: -12.3 }
];

const storesSales = [
	{ name: 'Tienda Centro', sales: 198750.25, percentage: 40.9, growth: 15.2 },
	{ name: 'Tienda Norte', sales: 162420.15, percentage: 33.4, growth: 8.7 },
	{ name: 'Tienda Sur', sales: 124580.10, percentage: 25.7, growth: 22.1 }
];

function formatCurrency(amount: number) {
	return new Intl.NumberFormat('es-PE', {
		style: 'currency',
		currency: 'PEN'
	}).format(amount);
}

function IndicadoresPage() {
	const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-12-31' });
	const [selectedEstablishment, setSelectedEstablishment] = useState('all');
	const [showDetailedView, setShowDetailedView] = useState(false);

	return (
		<div className="flex-1 p-6 overflow-auto">
			{/* Filtros */}
			<div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
				<div className="flex items-center space-x-6">
					<div className="flex items-center space-x-3">
						<div className="p-2 bg-gray-100 rounded-lg">
							{/* Icono de calendario */}
							<span role="img" aria-label="calendar">📅</span>
						</div>
						<div className="flex items-center space-x-2">
							<input
								type="date"
								value={dateRange.start}
								onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
								className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
							<span className="text-gray-400">→</span>
							<input
								type="date"
								value={dateRange.end}
								onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
								className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>
					</div>
					<div className="flex items-center space-x-3">
						<div className="p-2 bg-gray-100 rounded-lg">
							{/* Icono de tienda */}
							<span role="img" aria-label="store">🏬</span>
						</div>
						<select
							value={selectedEstablishment}
							onChange={(e) => setSelectedEstablishment(e.target.value)}
							className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
						>
							{establishments.map(est => (
								<option key={est.id} value={est.id}>{est.name}</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{/* Métricas principales */}
			<div className="grid grid-cols-4 gap-6 mb-8">
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<p className="text-sm font-medium text-gray-600 mb-1">Total de Ventas</p>
					<p className="text-2xl font-bold text-gray-900">{formatCurrency(salesData.total)}</p>
					<p className="text-xs text-gray-500 mt-1">Período: {dateRange.start} - {dateRange.end}</p>
					<p className="text-sm text-green-600 mt-2">{salesData.growth > 0 ? '+' : ''}{salesData.growth}% vs anterior</p>
				</div>
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<p className="text-sm font-medium text-gray-600 mb-1">Comprobantes Emitidos</p>
					<p className="text-2xl font-bold text-gray-900">{salesData.documentsCount.toLocaleString()}</p>
					<p className="text-sm text-blue-600 mt-2">+8.3% vs anterior</p>
				</div>
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<p className="text-sm font-medium text-gray-600 mb-1">Ticket Promedio</p>
					<p className="text-2xl font-bold text-gray-900">{formatCurrency(salesData.avgTicket)}</p>
					<p className="text-sm text-blue-600 mt-2">+5.7% vs anterior</p>
				</div>
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<p className="text-sm font-medium text-gray-600 mb-1">Establecimientos Activos</p>
					<p className="text-2xl font-bold text-gray-900">3</p>
				</div>
			</div>

			{/* Ventas por comprobante y establecimiento */}
			<div className="grid grid-cols-2 gap-6 mb-8">
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-6">Ventas por Tipo de Comprobante</h3>
					<div className="space-y-4">
						<div className="bg-blue-50 rounded-xl p-4">
							<p className="font-semibold text-blue-900">Facturas</p>
							<p className="text-sm text-blue-700">66.8% del total</p>
							<p className="text-xl font-bold text-blue-900">{formatCurrency(salesData.byDocument.factura)}</p>
						</div>
						<div className="bg-gray-50 rounded-xl p-4">
							<p className="font-semibold text-gray-700">Boletas</p>
							<p className="text-sm text-gray-600">33.2% del total</p>
							<p className="text-xl font-bold text-gray-700">{formatCurrency(salesData.byDocument.boleta)}</p>
						</div>
					</div>
				</div>
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-6">Ventas por Establecimiento</h3>
					<div className="space-y-2">
						{storesSales.map((store, index) => (
							<div key={index} className="p-3 rounded-lg">
								<div className="flex items-center justify-between mb-1.5">
									<span className="font-semibold text-gray-900">{store.name}</span>
									<span className="font-bold text-gray-900 text-sm">{formatCurrency(store.sales)}</span>
								</div>
								<div className="w-full bg-gray-200 rounded-full h-2 mb-1.5 overflow-hidden">
									<div 
										className={`h-2 rounded-full ${index === 0 ? 'bg-blue-600' : index === 1 ? 'bg-gray-400' : 'bg-gray-500'}`}
										style={{ width: `${store.percentage}%` }}
									></div>
								</div>
								<div className="flex items-center justify-between">
									<p className="text-xs text-gray-500">{store.percentage}% del total</p>
									<p className="text-sm font-bold text-gray-900">{store.growth > 0 ? '+' : ''}{store.growth}%</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Rankings */}
			<div className="grid grid-cols-3 gap-6 mb-8">
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">Top Vendedores</h3>
					<ul>
						{sellers.map((seller, idx) => (
							<li key={idx} className="flex justify-between items-center py-2 border-b last:border-b-0">
								<span>{seller.name}</span>
								<span>{formatCurrency(seller.sales)}</span>
								<span className={seller.growth > 0 ? 'text-green-600' : 'text-red-500'}>{seller.growth > 0 ? '+' : ''}{seller.growth}%</span>
							</li>
						))}
					</ul>
				</div>
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">Productos Más Vendidos</h3>
					<ul>
						{topProducts.map((product, idx) => (
							<li key={idx} className="flex justify-between items-center py-2 border-b last:border-b-0">
								<span>{product.name}</span>
								<span>{product.quantity} unidades</span>
								<span>{formatCurrency(product.amount)}</span>
								<span className={product.growth > 0 ? 'text-green-600' : 'text-red-500'}>{product.growth > 0 ? '+' : ''}{product.growth}%</span>
							</li>
						))}
					</ul>
				</div>
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">Clientes Principales</h3>
					<ul>
						{topClients.map((client, idx) => (
							<li key={idx} className="flex justify-between items-center py-2 border-b last:border-b-0">
								<span>{client.name}</span>
								<span>{formatCurrency(client.amount)}</span>
								<span>{client.frequency} compras</span>
								<span className={client.growth > 0 ? 'text-green-600' : 'text-red-500'}>{client.growth > 0 ? '+' : ''}{client.growth}%</span>
							</li>
						))}
					</ul>
				</div>
			</div>

			{/* Detalle de ventas diarias */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				<div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-semibold text-gray-900">Detalle de Ventas Diarias</h3>
						<button 
							onClick={() => setShowDetailedView(!showDetailedView)}
							className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
						>
							{showDetailedView ? 'Ver menos detalles ←' : 'Ver más detalles →'}
						</button>
					</div>
				</div>
				{showDetailedView && (
					<div className="px-6 py-4 bg-blue-50 border-b border-gray-100">
						<div className="grid grid-cols-4 gap-4 text-center">
							<div>
								<p className="text-lg font-bold text-blue-900">
									{formatCurrency(salesData.dailySales.reduce((sum, day) => sum + day.total, 0))}
								</p>
								<p className="text-xs text-blue-700">Total del período</p>
							</div>
							<div>
								<p className="text-lg font-bold text-green-600">
									{formatCurrency(Math.max(...salesData.dailySales.map(d => d.total)))}
								</p>
								<p className="text-xs text-green-600">Día más alto</p>
							</div>
							<div>
								<p className="text-lg font-bold text-gray-600">
									{formatCurrency(salesData.dailySales.reduce((sum, day) => sum + day.total, 0) / salesData.dailySales.length)}
								</p>
								<p className="text-xs text-gray-600">Promedio diario</p>
							</div>
							<div>
								<p className="text-lg font-bold text-blue-600">
									{salesData.dailySales.reduce((sum, day) => sum + day.documents, 0)}
								</p>
								<p className="text-xs text-blue-600">Total documentos</p>
							</div>
						</div>
					</div>
				)}
				<div className="overflow-x-auto">
					<table className="min-w-full">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
								<th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Ventas</th>
								<th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">IGV</th>
								<th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">N° Comprobantes</th>
								<th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ticket Promedio</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{salesData.dailySales.map((day, index) => (
								<tr key={index} className="hover:bg-gray-50 transition-colors">
									<td className="px-6 py-4 whitespace-nowrap">{day.date}</td>
									<td className="px-6 py-4 whitespace-nowrap">{formatCurrency(day.total)}</td>
									<td className="px-6 py-4 whitespace-nowrap text-gray-600">{formatCurrency(day.igv)}</td>
									<td className="px-6 py-4 whitespace-nowrap">{day.documents}</td>
									<td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{formatCurrency(day.total / day.documents)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

export default IndicadoresPage;
