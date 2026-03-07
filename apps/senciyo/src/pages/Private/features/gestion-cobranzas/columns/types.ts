export interface TableColumnDefinition<K extends string = string> {
  key: K;
  label: string;
  defaultVisible: boolean;
  fixed?: boolean | string | null;
  headerClassName?: string;
  cellClassName?: string;
}

export type TableColumnState<K extends string = string> = Omit<TableColumnDefinition<K>, 'defaultVisible'> & {
  visible: boolean;
};
