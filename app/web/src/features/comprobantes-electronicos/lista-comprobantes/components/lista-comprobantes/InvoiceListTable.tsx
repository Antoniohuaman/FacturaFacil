import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	AlertTriangle,
	Ban,
	CheckCircle2,
	Coins,
	Copy,
	Edit2,
	Eye,
	FileText,
	Link,
	MoreHorizontal,
	Printer,
	Search,
	Send,
	Share2,
	XCircle,
	XOctagon
} from 'lucide-react';
import type { ColumnConfig } from '../../types/columnConfig';
import type { Comprobante } from '../../contexts/ComprobantesListContext';

interface SelectionControls {
	isSelected: (id: string) => boolean;
	toggleSelection: (id: string, total: number) => void;
	toggleAll: (ids: string[], totals: number[]) => void;
}

interface InvoiceListTableProps {
	invoices: Comprobante[];
	visibleColumns: ColumnConfig[];
	density: 'comfortable' | 'intermediate' | 'compact';
	selection: SelectionControls;
	isLoading: boolean;
	hasActiveFilter: (columnKey: string) => boolean;
	onRequestFilter: (columnKey: string, position: { top: number; left: number }) => void;
	onViewDetails: (invoice: Comprobante) => void;
	onPrint: (invoice: Comprobante) => void;
	onShare: (invoice: Comprobante) => void;
	onDuplicate: (invoice: Comprobante) => void;
	onEdit: (invoice: Comprobante) => void;
	onVoid: (invoice: Comprobante) => void;
	onNavigateToDocuments: () => void;
	onGenerateCobranza?: (invoice: Comprobante) => void;
	canGenerateCobranza?: (invoice: Comprobante) => boolean;
	onCreateInvoice: () => void;
	hasDateFilter: boolean;
}

const STATUS_STYLES: Record<
	string,
	{ label: string; color: string; bgColor: string; Icon: typeof Send }
> = {
	sent: {
		label: 'Enviado',
		color: 'text-blue-800 dark:text-blue-200',
		bgColor: 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700',
		Icon: Send
	},
	accepted: {
		label: 'Aceptado',
		color: 'text-green-800 dark:text-green-200',
		bgColor: 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700',
		Icon: CheckCircle2
	},
	rejected: {
		label: 'Rechazado',
		color: 'text-red-800 dark:text-red-200',
		bgColor: 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700',
		Icon: XOctagon
	},
	fix: {
		label: 'Corregir',
		color: 'text-orange-800 dark:text-orange-200',
		bgColor: 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700',
		Icon: AlertTriangle
	},
	voided: {
		label: 'Anulado',
		color: 'text-gray-800 dark:text-gray-200',
		bgColor: 'bg-gray-100 dark:bg-gray-900/40 border-gray-300 dark:border-gray-700',
		Icon: Ban
	}
};

export const InvoiceListTable = ({
	invoices,
	visibleColumns,
	density,
	selection,
	isLoading,
	hasActiveFilter,
	onRequestFilter,
	onViewDetails,
	onPrint,
	onShare,
	onDuplicate,
	onEdit,
	onVoid,
	onNavigateToDocuments,
	onGenerateCobranza,
	canGenerateCobranza,
	onCreateInvoice,
	hasDateFilter
}: InvoiceListTableProps) => {
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);
	const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

	const filterableColumnMap = useMemo<Record<string, string>>(
		() => ({
			'N° Comprobante': 'id',
			Tipo: 'type',
			'N° Doc Cliente': 'clientDoc',
			Cliente: 'client',
			Vendedor: 'vendor'
		}),
		[]
	);

	const rowPadding = useMemo(() => {
		if (density === 'compact') return 'py-2';
		if (density === 'intermediate') return 'py-3';
		return 'py-4';
	}, [density]);

	const isFechaEmisionVisible = visibleColumns.some((column) => column.id === 'date');
	const isMonedaVisible = visibleColumns.some((column) => column.id === 'currency');

	const toggleMenu = (invoiceId: string | null, anchor?: DOMRect) => {
		if (!invoiceId || !anchor) {
			setOpenMenuId(null);
			setMenuPosition(null);
			return;
		}

		const sameMenu = openMenuId === invoiceId;
		setOpenMenuId(sameMenu ? null : invoiceId);
		setMenuPosition(
			sameMenu
				? null
				: {
						top: anchor.bottom + window.scrollY + 4,
						left: anchor.right + window.scrollX - 176
					}
		);
	};

	const renderStatusBadge = (status: string) => {
		const normalized = status?.toLowerCase() || 'sent';
		const config = STATUS_STYLES[normalized] || STATUS_STYLES.sent;
		const Icon = config.Icon;

		return (
			<span
				className={`inline-flex items-center border ${config.bgColor} ${config.color} focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
				style={{
					gap: '6px',
					height: '28px',
					padding: '0 12px',
					borderRadius: '9999px',
					fontWeight: 600,
					whiteSpace: 'nowrap',
					fontSize: '0.75rem'
				}}
				role="status"
				aria-label={`Estado: ${config.label}`}
				tabIndex={0}
			>
				<Icon className="w-3.5 h-3.5" />
				{config.label}
			</span>
		);
	};

	const SkeletonRow = () => (
		<tr className="animate-pulse">
			{visibleColumns.map((col) => (
				<td key={col.id} className="px-6 py-4">
					<div
						className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${
							col.key === 'id'
								? 'w-32'
								: col.key === 'client'
								? 'w-48'
								: col.key === 'total'
								? 'w-24 ml-auto'
								: col.key === 'status'
								? 'w-28 mx-auto'
								: 'w-32'
						}`}
					/>
				</td>
			))}
		</tr>
	);

	const handleMasterToggle = () => {
		const ids = invoices.map((inv) => inv.id);
		const totals = invoices.map((inv) => Number(inv.total) || 0);
		selection.toggleAll(ids, totals);
	};

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
			<div className="overflow-x-auto overflow-y-visible comprobantes-table-container" style={{ paddingBottom: '12px' }}>
				<table className="w-full">
					<thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
						<tr>
							<th className="px-2 py-3 sticky left-0 z-20 bg-gray-50 dark:bg-gray-700 w-[50px]">
								<input
									type="checkbox"
									checked={
										invoices.length > 0 && invoices.every((invoice) => selection.isSelected(invoice.id))
									}
									ref={(el) => {
										if (!el) return;
										const someSelected = invoices.some((invoice) => selection.isSelected(invoice.id));
										const allSelected =
											invoices.length > 0 && invoices.every((invoice) => selection.isSelected(invoice.id));
										el.indeterminate = someSelected && !allSelected;
									}}
									onChange={handleMasterToggle}
									className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
									aria-label="Seleccionar todos"
								/>
							</th>
							{visibleColumns.map((column) => {
								const isPinnedLeft = column.fixed === 'left';
								const isPinnedRight = column.fixed === 'right';
								const widthClass = column.width || '';
								const filterKey = filterableColumnMap[column.label];
								const alignment =
									column.align === 'right'
										? 'text-right'
										: column.align === 'center'
										? 'text-center'
										: 'text-left';

								return (
									<th
										key={column.id}
										className={`py-3 text-xs font-medium uppercase tracking-wider ${widthClass} ${alignment} text-gray-700 dark:text-gray-300 ${
											isPinnedLeft
												? 'sticky left-0 z-20 bg-gray-50 dark:bg-gray-700 shadow-[2px_0_4px_rgba(0,0,0,0.06)]'
												: isPinnedRight
												? 'sticky right-0 z-20 bg-gray-50 dark:bg-gray-700 shadow-[-2px_0_4px_rgba(0,0,0,0.06)]'
												: ''
										}`}
									>
										<div className="flex items-center justify-between space-x-2">
											<span>{column.label}</span>
											{filterKey && (
												<button
													type="button"
													onClick={(event) => {
														const rect = event.currentTarget.getBoundingClientRect();
														onRequestFilter(filterKey, {
															top: rect.bottom + window.scrollY,
															left: rect.left + window.scrollX
														});
													}}
													className={`transition-colors ${
														hasActiveFilter(filterKey) ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
													}`}
													aria-label={`Filtrar por ${column.label}`}
												>
													<Search className="w-4 h-4" />
												</button>
											)}
										</div>
									</th>
								);
							})}
						</tr>
					</thead>
					<tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
						{isLoading ? (
							<>
								<SkeletonRow />
								<SkeletonRow />
								<SkeletonRow />
								<SkeletonRow />
								<SkeletonRow />
							</>
						) : invoices.length === 0 ? (
							<tr>
								<td colSpan={Math.max(1, visibleColumns.length + 1)} className="px-6 py-12">
									<div className="flex flex-col items-center justify-center text-center">
										<FileText className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
										<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
											No se encontraron comprobantes
										</h3>
										<p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">
											{hasDateFilter
												? 'No hay comprobantes en el rango de fechas seleccionado. Intenta ajustar los filtros de fecha.'
												: 'Aún no se han emitido comprobantes. Comienza creando tu primer comprobante desde Punto de Venta o Emisión Tradicional.'}
										</p>
										<button
											onClick={onCreateInvoice}
											className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
										>
											Crear comprobante
										</button>
									</div>
								</td>
							</tr>
						) : (
							invoices.map((invoice) => (
								<tr
									data-focus={`comprobantes:${invoice.id}`}
									key={invoice.id}
									className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
										selection.isSelected(invoice.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
									}`}
								>
									<td className={`px-2 ${rowPadding} sticky left-0 z-10 bg-white dark:bg-gray-800 w-[50px]`}>
										<input
											type="checkbox"
											checked={selection.isSelected(invoice.id)}
											onChange={() => selection.toggleSelection(invoice.id, Number(invoice.total) || 0)}
											className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
											aria-label={`Seleccionar ${invoice.id}`}
										/>
									</td>
									{visibleColumns.map((column) => (
										<InvoiceCell
											key={column.id}
											column={column}
											invoice={invoice}
											rowPadding={rowPadding}
											isFechaEmisionVisible={isFechaEmisionVisible}
											isMonedaVisible={isMonedaVisible}
											onViewDetails={() => onViewDetails(invoice)}
											onPrint={() => onPrint(invoice)}
											onShare={() => onShare(invoice)}
											onDuplicate={() => onDuplicate(invoice)}
											onEdit={() => onEdit(invoice)}
											onVoid={() => onVoid(invoice)}
											onGenerateCobranza={() => onGenerateCobranza?.(invoice)}
											canGenerateCobranza={canGenerateCobranza?.(invoice) ?? false}
											onNavigateToDocuments={onNavigateToDocuments}
											openMenuId={openMenuId}
											menuPosition={menuPosition}
											toggleMenu={toggleMenu}
											renderStatusBadge={renderStatusBadge}
										/>
									))}
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};

interface InvoiceCellProps {
	column: ColumnConfig;
	invoice: Comprobante;
	rowPadding: string;
	isFechaEmisionVisible: boolean;
	isMonedaVisible: boolean;
	onViewDetails: () => void;
	onPrint: () => void;
	onShare: () => void;
	onDuplicate: () => void;
	onEdit: () => void;
	onVoid: () => void;
	onNavigateToDocuments: () => void;
	onGenerateCobranza?: () => void;
	canGenerateCobranza?: boolean;
	openMenuId: string | null;
	menuPosition: { top: number; left: number } | null;
	toggleMenu: (invoiceId: string | null, anchor?: DOMRect) => void;
	renderStatusBadge: (status: string) => ReactNode;
}

const InvoiceCell = ({
	column,
	invoice,
	rowPadding,
	isFechaEmisionVisible,
	isMonedaVisible,
	onViewDetails,
	onPrint,
	onShare,
	onDuplicate,
	onEdit,
	onVoid,
	onNavigateToDocuments,
	onGenerateCobranza,
	canGenerateCobranza,
	openMenuId,
	menuPosition,
	toggleMenu,
	renderStatusBadge
}: InvoiceCellProps) => {
	const isPinnedLeft = column.fixed === 'left';
	const isPinnedRight = column.fixed === 'right';
	const widthClass = column.width || '';
	const alignment =
		column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left';

	if (column.key === 'actions') {
		const showGenerateCobranza = Boolean(onGenerateCobranza && canGenerateCobranza);
		return (
			<td
				className={`px-4 ${rowPadding} whitespace-nowrap ${widthClass} ${
					isPinnedRight
						? 'sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-2px_0_4px_rgba(0,0,0,0.06)]'
						: ''
				}`}
			>
				<div className="flex items-center justify-center gap-1">
					<button
						onClick={onPrint}
						className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
						title="Imprimir"
						aria-label={`Imprimir comprobante ${invoice.id}`}
					>
						<Printer className="w-4 h-4" />
					</button>
					<div className="relative">
						<button
							onClick={(event) => toggleMenu(invoice.id, event.currentTarget.getBoundingClientRect())}
							className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
							title="Más acciones"
							aria-label={`Más acciones para comprobante ${invoice.id}`}
							aria-expanded={openMenuId === invoice.id}
							aria-haspopup="true"
						>
							<MoreHorizontal className="w-4 h-4" />
						</button>
						{openMenuId === invoice.id && menuPosition &&
							createPortal(
								<>
									<div className="fixed inset-0 z-40" onClick={() => toggleMenu(null)} />
									<div
										className="fixed w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50"
										style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
										role="menu"
										aria-orientation="vertical"
									>
										<MenuButton label="Ver detalles" icon={<Eye className="w-4 h-4 flex-shrink-0" />} onClick={onViewDetails} />
										<MenuButton label="Imprimir" icon={<Printer className="w-4 h-4 flex-shrink-0" />} onClick={onPrint} />
										<MenuButton label="Compartir" icon={<Share2 className="w-4 h-4 flex-shrink-0" />} onClick={onShare} />
										{showGenerateCobranza && (
											<MenuButton
												label="Generar cobranza"
												icon={<Coins className="w-4 h-4 flex-shrink-0" />}
												onClick={() => {
													toggleMenu(null);
													onGenerateCobranza?.();
												}}
											/>
										)}
										<MenuButton label="Duplicar" icon={<Copy className="w-4 h-4 flex-shrink-0" />} onClick={onDuplicate} />
										<MenuButton label="Editar" icon={<Edit2 className="w-4 h-4 flex-shrink-0" />} onClick={onEdit} variant="warning" />
										<div className="border-t border-gray-200 dark:border-gray-700 my-1" />
										<MenuButton label="Anular" icon={<XCircle className="w-4 h-4 flex-shrink-0" />} onClick={onVoid} variant="danger" />
									</div>
								</>,
								document.body
							)}
					</div>
				</div>
			</td>
		);
	}

	const invoiceRecord = invoice as unknown as Record<string, unknown>;
	const value = invoiceRecord[column.key];

	const asText = (input: unknown) => {
		if (input === undefined || input === null || input === '') {
			return '—';
		}
		return String(input);
	};

	let display: ReactNode;

	if (column.key === 'id') {
		display = (
			<div>
				<div className="font-medium text-gray-900 dark:text-white">{asText(value)}</div>
				{!isFechaEmisionVisible && invoice.date && (
					<div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
						📅 {invoice.date}
					</div>
				)}
				{invoice.relatedDocumentId && (
					<button
						onClick={onNavigateToDocuments}
						className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded-full w-fit mt-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer transition-colors"
						title={`Ver ${invoice.relatedDocumentType}: ${invoice.relatedDocumentId}`}
					>
						<Link className="w-3 h-3 text-blue-600 dark:text-blue-400" />
						<span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
							← {invoice.relatedDocumentId}
						</span>
					</button>
				)}
			</div>
		);
	} else if (column.key === 'client') {
		display = (
			<div className="max-w-[240px]">
				<div className="font-medium text-gray-900 dark:text-white truncate" title={asText(value)}>
					{asText(value)}
				</div>
				{invoice.clientDoc && (
					<div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{invoice.clientDoc}</div>
				)}
			</div>
		);
	} else if (column.key === 'total') {
		const currency = (invoice.currency || 'PEN').toUpperCase();
		const symbol = currency === 'USD' ? '$' : 'S/';
		const exchangeRate = invoice.exchangeRate;
		display = (
			<div className="text-right">
				<div className="font-bold text-gray-900 dark:text-white">
					{symbol} {Number(value || 0).toFixed(2)}
				</div>
				{!isMonedaVisible && currency !== 'PEN' && exchangeRate && (
					<div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">TC: {Number(exchangeRate).toFixed(3)}</div>
				)}
			</div>
		);
	} else if (column.key === 'status') {
		display = <div style={{ marginRight: '10px' }}>{renderStatusBadge(invoice.status || 'sent')}</div>;
	} else if (column.key === 'dueDate') {
		display = asText(value);
	} else if (column.truncate && value) {
		display = (
			<div className="truncate overflow-hidden text-ellipsis" title={String(value)} style={{ maxWidth: '100%' }}>
				{String(value)}
			</div>
		);
	} else {
		display = asText(value);
	}

	return (
		<td
			className={`${rowPadding} text-sm ${widthClass} ${alignment} ${
				column.key === 'total' || column.key === 'id' ? '' : 'text-gray-700 dark:text-gray-300'
			} ${column.key === 'status' ? 'whitespace-nowrap' : ''} ${
				isPinnedLeft
					? 'sticky left-0 z-10 bg-white dark:bg-gray-800 shadow-[2px_0_4px_rgba(0,0,0,0.06)]'
					: isPinnedRight
					? 'sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-2px_0_4px_rgba(0,0,0,0.06)]'
					: ''
			}`}
		>
			{display}
		</td>
	);
};

const MenuButton = ({
	label,
	icon,
	onClick,
	variant
}: {
	label: string;
	icon: ReactNode;
	onClick: () => void;
	variant?: 'default' | 'warning' | 'danger';
}) => {
	const baseClasses = 'w-full px-3 py-2 text-left text-sm flex items-center gap-2.5 focus:outline-none';
	const variantClasses =
		variant === 'danger'
			? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
			: variant === 'warning'
			? 'text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-gray-700 hover:text-amber-600'
			: 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600';

	return (
		<button onClick={onClick} className={`${baseClasses} ${variantClasses}`} role="menuitem">
			{icon}
			<span>{label}</span>
		</button>
	);
};
