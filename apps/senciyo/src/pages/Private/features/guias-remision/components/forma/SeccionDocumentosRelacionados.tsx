import { useCallback } from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';
import { DOCUMENTOS_RELACIONADOS_GRE } from '../../../configuracion-sistema/datos/catalogosGRE';
import type { DocumentoRelacionadoGRE } from '../../modelos/GuiaRemision';
import { DOCUMENTO_RELACIONADO_VACIO } from '../../modelos/GuiaRemision';

interface SeccionDocumentosRelacionadosProps {
  documentos: DocumentoRelacionadoGRE[];
  onChange: (documentos: DocumentoRelacionadoGRE[]) => void;
}

const CELL_CLS =
  'w-full h-8 px-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white';

export default function SeccionDocumentosRelacionados({
  documentos,
  onChange,
}: SeccionDocumentosRelacionadosProps) {
  const agregar = useCallback(() => {
    onChange([...documentos, DOCUMENTO_RELACIONADO_VACIO()]);
  }, [documentos, onChange]);

  const actualizar = useCallback(
    (id: string, campo: keyof DocumentoRelacionadoGRE, valor: string) => {
      onChange(documentos.map((d) => (d.id === id ? { ...d, [campo]: valor } : d)));
    },
    [documentos, onChange],
  );

  const eliminar = useCallback(
    (id: string) => {
      onChange(documentos.filter((d) => d.id !== id));
    },
    [documentos, onChange],
  );

  return (
    <div>
      {/* Sub-encabezado */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Documentos relacionados
          </span>
          {documentos.length > 0 && (
            <span className="ml-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full font-medium tabular-nums">
              {documentos.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={agregar}
          className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar documento
        </button>
      </div>

      {documentos.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 py-1">
          Sin documentos relacionados.
        </p>
      ) : (
        <div className="space-y-2">
          {documentos.map((doc) => (
            <div key={doc.id} className="grid grid-cols-12 gap-2 items-center">
              {/* Origen */}
              <div className="col-span-2">
                <select
                  value={doc.origen}
                  onChange={(e) => actualizar(doc.id, 'origen', e.target.value)}
                  className={CELL_CLS}
                >
                  <option value="EXTERNO">Externo</option>
                  <option value="INTERNO">Interno</option>
                </select>
              </div>

              {/* Tipo documento */}
              <div className="col-span-5">
                <select
                  value={doc.tipoDocumentoCodigo}
                  onChange={(e) => actualizar(doc.id, 'tipoDocumentoCodigo', e.target.value)}
                  className={CELL_CLS}
                >
                  {DOCUMENTOS_RELACIONADOS_GRE.filter((d) => d.estado === 'Vigente').map((d) => (
                    <option key={d.codigo} value={d.codigo}>
                      {d.codigo} – {d.documento}
                    </option>
                  ))}
                </select>
              </div>

              {/* N° Documento */}
              <div className="col-span-4">
                <input
                  type="text"
                  value={doc.numeroDocumento}
                  onChange={(e) => actualizar(doc.id, 'numeroDocumento', e.target.value)}
                  placeholder="N° documento"
                  className={CELL_CLS}
                />
              </div>

              {/* Eliminar */}
              <div className="col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => eliminar(doc.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
