import { useRef, useState } from 'react';
import { Upload, Trash2, FileText, Image as ImageIcon } from 'lucide-react';
import type { AdjuntoCompra, TipoAdjuntoCompra } from '../../modelos/AdjuntoCompra';
import { TIPO_ADJUNTO_COMPRA_LABELS } from '../../modelos/AdjuntoCompra';

const EXTENSIONES_PERMITIDAS = ['pdf', 'jpg', 'jpeg', 'png'];
const TAMANIO_MAXIMO_MB = 5;
const CANTIDAD_MAXIMA = 5;

function generarIdAdjunto(): string {
  return `adj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function leerArchivoComoDataUrl(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result as string);
    lector.onerror = () => reject(new Error(`No se pudo leer el archivo ${archivo.name}`));
    lector.readAsDataURL(archivo);
  });
}

function formatearTamanio(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AdjuntosCompraProps {
  adjuntos: AdjuntoCompra[];
  tiposPermitidos: TipoAdjuntoCompra[];
  cargadoPor?: string;
  /** Si se omite, el componente se muestra en modo solo lectura (para paneles de detalle). */
  onAgregar?: (adjunto: AdjuntoCompra) => void;
  onEliminar?: (id: string) => void;
}

/**
 * Componente único y reutilizable para gestionar adjuntos de Compras
 * (Orden de Compra, Comprobante de Compra, Pago). Persiste el archivo como
 * data URL local (mismo patrón que gestion-clientes/utils/fileSerialization),
 * sin subida a la nube.
 */
export default function AdjuntosCompra({
  adjuntos,
  tiposPermitidos,
  cargadoPor,
  onAgregar,
  onEliminar,
}: AdjuntosCompraProps) {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoAdjuntoCompra>(
    tiposPermitidos[0] ?? 'otro',
  );
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editable = Boolean(onAgregar);

  async function handleSeleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo || !onAgregar) return;

    const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
    if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
      setError('Formato no permitido. Usa PDF, JPG o PNG.');
      return;
    }
    if (archivo.size > TAMANIO_MAXIMO_MB * 1024 * 1024) {
      setError(`El archivo debe pesar menos de ${TAMANIO_MAXIMO_MB} MB.`);
      return;
    }
    if (adjuntos.length >= CANTIDAD_MAXIMA) {
      setError(`Máximo ${CANTIDAD_MAXIMA} adjuntos.`);
      return;
    }

    setError(null);
    setCargando(true);
    try {
      const urlLocal = await leerArchivoComoDataUrl(archivo);
      onAgregar({
        id: generarIdAdjunto(),
        tipoAdjunto: tipoSeleccionado,
        nombreArchivo: archivo.name,
        tipoArchivo: archivo.type,
        tamanio: archivo.size,
        urlLocal,
        fechaCarga: new Date().toISOString(),
        cargadoPor,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el archivo.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="space-y-3">
      {editable && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={tipoSeleccionado}
            onChange={(e) => setTipoSeleccionado(e.target.value as TipoAdjuntoCompra)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={cargando}
          >
            {tiposPermitidos.map((t) => (
              <option key={t} value={t}>
                {TIPO_ADJUNTO_COMPRA_LABELS[t]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={cargando || adjuntos.length >= CANTIDAD_MAXIMA}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors disabled:opacity-50"
          >
            <Upload size={13} /> {cargando ? 'Cargando...' : 'Adjuntar archivo'}
          </button>
          <span className="text-[11px] text-gray-400">
            PDF/JPG/PNG · máx. {TAMANIO_MAXIMO_MB} MB · {adjuntos.length}/{CANTIDAD_MAXIMA}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleSeleccionarArchivo}
          />
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {adjuntos.length === 0 ? (
        <p className="text-sm text-gray-400">
          {editable ? 'Sin adjuntos todavía.' : 'No se adjuntaron archivos.'}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {adjuntos.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
            >
              {a.tipoArchivo.startsWith('image/') ? (
                <ImageIcon size={15} className="text-blue-500 shrink-0" />
              ) : (
                <FileText size={15} className="text-gray-500 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{a.nombreArchivo}</p>
                <p className="text-[11px] text-gray-400">
                  {TIPO_ADJUNTO_COMPRA_LABELS[a.tipoAdjunto]}
                  {a.tamanio ? ` · ${formatearTamanio(a.tamanio)}` : ''} · {a.fechaCarga.slice(0, 10)}
                </p>
              </div>
              {onEliminar && (
                <button
                  type="button"
                  onClick={() => onEliminar(a.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  aria-label="Eliminar adjunto"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
