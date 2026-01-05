import type { PointerEventHandler } from 'react';

type SplitHandleProps = {
	onPointerDown: PointerEventHandler<HTMLDivElement>;
	ariaValueNow?: number;
	ariaValueMin?: number;
	ariaValueMax?: number;
};

export function SplitHandle({
	onPointerDown,
	ariaValueNow,
	ariaValueMin,
	ariaValueMax,
}: SplitHandleProps) {
	return (
		<div
			role="separator"
			aria-orientation="vertical"
			aria-valuenow={ariaValueNow}
			aria-valuemin={ariaValueMin}
			aria-valuemax={ariaValueMax}
			className="relative flex h-full w-2 flex-shrink-0 cursor-col-resize select-none items-stretch justify-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
			onPointerDown={onPointerDown}
		>
			<span className="pointer-events-none my-2 w-px flex-1 rounded-full bg-slate-300 dark:bg-slate-600" />
		</div>
	);
}
