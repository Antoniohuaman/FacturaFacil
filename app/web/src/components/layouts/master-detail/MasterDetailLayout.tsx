import type { PointerEventHandler, ReactNode } from 'react';
import { isValidElement, useCallback, useEffect, useMemo, useState } from 'react';
import { DetailPane } from './DetailPane';
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
		overlayBreakpoint?: number;
		closeOnBackdrop?: boolean;
		storageKey?: string;
	};

	const combine = (...classes: Array<string | undefined>): string => classes.filter(Boolean).join(' ');

	const DEFAULT_WIDTH = 420;
	const DEFAULT_MIN = 320;
	const DEFAULT_MAX = 720;
	const DEFAULT_OVERLAY_BREAKPOINT = 1280;
	const STORAGE_KEY_PREFIX = 'master-detail-width';

	const noopPointerHandler: PointerEventHandler<HTMLDivElement> = () => {};

	export function MasterDetailLayout({
		isOpen,
		onOpenChange,
		detailWidth,
		defaultDetailWidth,
		minDetailWidth,
		maxDetailWidth,
		master,
		detail,
		className,
		masterClassName,
		detailClassName,
		overlayBreakpoint = DEFAULT_OVERLAY_BREAKPOINT,
		closeOnBackdrop = true,
		storageKey,
	}: MasterDetailLayoutProps) {
		const resolvedDefault = defaultDetailWidth ?? DEFAULT_WIDTH;
		const resolvedMin = minDetailWidth ?? DEFAULT_MIN;
		const resolvedMax = maxDetailWidth ?? DEFAULT_MAX;
		const viewportWidth = useViewportWidth();
		const isOverlayMode = viewportWidth !== null && viewportWidth < overlayBreakpoint;
		const shouldControlWidth = detailWidth === undefined;
		const resolvedStorageKey = shouldControlWidth
			? storageKey ?? buildStorageKey(className, detailClassName)
			: undefined;

		const clampWidth = useMemo(
			() => (value: number) => Math.min(resolvedMax, Math.max(resolvedMin, value)),
			[resolvedMax, resolvedMin],
		);

		const pane = useResizablePane({
			defaultWidth: resolvedDefault,
			minWidth: resolvedMin,
			maxWidth: resolvedMax,
			isEnabled: isOpen && shouldControlWidth && !isOverlayMode,
			storageKey: resolvedStorageKey,
		});

		const effectiveWidth = shouldControlWidth ? pane.width : clampWidth(detailWidth);
		const handlePointerDown = shouldControlWidth && !isOverlayMode ? pane.handlePointerDown : noopPointerHandler;
		const overlayWidth = viewportWidth ? Math.min(effectiveWidth, viewportWidth) : effectiveWidth;
		const shouldRenderDesktopDetail = isOpen && !isOverlayMode;
		const shouldRenderOverlay = isOpen && isOverlayMode;
		const detailIsDetailPane = isValidElement(detail) && detail.type === DetailPane;
		const borderClasses = !detailIsDetailPane ? 'border-l border-slate-200 dark:border-slate-700' : undefined;
		const detailWrapperClasses = combine(
			'flex h-full min-w-0 flex-shrink-0 flex-col overflow-hidden bg-white dark:bg-gray-900',
			borderClasses,
			detailClassName,
		);
		const backdropCanClose = closeOnBackdrop && Boolean(onOpenChange);

		const handleBackdropClick = useCallback(() => {
			if (backdropCanClose && onOpenChange) {
				onOpenChange(false);
			}
		}, [backdropCanClose, onOpenChange]);

		useEffect(() => {
			if (!isOpen || !onOpenChange || typeof window === 'undefined') {
				return;
			}

			const handleKeyDown = (event: KeyboardEvent) => {
				if (event.key === 'Escape') {
					onOpenChange(false);
				}
			};

			window.addEventListener('keydown', handleKeyDown);
			return () => {
				window.removeEventListener('keydown', handleKeyDown);
			};
		}, [isOpen, onOpenChange]);

		return (
			<div className={combine('flex h-full min-h-0 w-full overflow-hidden', className)}>
				<div className={combine('flex-1 min-w-0', masterClassName)}>{master}</div>

				{shouldRenderDesktopDetail && (
					<>
						<SplitHandle
							onPointerDown={handlePointerDown}
							ariaValueNow={Math.round(effectiveWidth)}
							ariaValueMin={resolvedMin}
							ariaValueMax={resolvedMax}
						/>
						<div
							className={detailWrapperClasses}
							style={{ width: effectiveWidth }}
						>
							{detail}
						</div>
					</>
				)}

				{shouldRenderOverlay && (
					<div className="fixed inset-0 z-40 flex justify-end overflow-hidden">
						<div
							className={combine(
								'absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity',
								backdropCanClose ? 'cursor-pointer' : undefined,
							)}
							onClick={backdropCanClose ? handleBackdropClick : undefined}
							aria-hidden="true"
						/>
						<div className="relative z-10 flex h-full w-full justify-end">
							<div
								className={detailWrapperClasses}
								style={{ width: overlayWidth, maxWidth: '100%' }}
								role="dialog"
								aria-modal="true"
							>
								{detail}
							</div>
						</div>
					</div>
				)}
			</div>
		);
	}

function useViewportWidth(): number | null {
	const [width, setWidth] = useState<number | null>(null);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const handleResize = () => {
			setWidth(window.innerWidth);
		};

		handleResize();
		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	return width;
}

function buildStorageKey(className?: string, detailClassName?: string): string {
	const identifier = (className?.trim() || detailClassName?.trim() || 'default').replace(/\s+/g, '_');
	return `${STORAGE_KEY_PREFIX}:${identifier}`;
}
    