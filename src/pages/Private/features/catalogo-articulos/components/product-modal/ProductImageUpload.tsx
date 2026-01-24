import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, X, Check } from 'lucide-react';

type LocalImageItem = {
  id: string;
  url: string;
  file?: File;
};

const MAX_IMAGES = 3;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const toLocalId = (file: File) => `${file.name}-${file.lastModified}-${file.size}`;

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });

interface ProductImageUploadProps {
  imagePreview: string;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isFieldVisible: (fieldId: string) => boolean;
  isFieldRequired: (fieldId: string) => boolean;
  showCheck?: boolean;
}

export const ProductImageUpload: React.FC<ProductImageUploadProps> = ({
  imagePreview,
  onUpload,
  isFieldVisible,
  isFieldRequired,
  showCheck
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [images, setImages] = useState<LocalImageItem[]>(() => (imagePreview ? [{ id: 'external', url: imagePreview }] : []));
  const [activeIndex, setActiveIndex] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const isVisible = isFieldVisible('imagen');

  const activeImage = images[activeIndex];
  const canAddMore = images.length < MAX_IMAGES;

  useEffect(() => {
    if (!isVisible) return;
    if (!imagePreview) {
      setImages([]);
      setActiveIndex(0);
      return;
    }

    setImages(prev => {
      if (prev.length === 0) {
        return [{ id: 'external', url: imagePreview }];
      }
      // Si el primer item es el "externo" (sin file), mantenlo sincronizado con el preview actual.
      if (!prev[0].file && prev[0].url !== imagePreview) {
        return [{ ...prev[0], url: imagePreview }, ...prev.slice(1)];
      }
      return prev;
    });
  }, [imagePreview, isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(id);
  }, [notice, isVisible]);

  const helperText = useMemo(() => {
    return 'PNG, JPG, GIF hasta 5MB · Máx. 3 imágenes';
  }, []);

  const setMainImageInForm = (file?: File) => {
    if (!isVisible) return;
    if (file) {
      onUpload({ target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>);
      return;
    }
    // Limpieza retrocompatible: el handler debe interpretar "sin file" como limpiar.
    onUpload({ target: { files: [] } } as unknown as React.ChangeEvent<HTMLInputElement>);
  };

  const handleAddImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isVisible) return;
    const selected = Array.from(event.target.files ?? []);
    if (selected.length === 0) return;

    const remainingSlots = MAX_IMAGES - images.length;
    if (remainingSlots <= 0) {
      setNotice('Máx. 3 imágenes');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    const candidates = selected.slice(0, remainingSlots);
    let skipped = selected.length - candidates.length;
    const validFiles: File[] = [];

    for (const file of candidates) {
      if (!file.type.startsWith('image/')) {
        skipped += 1;
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        skipped += 1;
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      setNotice(skipped > 0 ? 'Algunas imágenes no se pudieron agregar' : 'No se pudo agregar la imagen');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    const newItems = await Promise.all(
      validFiles.map(async (file) => ({
        id: toLocalId(file),
        url: await readAsDataUrl(file),
        file
      }))
    );

    setImages(prev => {
      const merged = [...prev];
      for (const item of newItems) {
        // Evita duplicar el mismo archivo si lo seleccionan dos veces.
        if (merged.some(existing => existing.id === item.id)) continue;
        if (merged.length >= MAX_IMAGES) break;
        merged.push(item);
      }
      return merged;
    });

    // Si era el primer agregado, actualiza la imagen principal del formulario.
    if (images.length === 0) {
      setActiveIndex(0);
      setMainImageInForm(validFiles[0]);
    }

    if (skipped > 0) {
      setNotice('Se agregaron las permitidas (máx. 3)');
    }

    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSelectIndex = (idx: number) => {
    if (!isVisible) return;
    const next = images[idx];
    if (!next) return;
    setActiveIndex(idx);
    if (next.file) {
      setMainImageInForm(next.file);
    }
  };

  const handleRemoveAt = (idx: number) => {
    if (!isVisible) return;
    setImages(prev => {
      const next = prev.filter((_, i) => i !== idx);
      const nextActive = Math.min(
        idx === activeIndex ? activeIndex : idx < activeIndex ? Math.max(0, activeIndex - 1) : activeIndex,
        Math.max(0, next.length - 1)
      );

      setActiveIndex(nextActive);

      if (next.length === 0) {
        setMainImageInForm(undefined);
      } else {
        const nextMain = next[nextActive];
        if (nextMain?.file) setMainImageInForm(nextMain.file);
      }

      if (inputRef.current) inputRef.current.value = '';
      return next;
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div>
      <div className="relative mb-1">
        <label className="block text-xs font-medium text-gray-700">
        Imagen
        {isFieldRequired('imagen') && <span className="text-red-500 ml-1">*</span>}
        </label>
        {showCheck && (
          <Check className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-500/70" />
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50/40 p-2.5">
        <div className="group relative aspect-square w-full max-h-[260px] overflow-hidden rounded-lg border border-gray-200 bg-white">
          {activeImage?.url ? (
            <img
              src={activeImage.url}
              alt="Preview"
              className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-xs font-medium text-gray-600">Sin imagen</p>
                <p className="text-[11px] text-gray-500">Sube una foto para identificarlo rápido</p>
              </div>
            </div>
          )}

          {activeImage?.url && (
            <button
              type="button"
              onClick={() => handleRemoveAt(activeIndex)}
              className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/90 border border-gray-200 text-gray-700 shadow-sm hover:bg-white transition-colors"
              aria-label="Quitar imagen"
              title="Quitar imagen"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {images.length > 1 && (
          <div className="mt-2 flex items-center gap-2 overflow-x-auto">
            {images.map((img, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => handleSelectIndex(idx)}
                  className={`relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md border bg-white transition-colors ${
                    isActive ? 'border-violet-300 ring-2 ring-violet-200' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  aria-label={`Seleccionar imagen ${idx + 1}`}
                  title={`Imagen ${idx + 1}`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  <span className="sr-only">{`Imagen ${idx + 1}`}</span>
                  <span
                    className={`absolute inset-0 transition-opacity ${isActive ? 'opacity-0' : 'opacity-0 hover:opacity-5'}`}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemoveAt(idx);
                    }}
                    className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50"
                    aria-label={`Quitar imagen ${idx + 1}`}
                    title="Quitar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500">{helperText}</p>
            {notice && <p className="text-[11px] text-amber-600 mt-1">{notice}</p>}
          </div>
          <div className="flex-shrink-0">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              disabled={!canAddMore}
              onChange={handleAddImages}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className={`inline-flex items-center gap-2 px-3 h-9 border border-gray-300 rounded-md text-xs font-medium bg-white transition-colors ${
                canAddMore
                  ? 'cursor-pointer text-gray-700 hover:bg-gray-50'
                  : 'cursor-not-allowed text-gray-400 bg-gray-50'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              {images.length === 0 ? 'Subir imagen' : 'Agregar'}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
