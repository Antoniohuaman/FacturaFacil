import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tooltip } from '@/shared/ui';
import type { CartItem, IgvType } from '../../../models/comprobante.types';
import { buildLinePricingInputFromCartItem, calculateLineaComprobante } from '../../core/comprobantePricing';

export type ModoProductoLibre = 'bien' | 'servicio';

export interface OpcionImpuestoLibre {
  id: string;
  etiqueta: string;
  igvType: IgvType;
  porcentaje: number;
  afectacionCode?: string;
}

export interface OpcionUnidadLibre {
  codigo: string;
  etiqueta: string;
}

export type IdColumnaLibre =
  | 'bienServicio'
  | 'impuesto'
  | 'unidad'
  | 'cantidad'
  | 'codigo'
  | 'descripcion'
  | 'precio'
  | 'descuento'
  | 'importe'
  | 'accion';

interface PropsTablaVentaLibre {
  filas: CartItem[];
  columnasVisibles: IdColumnaLibre[];
  opcionesImpuesto: OpcionImpuestoLibre[];
  opcionesUnidad: OpcionUnidadLibre[];
  alAgregarFila: () => string;
  alActualizarFila: (id: string, cambios: Partial<CartItem>) => void;
  alEliminarFila: (id: string) => void;
  convertirBaseADocumento: (montoBase: number) => number;
  convertirDocumentoABase: (montoDocumento: number) => number;
  formatearMontoBase: (montoBase: number) => string;
  decimalesDocumento: number;
}

type ErroresFila = {
  descripcion?: string;
  cantidad?: string;
  unidad?: string;
  impuesto?: string;
  precio?: string;
};

const resolverImpuestoSeleccionado = (fila: CartItem, opcionesImpuesto: OpcionImpuestoLibre[]): string => {
  if (fila.impuestoId && opcionesImpuesto.some((opcion) => opcion.id === fila.impuestoId)) {
    return fila.impuestoId;
  }

  const porCoincidenciaExacta = opcionesImpuesto.find(
    (opcion) => opcion.igvType === fila.igvType && opcion.etiqueta === (fila.impuesto || opcion.etiqueta),
  );
  if (porCoincidenciaExacta) {
    return porCoincidenciaExacta.id;
  }

  const porIgv = opcionesImpuesto.find((opcion) => opcion.igvType === fila.igvType);
  return porIgv?.id || '';
};

const obtenerErroresFila = (
  fila: CartItem,
  opcionesImpuesto: OpcionImpuestoLibre[],
): ErroresFila => {
  const errores: ErroresFila = {};
  const descripcion = (fila.name || '').trim();
  const cantidad = Number(fila.quantity);
  const precio = Number(fila.price);
  const unidad = (fila.unidadMedidaCodigo || fila.unidadMedida || fila.unit || '').trim();
  const impuestoId = resolverImpuestoSeleccionado(fila, opcionesImpuesto);

  if (!descripcion) {
    errores.descripcion = 'Descripción obligatoria';
  }

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    errores.cantidad = 'Cantidad mayor a 0';
  }

  if (!unidad) {
    errores.unidad = 'Unidad obligatoria';
  }

  if (!impuestoId) {
    errores.impuesto = 'Impuesto obligatorio';
  }

  if (!Number.isFinite(precio) || precio < 0) {
    errores.precio = 'Precio inválido';
  }

  return errores;
};

const filaNuevaSinDescripcion = (fila: CartItem): boolean => {
  return (fila.name || '').trim().length === 0;
};

const TablaVentaLibre: React.FC<PropsTablaVentaLibre> = ({
  filas,
  columnasVisibles,
  opcionesImpuesto,
  opcionesUnidad,
  alAgregarFila,
  alActualizarFila,
  alEliminarFila,
  convertirBaseADocumento,
  convertirDocumentoABase,
  formatearMontoBase,
  decimalesDocumento,
}) => {
  const [filasNuevas, setFilasNuevas] = useState<Set<string>>(new Set());
  const [filaPendienteFoco, setFilaPendienteFoco] = useState<string | null>(null);
  const [borradoresPrecio, setBorradoresPrecio] = useState<Record<string, string>>({});
  const referenciasDescripcion = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!filaPendienteFoco) {
      return;
    }
    const control = referenciasDescripcion.current[filaPendienteFoco];
    if (!control) {
      return;
    }
    control.focus();
    control.select();
    setFilaPendienteFoco(null);
  }, [filaPendienteFoco, filas]);

  useEffect(() => {
    const idsActuales = new Set(filas.map((fila) => String(fila.id)));

    setFilasNuevas((previo) => {
      if (previo.size === 0) return previo;
      const siguiente = new Set<string>();
      previo.forEach((id) => {
        if (idsActuales.has(id)) {
          siguiente.add(id);
        }
      });
      return siguiente;
    });

    setBorradoresPrecio((previo) => {
      const siguiente: Record<string, string> = {};
      Object.entries(previo).forEach(([id, valor]) => {
        if (idsActuales.has(id)) {
          siguiente[id] = valor;
        }
      });
      return siguiente;
    });
  }, [filas]);

  const agregarFilaConFoco = useCallback(() => {
    const idNuevaFila = alAgregarFila();
    const idTexto = String(idNuevaFila);
    setFilasNuevas((previo) => {
      const siguiente = new Set(previo);
      siguiente.add(idTexto);
      return siguiente;
    });
    setFilaPendienteFoco(idTexto);
  }, [alAgregarFila]);

  const manejarEscape = useCallback((fila: CartItem) => {
    const idFila = String(fila.id);
    if (!filasNuevas.has(idFila)) {
      return;
    }
    if (!filaNuevaSinDescripcion(fila)) {
      return;
    }
    alEliminarFila(fila.id);
    setFilasNuevas((previo) => {
      const siguiente = new Set(previo);
      siguiente.delete(idFila);
      return siguiente;
    });
  }, [alEliminarFila, filasNuevas]);

  const manejarCambioImpuesto = useCallback((fila: CartItem, impuestoId: string) => {
    const opcion = opcionesImpuesto.find((item) => item.id === impuestoId);
    if (!opcion) {
      return;
    }

    alActualizarFila(fila.id, {
      impuestoId: opcion.id,
      igvType: opcion.igvType,
      igv: opcion.porcentaje,
      impuesto: opcion.etiqueta,
    });
  }, [alActualizarFila, opcionesImpuesto]);

  const manejarCambioUnidad = useCallback((fila: CartItem, codigoUnidad: string) => {
    const opcion = opcionesUnidad.find((item) => item.codigo === codigoUnidad);
    alActualizarFila(fila.id, {
      unidadMedidaCodigo: codigoUnidad,
      unidadMedida: codigoUnidad,
      unit: codigoUnidad,
      unidad: opcion?.etiqueta || codigoUnidad,
    });
  }, [alActualizarFila, opcionesUnidad]);

  const confirmarPrecio = useCallback((fila: CartItem, valor: string) => {
    const idFila = String(fila.id);
    const texto = valor.replace(',', '.').trim();
    if (!texto) {
      setBorradoresPrecio((previo) => {
        const siguiente = { ...previo };
        delete siguiente[idFila];
        return siguiente;
      });
      return;
    }

    const valorDocumento = Number.parseFloat(texto);
    const valorBase = Number.isFinite(valorDocumento)
      ? convertirDocumentoABase(Math.max(0, valorDocumento))
      : 0;

    alActualizarFila(fila.id, { price: valorBase });
    setBorradoresPrecio((previo) => {
      const siguiente = { ...previo };
      delete siguiente[idFila];
      return siguiente;
    });
  }, [alActualizarFila, convertirDocumentoABase]);

  const procesarEnterEnPrecio = useCallback((fila: CartItem) => {
    const errores = obtenerErroresFila(fila, opcionesImpuesto);
    if (errores.descripcion) {
      return;
    }
    agregarFilaConFoco();
  }, [agregarFilaConFoco, opcionesImpuesto]);

  const anchaDescripcion = columnasVisibles.includes('descripcion');

  const lineasCalculadas = useMemo(() => {
    const mapa = new Map<string, ReturnType<typeof calculateLineaComprobante>>();
    filas.forEach((fila) => {
      const linea = calculateLineaComprobante(
        buildLinePricingInputFromCartItem(fila, undefined, { priceIncludesTax: true }),
      );
      mapa.set(String(fila.id), linea);
    });
    return mapa;
  }, [filas]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500">Venta libre usa el cálculo central del comprobante.</p>
        <button
          type="button"
          onClick={agregarFilaConFoco}
          className="inline-flex h-8 items-center rounded-md border border-slate-300 px-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
        >
          + Agregar fila
        </button>
      </div>

      <div className="rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-200">
              <tr>
                {columnasVisibles.map((columna) => (
                  <th
                    key={columna}
                    className="px-2 py-2 text-[11px] font-semibold text-gray-700 uppercase tracking-wider text-left whitespace-nowrap"
                  >
                    {columna === 'bienServicio' && 'Bien/Servicio'}
                    {columna === 'impuesto' && 'Impuesto/Afectación'}
                    {columna === 'unidad' && 'Unidad'}
                    {columna === 'cantidad' && 'Cantidad'}
                    {columna === 'codigo' && 'Código'}
                    {columna === 'descripcion' && 'Descripción'}
                    {columna === 'precio' && 'Precio U.'}
                    {columna === 'descuento' && 'Descuento'}
                    {columna === 'importe' && 'Importe'}
                    {columna === 'accion' && 'Acción'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => {
                const idFila = String(fila.id);
                const errores = obtenerErroresFila(fila, opcionesImpuesto);
                const precioDocumento = convertirBaseADocumento(Number(fila.price) || 0);
                const valorPrecio = borradoresPrecio[idFila] ?? precioDocumento.toFixed(decimalesDocumento);
                const unidadActual = fila.unidadMedidaCodigo || fila.unidadMedida || fila.unit || '';
                const impuestoActual = resolverImpuestoSeleccionado(fila, opcionesImpuesto);
                const linea = lineasCalculadas.get(idFila);
                const importeBase = linea?.total ?? 0;

                return (
                  <tr key={fila.id} className="border-b border-gray-100 hover:bg-violet-50/30 align-top">
                    {columnasVisibles.includes('bienServicio') && (
                      <td className="px-2 py-2">
                        <select
                          value={fila.tipoBienServicio || 'bien'}
                          onChange={(event) => {
                            const valor: ModoProductoLibre = event.target.value === 'servicio' ? 'servicio' : 'bien';
                            alActualizarFila(fila.id, {
                              tipoBienServicio: valor,
                              tipoProducto: valor === 'servicio' ? 'SERVICIO' : 'BIEN',
                            });
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              manejarEscape(fila);
                            }
                          }}
                          className="h-8 w-28 rounded border border-gray-300 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                        >
                          <option value="bien">Bien</option>
                          <option value="servicio">Servicio</option>
                        </select>
                      </td>
                    )}

                    {columnasVisibles.includes('impuesto') && (
                      <td className="px-2 py-2 min-w-[190px]">
                        <select
                          value={impuestoActual}
                          onChange={(event) => manejarCambioImpuesto(fila, event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              manejarEscape(fila);
                            }
                          }}
                          className={`h-8 w-full rounded px-2 text-xs focus:outline-none focus:ring-2 ${errores.impuesto ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-300 focus:ring-violet-500/30'}`}
                        >
                          <option value="">Seleccione</option>
                          {opcionesImpuesto.map((opcion) => (
                            <option key={opcion.id} value={opcion.id}>{opcion.etiqueta}</option>
                          ))}
                        </select>
                        {errores.impuesto && <p className="mt-1 text-[10px] text-red-500">{errores.impuesto}</p>}
                      </td>
                    )}

                    {columnasVisibles.includes('unidad') && (
                      <td className="px-2 py-2 min-w-[150px]">
                        <select
                          value={unidadActual}
                          onChange={(event) => manejarCambioUnidad(fila, event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              manejarEscape(fila);
                            }
                          }}
                          className={`h-8 w-full rounded px-2 text-xs focus:outline-none focus:ring-2 ${errores.unidad ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-300 focus:ring-violet-500/30'}`}
                        >
                          <option value="">Seleccione</option>
                          {opcionesUnidad.map((opcion) => (
                            <option key={opcion.codigo} value={opcion.codigo}>{opcion.etiqueta}</option>
                          ))}
                        </select>
                        {errores.unidad && <p className="mt-1 text-[10px] text-red-500">{errores.unidad}</p>}
                      </td>
                    )}

                    {columnasVisibles.includes('cantidad') && (
                      <td className="px-2 py-2 min-w-[120px]">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={Number.isFinite(Number(fila.quantity)) ? Number(fila.quantity) : 0}
                          onChange={(event) => {
                            const valor = Number.parseFloat(event.target.value.replace(',', '.'));
                            alActualizarFila(fila.id, { quantity: Number.isFinite(valor) ? valor : 0 });
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              manejarEscape(fila);
                            }
                          }}
                          className={`h-8 w-full rounded px-2 text-xs text-right focus:outline-none focus:ring-2 no-number-spinner ${errores.cantidad ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-300 focus:ring-violet-500/30'}`}
                        />
                        {errores.cantidad && <p className="mt-1 text-[10px] text-red-500">{errores.cantidad}</p>}
                      </td>
                    )}

                    {columnasVisibles.includes('codigo') && (
                      <td className="px-2 py-2 min-w-[130px]">
                        <input
                          type="text"
                          value={fila.code || ''}
                          onChange={(event) => alActualizarFila(fila.id, { code: event.target.value })}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              manejarEscape(fila);
                            }
                          }}
                          className="h-8 w-full rounded border border-gray-300 px-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                          placeholder="Opcional"
                        />
                      </td>
                    )}

                    {columnasVisibles.includes('descripcion') && (
                      <td className={`px-2 py-2 ${anchaDescripcion ? 'min-w-[260px]' : 'min-w-[180px]'}`}>
                        <input
                          ref={(elemento) => {
                            referenciasDescripcion.current[idFila] = elemento;
                          }}
                          type="text"
                          value={fila.name || ''}
                          onChange={(event) => alActualizarFila(fila.id, { name: event.target.value })}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              manejarEscape(fila);
                            }
                          }}
                          className={`h-8 w-full rounded px-2 text-xs focus:outline-none focus:ring-2 ${errores.descripcion ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-300 focus:ring-violet-500/30'}`}
                          placeholder="Descripción"
                        />
                        {errores.descripcion && <p className="mt-1 text-[10px] text-red-500">{errores.descripcion}</p>}
                      </td>
                    )}

                    {columnasVisibles.includes('precio') && (
                      <td className="px-2 py-2 min-w-[130px]">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={valorPrecio}
                          onChange={(event) => {
                            const valor = event.target.value;
                            setBorradoresPrecio((previo) => ({ ...previo, [idFila]: valor }));
                          }}
                          onBlur={(event) => confirmarPrecio(fila, event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              manejarEscape(fila);
                              return;
                            }
                            if (event.key === 'Enter') {
                              confirmarPrecio(fila, (event.target as HTMLInputElement).value);
                              procesarEnterEnPrecio(fila);
                            }
                          }}
                          className={`h-8 w-full rounded px-2 text-xs text-right focus:outline-none focus:ring-2 no-number-spinner ${errores.precio ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-300 focus:ring-violet-500/30'}`}
                        />
                        {errores.precio && <p className="mt-1 text-[10px] text-red-500">{errores.precio}</p>}
                      </td>
                    )}

                    {columnasVisibles.includes('descuento') && (
                      <td className="px-2 py-2 min-w-[120px]">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={Number.isFinite(Number(fila.descuentoItem)) ? Number(fila.descuentoItem) : 0}
                          onChange={(event) => {
                            const valor = Number.parseFloat(event.target.value.replace(',', '.'));
                            alActualizarFila(fila.id, {
                              descuentoItem: Number.isFinite(valor) ? Math.max(0, valor) : 0,
                            });
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              manejarEscape(fila);
                            }
                          }}
                          className="h-8 w-full rounded border border-gray-300 px-2 text-xs text-right focus:outline-none focus:ring-2 focus:ring-violet-500/30 no-number-spinner"
                        />
                      </td>
                    )}

                    {columnasVisibles.includes('importe') && (
                      <td className="px-2 py-2 min-w-[130px] text-right">
                        <div className="h-8 rounded border border-gray-200 bg-gray-50 px-2 text-xs font-semibold text-gray-700 flex items-center justify-end">
                          {formatearMontoBase(importeBase)}
                        </div>
                      </td>
                    )}

                    {columnasVisibles.includes('accion') && (
                      <td className="px-2 py-2 text-center min-w-[70px]">
                        <Tooltip contenido="Eliminar fila">
                          <button
                            type="button"
                            className="h-8 w-8 rounded text-gray-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => alEliminarFila(fila.id)}
                            aria-label="Eliminar fila"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18" />
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </Tooltip>
                      </td>
                    )}
                  </tr>
                );
              })}

              {filas.length === 0 && (
                <tr>
                  <td colSpan={columnasVisibles.length} className="px-3 py-6 text-center text-xs text-slate-500">
                    Sin filas de venta libre. Use “+ Agregar fila”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TablaVentaLibre;
