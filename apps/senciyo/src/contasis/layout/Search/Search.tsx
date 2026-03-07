import { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';

export interface SearchProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export const Search = ({ placeholder = "Buscar...", value = "", onChange }: SearchProps) => {
  const [searchValue, setSearchValue] = useState(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    onChange?.(newValue);
  };

  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon className="h-4 w-4 text-secondary" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-3 py-2.5 border border-[color:var(--border-default)] rounded-lg placeholder-secondary bg-surface-0 text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
        placeholder={placeholder}
        value={searchValue}
        onChange={handleChange}
      />
    </div>
  );
};