import {
  FileText,
  ShoppingCart,
  Folder,
  Users,
  Package,
  Tag as Boxes,
  DollarSign,
  Wallet,
  Receipt,
  CircleDollarSign,
  CreditCard,
  BarChart3,
  Coins
} from 'lucide-react';
import type { ReactElement } from 'react';

/**
 * Mapea nombres de iconos a componentes de Lucide React
 * @param iconName - Nombre del icono como string
 * @param size - Tamaño del icono (default: 20)
 * @returns Componente JSX del icono
 */
export const getIconComponent = (iconName: string, size: number = 20): ReactElement => {
  const icons: Record<string, ReactElement> = {
    FileText: <FileText size={size} />,
    ShoppingCart: <ShoppingCart size={size} />,
    Folder: <Folder size={size} />,
    Users: <Users size={size} />,
    Package: <Package size={size} />,
    Boxes: <Boxes size={size} />,
    DollarSign: <DollarSign size={size} />,
    Wallet: <Wallet size={size} />,
    Receipt: <Receipt size={size} />,
    CircleDollarSign: <CircleDollarSign size={size} />,
    CreditCard: <CreditCard size={size} />,
    BarChart3: <BarChart3 size={size} />,
    Coins: <Coins size={size} />
  };
  
  return icons[iconName] || <FileText size={size} />;
};
