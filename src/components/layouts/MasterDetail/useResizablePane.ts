import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

type UseResizablePaneOptions = {
	defaultWidth: number;
	minWidth: number;
	maxWidth: number;
	isEnabled?: boolean;
	onWidthChange?: (width: number) => void;
	storageKey?: string;
};

type UseResizablePaneResult = {
	width: number;
	setWidth: (width: number) => void;
	handlePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
	isDragging: boolean;
};

export function useResizablePane(options: UseResizablePaneOptions): UseResizablePaneResult {
	const {
		defaultWidth,
		minWidth,
		maxWidth,
		isEnabled = true,
		onWidthChange,
		storageKey,
	} = options;

	const clampWidth = useMemo(() => {
		const safeMin = Math.min(minWidth, maxWidth);
		const safeMax = Math.max(minWidth, maxWidth);
		return (value: number) => Math.min(safeMax, Math.max(safeMin, value));
	}, [minWidth, maxWidth]);

	const [width, setWidthState] = useState(() => {
		const storedWidth = readStoredWidthValue(storageKey, clampWidth);
		return storedWidth ?? clampWidth(defaultWidth);
	});
	const [isDragging, setIsDragging] = useState(false);

	const dragDataRef = useRef<{ startX: number; startWidth: number } | null>(null);
	const frameRef = useRef<number | null>(null);
	const moveHandlerRef = useRef<((event: PointerEvent) => void) | undefined>(undefined);
	const upHandlerRef = useRef<((event: PointerEvent) => void) | undefined>(undefined);
	const cancelHandlerRef = useRef<((event: PointerEvent) => void) | undefined>(undefined);
	const bodySelectRef = useRef<string>('');

	const updateWidth = useCallback(
		(nextWidth: number) => {
			const clamped = clampWidth(nextWidth);
			setWidthState((prev) => {
				if (prev === clamped) {
					return prev;
				}
				return clamped;
			});
			onWidthChange?.(clamped);
		},
		[clampWidth, onWidthChange],
	);

	const setWidth = useCallback(
		(value: number) => {
			updateWidth(value);
		},
		[updateWidth],
	);

	useEffect(() => {
		const storedWidth = readStoredWidthValue(storageKey, clampWidth);
		if (storedWidth !== null) {
			updateWidth(storedWidth);
			return;
		}
		updateWidth(defaultWidth);
	}, [clampWidth, defaultWidth, storageKey, updateWidth]);

	useEffect(() => () => {
		if (frameRef.current) {
			cancelAnimationFrame(frameRef.current);
			frameRef.current = null;
		}
		if (typeof window !== 'undefined') {
			if (moveHandlerRef.current) {
				window.removeEventListener('pointermove', moveHandlerRef.current);
			}
			if (upHandlerRef.current) {
				window.removeEventListener('pointerup', upHandlerRef.current);
			}
			if (cancelHandlerRef.current) {
				window.removeEventListener('pointercancel', cancelHandlerRef.current);
			}
		}
		if (typeof document !== 'undefined' && bodySelectRef.current) {
			document.body.style.userSelect = bodySelectRef.current;
			bodySelectRef.current = '';
		}
	}, []);

	useEffect(() => {
		if (!storageKey || typeof window === 'undefined') {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			try {
				window.localStorage.setItem(storageKey, String(clampWidth(width)));
			} catch {
				// ignore write failures (private mode, quota, etc.)
			}
		}, 120);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [clampWidth, storageKey, width]);

	const stopDragging = useCallback(() => {
		dragDataRef.current = null;
		setIsDragging(false);
		if (frameRef.current) {
			cancelAnimationFrame(frameRef.current);
			frameRef.current = null;
		}
		if (typeof window !== 'undefined') {
			if (moveHandlerRef.current) {
				window.removeEventListener('pointermove', moveHandlerRef.current);
				moveHandlerRef.current = undefined;
			}
			if (upHandlerRef.current) {
				window.removeEventListener('pointerup', upHandlerRef.current);
				upHandlerRef.current = undefined;
			}
			if (cancelHandlerRef.current) {
				window.removeEventListener('pointercancel', cancelHandlerRef.current);
				cancelHandlerRef.current = undefined;
			}
		}
		if (typeof document !== 'undefined') {
			document.body.style.userSelect = bodySelectRef.current;
			bodySelectRef.current = '';
		}
	}, []);

	useEffect(() => {
		if (!isEnabled && isDragging) {
			stopDragging();
		}
	}, [isDragging, isEnabled, stopDragging]);

	const handlePointerDown = useCallback(
		(event: ReactPointerEvent<HTMLDivElement>) => {
			if (!isEnabled) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			dragDataRef.current = {
				startX: event.clientX,
				startWidth: width,
			};
			setIsDragging(true);

			if (event.currentTarget.setPointerCapture) {
				event.currentTarget.setPointerCapture(event.pointerId);
			}

			if (typeof document !== 'undefined') {
				bodySelectRef.current = document.body.style.userSelect;
				document.body.style.userSelect = 'none';
			}

			const handlePointerMove = (moveEvent: PointerEvent) => {
				if (!dragDataRef.current) {
					return;
				}
				const deltaX = moveEvent.clientX - dragDataRef.current.startX;
				const nextWidth = dragDataRef.current.startWidth - deltaX;

				if (frameRef.current) {
					return;
				}

				frameRef.current = requestAnimationFrame(() => {
					frameRef.current = null;
					updateWidth(nextWidth);
				});
			};

			const handlePointerUp = () => {
				stopDragging();
			};

			const handlePointerCancel = () => {
				stopDragging();
			};

			moveHandlerRef.current = handlePointerMove;
			upHandlerRef.current = handlePointerUp;
			cancelHandlerRef.current = handlePointerCancel;

			if (typeof window !== 'undefined') {
				window.addEventListener('pointermove', handlePointerMove);
				window.addEventListener('pointerup', handlePointerUp);
				window.addEventListener('pointercancel', handlePointerCancel);
			}
		},
		[isEnabled, stopDragging, updateWidth, width],
	);

	return {
		width,
		setWidth,
		handlePointerDown,
		isDragging,
	};
}

function readStoredWidthValue(
	storageKey: string | undefined,
	clampWidth: (value: number) => number,
): number | null {
	if (!storageKey || typeof window === 'undefined') {
		return null;
	}

	try {
		const stored = window.localStorage.getItem(storageKey);
		if (stored == null) {
			return null;
		}
		const parsed = Number(stored);
		if (Number.isFinite(parsed)) {
			return clampWidth(parsed);
		}
	} catch {
		return null;
	}

	return null;
}
