import type { ClienteArchivo, PersistedFile } from '../models';

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`No se pudo leer el archivo ${file.name}`));
    reader.readAsDataURL(file);
  });
};

const decodeBase64 = (base64Payload: string): Uint8Array => {
  if (typeof atob !== 'function') {
    throw new Error('El entorno actual no permite decodificar base64');
  }

  const binaryString = atob(base64Payload);

  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const dataUrlToFile = (persisted: PersistedFile): File => {
  const { dataUrl, name, type, lastModified } = persisted;
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return new File([], name, { type: type || 'application/octet-stream', lastModified });
  }

  const base64Index = dataUrl.indexOf('base64,');
  if (base64Index === -1) {
    return new File([], name, { type: type || 'application/octet-stream', lastModified });
  }

  const payload = dataUrl.slice(base64Index + 'base64,'.length);
  const bytes = decodeBase64(payload);
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  const blob = new Blob([arrayBuffer], { type: type || 'application/octet-stream' });
  return new File([blob], name, { type: type || 'application/octet-stream', lastModified });
};

const isPersistedFile = (value: ClienteArchivo | null | undefined): value is PersistedFile => {
  return Boolean(value) && typeof (value as PersistedFile).dataUrl === 'string';
};

export const serializeFiles = async (files: File[] = []): Promise<PersistedFile[]> => {
  if (!files.length) return [];

  const serialized = await Promise.all(
    files.map(async (file) => {
      const dataUrl = await readFileAsDataUrl(file);
      return {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        dataUrl,
      } satisfies PersistedFile;
    })
  );

  return serialized;
};

export const deserializeFiles = async (files?: ClienteArchivo[] | null): Promise<File[]> => {
  if (!files || files.length === 0) {
    return [];
  }

  const rebuilt = files.map((file) => {
    if (file instanceof File) {
      return file;
    }

    if (isPersistedFile(file)) {
      try {
        return dataUrlToFile(file);
      } catch {
        return new File([], file.name, { type: file.type || 'application/octet-stream', lastModified: file.lastModified });
      }
    }

    return new File([], 'archivo-sin-datos', { type: 'application/octet-stream' });
  });

  return rebuilt;
};
