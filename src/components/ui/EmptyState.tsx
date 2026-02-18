import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  icon?: LucideIcon;
  title?: string;
  action?: ReactNode;
}

export default function EmptyState({ message, icon: Icon, title, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {Icon && <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />}
      {title && <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>}
      <p className="text-gray-500">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
