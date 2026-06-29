import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { Switch } from '@/contasis';
import { Tooltip } from '@/shared/ui';
import {
  CATALOGO_54_DETRACCIONES,
  obtenerCodigosDetraccionCompatiblesConImpuesto,
  validarCoherenciaCompleta,
} from '@/shared/catalogos-sunat';
import type { CodigoDetraccionTributaria, TipoProductoDetraccion } from '@/shared/catalogos-sunat';
import type { ProductFormData } from '../../models/types';
import {
  BIENES_NORMALIZADOS,
  type BienNormalizado,
} from '../../../configuracion-sistema/datos/catalogosGRE';

// Subconjunto vigente calculado una sola vez
const BNES_VIGENTES = BIENES_NORMALIZADOS.filter((b) => b.estado === 'Vigente');

function etiquetaGRE(b: BienNormalizado): string {
  return `${b.subpartidaNacional} — ${b.descripcion} · Cód. prod. SUNAT: ${b.codigoProductoSunat} · ${b.regulacion}`;
}

interface SeccionInformacionTributariaProductoProps {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
  error?: string;
  /** Error de validación para el bien normalizado GRE. */
  errorGRE?: string;
  /** Tipo de producto del formulario — filtra los códigos de detracción mostrados. */
  productType?: TipoProductoDetraccion;
  /** Impuesto del producto (ej. 'IGV (18.00%)') — filtra por coherencia con el código. */
  impuesto?: string;
}

function etiquetaPorcentaje(item: CodigoDetraccionTributaria): string {
  if (item.tipoPorcentaje === 'fijo' && item.porcentajeNormativo !== null) {
    return `${item.porcentajeNormativo}%`;
  }
  if (item.tipoPorcentaje === 'condicional') return 'Condicional';
  if (item.tipoPorcentaje === 'variable') return 'Variable';
  return 'Pendiente';
}

function etiquetaOpcion(item: CodigoDetraccionTributaria): string {
  return `${item.codigo} - ${item.descripcion} - ${etiquetaPorcentaje(item)}`;
}

export function SeccionInformacionTributariaProducto({
  formData,
  setFormData,
  error,
  errorGRE,
  productType = 'BIEN',
  impuesto = '',
}: SeccionInformacionTributariaProductoProps) {
  const tieneDetraccion = formData.sujetoDetraccion ?? false;
  const tieneGRE = formData.aplicaBienNormalizadoGRE ?? false;

  const [textoInput, setTextoInput] = useState('');
  const [comboboxAbierto, setComboboxAbierto] = useState(false);
  const [rectInput, setRectInput] = useState<DOMRect | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const contenedorInputRef = useRef<HTMLDivElement>(null);
  const dropdownPortalRef = useRef<HTMLDivElement | null>(null);

  // ── Estado GRE ──
  const [textoGRE, setTextoGRE] = useState('');
  const [comboboxGREAbierto, setComboboxGREAbierto] = useState(false);
  const [rectInputGRE, setRectInputGRE] = useState<DOMRect | null>(null);

  const inputGRERef = useRef<HTMLInputElement>(null);
  const contenedorGRERef = useRef<HTMLDivElement>(null);
  const dropdownGREPortalRef = useRef<HTMLDivElement | null>(null);

  const detalle = formData.codigoDetraccion
    ? CATALOGO_54_DETRACCIONES.find((i) => i.codigo === formData.codigoDetraccion)
    : undefined;

  // Valor visual confirmado cuando hay código seleccionado y el dropdown está cerrado
  const modoSeleccionado = !comboboxAbierto && !!detalle;

  // ── Bien normalizado GRE seleccionado ──
  const bienGRESeleccionado = formData.subpartidaNacionalGRE
    ? BNES_VIGENTES.find((b) => b.subpartidaNacional === formData.subpartidaNacionalGRE)
    : undefined;
  const modoGRESeleccionado = !comboboxGREAbierto && !!bienGRESeleccionado;

  useEffect(() => {
    setTextoInput(detalle ? etiquetaOpcion(detalle) : '');
  }, [detalle]);

  useEffect(() => {
    setTextoGRE(bienGRESeleccionado ? etiquetaGRE(bienGRESeleccionado) : '');
  }, [bienGRESeleccionado]);

  useEffect(() => {
    const handleClickFuera = (e: MouseEvent) => {
      const target = e.target as Node;
      const dentroInput = contenedorInputRef.current?.contains(target) ?? false;
      const dentroDropdown = dropdownPortalRef.current?.contains(target) ?? false;
      if (!dentroInput && !dentroDropdown) {
        setComboboxAbierto(false);
        setTextoInput(detalle ? etiquetaOpcion(detalle) : '');
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [detalle]);

  useEffect(() => {
    if (!comboboxAbierto) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setComboboxAbierto(false);
        setTextoInput(detalle ? etiquetaOpcion(detalle) : '');
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [comboboxAbierto, detalle]);

  useEffect(() => {
    if (!comboboxAbierto) return;
    const handleScroll = (e: Event) => {
      // No cerrar si el scroll ocurre dentro del dropdown portal
      const dentroDropdown = dropdownPortalRef.current?.contains(e.target as Node) ?? false;
      if (!dentroDropdown) {
        setComboboxAbierto(false);
        setTextoInput(detalle ? etiquetaOpcion(detalle) : '');
      }
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [comboboxAbierto, detalle]);

  useEffect(() => {
    const handleClickFueraGRE = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !(contenedorGRERef.current?.contains(target) ?? false) &&
        !(dropdownGREPortalRef.current?.contains(target) ?? false)
      ) {
        setComboboxGREAbierto(false);
        setTextoGRE(bienGRESeleccionado ? etiquetaGRE(bienGRESeleccionado) : '');
      }
    };
    document.addEventListener('mousedown', handleClickFueraGRE);
    return () => document.removeEventListener('mousedown', handleClickFueraGRE);
  }, [bienGRESeleccionado]);

  useEffect(() => {
    if (!comboboxGREAbierto) return;
    const handleEscGRE = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setComboboxGREAbierto(false);
        setTextoGRE(bienGRESeleccionado ? etiquetaGRE(bienGRESeleccionado) : '');
      }
    };
    document.addEventListener('keydown', handleEscGRE);
    return () => document.removeEventListener('keydown', handleEscGRE);
  }, [comboboxGREAbierto, bienGRESeleccionado]);

  useEffect(() => {
    if (!comboboxGREAbierto) return;
    const handleScrollGRE = (e: Event) => {
      if (!(dropdownGREPortalRef.current?.contains(e.target as Node) ?? false)) {
        setComboboxGREAbierto(false);
        setTextoGRE(bienGRESeleccionado ? etiquetaGRE(bienGRESeleccionado) : '');
      }
    };
    window.addEventListener('scroll', handleScrollGRE, true);
    return () => window.removeEventListener('scroll', handleScrollGRE, true);
  }, [comboboxGREAbierto, bienGRESeleccionado]);

  const actualizarRect = useCallback(() => {
    if (inputRef.current) {
      setRectInput(inputRef.current.getBoundingClientRect());
    }
  }, []);

  const actualizarRectGRE = useCallback(() => {
    if (inputGRERef.current) {
      setRectInputGRE(inputGRERef.current.getBoundingClientRect());
    }
  }, []);

  // Limpiar código seleccionado si cambia productType o impuesto y el código ya no es compatible
  useEffect(() => {
    if (!formData.sujetoDetraccion || !formData.codigoDetraccion) return;
    const coherencia = validarCoherenciaCompleta({
      codigoCat54: formData.codigoDetraccion,
      tipoProducto: productType,
      impuesto,
    });
    if (!coherencia.valido && coherencia.esBloqueo) {
      setFormData((prev) => ({ ...prev, codigoDetraccion: null }));
      setTextoInput('');
      setComboboxAbierto(false);
    }
  }, [productType, impuesto, formData.sujetoDetraccion, formData.codigoDetraccion, setFormData]);

  // Códigos compatibles con tipo de producto + impuesto (activos + habilitados + tipo + igv coherente)
  const codigosCompatibles = useMemo(
    () => obtenerCodigosDetraccionCompatiblesConImpuesto(productType, impuesto),
    [productType, impuesto],
  );

  const codigosFiltrados = useMemo(() => {
    const termino = textoInput.toLowerCase().trim();
    if (!termino || modoSeleccionado) return codigosCompatibles;
    return codigosCompatibles.filter(
      (item) =>
        item.codigo.includes(termino) ||
        item.descripcion.toLowerCase().includes(termino) ||
        item.clasificacion.toLowerCase().includes(termino) ||
        item.tipoPorcentaje.toLowerCase().includes(termino) ||
        (item.porcentajeNormativo !== null && String(item.porcentajeNormativo).includes(termino)),
    );
  }, [textoInput, modoSeleccionado, codigosCompatibles]);

  const seleccionarCodigo = (item: CodigoDetraccionTributaria) => {
    setFormData((prev) => ({ ...prev, codigoDetraccion: item.codigo }));
    setTextoInput(etiquetaOpcion(item));
    setComboboxAbierto(false);
  };

  const handleCambioInput = (valor: string) => {
    setTextoInput(valor);
    setComboboxAbierto(true);
    if (detalle && valor !== etiquetaOpcion(detalle)) {
      setFormData((prev) => ({ ...prev, codigoDetraccion: null }));
    }
  };

  // ── Handlers GRE ──
  const gresFiltrados = useMemo(() => {
    const termino = textoGRE.toLowerCase().trim();
    if (!termino || modoGRESeleccionado) return BNES_VIGENTES;
    return BNES_VIGENTES.filter(
      (b) =>
        b.subpartidaNacional.includes(termino) ||
        b.descripcion.toLowerCase().includes(termino) ||
        b.codigoProductoSunat.includes(termino) ||
        b.regulacion.toLowerCase().includes(termino),
    );
  }, [textoGRE, modoGRESeleccionado]);

  const seleccionarBienGRE = (b: BienNormalizado) => {
    setFormData((prev) => ({ ...prev, subpartidaNacionalGRE: b.subpartidaNacional }));
    setTextoGRE(etiquetaGRE(b));
    setComboboxGREAbierto(false);
  };

  const handleCambioGRE = (valor: string) => {
    setTextoGRE(valor);
    setComboboxGREAbierto(true);
    if (bienGRESeleccionado && valor !== etiquetaGRE(bienGRESeleccionado)) {
      setFormData((prev) => ({ ...prev, subpartidaNacionalGRE: '' }));
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-3">
        {/* Switch: Aplica detracción */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-sm text-gray-700">Aplica detracción</span>
          <Tooltip
            contenido="Marca esta opción si este producto o servicio puede estar sujeto a detracción."
            ubicacion="arriba"
          >
            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
          </Tooltip>
          <span className="text-xs text-gray-400">{tieneDetraccion ? 'Sí' : 'No'}</span>
          <Switch
            checked={tieneDetraccion}
            onChange={(checked) => {
              setFormData((prev) => ({
                ...prev,
                sujetoDetraccion: checked,
                codigoDetraccion: checked ? prev.codigoDetraccion : null,
              }));
              if (!checked) {
                setTextoInput('');
                setComboboxAbierto(false);
              }
            }}
          />
        </div>

        {/* Campo de código (solo cuando el switch está activo) */}
        {tieneDetraccion && (
          <div ref={contenedorInputRef} className="flex-1 min-w-52">
            {codigosCompatibles.length === 0 ? (
              <p className="text-xs text-amber-600 py-1">
                No hay códigos de detracción habilitados para esta afectación.
              </p>
            ) : (
              <input
                ref={inputRef}
                type="text"
                placeholder="Seleccionar o buscar código de detracción"
                value={textoInput}
                onChange={(e) => handleCambioInput(e.target.value)}
                onFocus={() => {
                  actualizarRect();
                  if (detalle) setTextoInput('');
                  setComboboxAbierto(true);
                }}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  error
                    ? 'border-red-400 bg-white'
                    : modoSeleccionado
                      ? 'border-gray-300 bg-gray-50 text-gray-900 cursor-pointer'
                      : 'border-gray-300 bg-white text-gray-600'
                }`}
              />
            )}

            {/* Dropdown via portal — evita clipping del overflow del modal */}
            {comboboxAbierto && rectInput && codigosCompatibles.length > 0 &&
              createPortal(
                <div
                  ref={dropdownPortalRef}
                  style={{
                    position: 'fixed',
                    top: rectInput.bottom + 4,
                    left: rectInput.left,
                    width: rectInput.width,
                    zIndex: 9999,
                  }}
                  className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg"
                >
                  {codigosFiltrados.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-400">Sin resultados para esta búsqueda</div>
                  ) : (
                    codigosFiltrados.map((item) => (
                      <button
                        key={item.codigo}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          seleccionarCodigo(item);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 transition-colors"
                      >
                        <span className="font-mono text-xs font-medium text-gray-900 w-7 shrink-0">
                          {item.codigo}
                        </span>
                        <span className="text-xs text-gray-700 flex-1 truncate">
                          {item.descripcion}
                        </span>
                        <span
                          className={`text-xs font-medium shrink-0 ${
                            item.tipoPorcentaje === 'fijo'
                              ? 'text-gray-600'
                              : item.tipoPorcentaje === 'condicional'
                                ? 'text-amber-600'
                                : 'text-gray-400'
                          }`}
                        >
                          {etiquetaPorcentaje(item)}
                        </span>
                      </button>
                    ))
                  )}
                </div>,
                document.body
              )
            }
          </div>
        )}
      </div>

      {error && tieneDetraccion && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Switch: Bien normalizado GRE */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-sm text-gray-700">Bien normalizado GRE</span>
          <Tooltip
            contenido="Activa si este producto aplica como bien normalizado en Guías de Remisión (SPOT/IVAP). Al seleccionarlo en una GRE, la subpartida y el código de producto SUNAT se autocompletan."
            ubicacion="arriba"
          >
            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
          </Tooltip>
          <span className="text-xs text-gray-400">{tieneGRE ? 'Sí' : 'No'}</span>
          <Switch
            checked={tieneGRE}
            onChange={(checked) => {
              setFormData((prev) => ({
                ...prev,
                aplicaBienNormalizadoGRE: checked,
                subpartidaNacionalGRE: checked ? prev.subpartidaNacionalGRE : '',
              }));
              if (!checked) {
                setTextoGRE('');
                setComboboxGREAbierto(false);
              }
            }}
          />
        </div>

        {/* Selector de subpartida — solo cuando el switch está activo */}
        {tieneGRE && (
          <div ref={contenedorGRERef} className="flex-1 min-w-52">
            <input
              ref={inputGRERef}
              type="text"
              placeholder="Buscar subpartida, descripción o código SUNAT"
              value={textoGRE}
              onChange={(e) => handleCambioGRE(e.target.value)}
              onFocus={() => {
                actualizarRectGRE();
                if (bienGRESeleccionado) setTextoGRE('');
                setComboboxGREAbierto(true);
              }}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors ${
                errorGRE
                  ? 'border-red-400 bg-white'
                  : modoGRESeleccionado
                    ? 'border-gray-300 bg-gray-50 text-gray-900 cursor-pointer'
                    : 'border-gray-300 bg-white text-gray-600'
              }`}
            />

            {comboboxGREAbierto && rectInputGRE &&
              createPortal(
                <div
                  ref={dropdownGREPortalRef}
                  style={{
                    position: 'fixed',
                    top: rectInputGRE.bottom + 4,
                    left: rectInputGRE.left,
                    width: rectInputGRE.width,
                    zIndex: 9999,
                  }}
                  className="max-h-52 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg"
                >
                  {gresFiltrados.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-400">Sin resultados</div>
                  ) : (
                    gresFiltrados.map((b) => (
                      <button
                        key={b.subpartidaNacional}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          seleccionarBienGRE(b);
                        }}
                        className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-violet-50 transition-colors border-b border-gray-100 last:border-0"
                      >
                        <span className="font-mono text-xs font-semibold text-gray-900 shrink-0 w-24 pt-0.5">
                          {b.subpartidaNacional}
                        </span>
                        <span className="text-xs text-gray-700 flex-1 min-w-0">
                          <span className="block truncate">{b.descripcion}</span>
                          <span className="text-gray-400">
                            Cód. prod. SUNAT: {b.codigoProductoSunat} · {b.regulacion}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>,
                document.body,
              )
            }
          </div>
        )}
      </div>

      {errorGRE && tieneGRE && (
        <p className="text-xs text-red-500">{errorGRE}</p>
      )}
    </div>
  );
}
