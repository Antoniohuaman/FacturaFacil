import React from 'react';

export type Cliente = {
  id: number;
  name: string;
  document: string;
  type: string;
  address: string;
  phone: string;
  enabled: boolean;
};

export type ClientesTableProps = {
  clients: Cliente[];
};

const ClientesTable: React.FC<ClientesTableProps> = ({ clients }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ maxWidth: '1320px' }}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700 text-sm">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700 text-sm">Documento</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700 text-sm">Tipo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700 text-sm">Dirección</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700 text-sm">Teléfono</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {clients.map((client) => (
              <tr key={client.id} className={`hover:bg-gray-50 transition-colors ${!client.enabled ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">{client.name}</td>
                <td className="px-4 py-3">{client.document}</td>
                <td className="px-4 py-3">{client.type}</td>
                <td className="px-4 py-3">{client.address}</td>
                <td className="px-4 py-3">{client.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No se encontraron clientes</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientesTable;
