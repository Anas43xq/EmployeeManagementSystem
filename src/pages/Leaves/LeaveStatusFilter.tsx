import { useTranslation } from 'react-i18next';

interface LeaveStatusFilterProps {
  filter: string;
  setFilter: (f: string) => void;
}

export default function LeaveStatusFilter({ filter, setFilter }: LeaveStatusFilterProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
      <button
        onClick={() => setFilter('all')}
        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium ${
          filter === 'all' ? 'bg-primary-900 text-white' : 'bg-gray-100 text-gray-700'
        }`}
      >
        {t('leaves.all')}
      </button>
      <button
        onClick={() => setFilter('pending')}
        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium ${
          filter === 'pending' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'
        }`}
      >
        {t('leaves.pending')}
      </button>
      <button
        onClick={() => setFilter('approved')}
        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium ${
          filter === 'approved' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'
        }`}
      >
        {t('leaves.approved')}
      </button>
      <button
        onClick={() => setFilter('rejected')}
        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium ${
          filter === 'rejected' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'
        }`}
      >
        {t('leaves.rejected')}
      </button>
    </div>
  );
}
