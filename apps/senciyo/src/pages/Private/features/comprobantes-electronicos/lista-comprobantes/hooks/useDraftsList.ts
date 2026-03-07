import { useCallback, useEffect, useState } from 'react';
import type { Draft } from '../mockData/drafts.mock';
import {
  duplicateDraftInStorage,
  getDraftStorageKey,
  readDraftsFromStorage,
  removeDraftFromStorage
} from '../../shared/drafts/draftStorage';
import { mapDraftCollection } from '../utils/draftMapper';

interface UseDraftsListOptions {
  fallbackVendor?: string;
}

export const useDraftsList = ({ fallbackVendor }: UseDraftsListOptions = {}) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const refreshDrafts = useCallback(() => {
    const storedDrafts = readDraftsFromStorage();
    const mappedDrafts = mapDraftCollection(storedDrafts, { fallbackVendor });
    setDrafts(mappedDrafts);
  }, [fallbackVendor]);

  const duplicateDraft = useCallback((draftId: string) => {
    const duplicate = duplicateDraftInStorage(draftId);
    if (duplicate) {
      refreshDrafts();
    }
    return duplicate;
  }, [refreshDrafts]);

  const deleteDraft = useCallback((draftId: string) => {
    removeDraftFromStorage(draftId);
    refreshDrafts();
  }, [refreshDrafts]);

  useEffect(() => {
    refreshDrafts();
  }, [refreshDrafts]);

  useEffect(() => {
    const storageKey = getDraftStorageKey();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        refreshDrafts();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshDrafts]);

  return {
    drafts,
    refreshDrafts,
    duplicateDraft,
    deleteDraft
  };
};
