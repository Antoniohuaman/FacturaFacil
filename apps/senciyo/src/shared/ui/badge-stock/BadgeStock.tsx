interface BadgeStockProps {
  stock: number;
}

export default function BadgeStock({ stock }: BadgeStockProps) {
  const tono =
    stock > 20 ? 'bg-green-100 text-green-800' : stock > 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';

  return <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${tono}`}>{stock}</span>;
}
