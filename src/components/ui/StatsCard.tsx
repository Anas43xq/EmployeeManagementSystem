import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  Icon: LucideIcon;
  iconClassName?: string;
  iconBg?: string;
  valueClassName?: string;
  className?: string;
}

export default function StatsCard({
  label,
  value,
  Icon,
  iconClassName = 'w-8 h-8 text-gray-400',
  iconBg,
  valueClassName = 'text-2xl font-bold text-gray-900',
  className = 'p-4',
}: StatsCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-600 mb-1 truncate">{label}</p>
          <p className={valueClassName}>{value}</p>
        </div>
        {iconBg ? (
          <div className={`${iconBg} p-2 sm:p-3 rounded-lg shrink-0`}>
            <Icon className={iconClassName} />
          </div>
        ) : (
          <Icon className={`${iconClassName} shrink-0`} />
        )}
      </div>
    </div>
  );
}
