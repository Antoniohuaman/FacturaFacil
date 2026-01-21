export interface SearchFieldDescriptor {
  value?: string | null;
  weight: number;
  isKey?: boolean;
}

export interface NumericFieldDescriptor {
  value?: number | null;
  weight: number;
}

export interface SearchDisplayItem<T = any> {
  type: string;
  id: string;
  entity: T;
  title: string;
  subtitle?: string;
  meta?: string;
  amountLabel?: string;
  amountValue?: number;
  amountCurrency?: string;
  score: number;
}

export interface SearchCandidate<T = any> extends Omit<SearchDisplayItem<T>, 'type' | 'score'> {
  searchFields: SearchFieldDescriptor[];
  numericFields?: NumericFieldDescriptor[];
}

export interface SectionResults<T = any> {
  items: Array<SearchDisplayItem<T>>;
  total: number;
  hasMore: boolean;
}

export interface SearchSection<T = any> extends SectionResults<T> {
  title: string;
  routeBase: string | null;
}

export interface SearchDatasetItem<T = any> {
  id: string;
  label: string;
  secondary?: string;
  description?: string;
  haystack: string;
  meta?: Record<string, string | number | undefined>;
  amountLabel?: string;
  amountValue?: number;
  amountCurrency?: string;
  route?: string;
  entity: T;
  keywords?: SearchFieldDescriptor[];
  numericValues?: NumericFieldDescriptor[];
}

export interface SearchDataset<T = any> {
  key: string;
  title: string;
  routeBase: string | null;
  items: Array<SearchDatasetItem<T>>;
}

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSelect?: (type: string, item: any) => void;
  datasets?: SearchDataset[];
  maxResults?: number;
  className?: string;
  showCommandPalette?: boolean;
  onOpenCommandPalette?: () => void;
  commandPaletteShortcut?: string;
}

export interface HighlightPart {
  text: string;
  match: boolean;
}