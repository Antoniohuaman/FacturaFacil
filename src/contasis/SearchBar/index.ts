export { SearchBar } from './SearchBar';
export type { 
  SearchBarProps, 
  SearchDataset, 
  SearchDisplayItem, 
  SearchSection,
  HighlightPart,
} from './types/search.types';
export { useSearchEngine } from './hooks/useSearchEngine';
export { useHighlight } from './hooks/useHighlight';
export { SearchInput } from './components/SearchInput';
export { SearchResultsDropdown } from './components/SearchResultsDropdown';
export { ResultItem } from './components/ResultItem';
export { buildRichHaystack } from './utils/searchAlgorithm';