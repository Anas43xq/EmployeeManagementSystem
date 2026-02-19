import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, Check, CheckCircle, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui';
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
    <div className={`bg-white border rounded-lg p-4 ${
      warning.status === 'active' ? 'border-red-300 bg-red-50' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-5 h-5 ${
              warning.severity === 'critical' ? 'text-red-600' :
              warning.severity === 'major' ? 'text-red-500' :
              warning.severity === 'moderate' ? 'text-orange-500' : 'text-yellow-500'
            }`} />
            <h3 className="font-semibold text-gray-900">{warning.reason}</h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${severityColors[warning.severity]}`}>
              {t(`warnings.severity.${warning.severity}`)}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[warning.status]}`}>
              {t(`warnings.status.${warning.status}`)}
            </span>
          </div>

          {warning.description && (
            <p className="text-sm text-gray-600 mb-3">{warning.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {!isStaff && (
              <div className="flex items-center gap-1">
                <span className="font-medium">{t('warnings.employee')}:</span>
                <span>{employeeName}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="font-medium">{t('warnings.issuedBy')}:</span>
              <span>{issuedByName}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">{t('common.date')}:</span>
              <span>{format(parseISO(warning.created_at), 'MMM d, yyyy')}</span>
            </div>
          </div>

          {warning.resolution_notes && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <span className="font-medium">{t('warnings.resolutionNotes')}:</span> {warning.resolution_notes}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          {/* Employee actions */}
          {isStaff && warning.status === 'active' && onAcknowledge && (
            <Button
              onClick={() => onAcknowledge(warning.id)}
              icon={<Check className="w-4 h-4" />}
            >
              {t('warnings.acknowledge')}
            </Button>
          )}

          {/* Admin/HR actions */}
          {!isStaff && (
            <>
              {warning.status !== 'resolved' && onResolve && (
                <Button
                  variant="secondary"
                  onClick={() => onResolve(warning)}
                  icon={<CheckCircle className="w-4 h-4" />}
                >
                  {t('warnings.resolve')}
                </Button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(warning.id)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
