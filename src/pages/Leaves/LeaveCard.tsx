import { useTranslation } from 'react-i18next';
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { Leave } from './types';

interface LeaveCardProps {
  leave: Leave;
  userRole: string | undefined;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export default function LeaveCard({ leave, userRole, onApprove, onReject }: LeaveCardProps) {
  const { t } = useTranslation();

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4 flex-1">
          <div className="bg-blue-100 p-3 rounded-lg">
            <Calendar className="w-6 h-6 text-blue-900" />
          </div>
          <div className="flex-1">
            {userRole !== 'staff' && (
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-900">
                  {leave.employees?.first_name} {leave.employees?.last_name}
                </p>
                <p className="text-xs text-gray-500">{leave.employees?.employee_number}</p>
              </div>
            )}
            <div className="flex items-center space-x-4 mb-2">
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                {t(`leaves.${leave.leave_type}`)}
              </span>
              <span className="text-sm text-gray-600">
                {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
              </span>
              <span className="text-sm text-gray-600">{leave.days_count} {t('common.days')}</span>
            </div>
            <p className="text-sm text-gray-700">{leave.reason}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`flex items-center space-x-1 px-3 py-1 text-sm font-medium rounded-full ${
            leave.status === 'approved'
              ? 'bg-green-100 text-green-800'
              : leave.status === 'rejected'
              ? 'bg-red-100 text-red-800'
              : 'bg-orange-100 text-orange-800'
          }`}>
            {leave.status === 'approved' ? (
              <CheckCircle className="w-4 h-4" />
            ) : leave.status === 'rejected' ? (
              <XCircle className="w-4 h-4" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            <span>{leave.status}</span>
          </span>
          {(userRole === 'admin' || userRole === 'hr') && leave.status === 'pending' && (
            <div className="flex space-x-2">
              <button
                onClick={() => onApprove(leave.id)}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                <CheckCircle className="w-5 h-5" />
              </button>
              <button
                onClick={() => onReject(leave.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
