export default function Header() {
  return (
    <header className="h-12 bg-white border-b border-slate-200 flex items-center px-4">
  <div className="text-3xl font-bold flex items-center">
        <span className="text-blue-800">Factura</span>
        <span className="text-orange-600 ml-2">Fácil</span>
      </div>
      <div className="ml-auto text-xs text-slate-500">Img Profile de Conectados</div>
    </header>
  );
}
