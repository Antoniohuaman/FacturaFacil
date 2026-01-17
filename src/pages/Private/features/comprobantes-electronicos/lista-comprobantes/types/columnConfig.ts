export interface ColumnConfig {
  id: string;
  key: string;
  label: string;
  visible: boolean;
  fixed: 'left' | 'right' | null;
  align: 'left' | 'right' | 'center';
  truncate?: boolean;
  minWidth?: string;
  maxWidth?: string;
  shrink?: number;
  whiteSpace?: string;
  flex?: string;
  width?: string;
}
