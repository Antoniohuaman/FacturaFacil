// src/features/catalogo-articulos/components/PageHeader.tsx

interface PageHeaderProps {
  title: string;
  icon?: React.ReactNode;
}

export function PageHeader({ title, icon }: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 py-4 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center space-x-3">
        {icon && (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1478D4' }}>
            {icon}
          </div>
        )}
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">{title}</h1>
      </div>
    </div>
  );
}

export default PageHeader;
