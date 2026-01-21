import { useState, useCallback, useMemo } from 'react';
import type { SearchDataset, SearchSection, SearchDisplayItem, SearchCandidate } from '../types/search.types';
import { tokenizeQuery, extractNumericQuery } from '../utils/searchAlgorithm';
import { computeTextScore, computeNumericScore } from '../utils/highlighting';

const SECTION_LIMIT = 5;

const mapDatasetItemToCandidate = <T,>(item: any): SearchCandidate<T> => {
  const metaText = item.meta ? Object.entries(item.meta)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join(' • ') : undefined;

  const searchFields = [
    { value: item.label, weight: 160, isKey: true },
    item.secondary ? { value: item.secondary, weight: 130 } : null,
    item.description ? { value: item.description, weight: 110 } : null,
    item.haystack ? { value: item.haystack, weight: 80 } : null,
    ...(item.keywords ?? []),
  ].filter((field): field is any => Boolean(field && field.value));

  const numericFields = [
    ...(typeof item.amountValue === 'number' ? [{ value: item.amountValue, weight: 100 }] : []),
    ...(item.numericValues ?? []),
  ];

  return {
    id: item.id,
    entity: item.entity,
    title: item.label,
    subtitle: item.secondary,
    meta: metaText,
    amountLabel: item.amountLabel,
    amountValue: item.amountValue,
    amountCurrency: item.amountCurrency,
    searchFields,
    numericFields: numericFields.length ? numericFields : undefined,
  };
};

const buildSearchSection = <T,>(
  type: string,
  items: any[],
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