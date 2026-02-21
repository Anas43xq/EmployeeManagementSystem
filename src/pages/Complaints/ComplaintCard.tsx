import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { MessageSquare, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import type { EmployeeComplaint } from './types';
import { categoryColors, statusColors, priorityColors } from './types';

interface ComplaintCardProps {
  complaint: EmployeeComplaint;
  isStaff: boolean;
  onTakeReview?: (complaintId: string) => void;
  onResolve?: (complaint: EmployeeComplaint, action: 'resolved' | 'dismissed') => void;
  onDelete?: (complaintId: string) => void;
}

export default function ComplaintCard({
  complaint,
  isStaff,
  onTakeReview,
  onResolve,
  onDelete,
}: ComplaintCardProps) {
  const { t } = useTranslation();
  const employeeName = complaint.employees
    ? `${complaint.employees.first_name} ${complaint.employees.last_name}`
    : 'Unknown';
  const assignedToName = complaint.assigned_user?.employees
    ? `${complaint.assigned_user.employees.first_name} ${complaint.assigned_user.employees.last_name}`
    : null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <MessageSquare className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 break-words">{complaint.subject}</h3>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${categoryColors[complaint.category]}`}>
                  {t(`complaints.category.${complaint.category}`)}
                </span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityColors[complaint.priority]}`}>
                  {t(`complaints.priority.${complaint.priority}`)}
                </span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[complaint.status]}`}>
                  {t(`complaints.status.${complaint.status}`)}
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-3 break-words">{complaint.description}</p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {!isStaff && (
              <div className="flex items-center gap-1">
                <span className="font-medium">{t('complaints.submittedBy')}:</span>
                <span>{employeeName}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="font-medium">{t('common.date')}:</span>
              <span>{format(parseISO(complaint.created_at), 'MMM d, yyyy')}</span>
            </div>
            {assignedToName && (
              <div className="flex items-center gap-1">
                <span className="font-medium">{t('complaints.assignedTo')}:</span>
                <span>{assignedToName}</span>
              </div>
            )}
          </div>

          {complaint.resolution_notes && (
            <div className={`mt-3 p-3 rounded-lg ${
              complaint.status === 'resolved' ? 'bg-green-50' : 'bg-gray-50'
            }`}>
              <p className={`text-sm ${
                complaint.status === 'resolved' ? 'text-green-800' : 'text-gray-800'
              }`}>
                <span className="font-medium">{t('complaints.resolutionNotes')}:</span> {complaint.resolution_notes}
              </p>
            </div>
          )}
        </div>

        {/* Admin/HR actions */}
        {!isStaff && (
          <div className="flex items-center gap-1 shrink-0">
            {complaint.status === 'pending' && onTakeReview && (
              <button
                onClick={() => onTakeReview(complaint.id)}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title={t('complaints.takeReview')}
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            {complaint.status === 'under_review' && onResolve && (
              <>
                <button
                  onClick={() => onResolve(complaint, 'resolved')}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title={t('complaints.resolve')}
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onResolve(complaint, 'dismissed')}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title={t('complaints.dismiss')}
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(complaint.id)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title={t('common.delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
