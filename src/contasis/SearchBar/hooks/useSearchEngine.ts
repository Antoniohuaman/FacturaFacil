import { useState, useCallback, useMemo } from 'react';
import type { SearchDataset, SearchSection, SearchDisplayItem, SearchCandidate } from '../types/search.types';
import { tokenizeQuery, extractNumericQuery } from '../utils/searchAlgorithm';
import { computeTextScore, computeNumericScore } from '../utils/highlighting';

const SECTION_LIMIT = 5;

const mapDatasetItemToCandidate = <T,>(item: unknown): SearchCandidate<T> => {
  const itemData = item as Record<string, unknown>;
  const metaText = itemData.meta ? Object.entries(itemData.meta as Record<string, unknown>)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join(' • ') : undefined;

  const searchFields = [
    { value: itemData.label as string, weight: 160, isKey: true },
    itemData.secondary ? { value: itemData.secondary as string, weight: 130 } : null,
    itemData.description ? { value: itemData.description as string, weight: 110 } : null,
    itemData.haystack ? { value: itemData.haystack as string, weight: 80 } : null,
    ...((itemData.keywords as Array<{value: string; weight: number}>) ?? []),
  ].filter((field): field is { value: string; weight: number; isKey?: boolean } => Boolean(field && field.value));

  const numericFields = [
    ...(typeof itemData.amountValue === 'number' ? [{ value: itemData.amountValue, weight: 100 }] : []),
    ...((itemData.numericValues as Array<{value: number; weight: number}>) ?? []),
  ];

  return {
    id: itemData.id as string,
    entity: itemData.entity as T,
    title: itemData.label as string,
    subtitle: itemData.secondary as string | undefined,
    meta: metaText,
    amountLabel: itemData.amountLabel as string | undefined,
    amountValue: itemData.amountValue as number | undefined,
    amountCurrency: itemData.amountCurrency as string | undefined,
    searchFields,
    numericFields: numericFields.length ? numericFields : undefined,
  };
};

const buildSearchSection = <T,>(
  type: string,
  items: unknown[],
  tokens: string[],
  numericQuery: string
) => {
  if (!tokens.length && !numericQuery) {
    return { items: [], total: 0, hasMore: false };
  }

  const scored = items
    .map((item) => {
      const candidate = mapDatasetItemToCandidate<T>(item);
      const textScore = candidate.searchFields.reduce((score, field) => (
        score + computeTextScore(field.value, tokens, field.weight, field.isKey)
      ), 0);
      const numericScore = (candidate.numericFields ?? []).reduce(
        (score, field) => score + computeNumericScore(field.value, numericQuery, field.weight),
        0
      );
      const totalScore = textScore + numericScore;
      if (totalScore <= 0) {
        return null;
      }
      const { searchFields: omitSearchFields, numericFields: omitNumericFields, ...display } = candidate;
      void omitSearchFields;
      void omitNumericFields;
      return {
        ...display,
        type,
        score: totalScore,
      } as SearchDisplayItem<T>;
    })
    .filter((item): item is SearchDisplayItem<T> => Boolean(item))
    .sort((a, b) => b.score - a.score);

  return {
    items: scored.slice(0, SECTION_LIMIT),
    total: scored.length,
    hasMore: scored.length > SECTION_LIMIT,
  };
};

export const useSearchEngine = (datasets: SearchDataset[] = []) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const queryTokens = useMemo(() => tokenizeQuery(searchQuery), [searchQuery]);
  const numericQuery = useMemo(() => extractNumericQuery(searchQuery.trim()), [searchQuery]);
  const shouldSearch = queryTokens.length > 0 || numericQuery.length > 0;

  const searchSections = useMemo(() => {
    if (!shouldSearch) {
      return {};
    }

    const sections: Record<string, SearchSection> = {};

    datasets.forEach((dataset) => {
      const section = buildSearchSection(
        dataset.key,
        dataset.items,
        queryTokens,
        numericQuery
      );
      sections[dataset.key] = {
        ...section,
        title: dataset.title,
        routeBase: dataset.routeBase,
      };
    });

    return sections;
  }, [shouldSearch, datasets, queryTokens, numericQuery]);

  const totalResultsCount = useMemo(
    () => Object.values(searchSections).reduce((sum, section) => sum + section.total, 0),
    [searchSections]
  );

  const hasResults = totalResultsCount > 0;
  const hasSearchText = searchQuery.trim().length > 0;

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchSections,
    totalResultsCount,
    hasResults,
    hasSearchText,
    shouldSearch,
    clearSearch,
  };
};