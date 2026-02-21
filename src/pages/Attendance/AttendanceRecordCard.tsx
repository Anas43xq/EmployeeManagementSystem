import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle, XCircle, LogOut } from 'lucide-react';
import type { AttendanceRecord } from './types';

interface AttendanceRecordCardProps {
  record: AttendanceRecord;
  userRole: string | undefined;
  isToday: boolean;
  onCheckOut: (id: string) => void;
  calculateHoursWorked: (checkIn: string | null, checkOut: string | null) => string | null;
}

export default function AttendanceRecordCard({
  record,
  userRole,
  isToday,
  onCheckOut,
  calculateHoursWorked,
}: AttendanceRecordCardProps) {
  const { t } = useTranslation();

  return (
    <div className="border border-gray-200 rounded-lg p-3 sm:p-4 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 sm:p-3 rounded-lg shrink-0 ${
            record.status === 'present' ? 'bg-green-100' :
            record.status === 'late' ? 'bg-yellow-100' :
            record.status === 'absent' ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            {record.status === 'present' ? (
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-900" />
            ) : record.status === 'absent' ? (
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-900" />
            ) : (
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-900" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            {userRole !== 'staff' && (
              <p className="text-sm font-medium text-gray-900 truncate">
                {record.employees?.first_name} {record.employees?.last_name}
              </p>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-600">
              <span>{t('attendance.checkIn')}: {record.check_in || t('common.na')}</span>
              <span>{t('attendance.checkOut')}: {record.check_out || t('common.na')}</span>
              {calculateHoursWorked(record.check_in, record.check_out) && (
                <span className="font-medium text-gray-900">{t('attendance.hours')}: {calculateHoursWorked(record.check_in, record.check_out)}</span>
              )}
            </div>
            {record.notes && (
              <p className="text-xs sm:text-sm text-gray-500 mt-1 break-words">{record.notes}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {record.check_in && !record.check_out && isToday && (
            <button
              onClick={() => onCheckOut(record.id)}
              className="flex items-center gap-1 px-2 py-1 text-xs sm:text-sm font-medium rounded-lg bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Check Out</span>
            </button>
          )}
          <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
            record.status === 'present' ? 'bg-green-100 text-green-800' :
            record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
            record.status === 'absent' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {record.status === 'present' ? t('attendance.present') : record.status === 'absent' ? t('attendance.absent') : record.status === 'late' ? t('attendance.late') : record.status === 'half-day' ? t('attendance.halfDay') : record.status}
          </span>
        </div>
      </div>
    </div>
  );
}
