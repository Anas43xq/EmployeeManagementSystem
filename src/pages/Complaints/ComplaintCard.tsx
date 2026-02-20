import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { MessageSquare, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui';
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
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">{complaint.subject}</h3>
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

          <p className="text-sm text-gray-600 mb-3">{complaint.description}</p>

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

        <div className="flex items-center gap-2 ml-4">
          {/* Admin/HR actions */}
          {!isStaff && (
            <>
              {complaint.status === 'pending' && onTakeReview && (
                <Button
                  variant="secondary"
                  onClick={() => onTakeReview(complaint.id)}
                  icon={<Eye className="w-4 h-4" />}
                >
                  {t('complaints.takeReview')}
                </Button>
              )}
              {complaint.status === 'under_review' && onResolve && (
                <>
                  <Button
                    onClick={() => onResolve(complaint, 'resolved')}
                    icon={<CheckCircle className="w-4 h-4" />}
                  >
                    {t('complaints.resolve')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => onResolve(complaint, 'dismissed')}
                    icon={<XCircle className="w-4 h-4" />}
                  >
                    {t('complaints.dismiss')}
                  </Button>
                </>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(complaint.id)}
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
