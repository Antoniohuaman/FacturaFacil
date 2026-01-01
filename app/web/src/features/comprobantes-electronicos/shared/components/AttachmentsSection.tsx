import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, Paperclip, Trash2, Upload } from 'lucide-react';

interface AttachmentsSectionProps {
  title?: string;
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxFileSizeMb?: number;
  allowedExtensions?: string[];
  errorMessage?: string | null;
  onErrorChange?: (message: string | null) => void;
}

const DEFAULT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'docx'];
const DEFAULT_MAX_FILES = 3;
const DEFAULT_MAX_SIZE_MB = 5;

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const buildSignature = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

export const AttachmentsSection: React.FC<AttachmentsSectionProps> = ({
  title = 'Adjuntos',
  files,
  onChange,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSizeMb = DEFAULT_MAX_SIZE_MB,
  allowedExtensions = DEFAULT_EXTENSIONS,
  errorMessage,
  onErrorChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedExtensions = useMemo(() => {
    if (!allowedExtensions?.length) {
      return DEFAULT_EXTENSIONS;
    }
    return Array.from(new Set(allowedExtensions.map((ext) => ext.toLowerCase().replace(/^\./, ''))));
  }, [allowedExtensions]);

  const allowedExtensionsSet = useMemo(() => new Set(normalizedExtensions), [normalizedExtensions]);
  const acceptValue = useMemo(() => normalizedExtensions.map((ext) => `.${ext}`).join(','), [normalizedExtensions]);
  const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

  const notifyError = (message: string | null) => {
    if (onErrorChange) {
      onErrorChange(message);
    }
  };

  const handleSelectFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList) {
      return;
    }

    let error: string | null = null;
    const nextFiles = [...files];
    const signatures = new Set(nextFiles.map(buildSignature));

    for (const file of Array.from(fileList)) {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!allowedExtensionsSet.has(extension)) {
        error = 'Formato no permitido. Usa PDF, JPG, JPEG, PNG o DOCX.';
        continue;
      }
      if (file.size > maxFileSizeBytes) {
        error = `Cada archivo debe pesar menos de ${maxFileSizeMb} MB.`;
        continue;
      }
      const signature = buildSignature(file);
      if (signatures.has(signature)) {
        error = 'Ese archivo ya fue agregado.';
        continue;
      }
      if (nextFiles.length >= maxFiles) {
        error = `Máximo ${maxFiles} archivos.`;
        break;
      }
      nextFiles.push(file);
      signatures.add(signature);
    }

    if (nextFiles.length !== files.length) {
      onChange(nextFiles);
    }

    notifyError(error);
    event.target.value = '';
  };

  const handleRemove = (index: number) => {
    const updated = files.filter((_, idx) => idx !== index);
    onChange(updated);
    notifyError(null);
  };

  const toggleOpen = () => setIsOpen((prev) => !prev);

  return (
    <div className="rounded-lg border border-slate-200">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-slate-800"
        onClick={toggleOpen}
      >
        <span className="flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          {title}
        </span>
        <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
          {files.length}/{maxFiles}
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-slate-100 px-3 py-3 text-xs text-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
            >
              <Upload className="h-3.5 w-3.5" /> Subir archivos
            </button>
            <span className="text-[11px] text-slate-500">Máx. {maxFileSizeMb} MB por archivo</span>
          </div>

          {files.length > 0 ? (
            <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto pr-1">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[12px] font-semibold text-slate-800">{file.name}</p>
                    <p className="text-[11px] text-slate-500">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="rounded-full p-1 text-slate-400 transition hover:bg-white hover:text-red-600"
                    aria-label="Eliminar archivo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
              No hay archivos seleccionados.
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            multiple
            accept={acceptValue}
            className="hidden"
            onChange={handleSelectFiles}
          />

          <p className={`mt-3 text-[11px] ${errorMessage ? 'text-red-600' : 'text-slate-500'}`}>
            {errorMessage ?? `Formatos permitidos: ${normalizedExtensions.map((ext) => ext.toUpperCase()).join(', ')}.`}
          </p>
        </div>
      )}
    </div>
  );
};
