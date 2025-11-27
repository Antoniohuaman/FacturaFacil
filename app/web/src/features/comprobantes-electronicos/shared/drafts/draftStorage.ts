import type { DraftData } from '../../models/comprobante.types';
import { SYSTEM_CONFIG } from '../../models/constants';

const STORAGE_KEY = SYSTEM_CONFIG.DRAFTS_STORAGE_KEY;

const readRawStorage = (): string | null => {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
  } catch (error) {
    console.error('[draftStorage] Error reading raw storage:', error);
    return null;
  }
};

const writeRawStorage = (value: string): void => {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, value);
    }
  } catch (error) {
    console.error('[draftStorage] Error writing raw storage:', error);
  }
};

const parseDrafts = (rawValue: string | null): DraftData[] => {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[draftStorage] Error parsing drafts:', error);
    return [];
  }
};

export const readDraftsFromStorage = (): DraftData[] => {
  return parseDrafts(readRawStorage());
};

export const persistDrafts = (drafts: DraftData[]): void => {
  writeRawStorage(JSON.stringify(drafts));
};

export const appendDraftToStorage = (draft: DraftData): void => {
  const drafts = readDraftsFromStorage();
  drafts.push(draft);
  persistDrafts(drafts);
};

export const removeDraftFromStorage = (draftId: string): void => {
  const drafts = readDraftsFromStorage();
  const nextDrafts = drafts.filter(draft => draft.id !== draftId);
  persistDrafts(nextDrafts);
};

export const duplicateDraftInStorage = (draftId: string): DraftData | null => {
  const drafts = readDraftsFromStorage();
  const original = drafts.find(draft => draft.id === draftId);
  if (!original) {
    return null;
  }

  const duplicate: DraftData = {
    ...original,
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    fechaEmision: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  drafts.push(duplicate);
  persistDrafts(drafts);

  return duplicate;
};

export const upsertDraftInStorage = (draft: DraftData): void => {
  const drafts = readDraftsFromStorage();
  const index = drafts.findIndex(item => item.id === draft.id);

  if (index === -1) {
    drafts.push(draft);
  } else {
    drafts[index] = draft;
  }

  persistDrafts(drafts);
};

export const clearDraftsStorage = (): void => {
  persistDrafts([]);
};

export const getDraftStorageKey = (): string => STORAGE_KEY;
