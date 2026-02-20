const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  'on-leave': 'bg-yellow-100 text-yellow-800',
  pending: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  present: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  late: 'bg-yellow-100 text-yellow-800',
  'half-day': 'bg-gray-100 text-gray-800',
  academic: 'bg-primary-100 text-primary-800',
  administrative: 'bg-green-100 text-green-800',
  'full-time': 'bg-primary-100 text-primary-800',
  'part-time': 'bg-purple-100 text-purple-800',
  contract: 'bg-orange-100 text-orange-800',
  intern: 'bg-teal-100 text-teal-800',
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export default function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const colors = statusColors[status] || 'bg-gray-100 text-gray-800';
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${colors} ${className}`}>
      {label || status}
    </span>
  );
}
