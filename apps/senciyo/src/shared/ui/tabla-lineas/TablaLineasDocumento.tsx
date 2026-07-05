import { Fragment, type ReactNode } from 'react';

export interface ColumnaTablaLineas {
  id: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  minWidth?: string;
}

interface TablaLineasDocumentoProps<T> {
  columnas: ColumnaTablaLineas[];
  filas: T[];
  obtenerIdFila: (fila: T) => string | number;
  renderCelda: (columnaId: string, fila: T, indice: number) => ReactNode;
  claseFila?: (fila: T) => string;
  maxHeight?: string;
}

/**
 * Shell de tabla de líneas de documento (productos/servicios), compartido
 * entre Ventas (Comprobantes, Documentos Comerciales) y Compras. No contiene
 * ninguna lógica de negocio: recibe columnas y un renderizador de celdas por
 * columna, y solo se encarga de la estructura visual (thead sticky, scroll,
 * resaltado de fila). La lógica de cada dominio vive en su propio
 * `renderCelda`.
 */
export default function TablaLineasDocumento<T>({
  columnas,
  filas,
  obtenerIdFila,
  renderCelda,
  claseFila,
  maxHeight = 'calc(100vh - 28rem)',
}: TablaLineasDocumentoProps<T>) {
  return (
    <div className="overflow-x-auto">
      <div className="overflow-y-auto" style={{ maxHeight }}>
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-violet-50 to-purple-50 border-b-2 border-violet-200">
            <tr>
              {columnas.map((col) => (
                <th
                  key={col.id}
                  className={`px-3 py-2.5 text-[11px] font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap ${
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                  style={{ width: col.width, minWidth: col.minWidth }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, indice) => {
              const idFila = obtenerIdFila(fila);
              return (
                <tr
                  key={idFila}
                  className={`border-b border-gray-100 hover:bg-violet-50/30 transition-colors duration-150 ${claseFila?.(fila) ?? ''}`}
                >
                  {columnas.map((col) => (
                    <Fragment key={`${idFila}-${col.id}`}>{renderCelda(col.id, fila, indice)}</Fragment>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
