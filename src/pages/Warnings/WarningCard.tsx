import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, Check, CheckCircle, Trash2 } from 'lucide-react';
import type { EmployeeWarning } from './types';
import { severityColors, statusColors } from './types';

interface WarningCardProps {
  warning: EmployeeWarning;
  isStaff: boolean;
  onAcknowledge?: (warningId: string) => void;
  onResolve?: (warning: EmployeeWarning) => void;
  onDelete?: (warningId: string) => void;
}

export default function WarningCard({
  warning,
  isStaff,
  onAcknowledge,
  onResolve,
  onDelete,
}: WarningCardProps) {
  const { t } = useTranslation();
  const employeeName = warning.employees
    ? `${warning.employees.first_name} ${warning.employees.last_name}`
    : 'Unknown';
  const issuedByName = warning.issued_by_user?.employees
    ? `${warning.issued_by_user.employees.first_name} ${warning.issued_by_user.employees.last_name}`
    : 'System';

  return (
    <div className={`bg-white border rounded-lg p-3 sm:p-4 overflow-hidden ${
      warning.status === 'active' ? 'border-red-300 bg-red-50' : 'border-gray-200'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <AlertTriangle className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${
              warning.severity === 'critical' ? 'text-red-600' :
              warning.severity === 'major' ? 'text-red-500' :
              warning.severity === 'moderate' ? 'text-orange-500' : 'text-yellow-500'
            }`} />
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base break-words">{warning.reason}</h3>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${severityColors[warning.severity]}`}>
              {t(`warnings.severity.${warning.severity}`)}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[warning.status]}`}>
              {t(`warnings.status.${warning.status}`)}
            </span>
          </div>

          {warning.description && (
            <p className="text-xs sm:text-sm text-gray-600 mb-3 break-words">{warning.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
            {!isStaff && (
              <div className="flex items-center gap-1">
                <span className="font-medium">{t('warnings.employee')}:</span>
                <span className="truncate max-w-[120px]">{employeeName}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="font-medium">{t('warnings.issuedBy')}:</span>
              <span className="truncate max-w-[100px]">{issuedByName}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">{t('common.date')}:</span>
              <span>{format(parseISO(warning.created_at), 'MMM d, yyyy')}</span>
            </div>
          </div>

          {warning.resolution_notes && (
            <div className="mt-3 p-2 sm:p-3 bg-blue-50 rounded-lg">
              <p className="text-xs sm:text-sm text-blue-800 break-words">
                <span className="font-medium">{t('warnings.resolutionNotes')}:</span> {warning.resolution_notes}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Employee actions */}
          {isStaff && warning.status === 'active' && onAcknowledge && (
            <button
              onClick={() => onAcknowledge(warning.id)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-primary-100 text-primary-800 hover:bg-primary-200"
            >
              <Check className="w-3 h-3" />
              <span className="hidden sm:inline">{t('warnings.acknowledge')}</span>
            </button>
          )}

          {/* Admin/HR actions */}
          {!isStaff && (
            <>
              {warning.status !== 'resolved' && onResolve && (
                <button
                  onClick={() => onResolve(warning)}
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title={t('warnings.resolve')}
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(warning.id)}
                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('common.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
