import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import ReactDOM from 'react-dom';

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
  const navigate = useNavigate();
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>(clients);

  // Sincronizar el estado local con las props cuando cambien
  useEffect(() => {
    setClientes(clients);
  }, [clients]);

  const handleToggleEnabled = (id: number) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
    setMenuOpenId(null);
  };
  const handleEdit = (client: Cliente) => {
    alert(`Editar cliente: ${client.name}`);
    setMenuOpenId(null);
  };
  const handleDelete = (id: number) => {
    setClientes(prev => prev.filter(c => c.id !== id));
    setMenuOpenId(null);
  };

  const handleOptionsClick = (id: number) => {
    setMenuOpenId(menuOpenId === id ? null : id);
  };
  return (
    <>
      <style>{`
        .row-disabled { opacity: 0.5; }
        .menu-popup {
          opacity: 1 !important;
          filter: none !important;
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          min-width: 10rem;
          z-index: 100;
          pointer-events: auto;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          background: #fff;
          transition: opacity 0.15s;
        }
        .menu-popup-arrow {
          position: absolute; top: -8px; right: 16px; width: 16px; height: 8px;
          overflow: hidden;
        }
        .menu-popup-arrow svg { display: block; }
      `}</style>
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-w-full xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-700 text-sm">
                  <div className="flex items-center gap-2">
                    <span>Nombre / Razón Social</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                </th>
                <th className="text-left px-4 py-2 font-medium text-gray-700 text-sm">
                  <div className="flex items-center gap-2">
                    <span>Documento</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                </th>
                <th className="text-left px-4 py-2 font-medium text-gray-700 text-sm">
                  <div className="flex items-center gap-2">
                    <span>Tipo</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M4 7h16M4 12h16M4 17h16" />
                    </svg>
                  </div>
                </th>
                <th className="text-left px-4 py-2 font-medium text-gray-700 text-sm">
                  <div className="flex items-center gap-2 w-[120px]">
                    <span>Dirección</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                </th>
                <th className="text-left px-4 py-2 font-medium text-gray-700 text-sm">
                  <div className="flex items-center gap-2">
                    <span>Teléfono</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                </th>
                <th className="text-right px-4 py-2 font-medium text-gray-700 text-sm">&nbsp;</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clientes.map(client => (
                <tr key={client.id} className={`hover:bg-gray-50 transition-colors${!client.enabled ? ' row-disabled' : ''}`}>
                  <td className="px-4 py-2 text-sm text-gray-900 font-medium break-words whitespace-normal">{client.name}</td>
                  <td className="px-4 py-2 text-sm break-words whitespace-normal">{client.document}</td>
                  <td className="px-4 py-2 text-sm break-words whitespace-normal">{client.type}</td>
                  <td className="px-4 py-2 text-sm break-words whitespace-normal">{client.address}</td>
                  <td className="px-4 py-2 text-sm break-words whitespace-normal">{client.phone}</td>
                  <td className="px-4 py-2 text-right relative flex items-center gap-2">
                    <button
                      className="group p-1 rounded focus:outline-none"
                      title="Historial"
                      onClick={() => navigate(`/clientes/${client.id}/${encodeURIComponent(client.name)}/historial`)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500 hover:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    </button>
                    <div className="relative" style={{ display: 'inline-block' }}>
                      <button
                        className="group p-1 rounded focus:outline-none"
                        title="Opciones"
                        onClick={() => handleOptionsClick(client.id)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-700 hover:text-black transition-colors" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="5" cy="12" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="19" cy="12" r="2" />
                        </svg>
                      </button>
                      {menuOpenId === client.id && (
                        <div className="menu-popup" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 100 }}>
                          <span className="menu-popup-arrow">
                            <svg width="16" height="8">
                              <polygon points="0,8 8,0 16,8" fill="#fff" stroke="#e5e7eb" strokeWidth="1" />
                            </svg>
                          </span>
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                            onClick={() => handleToggleEnabled(client.id)}
                          >
                            {client.enabled ? 'Deshabilitar' : 'Habilitar'}
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                            onClick={() => handleEdit(client)}
                          >
                            Editar
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-red-100 text-red-600"
                            onClick={() => handleDelete(client.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
  </>
  );
};
export default ClientesTable;
