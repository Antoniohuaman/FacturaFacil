	import type { PointerEventHandler, ReactNode } from 'react';
	import { useMemo } from 'react';
	import { SplitHandle } from './SplitHandle';
	import { useResizablePane } from './useResizablePane';

	type MasterDetailLayoutProps = {
		isOpen: boolean;
		onOpenChange?: (open: boolean) => void;
		detailWidth?: number;
		defaultDetailWidth?: number;
		minDetailWidth?: number;
		maxDetailWidth?: number;
		master: ReactNode;
		detail: ReactNode;
		className?: string;
		masterClassName?: string;
		detailClassName?: string;
	};

	const combine = (...classes: Array<string | undefined>): string => classes.filter(Boolean).join(' ');

	const DEFAULT_WIDTH = 420;
	const DEFAULT_MIN = 320;
	const DEFAULT_MAX = 720;

	const noopPointerHandler: PointerEventHandler<HTMLDivElement> = () => {};

	export function MasterDetailLayout({
		isOpen,
		onOpenChange: _onOpenChange,
		detailWidth,
		defaultDetailWidth,
		minDetailWidth,
		maxDetailWidth,
		master,
		detail,
		className,
		masterClassName,
		detailClassName,
	}: MasterDetailLayoutProps) {
		void _onOpenChange;
		const resolvedDefault = defaultDetailWidth ?? DEFAULT_WIDTH;
		const resolvedMin = minDetailWidth ?? DEFAULT_MIN;
		const resolvedMax = maxDetailWidth ?? DEFAULT_MAX;

		const clampWidth = useMemo(
			() => (value: number) => Math.min(resolvedMax, Math.max(resolvedMin, value)),
			[resolvedMax, resolvedMin],
		);

		const pane = useResizablePane({
			defaultWidth: resolvedDefault,
			minWidth: resolvedMin,
			maxWidth: resolvedMax,
			isEnabled: isOpen && detailWidth === undefined,
		});

		const effectiveWidth = detailWidth === undefined ? pane.width : clampWidth(detailWidth);
		const handlePointerDown = detailWidth === undefined ? pane.handlePointerDown : noopPointerHandler;

		return (
			<div className={combine('flex h-full min-h-0 w-full overflow-hidden', className)}>
				<div className={combine('flex-1 min-w-0', masterClassName)}>{master}</div>

				{isOpen && (
					<>
						<SplitHandle
							onPointerDown={handlePointerDown}
							ariaValueNow={Math.round(effectiveWidth)}
							ariaValueMin={resolvedMin}
							ariaValueMax={resolvedMax}
						/>
						<div
							className={combine(
								'flex min-w-0 flex-shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-900',
								detailClassName,
							)}
							style={{ width: effectiveWidth }}
						>
							{detail}
						</div>
					</>
				)}

			</div>
		);
	}
    