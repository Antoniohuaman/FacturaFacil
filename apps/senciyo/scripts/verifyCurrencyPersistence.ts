export {};

class LocalStorageMock implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const storage: Storage = new LocalStorageMock();
const globalWithStorage = globalThis as typeof globalThis & {
  window?: Window & typeof globalThis;
  localStorage?: Storage;
};

if (!globalWithStorage.window) {
  globalWithStorage.window = globalWithStorage as Window & typeof globalThis;
}

globalWithStorage.localStorage = storage;
globalWithStorage.window.localStorage = storage;

const { currencyManager } = await import('../src/shared/currency/currencyManager.ts');
const { loadCurrencyState } = await import('../src/shared/currency/currencyStorage.ts');
const { ISO_CODE_USD } = await import('../src/shared/currency/constants.ts');

const initialState = loadCurrencyState();
console.log('initial-base', initialState.baseCurrencyCode);
console.log('initial-currencies', initialState.currencies.map((c) => `${c.code}:${c.isBaseCurrency}`).join(','));

currencyManager.setBaseCurrency(ISO_CODE_USD);
const afterUpdate = loadCurrencyState();
console.log('after-base', afterUpdate.baseCurrencyCode);
console.log('after-currencies', afterUpdate.currencies.map((c) => `${c.code}:${c.isBaseCurrency}`).join(','));
