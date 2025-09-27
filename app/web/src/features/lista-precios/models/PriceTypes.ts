export interface Column {
  id: string;
  name: string;
  mode: 'fixed' | 'volume';
  visible: boolean;
  isBase: boolean;
  order: number;
}

export interface Price {
  value: number;
  validFrom: string;
  validUntil: string;
}

export interface Product {
  sku: string;
  name: string;
  prices: Record<string, Price>;
}

export interface NewColumnForm {
  name: string;
  mode: 'fixed' | 'volume';
  visible: boolean;
  isBase: boolean;
}

export interface PriceForm {
  sku: string;
  columnId: string;
  value: string;
  validFrom: string;
  validUntil: string;
}

export interface Company {
  name: string;
  ruc: string;
}

export interface Module {
  name: string;
  icon: any;
}

export interface UserMenuOption {
  name: string;
  icon: any;
}