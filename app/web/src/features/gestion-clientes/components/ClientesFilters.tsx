import React from 'react';

export type ClientesFiltersType = {
  name: string;
  document: string;
  type: string;
  address: string;
  phone: string;
};

export type ClientesFiltersProps = {
  filters: ClientesFiltersType;
  onChange: (field: keyof ClientesFiltersType, value: string) => void;
};

const ClientesFilters: React.FC<ClientesFiltersProps> = ({ filters, onChange }) => {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <input
        type="text"
        value={filters.name}
        onChange={e => onChange('name', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        placeholder="Buscar por nombre"
      />
      <input
        type="text"
        value={filters.document}
        onChange={e => onChange('document', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        placeholder="Buscar por documento"
      />
      <input
        type="text"
        value={filters.type}
        onChange={e => onChange('type', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        placeholder="Buscar por tipo"
      />
      <input
        type="text"
        value={filters.address}
        onChange={e => onChange('address', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        placeholder="Buscar por dirección"
      />
      <input
        type="text"
        value={filters.phone}
        onChange={e => onChange('phone', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        placeholder="Buscar por teléfono"
      />
    </div>
  );
};

export default ClientesFilters;
