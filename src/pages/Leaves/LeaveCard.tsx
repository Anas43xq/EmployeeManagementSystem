import { useTranslation } from 'react-i18next';
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { Leave } from './types';

interface LeaveCardProps {
  leave: Leave;
  userRole: string | undefined;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  processingLeaves?: Set<string>;
}

export default function LeaveCard({ leave, userRole, onApprove, onReject, processingLeaves }: LeaveCardProps) {
  const { t } = useTranslation();
  const isProcessing = processingLeaves?.has(leave.id) || false;

  return (
    <div className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-sm transition-shadow overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="bg-primary-100 p-2 sm:p-3 rounded-lg shrink-0">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary-900" />
          </div>
          <div className="flex-1 min-w-0">
            {userRole !== 'staff' && (
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {leave.employees?.first_name} {leave.employees?.last_name}
                </p>
                <p className="text-xs text-gray-500">{leave.employees?.employee_number}</p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
                {t(`leaves.${leave.leave_type}`)}
              </span>
              <span className="text-xs sm:text-sm text-gray-600">
                {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
              </span>
              <span className="text-xs sm:text-sm text-gray-600">{leave.days_count} {t('common.days')}</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-700 break-words">{leave.reason}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
            leave.status === 'approved'
              ? 'bg-green-100 text-green-800'
              : leave.status === 'rejected'
              ? 'bg-red-100 text-red-800'
              : 'bg-orange-100 text-orange-800'
          }`}>
            {leave.status === 'approved' ? (
              <CheckCircle className="w-3 h-3" />
            ) : leave.status === 'rejected' ? (
              <XCircle className="w-3 h-3" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            <span className="capitalize">{leave.status}</span>
          </span>
          {(userRole === 'admin' || userRole === 'hr') && leave.status === 'pending' && (
            <div className="flex gap-1">
              <button
                onClick={() => onApprove(leave.id)}
                disabled={isProcessing}
                className={`p-1.5 rounded-lg transition-colors ${
                  isProcessing 
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => onReject(leave.id)}
                disabled={isProcessing}
                className={`p-1.5 rounded-lg transition-colors ${
                  isProcessing 
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                    : 'text-red-600 hover:bg-red-50'
                }`}
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
