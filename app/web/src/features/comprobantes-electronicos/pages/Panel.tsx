import { useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";

type Item = {
  id: string;
  tipo: string;
  serie: string;
  numero: string;
  fecha: string;
  proveedor: string;
  total: number;
};

const MOCK: Item[] = Array.from({ length: 20 }).map((_, i) => ({
  id: `FN01-${(36372613 + i).toString()}`,
  tipo: "01",
  serie: "FN01",
  numero: (i + 1).toString().padStart(6, "0"),
  fecha: `2025-09-${(i % 30) + 1}`.replace(/-(\d)$/, "-0$1"),
  proveedor: "20100047218",
  total: 16.3 + i,
}));

export default function ComprobantesPanel() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const filtered = useMemo(
    () => MOCK.filter(it => it.id.toLowerCase().includes(q.toLowerCase())),
    [q]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  const [selected, setSelected] = useState<Item | null>(pageItems[0] ?? null);

  // si cambias de página, resetea selección a primer item visible
  function go(p: number) {
    const next = Math.min(Math.max(1, p), totalPages);
    setPage(next);
    const base = filtered.slice((next - 1) * pageSize, (next - 1) * pageSize + pageSize);
    setSelected(base[0] ?? null);
  }

  return (
    <div className="p-4">
      {/* TOOLBAR superior (breadcrumbs + paginador a la derecha) */}
      <div className="flex items-center gap-3 mb-3">
        <div className="text-xs text-slate-500">breadcrumbs</div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => go(page - 1)} className="p-1.5 rounded border bg-white hover:bg-slate-50">
            <ChevronLeft size={16} />
          </button>
          <div className="text-xs text-slate-600">
            Página <span className="font-medium">{page}</span> / {totalPages}
          </div>
          <button onClick={() => go(page + 1)} className="p-1.5 rounded border bg-white hover:bg-slate-50">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* GRID principal: izquierda (lista + asientos) | derecha (preview) */}
      <div className="grid grid-cols-12 gap-4">
        {/* COLUMNA IZQUIERDA */}
        <div className="col-span-5 flex flex-col min-h-[70vh]">
          {/* LISTA */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex-1 flex flex-col">
            <div className="px-3 py-2 border-b bg-slate-50 flex items-center gap-3">
              <div className="font-semibold text-sm">LISTA DE ÍTEMS</div>
              <div className="ml-auto flex items-center gap-2">
                <div className="relative">
                  <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={q}
                    onChange={e => { setQ(e.target.value); setPage(1); }}
                    placeholder="Buscar..."
                    className="pl-7 pr-2 py-1.5 rounded border text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-100">
                  <tr className="text-left text-slate-600">
                    <th className="px-3 py-2 w-24">Tipo</th>
                    <th className="px-3 py-2 w-28">Serie</th>
                    <th className="px-3 py-2">Documento</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2 text-right w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map(it => {
                    const isSel = selected?.id === it.id;
                    return (
                      <tr
                        key={it.id}
                        onClick={() => setSelected(it)}
                        className={`cursor-pointer hover:bg-slate-50 ${isSel ? "bg-blue-50" : ""}`}
                      >
                        <td className="px-3 py-2">{it.tipo}</td>
                        <td className="px-3 py-2">{it.serie}</td>
                        <td className="px-3 py-2 text-slate-800 font-medium">{it.id}</td>
                        <td className="px-3 py-2">{it.fecha}</td>
                        <td className="px-3 py-2 text-right">PEN {(it.total).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ASIENTOS CONTABLES */}
          <div className="mt-4 bg-white border border-slate-200 rounded-lg p-3">
            <div className="font-semibold text-sm mb-1">ASIENTO CONTABLES DE LOS ÍTEMS</div>
            <div className="text-xs text-slate-500 mb-2">
              (Los asientos contables estarán establecidos por la IA)
            </div>
            <div className="h-28 rounded border border-dashed grid place-items-center text-slate-400 text-xs">
              Aquí se mostrarán los asientos del ítem seleccionado.
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA (PREVIEW) */}
        <div className="col-span-7 flex flex-col min-h-[70vh]">
          {/* Encabezado del preview */}
          <div className="bg-white border border-slate-200 rounded-lg flex-1 flex flex-col">
            <div className="px-3 py-2 border-b bg-slate-50 text-xs text-slate-600 flex items-center">
              <div className="truncate">
                {selected ? `/2025/Nov/Compras/${selected.id}` : "/—"}
              </div>
              <div className="ml-auto">DOC / XML</div>
            </div>
            {/* Preview */}
            <div className="flex-1 grid place-items-center text-slate-400">
              <div className="text-center">
                <div className="font-semibold text-slate-700">PREVIEW</div>
                <div className="text-xs">de documentos digitales</div>
              </div>
            </div>
          </div>

          {/* BALANCE DE COMPROBACIÓN (full width de la columna derecha) */}
          <div className="mt-4 bg-white border border-slate-200 rounded-lg p-3">
            <div className="flex items-center">
              <div className="font-semibold text-sm">BALANCE DE COMPROBACIÓN</div>
              <button className="ml-auto p-1.5 rounded border hover:bg-slate-50" title="Full screen">
                <Maximize2 size={16} />
              </button>
            </div>
            <div className="h-24 mt-2 rounded border border-dashed grid place-items-center text-slate-400 text-xs">
              Se actualizará después de aprobar cada asiento.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
