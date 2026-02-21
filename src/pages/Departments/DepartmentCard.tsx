import { Building2, Edit2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Department } from './types';

interface DepartmentCardProps {
  dept: Department;
  isAdminOrHR: boolean;
  getHeadName: (headId: string | null) => string;
  onEdit: (dept: Department) => void;
  onDelete: (dept: Department) => void;
}

export default function DepartmentCard({ dept, isAdminOrHR, getHeadName, onEdit, onDelete }: DepartmentCardProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex items-start gap-3">
        <div className={`p-2 sm:p-3 rounded-lg shrink-0 ${dept.type === 'academic' ? 'bg-primary-100' : 'bg-green-100'}`}>
          <Building2 className={`w-5 h-5 sm:w-6 sm:h-6 ${dept.type === 'academic' ? 'text-primary-900' : 'text-green-900'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">{dept.name}</h3>
            {isAdminOrHR && (
              <div className="flex shrink-0">
                <button
                  onClick={() => onEdit(dept)}
                  className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(dept)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${
            dept.type === 'academic' ? 'bg-primary-100 text-primary-800' : 'bg-green-100 text-green-800'
          }`}>
            {dept.type}
          </span>
          <p className="text-xs sm:text-sm text-gray-600 mt-2 break-words">{dept.description}</p>
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 space-y-1">
            <p className="text-xs sm:text-sm text-gray-500">
              {t('departments.head')}: <span className="font-medium text-gray-900">{getHeadName(dept.head_id)}</span>
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              {t('departments.employees')}: <span className="font-medium text-gray-900">{dept.employees?.[0]?.count || 0}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
