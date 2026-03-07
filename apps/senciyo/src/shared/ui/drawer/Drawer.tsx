import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type LadoDrawer = 'derecha' | 'izquierda';
type TamanoDrawer = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const DURACION_ANIMACION_MS = 280;

const CLASES_TAMANO: Record<TamanoDrawer, string> = {
	sm: 'w-80 max-w-full',
	md: 'w-96 max-w-full',
	lg: 'w-[40rem] max-w-full',
	xl: 'w-[48rem] max-w-full',
	full: 'w-full max-w-full',
};

const SELECTOR_ENFOCABLE = [
	'a[href]',
	'button:not([disabled])',
	'textarea:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
].join(',');

const unirClases = (...clases: Array<string | undefined>): string => clases.filter(Boolean).join(' ');

export interface DrawerProps {
	abierto: boolean;
	alCerrar: () => void;
	titulo?: React.ReactNode;
	subtitulo?: React.ReactNode;
	accionesEncabezado?: React.ReactNode;
	pie?: React.ReactNode;
	children: React.ReactNode;
	lado?: LadoDrawer;
	tamano?: TamanoDrawer;
	cerrarConOverlay?: boolean;
	cerrarConEscape?: boolean;
	bloquearScrollBody?: boolean;
	mostrarOverlay?: boolean;
	claseContenedor?: string;
	zIndex?: number;
	devolverFocoARef?: React.RefObject<HTMLElement | null>;
}

export function Drawer({
	abierto,
	alCerrar,
	titulo,
	subtitulo,
	accionesEncabezado,
	pie,
	children,
	lado = 'derecha',
	tamano = 'lg',
	cerrarConOverlay = true,
	cerrarConEscape = true,
	bloquearScrollBody = true,
	mostrarOverlay = true,
	claseContenedor,
	zIndex = 50,
	devolverFocoARef,
}: DrawerProps) {
	const [debeRenderizar, setDebeRenderizar] = useState(abierto);
	const [estaVisible, setEstaVisible] = useState(abierto);
	const contenedorDrawerRef = useRef<HTMLDivElement>(null);
	const abiertoPrevioRef = useRef(abierto);
	const idTitulo = useId();

	useEffect(() => {
		if (abierto) {
			setDebeRenderizar(true);
			const idAnimacion = window.requestAnimationFrame(() => {
				setEstaVisible(true);
			});
			return () => {
				window.cancelAnimationFrame(idAnimacion);
			};
		}

		setEstaVisible(false);
		const idTemporizador = window.setTimeout(() => {
			setDebeRenderizar(false);
		}, DURACION_ANIMACION_MS);

		return () => {
			window.clearTimeout(idTemporizador);
		};
	}, [abierto]);

	useEffect(() => {
		if (!abierto || !cerrarConEscape) {
			return;
		}

		const alPresionarTecla = (evento: KeyboardEvent) => {
			if (evento.key === 'Escape') {
				alCerrar();
			}
		};

		window.addEventListener('keydown', alPresionarTecla);
		return () => {
			window.removeEventListener('keydown', alPresionarTecla);
		};
	}, [abierto, cerrarConEscape, alCerrar]);

	useEffect(() => {
		if (!abierto || !bloquearScrollBody) {
			return;
		}

		const overflowPrevio = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			document.body.style.overflow = overflowPrevio;
		};
	}, [abierto, bloquearScrollBody]);

	useEffect(() => {
		if (!abierto || !debeRenderizar) {
			return;
		}

		const idEnfoque = window.requestAnimationFrame(() => {
			const contenedor = contenedorDrawerRef.current;
			if (!contenedor) {
				return;
			}

			const primerElementoEnfocable = contenedor.querySelector<HTMLElement>(SELECTOR_ENFOCABLE);
			if (primerElementoEnfocable) {
				primerElementoEnfocable.focus();
				return;
			}

			contenedor.focus();
		});

		return () => {
			window.cancelAnimationFrame(idEnfoque);
		};
	}, [abierto, debeRenderizar]);

	useEffect(() => {
		if (abiertoPrevioRef.current && !abierto) {
			devolverFocoARef?.current?.focus();
		}
		abiertoPrevioRef.current = abierto;
	}, [abierto, devolverFocoARef]);

	if (!debeRenderizar || typeof document === 'undefined') {
		return null;
	}

	const claseLado = lado === 'derecha' ? 'right-0' : 'left-0';
	const claseTransformacion = lado === 'derecha'
		? (estaVisible ? 'translate-x-0' : 'translate-x-full')
		: (estaVisible ? 'translate-x-0' : '-translate-x-full');

	return createPortal(
		<div className="fixed inset-0" style={{ zIndex }}>
			{mostrarOverlay && (
				<div
					className={unirClases(
						'absolute inset-0 bg-black/50 transition-opacity duration-300',
						estaVisible ? 'opacity-100' : 'opacity-0',
					)}
					onClick={cerrarConOverlay ? alCerrar : undefined}
					aria-hidden="true"
				/>
			)}

			<div
				ref={contenedorDrawerRef}
				className={unirClases(
					'fixed inset-y-0 flex h-full flex-col bg-white text-gray-900 shadow-2xl transition-transform duration-300 ease-out dark:bg-gray-800 dark:text-gray-100',
					claseLado,
					CLASES_TAMANO[tamano],
					claseTransformacion,
					claseContenedor,
				)}
				role="dialog"
				aria-modal="true"
				aria-labelledby={idTitulo}
				tabIndex={-1}
				style={{ zIndex: zIndex + 1 }}
			>
				<header className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
					<div className="min-w-0">
						<h2 id={idTitulo} className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
							{titulo ?? 'Panel lateral'}
						</h2>
						{subtitulo && (
							<p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">{subtitulo}</p>
						)}
					</div>
					<div className="flex items-center gap-2">
						{accionesEncabezado}
						<button
							type="button"
							onClick={alCerrar}
							className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
							aria-label="Cerrar"
						>
							<span aria-hidden="true">×</span>
						</button>
					</div>
				</header>

				<div className="flex-1 overflow-y-auto">{children}</div>

				{pie && <footer className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">{pie}</footer>}
			</div>
		</div>,
		document.body,
	);
}