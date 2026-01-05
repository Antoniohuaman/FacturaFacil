import type { ReactNode } from 'react';

type DetailPaneProps = {
	title?: ReactNode;
	subtitle?: ReactNode;
	actions?: ReactNode;
	onClose?: () => void;
	children: ReactNode;
	className?: string;
};

const combine = (...classes: Array<string | undefined>): string => classes.filter(Boolean).join(' ');

export function DetailPane({
	title,
	subtitle,
	actions,
	onClose,
	children,
	className,
}: DetailPaneProps) {
	const showHeader = Boolean(title || subtitle || actions || onClose);

	return (
		<div
			className={combine(
				'flex h-full min-w-0 flex-col border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-900',
				className,
			)}
		>
			{showHeader && (
				<div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
					<div className="min-w-0">
						{title && <div className="truncate font-medium text-slate-900 dark:text-slate-100">{title}</div>}
						{subtitle && (
							<div className="truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</div>
						)}
					</div>
					<div className="flex items-center gap-2">
						{actions}
						{onClose && (
							<button
								type="button"
								onClick={onClose}
								className="rounded p-1 text-base leading-none text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800"
								aria-label="Cerrar panel de detalle"
							>
								×
							</button>
						)}
					</div>
				</div>
			)}
			<div className="flex-1 overflow-auto px-4 py-4 text-sm text-slate-700 dark:text-slate-200">{children}</div>
		</div>
	);
}
